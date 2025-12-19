import { Router } from 'express';
import db, { generateId } from '../database';

const router = Router();

// 辅助函数：获取对局的完整信息
function getGameWithDetails(gameId: string) {
  const game = db.prepare(`
    SELECT 
      g.id,
      g.location_id as locationId,
      g.chip_rate as chipRate,
      g.is_complete as isComplete,
      g.is_balanced as isBalanced,
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
    isBalanced: game.isBalanced !== null ? Boolean(game.isBalanced) : null,
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
        g.is_balanced as isBalanced,
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
    const { locationId, chipRate, records, note } = req.body;
    
    // 验证参数
    if (!locationId || !chipRate || !records || records.length === 0) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    // 检查是否完整记录（4个玩家）
    const isComplete = records.length === 4;
    
    // 计算总分，检查是否平账
    let isBalanced = null;
    if (isComplete) {
      const totalScore = records.reduce((sum: number, r: any) => sum + r.score, 0);
      isBalanced = totalScore === 0;
    }

    const gameId = generateId();
    const now = new Date().toISOString();

    // 使用事务创建对局和记录
    const createGame = db.transaction(() => {
      // 创建对局
      db.prepare(`
        INSERT INTO games (id, location_id, chip_rate, is_complete, is_balanced, note, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        gameId,
        locationId,
        chipRate,
        isComplete ? 1 : 0,
        isBalanced !== null ? (isBalanced ? 1 : 0) : null,
        note || null,
        now,
        now
      );

      // 创建玩家记录
      const insertRecord = db.prepare(`
        INSERT INTO player_records (id, game_id, player_id, score, chips, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const record of records) {
        const recordId = generateId();
        const chips = record.score * chipRate;
        insertRecord.run(recordId, gameId, record.playerId, record.score, chips, now);
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
    const { locationId, chipRate, records, note } = req.body;
    
    // 验证参数
    if (!locationId || !chipRate || !records || records.length === 0) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    // 检查是否完整记录
    const isComplete = records.length === 4;
    let isBalanced = null;
    if (isComplete) {
      const totalScore = records.reduce((sum: number, r: any) => sum + r.score, 0);
      isBalanced = totalScore === 0;
    }

    const now = new Date().toISOString();

    // 使用事务更新对局和记录
    const updateGame = db.transaction(() => {
      // 删除旧的记录
      db.prepare('DELETE FROM player_records WHERE game_id = ?').run(req.params.id);

      // 更新对局
      db.prepare(`
        UPDATE games 
        SET location_id = ?, chip_rate = ?, is_complete = ?, is_balanced = ?, note = ?, updated_at = ?
        WHERE id = ?
      `).run(
        locationId,
        chipRate,
        isComplete ? 1 : 0,
        isBalanced !== null ? (isBalanced ? 1 : 0) : null,
        note || null,
        now,
        req.params.id
      );

      // 创建新的记录
      const insertRecord = db.prepare(`
        INSERT INTO player_records (id, game_id, player_id, score, chips, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const record of records) {
        const recordId = generateId();
        const chips = record.score * chipRate;
        insertRecord.run(recordId, req.params.id, record.playerId, record.score, chips, now);
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

export default router;
