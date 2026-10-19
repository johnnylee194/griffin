import { execSync } from 'child_process';
import path from 'path';

async function globalSetup() {
  console.log('Setting up E2E database...');
  try {
    const backendPath = path.resolve(__dirname, '../backend');
    execSync(`node -e "
      const db = require('better-sqlite3')('./data/griffin.db');
      const now = new Date().toISOString();
      db.prepare('INSERT OR IGNORE INTO users (id, username, password, name, created_at) VALUES (?, ?, ?, ?, ?)').run('e2e-user-id', 'e2e_test', '\\$2b\\$10\\$eBDX81TBsef9feqFlxG/cu1yUfKR/f9Q11S8E2OZuhWIkDJ9ZexrW', 'E2E User', now);
      db.prepare('UPDATE users SET password = ? WHERE username = ?').run('\\$2b\\$10\\$eBDX81TBsef9feqFlxG/cu1yUfKR/f9Q11S8E2OZuhWIkDJ9ZexrW', 'e2e_test');

      const user = db.prepare('SELECT id FROM users WHERE username = ?').get('e2e_test');
      const userId = user.id;

      // Add E2E Location
      db.prepare('INSERT OR IGNORE INTO locations (id, user_id, name, created_at) VALUES (?, ?, ?, ?)').run('e2e-loc-1', userId, 'E2E Location', now);

      // Add E2E GameType
      db.prepare('INSERT OR IGNORE INTO game_types (id, user_id, name, created_at) VALUES (?, ?, ?, ?)').run('e2e-gt-1', userId, 'E2E GameType', now);

      // Link Location to GameType
      db.prepare('INSERT OR IGNORE INTO location_game_types (id, location_id, game_type_id, created_at) VALUES (?, ?, ?, ?)').run('e2e-lgt-1', 'e2e-loc-1', 'e2e-gt-1', now);

      // Add ChipRate to Location (location_chip_rates table)
      db.prepare('INSERT OR IGNORE INTO location_chip_rates (id, location_id, game_type_id, chip_rate, note, created_at) VALUES (?, ?, ?, ?, ?, ?)').run('e2e-cr-1', 'e2e-loc-1', 'e2e-gt-1', 10, '10/分', now);
    "`, {
      stdio: 'inherit',
      cwd: backendPath
    });
  } catch (err) {
    console.log('User might already exist, ignoring error.', err);
  }
}

export default globalSetup;
