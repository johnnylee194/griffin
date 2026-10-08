import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// 登录
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // 查找用户
    const user = db.prepare(`
      SELECT id, username, password, name FROM users WHERE username = ?
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
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined in environment variables');
      return res.status(500).json({ error: 'Internal server error' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name || user.username,
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

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined in environment variables');
      return res.status(500).json({ error: 'Internal server error' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    // 查找用户确认存在
    const user = db.prepare(`
      SELECT id, username, name FROM users WHERE id = ?
    `).get(decoded.id) as any;

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name || user.username,
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// 更新用户信息（需要认证）
router.put('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, password, oldPassword } = req.body;
    const userId = req.user!.id;

    if (!name && !password) {
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
      SELECT id, username, name FROM users WHERE id = ?
    `).get(userId) as any;

    res.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name || user.username,
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
      SELECT id, username, name FROM users WHERE id = ?
    `).get(userId) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name || user.username,
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

export default router;

