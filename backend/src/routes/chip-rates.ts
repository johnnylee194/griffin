import { Router } from 'express';
import db, { generateId } from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证
router.use(authMiddleware);

// 获取指定地点的所有chip_rate规则
router.get('/location/:locationId', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { locationId } = req.params;

    // 验证地点是否属于当前用户
    const location = db.prepare(`
      SELECT id FROM locations WHERE id = ? AND user_id = ?
    `).get(locationId, userId) as any;

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const chipRates = db.prepare(`
      SELECT 
        id,
        location_id as locationId,
        chip_rate as chipRate,
        is_default as isDefault,
        note,
        created_at as createdAt
      FROM location_chip_rates
      WHERE location_id = ?
      ORDER BY is_default DESC, created_at DESC
    `).all(locationId) as any[];

    res.json(chipRates.map((cr: any) => ({
      ...cr,
      isDefault: Boolean(cr.isDefault)
    })));
  } catch (error) {
    console.error('Failed to fetch chip rates:', error);
    res.status(500).json({ error: 'Failed to fetch chip rates' });
  }
});

// 创建chip_rate规则
router.post('/', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { locationId, chipRate, isDefault, note } = req.body;

    if (!locationId || !chipRate) {
      return res.status(400).json({ error: 'Location ID and chip rate are required' });
    }

    // 验证地点是否属于当前用户
    const location = db.prepare(`
      SELECT id FROM locations WHERE id = ? AND user_id = ?
    `).get(locationId, userId) as any;

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // 检查是否已存在相同的chip_rate
    const existing = db.prepare(`
      SELECT id FROM location_chip_rates 
      WHERE location_id = ? AND chip_rate = ?
    `).get(locationId, chipRate);

    if (existing) {
      return res.status(400).json({ error: 'Chip rate already exists for this location' });
    }

    // 如果设置为默认，先将其他规则的isDefault设为false
    if (isDefault) {
      db.prepare(`
        UPDATE location_chip_rates 
        SET is_default = 0 
        WHERE location_id = ?
      `).run(locationId);
    }

    const id = generateId();
    const now = new Date().toISOString().split('T')[0] + 'T' + new Date().toTimeString().split(' ')[0];

    db.prepare(`
      INSERT INTO location_chip_rates (id, location_id, chip_rate, is_default, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, locationId, chipRate, isDefault ? 1 : 0, note || null, now);

    const chipRateRecord = db.prepare(`
      SELECT 
        id,
        location_id as locationId,
        chip_rate as chipRate,
        is_default as isDefault,
        note,
        created_at as createdAt
      FROM location_chip_rates
      WHERE id = ?
    `).get(id) as any;

    res.status(201).json({
      ...chipRateRecord,
      isDefault: Boolean(chipRateRecord.isDefault)
    });
  } catch (error) {
    console.error('Failed to create chip rate:', error);
    res.status(500).json({ error: 'Failed to create chip rate' });
  }
});

// 更新chip_rate规则
router.put('/:id', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { chipRate, isDefault, note } = req.body;

    // 验证chip_rate是否属于当前用户
    const chipRateRecord = db.prepare(`
      SELECT lcr.id, lcr.location_id
      FROM location_chip_rates lcr
      JOIN locations l ON lcr.location_id = l.id
      WHERE lcr.id = ? AND l.user_id = ?
    `).get(id, userId) as any;

    if (!chipRateRecord) {
      return res.status(404).json({ error: 'Chip rate not found' });
    }

    // 如果设置为默认，先将其他规则的isDefault设为false
    if (isDefault) {
      db.prepare(`
        UPDATE location_chip_rates 
        SET is_default = 0 
        WHERE location_id = ? AND id != ?
      `).run(chipRateRecord.location_id, id);
    }

    const updateFields: string[] = [];
    const values: any[] = [];

    if (chipRate !== undefined) {
      // 检查是否与其他规则冲突
      const existing = db.prepare(`
        SELECT id FROM location_chip_rates 
        WHERE location_id = ? AND chip_rate = ? AND id != ?
      `).get(chipRateRecord.location_id, chipRate, id);
      if (existing) {
        return res.status(400).json({ error: 'Chip rate already exists for this location' });
      }
      updateFields.push('chip_rate = ?');
      values.push(chipRate);
    }
    if (isDefault !== undefined) {
      updateFields.push('is_default = ?');
      values.push(isDefault ? 1 : 0);
    }
    if (note !== undefined) {
      updateFields.push('note = ?');
      values.push(note || null);
    }

    if (updateFields.length > 0) {
      values.push(id);
      db.prepare(`
        UPDATE location_chip_rates 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `).run(...values);
    }

    const updated = db.prepare(`
      SELECT 
        id,
        location_id as locationId,
        chip_rate as chipRate,
        is_default as isDefault,
        note,
        created_at as createdAt
      FROM location_chip_rates
      WHERE id = ?
    `).get(id) as any;

    res.json({
      ...updated,
      isDefault: Boolean(updated.isDefault)
    });
  } catch (error) {
    console.error('Failed to update chip rate:', error);
    res.status(500).json({ error: 'Failed to update chip rate' });
  }
});

// 删除chip_rate规则
router.delete('/:id', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // 验证chip_rate是否属于当前用户
    const chipRateRecord = db.prepare(`
      SELECT lcr.id
      FROM location_chip_rates lcr
      JOIN locations l ON lcr.location_id = l.id
      WHERE lcr.id = ? AND l.user_id = ?
    `).get(id, userId) as any;

    if (!chipRateRecord) {
      return res.status(404).json({ error: 'Chip rate not found' });
    }

    // 检查是否有对局使用此chip_rate
    const gamesUsing = db.prepare(`
      SELECT COUNT(*) as count FROM games WHERE chip_rate_id = ?
    `).get(id) as { count: number };

    if (gamesUsing.count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete chip rate: ${gamesUsing.count} game(s) are using it` 
      });
    }

    const result = db.prepare('DELETE FROM location_chip_rates WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Chip rate not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete chip rate:', error);
    res.status(500).json({ error: 'Failed to delete chip rate' });
  }
});

export default router;

