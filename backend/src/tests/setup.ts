import db, { initDatabase } from '../database';
import { beforeEach } from 'vitest';

beforeEach(() => {
  initDatabase();
  const tables = ['player_records', 'games', 'location_chip_rates', 'location_game_types', 'game_types', 'locations', 'players', 'custom_filters', 'users'];
  for (const table of tables) {
    try { db.exec(`DELETE FROM ${table}`); } catch(e) {}
  }
});
