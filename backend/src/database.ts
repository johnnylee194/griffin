import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

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

  // 创建玩家表
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT,
      is_me INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 创建地点表
  db.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 创建对局表
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      location_id TEXT NOT NULL,
      chip_rate INTEGER NOT NULL DEFAULT 100,
      is_complete INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (location_id) REFERENCES locations(id)
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

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_games_location ON games(location_id);
    CREATE INDEX IF NOT EXISTS idx_games_created ON games(created_at);
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

// 初始化默认数据
export const seedDefaultData = () => {
  // 检查是否已有用户
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  
  if (userCount.count === 0) {
    // 创建默认用户（用户名: admin, 密码: admin123）
    const userId = generateId();
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (id, username, password, name, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(userId, 'admin', hashedPassword, 'admin');
    
    console.log('✅ Default user "admin" created (password: admin123)');
  }

  // 检查是否已有数据
  const locationCount = db.prepare('SELECT COUNT(*) as count FROM locations').get() as { count: number };
  
  if (locationCount.count === 0) {
    // 创建默认地点
    const locationId = generateId();
    db.prepare(`
      INSERT INTO locations (id, name, is_default, created_at)
      VALUES (?, ?, 1, datetime('now'))
    `).run(locationId, '紫竹郡');
    
    console.log('✅ Default location "紫竹郡" created');
  }

  // 检查是否已有"我"这个玩家
  const meCount = db.prepare('SELECT COUNT(*) as count FROM players WHERE is_me = 1').get() as { count: number };
  
  if (meCount.count === 0) {
    // 创建"我"
    const playerId = generateId();
    db.prepare(`
      INSERT INTO players (id, name, is_me, created_at, updated_at)
      VALUES (?, ?, 1, datetime('now'), datetime('now'))
    `).run(playerId, '我');
    
    console.log('✅ Default player "我" created');
  }
};

export default db;

