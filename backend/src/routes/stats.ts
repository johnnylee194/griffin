import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// 获取玩家统计数据
router.get('/player/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { startDate, endDate } = req.query;

    // 构建查询条件
    const whereClause: any = {
      playerId,
      game: {}
    };

    if (startDate || endDate) {
      whereClause.game.createdAt = {};
      if (startDate) {
        whereClause.game.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        whereClause.game.createdAt.lte = new Date(endDate as string);
      }
    }

    // 获取所有记录
    const records = await prisma.playerRecord.findMany({
      where: whereClause,
      include: {
        game: {
          include: {
            location: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 计算统计数据
    const totalGames = records.length;
    const totalScore = records.reduce((sum, r) => sum + r.score, 0);
    const totalChips = records.reduce((sum, r) => sum + r.chips, 0);
    const wins = records.filter(r => r.score > 0).length;
    const losses = records.filter(r => r.score < 0).length;
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

    // 按地点统计
    const locationStats = records.reduce((acc: any, r) => {
      const locName = r.game.location.name;
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
    const dailyStats = records.reduce((acc: any, r) => {
      const date = r.game.createdAt.toISOString().split('T')[0];
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
      byLocation: locationStats,
      byDate: dailyStats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch player stats' });
  }
});

// 获取总体统计
router.get('/overview', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const whereClause: any = {};
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate as string);
      }
    }

    const totalGames = await prisma.game.count({ where: whereClause });
    const totalPlayers = await prisma.player.count();
    const totalLocations = await prisma.location.count();

    res.json({
      totalGames,
      totalPlayers,
      totalLocations
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch overview stats' });
  }
});

export default router;

