import { Router, Request, Response } from 'express';
import db, { generateId } from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// 获取所有筛选器
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const filters = db.prepare(`
      SELECT * FROM custom_filters 
      WHERE user_id = ? 
      ORDER BY updated_at DESC
    `).all(userId);

    // 解析JSON字段
    const parsedFilters = (filters as any[]).map(filter => ({
      ...filter,
      locationIds: filter.location_ids ? JSON.parse(filter.location_ids) : [],
      playerIds: filter.player_ids ? JSON.parse(filter.player_ids) : [],
    }));

    res.json(parsedFilters);
  } catch (error) {
    console.error('Error fetching custom filters:', error);
    res.status(500).json({ error: 'Failed to fetch filters' });
  }
});

// 获取单个筛选器
router.get('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const filter = db.prepare(`
      SELECT * FROM custom_filters 
      WHERE id = ? AND user_id = ?
    `).get(id, userId);

    if (!filter) {
      return res.status(404).json({ error: 'Filter not found' });
    }

    const parsedFilter = {
      ...(filter as any),
      locationIds: (filter as any).location_ids ? JSON.parse((filter as any).location_ids) : [],
      playerIds: (filter as any).player_ids ? JSON.parse((filter as any).player_ids) : [],
    };

    res.json(parsedFilter);
  } catch (error) {
    console.error('Error fetching custom filter:', error);
    res.status(500).json({ error: 'Failed to fetch filter' });
  }
});

// 创建筛选器
router.post('/', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, startDate, endDate, locationIds, playerIds } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const id = generateId();
    db.prepare(`
      INSERT INTO custom_filters (id, user_id, name, start_date, end_date, location_ids, player_ids)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      name,
      startDate || null,
      endDate || null,
      JSON.stringify(locationIds || []),
      JSON.stringify(playerIds || [])
    );

    const filter = db.prepare(`
      SELECT * FROM custom_filters WHERE id = ?
    `).get(id);

    const parsedFilter = {
      ...(filter as any),
      locationIds: (filter as any).location_ids ? JSON.parse((filter as any).location_ids) : [],
      playerIds: (filter as any).player_ids ? JSON.parse((filter as any).player_ids) : [],
    };

    res.status(201).json(parsedFilter);
  } catch (error) {
    console.error('Error creating custom filter:', error);
    res.status(500).json({ error: 'Failed to create filter' });
  }
});

// 更新筛选器
router.put('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { name, startDate, endDate, locationIds, playerIds } = req.body;

    // 检查筛选器是否存在且属于该用户
    const existing = db.prepare(`
      SELECT * FROM custom_filters WHERE id = ? AND user_id = ?
    `).get(id, userId);

    if (!existing) {
      return res.status(404).json({ error: 'Filter not found' });
    }

    db.prepare(`
      UPDATE custom_filters 
      SET name = ?, start_date = ?, end_date = ?, location_ids = ?, player_ids = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(
      name,
      startDate || null,
      endDate || null,
      JSON.stringify(locationIds || []),
      JSON.stringify(playerIds || []),
      id,
      userId
    );

    const filter = db.prepare(`
      SELECT * FROM custom_filters WHERE id = ?
    `).get(id);

    const parsedFilter = {
      ...(filter as any),
      locationIds: (filter as any).location_ids ? JSON.parse((filter as any).location_ids) : [],
      playerIds: (filter as any).player_ids ? JSON.parse((filter as any).player_ids) : [],
    };

    res.json(parsedFilter);
  } catch (error) {
    console.error('Error updating custom filter:', error);
    res.status(500).json({ error: 'Failed to update filter' });
  }
});

// 删除筛选器
router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const result = db.prepare(`
      DELETE FROM custom_filters WHERE id = ? AND user_id = ?
    `).run(id, userId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Filter not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting custom filter:', error);
    res.status(500).json({ error: 'Failed to delete filter' });
  }
});

// 获取筛选器统计数据
router.post('/:id/stats', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // 获取筛选器
    const filter = db.prepare(`
      SELECT * FROM custom_filters WHERE id = ? AND user_id = ?
    `).get(id, userId) as any;

    if (!filter) {
      return res.status(404).json({ error: 'Filter not found' });
    }

    const locationIds = filter.location_ids ? JSON.parse(filter.location_ids) : [];
    const playerIds = filter.player_ids ? JSON.parse(filter.player_ids) : [];
    const startDate = filter.start_date;
    const endDate = filter.end_date === 'TODAY' ? new Date().toISOString().split('T')[0] : filter.end_date;

    // 构建查询条件
    let whereConditions = ['g.user_id = ?'];
    let params: any[] = [userId];

    // 日期条件
    if (startDate) {
      whereConditions.push('DATE(g.created_at) >= ?');
      params.push(startDate);
    }
    if (endDate) {
      whereConditions.push('DATE(g.created_at) <= ?');
      params.push(endDate);
    }

    // 地点条件
    if (locationIds.length > 0) {
      whereConditions.push(`g.location_id IN (${locationIds.map(() => '?').join(',')})`);
      params.push(...locationIds);
    }

    // 获取"我"的ID
    const mePlayer = db.prepare(`
      SELECT id FROM players WHERE user_id = ? AND is_me = 1
    `).get(userId) as any;

    if (!mePlayer) {
      return res.status(400).json({ error: 'Me player not found' });
    }

    // 构建玩家匹配条件：对局必须包含"我"和所有选中的对手
    const requiredPlayerIds = [mePlayer.id, ...playerIds];
    
    // 查询满足条件的对局
    const gamesQuery = `
      SELECT g.id, g.created_at, g.location_id, g.chip_rate_id
      FROM games g
      WHERE ${whereConditions.join(' AND ')}
      AND g.id IN (
        SELECT game_id 
        FROM player_records 
        WHERE player_id IN (${requiredPlayerIds.map(() => '?').join(',')})
        GROUP BY game_id 
        HAVING COUNT(DISTINCT player_id) = ?
      )
      ORDER BY g.created_at
    `;

    const games = db.prepare(gamesQuery).all(
      ...params,
      ...requiredPlayerIds,
      requiredPlayerIds.length
    ) as any[];

    // 如果没有对局，返回空统计
    if (games.length === 0) {
      return res.json({
        overall: {
          totalGames: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          totalScore: 0,
          totalChips: 0,
          avgScorePerGame: 0,
          avgChipsPerGame: 0,
          maxWinScore: 0,
          maxLossScore: 0,
          maxWinChips: 0,
          maxLossChips: 0,
          maxDayWinScore: 0,
          maxDayLossScore: 0,
          maxDayWinChips: 0,
          maxDayLossChips: 0,
        },
        afternoon: {
          totalGames: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          totalScore: 0,
          totalChips: 0,
          avgScorePerGame: 0,
          avgChipsPerGame: 0,
          maxWinScore: 0,
          maxLossScore: 0,
          maxWinChips: 0,
          maxLossChips: 0,
        },
        evening: {
          totalGames: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          totalScore: 0,
          totalChips: 0,
          avgScorePerGame: 0,
          avgChipsPerGame: 0,
          maxWinScore: 0,
          maxLossScore: 0,
          maxWinChips: 0,
          maxLossChips: 0,
        },
        dailyStats: [],
        hasOtherTimeGames: false,
        games: [],
      });
    }

    // 获取所有对局的详细数据（我的分数和金额）
    const gameDetails = games.map(game => {
      const myRecord = db.prepare(`
        SELECT pr.score, pr.chips, lcr.chip_rate
        FROM player_records pr
        LEFT JOIN location_chip_rates lcr ON ? = lcr.id
        WHERE pr.game_id = ? AND pr.player_id = ?
      `).get(game.chip_rate_id, game.id, mePlayer.id) as any;

      const hour = new Date(game.created_at).getHours();
      let timeSlot = 'other';
      if (hour >= 12 && hour < 19) {
        timeSlot = 'afternoon';
      } else if (hour >= 19 && hour < 24) {
        timeSlot = 'evening';
      }

      return {
        ...game,
        score: myRecord?.score || 0,
        chips: myRecord?.chips || 0,
        chipRate: myRecord?.chip_rate || 0,
        date: game.created_at.split(' ')[0],
        timeSlot,
      };
    });

    // 检查是否有非统计时段的对局
    const hasOtherTimeGames = gameDetails.some(g => g.timeSlot === 'other');

    // 计算汇总统计
    const calculateStats = (games: any[]) => {
      const totalGames = games.length;
      const wins = games.filter(g => g.score > 0).length;
      const losses = games.filter(g => g.score < 0).length;
      const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;
      const totalScore = games.reduce((sum, g) => sum + g.score, 0);
      const totalChips = games.reduce((sum, g) => sum + g.chips, 0);
      const avgScorePerGame = totalGames > 0 ? totalScore / totalGames : 0;
      const avgChipsPerGame = totalGames > 0 ? totalChips / totalGames : 0;
      
      const winGames = games.filter(g => g.score > 0);
      const lossGames = games.filter(g => g.score < 0);
      
      const maxWinScore = winGames.length > 0 ? Math.max(...winGames.map(g => g.score)) : 0;
      const maxLossScore = lossGames.length > 0 ? Math.min(...lossGames.map(g => g.score)) : 0;
      const maxWinChips = winGames.length > 0 ? Math.max(...winGames.map(g => g.chips)) : 0;
      const maxLossChips = lossGames.length > 0 ? Math.min(...lossGames.map(g => g.chips)) : 0;

      return {
        totalGames,
        wins,
        losses,
        winRate: Math.round(winRate * 100) / 100,
        totalScore,
        totalChips,
        avgScorePerGame: Math.round(avgScorePerGame * 100) / 100,
        avgChipsPerGame: Math.round(avgChipsPerGame * 100) / 100,
        maxWinScore,
        maxLossScore,
        maxWinChips,
        maxLossChips,
        maxDayWinScore: 0,
        maxDayLossScore: 0,
        maxDayWinChips: 0,
        maxDayLossChips: 0,
      };
    };

    // 总体统计
    const overall: any = calculateStats(gameDetails);

    // 分时段统计
    const afternoonGames = gameDetails.filter(g => g.timeSlot === 'afternoon');
    const eveningGames = gameDetails.filter(g => g.timeSlot === 'evening');
    
    const afternoon = calculateStats(afternoonGames);
    const evening = calculateStats(eveningGames);

    // 按日统计
    const dailyMap = new Map<string, any>();
    gameDetails.forEach(game => {
      if (!dailyMap.has(game.date)) {
        dailyMap.set(game.date, {
          date: game.date,
          totalScore: 0,
          totalChips: 0,
          afternoonScore: 0,
          afternoonChips: 0,
          eveningScore: 0,
          eveningChips: 0,
          totalGames: 0,
          afternoonGames: 0,
          eveningGames: 0,
        });
      }
      const daily = dailyMap.get(game.date);
      daily.totalScore += game.score;
      daily.totalChips += game.chips;
      daily.totalGames += 1;
      
      if (game.timeSlot === 'afternoon') {
        daily.afternoonScore += game.score;
        daily.afternoonChips += game.chips;
        daily.afternoonGames += 1;
      } else if (game.timeSlot === 'evening') {
        daily.eveningScore += game.score;
        daily.eveningChips += game.chips;
        daily.eveningGames += 1;
      }
    });

    const dailyStats = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // 计算单日最大盈亏
    const dailyScores = dailyStats.map(d => d.totalScore);
    const dailyChips = dailyStats.map(d => d.totalChips);
    
    overall.maxDayWinScore = dailyScores.length > 0 ? Math.max(...dailyScores.filter(s => s > 0)) : 0;
    overall.maxDayLossScore = dailyScores.length > 0 ? Math.min(...dailyScores.filter(s => s < 0)) : 0;
    overall.maxDayWinChips = dailyChips.length > 0 ? Math.max(...dailyChips.filter(c => c > 0)) : 0;
    overall.maxDayLossChips = dailyChips.length > 0 ? Math.min(...dailyChips.filter(c => c < 0)) : 0;

    // 构建对局列表（包含完整信息）
    const gamesWithDetails = games.map(game => {
      // 获取地点信息
      const location = db.prepare('SELECT id, name FROM locations WHERE id = ?').get(game.location_id) as any;
      
      // 获取chip_rate信息
      const chipRateInfo = db.prepare('SELECT chip_rate FROM location_chip_rates WHERE id = ?').get(game.chip_rate_id) as any;
      
      // 获取所有玩家记录
      const records = db.prepare(`
        SELECT pr.id, pr.player_id, pr.score, pr.chips, p.name as player_name, p.is_me
        FROM player_records pr
        JOIN players p ON pr.player_id = p.id
        WHERE pr.game_id = ?
        ORDER BY p.is_me DESC
      `).all(game.id) as any[];

      return {
        id: game.id,
        createdAt: game.created_at,
        location: location || { id: game.location_id, name: '未知' },
        chipRate: chipRateInfo?.chip_rate || 0,
        records: records.map(r => ({
          id: r.id,
          playerId: r.player_id,
          score: r.score,
          chips: r.chips,
          player: {
            name: r.player_name,
            isMe: r.is_me === 1,
          },
        })),
      };
    });

    res.json({
      overall,
      afternoon,
      evening,
      dailyStats,
      hasOtherTimeGames,
      games: gamesWithDetails,
    });
  } catch (error) {
    console.error('Error calculating filter stats:', error);
    res.status(500).json({ error: 'Failed to calculate stats' });
  }
});

export default router;

