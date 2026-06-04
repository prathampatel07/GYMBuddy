/**
 * Integration Tests — Auth API Routes
 * Tests registration, login, token validation, and profile endpoints.
 * Uses Supertest against the live Express app in MOCK DB mode.
 *
 * API Response Shapes (verified against running server):
 *  - POST /api/auth/register → { _id, username, email, token, ... } (flat, no .user wrapper)
 *  - GET  /api/auth/profile  → { _id, username, email, fitnessLevel, ... }
 *  - PUT  /api/auth/profile  → updated user object
 */
import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';

const TS = Date.now();
const TEST_EMAIL    = `int_test_${TS}@gymbuddy.io`;
const TEST_PASSWORD = 'SecurePass@123';
const TEST_USERNAME = `int_user_${TS}`;

let authToken = '';

// ── Registration ───────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  it('should register a new user and return token + user fields at top level', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: TEST_USERNAME,
        email:    TEST_EMAIL,
        password: TEST_PASSWORD,
        name:     'Integration Tester',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('email', TEST_EMAIL);
    expect(res.body).toHaveProperty('username', TEST_USERNAME);
    expect(res.body).not.toHaveProperty('password'); // never expose password hash
    authToken = res.body.token;
  });

  it('should reject duplicate email with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'other_user', email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
  });

  it('should reject missing email with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'nomail', password: 'pass123' });
    expect(res.status).toBe(400);
  });

  it('should reject weak password (< 6 chars) with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'weakpass', email: `weak_${TS}@test.io`, password: '123' });
    expect(res.status).toBe(400);
  });

  it('should reject malformed email with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'bademail', email: 'not-an-email', password: 'validpass' });
    expect(res.status).toBe(400);
  });
});

// ── Login ──────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('should login with correct credentials and return JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
    authToken = res.body.token; // refresh token for subsequent tests
  });

  it('should reject wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: 'WrongPassword!' });
    expect(res.status).toBe(401);
  });

  it('should reject non-existent email with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@nowhere.io', password: 'pass' });
    expect(res.status).toBe(401);
  });

  it('should reject empty body with 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
});

// ── GET /api/auth/profile ──────────────────────────────────────────────────
describe('GET /api/auth/profile', () => {
  it('should return user profile with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('email', TEST_EMAIL);
    expect(res.body).toHaveProperty('username', TEST_USERNAME);
    expect(res.body).not.toHaveProperty('password');
  });

  it('should return 401 without Authorization header', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.status).toBe(401);
  });

  it('should return 401 with invalid/malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', 'Bearer INVALID.TOKEN.HERE');
    expect(res.status).toBe(401);
  });

  it('should return 401 with tampered token (altered payload)', async () => {
    // Build a structurally-valid JWT with tampered payload but wrong signature
    const parts = authToken.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ id: 'hacker', exp: 9999999999 })).toString('base64url');
    const tamperedToken = [parts[0], tamperedPayload, parts[2]].join('.');
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${tamperedToken}`);
    expect(res.status).toBe(401);
  });
});

// ── Profile Update ─────────────────────────────────────────────────────────
describe('PUT /api/auth/profile', () => {
  it('should update allowed profile fields and return updated user', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ fitnessGoals: ['Strength', 'Cardio'], fitnessLevel: 'Intermediate' });

    expect(res.status).toBe(200);
    expect(res.body.fitnessGoals).toContain('Strength');
    expect(res.body.fitnessLevel).toBe('Intermediate');
  });

  it('should not allow overwriting email via profile update', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ email: 'hacker@evil.com' });

    if (res.status === 200) {
      // If request succeeds, email must NOT have changed
      expect(res.body.email).toBe(TEST_EMAIL);
    }
    // 400 rejection is also acceptable
  });

  it('should reject unauthenticated profile update with 401', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .send({ fitnessLevel: 'Advanced' });
    expect(res.status).toBe(401);
  });
});
