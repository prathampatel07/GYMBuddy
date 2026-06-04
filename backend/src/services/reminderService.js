/**
 * Smart Reminder Service — GymBuddy
 * ─────────────────────────────────────────────────────────────────────────
 * Intelligent engagement nudge system that determines WHAT to remind the
 * user of and WHEN, based on their behavioural patterns and streak status.
 *
 * Nudge Categories (in priority order):
 *  1. URGENT  — streak about to break (< 4h window)
 *  2. HIGH    — no workout in 23+ hours with active streak
 *  3. MEDIUM  — partner submitted proof needing verification
 *  4. MEDIUM  — consistent rest day but partner is active
 *  5. LOW     — coin reward milestone reachable (next workout)
 *  6. LOW     — weekly summary available on Monday
 *  7. INFO    — new partner request received
 *  8. INFO    — workout plan recommendation refreshed
 *
 * Optimal Reminder Time Predictor:
 *  - Analyses user's past workout timestamps to predict their peak time
 *  - Returns a recommended reminder delivery window
 *
 * Future ML Hooks:
 *  - predictOptimalSendTime() — model-based send-time optimisation
 *  - nudgeEffectivenessScore() — A/B test tracking + conversion tracking
 */

import { churnRisk, behaviouralCluster } from './aiMatchingService.js';
import { isMockMode } from '../config/db.js';
import { db } from '../config/mockDb.js';

const NUDGE_PRIORITY = { urgent: 5, high: 4, medium: 3, low: 2, info: 1 };

// ── Main Nudge Generator ──────────────────────────────────────────────────
/**
 * Generates a prioritised list of smart engagement nudges for the user.
 * Each nudge includes a type, message, CTA, and optional urgency window.
 */
export async function generateNudges(user, partnerInfo = null, pendingProofs = []) {
  const userId    = String(user._id || user.id);
  const streak    = user.streakCount    || 0;
  const coins     = user.coins          || 0;
  const workouts  = user.totalWorkouts  || 0;
  const risk      = churnRisk(user);
  const persona   = behaviouralCluster(user);
  const nudges    = [];

  // ── Nudge 1: URGENT — Streak at risk (> 22h gap) ──────────────────────
  if (risk === 'high' && streak > 0) {
    const lastWorkout = user.lastWorkoutDate ? new Date(user.lastWorkoutDate) : null;
    const hoursGone   = lastWorkout ? Math.round((Date.now() - lastWorkout.getTime()) / 36e5) : 99;
    nudges.push({
      id:       'streak_risk_urgent',
      priority: NUDGE_PRIORITY.urgent,
      type:     'urgent',
      icon:     '🔥',
      title:    `${streak}-Day Streak Ending Soon!`,
      message:  `You haven't logged a workout in ${hoursGone} hours. Log your proof before midnight to keep your streak alive!`,
      cta:      { label: 'Verify Streak Now', path: '/streaks' },
      urgencyHours: Math.max(0, 24 - (hoursGone % 24)),
      dismissible: false,
    });
  }

  // ── Nudge 2: HIGH — Missed workout window ──────────────────────────────
  if (risk === 'medium' && streak > 0) {
    nudges.push({
      id:       'missed_workout',
      priority: NUDGE_PRIORITY.high,
      type:     'high',
      icon:     '⏰',
      title:    'Time for Today\'s Workout?',
      message:  `It's been over 20 hours since your last session. A quick workout keeps your ${streak}-day streak intact. Even 20 minutes counts!`,
      cta:      { label: 'Log Workout', path: '/workouts' },
      dismissible: true,
    });
  }

  // ── Nudge 3: MEDIUM — Pending partner proof ────────────────────────────
  if (pendingProofs.length > 0) {
    const oldest = pendingProofs[0];
    nudges.push({
      id:       'pending_verification',
      priority: NUDGE_PRIORITY.medium,
      type:     'medium',
      icon:     '🤝',
      title:    `${partnerInfo?.username || 'Your Buddy'} needs you!`,
      message:  `Your partner submitted workout proof${pendingProofs.length > 1 ? ` (${pendingProofs.length} pending)` : ''} and is waiting for your verification. Both of you earn coins when you confirm!`,
      cta:      { label: 'Verify Now (+20 Coins)', path: '/streaks' },
      dismissible: true,
    });
  }

  // ── Nudge 4: MEDIUM — Partner more active ─────────────────────────────
  if (partnerInfo && (partnerInfo.streakCount || 0) > streak + 2) {
    nudges.push({
      id:       'partner_ahead',
      priority: NUDGE_PRIORITY.medium,
      type:     'social',
      icon:     '🏆',
      title:    `${partnerInfo.username} is ${(partnerInfo.streakCount || 0) - streak} days ahead!`,
      message:  `Your Gym Buddy has a ${partnerInfo.streakCount}-day streak. Show up today and close the gap — accountability works both ways!`,
      cta:      { label: 'Log Workout', path: '/workouts' },
      dismissible: true,
    });
  }

  // ── Nudge 5: LOW — Coin reward milestone ──────────────────────────────
  const COIN_THRESHOLDS = [150, 250, 300, 400, 500, 600, 800, 1200];
  const nextThreshold = COIN_THRESHOLDS.find(t => t > coins);
  if (nextThreshold) {
    const needed = nextThreshold - coins;
    const sessionsNeeded = Math.ceil(needed / 15);
    if (sessionsNeeded <= 5) {
      nudges.push({
        id:       'coin_milestone',
        priority: NUDGE_PRIORITY.low,
        type:     'reward',
        icon:     '🪙',
        title:    `${needed} coins from a reward!`,
        message:  `Just ${sessionsNeeded} more workout${sessionsNeeded > 1 ? 's' : ''} and you can redeem your next reward. You have ${coins} coins.`,
        cta:      { label: 'View Marketplace', path: '/rewards' },
        dismissible: true,
      });
    }
  }

  // ── Nudge 6: LOW — Weekly summary on Monday ───────────────────────────
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 1) { // Monday
    nudges.push({
      id:       'weekly_summary',
      priority: NUDGE_PRIORITY.low,
      type:     'info',
      icon:     '📊',
      title:    'Weekly Summary Ready!',
      message:  'Your fitness report for last week is ready. Review your progress, calories burned, and plan this week\'s sessions.',
      cta:      { label: 'View Dashboard', path: '/' },
      dismissible: true,
    });
  }

  // ── Nudge 7: INFO — No partner yet ────────────────────────────────────
  if (!partnerInfo && workouts >= 3) {
    nudges.push({
      id:       'find_partner',
      priority: NUDGE_PRIORITY.info,
      type:     'info',
      icon:     '👥',
      title:    'Accountability = Better Results',
      message:  'Users with a Gym Buddy maintain 73% higher streak consistency. Find your perfect match today!',
      cta:      { label: 'Find Partner', path: '/partners' },
      dismissible: true,
    });
  }

  // ── Nudge 8: INFO — New user guidance ────────────────────────────────
  if (workouts === 0) {
    nudges.push({
      id:       'first_workout',
      priority: NUDGE_PRIORITY.high,
      type:     'info',
      icon:     '🏋️',
      title:    'Log Your First Workout!',
      message:  'Earn 15 Fitness Coins and start your streak. It only takes 2 minutes to log a session.',
      cta:      { label: 'Log Workout (+15 Coins)', path: '/workouts' },
      dismissible: false,
    });
  }

  // Sort by priority (desc) and return
  nudges.sort((a, b) => b.priority - a.priority);

  return {
    nudges,
    count: nudges.length,
    urgentCount: nudges.filter(n => n.type === 'urgent').length,
    persona,
    churnRisk: risk,
    generatedAt: new Date().toISOString(),
  };
}

// ── Optimal Send-Time Predictor ───────────────────────────────────────────
/**
 * Analyses user's past workout timestamps to determine their peak activity window.
 * Returns a recommended reminder time (hour of day, 0–23).
 *
 * Future ML Hook:
 *  In production: train a Gaussian mixture model on {dayOfWeek, hourOfDay, didWorkout}
 *  to predict P(workout | send_reminder_at_hour_X).
 */
export async function predictOptimalReminderTime(userId) {
  let workouts = [];

  if (isMockMode) {
    workouts = await db.workouts.find({ userId: String(userId) });
  } else {
    const { Workout } = await import('../models/Workout.js');
    workouts = await Workout.find({ userId });
  }

  if (workouts.length < 3) {
    // Insufficient data — return schedule-based default
    return { recommendedHour: 8, confidence: 'low', basis: 'default', message: 'Morning reminder (insufficient history)' };
  }

  // Analyse workout timestamps by hour
  const hourCounts = {};
  workouts.forEach(w => {
    const h = new Date(w.createdAt || w.date).getHours();
    hourCounts[h] = (hourCounts[h] || 0) + 1;
  });

  // Find peak hour
  const peakHour = parseInt(
    Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '8'
  );

  // Send reminder 1 hour before peak (prep time)
  const reminderHour = Math.max(6, peakHour - 1);

  // Day-of-week preference
  const dayCounts = {};
  workouts.forEach(w => {
    const d = new Date(w.date || w.createdAt).getDay();
    dayCounts[d] = (dayCounts[d] || 0) + 1;
  });
  const peakDays = Object.entries(dayCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][parseInt(d)];
  });

  const confidence = workouts.length >= 20 ? 'high' : workouts.length >= 10 ? 'medium' : 'low';

  return {
    recommendedHour: reminderHour,
    peakWorkoutHour: peakHour,
    peakDays,
    confidence,
    basis:   'historical_analysis',
    message: `Optimal reminder time: ${formatHour(reminderHour)} (${confidence} confidence based on ${workouts.length} sessions)`,
    hourDistribution: hourCounts,
  };
}

// ── Engagement Score ──────────────────────────────────────────────────────
/**
 * Calculates a user engagement health score (0–100).
 * Used to prioritise high-risk users for intervention nudges.
 * Future: feed this into a churn prediction model.
 */
export function calculateEngagementScore(user) {
  let score = 0;

  // Recency (40 pts) — when did they last work out?
  const risk = churnRisk(user);
  if (risk === 'low')    score += 40;
  if (risk === 'medium') score += 20;
  if (risk === 'high')   score += 5;

  // Streak momentum (30 pts)
  const streak = user.streakCount || 0;
  if (streak >= 30) score += 30;
  else if (streak >= 14) score += 22;
  else if (streak >= 7)  score += 15;
  else if (streak >= 3)  score += 8;
  else if (streak >= 1)  score += 3;

  // Volume (20 pts)
  const workouts = user.totalWorkouts || 0;
  if (workouts >= 100) score += 20;
  else if (workouts >= 50) score += 15;
  else if (workouts >= 20) score += 10;
  else if (workouts >= 5)  score += 5;

  // Social (10 pts)
  if (user.partnerId) score += 10;

  return {
    score: Math.min(100, score),
    label: score >= 80 ? 'Highly Engaged' : score >= 60 ? 'Active' : score >= 40 ? 'At Risk' : 'Inactive',
    risk: risk,
    breakdown: { recency: risk === 'low' ? 40 : risk === 'medium' ? 20 : 5, streak: Math.min(30, streak * 0.8), volume: Math.min(20, workouts * 0.2), social: user.partnerId ? 10 : 0 },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────
function formatHour(h) {
  if (h === 0) return '12:00 AM';
  if (h < 12)  return `${h}:00 AM`;
  if (h === 12) return '12:00 PM';
  return `${h - 12}:00 PM`;
}
