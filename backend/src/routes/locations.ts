import { Router } from 'express';
import db, { generateId } from '../database';

const router = Router();

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

// 获取所有地点
router.get('/', (req, res) => {
  try {
    const locations = db.prepare(`
      SELECT 
        id,
        name,
        is_default as isDefault,
        created_at as createdAt
      FROM locations
      ORDER BY is_default DESC, created_at DESC
    `).all() as any[];
    
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
router.post('/', (req, res) => {
  try {
    const { name, isDefault } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // 检查名称是否已存在
    const existing = db.prepare('SELECT id FROM locations WHERE name = ?').get(name);
    if (existing) {
      return res.status(400).json({ error: 'Location name already exists' });
    }

    // 如果设置为默认地点，先将其他地点的isDefault设为false
    if (isDefault) {
      db.prepare('UPDATE locations SET is_default = 0 WHERE is_default = 1').run();
    }

    const id = generateId();
    const now = getLocalTimestamp();
    
    db.prepare(`
      INSERT INTO locations (id, name, is_default, created_at)
      VALUES (?, ?, ?, ?)
    `).run(id, name, isDefault ? 1 : 0, now);

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
router.put('/:id', (req, res) => {
  try {
    const { name, isDefault } = req.body;
    
    // 如果要设置为默认地点，先将其他地点的isDefault设为false
    if (isDefault) {
      db.prepare(`
        UPDATE locations SET is_default = 0 WHERE is_default = 1 AND id != ?
      `).run(req.params.id);
    }

    const updateFields: string[] = [];
    const values: any[] = [];
    
    if (name !== undefined) {
      // 检查名称是否已被其他地点使用
      const existing = db.prepare('SELECT id FROM locations WHERE name = ? AND id != ?').get(name, req.params.id);
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
      values.push(req.params.id);
      db.prepare(`
        UPDATE locations SET ${updateFields.join(', ')} WHERE id = ?
      `).run(...values);
    }

    const location = db.prepare(`
      SELECT 
        id,
        name,
        is_default as isDefault,
        created_at as createdAt
      FROM locations
      WHERE id = ?
    `).get(req.params.id) as any;

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json({
      ...location,
      isDefault: Boolean(location.isDefault)
    });
  } catch (error) {
    console.error('Failed to update location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// 删除地点
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM locations WHERE id = ?').run(req.params.id);
    
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
