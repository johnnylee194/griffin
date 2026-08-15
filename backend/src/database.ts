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

// ─── 辅助：检查列是否存在的函数 ───
function columnExists(tableName: string, columnName: string): boolean {
  const info = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
  return info.some((c: any) => c.name === columnName);
}

export const initDatabase = () => {
  // ───────────────  // 表结构定义（用于 CREATE TABLE IF NOT EXISTS + 后续迁移检测）
  // ───────────────

  // 创建用户表
  // 原始 commit: 121adc3 — replace Prisma with better-sqlite3
  // 经过多次迁移，目前完整结构包含 birth_date, birth_time 等
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 迁移：users.name
  // 来源: 140c78f — 用户账户增加名字字段并支持在设置中修改
  // 原因: 后端需要存储用户的显示名称（name），区别于登录用户名（username）
  if (!columnExists('users', 'name')) {
    db.exec(`ALTER TABLE users ADD COLUMN name TEXT`);
    console.log('✅ Added name column to users table');
  }


  // 原始 commit: 121adc3 — replace Prisma with better-sqlite3
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

  // 迁移：players.user_id
  // 来源: 9f597f3 — 数据库分离和chip_rate管理重构
  // 原因: 多用户数据隔离。players 表原本是全局的，添加 user_id 后每条记录属于特定用户。
  if (!columnExists('players', 'user_id')) {
    db.exec(`ALTER TABLE players ADD COLUMN user_id TEXT`);
    console.log('✅ Added user_id column to players table');
  }

  // ─── 地点表 ───
  // 原始 commit: 121adc3，后被 9f597f3 添加 user_id
  // DDL 层面定义 UNIQUE(user_id, name)（用户下唯一），但历史数据库可能是 name 全局唯一
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

  // 迁移：locations.user_id
  // 来源: 9f597f3 — 数据库分离和chip_rate管理重构
  // 原因: 与 players.user_id 相同，多用户数据隔离。
  if (!columnExists('locations', 'user_id')) {
    db.exec(`ALTER TABLE locations ADD COLUMN user_id TEXT`);
    console.log('✅ Added user_id column to locations table');
  }

  // 迁移：locations UNIQUE 约束
  // 来源: 63c7d17 — 修复 locations UNIQUE 约束（本次会话新增迁移）
  // 原因: 历史数据库的 UNIQUE 约束是 name 全局唯一，多用户场景下不同用户无法创建同名地点。
  //       业务需求是不同用户可以创建相同名字的地点，各自有独立数据。
  //       SQLite 不支持 DROP CONSTRAINT，只能重建表。
  // 触发条件: 存在 name 列的独立 UNIQUE 索引（不是复合唯一约束的一部分）
  const locationIndexes = db.prepare(`PRAGMA index_list(locations)`).all() as any[];
  const hasNameOnlyUnique = locationIndexes.some((idx: any) => {
    if (idx.origin === 'u') {
      const cols = db.prepare(`PRAGMA index_info('${idx.name}')`).all() as any[];
      return cols.length === 1 && cols[0].name === 'name';
    }
    return false;
  });

  if (hasNameOnlyUnique) {
    console.log('🔄 Migrating locations table: changing UNIQUE constraint from (name) to (user_id, name)...');
    const hasData = db.prepare('SELECT COUNT(*) as count FROM locations').get() as { count: number };
    // Disable FK checks for the entire migration (old data may have NULL user_id, and we drop locations which is referenced by other tables)
    db.exec(`PRAGMA foreign_keys=OFF`);
    db.exec(`DROP TABLE IF EXISTS locations_new`);
    db.exec(`
      CREATE TABLE locations_new (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        name TEXT NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(user_id, name)
      )
    `);
    db.exec(`INSERT INTO locations_new (id, user_id, name, is_default, created_at) SELECT id, user_id, name, is_default, created_at FROM locations`);
    db.exec(`DROP TABLE locations`);
    db.exec(`ALTER TABLE locations_new RENAME TO locations`);
    db.exec(`PRAGMA foreign_keys=ON`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_locations_user ON locations(user_id)`);
    console.log('✅ Migrated locations UNIQUE constraint: preserved ' + hasData.count + ' rows');
  }

  // ─── 游戏玩法表 ──────────────────────────────────────────
  // 来源: db4f722 — 增加玩法(Game Type)功能
  // 原因: 在 locations 层级上增加玩法（game_type）的概念，如"血战"、"换三张"等，
  //       支持同一地点不同玩法的胜率统计。
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

  // ─── 地点玩法关联表 ──────────────────────────────────────
  // 来源: db4f722
  // 原因: 表示某个地点支持哪些玩法，是 location 和 game_type 的多对多关系。
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

  // ─── 地点玩法倍率表 ──────────────────────────────────────
  // 来源: db4f722，后在 9f597f3 重构
  // 原因: 一个地点的某种玩法可以有多个倍率规则（如"一分10元"、"一分20元"）。
  //       games.chip_rate_id 关联到此表。
  db.exec(`
    CREATE TABLE IF NOT EXISTS location_chip_rates (
      id TEXT PRIMARY KEY,
      location_id TEXT NOT NULL,
      game_type_id TEXT,
      chip_rate INTEGER NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
      FOREIGN KEY (game_type_id) REFERENCES game_types(id) ON DELETE CASCADE,
      UNIQUE(location_id, game_type_id, chip_rate)
    )
  `);

  // ─── 对局表 ───
  // 原始 commit: 121adc3，后被 9f597f3/db4f722 重构
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

  // ─── 玩家记录表 ──────────────────────────────────────────
  // 来源: 121adc3，后在 390e762 改为可空
  // 原始结构: score/chips 为 NOT NULL
  db.exec(`
    CREATE TABLE IF NOT EXISTS player_records (
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

  // ─── 自定义筛选器表 ──────────────────────────────────────
  // 来源: c9e24b4 — 实现自定义筛选器功能
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

  // 迁移：custom_filters.game_type_ids
  // 来源: 4c6cdb1 — 在创建视图时增加玩法筛选选项
  // 原因: 自定义筛选器需要支持按玩法（game_type）筛选，所以增加 game_type_ids 字段，
  //       存储 JSON 格式的玩法 ID 数组。
  if (!columnExists('custom_filters', 'game_type_ids')) {
    db.exec(`ALTER TABLE custom_filters ADD COLUMN game_type_ids TEXT`);
    console.log('✅ Added game_type_ids column to custom_filters table');
  }

  // ─── 索引 ────
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

  // ─── 迁移：games.is_balanced ────────────────────────────
  // 来源: 390e762 — 添加多玩家记录和玩家维度统计功能
  // 原因: is_balanced 字段用于标记对局是否"平衡"（四人局都记分了）。
  //       后改为 is_complete（只要求"我"有记录就算完整），is_balanced 废弃。
  // 注意: SQLite 不支持 DROP COLUMN（直到 3.35.0），在某些版本会报错 "no such column"
  if (columnExists('games', 'is_balanced')) {
    db.exec(`ALTER TABLE games DROP COLUMN is_balanced`);
    console.log('✅ Removed is_balanced column from games table');
  }

  // ─── 迁移：player_records score/chips 可空化 ───────────
  // 来源: 390e762 — 添加多玩家记录和玩家维度统计功能
  // 原因: 业务变更——只需要记录"我"的分数（强制），其他玩家可为 NULL（不记分）。
  //       比如三人局、两人局不需要所有人都记分。
  //       SQLite 不支持 ALTER COLUMN（修改列约束），需要重建表。
  // 触发条件: score 或 chips 列的 notnull === 1（旧结构）；已是 NULL 则跳过。
  const prCols = db.prepare(`PRAGMA table_info(player_records)`).all() as any[];
  const scoreCol = prCols.find((c: any) => c.name === 'score');
  const chipsCol = prCols.find((c: any) => c.name === 'chips');
  const needsPrMigration = (scoreCol && scoreCol.notnull === 1) || (chipsCol && chipsCol.notnull === 1);

  if (needsPrMigration) {
    console.log('🔄 Migrating player_records table: making score/chips nullable...');
    const hasData = db.prepare('SELECT COUNT(*) as count FROM player_records').get() as { count: number };
    db.exec(`DROP TABLE IF EXISTS player_records_new`);
    db.exec(`
      CREATE TABLE player_records_new (
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
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_records_game ON player_records(game_id);
      CREATE INDEX IF NOT EXISTS idx_records_player ON player_records(player_id);
    `);
    console.log('✅ Migrated player_records table to allow NULL score/chips (' + hasData.count + ' rows)');
  }

  console.log('✅ Database initialized successfully');
};

export default db;
