// 添加用户的脚本
// 使用方法: node scripts/add-user.js <username> <password> [name]

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const { randomBytes } = require('crypto');

function generateId() {
  return 'c' + randomBytes(12).toString('base64url');
}

const dbPath = path.join(__dirname, '../backend/data/griffin.db');
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
} catch (error) {
  console.error('❌ 创建用户失败:', error.message);
  process.exit(1);
} finally {
  db.close();
}

