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
      chinese_horoscope TEXT,
      western_horoscope TEXT,
      combined_advice TEXT,
      result_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, date)
    )
  `);

  // 迁移现有数据：添加 result_json 字段（如果不存在）
  try {
    db.exec(`ALTER TABLE horoscope_cache ADD COLUMN result_json TEXT`);
    console.log('✅ Added result_json column to horoscope_cache table');
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.warn('⚠️ Could not add result_json column to horoscope_cache table:', error.message);
    }
  }

  // 迁移：移除 horoscope_cache 旧字段 chinese_horoscope/western_horoscope/combined_advice
  // 新代码不再使用这三个字段，直接删除。SQLite 不支持 DROP COLUMN，只能重建表。
  // 检测逻辑：只要这三个旧列存在就触发迁移（说明是旧表结构）；不存在则不触发。
  const tableInfo = db.prepare("PRAGMA table_info(horoscope_cache)").all() as any[];
  const hasOldColumns = tableInfo.some((c: any) =>
    ['chinese_horoscope', 'western_horoscope', 'combined_advice'].includes(c.name)
  );

  if (hasOldColumns) {
    console.log('🔄 Migrating horoscope_cache table: removing deprecated columns...');
    try {
      const hasData = db.prepare('SELECT COUNT(*) as count FROM horoscope_cache').get() as { count: number };
      db.exec(`DROP TABLE IF EXISTS horoscope_cache_new`);
      db.exec(`
        CREATE TABLE horoscope_cache_new (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          date TEXT NOT NULL,
          result_json TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id),
          UNIQUE(user_id, date)
        )
      `);
      db.exec(`
        INSERT INTO horoscope_cache_new (id, user_id, date, result_json, created_at)
        SELECT id, user_id, date, result_json, created_at FROM horoscope_cache
      `);
      db.exec('DROP TABLE horoscope_cache');
      db.exec('ALTER TABLE horoscope_cache_new RENAME TO horoscope_cache');
      db.exec('CREATE INDEX IF NOT EXISTS idx_horoscope_user_date ON horoscope_cache(user_id, date)');
      console.log('✅ Migrated horoscope_cache table: dropped old columns, preserved ' + hasData.count + ' rows');
    } catch (migrateError: any) {
      console.warn('⚠️ Failed to migrate horoscope_cache table:', migrateError.message);
    }
  }

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

  // 创建游戏玩法表（用户级全局玩法）
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_types (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, name)
    )
  `);

  // 创建地点玩法关联表
  db.exec(`
    CREATE TABLE IF NOT EXISTS location_game_types (
      id TEXT PRIMARY KEY,
      location_id TEXT NOT NULL,
      game_type_id TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
      FOREIGN KEY (game_type_id) REFERENCES game_types(id) ON DELETE CASCADE,
      UNIQUE(location_id, game_type_id)
    )
  `);

  // 创建地点玩法倍率规则表（一个玩法可以有多个倍率）
  db.exec(`
    CREATE TABLE IF NOT EXISTS location_chip_rates (
      id TEXT PRIMARY KEY,
      location_id TEXT NOT NULL,
      game_type_id TEXT NOT NULL,
      chip_rate INTEGER NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
      FOREIGN KEY (game_type_id) REFERENCES game_types(id) ON DELETE CASCADE,
      UNIQUE(location_id, game_type_id, chip_rate)
    )
  `);



  // 创建对局表（添加user_id、game_type_id，移除chip_rate字段）
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      location_id TEXT NOT NULL,
      game_type_id TEXT,
      chip_rate_id TEXT,
      is_complete INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (location_id) REFERENCES locations(id),
      FOREIGN KEY (game_type_id) REFERENCES game_types(id),
      FOREIGN KEY (chip_rate_id) REFERENCES location_chip_rates(id)
    )
  `);



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

  // 创建自定义筛选器表
  db.exec(`
    CREATE TABLE IF NOT EXISTS custom_filters (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      location_ids TEXT,
      player_ids TEXT,
      game_type_ids TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 迁移现有数据：添加game_type_ids字段（如果不存在）
  try {
    db.exec(`ALTER TABLE custom_filters ADD COLUMN game_type_ids TEXT`);
    console.log('✅ Added game_type_ids column to custom_filters table');
  } catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
      console.warn('⚠️ Could not add game_type_ids column to custom_filters table:', error.message);
    }
  }

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_players_user ON players(user_id);
    CREATE INDEX IF NOT EXISTS idx_locations_user ON locations(user_id);
    CREATE INDEX IF NOT EXISTS idx_game_types_user ON game_types(user_id);
    CREATE INDEX IF NOT EXISTS idx_location_game_types_location ON location_game_types(location_id);
    CREATE INDEX IF NOT EXISTS idx_location_game_types_game_type ON location_game_types(game_type_id);
    CREATE INDEX IF NOT EXISTS idx_games_user ON games(user_id);
    CREATE INDEX IF NOT EXISTS idx_games_user_location ON games(user_id, location_id);
    CREATE INDEX IF NOT EXISTS idx_games_location ON games(location_id);
    CREATE INDEX IF NOT EXISTS idx_games_game_type ON games(game_type_id);
    CREATE INDEX IF NOT EXISTS idx_games_created ON games(created_at);
    CREATE INDEX IF NOT EXISTS idx_location_chip_rates_location ON location_chip_rates(location_id);
    CREATE INDEX IF NOT EXISTS idx_location_chip_rates_game_type ON location_chip_rates(game_type_id);
    CREATE INDEX IF NOT EXISTS idx_records_game ON player_records(game_id);
    CREATE INDEX IF NOT EXISTS idx_records_player ON player_records(player_id);
    CREATE INDEX IF NOT EXISTS idx_custom_filters_user ON custom_filters(user_id);
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

export default db;

