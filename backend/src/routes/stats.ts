import { Router } from 'express';
import db from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';

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
    // 统计都是针对"我"的，直接获取"我"的玩家ID
    const mePlayer = db.prepare('SELECT id FROM players WHERE is_me = 1 AND user_id = ?').get(userId) as any;
    if (!mePlayer) {
      return res.status(404).json({ error: 'Current user not found, please create "我" player first' });
    }
    const currentUserId = mePlayer.id;

    // 支持年份参数，默认为当前年
    const yearParam = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const startDate = `${yearParam}-01-01T00:00:00`;
    const endDate = `${yearParam + 1}-01-01T00:00:00`;

    // 获取该年的所有记录（只查询当前用户的游戏）
    const records = db.prepare(`
      SELECT 
        pr.chips,
        pr.score
      FROM player_records pr
      JOIN games g ON pr.game_id = g.id
      WHERE pr.player_id = ?
        AND g.user_id = ?
        AND g.created_at >= ?
        AND g.created_at < ?
      ORDER BY g.created_at ASC
    `).all(currentUserId, userId, startDate, endDate) as any[];

    // 计算总体统计
    let totalIncome = 0;
    let totalExpense = 0;
    let wins = 0;
    let losses = 0;
    
    records.forEach(r => {
      if (r.chips > 0) {
        totalIncome += r.chips;
        wins++;
      } else if (r.chips < 0) {
        totalExpense += Math.abs(r.chips);
        losses++;
      }
    });
    
    const profit = totalIncome - totalExpense;
    const totalGames = wins + losses;
    const winRate = totalGames > 0 ? parseFloat(((wins / totalGames) * 100).toFixed(2)) : 0;

    res.json({
      year: yearParam,
      overall: {
        income: totalIncome,
        expense: totalExpense,
        profit,
        wins,
        losses,
        totalGames,
        winRate
      }
    });
  } catch (error) {
    console.error('Failed to fetch annual stats:', error);
    res.status(500).json({ error: 'Failed to fetch annual stats' });
  }
});

// 获取农历年统计（支持年份参数）
router.get('/lunar-annual', (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    // 统计都是针对"我"的，直接获取"我"的玩家ID
    const mePlayer = db.prepare('SELECT id FROM players WHERE is_me = 1 AND user_id = ?').get(userId) as any;
    if (!mePlayer) {
      return res.status(404).json({ error: 'Current user not found, please create "我" player first' });
    }
    const currentUserId = mePlayer.id;

    // 支持年份参数，默认为当前农历年
    let lunarYearInfo;
    if (req.query.year) {
      const yearParam = parseInt(req.query.year as string);
      // 根据年份计算农历年范围（简化版）
      const springFestivalDates: { [key: number]: string } = {
        2024: '2024-02-10',
        2025: '2025-01-29',
        2026: '2026-02-17',
        2027: '2027-02-06',
        2028: '2028-01-26',
        2029: '2029-02-13',
        2030: '2030-02-03'
      };
      const currentYearSpringFestival = springFestivalDates[yearParam];
      const nextYearSpringFestival = springFestivalDates[yearParam + 1];
      if (currentYearSpringFestival && nextYearSpringFestival) {
        lunarYearInfo = {
          year: yearParam,
          startDate: currentYearSpringFestival,
          endDate: nextYearSpringFestival
        };
      } else {
        // 如果年份不在映射表中，使用默认逻辑
        lunarYearInfo = getLunarYear(new Date(`${yearParam}-06-01`));
      }
    } else {
      lunarYearInfo = getLunarYear(new Date());
    }
    
    const startDate = `${lunarYearInfo.startDate}T00:00:00`;
    const endDate = `${lunarYearInfo.endDate}T00:00:00`;

    // 获取该农历年的所有记录（只查询当前用户的游戏）
    const records = db.prepare(`
      SELECT 
        pr.chips,
        pr.score
      FROM player_records pr
      JOIN games g ON pr.game_id = g.id
      WHERE pr.player_id = ?
        AND g.user_id = ?
        AND g.created_at >= ?
        AND g.created_at < ?
      ORDER BY g.created_at ASC
    `).all(currentUserId, userId, startDate, endDate) as any[];

    // 计算总体统计
    let totalIncome = 0;
    let totalExpense = 0;
    let wins = 0;
    let losses = 0;
    
    records.forEach(r => {
      if (r.chips > 0) {
        totalIncome += r.chips;
        wins++;
      } else if (r.chips < 0) {
        totalExpense += Math.abs(r.chips);
        losses++;
      }
    });
    
    const profit = totalIncome - totalExpense;
    const totalGames = wins + losses;
    const winRate = totalGames > 0 ? parseFloat(((wins / totalGames) * 100).toFixed(2)) : 0;

    res.json({
      lunarYear: lunarYearInfo.year,
      startDate: lunarYearInfo.startDate,
      endDate: lunarYearInfo.endDate,
      overall: {
        income: totalIncome,
        expense: totalExpense,
        profit,
        wins,
        losses,
        totalGames,
        winRate
      }
    });
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
      
      if (record.hour < 20) {
        // 下午场（20:00前）
        gamesByDate[date].afternoon.push(record);
      } else {
        // 晚上场（20:00后）
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

export default router;
