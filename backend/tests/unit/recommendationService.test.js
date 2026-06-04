/**
 * Unit Tests — Recommendation Service
 * Tests workout plan generation, motivation messages, and exercise variety analysis.
 */
import { describe, it, expect } from '@jest/globals';
import {
  generateWorkoutPlan,
  generateMotivationMessage,
  analyseExerciseVariety,
} from '../../src/services/recommendationService.js';

// ── Fixtures ───────────────────────────────────────────────────────────────
const BEGINNER_USER = {
  username: 'test_user',
  fitnessLevel: 'Beginner',
  fitnessGoals: ['Strength'],
  schedule: ['Morning'],
  weight: 70,
  streakCount: 0,
  totalWorkouts: 0,
  coins: 50,
  lastWorkoutDate: null,
};

const INTERMEDIATE_USER = {
  username: 'mid_user',
  fitnessLevel: 'Intermediate',
  fitnessGoals: ['Cardio', 'Weight Loss'],
  schedule: ['Evening'],
  weight: 75,
  streakCount: 14,
  totalWorkouts: 30,
  coins: 400,
  lastWorkoutDate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
};

const ADVANCED_USER = {
  username: 'adv_user',
  fitnessLevel: 'Advanced',
  fitnessGoals: ['Strength', 'Endurance'],
  schedule: ['Morning', 'Evening'],
  weight: 80,
  streakCount: 35,
  totalWorkouts: 120,
  coins: 1500,
  lastWorkoutDate: new Date().toISOString(),
};

// ── Workout Plan Tests ──────────────────────────────────────────────────────
describe('generateWorkoutPlan()', () => {
  it('should return a plan with the correct planName format', async () => {
    const plan = await generateWorkoutPlan(BEGINNER_USER);
    expect(plan.planName).toContain('Beginner');
    expect(plan.planName).toContain('Strength');
  });

  it('should assign 3 days/week to beginners', async () => {
    const plan = await generateWorkoutPlan(BEGINNER_USER);
    expect(plan.daysPerWeek).toBe(3);
  });

  it('should assign 4 days/week to intermediates', async () => {
    const plan = await generateWorkoutPlan(INTERMEDIATE_USER);
    expect(plan.daysPerWeek).toBe(4);
  });

  it('should assign 5 days/week to advanced users', async () => {
    const plan = await generateWorkoutPlan(ADVANCED_USER);
    expect(plan.daysPerWeek).toBe(5);
  });

  it('should return exactly 7 days in weekPlan', async () => {
    const plan = await generateWorkoutPlan(BEGINNER_USER);
    expect(plan.weekPlan).toHaveLength(7);
  });

  it('should include rest days in weekPlan', async () => {
    const plan = await generateWorkoutPlan(BEGINNER_USER);
    const restDays = plan.weekPlan.filter(d => d.type === 'Rest');
    expect(restDays.length).toBeGreaterThan(0);
  });

  it('training days should have exercises array', async () => {
    const plan = await generateWorkoutPlan(BEGINNER_USER);
    const trainingDays = plan.weekPlan.filter(d => d.type !== 'Rest');
    trainingDays.forEach(day => {
      expect(Array.isArray(day.exercises)).toBe(true);
      expect(day.exercises.length).toBeGreaterThan(0);
    });
  });

  it('should include warmup and cooldown in training sessions', async () => {
    const plan = await generateWorkoutPlan(BEGINNER_USER);
    const trainingDay = plan.weekPlan.find(d => d.type !== 'Rest');
    expect(trainingDay.exercises.some(e => e.isWarmup)).toBe(true);
    expect(trainingDay.exercises.some(e => e.isCooldown)).toBe(true);
  });

  it('should return estimated duration > 0 for training days', async () => {
    const plan = await generateWorkoutPlan(BEGINNER_USER);
    const training = plan.weekPlan.find(d => d.type !== 'Rest');
    expect(training.estimatedDuration).toBeGreaterThan(0);
  });

  it('should return estimated calories > 0 for training days', async () => {
    const plan = await generateWorkoutPlan(BEGINNER_USER);
    const training = plan.weekPlan.find(d => d.type !== 'Rest');
    expect(training.estimatedCalories).toBeGreaterThan(0);
  });

  it('should include a progressionNote', async () => {
    const plan = await generateWorkoutPlan(BEGINNER_USER);
    expect(typeof plan.progressionNote).toBe('string');
    expect(plan.progressionNote.length).toBeGreaterThan(0);
  });

  it('should include a nextReviewDate in YYYY-MM-DD format', async () => {
    const plan = await generateWorkoutPlan(BEGINNER_USER);
    expect(plan.nextReviewDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should set nextReviewDate further for high-streak users', async () => {
    const beginnerPlan  = await generateWorkoutPlan(BEGINNER_USER);   // streak=0 → 7d
    const advancedPlan  = await generateWorkoutPlan(ADVANCED_USER);   // streak=35 → 14d
    const beginnerDate  = new Date(beginnerPlan.nextReviewDate);
    const advancedDate  = new Date(advancedPlan.nextReviewDate);
    expect(advancedDate.getTime()).toBeGreaterThan(beginnerDate.getTime());
  });
});

// ── Motivation Message Tests ────────────────────────────────────────────────
describe('generateMotivationMessage()', () => {
  it('should always return at least 1 message', async () => {
    const result = await generateMotivationMessage(BEGINNER_USER);
    expect(result.messages.length).toBeGreaterThanOrEqual(1);
  });

  it('should return messages capped at 3', async () => {
    const result = await generateMotivationMessage(INTERMEDIATE_USER);
    expect(result.messages.length).toBeLessThanOrEqual(3);
  });

  it('should include a primaryMessage', async () => {
    const result = await generateMotivationMessage(BEGINNER_USER);
    expect(result.primaryMessage).toBeDefined();
    expect(result.primaryMessage.title).toBeTruthy();
    expect(result.primaryMessage.body).toBeTruthy();
  });

  it('should include churnRisk field', async () => {
    const result = await generateMotivationMessage(BEGINNER_USER);
    expect(['low', 'medium', 'high']).toContain(result.churnRisk);
  });

  it('should include persona field', async () => {
    const result = await generateMotivationMessage(BEGINNER_USER);
    expect(typeof result.persona).toBe('string');
    expect(result.persona.length).toBeGreaterThan(0);
  });

  it('should trigger milestone message for 7-day streak', async () => {
    const user7 = { ...INTERMEDIATE_USER, streakCount: 7 };
    const result = await generateMotivationMessage(user7);
    const hasMilestone = result.messages.some(m => m.type === 'milestone');
    expect(hasMilestone).toBe(true);
  });

  it('should trigger alert message when churn risk is high and streak > 0', async () => {
    const highRiskUser = {
      ...INTERMEDIATE_USER,
      streakCount: 10,
      lastWorkoutDate: new Date(Date.now() - 55 * 60 * 60 * 1000).toISOString(), // 55h ago
    };
    const result = await generateMotivationMessage(highRiskUser);
    const hasAlert = result.messages.some(m => m.type === 'alert');
    expect(hasAlert).toBe(true);
  });

  it('should trigger social message when partner has higher streak', async () => {
    const partnerAhead = { username: 'buddy', streakCount: 20 };
    const user = { ...INTERMEDIATE_USER, streakCount: 14 };
    const result = await generateMotivationMessage(user, partnerAhead);
    const hasSocial = result.messages.some(m => m.type === 'social');
    expect(hasSocial).toBe(true);
  });

  it('should trigger reward nudge when coins >= 200', async () => {
    const result = await generateMotivationMessage({ ...INTERMEDIATE_USER, coins: 250 });
    const hasReward = result.messages.some(m => m.type === 'reward');
    expect(hasReward).toBe(true);
  });

  it('all messages should have icon, title, and body', async () => {
    const result = await generateMotivationMessage(ADVANCED_USER);
    result.messages.forEach(msg => {
      expect(msg.icon).toBeTruthy();
      expect(msg.title).toBeTruthy();
      expect(msg.body).toBeTruthy();
    });
  });
});
