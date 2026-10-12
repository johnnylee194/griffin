import { describe, it, expect, beforeEach } from 'vitest';
import { StatsService } from '../../services/stats.service';
import db from '../../database';

describe('Stats Service', () => {
  beforeEach(() => {
    const now = new Date().toISOString();
    db.prepare('INSERT OR IGNORE INTO users (id, username, password, name, created_at) VALUES (?, ?, ?, ?, ?)').run('test-user-id', 'testuser', 'pass', 'Test User', now);
    db.prepare('INSERT OR IGNORE INTO locations (id, user_id, name, created_at) VALUES (?, ?, ?, ?)').run('loc1', 'test-user-id', 'Loc1', now);
    db.prepare('INSERT OR IGNORE INTO game_types (id, user_id, name, created_at) VALUES (?, ?, ?, ?)').run('gt1', 'test-user-id', 'GameType1', now);
    db.prepare('INSERT OR IGNORE INTO location_game_types (id, location_id, game_type_id, created_at) VALUES (?, ?, ?, ?)').run('lgt1', 'loc1', 'gt1', now);
    db.prepare('INSERT OR IGNORE INTO location_chip_rates (id, location_id, game_type_id, chip_rate, note, created_at) VALUES (?, ?, ?, ?, ?, ?)').run('cr1', 'loc1', 'gt1', 10, '10', now);
    db.prepare('INSERT OR IGNORE INTO players (id, user_id, name, is_me, created_at) VALUES (?, ?, ?, ?, ?)').run('me', 'test-user-id', 'Me', 1, now);
  });

  it('should return default stats if no games', () => {
    const stats = StatsService.getMonthlyStats('test-user-id', 2024, 10);
    expect(stats.overall.totalGames).toBe(0);
    expect(stats.overall.profit).toBe(0);
    expect(stats.overall.winRate).toBe(0);
  });

  it('should calculate stats for a single game', () => {
    const now = new Date('2024-10-15T12:00:00Z').toISOString();
    db.prepare(`INSERT INTO games (id, user_id, location_id, game_type_id, chip_rate_id, is_complete, created_at)
                VALUES ('g1', 'test-user-id', 'loc1', 'gt1', 'cr1', 1, ?)`).run(now);
    db.prepare(`INSERT INTO player_records (id, game_id, player_id, score, chips, created_at)
                VALUES ('pr1', 'g1', 'me', 10, 100, ?)`).run(now);

    const stats = StatsService.getMonthlyStats('test-user-id', 2024, 10);
    expect(stats.overall.totalGames).toBe(1);
    expect(stats.overall.profit).toBe(100);
    expect(stats.overall.winRate).toBe(100);
  });
});
