import { Router } from 'express';
import db from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { StatsService } from '../services/stats.service';

const router = Router();

// 所有路由都需要认证
router.use(authMiddleware);

// 获取玩家统计数据
router.get('/player/:playerId', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { playerId } = req.params;
    const { startDate, endDate, locationId } = req.query;

    // 验证玩家是否属于当前用户
    const player = db.prepare(`
      SELECT id FROM players WHERE id = ? AND user_id = ?
    `).get(playerId, userId) as any;
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // 构建查询条件
    let dateFilter = '';
    const params: any[] = [playerId, userId];
    
    if (startDate || endDate) {
      if (startDate && endDate) {
        dateFilter = ' AND g.created_at BETWEEN ? AND ?';
        params.push(startDate as string, endDate as string);
      } else if (startDate) {
        dateFilter = ' AND g.created_at >= ?';
        params.push(startDate as string);
      } else if (endDate) {
        dateFilter = ' AND g.created_at <= ?';
        params.push(endDate as string);
      }
    }

    // 添加地点筛选
    let locationFilter = '';
    if (locationId) {
      // 验证地点是否属于当前用户
      const location = db.prepare(`
        SELECT id FROM locations WHERE id = ? AND user_id = ?
      `).get(locationId, userId) as any;
      if (!location) {
        return res.status(404).json({ error: 'Location not found' });
      }
      locationFilter = ' AND g.location_id = ?';
      params.push(locationId as string);
    }

    // 获取所有记录（只查询当前用户的游戏）
    const records = db.prepare(`
      SELECT 
        pr.id,
        pr.score,
        pr.chips,
        pr.created_at as createdAt,
        g.id as gameId,
        g.created_at as gameCreatedAt,
        l.name as locationName
      FROM player_records pr
      JOIN games g ON pr.game_id = g.id
      JOIN locations l ON g.location_id = l.id
      WHERE pr.player_id = ? AND g.user_id = ?${dateFilter}${locationFilter}
      ORDER BY g.created_at DESC
    `).all(...params) as any[];

    // 计算统计数据
    const totalGames = records.length;
    const totalScore = records.reduce((sum, r) => sum + (r.score || 0), 0);
    const totalChips = records.reduce((sum, r) => sum + (r.chips || 0), 0);
    const wins = records.filter(r => (r.score || 0) > 0).length;
    const losses = records.filter(r => (r.score || 0) < 0).length;
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

    // 按地点统计
    const locationStatsMap = records.reduce((acc: any, r) => {
      const locName = r.locationName;
      if (!acc[locName]) {
        acc[locName] = {
          games: 0,
          totalScore: 0,
          totalChips: 0,
          wins: 0,
          losses: 0
        };
      }
      acc[locName].games++;
      acc[locName].totalScore += (r.score || 0);
      acc[locName].totalChips += (r.chips || 0);
      if ((r.score || 0) > 0) acc[locName].wins++;
      if ((r.score || 0) < 0) acc[locName].losses++;
      return acc;
    }, {});

    // 按日期统计
    const dailyStatsMap = records.reduce((acc: any, r) => {
      const date = r.gameCreatedAt.split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          games: 0,
          totalScore: 0,
          totalChips: 0,
          wins: 0,
          losses: 0
        };
      }
      acc[date].games++;
      acc[date].totalScore += (r.score || 0);
      acc[date].totalChips += (r.chips || 0);
      if ((r.score || 0) > 0) acc[date].wins++;
      if ((r.score || 0) < 0) acc[date].losses++;
      return acc;
    }, {});

    res.json({
      overall: {
        totalGames,
        totalScore,
        totalChips,
        wins,
        losses,
        winRate: Math.round(winRate * 100) / 100,
        avgScore: totalGames > 0 ? Math.round((totalScore / totalGames) * 100) / 100 : 0,
        avgChips: totalGames > 0 ? Math.round((totalChips / totalGames) * 100) / 100 : 0
      },
      byLocation: locationStatsMap,
      byDate: dailyStatsMap
    });
  } catch (error) {
    console.error('Failed to fetch player stats:', error);
    res.status(500).json({ error: 'Failed to fetch player stats' });
  }
});

// 获取总体统计
router.get('/overview', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const params: any[] = [userId];
    
    if (startDate || endDate) {
      if (startDate && endDate) {
        dateFilter = ' AND created_at BETWEEN ? AND ?';
        params.push(startDate as string, endDate as string);
      } else if (startDate) {
        dateFilter = ' AND created_at >= ?';
        params.push(startDate as string);
      } else if (endDate) {
        dateFilter = ' AND created_at <= ?';
        params.push(endDate as string);
      }
    }

    const totalGames = db.prepare(`SELECT COUNT(*) as count FROM games WHERE user_id = ?${dateFilter}`).get(...params) as { count: number };
    const totalPlayers = db.prepare('SELECT COUNT(*) as count FROM players WHERE user_id = ?').get(userId) as { count: number };
    const totalLocations = db.prepare('SELECT COUNT(*) as count FROM locations WHERE user_id = ?').get(userId) as { count: number };

    res.json({
      totalGames: totalGames.count,
      totalPlayers: totalPlayers.count,
      totalLocations: totalLocations.count
    });
  } catch (error) {
    console.error('Failed to fetch overview stats:', error);
    res.status(500).json({ error: 'Failed to fetch overview stats' });
  }
});

// 辅助函数：获取农历年（简化版，使用春节日期判断）
// 返回格式：{ year: 2025, startDate: '2025-01-29', endDate: '2026-02-16' }
function getLunarYear(date: Date): { year: number; startDate: string; endDate: string } {
  const year = date.getFullYear();
  // 简化版：使用近几年的春节日期（公历）
  // 2024年春节：2024-02-10
  // 2025年春节：2025-01-29
  // 2026年春节：2026-02-17
  // 2027年春节：2027-02-06
  const springFestivalDates: { [key: number]: string } = {
    2024: '2024-02-10',
    2025: '2025-01-29',
    2026: '2026-02-17',
    2027: '2027-02-06',
    2028: '2028-01-26',
    2029: '2029-02-13',
    2030: '2030-02-03'
  };

  const currentDateStr = date.toISOString().split('T')[0];
  let lunarYear = year;
  let startDate = `${year}-01-01`;
  let endDate = `${year + 1}-01-01`;

  // 检查是否在当前年的春节之前
  const currentYearSpringFestival = springFestivalDates[year];
  if (currentYearSpringFestival && currentDateStr < currentYearSpringFestival) {
    // 属于上一个农历年
    lunarYear = year - 1;
    const prevYearSpringFestival = springFestivalDates[year - 1];
    if (prevYearSpringFestival) {
      startDate = prevYearSpringFestival;
      endDate = currentYearSpringFestival;
    } else {
      startDate = `${year - 1}-01-01`;
      endDate = currentYearSpringFestival;
    }
  } else {
    // 属于当前农历年
    const nextYearSpringFestival = springFestivalDates[year + 1];
    if (currentYearSpringFestival) {
      startDate = currentYearSpringFestival;
    }
    if (nextYearSpringFestival) {
      endDate = nextYearSpringFestival;
    }
  }

  return { year: lunarYear, startDate, endDate };
}

// 获取年度统计（支持年份参数）
router.get('/annual', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const yearParam = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    
    const stats = StatsService.getAnnualStats(userId, yearParam, false);
    res.json(stats);
  } catch (error) {
    console.error('Failed to fetch annual stats:', error);
    res.status(500).json({ error: 'Failed to fetch annual stats' });
  }
});

// 获取农历年统计（支持年份参数）
router.get('/lunar-annual', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const yearParam = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    
    const stats = StatsService.getAnnualStats(userId, yearParam, true);
    res.json(stats);
  } catch (error) {
    console.error('Failed to fetch lunar annual stats:', error);
    res.status(500).json({ error: 'Failed to fetch lunar annual stats' });
  }
});

// 获取单个玩家在场时我的胜率统计
router.get('/player-performance', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    // 获取"我"的玩家ID
    const mePlayer = db.prepare('SELECT id FROM players WHERE is_me = 1 AND user_id = ?').get(userId) as any;
    if (!mePlayer) {
      return res.status(404).json({ error: '当前用户未找到，请先创建"我"这个玩家' });
    }

    // 获取所有四人局（is_complete = 1）的对局（只查询当前用户的）
    const games = db.prepare(`
      SELECT g.id, g.created_at
      FROM games g
      WHERE g.is_complete = 1 AND g.user_id = ?
      ORDER BY g.created_at DESC
    `).all(userId) as any[];

    // 统计每个玩家在场时我的胜率
    const playerStatsMap: Record<string, { wins: number; total: number; winRate: number; playerName: string }> = {};

    for (const game of games) {
      // 获取该对局的所有玩家记录
      const records = db.prepare(`
        SELECT pr.player_id, pr.chips, p.name, p.is_me
        FROM player_records pr
        JOIN players p ON pr.player_id = p.id
        WHERE pr.game_id = ?
      `).all(game.id) as any[];

      // 获取我的记录（判断是否赢）
      const myRecord = records.find(r => r.is_me === 1);
      if (!myRecord) continue;

      const isWin = myRecord.chips > 0;

      // 遍历其他玩家（不计分的玩家也在场）
      for (const record of records) {
        if (record.is_me === 1) continue; // 跳过我自己

        const playerId = record.player_id;
        if (!playerStatsMap[playerId]) {
          playerStatsMap[playerId] = {
            wins: 0,
            total: 0,
            winRate: 0,
            playerName: record.name
          };
        }

        playerStatsMap[playerId].total++;
        if (isWin) {
          playerStatsMap[playerId].wins++;
        }
      }
    }

    // 计算每个玩家的总盈亏
    const playerChipsMap: Record<string, { totalScore: number; totalChips: number }> = {};
    for (const game of games) {
      const records = db.prepare(`
        SELECT pr.player_id, pr.chips, pr.score, p.is_me
        FROM player_records pr
        JOIN players p ON pr.player_id = p.id
        WHERE pr.game_id = ?
      `).all(game.id) as any[];

      const myRecord = records.find(r => r.is_me === 1);
      if (!myRecord) continue;

      for (const record of records) {
        if (record.is_me === 1) continue;
        const playerId = record.player_id;
        if (!playerChipsMap[playerId]) {
          playerChipsMap[playerId] = { totalScore: 0, totalChips: 0 };
        }
        playerChipsMap[playerId].totalScore += myRecord.score || 0;
        playerChipsMap[playerId].totalChips += myRecord.chips || 0;
      }
    }

    // 计算胜率并转换为数组
    const playerStats = Object.entries(playerStatsMap)
      .map(([playerId, stats]) => ({
        playerId,
        playerName: stats.playerName,
        totalGames: stats.total,
        wins: stats.wins,
        losses: stats.total - stats.wins,
        winRate: stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0,
        totalScore: playerChipsMap[playerId]?.totalScore || 0,
        totalChips: playerChipsMap[playerId]?.totalChips || 0,
        avgScorePerGame: stats.total > 0 ? Math.round((playerChipsMap[playerId]?.totalScore || 0) / stats.total) : 0,
        avgChipsPerGame: stats.total > 0 ? Math.round((playerChipsMap[playerId]?.totalChips || 0) / stats.total) : 0,
      }))
      .sort((a, b) => {
        // 按总场次排序（场次多的优先）
        return b.totalGames - a.totalGames;
      });

    res.json(playerStats);
  } catch (error) {
    console.error('Failed to fetch player performance stats:', error);
    res.status(500).json({ error: 'Failed to fetch player performance stats' });
  }
});

// 获取两个玩家组合和我一起时的胜率统计
router.get('/double-combination', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    // 获取"我"的玩家ID
    const mePlayer = db.prepare('SELECT id FROM players WHERE is_me = 1 AND user_id = ?').get(userId) as any;
    if (!mePlayer) {
      return res.status(404).json({ error: '当前用户未找到，请先创建"我"这个玩家' });
    }

    // 获取所有对局（只查询当前用户的）
    const games = db.prepare(`
      SELECT g.id, g.created_at
      FROM games g
      WHERE g.is_complete = 1 AND g.user_id = ?
      ORDER BY g.created_at DESC
    `).all(userId) as any[];

    // 统计每个两个玩家组合的胜率
    const combinationStatsMap: Record<string, { wins: number; total: number; playerNames: string[]; totalScore: number; totalChips: number }> = {};

    for (const game of games) {
      // 获取该对局的所有玩家记录
      const records = db.prepare(`
        SELECT pr.player_id, pr.chips, pr.score, p.name, p.is_me
        FROM player_records pr
        JOIN players p ON pr.player_id = p.id
        WHERE pr.game_id = ?
      `).all(game.id) as any[];

      // 获取我的记录（判断是否赢）
      const myRecord = records.find(r => r.is_me === 1);
      if (!myRecord) continue;

      const isWin = myRecord.chips > 0;

      // 获取其他玩家（排除我）
      const otherPlayers = records
        .filter(r => r.is_me !== 1)
        .map(r => ({ id: r.player_id, name: r.name }));

      if (otherPlayers.length < 2) continue; // 至少要有2个其他玩家

      // 生成所有两人组合
      for (let i = 0; i < otherPlayers.length; i++) {
        for (let j = i + 1; j < otherPlayers.length; j++) {
          const player1 = otherPlayers[i];
          const player2 = otherPlayers[j];
          
          // 生成组合key（按player_id排序，确保组合唯一）
          const playerIds = [player1.id, player2.id].sort();
          const combinationKey = playerIds.join(',');

          if (!combinationStatsMap[combinationKey]) {
            combinationStatsMap[combinationKey] = {
              wins: 0,
              total: 0,
              playerNames: [player1.name, player2.name].sort(),
              totalScore: 0,
              totalChips: 0,
            };
          }

          combinationStatsMap[combinationKey].total++;
          combinationStatsMap[combinationKey].totalScore += myRecord.score || 0;
          combinationStatsMap[combinationKey].totalChips += myRecord.chips || 0;
          if (isWin) {
            combinationStatsMap[combinationKey].wins++;
          }
        }
      }
    }

    // 计算胜率并转换为数组
    const combinationStats = Object.entries(combinationStatsMap)
      .map(([key, stats]) => ({
        playerIds: key.split(','),
        playerNames: stats.playerNames,
        totalGames: stats.total,
        wins: stats.wins,
        losses: stats.total - stats.wins,
        winRate: stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0,
        totalScore: stats.totalScore,
        totalChips: stats.totalChips,
        avgScorePerGame: stats.total > 0 ? Math.round(stats.totalScore / stats.total) : 0,
        avgChipsPerGame: stats.total > 0 ? Math.round(stats.totalChips / stats.total) : 0,
      }))
      .sort((a, b) => {
        // 按总场次排序（场次多的优先）
        return b.totalGames - a.totalGames;
      });

    res.json(combinationStats);
  } catch (error) {
    console.error('Failed to fetch double combination stats:', error);
    res.status(500).json({ error: 'Failed to fetch double combination stats' });
  }
});

// 获取三个玩家组合和我一起时的胜率统计
router.get('/triple-combination', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    // 获取"我"的玩家ID
    const mePlayer = db.prepare('SELECT id FROM players WHERE is_me = 1 AND user_id = ?').get(userId) as any;
    if (!mePlayer) {
      return res.status(404).json({ error: '当前用户未找到，请先创建"我"这个玩家' });
    }

    // 获取所有四人局（is_complete = 1）的对局（只查询当前用户的）
    const games = db.prepare(`
      SELECT g.id, g.created_at
      FROM games g
      WHERE g.is_complete = 1 AND g.user_id = ?
      ORDER BY g.created_at DESC
    `).all(userId) as any[];

    // 统计每个三个玩家组合的胜率
    const combinationStatsMap: Record<string, { wins: number; total: number; playerNames: string[]; totalScore: number; totalChips: number }> = {};

    for (const game of games) {
      // 获取该对局的所有玩家记录
      const records = db.prepare(`
        SELECT pr.player_id, pr.chips, pr.score, p.name, p.is_me
        FROM player_records pr
        JOIN players p ON pr.player_id = p.id
        WHERE pr.game_id = ?
      `).all(game.id) as any[];

      // 获取我的记录（判断是否赢）
      const myRecord = records.find(r => r.is_me === 1);
      if (!myRecord) continue;

      const isWin = myRecord.chips > 0;

      // 获取其他三个玩家（排除我）
      const otherPlayers = records
        .filter(r => r.is_me !== 1)
        .map(r => ({ id: r.player_id, name: r.name }));

      if (otherPlayers.length !== 3) continue; // 必须是恰好3个其他玩家（总共4人）

      // 生成组合key（按player_id排序，确保组合唯一）
      const playerIds = otherPlayers.map(p => p.id).sort();
      const combinationKey = playerIds.join(',');

      if (!combinationStatsMap[combinationKey]) {
        combinationStatsMap[combinationKey] = {
          wins: 0,
          total: 0,
          playerNames: otherPlayers.map(p => p.name).sort(),
          totalScore: 0,
          totalChips: 0,
        };
      }

      combinationStatsMap[combinationKey].total++;
      combinationStatsMap[combinationKey].totalScore += myRecord.score || 0;
      combinationStatsMap[combinationKey].totalChips += myRecord.chips || 0;
      if (isWin) {
        combinationStatsMap[combinationKey].wins++;
      }
    }

    // 计算胜率并转换为数组
    const combinationStats = Object.entries(combinationStatsMap)
      .map(([key, stats]) => ({
        playerIds: key.split(','),
        playerNames: stats.playerNames,
        totalGames: stats.total,
        wins: stats.wins,
        losses: stats.total - stats.wins,
        winRate: stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0,
        totalScore: stats.totalScore,
        totalChips: stats.totalChips,
        avgScorePerGame: stats.total > 0 ? Math.round(stats.totalScore / stats.total) : 0,
        avgChipsPerGame: stats.total > 0 ? Math.round(stats.totalChips / stats.total) : 0,
      }))
      .sort((a, b) => {
        // 按总场次排序（场次多的优先）
        return b.totalGames - a.totalGames;
      });

    res.json(combinationStats);
  } catch (error) {
    console.error('Failed to fetch triple combination stats:', error);
    res.status(500).json({ error: 'Failed to fetch triple combination stats' });
  }
});

// 根据下午分数统计晚上胜率
router.get('/afternoon-evening-correlation', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { locationId, score, scoreType } = req.query;
    
    if (!locationId || score === undefined) {
      return res.status(400).json({ error: 'locationId 和 score 参数必填' });
    }
    
    // 验证地点是否属于当前用户
    const location = db.prepare(`
      SELECT id FROM locations WHERE id = ? AND user_id = ?
    `).get(locationId, userId) as any;
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    const scoreValue = parseInt(score as string);
    // 只根据 scoreType 参数判断，不依赖 scoreValue 的正负
    const isWin = scoreType === 'win';
    const threshold = Math.abs(scoreValue);
    
    // 获取"我"的玩家ID
    const mePlayer = db.prepare('SELECT id FROM players WHERE is_me = 1 AND user_id = ?').get(userId) as any;
    if (!mePlayer) {
      return res.status(404).json({ error: '当前用户未找到，请先创建"我"这个玩家' });
    }
    
    // 获取指定地点的所有对局（只统计"我"的记录，只查询当前用户的游戏）
    const allRecords = db.prepare(`
      SELECT 
        pr.score,
        pr.chips,
        g.created_at as createdAt,
        DATE(g.created_at) as gameDate,
        CAST(strftime('%H', g.created_at) AS INTEGER) as hour
      FROM player_records pr
      JOIN games g ON pr.game_id = g.id
      WHERE pr.player_id = ?
        AND g.user_id = ?
        AND g.location_id = ?
        AND pr.score IS NOT NULL
      ORDER BY g.created_at ASC
    `).all(mePlayer.id, userId, locationId) as any[];
    
    // 按日期分组（同一天可能有多个下午场和晚上场）
    const gamesByDate: Record<string, { afternoon: any[]; evening: any[] }> = {};
    
    allRecords.forEach(record => {
      const date = record.gameDate;
      if (!gamesByDate[date]) {
        gamesByDate[date] = { afternoon: [], evening: [] };
      }
      
      const gameTime = new Date(record.createdAt);
      const h = gameTime.getHours();
      const m = gameTime.getMinutes();
      const s = gameTime.getSeconds();
      const ts = h * 3600 + m * 60 + s;

      let timeSlot: 'afternoon' | 'evening' | 'other' = 'other';
      if (ts > 12 * 3600 && ts <= 18 * 3600) {
        timeSlot = 'afternoon';
      } else if (ts > 18 * 3600 || ts === 0) {
        timeSlot = 'evening';
      }

      if (timeSlot === 'afternoon') {
        gamesByDate[date].afternoon.push(record);
      } else if (timeSlot === 'evening') {
        gamesByDate[date].evening.push(record);
      }
    });
    
    // 筛选：下午场满足条件的日期（只要这天下午有至少一场满足条件即可）
    const validDates: string[] = [];
    Object.entries(gamesByDate).forEach(([date, games]) => {
      if (games.afternoon.length > 0) {
        // 检查这天下午是否有满足条件的场次
        const hasValidAfternoon = games.afternoon.some(record => {
          const afternoonScore = Math.abs(record.score);
          const afternoonIsWin = record.score > 0;
          
          // 检查是否满足条件
          if (isWin && afternoonIsWin && afternoonScore >= threshold) {
            return true;
          } else if (!isWin && !afternoonIsWin && afternoonScore >= threshold) {
            return true;
          }
          return false;
        });
        
        if (hasValidAfternoon) {
          validDates.push(date);
        }
      }
    });
    
    // 统计这些日期所有晚上场的胜率
    let eveningWins = 0;
    let eveningTotal = 0;
    
    validDates.forEach(date => {
      const games = gamesByDate[date];
      games.evening.forEach(record => {
        eveningTotal++;
        if (record.score > 0) {
          eveningWins++;
        }
      });
    });
    
    const winRate = eveningTotal > 0 ? Math.round((eveningWins / eveningTotal) * 100) : 0;
    
    res.json({
      locationId,
      threshold: scoreValue,
      scoreType: isWin ? 'win' : 'lose',
      validDatesCount: validDates.length,
      eveningStats: {
        totalGames: eveningTotal,
        wins: eveningWins,
        losses: eveningTotal - eveningWins,
        winRate
      },
      validDates: validDates.slice(0, 10) // 只返回前10个日期作为示例
    });
  } catch (error) {
    console.error('Failed to fetch afternoon-evening correlation stats:', error);
    res.status(500).json({ error: 'Failed to fetch afternoon-evening correlation stats' });
  }
});

// 获取连输统计分析
router.get('/losing-streaks', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { locationId } = req.query;

    // 获取"我"的玩家ID
    const mePlayer = db.prepare('SELECT id FROM players WHERE is_me = 1 AND user_id = ?').get(userId) as any;
    if (!mePlayer) {
      return res.status(404).json({ error: 'Current user not found' });
    }

    // 构建查询
    let query = `
      SELECT 
        DATE(g.created_at) as gameDate,
        SUM(pr.chips) as dailyTotal,
        SUM(pr.score) as dailyScoreTotal,
        COUNT(*) as gameCount
      FROM player_records pr
      JOIN games g ON pr.game_id = g.id
      WHERE pr.player_id = ? AND g.user_id = ?
    `;
    const params: any[] = [mePlayer.id, userId];

    if (locationId) {
      // 验证地点
      const location = db.prepare('SELECT id FROM locations WHERE id = ? AND user_id = ?').get(locationId, userId);
      if (!location) {
        return res.status(404).json({ error: 'Location not found' });
      }
      query += ' AND g.location_id = ?';
      params.push(locationId);
    }

    query += `
      GROUP BY DATE(g.created_at)
      ORDER BY gameDate ASC
    `;

    const dailyStats = db.prepare(query).all(...params) as any[];

    // 格式化数据
    const formattedDailyStats = dailyStats.map(stat => ({
      date: stat.gameDate,
      totalChips: stat.dailyTotal,
      totalScore: stat.dailyScoreTotal,
      gameCount: stat.gameCount,
      isWin: stat.dailyTotal > 0,
      lossAmount: stat.dailyTotal < 0 ? Math.abs(stat.dailyTotal) : 0,
      lossScore: stat.dailyScoreTotal < 0 ? Math.abs(stat.dailyScoreTotal) : 0
    }));

    // 分析连输
    // 只有真正输钱才算连输，>=0 (赢或平) 打断连输
    const losingStreaks: any[] = [];
    let currentStreak: any = null;
    
    for (const stat of formattedDailyStats) {
      if (stat.totalChips < 0) {
        if (currentStreak === null) {
          currentStreak = {
            startDate: stat.date,
            endDate: stat.date,
            days: 1,
            totalLoss: stat.lossAmount,
            totalScoreLoss: stat.lossScore,
            dailyLosses: [stat.lossAmount],
            dailyScoreLosses: [stat.lossScore],
            gameCounts: [stat.gameCount]
          };
        } else {
          currentStreak.endDate = stat.date;
          currentStreak.days += 1;
          currentStreak.totalLoss += stat.lossAmount;
          currentStreak.totalScoreLoss += stat.lossScore;
          currentStreak.dailyLosses.push(stat.lossAmount);
          currentStreak.dailyScoreLosses.push(stat.lossScore);
          currentStreak.gameCounts.push(stat.gameCount);
        }
      } else {
        // >= 0 视为终结连输
        if (currentStreak !== null) {
          losingStreaks.push(currentStreak);
          currentStreak = null;
        }
      }
    }
    // 处理最后一次连输
    if (currentStreak !== null) {
      losingStreaks.push(currentStreak);
    }

    // 统计分析
    const analysis: any = {
      summary: {
        totalDays: formattedDailyStats.length,
        winDays: formattedDailyStats.filter(s => s.totalChips > 0).length,
        lossDays: formattedDailyStats.filter(s => s.totalChips < 0).length,
        streakCount: losingStreaks.length
      },
      streaks: losingStreaks.sort((a, b) => b.days - a.days), // 按天数降序
      metrics: null,
      suggestions: null
    };

    if (losingStreaks.length > 0) {
      const daysList = losingStreaks.map(s => s.days);
      const totalLosses = losingStreaks.map(s => s.totalLoss);
      const totalScoreLosses = losingStreaks.map(s => s.totalScoreLoss);
      const allDailyLosses = losingStreaks.flatMap(s => s.dailyLosses);
      const allDailyScoreLosses = losingStreaks.flatMap(s => s.dailyScoreLosses);

      // 计算平均值和中位数
      const calculateMean = (nums: number[]) => nums.reduce((a, b) => a + b, 0) / nums.length;
      const calculateMedian = (nums: number[]) => {
        const sorted = [...nums].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      };

      // 基础指标
      analysis.metrics = {
        minStreakDays: Math.min(...daysList),
        maxStreakDays: Math.max(...daysList),
        avgStreakDays: parseFloat(calculateMean(daysList).toFixed(1)),
        chips: {
            minStreakAmount: Math.min(...totalLosses),
            maxStreakAmount: Math.max(...totalLosses),
            avgStreakAmount: Math.round(calculateMean(totalLosses)),
            medianStreakAmount: Math.round(calculateMedian(totalLosses))
        },
        score: {
            minStreakAmount: Math.min(...totalScoreLosses),
            maxStreakAmount: Math.max(...totalScoreLosses),
            avgStreakAmount: Math.round(calculateMean(totalScoreLosses)),
            medianStreakAmount: Math.round(calculateMedian(totalScoreLosses))
        }
      };

      // 建议金额/分数 (基于每日亏损分布)
      const calculatePercentiles = (values: number[]) => {
        const sorted = [...values].sort((a, b) => a - b);
        const getP = (p: number) => {
            const idx = Math.ceil(sorted.length * (p / 100)) - 1;
            return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
        };
        return {
            cover99: getP(99),
            cover95: getP(95),
            cover90: getP(90),
            cover75: getP(75),
            cover50: getP(50)
        };
      };
      
      analysis.suggestions = {
        chips: calculatePercentiles(allDailyLosses),
        score: calculatePercentiles(allDailyScoreLosses)
      };
    }

    res.json(analysis);

  } catch (error) {
    console.error('Failed to fetch losing streaks:', error);
    res.status(500).json({ error: 'Failed to fetch losing streaks' });
  }
});


// 获取关联统计详情数据
router.get('/correlation/details', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { locationId, threshold, scoreType } = req.query;

    if (threshold === undefined || !scoreType) {
      return res.status(400).json({ error: 'threshold 和 scoreType 参数必填' });
    }

    const scoreValue = parseInt(threshold as string);
    const isWin = scoreType === 'win';

    // 获取"我"的玩家ID
    const mePlayer = db.prepare('SELECT id FROM players WHERE is_me = 1 AND user_id = ?').get(userId) as any;
    if (!mePlayer) {
      return res.status(404).json({ error: '当前用户未找到，请先创建"我"这个玩家' });
    }

    let allRecordsQuery = `
      SELECT
        pr.score,
        pr.chips,
        g.created_at as createdAt,
        DATE(g.created_at) as gameDate,
        CAST(strftime('%H', g.created_at) AS INTEGER) as hour
      FROM player_records pr
      JOIN games g ON pr.game_id = g.id
      WHERE pr.player_id = ?
        AND g.user_id = ?
        AND pr.score IS NOT NULL
    `;
    const params1: any[] = [mePlayer.id, userId];

    if (locationId) {
      allRecordsQuery += ` AND g.location_id = ?`;
      params1.push(locationId);
    }
    allRecordsQuery += ` ORDER BY g.created_at ASC`;

    const allRecords = db.prepare(allRecordsQuery).all(...params1) as any[];

    const gamesByDate: Record<string, { afternoon: any[]; evening: any[] }> = {};

    allRecords.forEach(record => {
      const date = record.gameDate;
      if (!gamesByDate[date]) {
        gamesByDate[date] = { afternoon: [], evening: [] };
      }

      const gameTime = new Date(record.createdAt);
      const h = gameTime.getHours();
      const m = gameTime.getMinutes();
      const s = gameTime.getSeconds();
      const ts = h * 3600 + m * 60 + s;

      let timeSlot: 'afternoon' | 'evening' | 'other' = 'other';
      if (ts > 12 * 3600 && ts <= 18 * 3600) {
        timeSlot = 'afternoon';
      } else if (ts > 18 * 3600 || ts === 0) {
        timeSlot = 'evening';
      }

      if (timeSlot === 'afternoon') {
        gamesByDate[date].afternoon.push(record);
      } else if (timeSlot === 'evening') {
        gamesByDate[date].evening.push(record);
      }
    });

    const validDates: string[] = [];
    Object.entries(gamesByDate).forEach(([date, games]) => {
      if (games.afternoon.length > 0 && games.evening.length > 0) {
        const hasValidAfternoon = games.afternoon.some(record => {
          const afternoonScore = Math.abs(record.score);
          const afternoonIsWin = record.score > 0;

          if (isWin && afternoonIsWin && afternoonScore >= scoreValue) {
            return true;
          } else if (!isWin && !afternoonIsWin && afternoonScore >= scoreValue) {
            return true;
          }
          return false;
        });

        if (hasValidAfternoon) {
          validDates.push(date);
        }
      }
    });

    let gamesWhereConditions = ['g.user_id = ?'];
    let gamesParams: any[] = [userId];

    if (validDates.length > 0) {
      gamesWhereConditions.push(`DATE(g.created_at) IN (${validDates.map(() => '?').join(',')})`);
      gamesParams.push(...validDates);
    } else {
      gamesWhereConditions.push('1=0');
    }

    if (locationId) {
      gamesWhereConditions.push(`g.location_id = ?`);
      gamesParams.push(locationId);
    }

    const gamesQuery = `
      SELECT g.id, g.created_at, g.location_id, g.chip_rate_id
      FROM games g
      WHERE ${gamesWhereConditions.join(' AND ')}
      AND g.id IN (
        SELECT game_id FROM player_records WHERE player_id = ?
      )
      ORDER BY g.created_at
    `;
    gamesParams.push(mePlayer.id);

    const games = db.prepare(gamesQuery).all(...gamesParams) as any[];

    if (games.length === 0) {
      return res.json({
        overall: { totalGames: 0, wins: 0, losses: 0, winRate: 0, totalScore: 0, totalChips: 0, avgScorePerGame: 0, avgChipsPerGame: 0, maxWinScore: 0, maxLossScore: 0, maxWinChips: 0, maxLossChips: 0, maxDayWinScore: 0, maxDayLossScore: 0, maxDayWinChips: 0, maxDayLossChips: 0 },
        lateNight: { totalGames: 0, wins: 0, losses: 0, winRate: 0, totalScore: 0, totalChips: 0, avgScorePerGame: 0, avgChipsPerGame: 0, maxWinScore: 0, maxLossScore: 0, maxWinChips: 0, maxLossChips: 0 },
        morning: { totalGames: 0, wins: 0, losses: 0, winRate: 0, totalScore: 0, totalChips: 0, avgScorePerGame: 0, avgChipsPerGame: 0, maxWinScore: 0, maxLossScore: 0, maxWinChips: 0, maxLossChips: 0 },
        afternoon: { totalGames: 0, wins: 0, losses: 0, winRate: 0, totalScore: 0, totalChips: 0, avgScorePerGame: 0, avgChipsPerGame: 0, maxWinScore: 0, maxLossScore: 0, maxWinChips: 0, maxLossChips: 0 },
        evening: { totalGames: 0, wins: 0, losses: 0, winRate: 0, totalScore: 0, totalChips: 0, avgScorePerGame: 0, avgChipsPerGame: 0, maxWinScore: 0, maxLossScore: 0, maxWinChips: 0, maxLossChips: 0 },
        dailyStats: [],
        hasOtherTimeGames: false,
        games: [],
      });
    }

    const gameDetails = games.map(game => {
      const myRecord = db.prepare(`
        SELECT pr.score, pr.chips, lcr.chip_rate
        FROM player_records pr
        LEFT JOIN location_chip_rates lcr ON ? = lcr.id
        WHERE pr.game_id = ? AND pr.player_id = ?
      `).get(game.chip_rate_id, game.id, mePlayer.id) as any;

      const gameDate = new Date(game.created_at);
      const hour = gameDate.getHours();
      const minute = gameDate.getMinutes();
      const second = gameDate.getSeconds();
      const ts = hour * 3600 + minute * 60 + second;

      let timeSlot = 'other';
      if (ts > 0 && ts <= 8 * 3600) {
        timeSlot = 'lateNight';
      } else if (ts > 8 * 3600 && ts <= 12 * 3600) {
        timeSlot = 'morning';
      } else if (ts > 12 * 3600 && ts <= 18 * 3600) {
        timeSlot = 'afternoon';
      } else {
        timeSlot = 'evening';
      }

      const year = gameDate.getFullYear();
      const month = String(gameDate.getMonth() + 1).padStart(2, '0');
      const day = String(gameDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      return {
        ...game,
        score: myRecord?.score || 0,
        chips: myRecord?.chips || 0,
        chipRate: myRecord?.chip_rate || 0,
        date: dateStr,
        timeSlot,
      };
    });

    const hasOtherTimeGames = gameDetails.some(g => g.timeSlot === 'other');

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

    const overall: any = calculateStats(gameDetails);
    const lateNightGames = gameDetails.filter(g => g.timeSlot === 'lateNight');
    const morningGames = gameDetails.filter(g => g.timeSlot === 'morning');
    const afternoonGames = gameDetails.filter(g => g.timeSlot === 'afternoon');
    const eveningGames = gameDetails.filter(g => g.timeSlot === 'evening');

    const lateNight = calculateStats(lateNightGames);
    const morning = calculateStats(morningGames);
    const afternoon = calculateStats(afternoonGames);
    const evening = calculateStats(eveningGames);

    const dailyMap = new Map<string, any>();
    gameDetails.forEach(game => {
      if (!dailyMap.has(game.date)) {
        dailyMap.set(game.date, {
          date: game.date,
          totalScore: 0,
          totalChips: 0,
          lateNightScore: 0,
          lateNightChips: 0,
          morningScore: 0,
          morningChips: 0,
          afternoonScore: 0,
          afternoonChips: 0,
          eveningScore: 0,
          eveningChips: 0,
          totalGames: 0,
          lateNightGames: 0,
          morningGames: 0,
          afternoonGames: 0,
          eveningGames: 0,
        });
      }

      const stat = dailyMap.get(game.date);
      stat.totalScore += game.score;
      stat.totalChips += game.chips;
      stat.totalGames += 1;

      if (game.timeSlot === 'lateNight') {
        stat.lateNightScore += game.score;
        stat.lateNightChips += game.chips;
        stat.lateNightGames += 1;
      } else if (game.timeSlot === 'morning') {
        stat.morningScore += game.score;
        stat.morningChips += game.chips;
        stat.morningGames += 1;
      } else if (game.timeSlot === 'afternoon') {
        stat.afternoonScore += game.score;
        stat.afternoonChips += game.chips;
        stat.afternoonGames += 1;
      } else if (game.timeSlot === 'evening') {
        stat.eveningScore += game.score;
        stat.eveningChips += game.chips;
        stat.eveningGames += 1;
      }
    });

    const dailyStats = Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date));

    const dailyScores = dailyStats.map(d => d.totalScore);
    const dailyChips = dailyStats.map(d => d.totalChips);

    overall.maxDayWinScore = dailyScores.length > 0 ? Math.max(...dailyScores.filter(s => s > 0)) : 0;
    overall.maxDayLossScore = dailyScores.length > 0 ? Math.min(...dailyScores.filter(s => s < 0)) : 0;
    overall.maxDayWinChips = dailyChips.length > 0 ? Math.max(...dailyChips.filter(c => c > 0)) : 0;
    overall.maxDayLossChips = dailyChips.length > 0 ? Math.min(...dailyChips.filter(c => c < 0)) : 0;

    const gamesWithDetails = games.map(game => {
      const location = db.prepare('SELECT id, name FROM locations WHERE id = ?').get(game.location_id) as any;
      const chipRateInfo = db.prepare('SELECT chip_rate FROM location_chip_rates WHERE id = ?').get(game.chip_rate_id) as any;
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
      lateNight,
      morning,
      afternoon,
      evening,
      dailyStats,
      hasOtherTimeGames,
      games: gamesWithDetails,
    });
  } catch (error) {
    console.error('Failed to fetch correlation details stats:', error);
    res.status(500).json({ error: 'Failed to fetch correlation details stats' });
  }
});

export default router;
