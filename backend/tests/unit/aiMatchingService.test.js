/**
 * Unit Tests — AI Matching Service
 * Tests the 5-pillar compatibility scoring algorithm in isolation.
 */
import { describe, it, expect, beforeAll } from '@jest/globals';
import {
  calculateCompatibility,
  rankCandidates,
  behaviouralCluster,
  churnRisk,
  predictedRetentionScore,
} from '../../src/services/aiMatchingService.js';

// ── Fixtures ───────────────────────────────────────────────────────────────
const BASE_USER = {
  fitnessGoals:  ['Strength', 'Cardio'],
  schedule:      ['Morning'],
  fitnessLevel:  'Intermediate',
  location:      'Mumbai',
  streakCount:   10,
  totalWorkouts: 40,
  lastWorkoutDate: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12h ago
};

const PERFECT_MATCH = {
  fitnessGoals:  ['Strength', 'Cardio'],
  schedule:      ['Morning'],
  fitnessLevel:  'Intermediate',
  location:      'Mumbai',
  streakCount:   12,
  totalWorkouts: 45,
  lastWorkoutDate: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
};

const POOR_MATCH = {
  fitnessGoals:  ['Flexibility'],
  schedule:      ['Weekends'],
  fitnessLevel:  'Advanced',
  location:      'Chennai',
  streakCount:   0,
  totalWorkouts: 0,
  lastWorkoutDate: null,
};

const PARTIAL_MATCH = {
  fitnessGoals:  ['Strength', 'Weight Loss'],
  schedule:      ['Morning', 'Evening'],
  fitnessLevel:  'Beginner',
  location:      'Mumbai Central',
  streakCount:   3,
  totalWorkouts: 12,
  lastWorkoutDate: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
};

// ── Tests ──────────────────────────────────────────────────────────────────
describe('calculateCompatibility()', () => {
  it('should return total score between 0 and 100', () => {
    const result = calculateCompatibility(BASE_USER, PERFECT_MATCH);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it('should score a perfect match very high (≥80)', () => {
    const result = calculateCompatibility(BASE_USER, PERFECT_MATCH);
    expect(result.total).toBeGreaterThanOrEqual(80);
  });

  it('should score a poor match low (≤40)', () => {
    const result = calculateCompatibility(BASE_USER, POOR_MATCH);
    expect(result.total).toBeLessThanOrEqual(40);
  });

  it('should return a breakdown object with all 5 pillars', () => {
    const result = calculateCompatibility(BASE_USER, PARTIAL_MATCH);
    expect(result.breakdown).toHaveProperty('goals');
    expect(result.breakdown).toHaveProperty('schedule');
    expect(result.breakdown).toHaveProperty('level');
    expect(result.breakdown).toHaveProperty('activity');
    expect(result.breakdown).toHaveProperty('location');
  });

  it('should return a non-empty label string', () => {
    const result = calculateCompatibility(BASE_USER, PERFECT_MATCH);
    expect(typeof result.label).toBe('string');
    expect(result.label.length).toBeGreaterThan(0);
  });

  it('should identify shared goals correctly', () => {
    const result = calculateCompatibility(BASE_USER, PERFECT_MATCH);
    expect(result.sharedGoals).toContain('Strength');
    expect(result.sharedGoals).toContain('Cardio');
  });

  it('should give partial score for partial location match (same city first word)', () => {
    const r1 = calculateCompatibility(BASE_USER, { ...PERFECT_MATCH, location: 'Mumbai Andheri' });
    const r2 = calculateCompatibility(BASE_USER, { ...PERFECT_MATCH, location: 'Pune' });
    expect(r1.breakdown.location).toBeGreaterThan(r2.breakdown.location);
  });

  it('should give 0 schedule score when schedules are completely different', () => {
    const result = calculateCompatibility(
      { ...BASE_USER, schedule: ['Morning'] },
      { ...PERFECT_MATCH, schedule: ['Weekends'] }
    );
    expect(result.breakdown.schedule).toBe(0);
  });

  it('should apply consistency bonus when both users have streak ≥ 7', () => {
    // Use partial-match pairs so scores stay below 100 cap and bonus is visible
    const highStreak1 = { ...PARTIAL_MATCH, streakCount: 10, lastWorkoutDate: new Date().toISOString() };
    const highStreak2 = { ...PARTIAL_MATCH, streakCount: 15, lastWorkoutDate: new Date().toISOString() };
    const lowStreak1  = { ...PARTIAL_MATCH, streakCount: 2,  lastWorkoutDate: new Date(Date.now() - 60*60*1000*30).toISOString() };
    const lowStreak2  = { ...PARTIAL_MATCH, streakCount: 2,  lastWorkoutDate: new Date(Date.now() - 60*60*1000*30).toISOString() };
    const withBonus    = calculateCompatibility(highStreak1, highStreak2).total;
    const withoutBonus = calculateCompatibility(lowStreak1, lowStreak2).total;
    expect(withBonus).toBeGreaterThanOrEqual(withoutBonus);
  });

  it('should handle missing data gracefully (no crash)', () => {
    expect(() => calculateCompatibility({}, {})).not.toThrow();
    expect(() => calculateCompatibility(BASE_USER, {})).not.toThrow();
  });

  it('perfect score should not exceed 100', () => {
    const r = calculateCompatibility(PERFECT_MATCH, PERFECT_MATCH);
    expect(r.total).toBeLessThanOrEqual(100);
  });
});

describe('rankCandidates()', () => {
  const candidates = [PERFECT_MATCH, POOR_MATCH, PARTIAL_MATCH];

  it('should return an array sorted by descending score', () => {
    const ranked = rankCandidates(BASE_USER, candidates);
    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i].total).toBeGreaterThanOrEqual(ranked[i + 1].total);
    }
  });

  it('should filter out candidates below minScore', () => {
    const ranked = rankCandidates(BASE_USER, candidates, { minScore: 70 });
    ranked.forEach(r => expect(r.total).toBeGreaterThanOrEqual(70));
  });

  it('should respect maxResults limit', () => {
    const ranked = rankCandidates(BASE_USER, candidates, { maxResults: 1 });
    expect(ranked.length).toBeLessThanOrEqual(1);
  });

  it('should apply goal boost when boostGoals is provided', () => {
    const baseRank  = rankCandidates(BASE_USER, [PARTIAL_MATCH])[0]?.total ?? 0;
    const boostedRank = rankCandidates(BASE_USER, [PARTIAL_MATCH], { boostGoals: ['Strength'] })[0]?.total ?? 0;
    expect(boostedRank).toBeGreaterThanOrEqual(baseRank);
  });
});

describe('behaviouralCluster()', () => {
  it('should return "Dedicated Athlete" for high-streak, high-workout users', () => {
    expect(behaviouralCluster({ streakCount: 35, totalWorkouts: 120, fitnessGoals: ['Strength'] })).toBe('Dedicated Athlete');
  });

  it('should return "Just Starting" for new users with no activity', () => {
    expect(behaviouralCluster({ streakCount: 0, totalWorkouts: 0, fitnessGoals: [] })).toBe('Just Starting');
  });

  it('should return "Cardio Enthusiast" for users with cardio goals', () => {
    const cluster = behaviouralCluster({ streakCount: 5, totalWorkouts: 10, fitnessGoals: ['Cardio'] });
    expect(cluster).toBe('Cardio Enthusiast');
  });

  it('should always return a non-empty string', () => {
    expect(typeof behaviouralCluster({})).toBe('string');
    expect(behaviouralCluster({}).length).toBeGreaterThan(0);
  });
});

describe('churnRisk()', () => {
  it('should return "high" when lastWorkoutDate is more than 48h ago', () => {
    const user = { lastWorkoutDate: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString() };
    expect(churnRisk(user)).toBe('high');
  });

  it('should return "medium" when lastWorkoutDate is 25-48h ago', () => {
    const user = { lastWorkoutDate: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString() };
    expect(churnRisk(user)).toBe('medium');
  });

  it('should return "low" when lastWorkoutDate is within 24h', () => {
    const user = { lastWorkoutDate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() };
    expect(churnRisk(user)).toBe('low');
  });

  it('should return "high" when lastWorkoutDate is null/missing', () => {
    expect(churnRisk({ lastWorkoutDate: null })).toBe('high');
    expect(churnRisk({})).toBe('high');
  });
});

describe('predictedRetentionScore()', () => {
  it('should return a number between 0 and 100', () => {
    const score = predictedRetentionScore(BASE_USER, PERFECT_MATCH, 85);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('should return higher retention for better compatibility scores', () => {
    const high = predictedRetentionScore(BASE_USER, PERFECT_MATCH, 90);
    const low  = predictedRetentionScore(BASE_USER, POOR_MATCH, 20);
    expect(high).toBeGreaterThan(low);
  });
});
