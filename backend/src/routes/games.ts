import { Router } from 'express';
import db, { generateId } from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getLocalTimestamp } from '../utils/time';

const router = Router();

router.use(authMiddleware);

function getGameWithDetails(gameId: string, userId: string) {
  const game = db.prepare(`
    SELECT 
      g.id,
      g.location_id as locationId,
      g.game_type_id as gameTypeId,
      g.chip_rate_id as chipRateId,
      lcr.chip_rate as chipRate,
      gt.name as gameTypeName,
      g.is_complete as isComplete,
      g.note,
      g.created_at as createdAt,
      g.updated_at as updatedAt,
      l.id as "location.id",
      l.name as "location.name",
      l.is_default as "location.isDefault",
      l.created_at as "location.createdAt"
    FROM games g
    JOIN locations l ON g.location_id = l.id
    LEFT JOIN location_chip_rates lcr ON g.chip_rate_id = lcr.id
    LEFT JOIN game_types gt ON g.game_type_id = gt.id
    WHERE g.id = ? AND g.user_id = ?
  `).get(gameId, userId) as any;

  if (!game) return null;

  const records = db.prepare(`
    SELECT 
      pr.id,
      pr.game_id as gameId,
      pr.player_id as playerId,
      pr.score,
      pr.chips,
      pr.created_at as createdAt,
      p.id as "player.id",
      p.name as "player.name",
      p.avatar as "player.avatar",
      p.is_me as "player.isMe",
      p.created_at as "player.createdAt",
      p.updated_at as "player.updatedAt"
    FROM player_records pr
    JOIN players p ON pr.player_id = p.id
    WHERE pr.game_id = ? AND p.user_id = ?
    ORDER BY pr.created_at ASC
  `).all(gameId, userId) as any[];

  return {
    id: game.id,
    locationId: game.locationId,
    gameTypeId: game.gameTypeId,
    chipRateId: game.chipRateId,
    chipRate: game.chipRate,
    gameType: game.gameTypeName ? {
      id: game.gameTypeId,
      name: game.gameTypeName
    } : undefined,
    isComplete: Boolean(game.isComplete),
    note: game.note,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    location: {
      id: game['location.id'],
      name: game['location.name'],
      isDefault: Boolean(game['location.isDefault']),
      createdAt: game['location.createdAt']
    },
    records: records.map((r: any) => ({
      id: r.id,
      gameId: r.gameId,
      playerId: r.playerId,
      score: r.score,
      chips: r.chips,
      createdAt: r.createdAt,
      player: {
        id: r['player.id'],
        name: r['player.name'],
        avatar: r['player.avatar'],
        isMe: Boolean(r['player.isMe']),
        createdAt: r['player.createdAt'],
        updatedAt: r['player.updatedAt']
      }
    }))
  };
}

router.get('/', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { limit, offset } = req.query;
    
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
      ORDER BY g.created_at DESC
    `;
    
    const params: any[] = [userId];
    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit as string));
    }
    if (offset) {
      query += ' OFFSET ?';
      params.push(parseInt(offset as string));
    }
    
    const games = db.prepare(query).all(...params);
    
    const gamesWithDetails = games.map((game: any) => getGameWithDetails(game.id, userId));
    
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
    const game = getGameWithDetails(id, userId);
    
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

    const gameId = generateId();
    const now = getLocalTimestamp();
    const gameTime = createdAt || now;
    const myChips = myScore * chipRate.chip_rate;

    const createGame = db.transaction(() => {
      db.prepare(`
        INSERT INTO games (id, user_id, location_id, game_type_id, chip_rate_id, is_complete, note, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
      `).run(
        gameId,
        userId,
        locationId,
        gameTypeId,
        chipRateId,
        note || null,
        gameTime,
        now
      );

      const insertRecord = db.prepare(`
        INSERT INTO player_records (id, game_id, player_id, score, chips, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const playerId of playerIds) {
        const recordId = generateId();
        if (playerId === mePlayer.id) {
          insertRecord.run(recordId, gameId, playerId, myScore, myChips, gameTime);
        } else {
          insertRecord.run(recordId, gameId, playerId, null, null, gameTime);
        }
      }
    });

    createGame();

    const game = getGameWithDetails(gameId, userId);
    
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

    const game = getGameWithDetails(id, userId);
    
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
    const month = monthParam ? parseInt(monthParam as string) - 1 : now.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const firstDayOfNextMonth = new Date(year, month + 1, 1);
    
    const startDate = firstDayOfMonth.toISOString();
    const endDate = firstDayOfNextMonth.toISOString();
    
    const mePlayer = db.prepare('SELECT id FROM players WHERE is_me = 1 AND user_id = ?').get(userId) as any;
    if (!mePlayer) {
      return res.status(404).json({ error: 'Current user not found, please create "我" player first' });
    }
    
    let query = `
      SELECT 
        pr.chips,
        g.created_at as createdAt,
        g.game_type_id as gameTypeId,
        gt.name as gameTypeName
      FROM player_records pr
      JOIN games g ON pr.game_id = g.id
      LEFT JOIN game_types gt ON g.game_type_id = gt.id
      WHERE pr.player_id = ?
        AND g.user_id = ?
        AND g.created_at >= ?
        AND g.created_at < ?
    `;
    const params: any[] = [mePlayer.id, userId, startDate, endDate];
    
    if (locationId) {
      const location = db.prepare(`
        SELECT id FROM locations WHERE id = ? AND user_id = ?
      `).get(locationId, userId) as any;
      if (!location) {
        return res.status(404).json({ error: 'Location not found' });
      }
      query += ` AND g.location_id = ?`;
      params.push(locationId);
    }
    
    query += ` ORDER BY g.created_at ASC`;
    
    const records = db.prepare(query).all(...params) as any[];
    
    const locationQuery = `
      SELECT DISTINCT g.location_id, l.name
      FROM player_records pr
      JOIN games g ON pr.game_id = g.id
      JOIN locations l ON g.location_id = l.id
      WHERE pr.player_id = ?
        AND g.user_id = ?
        AND l.user_id = ?
        AND g.created_at >= ?
        AND g.created_at < ?
      ORDER BY l.name
    `;
    const availableLocations = db.prepare(locationQuery).all(mePlayer.id, userId, userId, startDate, endDate) as any[];
    
    const earliestDateQuery = `
      SELECT MIN(g.created_at) as earliest_date
      FROM player_records pr
      JOIN games g ON pr.game_id = g.id
      WHERE pr.player_id = ?
        AND g.user_id = ?
        AND pr.chips IS NOT NULL
    `;
    const earliestDateResult = db.prepare(earliestDateQuery).get(mePlayer.id, userId) as any;
    let earliestYear = null;
    let earliestMonth = null;
    if (earliestDateResult && earliestDateResult.earliest_date) {
      const earliestDate = new Date(earliestDateResult.earliest_date);
      earliestYear = earliestDate.getFullYear();
      earliestMonth = earliestDate.getMonth() + 1;
    }
    
    let totalIncome = 0;
    let totalExpense = 0;
    let winGames = 0;
    let loseGames = 0;
    
    let afternoonWins = 0;
    let afternoonLoses = 0;
    let afternoonIncome = 0;
    let afternoonExpense = 0;
    
    let eveningWins = 0;
    let eveningLoses = 0;
    let eveningIncome = 0;
    let eveningExpense = 0;
    
    const gameTypeStats: Record<string, {
      name: string;
      totalGames: number;
      winGames: number;
      loseGames: number;
      winRate: number;
      totalIncome: number;
      totalExpense: number;
      profit: number;
    }> = {};
    
    records.forEach(record => {
      const chips = record.chips;
      
      if (chips > 0) {
        totalIncome += chips;
        winGames++;
      } else if (chips < 0) {
        totalExpense += Math.abs(chips);
        loseGames++;
      }
      
      const gameTime = new Date(record.createdAt);
      const hour = gameTime.getHours();
      
      if (hour < 20) {
        if (chips > 0) {
          afternoonWins++;
          afternoonIncome += chips;
        } else if (chips < 0) {
          afternoonLoses++;
          afternoonExpense += Math.abs(chips);
        }
      } else {
        if (chips > 0) {
          eveningWins++;
          eveningIncome += chips;
        } else if (chips < 0) {
          eveningLoses++;
          eveningExpense += Math.abs(chips);
        }
      }
      
      const gameTypeId = record.gameTypeId || 'unknown';
      const gameTypeName = record.gameTypeName || '未知玩法';
      
      if (!gameTypeStats[gameTypeId]) {
        gameTypeStats[gameTypeId] = {
          name: gameTypeName,
          totalGames: 0,
          winGames: 0,
          loseGames: 0,
          winRate: 0,
          totalIncome: 0,
          totalExpense: 0,
          profit: 0
        };
      }
      
      const gt = gameTypeStats[gameTypeId];
      gt.totalGames++;
      
      if (chips > 0) {
        gt.winGames++;
        gt.totalIncome += chips;
      } else if (chips < 0) {
        gt.loseGames++;
        gt.totalExpense += Math.abs(chips);
      }
    });
    
    Object.values(gameTypeStats).forEach(gt => {
      gt.profit = gt.totalIncome - gt.totalExpense;
      gt.winRate = gt.totalGames > 0 ? Math.round((gt.winGames / gt.totalGames) * 100) : 0;
    });
    
    const totalGames = winGames + loseGames;
    const profit = totalIncome - totalExpense;
    const winRate = totalGames > 0 ? Math.round((winGames / totalGames) * 100) : 0;
    
    const afternoonTotal = afternoonWins + afternoonLoses;
    const afternoonWinRate = afternoonTotal > 0 ? Math.round((afternoonWins / afternoonTotal) * 100) : 0;
    const afternoonProfit = afternoonIncome - afternoonExpense;
    
    const eveningTotal = eveningWins + eveningLoses;
    const eveningWinRate = eveningTotal > 0 ? Math.round((eveningWins / eveningTotal) * 100) : 0;
    const eveningProfit = eveningIncome - eveningExpense;
    
    res.json({
      month: `${year}-${String(month + 1).padStart(2, '0')}`,
      availableLocations: availableLocations.map(loc => ({
        id: loc.location_id,
        name: loc.name
      })),
      earliestMonth: earliestYear && earliestMonth ? {
        year: earliestYear,
        month: earliestMonth
      } : null,
      overall: {
        totalIncome,
        totalExpense,
        profit,
        totalGames,
        winGames,
        loseGames,
        winRate
      },
      afternoon: {
        totalGames: afternoonTotal,
        winGames: afternoonWins,
        loseGames: afternoonLoses,
        winRate: afternoonWinRate,
        totalIncome: afternoonIncome,
        totalExpense: afternoonExpense,
        profit: afternoonProfit
      },
      evening: {
        totalGames: eveningTotal,
        winGames: eveningWins,
        loseGames: eveningLoses,
        winRate: eveningWinRate,
        totalIncome: eveningIncome,
        totalExpense: eveningExpense,
        profit: eveningProfit
      },
      byGameType: gameTypeStats
    });
  } catch (error) {
    console.error('Failed to get monthly stats:', error);
    res.status(500).json({ error: 'Failed to get monthly stats' });
  }
});

export default router;
