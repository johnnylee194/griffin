import { Router } from 'express';
import db from '../database';

const router = Router();

// 获取玩家统计数据
router.get('/player/:playerId', (req, res) => {
  try {
    const { playerId } = req.params;
    const { startDate, endDate } = req.query;

    // 构建查询条件
    let dateFilter = '';
    const params: any[] = [playerId];
    
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

    // 获取所有记录
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
      WHERE pr.player_id = ?${dateFilter}
      ORDER BY g.created_at DESC
    `).all(...params) as any[];

    // 计算统计数据
    const totalGames = records.length;
    const totalScore = records.reduce((sum, r) => sum + r.score, 0);
    const totalChips = records.reduce((sum, r) => sum + r.chips, 0);
    const wins = records.filter(r => r.score > 0).length;
    const losses = records.filter(r => r.score < 0).length;
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
      acc[locName].totalScore += r.score;
      acc[locName].totalChips += r.chips;
      if (r.score > 0) acc[locName].wins++;
      if (r.score < 0) acc[locName].losses++;
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
      acc[date].totalScore += r.score;
      acc[date].totalChips += r.chips;
      if (r.score > 0) acc[date].wins++;
      if (r.score < 0) acc[date].losses++;
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
router.get('/overview', (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const params: any[] = [];
    
    if (startDate || endDate) {
      if (startDate && endDate) {
        dateFilter = ' WHERE created_at BETWEEN ? AND ?';
        params.push(startDate as string, endDate as string);
      } else if (startDate) {
        dateFilter = ' WHERE created_at >= ?';
        params.push(startDate as string);
      } else if (endDate) {
        dateFilter = ' WHERE created_at <= ?';
        params.push(endDate as string);
      }
    }

    const totalGames = db.prepare(`SELECT COUNT(*) as count FROM games${dateFilter}`).get(...params) as { count: number };
    const totalPlayers = db.prepare('SELECT COUNT(*) as count FROM players').get() as { count: number };
    const totalLocations = db.prepare('SELECT COUNT(*) as count FROM locations').get() as { count: number };

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
router.get('/annual', (req, res) => {
  try {
    // 统计都是针对"我"的，直接获取"我"的玩家ID
    const mePlayer = db.prepare('SELECT id FROM players WHERE is_me = 1').get() as any;
    if (!mePlayer) {
      return res.status(404).json({ error: 'Current user not found' });
    }
    const currentUserId = mePlayer.id;

    // 支持年份参数，默认为当前年
    const yearParam = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const startDate = `${yearParam}-01-01T00:00:00`;
    const endDate = `${yearParam + 1}-01-01T00:00:00`;

    // 获取该年的所有记录
    const records = db.prepare(`
      SELECT 
        pr.chips,
        pr.score
      FROM player_records pr
      JOIN games g ON pr.game_id = g.id
      WHERE pr.player_id = ?
        AND g.created_at >= ?
        AND g.created_at < ?
      ORDER BY g.created_at ASC
    `).all(currentUserId, startDate, endDate) as any[];

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
router.get('/lunar-annual', (req, res) => {
  try {
    // 统计都是针对"我"的，直接获取"我"的玩家ID
    const mePlayer = db.prepare('SELECT id FROM players WHERE is_me = 1').get() as any;
    if (!mePlayer) {
      return res.status(404).json({ error: 'Current user not found' });
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

    // 获取该农历年的所有记录
    const records = db.prepare(`
      SELECT 
        pr.chips,
        pr.score
      FROM player_records pr
      JOIN games g ON pr.game_id = g.id
      WHERE pr.player_id = ?
        AND g.created_at >= ?
        AND g.created_at < ?
      ORDER BY g.created_at ASC
    `).all(currentUserId, startDate, endDate) as any[];

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

export default router;
