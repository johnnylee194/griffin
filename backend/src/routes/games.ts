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

// 辅助函数：获取对局的完整信息
function getGameWithDetails(gameId: string) {
  const game = db.prepare(`
    SELECT 
      g.id,
      g.location_id as locationId,
      g.chip_rate as chipRate,
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
    WHERE g.id = ?
  `).get(gameId) as any;

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
    WHERE pr.game_id = ?
    ORDER BY pr.created_at ASC
  `).all(gameId) as any[];

  // 重构数据结构
  return {
    id: game.id,
    locationId: game.locationId,
    chipRate: game.chipRate,
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

// 获取所有对局
router.get('/', (req, res) => {
  try {
    const { limit, offset } = req.query;
    
    let query = `
      SELECT 
        g.id,
        g.location_id as locationId,
        g.chip_rate as chipRate,
        g.is_complete as isComplete,
        g.note,
        g.created_at as createdAt,
        g.updated_at as updatedAt
      FROM games g
      ORDER BY g.created_at DESC
    `;
    
    const params: any[] = [];
    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit as string));
    }
    if (offset) {
      query += ' OFFSET ?';
      params.push(parseInt(offset as string));
    }
    
    const games = db.prepare(query).all(...params);
    
    // 为每个对局获取详细信息
    const gamesWithDetails = games.map((game: any) => getGameWithDetails(game.id));
    
    res.json(gamesWithDetails);
  } catch (error) {
    console.error('Failed to fetch games:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// 获取单个对局
router.get('/:id', (req, res) => {
  try {
    const game = getGameWithDetails(req.params.id);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json(game);
  } catch (error) {
    console.error('Failed to fetch game:', error);
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// 创建对局
router.post('/', (req, res) => {
  try {
    const { locationId, chipRate, playerIds, myScore, note, createdAt } = req.body;
    
    // 验证参数
    if (!locationId || !chipRate || !playerIds || !Array.isArray(playerIds) || playerIds.length < 1) {
      return res.status(400).json({ error: '至少需要选择1个玩家' });
    }
    
    if (myScore === undefined || myScore === null) {
      return res.status(400).json({ error: '必须输入我的分数' });
    }

    // 获取"我"的玩家ID
    const mePlayer = db.prepare('SELECT id FROM players WHERE is_me = 1').get() as any;
    if (!mePlayer) {
      return res.status(404).json({ error: '当前用户未找到' });
    }
    
    // 验证"我"是否在playerIds中
    if (!playerIds.includes(mePlayer.id)) {
      return res.status(400).json({ error: '玩家列表中必须包含"我"' });
    }

    const gameId = generateId();
    const now = getLocalTimestamp();
    // 使用自定义时间或当前时间
    const gameTime = createdAt || now;
    const myChips = myScore * chipRate;

    // 使用事务创建对局和记录
    const createGame = db.transaction(() => {
      // 创建对局（强制4人局，is_complete = 1）
      db.prepare(`
        INSERT INTO games (id, location_id, chip_rate, is_complete, note, created_at, updated_at)
        VALUES (?, ?, ?, 1, ?, ?, ?)
      `).run(
        gameId,
        locationId,
        chipRate,
        note || null,
        gameTime,
        now
      );

      // 创建玩家记录
      const insertRecord = db.prepare(`
        INSERT INTO player_records (id, game_id, player_id, score, chips, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const playerId of playerIds) {
        const recordId = generateId();
        if (playerId === mePlayer.id) {
          // 只有"我"记录score和chips
          insertRecord.run(recordId, gameId, playerId, myScore, myChips, gameTime);
        } else {
          // 其他玩家score和chips为NULL
          insertRecord.run(recordId, gameId, playerId, null, null, gameTime);
        }
      }
    });

    createGame();

    // 获取创建的对局详情
    const game = getGameWithDetails(gameId);
    
    res.status(201).json(game);
  } catch (error) {
    console.error('Failed to create game:', error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// 更新对局
router.put('/:id', (req, res) => {
  try {
    const { locationId, chipRate, playerIds, myScore, note, createdAt } = req.body;
    
    // 验证参数
    if (!locationId || !chipRate || !playerIds || !Array.isArray(playerIds) || playerIds.length < 1) {
      return res.status(400).json({ error: '至少需要选择1个玩家' });
    }
    
    if (myScore === undefined || myScore === null) {
      return res.status(400).json({ error: '必须输入我的分数' });
    }

    // 获取"我"的玩家ID
    const mePlayer = db.prepare('SELECT id FROM players WHERE is_me = 1').get() as any;
    if (!mePlayer) {
      return res.status(404).json({ error: '当前用户未找到' });
    }
    
    // 验证"我"是否在playerIds中
    if (!playerIds.includes(mePlayer.id)) {
      return res.status(400).json({ error: '玩家列表中必须包含"我"' });
    }

    const now = getLocalTimestamp();
    // 使用自定义时间或保持原有时间
    const gameTime = createdAt || now;
    const myChips = myScore * chipRate;

    // 使用事务更新对局和记录
    const updateGame = db.transaction(() => {
      // 删除旧的记录
      db.prepare('DELETE FROM player_records WHERE game_id = ?').run(req.params.id);

      // 更新对局
      db.prepare(`
        UPDATE games 
        SET location_id = ?, chip_rate = ?, is_complete = 1, note = ?, created_at = ?, updated_at = ?
        WHERE id = ?
      `).run(
        locationId,
        chipRate,
        note || null,
        gameTime,
        now,
        req.params.id
      );

      // 创建新的记录
      const insertRecord = db.prepare(`
        INSERT INTO player_records (id, game_id, player_id, score, chips, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const playerId of playerIds) {
        const recordId = generateId();
        if (playerId === mePlayer.id) {
          // 只有"我"记录score和chips
          insertRecord.run(recordId, req.params.id, playerId, myScore, myChips, gameTime);
        } else {
          // 其他玩家score和chips为NULL
          insertRecord.run(recordId, req.params.id, playerId, null, null, gameTime);
        }
      }
    });

    updateGame();

    // 获取更新后的对局详情
    const game = getGameWithDetails(req.params.id);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(game);
  } catch (error) {
    console.error('Failed to update game:', error);
    res.status(500).json({ error: 'Failed to update game' });
  }
});

// 删除对局
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM games WHERE id = ?').run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete game:', error);
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

// 获取月度统计（首页用）
router.get('/stats/monthly', (req, res) => {
  try {
    // 支持自定义年月参数，默认为当前月份
    const { year: yearParam, month: monthParam } = req.query;
    const now = new Date();
    const year = yearParam ? parseInt(yearParam as string) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam as string) - 1 : now.getMonth(); // 0-11
    
    const firstDayOfMonth = new Date(year, month, 1);
    const firstDayOfNextMonth = new Date(year, month + 1, 1);
    
    const startDate = firstDayOfMonth.toISOString();
    const endDate = firstDayOfNextMonth.toISOString();
    
    // 获取当前用户（"我"）的ID
    const mePlayer = db.prepare('SELECT id FROM players WHERE is_me = 1').get() as any;
    if (!mePlayer) {
      return res.status(404).json({ error: 'Current user not found' });
    }
    
    // 获取本月所有对局记录（只统计"我"的记录）
    const records = db.prepare(`
      SELECT 
        pr.chips,
        g.created_at as createdAt
      FROM player_records pr
      JOIN games g ON pr.game_id = g.id
      WHERE pr.player_id = ?
        AND g.created_at >= ?
        AND g.created_at < ?
      ORDER BY g.created_at ASC
    `).all(mePlayer.id, startDate, endDate) as any[];
    
    // 计算总体统计
    let totalIncome = 0;
    let totalExpense = 0;
    let winGames = 0;
    let loseGames = 0;
    
    // 下午场统计（20:00前）
    let afternoonWins = 0;
    let afternoonLoses = 0;
    let afternoonIncome = 0;
    let afternoonExpense = 0;
    
    // 晚上场统计（20:00后）
    let eveningWins = 0;
    let eveningLoses = 0;
    let eveningIncome = 0;
    let eveningExpense = 0;
    
    records.forEach(record => {
      const chips = record.chips;
      
      // 收支统计
      if (chips > 0) {
        totalIncome += chips;
        winGames++;
      } else if (chips < 0) {
        totalExpense += Math.abs(chips);
        loseGames++;
      }
      
      // 时间段统计
      const gameTime = new Date(record.createdAt);
      const hour = gameTime.getHours();
      
      if (hour < 20) {
        // 下午场（20:00前）
        if (chips > 0) {
          afternoonWins++;
          afternoonIncome += chips;
        } else if (chips < 0) {
          afternoonLoses++;
          afternoonExpense += Math.abs(chips);
        }
      } else {
        // 晚上场（20:00后）
        if (chips > 0) {
          eveningWins++;
          eveningIncome += chips;
        } else if (chips < 0) {
          eveningLoses++;
          eveningExpense += Math.abs(chips);
        }
      }
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
      }
    });
  } catch (error) {
    console.error('Failed to get monthly stats:', error);
    res.status(500).json({ error: 'Failed to get monthly stats' });
  }
});

export default router;
