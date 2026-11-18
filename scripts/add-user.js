// 添加用户的脚本
// 使用方法: node scripts/add-user.js <username> <password> [name]

const path = require('path');
const fs = require('fs');
const { randomBytes } = require('crypto');

// 支持从根目录或 scripts/ 目录直接运行（自动加载 backend/node_modules）
const projectRoot = path.resolve(__dirname, '..');
const backendModules = path.join(projectRoot, 'backend', 'node_modules');
if (fs.existsSync(backendModules) && !module.paths.includes(backendModules)) {
  module.paths.unshift(backendModules);
}

const dotenv = require('dotenv');
dotenv.config({ path: path.join(projectRoot, '.env') });

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

function generateId() {
  return 'c' + randomBytes(12).toString('base64url');
}

const dbUrl = process.env.DATABASE_URL || process.env.DB_PATH;
const cleanedUrl = dbUrl ? dbUrl.replace(/^file:/, '') : '';
const dbPath = cleanedUrl
  ? (path.isAbsolute(cleanedUrl) ? cleanedUrl : path.resolve(projectRoot, cleanedUrl))
  : path.join(projectRoot, 'data/griffin.db');

const db = new Database(dbPath);

const username = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] || username;

if (!username || !password) {
  console.error('❌ 使用方法: node scripts/add-user.js <username> <password> [name]');
  process.exit(1);
}

try {
  // 检查用户是否已存在
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  
  if (existingUser) {
    console.log(`⚠️  用户 "${username}" 已存在`);
    process.exit(0);
  }

  // 创建新用户
  const userId = generateId();
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  db.prepare(`
    INSERT INTO users (id, username, password, name, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(userId, username, hashedPassword, name);
  
  console.log(`✅ 用户 "${username}" 创建成功`);
  console.log(`   - 用户名: ${username}`);
  console.log(`   - 显示名: ${name}`);
  console.log(`   - 用户ID: ${userId}`);
  console.log(`   - 数据库: ${dbPath}`);
} catch (error) {
  console.error('❌ 创建用户失败:', error.message);
  process.exit(1);
} finally {
  db.close();
}
