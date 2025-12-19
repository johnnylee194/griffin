import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// 获取所有地点
router.get('/', async (req, res) => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// 创建地点
router.post('/', async (req, res) => {
  try {
    const { name, isDefault } = req.body;
    
    // 如果设置为默认地点，先将其他地点的isDefault设为false
    if (isDefault) {
      await prisma.location.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    const location = await prisma.location.create({
      data: {
        name,
        isDefault: isDefault || false
      }
    });
    res.status(201).json(location);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create location' });
  }
});

// 更新地点
router.put('/:id', async (req, res) => {
  try {
    const { name, isDefault } = req.body;
    
    // 如果要设置为默认地点，先将其他地点的isDefault设为false
    if (isDefault) {
      await prisma.location.updateMany({
        where: { 
          isDefault: true,
          NOT: { id: req.params.id }
        },
        data: { isDefault: false }
      });
    }

    const location = await prisma.location.update({
      where: { id: req.params.id },
      data: { name, isDefault }
    });
    res.json(location);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// 删除地点
router.delete('/:id', async (req, res) => {
  try {
    await prisma.location.delete({
      where: { id: req.params.id }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

export default router;

