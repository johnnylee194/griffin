import { Router } from 'express';
import db, { generateId } from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { GameService } from '../services/game.service';
import { StatsService } from '../services/stats.service';
import { getLocalTimestamp } from '../utils/time';

const router = Router();

router.use(authMiddleware);

router.get('/', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { limit, offset, locationId } = req.query;
    
    let query = `
      SELECT 
        g.id,
        g.location_id as locationId,
        g.game_type_id as gameTypeId,
        g.chip_rate_id as chipRateId,
        g.is_complete as isComplete,
        g.note,
        g.created_at as createdAt,
        g.updated_at as updatedAt
      FROM games g
      WHERE g.user_id = ?
    `;
    
    const params: any[] = [userId];

    if (locationId) {
      query += ' AND g.location_id = ?';
      params.push(locationId);
    }

    query += ' ORDER BY g.created_at DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit as string));
    }
    if (offset) {
      query += ' OFFSET ?';
      params.push(parseInt(offset as string));
    }
    
    const games = db.prepare(query).all(...params);
    
    const gamesWithDetails = games.map((game: any) => GameService.getGameWithDetails(game.id, userId));
    
    res.json(gamesWithDetails);
  } catch (error) {
    console.error('Failed to fetch games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

router.get('/:id', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const game = GameService.getGameWithDetails(id, userId);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json(game);
  } catch (error) {
    console.error('Failed to fetch game:', error);
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

router.post('/', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { locationId, gameTypeId, chipRateId, playerIds, myScore, note, createdAt } = req.body;
    
    if (!locationId || !gameTypeId || !chipRateId || !playerIds || !Array.isArray(playerIds) || playerIds.length < 1) {
      return res.status(400).json({ error: '至少需要选择1个玩家，并选择地点、玩法和倍率' });
    }
    
    if (myScore === undefined || myScore === null) {
      return res.status(400).json({ error: '必须输入我的分数' });
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

    const chipRate = db.prepare(`
      SELECT id, chip_rate 
      FROM location_chip_rates 
      WHERE id = ? AND location_id = ? AND game_type_id = ?
    `).get(chipRateId, locationId, gameTypeId) as any;
    if (!chipRate) {
      return res.status(404).json({ error: 'Chip rate not found for this location and game type' });
    }

    const mePlayer = db.prepare('SELECT id FROM players WHERE is_me = 1 AND user_id = ?').get(userId) as any;
    if (!mePlayer) {
      return res.status(404).json({ error: '当前用户未找到，请先创建"我"这个玩家' });
    }
    
    if (!playerIds.includes(mePlayer.id)) {
      return res.status(400).json({ error: '玩家列表中必须包含"我"' });
    }

    const placeholders = playerIds.map(() => '?').join(',');
    const players = db.prepare(`
      SELECT id FROM players WHERE id IN (${placeholders}) AND user_id = ?
    `).all(...playerIds, userId) as any[];
    if (players.length !== playerIds.length) {
      return res.status(400).json({ error: '部分玩家不属于当前用户' });
    }

    const game = GameService.createGame({
      userId,
      locationId,
      gameTypeId,
      chipRateId,
      playerIds,
      myScore,
      note,
      createdAt
    });
    
    res.status(201).json(game);
  } catch (error) {
    console.error('Failed to create game:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

router.put('/:id', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { locationId, gameTypeId, chipRateId, playerIds, myScore, note, createdAt } = req.body;
    
    if (!locationId || !gameTypeId || !chipRateId || !playerIds || !Array.isArray(playerIds) || playerIds.length < 1) {
      return res.status(400).json({ error: '至少需要选择1个玩家，并选择地点、玩法和倍率' });
    }
    
    if (myScore === undefined || myScore === null) {
      return res.status(400).json({ error: '必须输入我的分数' });
    }

    const existingGame = db.prepare(`
      SELECT id FROM games WHERE id = ? AND user_id = ?
    `).get(id, userId) as any;
    if (!existingGame) {
      return res.status(404).json({ error: 'Game not found' });
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

    const chipRate = db.prepare(`
      SELECT id, chip_rate 
      FROM location_chip_rates 
      WHERE id = ? AND location_id = ? AND game_type_id = ?
    `).get(chipRateId, locationId, gameTypeId) as any;
    if (!chipRate) {
      return res.status(404).json({ error: 'Chip rate not found for this location and game type' });
    }

    const mePlayer = db.prepare('SELECT id FROM players WHERE is_me = 1 AND user_id = ?').get(userId) as any;
    if (!mePlayer) {
      return res.status(404).json({ error: '当前用户未找到，请先创建"我"这个玩家' });
    }
    
    if (!playerIds.includes(mePlayer.id)) {
      return res.status(400).json({ error: '玩家列表中必须包含"我"' });
    }

    const placeholders = playerIds.map(() => '?').join(',');
    const players = db.prepare(`
      SELECT id FROM players WHERE id IN (${placeholders}) AND user_id = ?
    `).all(...playerIds, userId) as any[];
    if (players.length !== playerIds.length) {
      return res.status(400).json({ error: '部分玩家不属于当前用户' });
    }

    const now = getLocalTimestamp();
    const gameTime = createdAt || now;
    const myChips = myScore * chipRate.chip_rate;

    const updateGame = db.transaction(() => {
      db.prepare('DELETE FROM player_records WHERE game_id = ?').run(id);

      db.prepare(`
        UPDATE games 
        SET location_id = ?, game_type_id = ?, chip_rate_id = ?, is_complete = 1, note = ?, created_at = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
      `).run(
        locationId,
        gameTypeId,
        chipRateId,
        note || null,
        gameTime,
        now,
        id,
        userId
      );

      const insertRecord = db.prepare(`
        INSERT INTO player_records (id, game_id, player_id, score, chips, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const playerId of playerIds) {
        const recordId = generateId();
        if (playerId === mePlayer.id) {
          insertRecord.run(recordId, id, playerId, myScore, myChips, gameTime);
        } else {
          insertRecord.run(recordId, id, playerId, null, null, gameTime);
        }
      }
    });

    updateGame();

    const game = GameService.getGameWithDetails(id, userId);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(game);
  } catch (error) {
    console.error('Failed to update game:', error);
    res.status(500).json({ error: 'Failed to update game' });
  }
});

router.delete('/:id', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const game = db.prepare(`
      SELECT id FROM games WHERE id = ? AND user_id = ?
    `).get(id, userId) as any;

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const result = db.prepare('DELETE FROM games WHERE id = ? AND user_id = ?').run(id, userId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete game:', error);
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

router.get('/stats/monthly', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { year: yearParam, month: monthParam, locationId } = req.query;
    const now = new Date();
    const year = yearParam ? parseInt(yearParam as string) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam as string) : now.getMonth() + 1;
    
    const stats = StatsService.getMonthlyStats(userId, year, month, locationId as string);
    res.json(stats);
  } catch (error: any) {
    console.error('Failed to get monthly stats:', error);
    res.status(500).json({ error: error.message || 'Failed to get monthly stats' });
  }
});

export default router;
