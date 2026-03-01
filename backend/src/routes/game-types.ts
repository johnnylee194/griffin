import { Router } from 'express';
import db, { generateId } from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const gameTypes = db.prepare(`
      SELECT 
        id,
        user_id as userId,
        name,
        created_at as createdAt
      FROM game_types
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId) as any[];

    res.json(gameTypes);
  } catch (error) {
    console.error('Failed to fetch game types:', error);
    res.status(500).json({ error: 'Failed to fetch game types' });
  }
});

router.post('/', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const existing = db.prepare(`
      SELECT id FROM game_types WHERE user_id = ? AND name = ?
    `).get(userId, name);

    if (existing) {
      return res.status(400).json({ error: 'Game type already exists' });
    }

    const id = generateId();
    const now = new Date().toISOString().split('T')[0] + 'T' + new Date().toTimeString().split(' ')[0];

    db.prepare(`
      INSERT INTO game_types (id, user_id, name, created_at)
      VALUES (?, ?, ?, ?)
    `).run(id, userId, name, now);

    const gameType = db.prepare(`
      SELECT 
        id,
        user_id as userId,
        name,
        created_at as createdAt
      FROM game_types
      WHERE id = ?
    `).get(id) as any;

    res.status(201).json(gameType);
  } catch (error) {
    console.error('Failed to create game type:', error);
    res.status(500).json({ error: 'Failed to create game type' });
  }
});

router.put('/:id', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { name } = req.body;

    const gameTypeRecord = db.prepare(`
      SELECT id FROM game_types WHERE id = ? AND user_id = ?
    `).get(id, userId) as any;

    if (!gameTypeRecord) {
      return res.status(404).json({ error: 'Game type not found' });
    }

    if (name !== undefined) {
      const existing = db.prepare(`
        SELECT id FROM game_types WHERE user_id = ? AND name = ? AND id != ?
      `).get(userId, name, id);
      if (existing) {
        return res.status(400).json({ error: 'Game type name already exists' });
      }
      db.prepare('UPDATE game_types SET name = ? WHERE id = ?').run(name, id);
    }

    const updated = db.prepare(`
      SELECT 
        id,
        user_id as userId,
        name,
        created_at as createdAt
      FROM game_types
      WHERE id = ?
    `).get(id) as any;

    res.json(updated);
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
      SELECT id FROM game_types WHERE id = ? AND user_id = ?
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

    const locationGameTypesUsing = db.prepare(`
      SELECT COUNT(*) as count FROM location_game_types WHERE game_type_id = ?
    `).get(id) as { count: number };

    if (locationGameTypesUsing.count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete game type: it's enabled in ${locationGameTypesUsing.count} location(s)` 
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

    const locationGameTypes = db.prepare(`
      SELECT 
        lgt.id,
        lgt.location_id as locationId,
        lgt.game_type_id as gameTypeId,
        lgt.is_default as isDefault,
        lgt.created_at as createdAt,
        gt.name as gameTypeName
      FROM location_game_types lgt
      JOIN game_types gt ON lgt.game_type_id = gt.id
      WHERE lgt.location_id = ?
      ORDER BY lgt.is_default DESC, lgt.created_at DESC
    `).all(locationId) as any[];

    res.json(locationGameTypes.map((lgt: any) => ({
      ...lgt,
      isDefault: Boolean(lgt.isDefault)
    })));
  } catch (error) {
    console.error('Failed to fetch location game types:', error);
    res.status(500).json({ error: 'Failed to fetch location game types' });
  }
});

router.post('/location/:locationId', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { locationId } = req.params;
    const { gameTypeId, isDefault } = req.body;

    if (!gameTypeId) {
      return res.status(400).json({ error: 'Game type ID is required' });
    }

    const location = db.prepare(`
      SELECT id FROM locations WHERE id = ? AND user_id = ?
    `).get(locationId, userId) as any;

    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const gameType = db.prepare(`
      SELECT id FROM game_types WHERE id = ? AND user_id = ?
    `).get(gameTypeId, userId) as any;

    if (!gameType) {
      return res.status(404).json({ error: 'Game type not found' });
    }

    const existing = db.prepare(`
      SELECT id FROM location_game_types WHERE location_id = ? AND game_type_id = ?
    `).get(locationId, gameTypeId);

    if (existing) {
      return res.status(400).json({ error: 'Game type already enabled for this location' });
    }

    const locationGameTypeCount = db.prepare(`
      SELECT COUNT(*) as count FROM location_game_types WHERE location_id = ?
    `).get(locationId) as { count: number };
    const shouldBeDefault = locationGameTypeCount.count === 0 || isDefault;

    if (shouldBeDefault) {
      db.prepare(`
        UPDATE location_game_types 
        SET is_default = 0 
        WHERE location_id = ?
      `).run(locationId);
    }

    const id = generateId();
    const now = new Date().toISOString().split('T')[0] + 'T' + new Date().toTimeString().split(' ')[0];

    db.prepare(`
      INSERT INTO location_game_types (id, location_id, game_type_id, is_default, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, locationId, gameTypeId, shouldBeDefault ? 1 : 0, now);

    const locationGameType = db.prepare(`
      SELECT 
        lgt.id,
        lgt.location_id as locationId,
        lgt.game_type_id as gameTypeId,
        lgt.is_default as isDefault,
        lgt.created_at as createdAt,
        gt.name as gameTypeName
      FROM location_game_types lgt
      JOIN game_types gt ON lgt.game_type_id = gt.id
      WHERE lgt.id = ?
    `).get(id) as any;

    res.status(201).json({
      ...locationGameType,
      isDefault: Boolean(locationGameType.isDefault)
    });
  } catch (error) {
    console.error('Failed to enable game type for location:', error);
    res.status(500).json({ error: 'Failed to enable game type for location' });
  }
});

router.delete('/location/:locationId/:gameTypeId', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { locationId, gameTypeId } = req.params;

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
      return res.status(404).json({ error: 'Location game type not found' });
    }

    const chipRatesUsing = db.prepare(`
      SELECT COUNT(*) as count FROM location_chip_rates WHERE location_id = ? AND game_type_id = ?
    `).get(locationId, gameTypeId) as { count: number };

    if (chipRatesUsing.count > 0) {
      return res.status(400).json({ 
        error: `Cannot disable game type: ${chipRatesUsing.count} chip rate(s) are using it` 
      });
    }

    const gamesUsing = db.prepare(`
      SELECT COUNT(*) as count FROM games WHERE location_id = ? AND game_type_id = ?
    `).get(locationId, gameTypeId) as { count: number };

    if (gamesUsing.count > 0) {
      return res.status(400).json({ 
        error: `Cannot disable game type: ${gamesUsing.count} game(s) are using it` 
      });
    }

    const result = db.prepare('DELETE FROM location_game_types WHERE location_id = ? AND game_type_id = ?').run(locationId, gameTypeId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Location game type not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Failed to disable game type for location:', error);
    res.status(500).json({ error: 'Failed to disable game type for location' });
  }
});

export default router;
