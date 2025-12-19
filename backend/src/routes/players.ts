import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// 获取所有玩家
router.get('/', async (req, res) => {
  try {
    const players = await prisma.player.findMany({
      orderBy: [
        { isMe: 'desc' }, // 本人排在最前面
        { updatedAt: 'desc' }
      ]
    });
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// 获取单个玩家
router.get('/:id', async (req, res) => {
  try {
    const player = await prisma.player.findUnique({
      where: { id: req.params.id },
      include: {
        records: {
          include: {
            game: true
          }
        }
      }
    });
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json(player);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

// 创建玩家
router.post('/', async (req, res) => {
  try {
    const { name, avatar, isMe } = req.body;
    
    // 如果是创建本人，先将其他玩家的isMe设为false
    if (isMe) {
      await prisma.player.updateMany({
        where: { isMe: true },
        data: { isMe: false }
      });
    }

    const player = await prisma.player.create({
      data: {
        name,
        avatar,
        isMe: isMe || false
      }
    });
    res.status(201).json(player);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create player' });
  }
});

// 更新玩家
router.put('/:id', async (req, res) => {
  try {
    const { name, avatar, isMe } = req.body;
    
    // 如果要设置为本人，先将其他玩家的isMe设为false
    if (isMe) {
      await prisma.player.updateMany({
        where: { 
          isMe: true,
          NOT: { id: req.params.id }
        },
        data: { isMe: false }
      });
    }

    const player = await prisma.player.update({
      where: { id: req.params.id },
      data: {
        name,
        avatar,
        isMe
      }
    });
    res.json(player);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update player' });
  }
});

// 删除玩家
router.delete('/:id', async (req, res) => {
  try {
    await prisma.player.delete({
      where: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete player' });
  }
});

export default router;

