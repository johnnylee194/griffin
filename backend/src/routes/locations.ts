import { Router } from 'express';
import db, { generateId } from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authMiddleware);

// 辅助函数：获取中国本地时间（UTC+8）的ISO字符串（不带时区标识，精确到秒）
function getLocalTimestamp(): string {
  const now = new Date();
  // now.getTime() 返回 UTC 时间戳（毫秒）
  // 直接加上 8 小时（8 * 60 * 60 * 1000 毫秒）得到中国时间
  const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  
  // 手动格式化为ISO字符串（不带时区标识，精确到秒）
  const year = chinaTime.getUTCFullYear();
  const month = String(chinaTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(chinaTime.getUTCDate()).padStart(2, '0');
  const hours = String(chinaTime.getUTCHours()).padStart(2, '0');
  const minutes = String(chinaTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(chinaTime.getUTCSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

// 获取所有地点（当前用户的）
router.get('/', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const locations = db.prepare(`
      SELECT 
        id,
        name,
        is_default as isDefault,
        created_at as createdAt
      FROM locations
      WHERE user_id = ?
      ORDER BY is_default DESC, created_at DESC
    `).all(userId) as any[];
    
    res.json(locations.map((l: any) => ({
      ...l,
      isDefault: Boolean(l.isDefault)
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

    // 如果设置为默认地点，先将其他地点的isDefault设为false（同一用户下）
    if (isDefault) {
      db.prepare('UPDATE locations SET is_default = 0 WHERE is_default = 1 AND user_id = ?').run(userId);
    }

    const id = generateId();
    const now = getLocalTimestamp();
    
    db.prepare(`
      INSERT INTO locations (id, user_id, name, is_default, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, name, isDefault ? 1 : 0, now);

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
