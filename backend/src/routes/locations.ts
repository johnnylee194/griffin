import { Router } from 'express';
import db, { generateId } from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getLocalTimestamp } from '../utils/time';

const router = Router();

// 所有路由都需要认证
router.use(authMiddleware);

// 获取所有地点（当前用户的），附带最近30天访问次数
router.get('/', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 19).replace('T', ' ');

    const locations = db.prepare(`
      SELECT 
        l.id,
        l.name,
        l.is_default as isDefault,
        l.created_at as createdAt,
        (
          SELECT COUNT(*) 
          FROM games g 
          WHERE g.location_id = l.id 
            AND g.created_at >= ?
        ) as recentVisitCount,
        (
          SELECT MAX(g.created_at) 
          FROM games g 
          WHERE g.location_id = l.id
        ) as lastVisitAt
      FROM locations l
      WHERE l.user_id = ?
      ORDER BY l.is_default DESC, recentVisitCount DESC, lastVisitAt DESC
    `).all(thirtyDaysAgoStr, userId) as any[];

    res.json(locations.map((l: any) => ({
      id: l.id,
      name: l.name,
      isDefault: Boolean(l.isDefault),
      createdAt: l.createdAt,
      recentVisitCount: l.recentVisitCount || 0,
      lastVisitAt: l.lastVisitAt || null
    })));
  } catch (error) {
    console.error('Failed to fetch locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// 创建地点
router.post('/', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { name, isDefault } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // 检查名称是否已存在（同一用户下）
    const existing = db.prepare('SELECT id FROM locations WHERE name = ? AND user_id = ?').get(name, userId);
    if (existing) {
      return res.status(400).json({ error: 'Location name already exists' });
    }

    // 检查用户是否已有地点
    const locationCount = db.prepare('SELECT COUNT(*) as count FROM locations WHERE user_id = ?').get(userId) as { count: number };
    // 如果这是第一个地点，自动设置为默认
    const shouldBeDefault = locationCount.count === 0 || isDefault;

    // 如果设置为默认地点，先将其他地点的isDefault设为false（同一用户下）
    if (shouldBeDefault) {
      db.prepare('UPDATE locations SET is_default = 0 WHERE is_default = 1 AND user_id = ?').run(userId);
    }

    const id = generateId();
    const now = getLocalTimestamp();
    
    db.prepare(`
      INSERT INTO locations (id, user_id, name, is_default, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, name, shouldBeDefault ? 1 : 0, now);

    const location = db.prepare(`
      SELECT 
        id,
        name,
        is_default as isDefault,
        created_at as createdAt
      FROM locations
      WHERE id = ?
    `).get(id) as any;

    res.status(201).json({
      ...location,
      isDefault: Boolean(location.isDefault)
    });
  } catch (error) {
    console.error('Failed to create location:', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

// 更新地点
router.put('/:id', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { name, isDefault } = req.body;
    
    // 验证地点是否属于当前用户
    const location = db.prepare(`
      SELECT id FROM locations WHERE id = ? AND user_id = ?
    `).get(id, userId) as any;

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    // 如果要设置为默认地点，先将其他地点的isDefault设为false（同一用户下）
    if (isDefault) {
      db.prepare(`
        UPDATE locations SET is_default = 0 WHERE is_default = 1 AND id != ? AND user_id = ?
      `).run(id, userId);
    }

    const updateFields: string[] = [];
    const values: any[] = [];
    
    if (name !== undefined) {
      // 检查名称是否已被其他地点使用（同一用户下）
      const existing = db.prepare('SELECT id FROM locations WHERE name = ? AND id != ? AND user_id = ?').get(name, id, userId);
      if (existing) {
        return res.status(400).json({ error: 'Location name already exists' });
      }
      updateFields.push('name = ?');
      values.push(name);
    }
    if (isDefault !== undefined) {
      updateFields.push('is_default = ?');
      values.push(isDefault ? 1 : 0);
    }
    
    if (updateFields.length > 0) {
      values.push(id);
      db.prepare(`
        UPDATE locations SET ${updateFields.join(', ')} WHERE id = ?
      `).run(...values);
    }

    const updated = db.prepare(`
      SELECT 
        id,
        name,
        is_default as isDefault,
        created_at as createdAt
      FROM locations
      WHERE id = ?
    `).get(id) as any;

    res.json({
      ...updated,
      isDefault: Boolean(updated.isDefault)
    });
  } catch (error) {
    console.error('Failed to update location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// 删除地点
router.delete('/:id', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // 验证地点是否属于当前用户
    const location = db.prepare(`
      SELECT id FROM locations WHERE id = ? AND user_id = ?
    `).get(id, userId) as any;

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // 检查是否有对局使用此地点的chip_rate
    const gamesUsing = db.prepare(`
      SELECT COUNT(*) as count 
      FROM games g
      JOIN location_chip_rates lcr ON g.chip_rate_id = lcr.id
      WHERE lcr.location_id = ?
    `).get(id) as { count: number };

    if (gamesUsing.count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete location: ${gamesUsing.count} game(s) are using it` 
      });
    }

    const result = db.prepare('DELETE FROM locations WHERE id = ? AND user_id = ?').run(id, userId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete location:', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

export default router;
