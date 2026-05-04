import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { geocode } from '../utils/geocoding';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'griffin-secret-key-2025';

// 登录
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // 查找用户
    const user = db.prepare(`
      SELECT id, username, password, name, birth_date, birth_time, birth_location, birth_latitude, birth_longitude, gender FROM users WHERE username = ?
    `).get(username) as any;

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // 验证密码
    const isValidPassword = bcrypt.compareSync(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // 生成 JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const hasCompleteProfile = !!(
      user.birth_date &&
      user.birth_time &&
      user.birth_location &&
      user.gender !== null &&
      user.gender !== undefined
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name || user.username,
        birthDate: user.birth_date,
        birthTime: user.birth_time,
        birthLocation: user.birth_location,
        birthLatitude: user.birth_latitude,
        birthLongitude: user.birth_longitude,
        gender: user.gender,
        hasCompleteProfile
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 验证 token
router.get('/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // 查找用户确认存在
    const user = db.prepare(`
      SELECT id, username, name, birth_date, birth_time, birth_location, birth_latitude, birth_longitude, gender FROM users WHERE id = ?
    `).get(decoded.id) as any;

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const hasCompleteProfile = !!(
      user.birth_date &&
      user.birth_time &&
      user.birth_location &&
      user.gender !== null &&
      user.gender !== undefined
    );

    res.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name || user.username,
        birthDate: user.birth_date,
        birthTime: user.birth_time,
        birthLocation: user.birth_location,
        birthLatitude: user.birth_latitude,
        birthLongitude: user.birth_longitude,
        gender: user.gender,
        hasCompleteProfile
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// 更新用户信息（需要认证）
router.put('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, password, oldPassword, birthDate, birthTime, birthLocation, gender } = req.body;
    const userId = req.user!.id;

    if (!name && !password && !birthDate && !birthTime && !birthLocation && gender === undefined) {
      return res.status(400).json({ error: 'At least one field is required to update' });
    }

    // 如果修改密码，需要验证旧密码
    if (password) {
      if (!oldPassword) {
        return res.status(400).json({ error: 'Old password is required when changing password' });
      }

      // 获取当前用户密码
      const currentUser = db.prepare(`
        SELECT password FROM users WHERE id = ?
      `).get(userId) as any;

      if (!currentUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // 验证旧密码
      const isValidPassword = bcrypt.compareSync(oldPassword, currentUser.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid old password' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
    }

    // 构建更新语句
    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }

    if (birthDate !== undefined) {
      // 验证日期格式
      const date = new Date(birthDate);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ error: 'Invalid birth date format' });
      }
      updates.push('birth_date = ?');
      params.push(birthDate);
    }

    if (birthTime !== undefined) {
      // 验证时间格式 HH:mm
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(birthTime)) {
        return res.status(400).json({ error: 'Invalid birth time format, expected HH:mm' });
      }
      updates.push('birth_time = ?');
      params.push(birthTime);
    }

    if (birthLocation !== undefined) {
      // Geocode first - if it fails, don't update anything
      let geo: { latitude: number; longitude: number } | null = null;
      try {
        geo = await geocode(birthLocation);
      } catch (geoError) {
        console.error('Geocoding failed for', birthLocation, geoError);
        return res.status(400).json({ error: `Geocoding failed for "${birthLocation}". Please use a well-known city name.` });
      }
      updates.push('birth_location = ?');
      params.push(birthLocation);
      updates.push('birth_latitude = ?');
      params.push(geo.latitude);
      updates.push('birth_longitude = ?');
      params.push(geo.longitude);
    }

    if (gender !== undefined) {
      // 验证性别：0=女, 1=男
      if (gender !== 0 && gender !== 1) {
        return res.status(400).json({ error: 'Invalid gender value, expected 0 (female) or 1 (male)' });
      }
      updates.push('gender = ?');
      params.push(gender);
    }

    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      updates.push('password = ?');
      params.push(hashedPassword);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(userId);

    db.prepare(`
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...params);

    // 获取更新后的用户信息
    const user = db.prepare(`
      SELECT id, username, name, birth_date, birth_time, birth_location, birth_latitude, birth_longitude, gender FROM users WHERE id = ?
    `).get(userId) as any;

    const hasCompleteProfile = !!(
      user.birth_date &&
      user.birth_time &&
      user.birth_location &&
      user.gender !== null &&
      user.gender !== undefined
    );

    res.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name || user.username,
        birthDate: user.birth_date,
        birthTime: user.birth_time,
        birthLocation: user.birth_location,
        birthLatitude: user.birth_latitude,
        birthLongitude: user.birth_longitude,
        gender: user.gender,
        hasCompleteProfile
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// 获取当前用户信息（需要认证）
router.get('/profile', authMiddleware, (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const user = db.prepare(`
      SELECT id, username, name, birth_date, birth_time, birth_location, birth_latitude, birth_longitude, gender FROM users WHERE id = ?
    `).get(userId) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hasCompleteProfile = !!(
      user.birth_date &&
      user.birth_time &&
      user.birth_location &&
      user.gender !== null &&
      user.gender !== undefined
    );

    res.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name || user.username,
        birthDate: user.birth_date,
        birthTime: user.birth_time,
        birthLocation: user.birth_location,
        birthLatitude: user.birth_latitude,
        birthLongitude: user.birth_longitude,
        gender: user.gender,
        hasCompleteProfile
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

export default router;

