import { Router } from 'express';
import db, { generateId } from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// 获取指定地点和玩法的所有倍率规则
router.get('/location/:locationId/game-type/:gameTypeId', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { locationId, gameTypeId } = req.params;

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
        game_type_id as gameTypeId,
        chip_rate as chipRate,
        is_default as isDefault,
        note,
        created_at as createdAt
      FROM location_chip_rates
      WHERE location_id = ? AND game_type_id = ?
      ORDER BY is_default DESC, created_at DESC
    `).all(locationId, gameTypeId) as any[];

    res.json(chipRates.map((cr: any) => ({
      ...cr,
      isDefault: Boolean(cr.isDefault)
    })));
  } catch (error) {
    console.error('Failed to fetch chip rates:', error);
    res.status(500).json({ error: 'Failed to fetch chip rates' });
  }
});

// 为了向后兼容，保留原来的接口（使用地点的默认玩法）
router.get('/location/:locationId', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { locationId } = req.params;

    const location = db.prepare(`
      SELECT id FROM locations WHERE id = ? AND user_id = ?
    `).get(locationId, userId) as any;

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const defaultGameType = db.prepare(`
      SELECT game_type_id FROM location_game_types WHERE location_id = ? AND is_default = 1
    `).get(locationId) as any;

    if (!defaultGameType) {
      return res.json([]);
    }

    const chipRates = db.prepare(`
      SELECT 
        id,
        location_id as locationId,
        game_type_id as gameTypeId,
        chip_rate as chipRate,
        is_default as isDefault,
        note,
        created_at as createdAt
      FROM location_chip_rates
      WHERE location_id = ? AND game_type_id = ?
      ORDER BY is_default DESC, created_at DESC
    `).all(locationId, defaultGameType.game_type_id) as any[];

    res.json(chipRates.map((cr: any) => ({
      ...cr,
      isDefault: Boolean(cr.isDefault)
    })));
  } catch (error) {
    console.error('Failed to fetch chip rates:', error);
    res.status(500).json({ error: 'Failed to fetch chip rates' });
  }
});

// 创建倍率规则
router.post('/', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { locationId, gameTypeId, chipRate, isDefault, note } = req.body;

    if (!locationId || !gameTypeId || !chipRate) {
      return res.status(400).json({ error: 'Location ID, game type ID and chip rate are required' });
    }

    const location = db.prepare(`
      SELECT id FROM locations WHERE id = ? AND user_id = ?
    `).get(locationId, userId) as any;

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const locationGameType = db.prepare(`
      SELECT lgt.id FROM location_game_types lgt
      JOIN locations l ON lgt.location_id = l.id
      WHERE lgt.location_id = ? AND lgt.game_type_id = ? AND l.user_id = ?
    `).get(locationId, gameTypeId, userId) as any;

    if (!locationGameType) {
      return res.status(404).json({ error: 'Game type not enabled for this location' });
    }

    const existing = db.prepare(`
      SELECT id FROM location_chip_rates 
      WHERE location_id = ? AND game_type_id = ? AND chip_rate = ?
    `).get(locationId, gameTypeId, chipRate);

    if (existing) {
      return res.status(400).json({ error: 'Chip rate already exists for this location and game type' });
    }

    const chipRateCount = db.prepare(`
      SELECT COUNT(*) as count FROM location_chip_rates WHERE location_id = ? AND game_type_id = ?
    `).get(locationId, gameTypeId) as { count: number };
    const shouldBeDefault = chipRateCount.count === 0 || isDefault;

    if (shouldBeDefault) {
      db.prepare(`
        UPDATE location_chip_rates 
        SET is_default = 0 
        WHERE location_id = ? AND game_type_id = ?
      `).run(locationId, gameTypeId);
    }

    const id = generateId();
    const now = new Date().toISOString().split('T')[0] + 'T' + new Date().toTimeString().split(' ')[0];

    db.prepare(`
      INSERT INTO location_chip_rates (id, location_id, game_type_id, chip_rate, is_default, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, locationId, gameTypeId, chipRate, shouldBeDefault ? 1 : 0, note || null, now);

    const chipRateRecord = db.prepare(`
      SELECT 
        id,
        location_id as locationId,
        game_type_id as gameTypeId,
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

// 更新倍率规则
router.put('/:id', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { chipRate, isDefault, note } = req.body;

    const chipRateRecord = db.prepare(`
      SELECT lcr.id, lcr.location_id, lcr.game_type_id
      FROM location_chip_rates lcr
      JOIN locations l ON lcr.location_id = l.id
      WHERE lcr.id = ? AND l.user_id = ?
    `).get(id, userId) as any;

    if (!chipRateRecord) {
      return res.status(404).json({ error: 'Chip rate not found' });
    }

    if (isDefault) {
      db.prepare(`
        UPDATE location_chip_rates 
        SET is_default = 0 
        WHERE location_id = ? AND game_type_id = ? AND id != ?
      `).run(chipRateRecord.location_id, chipRateRecord.game_type_id, id);
    }

    const updateFields: string[] = [];
    const values: any[] = [];

    if (chipRate !== undefined) {
      const existing = db.prepare(`
        SELECT id FROM location_chip_rates 
        WHERE location_id = ? AND game_type_id = ? AND chip_rate = ? AND id != ?
      `).get(chipRateRecord.location_id, chipRateRecord.game_type_id, chipRate, id);
      if (existing) {
        return res.status(400).json({ error: 'Chip rate already exists for this location and game type' });
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
        game_type_id as gameTypeId,
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

// 删除倍率规则
router.delete('/:id', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const chipRateRecord = db.prepare(`
      SELECT lcr.id
      FROM location_chip_rates lcr
      JOIN locations l ON lcr.location_id = l.id
      WHERE lcr.id = ? AND l.user_id = ?
    `).get(id, userId) as any;

    if (!chipRateRecord) {
      return res.status(404).json({ error: 'Chip rate not found' });
    }

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
