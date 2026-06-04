/**
 * AI Matching Service — GymBuddy
 * ─────────────────────────────────────────────────────────────────────────
 * Multi-dimensional compatibility scoring engine with a 5-pillar framework.
 * Each pillar is independently scored and weighted, producing a 0–100 total.
 *
 * Scoring Pillars & Weights:
 *  1. Goals Alignment      30 pts  — shared fitness goals overlap ratio
 *  2. Schedule Sync        25 pts  — preferred workout time overlap + penalty for zero
 *  3. Experience Balance   20 pts  — same level or productive challenge (±1)
 *  4. Activity Momentum    15 pts  — streak count, recent workout consistency
 *  5. Location Proximity   10 pts  — exact / partial city / none
 *
 * Bonus Modifiers (additive, capped at 100):
 *  +3   Both streak > 7 days (consistency bonus)
 *  +2   Both logged workout in past 48h (active bonus)
 *  −5   Level mismatch > 1 (e.g. Beginner ↔ Advanced — challenge penalty)
 *
 * Future ML Hooks:
 *  - predictedRetentionScore()  — based on historical matched-pair behaviour
 *  - behaviouralCluster()       — DBSCAN-style persona grouping
 *  - churnRisk()                — streak prediction model placeholder
 */

// ── Constants ─────────────────────────────────────────────────────────────
const WEIGHTS = {
  goals:    30,
  schedule: 25,
  level:    20,
  activity: 15,
  location: 10,
};

const LEVEL_ORDER = ['Beginner', 'Intermediate', 'Advanced'];

// ── Pillar 1: Goals Alignment ─────────────────────────────────────────────
/**
 * Calculates how well two users' fitness goals align.
 * Uses Jaccard similarity: |intersection| / |union|
 * Bonus points if both users have highly specialised goals (fewer, focused).
 */
function scoreGoals(u1, u2) {
  const g1 = new Set(u1.fitnessGoals || []);
  const g2 = new Set(u2.fitnessGoals || []);

  if (g1.size === 0 || g2.size === 0) return WEIGHTS.goals * 0.3; // partial score if data missing

  const intersection = [...g1].filter(g => g2.has(g));
  const union = new Set([...g1, ...g2]);
  const jaccard = intersection.length / union.size;

  // Bonus: if both have the same primary goal (first item) — alignment signal
  const primaryMatch = [...g1][0] === [...g2][0] ? 0.1 : 0;

  return Math.round(WEIGHTS.goals * Math.min(1, jaccard + primaryMatch));
}

// ── Pillar 2: Schedule Sync ───────────────────────────────────────────────
/**
 * Scores workout time compatibility.
 * Partial overlap is rewarded; complete mismatch applies a penalty.
 * Weekend-only overlaps get a slight bonus (underserved niche).
 */
function scoreSchedule(u1, u2) {
  const s1 = u1.schedule || [];
  const s2 = u2.schedule || [];

  if (s1.length === 0 || s2.length === 0) return WEIGHTS.schedule * 0.4;

  const shared = s1.filter(s => s2.includes(s));
  if (shared.length === 0) return 0; // complete mismatch — dealbreaker

  const overlapRatio = shared.length / Math.max(s1.length, s2.length);
  let pts = Math.round(WEIGHTS.schedule * overlapRatio);

  // Bonus for weekend-only overlap (rarer, so more meaningful)
  if (shared.includes('Weekends') && shared.length === 1) pts = Math.max(pts, WEIGHTS.schedule * 0.5);

  return pts;
}

// ── Pillar 3: Experience Balance ──────────────────────────────────────────
/**
 * Exact level match = full score.
 * Adjacent match (e.g. Beginner + Intermediate) = 60% — productive challenge.
 * Large gap (Beginner + Advanced) = 15% — usually not beneficial.
 *
 * Exception: Advanced users matching Beginners can get a "mentor bonus"
 * if the Advanced user's streak is very high (they're a good role model).
 */
function scoreLevel(u1, u2) {
  const l1 = LEVEL_ORDER.indexOf(u1.fitnessLevel || 'Beginner');
  const l2 = LEVEL_ORDER.indexOf(u2.fitnessLevel || 'Beginner');
  const diff = Math.abs(l1 - l2);

  if (diff === 0) return WEIGHTS.level;                          // exact match
  if (diff === 1) return Math.round(WEIGHTS.level * 0.6);       // adjacent
  
  // Large gap — mentor scenario bonus
  const higherStreak = Math.max(u1.streakCount || 0, u2.streakCount || 0);
  if (diff === 2 && higherStreak >= 30) return Math.round(WEIGHTS.level * 0.35); // experienced mentor
  return Math.round(WEIGHTS.level * 0.15);                      // large mismatch
}

// ── Pillar 4: Activity Momentum ───────────────────────────────────────────
/**
 * Scores consistency based on streak + recent workout frequency.
 * Two low-streak users can still match well if they're both just starting.
 * Penalises pairings where one user has 0 activity (likely inactive).
 */
function scoreActivity(u1, u2) {
  const s1 = u1.streakCount || 0;
  const s2 = u2.streakCount || 0;
  const w1 = u1.totalWorkouts || 0;
  const w2 = u2.totalWorkouts || 0;

  // Inactive users (both 0) — still allow matching but low score
  if (s1 === 0 && s2 === 0 && w1 === 0 && w2 === 0) return Math.round(WEIGHTS.activity * 0.3);

  // One completely inactive — penalise
  if ((s1 === 0 && w1 === 0) || (s2 === 0 && w2 === 0)) return Math.round(WEIGHTS.activity * 0.2);

  // Streak similarity score (closer streaks = better accountability pair)
  const streakMax = Math.max(s1, s2, 1);
  const streakMin = Math.min(s1, s2);
  const streakSimilarity = streakMin / streakMax; // 1.0 = identical, 0 = one has 0

  // Workout count similarity (both active recently)
  const workoutMax = Math.max(w1, w2, 1);
  const workoutMin = Math.min(w1, w2);
  const workoutSimilarity = Math.min(workoutMin / workoutMax, 1);

  const combined = (streakSimilarity * 0.6) + (workoutSimilarity * 0.4);
  return Math.round(WEIGHTS.activity * combined);
}

// ── Pillar 5: Location Proximity ──────────────────────────────────────────
/**
 * Exact city match = full score.
 * Partial (same first word / state) = half score.
 * Different = 0 (but doesn't block matching).
 */
function scoreLocation(u1, u2) {
  const loc1 = (u1.location || '').trim().toLowerCase();
  const loc2 = (u2.location || '').trim().toLowerCase();

  if (!loc1 || !loc2) return Math.round(WEIGHTS.location * 0.3); // missing data partial
  if (loc1 === loc2) return WEIGHTS.location;

  // Partial match — first word (e.g. "Mumbai Andheri" vs "Mumbai Bandra")
  const word1 = loc1.split(/[\s,]+/)[0];
  const word2 = loc2.split(/[\s,]+/)[0];
  if (word1 === word2) return Math.round(WEIGHTS.location * 0.5);

  return 0;
}

// ── Bonus Modifiers ───────────────────────────────────────────────────────
function applyBonuses(baseScore, u1, u2) {
  let score = baseScore;

  // Consistency bonus: both have streak > 7 days
  if ((u1.streakCount || 0) >= 7 && (u2.streakCount || 0) >= 7) score += 3;

  // Recent activity bonus: both logged workout in past 48h
  const cutoff = new Date(); cutoff.setHours(cutoff.getHours() - 48);
  const u1Active = u1.lastWorkoutDate && new Date(u1.lastWorkoutDate) >= cutoff;
  const u2Active = u2.lastWorkoutDate && new Date(u2.lastWorkoutDate) >= cutoff;
  if (u1Active && u2Active) score += 2;

  // Large level mismatch penalty (already partially handled in scoreLevel, belt-and-braces)
  const l1 = LEVEL_ORDER.indexOf(u1.fitnessLevel || 'Beginner');
  const l2 = LEVEL_ORDER.indexOf(u2.fitnessLevel || 'Beginner');
  if (Math.abs(l1 - l2) > 1) score -= 5;

  return Math.min(100, Math.max(0, score));
}

// ── Main Scoring Function ─────────────────────────────────────────────────
/**
 * Calculates a comprehensive compatibility score between two users.
 * @returns {{ total: number, breakdown: object, label: string }}
 */
export function calculateCompatibility(u1, u2) {
  const goals    = scoreGoals(u1, u2);
  const schedule = scoreSchedule(u1, u2);
  const level    = scoreLevel(u1, u2);
  const activity = scoreActivity(u1, u2);
  const location = scoreLocation(u1, u2);

  const base  = goals + schedule + level + activity + location;
  const total = applyBonuses(base, u1, u2);

  const label = total >= 85 ? 'Excellent Match' :
                total >= 70 ? 'Great Match' :
                total >= 55 ? 'Good Match' :
                total >= 40 ? 'Fair Match' :
                              'Low Match';

  return {
    total,
    breakdown: { goals, schedule, level, activity, location },
    label,
    sharedGoals:    (u1.fitnessGoals || []).filter(g => (u2.fitnessGoals || []).includes(g)),
    sharedSchedule: (u1.schedule     || []).filter(s => (u2.schedule     || []).includes(s)),
  };
}

// ── Batch Ranking ─────────────────────────────────────────────────────────
/**
 * Scores and ranks a list of candidates against the current user.
 * Filters out candidates with score below the minimum threshold.
 * @param {object} currentUser
 * @param {object[]} candidates
 * @param {object} options
 */
export function rankCandidates(currentUser, candidates, options = {}) {
  const {
    minScore    = 20,   // exclude very poor matches
    maxResults  = 20,   // cap recommendations
    boostGoals  = null, // optionally boost a specific goal
  } = options;

  return candidates
    .map(candidate => {
      const result = calculateCompatibility(currentUser, candidate);
      // Optional goal boost — useful for targeted search
      if (boostGoals && result.sharedGoals.some(g => boostGoals.includes(g))) {
        result.total = Math.min(100, result.total + 5);
      }
      return { candidate, ...result };
    })
    .filter(r => r.total >= minScore)
    .sort((a, b) => b.total - a.total || (b.candidate.streakCount || 0) - (a.candidate.streakCount || 0))
    .slice(0, maxResults);
}

// ── Future ML Placeholders ────────────────────────────────────────────────
/**
 * PLACEHOLDER: Predicted partnership retention probability.
 * In future: feed matched-pair historical data into a logistic regression /
 * gradient-boosted tree to predict 30-day retention likelihood.
 * @returns {number} 0–100 retention probability
 */
export function predictedRetentionScore(u1, u2, compatibilityScore) {
  // Heuristic proxy until real ML model is available
  const baseRetention = compatibilityScore * 0.7;
  const streakBoost   = Math.min(20, ((u1.streakCount || 0) + (u2.streakCount || 0)) / 2);
  const levelBonus    = u1.fitnessLevel === u2.fitnessLevel ? 10 : 5;
  return Math.min(100, Math.round(baseRetention + streakBoost + levelBonus));
}

/**
 * PLACEHOLDER: Behavioural Cluster Assignment.
 * In future: DBSCAN or k-means on [streak, goals, schedule, workouts/week]
 * Returns a persona string for filtering / persona-based recommendations.
 */
export function behaviouralCluster(user) {
  const streak   = user.streakCount || 0;
  const workouts = user.totalWorkouts || 0;
  const goals    = user.fitnessGoals || [];

  if (streak >= 30 && workouts >= 100) return 'Dedicated Athlete';
  if (streak >= 14 && goals.includes('Strength')) return 'Strength Seeker';
  if (goals.includes('Cardio') || goals.includes('Endurance')) return 'Cardio Enthusiast';
  if (streak === 0 && workouts < 5) return 'Just Starting';
  if (workouts >= 20 && streak < 7) return 'Inconsistent — Needs Accountability';
  return 'General Fitness';
}

/**
 * PLACEHOLDER: Streak Churn Risk Predictor.
 * In future: LSTM / time-series model on historical workout gap patterns.
 * Returns risk level to drive smart reminder urgency.
 */
export function churnRisk(user) {
  const lastWorkout = user.lastWorkoutDate ? new Date(user.lastWorkoutDate) : null;
  if (!lastWorkout) return 'high';

  const hoursSince = (Date.now() - lastWorkout.getTime()) / (1000 * 60 * 60);
  if (hoursSince > 48) return 'high';
  if (hoursSince > 24) return 'medium';
  return 'low';
}
