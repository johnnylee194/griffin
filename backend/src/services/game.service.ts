import db, { generateId } from '../database';
import { getLocalTimestamp } from '../utils/time';

export interface CreateGameDto {
  userId: string;
  locationId: string;
  gameTypeId: string;
  chipRateId: string;
  playerIds: string[];
  myScore: number;
  note?: string;
  createdAt?: string;
}

// SQLite 绑定参数数量上限保护：IN (...) 查询按批次拆分
const IN_CHUNK_SIZE = 500;

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

export interface GameRecordRow {
  id: string;
  game_id: string;
  player_id: string;
  score: number | null;
  chips: number | null;
  player_name: string;
  is_me: number;
}

export class GameService {
  /**
   * 批量获取多个对局的玩家记录，返回 Map<gameId, records[]>。
   * 每个对局内的记录按 is_me DESC 排序（"我"在最前）。
   */
  static getRecordsByGameIds(gameIds: string[]): Map<string, GameRecordRow[]> {
    const map = new Map<string, GameRecordRow[]>();
    if (gameIds.length === 0) return map;

    for (const ids of chunk(gameIds, IN_CHUNK_SIZE)) {
      const placeholders = ids.map(() => '?').join(',');
      const rows = db.prepare(`
        SELECT pr.id, pr.game_id, pr.player_id, pr.score, pr.chips, p.name as player_name, p.is_me
        FROM player_records pr
        JOIN players p ON pr.player_id = p.id
        WHERE pr.game_id IN (${placeholders})
        ORDER BY pr.game_id, p.is_me DESC, pr.rowid ASC
      `).all(...ids) as GameRecordRow[];

      for (const row of rows) {
        let list = map.get(row.game_id);
        if (!list) {
          list = [];
          map.set(row.game_id, list);
        }
        list.push(row);
      }
    }
    return map;
  }

  /**
   * 批量获取对局详情（与 getGameWithDetails 返回结构一致），保持 gameIds 的顺序。
   * 固定 2 次查询（按批次），避免逐条查询的 N+1 问题。
   */
  static getGamesWithDetails(gameIds: string[], userId: string) {
    if (gameIds.length === 0) return [];

    const gameMap = new Map<string, any>();
    const recordsMap = new Map<string, any[]>();

    for (const ids of chunk(gameIds, IN_CHUNK_SIZE)) {
      const placeholders = ids.map(() => '?').join(',');

      const games = db.prepare(`
        SELECT
          g.id,
          g.location_id as locationId,
          g.game_type_id as gameTypeId,
          g.chip_rate_id as chipRateId,
          lcr.chip_rate as chipRate,
          gt.name as gameTypeName,
          g.is_complete as isComplete,
          g.note,
          g.created_at as createdAt,
          g.updated_at as updatedAt,
          l.id as "location.id",
          l.name as "location.name",
          l.is_default as "location.isDefault",
          l.created_at as "location.createdAt"
        FROM games g
        JOIN locations l ON g.location_id = l.id
        LEFT JOIN location_chip_rates lcr ON g.chip_rate_id = lcr.id
        LEFT JOIN game_types gt ON g.game_type_id = gt.id
        WHERE g.id IN (${placeholders}) AND g.user_id = ?
      `).all(...ids, userId) as any[];
      for (const g of games) gameMap.set(g.id, g);

      const records = db.prepare(`
        SELECT
          pr.id,
          pr.game_id as gameId,
          pr.player_id as playerId,
          pr.score,
          pr.chips,
          pr.created_at as createdAt,
          p.id as "player.id",
          p.name as "player.name",
          p.avatar as "player.avatar",
          p.is_me as "player.isMe",
          p.created_at as "player.createdAt",
          p.updated_at as "player.updatedAt"
        FROM player_records pr
        JOIN players p ON pr.player_id = p.id
        WHERE pr.game_id IN (${placeholders}) AND p.user_id = ?
        ORDER BY pr.created_at ASC, pr.rowid ASC
      `).all(...ids, userId) as any[];
      for (const r of records) {
        let list = recordsMap.get(r.gameId);
        if (!list) {
          list = [];
          recordsMap.set(r.gameId, list);
        }
        list.push(r);
      }
    }

    const result: any[] = [];
    for (const id of gameIds) {
      const game = gameMap.get(id);
      if (!game) continue;
      result.push(this.formatGame(game, recordsMap.get(id) || []));
    }
    return result;
  }

  private static formatGame(game: any, records: any[]) {
    return {
      id: game.id,
      locationId: game.locationId,
      gameTypeId: game.gameTypeId,
      chipRateId: game.chipRateId,
      chipRate: game.chipRate,
      gameType: game.gameTypeName ? {
        id: game.gameTypeId,
        name: game.gameTypeName
      } : undefined,
      isComplete: Boolean(game.isComplete),
      note: game.note,
      createdAt: game.createdAt,
      updatedAt: game.updatedAt,
      location: {
        id: game['location.id'],
        name: game['location.name'],
        isDefault: Boolean(game['location.isDefault']),
        createdAt: game['location.createdAt']
      },
      records: records.map((r: any) => ({
        id: r.id,
        gameId: r.gameId,
        playerId: r.playerId,
        score: r.score,
        chips: r.chips,
        createdAt: r.createdAt,
        player: {
          id: r['player.id'],
          name: r['player.name'],
          avatar: r['player.avatar'],
          isMe: Boolean(r['player.isMe']),
          createdAt: r['player.createdAt'],
          updatedAt: r['player.updatedAt']
        }
      }))
    };
  }

  static getGameWithDetails(gameId: string, userId: string) {
    const [game] = this.getGamesWithDetails([gameId], userId);
    return game ?? null;
  }

  static createGame(dto: CreateGameDto) {
    const { userId, locationId, gameTypeId, chipRateId, playerIds, myScore, note, createdAt } = dto;

    const chipRate = db.prepare(`
      SELECT chip_rate FROM location_chip_rates WHERE id = ?
    `).get(chipRateId) as any;
    if (!chipRate) {
      throw new Error('Chip rate not found');
    }

    const mePlayer = db.prepare('SELECT id FROM players WHERE is_me = 1 AND user_id = ?').get(userId) as any;
    if (!mePlayer) {
      throw new Error('Current user not found, please create "我" player first');
    }

    const gameId = generateId();
    const now = getLocalTimestamp();
    const gameTime = createdAt || now;
    const myChips = myScore * chipRate.chip_rate;

    const createGameTx = db.transaction(() => {
      db.prepare(`
        INSERT INTO games (id, user_id, location_id, game_type_id, chip_rate_id, is_complete, note, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
      `).run(gameId, userId, locationId, gameTypeId, chipRateId, note || null, gameTime, now);

      const insertRecord = db.prepare(`
        INSERT INTO player_records (id, game_id, player_id, score, chips, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const playerId of playerIds) {
        if (playerId === mePlayer.id) {
          insertRecord.run(generateId(), gameId, playerId, myScore, myChips, gameTime);
        } else {
          insertRecord.run(generateId(), gameId, playerId, null, null, gameTime);
        }
      }
    });

    createGameTx();
    return this.getGameWithDetails(gameId, userId);
  }
}
