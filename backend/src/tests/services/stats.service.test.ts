import { describe, it, expect, beforeEach } from 'vitest';
import { StatsService } from '../../services/stats.service';
import db from '../../database';

describe('Stats Service', () => {
  beforeEach(() => {
    const now = '2024-10-15T12:00:00';
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

  it('should calculate stats for a single game and assign late night 11-01 02:00 to 10-31 (Oct)', () => {
    // 2024-11-01T02:00:00 is late night, should belong to 2024-10-31 (Oct 2024)
    const lateNightDate = '2024-11-01T02:00:00';
    db.prepare(`INSERT INTO games (id, user_id, location_id, game_type_id, chip_rate_id, is_complete, created_at)
                VALUES ('g1', 'test-user-id', 'loc1', 'gt1', 'cr1', 1, ?)`).run(lateNightDate);
    db.prepare(`INSERT INTO player_records (id, game_id, player_id, score, chips, created_at)
                VALUES ('pr1', 'g1', 'me', 10, 100, ?)`).run(lateNightDate);

    // October stats should include this game
    const octStats = StatsService.getMonthlyStats('test-user-id', 2024, 10);
    expect(octStats.overall.totalGames).toBe(1);
    expect(octStats.overall.profit).toBe(100);
    expect(octStats.lateNight.totalGames).toBe(1);
    expect(octStats.lateNight.profit).toBe(100);

    // November stats should NOT include this game
    const novStats = StatsService.getMonthlyStats('test-user-id', 2024, 11);
    expect(novStats.overall.totalGames).toBe(0);
  });

  it('calculates getDailyBattleStats accurately', () => {
    const d1 = '2024-10-15T11:00:00'; // morning
    const d2 = '2024-10-16T01:00:00'; // lateNight of 10-15
    db.prepare(`INSERT INTO games (id, user_id, location_id, game_type_id, chip_rate_id, is_complete, created_at)
                VALUES ('g10', 'test-user-id', 'loc1', 'gt1', 'cr1', 1, ?)`).run(d1);
    db.prepare(`INSERT INTO player_records (id, game_id, player_id, score, chips, created_at)
                VALUES ('pr10', 'g10', 'me', 10, 100, ?)`).run(d1);

    db.prepare(`INSERT INTO games (id, user_id, location_id, game_type_id, chip_rate_id, is_complete, created_at)
                VALUES ('g11', 'test-user-id', 'loc1', 'gt1', 'cr1', 1, ?)`).run(d2);
    db.prepare(`INSERT INTO player_records (id, game_id, player_id, score, chips, created_at)
                VALUES ('pr11', 'g11', 'me', -5, -50, ?)`).run(d2);

    const daily = StatsService.getDailyBattleStats('test-user-id', '2024-10-15');
    expect(daily.totalGames).toBe(2);
    expect(daily.totalProfit).toBe(50);
    expect(daily.morningProfit).toBe(100);
    expect(daily.lateNightProfit).toBe(-50);
    expect(daily.games.length).toBe(2);
  });
});
