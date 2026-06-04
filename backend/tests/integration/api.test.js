/**
 * Integration Tests — Workout, Streak, Rewards & AI Routes
 * Full request-response cycle tests in mock DB mode.
 */
import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';

const TS = Date.now();
let authToken = '';

// ── Setup: Register + Login ────────────────────────────────────────────────
beforeAll(async () => {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({
      username: `api_tester_${TS}`,
      email:    `api_tester_${TS}@gymbuddy.io`,
      password: 'TestPass@123',
      name:     'API Test User',
      fitnessGoals:  ['Strength', 'Cardio'],
      fitnessLevel:  'Intermediate',
      schedule:      ['Morning'],
      location:      'Mumbai',
    });
  authToken = reg.body.token;
});

const authHeader = () => ({ Authorization: `Bearer ${authToken}` });

// ── Health Check ───────────────────────────────────────────────────────────
describe('GET /api/health', () => {
  it('should return 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ── Workout Routes ─────────────────────────────────────────────────────────
describe('POST /api/workouts/log', () => {
  it('should log a workout and return workout + coins earned', async () => {
    const res = await request(app)
      .post('/api/workouts/log')
      .set(authHeader())
      .send({
        date: new Date().toISOString().split('T')[0],
        exercises: [{ name: 'Bench Press', type: 'Strength', sets: 4, reps: 10, weight: 80 }],
        duration: 45,
        calories: 350,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('workout');
    expect(res.body).toHaveProperty('coinsEarned');
    expect(res.body.coinsEarned).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('newCoinBalance');
  });

  it('should reject workout without exercises with 400', async () => {
    const res = await request(app)
      .post('/api/workouts/log')
      .set(authHeader())
      .send({ date: new Date().toISOString().split('T')[0], duration: 30 });
    expect(res.status).toBe(400);
  });

  it('should reject workout with future date with 400', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const res = await request(app)
      .post('/api/workouts/log')
      .set(authHeader())
      .send({
        date: futureDate.toISOString().split('T')[0],
        exercises: [{ name: 'Squat', sets: 3, reps: 10 }],
        duration: 30,
      });
    expect(res.status).toBe(400);
  });

  it('should reject unauthenticated request with 401', async () => {
    const res = await request(app)
      .post('/api/workouts/log')
      .send({ exercises: [{ name: 'Test' }] });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/workouts/history', () => {
  it('should return array of workouts for the authenticated user', async () => {
    const res = await request(app)
      .get('/api/workouts/history')
      .set(authHeader());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ── Streak Routes ──────────────────────────────────────────────────────────
describe('GET /api/streaks/status', () => {
  it('should return streak status for authenticated user', async () => {
    const res = await request(app)
      .get('/api/streaks/status')
      .set(authHeader());
    expect(res.status).toBe(200);
    // API returns currentStreak (not streakCount) in this endpoint
    expect(res.body).toHaveProperty('currentStreak');
    expect(res.body).toHaveProperty('totalVerified');
  });
});

// ── Rewards Routes ─────────────────────────────────────────────────────────
describe('GET /api/rewards/catalog', () => {
  it('should return array of reward items', async () => {
    const res = await request(app)
      .get('/api/rewards/catalog')
      .set(authHeader());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('each item should have name, coinCost, category', async () => {
    const res = await request(app)
      .get('/api/rewards/catalog')
      .set(authHeader());
    res.body.forEach(item => {
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('coinCost');
      expect(item).toHaveProperty('category');
    });
  });
});

describe('POST /api/rewards/redeem', () => {
  it('should reject redemption of non-existent or too-expensive reward', async () => {
    const res = await request(app)
      .post('/api/rewards/redeem')
      .set(authHeader())
      .send({ rewardId: 'non_existent_reward_id_12345' });

    // 400 = insufficient coins / bad request; 404 = reward not found — both are valid rejections
    expect([400, 404]).toContain(res.status);
    expect(res.body).toHaveProperty('message');
  });
});

describe('GET /api/rewards/transactions', () => {
  it('should return coin transaction history', async () => {
    const res = await request(app)
      .get('/api/rewards/transactions')
      .set(authHeader());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ── Analytics Routes ───────────────────────────────────────────────────────
describe('GET /api/analytics/weekly', () => {
  it('should return weekly summary with dailyBreakdown array', async () => {
    const res = await request(app)
      .get('/api/analytics/weekly')
      .set(authHeader());
    expect(res.status).toBe(200);
    // API returns dailyBreakdown (not days)
    expect(res.body).toHaveProperty('dailyBreakdown');
    expect(Array.isArray(res.body.dailyBreakdown)).toBe(true);
    expect(res.body.dailyBreakdown).toHaveLength(7);
  });
});

describe('GET /api/analytics/progress', () => {
  it('should return progress report with summary', async () => {
    const res = await request(app)
      .get('/api/analytics/progress')
      .set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('summary');
  });
});

describe('GET /api/analytics/leaderboard', () => {
  it('should return leaderboard array', async () => {
    const res = await request(app)
      .get('/api/analytics/leaderboard')
      .set(authHeader());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ── AI Routes ──────────────────────────────────────────────────────────────
describe('GET /api/ai/workout-plan', () => {
  it('should return a personalised workout plan', async () => {
    const res = await request(app)
      .get('/api/ai/workout-plan')
      .set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('planName');
    expect(res.body).toHaveProperty('weekPlan');
    expect(res.body.weekPlan).toHaveLength(7);
  });
});

describe('GET /api/ai/motivation', () => {
  it('should return at least one motivation message', async () => {
    const res = await request(app)
      .get('/api/ai/motivation')
      .set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('messages');
    expect(res.body.messages.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/ai/insights', () => {
  it('should return engagement score and cluster', async () => {
    const res = await request(app)
      .get('/api/ai/insights')
      .set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('engagementScore');
    expect(res.body).toHaveProperty('cluster');
    expect(res.body).toHaveProperty('churnRisk');
  });
});

describe('GET /api/ai/nudges', () => {
  it('should return nudges with count', async () => {
    const res = await request(app)
      .get('/api/ai/nudges')
      .set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('nudges');
    expect(typeof res.body.count).toBe('number');
  });
});

describe('GET /api/ai/matches', () => {
  it('should return results array with count', async () => {
    const res = await request(app)
      .get('/api/ai/matches')
      .set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('results');
    expect(Array.isArray(res.body.results)).toBe(true);
  });

  it('all match results should include compatibility.total between 0-100', async () => {
    const res = await request(app)
      .get('/api/ai/matches')
      .set(authHeader());
    res.body.results.forEach(r => {
      expect(r.compatibility.total).toBeGreaterThanOrEqual(0);
      expect(r.compatibility.total).toBeLessThanOrEqual(100);
    });
  });
});

// ── Security Tests ─────────────────────────────────────────────────────────
describe('Security: XSS & Injection Protection', () => {
  it('should strip script tags from text fields on registration', async () => {
    const xssEmail = `xss_${TS}@test.io`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: `xss_${TS}`,
        email: xssEmail,
        password: 'SecurePass@123',
        name: '<script>alert("xss")</script>',
      });
    if (res.status === 201) {
      expect(res.body.user?.name ?? '').not.toContain('<script>');
    }
  });

  it('should reject extremely long input (>10000 chars) gracefully', async () => {
    const longString = 'A'.repeat(10001);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: longString, email: `long_${TS}@test.io`, password: 'pass123' });
    expect([400, 413, 422]).toContain(res.status);
  });

  it('should not expose stack traces in production error responses', async () => {
    const res = await request(app).get('/api/auth/me'); // no token
    expect(res.body).not.toHaveProperty('stack');
  });

  it('all protected routes should return 401 without auth header', async () => {
    const protectedRoutes = [
      { method: 'get', url: '/api/workouts/history' },
      { method: 'get', url: '/api/streaks/status' },
      { method: 'get', url: '/api/rewards/catalog' },
      { method: 'get', url: '/api/analytics/weekly' },
      { method: 'get', url: '/api/ai/insights' },
    ];

    for (const route of protectedRoutes) {
      const res = await request(app)[route.method](route.url);
      expect(res.status).toBe(401);
    }
  });
});
