import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import gamesRouter from '../../routes/games';
import db from '../../database';

const app = express();
app.use(express.json());
app.use('/api/games', gamesRouter);

describe('Games Routes', () => {
  let token: string;

  beforeEach(() => {
    const now = new Date().toISOString();
    db.prepare('INSERT OR IGNORE INTO users (id, username, password, name, created_at) VALUES (?, ?, ?, ?, ?)').run('test-user-id', 'testuser', 'pass', 'Test User', now);
    db.prepare('INSERT OR IGNORE INTO locations (id, user_id, name, created_at) VALUES (?, ?, ?, ?)').run('loc1', 'test-user-id', 'Loc1', now);
    db.prepare('INSERT OR IGNORE INTO game_types (id, user_id, name, created_at) VALUES (?, ?, ?, ?)').run('gt1', 'test-user-id', 'GameType1', now);
    db.prepare('INSERT OR IGNORE INTO location_game_types (id, location_id, game_type_id, created_at) VALUES (?, ?, ?, ?)').run('lgt1', 'loc1', 'gt1', now);
    db.prepare('INSERT OR IGNORE INTO location_chip_rates (id, location_id, game_type_id, chip_rate, note, created_at) VALUES (?, ?, ?, ?, ?, ?)').run('cr1', 'loc1', 'gt1', 10, '10', now);
    db.prepare('INSERT OR IGNORE INTO players (id, user_id, name, is_me, created_at) VALUES (?, ?, ?, ?, ?)').run('me', 'test-user-id', 'Me', 1, now);
    db.prepare('INSERT OR IGNORE INTO players (id, user_id, name, is_me, created_at) VALUES (?, ?, ?, ?, ?)').run('p2', 'test-user-id', 'P2', 0, now);

    process.env.JWT_SECRET = 'test-secret';
    token = jwt.sign({ id: 'test-user-id', username: 'testuser' }, process.env.JWT_SECRET);
  });

  it('should create a new game', async () => {
    const gameData = {
      locationId: 'loc1',
      gameTypeId: 'gt1',
      chipRateId: 'cr1',
      playerIds: ['me', 'p2'],
      myScore: 100
    };

    const res = await request(app)
      .post('/api/games')
      .set('Authorization', `Bearer ${token}`)
      .send(gameData);

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();

    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(res.body.id);
    expect(game).toBeDefined();
  });
});
