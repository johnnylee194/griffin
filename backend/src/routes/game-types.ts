import { Router } from 'express';
import db, { generateId } from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

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

    const gameTypes = db.prepare(`
      SELECT 
        id,
        location_id as locationId,
        name,
        is_default as isDefault,
        created_at as createdAt
      FROM game_types
      WHERE location_id = ?
      ORDER BY is_default DESC, created_at DESC
    `).all(locationId) as any[];

    res.json(gameTypes.map((gt: any) => ({
      ...gt,
      isDefault: Boolean(gt.isDefault)
    })));
  } catch (error) {
    console.error('Failed to fetch game types:', error);
    res.status(500).json({ error: 'Failed to fetch game types' });
  }
});

router.post('/', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { locationId, name, isDefault } = req.body;

    if (!locationId || !name) {
      return res.status(400).json({ error: 'Location ID and name are required' });
    }

    const location = db.prepare(`
      SELECT id FROM locations WHERE id = ? AND user_id = ?
    `).get(locationId, userId) as any;

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const existing = db.prepare(`
      SELECT id FROM game_types 
      WHERE location_id = ? AND name = ?
    `).get(locationId, name);

    if (existing) {
      return res.status(400).json({ error: 'Game type already exists for this location' });
    }

    const gameTypeCount = db.prepare(`
      SELECT COUNT(*) as count FROM game_types WHERE location_id = ?
    `).get(locationId) as { count: number };
    const shouldBeDefault = gameTypeCount.count === 0 || isDefault;

    if (shouldBeDefault) {
      db.prepare(`
        UPDATE game_types 
        SET is_default = 0 
        WHERE location_id = ?
      `).run(locationId);
    }

    const id = generateId();
    const now = new Date().toISOString().split('T')[0] + 'T' + new Date().toTimeString().split(' ')[0];

    db.prepare(`
      INSERT INTO game_types (id, location_id, name, is_default, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, locationId, name, shouldBeDefault ? 1 : 0, now);

    const gameType = db.prepare(`
      SELECT 
        id,
        location_id as locationId,
        name,
        is_default as isDefault,
        created_at as createdAt
      FROM game_types
      WHERE id = ?
    `).get(id) as any;

    res.status(201).json({
      ...gameType,
      isDefault: Boolean(gameType.isDefault)
    });
  } catch (error) {
    console.error('Failed to create game type:', error);
    res.status(500).json({ error: 'Failed to create game type' });
  }
});

router.put('/:id', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { name, isDefault } = req.body;

    const gameTypeRecord = db.prepare(`
      SELECT gt.id, gt.location_id
      FROM game_types gt
      JOIN locations l ON gt.location_id = l.id
      WHERE gt.id = ? AND l.user_id = ?
    `).get(id, userId) as any;

    if (!gameTypeRecord) {
      return res.status(404).json({ error: 'Game type not found' });
    }

    if (isDefault) {
      db.prepare(`
        UPDATE game_types 
        SET is_default = 0 
        WHERE location_id = ? AND id != ?
      `).run(gameTypeRecord.location_id, id);
    }

    const updateFields: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      const existing = db.prepare(`
        SELECT id FROM game_types 
        WHERE location_id = ? AND name = ? AND id != ?
      `).get(gameTypeRecord.location_id, name, id);
      if (existing) {
        return res.status(400).json({ error: 'Game type name already exists for this location' });
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
        UPDATE game_types 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `).run(...values);
    }

    const updated = db.prepare(`
      SELECT 
        id,
        location_id as locationId,
        name,
        is_default as isDefault,
        created_at as createdAt
      FROM game_types
      WHERE id = ?
    `).get(id) as any;

    res.json({
      ...updated,
      isDefault: Boolean(updated.isDefault)
    });
  } catch (error) {
    console.error('Failed to update game type:', error);
    res.status(500).json({ error: 'Failed to update game type' });
  }
});

router.delete('/:id', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const gameTypeRecord = db.prepare(`
      SELECT gt.id, gt.location_id
      FROM game_types gt
      JOIN locations l ON gt.location_id = l.id
      WHERE gt.id = ? AND l.user_id = ?
    `).get(id, userId) as any;

    if (!gameTypeRecord) {
      return res.status(404).json({ error: 'Game type not found' });
    }

    const gamesUsing = db.prepare(`
      SELECT COUNT(*) as count FROM games WHERE game_type_id = ?
    `).get(id) as { count: number };

    if (gamesUsing.count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete game type: ${gamesUsing.count} game(s) are using it` 
      });
    }

    const chipRatesUsing = db.prepare(`
      SELECT COUNT(*) as count FROM location_chip_rates WHERE game_type_id = ?
    `).get(id) as { count: number };

    if (chipRatesUsing.count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete game type: ${chipRatesUsing.count} chip rate(s) are using it` 
      });
    }

    const result = db.prepare('DELETE FROM game_types WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Game type not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete game type:', error);
    res.status(500).json({ error: 'Failed to delete game type' });
  }
});

export default router;
