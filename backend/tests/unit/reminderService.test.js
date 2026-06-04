/**
 * Unit Tests — Smart Reminder Service
 * Tests engagement score, nudge generation, and optimal reminder time logic.
 */
import { describe, it, expect } from '@jest/globals';
import {
  generateNudges,
  calculateEngagementScore,
  predictOptimalReminderTime,
} from '../../src/services/reminderService.js';

// ── Fixtures ───────────────────────────────────────────────────────────────
const NEW_USER = {
  _id: 'user_new',
  username: 'newbie',
  streakCount: 0,
  totalWorkouts: 0,
  coins: 100,
  lastWorkoutDate: null,
  partnerId: null,
};

const ACTIVE_USER = {
  _id: 'user_active',
  username: 'active_one',
  streakCount: 14,
  totalWorkouts: 56,
  coins: 350,
  lastWorkoutDate: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5h ago
  partnerId: 'some_partner_id',
};

const AT_RISK_USER = {
  _id: 'user_risk',
  username: 'risky_one',
  streakCount: 10,
  totalWorkouts: 25,
  coins: 200,
  lastWorkoutDate: new Date(Date.now() - 52 * 60 * 60 * 1000).toISOString(), // 52h ago
  partnerId: null,
};

// ── Engagement Score Tests ──────────────────────────────────────────────────
describe('calculateEngagementScore()', () => {
  it('should return score between 0 and 100', () => {
    const score = calculateEngagementScore(ACTIVE_USER).score;
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should give active users a higher score than new users', () => {
    const activeScore = calculateEngagementScore(ACTIVE_USER).score;
    const newScore    = calculateEngagementScore(NEW_USER).score;
    expect(activeScore).toBeGreaterThan(newScore);
  });

  it('should give at-risk users a lower score than active users', () => {
    const activeScore  = calculateEngagementScore(ACTIVE_USER).score;
    const riskScore    = calculateEngagementScore(AT_RISK_USER).score;
    expect(activeScore).toBeGreaterThan(riskScore);
  });

  it('should include label field', () => {
    const result = calculateEngagementScore(ACTIVE_USER);
    expect(typeof result.label).toBe('string');
    expect(result.label.length).toBeGreaterThan(0);
  });

  it('should include breakdown with recency, streak, volume, social', () => {
    const result = calculateEngagementScore(ACTIVE_USER);
    expect(result.breakdown).toHaveProperty('recency');
    expect(result.breakdown).toHaveProperty('streak');
    expect(result.breakdown).toHaveProperty('volume');
    expect(result.breakdown).toHaveProperty('social');
  });

  it('should add social bonus (+10) when user has a partner', () => {
    const withPartner    = calculateEngagementScore({ ...NEW_USER, partnerId: 'pid' }).score;
    const withoutPartner = calculateEngagementScore({ ...NEW_USER, partnerId: null }).score;
    expect(withPartner).toBeGreaterThan(withoutPartner);
  });

  it('should give "Inactive" label to users with no activity', () => {
    const result = calculateEngagementScore(NEW_USER);
    expect(['Inactive', 'At Risk']).toContain(result.label);
  });

  it('should give "Highly Engaged" or "Active" label to streak users', () => {
    const result = calculateEngagementScore(ACTIVE_USER);
    expect(['Highly Engaged', 'Active']).toContain(result.label);
  });
});

// ── Nudge Generation Tests ─────────────────────────────────────────────────
describe('generateNudges()', () => {
  it('should return object with nudges array and count', async () => {
    const result = await generateNudges(NEW_USER);
    expect(Array.isArray(result.nudges)).toBe(true);
    expect(typeof result.count).toBe('number');
    expect(result.count).toBe(result.nudges.length);
  });

  it('should trigger first_workout nudge for users with 0 workouts', async () => {
    const result = await generateNudges(NEW_USER);
    const nudge = result.nudges.find(n => n.id === 'first_workout');
    expect(nudge).toBeDefined();
  });

  it('should trigger streak_risk_urgent nudge when risk is high and streak > 0', async () => {
    const result = await generateNudges(AT_RISK_USER);
    const urgentNudge = result.nudges.find(n => n.id === 'streak_risk_urgent');
    expect(urgentNudge).toBeDefined();
  });

  it('urgent nudges should have dismissible=false', async () => {
    const result = await generateNudges(AT_RISK_USER);
    const urgentNudge = result.nudges.find(n => n.type === 'urgent');
    if (urgentNudge) {
      expect(urgentNudge.dismissible).toBe(false);
    }
  });

  it('should trigger partner_ahead nudge when partner streak is 3+ more', async () => {
    const partnerAhead = { username: 'partner', streakCount: 20 };
    const user = { ...ACTIVE_USER, streakCount: 14 };
    const result = await generateNudges(user, partnerAhead);
    const nudge = result.nudges.find(n => n.id === 'partner_ahead');
    expect(nudge).toBeDefined();
  });

  it('should trigger pending_verification nudge when partner has pending proofs', async () => {
    const partner = { username: 'partner', streakCount: 14 };
    const pendingProofs = [{ _id: 'proof1', status: 'pending' }];
    const result = await generateNudges(ACTIVE_USER, partner, pendingProofs);
    const nudge = result.nudges.find(n => n.id === 'pending_verification');
    expect(nudge).toBeDefined();
  });

  it('should trigger find_partner nudge for users with 3+ workouts and no partner', async () => {
    const user = { ...ACTIVE_USER, partnerId: null };
    const result = await generateNudges(user, null);
    const nudge = result.nudges.find(n => n.id === 'find_partner');
    expect(nudge).toBeDefined();
  });

  it('nudges should be sorted by priority (highest first)', async () => {
    const result = await generateNudges(AT_RISK_USER);
    for (let i = 0; i < result.nudges.length - 1; i++) {
      expect(result.nudges[i].priority).toBeGreaterThanOrEqual(result.nudges[i + 1].priority);
    }
  });

  it('each nudge should have id, icon, title, message, and cta', async () => {
    const result = await generateNudges(ACTIVE_USER);
    result.nudges.forEach(nudge => {
      expect(nudge.id).toBeTruthy();
      expect(nudge.icon).toBeTruthy();
      expect(nudge.title).toBeTruthy();
      expect(nudge.message).toBeTruthy();
      expect(nudge.cta).toBeDefined();
      expect(nudge.cta.label).toBeTruthy();
      expect(nudge.cta.path).toBeTruthy();
    });
  });

  it('should include persona and churnRisk in the result', async () => {
    const result = await generateNudges(ACTIVE_USER);
    expect(typeof result.persona).toBe('string');
    expect(['low', 'medium', 'high']).toContain(result.churnRisk);
  });

  it('coin_milestone nudge should trigger when within 5 sessions of threshold', async () => {
    // User has 130 coins — next threshold is 150 (20 gap = 2 sessions)
    const user = { ...NEW_USER, coins: 130, totalWorkouts: 5 };
    const result = await generateNudges(user);
    const nudge = result.nudges.find(n => n.id === 'coin_milestone');
    expect(nudge).toBeDefined();
  });
});

// ── Optimal Reminder Time Tests ────────────────────────────────────────────
describe('predictOptimalReminderTime()', () => {
  it('should return default 8am when no workout history', async () => {
    const result = await predictOptimalReminderTime('nonexistent_user_id_xyz');
    expect(result.recommendedHour).toBe(8);
    expect(result.confidence).toBe('low');
  });

  it('should return recommendedHour between 6 and 23', async () => {
    const result = await predictOptimalReminderTime('any_user');
    expect(result.recommendedHour).toBeGreaterThanOrEqual(6);
    expect(result.recommendedHour).toBeLessThanOrEqual(23);
  });

  it('should include a human-readable message', async () => {
    const result = await predictOptimalReminderTime('user_test');
    expect(typeof result.message).toBe('string');
    expect(result.message.length).toBeGreaterThan(0);
  });

  it('should include a confidence level', async () => {
    const result = await predictOptimalReminderTime('user_test');
    expect(['low', 'medium', 'high']).toContain(result.confidence);
  });
});
