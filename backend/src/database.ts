import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';

const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.join(dbDir, 'griffin.db'));

// Generate CUID-like ID
export function generateId(): string {
  return 'c' + randomBytes(12).toString('base64url');
}

export const initDatabase = () => {
  // 创建用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 迁移现有数据：添加name字段（如果不存在）
  try {
    db.exec(`ALTER TABLE users ADD COLUMN name TEXT`);
    console.log('✅ Added name column to users table');
  } catch (error: any) {
    // 如果字段已存在，忽略错误
    if (!error.message.includes('duplicate column name')) {
      console.warn('⚠️ Could not add name column to users table:', error.message);
    }
  }

  // 迁移现有数据：添加birth_date字段（如果不存在）
  try {
    db.exec(`ALTER TABLE users ADD COLUMN birth_date TEXT`);
    console.log('✅ Added birth_date column to users table');
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.warn('⚠️ Could not add birth_date column to users table:', error.message);
    }
  }

  // 创建运势缓存表
  db.exec(`
    CREATE TABLE IF NOT EXISTS horoscope_cache (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      chinese_horoscope TEXT NOT NULL,
      western_horoscope TEXT NOT NULL,
      combined_advice TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, date)
    )
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_horoscope_user_date ON horoscope_cache(user_id, date);
  `);

  // 创建玩家表（添加user_id）
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT,
      is_me INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 迁移现有数据：添加user_id字段到players表
  try {
    db.exec(`ALTER TABLE players ADD COLUMN user_id TEXT`);
    console.log('✅ Added user_id column to players table');
    // 注意：现有数据需要手动分配user_id，这里不自动分配
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.warn('⚠️ Could not add user_id column to players table:', error.message);
    }
  }

  // 创建地点表（添加user_id，移除UNIQUE约束）
  db.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, name)
    )
  `);

  // 迁移现有数据：添加user_id字段到locations表
  try {
    db.exec(`ALTER TABLE locations ADD COLUMN user_id TEXT`);
    console.log('✅ Added user_id column to locations table');
    // 注意：现有数据需要手动分配user_id，这里不自动分配
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.warn('⚠️ Could not add user_id column to locations table:', error.message);
    }
  }

  // 创建地点chip_rate规则表（一个地点可以有多个chip_rate）
  db.exec(`
    CREATE TABLE IF NOT EXISTS location_chip_rates (
      id TEXT PRIMARY KEY,
      location_id TEXT NOT NULL,
      chip_rate INTEGER NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
      UNIQUE(location_id, chip_rate)
    )
  `);

  // 创建对局表（添加user_id，移除chip_rate字段）
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      location_id TEXT NOT NULL,
      chip_rate_id TEXT,
      is_complete INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (location_id) REFERENCES locations(id),
      FOREIGN KEY (chip_rate_id) REFERENCES location_chip_rates(id)
    )
  `);

  // 迁移现有数据：添加user_id字段到games表
  try {
    db.exec(`ALTER TABLE games ADD COLUMN user_id TEXT`);
    console.log('✅ Added user_id column to games table');
    // 注意：现有数据需要手动分配user_id，这里不自动分配
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.warn('⚠️ Could not add user_id column to games table:', error.message);
    }
  }

  // 迁移现有数据：添加chip_rate_id字段到games表
  try {
    db.exec(`ALTER TABLE games ADD COLUMN chip_rate_id TEXT`);
    console.log('✅ Added chip_rate_id column to games table');
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.warn('⚠️ Could not add chip_rate_id column to games table:', error.message);
    }
  }

  // 迁移现有数据：从games表移除chip_rate字段（需要重建表）
  try {
    // 检查games表是否还有chip_rate字段
    const tableInfo = db.prepare("PRAGMA table_info(games)").all() as any[];
    const hasChipRate = tableInfo.some((col: any) => col.name === 'chip_rate');
    
    if (hasChipRate) {
      // 有chip_rate字段，需要迁移数据到location_chip_rates表
      console.log('🔄 Migrating chip_rate from games to location_chip_rates...');
      
      // 获取所有唯一的location_id和chip_rate组合
      const gameChipRates = db.prepare(`
        SELECT DISTINCT location_id, chip_rate 
        FROM games 
        WHERE chip_rate IS NOT NULL
      `).all() as any[];
      
      // 为每个组合创建location_chip_rate记录
      for (const { location_id, chip_rate } of gameChipRates) {
        // 检查是否已存在
        const existing = db.prepare(`
          SELECT id FROM location_chip_rates 
          WHERE location_id = ? AND chip_rate = ?
        `).get(location_id, chip_rate);
        
        if (!existing) {
          const chipRateId = generateId();
          db.prepare(`
            INSERT INTO location_chip_rates (id, location_id, chip_rate, is_default, created_at)
            VALUES (?, ?, ?, 1, datetime('now'))
          `).run(chipRateId, location_id, chip_rate);
        }
      }
      
      // 更新games表的chip_rate_id
      const gamesWithChipRate = db.prepare(`
        SELECT id, location_id, chip_rate 
        FROM games 
        WHERE chip_rate IS NOT NULL
      `).all() as any[];
      
      for (const game of gamesWithChipRate) {
        const chipRate = db.prepare(`
          SELECT id FROM location_chip_rates 
          WHERE location_id = ? AND chip_rate = ?
        `).get(game.location_id, game.chip_rate) as any;
        
        if (chipRate) {
          db.prepare(`
            UPDATE games SET chip_rate_id = ? WHERE id = ?
          `).run(chipRate.id, game.id);
        }
      }
      
      console.log('✅ Migrated chip_rate data to location_chip_rates table');
    }
  } catch (error: any) {
    console.warn('⚠️ Could not migrate chip_rate:', error.message);
  }

  // 创建玩家记录表（score和chips可为NULL，用于不计分的玩家）
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_records (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      score INTEGER,
      chips INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id),
      UNIQUE(game_id, player_id)
    )
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_players_user ON players(user_id);
    CREATE INDEX IF NOT EXISTS idx_locations_user ON locations(user_id);
    CREATE INDEX IF NOT EXISTS idx_games_user ON games(user_id);
    CREATE INDEX IF NOT EXISTS idx_games_location ON games(location_id);
    CREATE INDEX IF NOT EXISTS idx_games_created ON games(created_at);
    CREATE INDEX IF NOT EXISTS idx_location_chip_rates_location ON location_chip_rates(location_id);
    CREATE INDEX IF NOT EXISTS idx_records_game ON player_records(game_id);
    CREATE INDEX IF NOT EXISTS idx_records_player ON player_records(player_id);
  `);

  // 迁移现有数据：移除is_balanced字段（如果存在）
  try {
    db.exec(`ALTER TABLE games DROP COLUMN is_balanced`);
    console.log('✅ Removed is_balanced column from games table');
  } catch (error: any) {
    // 如果字段不存在，忽略错误
    if (!error.message.includes('no such column')) {
      console.warn('⚠️ Could not remove is_balanced column:', error.message);
    }
  }

  // 迁移现有数据：将player_records的score和chips改为可空（SQLite不支持ALTER COLUMN，需要重建表）
  try {
    // 检查是否已有数据
    const hasData = db.prepare('SELECT COUNT(*) as count FROM player_records').get() as { count: number };
    
    if (hasData.count > 0) {
      // 有数据时，需要重建表
      db.exec(`
        CREATE TABLE IF NOT EXISTS player_records_new (
          id TEXT PRIMARY KEY,
          game_id TEXT NOT NULL,
          player_id TEXT NOT NULL,
          score INTEGER,
          chips INTEGER,
          created_at TEXT NOT NULL,
          FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
          FOREIGN KEY (player_id) REFERENCES players(id),
          UNIQUE(game_id, player_id)
        )
      `);
      
      db.exec(`
        INSERT INTO player_records_new (id, game_id, player_id, score, chips, created_at)
        SELECT id, game_id, player_id, score, chips, created_at FROM player_records
      `);
      
      db.exec(`DROP TABLE player_records`);
      db.exec(`ALTER TABLE player_records_new RENAME TO player_records`);
      
      // 重建索引
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_records_game ON player_records(game_id);
        CREATE INDEX IF NOT EXISTS idx_records_player ON player_records(player_id);
      `);
      
      console.log('✅ Migrated player_records table to allow NULL score/chips');
    }
  } catch (error: any) {
    console.warn('⚠️ Could not migrate player_records table:', error.message);
  }

  console.log('✅ Database initialized successfully');
};

// 初始化默认数据（已废弃，用户登录后需要自己创建数据）
export const seedDefaultData = () => {
  // 注意：用户创建请使用 scripts/add-user.js 脚本
  // 使用方法: node scripts/add-user.js <username> <password> [name]
  // 
  // 用户登录后需要自己创建：
  // - 玩家（包括"我"）
  // - 地点
  // - 地点的chip_rate规则
};

export default db;

