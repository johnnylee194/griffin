import { Router, Request, Response } from 'express';
import db, { generateId } from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { GameService } from '../services/game.service';
import { StatsService } from '../services/stats.service';

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

    // 解析JSON字段并转换为camelCase
    const parsedFilters = (filters as any[]).map(filter => ({
      id: filter.id,
      userId: filter.user_id,
      name: filter.name,
      startDate: filter.start_date,
      endDate: filter.end_date,
      locationIds: filter.location_ids ? JSON.parse(filter.location_ids) : [],
      playerIds: filter.player_ids ? JSON.parse(filter.player_ids) : [],
      gameTypeIds: filter.game_type_ids ? JSON.parse(filter.game_type_ids) : [],
      createdAt: filter.created_at,
      updatedAt: filter.updated_at,
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

    const f = filter as any;
    const parsedFilter = {
      id: f.id,
      userId: f.user_id,
      name: f.name,
      startDate: f.start_date,
      endDate: f.end_date,
      locationIds: f.location_ids ? JSON.parse(f.location_ids) : [],
      playerIds: f.player_ids ? JSON.parse(f.player_ids) : [],
      gameTypeIds: f.game_type_ids ? JSON.parse(f.game_type_ids) : [],
      createdAt: f.created_at,
      updatedAt: f.updated_at,
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
    const { name, startDate, endDate, locationIds, playerIds, gameTypeIds } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const id = generateId();
    db.prepare(`
      INSERT INTO custom_filters (id, user_id, name, start_date, end_date, location_ids, player_ids, game_type_ids)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      name,
      startDate || null,
      endDate || null,
      JSON.stringify(locationIds || []),
      JSON.stringify(playerIds || []),
      JSON.stringify(gameTypeIds || [])
    );

    const filter = db.prepare(`
      SELECT * FROM custom_filters WHERE id = ?
    `).get(id);

    const f = filter as any;
    const parsedFilter = {
      id: f.id,
      userId: f.user_id,
      name: f.name,
      startDate: f.start_date,
      endDate: f.end_date,
      locationIds: f.location_ids ? JSON.parse(f.location_ids) : [],
      playerIds: f.player_ids ? JSON.parse(f.player_ids) : [],
      gameTypeIds: f.game_type_ids ? JSON.parse(f.game_type_ids) : [],
      createdAt: f.created_at,
      updatedAt: f.updated_at,
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
    const { name, startDate, endDate, locationIds, playerIds, gameTypeIds } = req.body;

    // 检查筛选器是否存在且属于该用户
    const existing = db.prepare(`
      SELECT * FROM custom_filters WHERE id = ? AND user_id = ?
    `).get(id, userId);

    if (!existing) {
      return res.status(404).json({ error: 'Filter not found' });
    }

    db.prepare(`
      UPDATE custom_filters 
      SET name = ?, start_date = ?, end_date = ?, location_ids = ?, player_ids = ?, game_type_ids = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(
      name,
      startDate || null,
      endDate || null,
      JSON.stringify(locationIds || []),
      JSON.stringify(playerIds || []),
      JSON.stringify(gameTypeIds || []),
      id,
      userId
    );

    const filter = db.prepare(`
      SELECT * FROM custom_filters WHERE id = ?
    `).get(id);

    const f = filter as any;
    const parsedFilter = {
      id: f.id,
      userId: f.user_id,
      name: f.name,
      startDate: f.start_date,
      endDate: f.end_date,
      locationIds: f.location_ids ? JSON.parse(f.location_ids) : [],
      playerIds: f.player_ids ? JSON.parse(f.player_ids) : [],
      gameTypeIds: f.game_type_ids ? JSON.parse(f.game_type_ids) : [],
      createdAt: f.created_at,
      updatedAt: f.updated_at,
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
    const gameTypeIds = filter.game_type_ids ? JSON.parse(filter.game_type_ids) : [];
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

    // 玩法条件
    if (gameTypeIds.length > 0) {
      whereConditions.push(`g.game_type_id IN (${gameTypeIds.map(() => '?').join(',')})`);
      params.push(...gameTypeIds);
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
      SELECT g.id, g.created_at, g.location_id, g.chip_rate_id,
        l.name as location_name, lcr.chip_rate
      FROM games g
      LEFT JOIN locations l ON l.id = g.location_id
      LEFT JOIN location_chip_rates lcr ON lcr.id = g.chip_rate_id
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

    // 批量获取所有对局的玩家记录并执行详细统计分析
    const recordsByGame = GameService.getRecordsByGameIds(games.map(g => g.id));
    const analysis = StatsService.computeDetailedAnalysis(games, recordsByGame, mePlayer.id);

    res.json(analysis);
  } catch (error) {
    console.error('Error calculating filter stats:', error);
    res.status(500).json({ error: 'Failed to calculate stats' });
  }
});

export default router;

