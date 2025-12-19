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
      is_balanced INTEGER,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (location_id) REFERENCES locations(id)
    )
  `);

  // 创建玩家记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_records (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      chips INTEGER NOT NULL,
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

  console.log('✅ Database initialized successfully');
};

// 初始化默认数据
export const seedDefaultData = () => {
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

