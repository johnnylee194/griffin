import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// 获取所有对局
router.get('/', async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const games = await prisma.game.findMany({
      include: {
        location: true,
        records: {
          include: {
            player: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit as string) : undefined,
      skip: offset ? parseInt(offset as string) : undefined
    });
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// 获取单个对局
router.get('/:id', async (req, res) => {
  try {
    const game = await prisma.game.findUnique({
      where: { id: req.params.id },
      include: {
        location: true,
        records: {
          include: {
            player: true
          }
        }
      }
    });
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// 创建对局
router.post('/', async (req, res) => {
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

    // 创建对局和记录
    const game = await prisma.game.create({
      data: {
        locationId,
        chipRate,
        isComplete,
        isBalanced,
        note,
        records: {
          create: records.map((r: any) => ({
            playerId: r.playerId,
            score: r.score,
            chips: r.score * chipRate
          }))
        }
      },
      include: {
        location: true,
        records: {
          include: {
            player: true
          }
        }
      }
    });

    res.status(201).json(game);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// 更新对局
router.put('/:id', async (req, res) => {
  try {
    const { locationId, chipRate, records, note } = req.body;
    
    // 删除旧的记录
    await prisma.playerRecord.deleteMany({
      where: { gameId: req.params.id }
    });

    // 检查是否完整记录
    const isComplete = records.length === 4;
    let isBalanced = null;
    if (isComplete) {
      const totalScore = records.reduce((sum: number, r: any) => sum + r.score, 0);
      isBalanced = totalScore === 0;
    }

    // 更新对局
    const game = await prisma.game.update({
      where: { id: req.params.id },
      data: {
        locationId,
        chipRate,
        isComplete,
        isBalanced,
        note,
        records: {
          create: records.map((r: any) => ({
            playerId: r.playerId,
            score: r.score,
            chips: r.score * chipRate
          }))
        }
      },
      include: {
        location: true,
        records: {
          include: {
            player: true
          }
        }
      }
    });

    res.json(game);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update game' });
  }
});

// 删除对局
router.delete('/:id', async (req, res) => {
  try {
    await prisma.game.delete({
      where: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

export default router;

