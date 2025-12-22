import { Router } from 'express';
import db, { generateId } from '../database';

const router = Router();

// 辅助函数：获取中国本地时间（UTC+8）的ISO字符串（不带时区标识）
function getLocalTimestamp(): string {
  const now = new Date();
  // now.getTime() 返回 UTC 时间戳（毫秒）
  // 直接加上 8 小时（8 * 60 * 60 * 1000 毫秒）得到中国时间
  const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  
  // 手动格式化为ISO字符串（不带时区标识）
  const year = chinaTime.getUTCFullYear();
  const month = String(chinaTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(chinaTime.getUTCDate()).padStart(2, '0');
  const hours = String(chinaTime.getUTCHours()).padStart(2, '0');
  const minutes = String(chinaTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(chinaTime.getUTCSeconds()).padStart(2, '0');
  const milliseconds = String(chinaTime.getUTCMilliseconds()).padStart(3, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
}

// 获取所有玩家
router.get('/', (req, res) => {
  try {
    const players = db.prepare(`
      SELECT 
        id,
        name,
        avatar,
        is_me as isMe,
        created_at as createdAt,
        updated_at as updatedAt
      FROM players
      ORDER BY is_me DESC, updated_at DESC
    `).all() as any[];
    
    res.json(players.map((p: any) => ({
      ...p,
      isMe: Boolean(p.isMe)
    })));
  } catch (error) {
    console.error('Failed to fetch players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// 获取单个玩家（包含其游戏记录）
router.get('/:id', (req, res) => {
  try {
    const player = db.prepare(`
      SELECT 
        id,
        name,
        avatar,
        is_me as isMe,
        created_at as createdAt,
        updated_at as updatedAt
      FROM players
      WHERE id = ?
    `).get(req.params.id) as any;

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // 获取玩家的游戏记录
    const records = db.prepare(`
      SELECT 
        pr.id,
        pr.game_id as gameId,
        pr.player_id as playerId,
        pr.score,
        pr.chips,
        pr.created_at as createdAt,
        g.location_id as locationId,
        g.chip_rate as chipRate,
        g.is_complete as isComplete,
        g.is_balanced as isBalanced,
        g.note,
        g.created_at as gameCreatedAt
      FROM player_records pr
      JOIN games g ON pr.game_id = g.id
      WHERE pr.player_id = ?
      ORDER BY g.created_at DESC
    `).all(req.params.id) as any[];

    res.json({
      ...player,
      isMe: Boolean(player.isMe),
      records: records.map((r: any) => ({
        ...r,
        isComplete: Boolean(r.isComplete),
        isBalanced: r.isBalanced !== null ? Boolean(r.isBalanced) : null
      }))
    });
  } catch (error) {
    console.error('Failed to fetch player:', error);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

// 创建玩家
router.post('/', (req, res) => {
  try {
    const { name, avatar, isMe } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // 如果是创建本人，先将其他玩家的isMe设为false
    if (isMe) {
      db.prepare(`
        UPDATE players SET is_me = 0 WHERE is_me = 1
      `).run();
    }

    const id = generateId();
    const now = getLocalTimestamp();
    
    db.prepare(`
      INSERT INTO players (id, name, avatar, is_me, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, avatar || null, isMe ? 1 : 0, now, now);

    const player = db.prepare(`
      SELECT 
        id,
        name,
        avatar,
        is_me as isMe,
        created_at as createdAt,
        updated_at as updatedAt
      FROM players
      WHERE id = ?
    `).get(id) as any;

    res.status(201).json({
      ...player,
      isMe: Boolean(player.isMe)
    });
  } catch (error) {
    console.error('Failed to create player:', error);
    res.status(500).json({ error: 'Failed to create player' });
  }
});

// 更新玩家
router.put('/:id', (req, res) => {
  try {
    const { name, avatar, isMe } = req.body;
    
    // 如果要设置为本人，先将其他玩家的isMe设为false
    if (isMe) {
      db.prepare(`
        UPDATE players SET is_me = 0 WHERE is_me = 1 AND id != ?
      `).run(req.params.id);
    }

    const now = getLocalTimestamp();
    
    const updateFields: string[] = [];
    const values: any[] = [];
    
    if (name !== undefined) {
      updateFields.push('name = ?');
      values.push(name);
    }
    if (avatar !== undefined) {
      updateFields.push('avatar = ?');
      values.push(avatar);
    }
    if (isMe !== undefined) {
      updateFields.push('is_me = ?');
      values.push(isMe ? 1 : 0);
    }
    
    updateFields.push('updated_at = ?');
    values.push(now);
    values.push(req.params.id);

    db.prepare(`
      UPDATE players SET ${updateFields.join(', ')} WHERE id = ?
    `).run(...values);

    const player = db.prepare(`
      SELECT 
        id,
        name,
        avatar,
        is_me as isMe,
        created_at as createdAt,
        updated_at as updatedAt
      FROM players
      WHERE id = ?
    `).get(req.params.id) as any;

    res.json({
      ...player,
      isMe: Boolean(player.isMe)
    });
  } catch (error) {
    console.error('Failed to update player:', error);
    res.status(500).json({ error: 'Failed to update player' });
  }
});

// 删除玩家
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM players WHERE id = ?').run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete player:', error);
    res.status(500).json({ error: 'Failed to delete player' });
  }
});

export default router;
