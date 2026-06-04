/**
 * Recommendation Service — GymBuddy
 * ─────────────────────────────────────────────────────────────────────────
 * Generates three types of personalized AI recommendations:
 *
 *  1. Workout Plan Generator
 *     — Progressive overload recommendations based on user's goal, level,
 *       recent history, and preferred schedule.
 *
 *  2. Motivation Message Engine
 *     — Contextual, dynamic messages tailored to user's streak status,
 *       time of day, recent activity, partner status, and milestones.
 *
 *  3. Exercise Variety Analyzer
 *     — Detects muscle group imbalances and recommends missing exercise types.
 *
 * Future ML Hooks:
 *  - workoutPlanFromMLModel() — deep learning plan generation
 *  - sentimentAdaptedMessage() — NLP-driven motivational tone matching
 */

import { churnRisk, behaviouralCluster } from './aiMatchingService.js';
import { isMockMode } from '../config/db.js';
import { db } from '../config/mockDb.js';

// ── Exercise Database ─────────────────────────────────────────────────────
// Curated exercise library with muscle group tags and difficulty tiers
const EXERCISE_DB = {
  Strength: {
    Beginner: [
      { name: 'Bodyweight Squat',    sets: 3, reps: 12, muscles: ['legs', 'glutes'] },
      { name: 'Push-Up',             sets: 3, reps: 10, muscles: ['chest', 'triceps'] },
      { name: 'Dumbbell Row',        sets: 3, reps: 12, muscles: ['back', 'biceps'] },
      { name: 'Glute Bridge',        sets: 3, reps: 15, muscles: ['glutes', 'hamstrings'] },
      { name: 'Plank',               sets: 3, reps: null, duration: 30, muscles: ['core'] },
    ],
    Intermediate: [
      { name: 'Barbell Squat',       sets: 4, reps: 8,  muscles: ['legs', 'glutes'] },
      { name: 'Bench Press',         sets: 4, reps: 8,  muscles: ['chest', 'triceps', 'shoulders'] },
      { name: 'Bent-Over Row',       sets: 4, reps: 10, muscles: ['back', 'biceps'] },
      { name: 'Romanian Deadlift',   sets: 3, reps: 10, muscles: ['hamstrings', 'glutes', 'back'] },
      { name: 'Overhead Press',      sets: 3, reps: 10, muscles: ['shoulders', 'triceps'] },
      { name: 'Cable Crunch',        sets: 3, reps: 15, muscles: ['core'] },
    ],
    Advanced: [
      { name: 'Conventional Deadlift', sets: 5, reps: 5,  muscles: ['back', 'legs', 'glutes'] },
      { name: 'Weighted Pull-Up',    sets: 4, reps: 6,  muscles: ['back', 'biceps'] },
      { name: 'Incline Bench Press', sets: 4, reps: 8,  muscles: ['chest', 'shoulders'] },
      { name: 'Bulgarian Split Squat', sets: 3, reps: 10, muscles: ['legs', 'glutes'] },
      { name: 'Barbell Hip Thrust',  sets: 4, reps: 10, muscles: ['glutes', 'hamstrings'] },
      { name: 'Dragon Flag',         sets: 3, reps: 8,  muscles: ['core'] },
    ],
  },
  Cardio: {
    Beginner:     [
      { name: 'Brisk Walk',          sets: 1, reps: null, duration: 20, muscles: ['cardio'] },
      { name: 'Jumping Jacks',       sets: 3, reps: 30,  muscles: ['cardio', 'legs'] },
      { name: 'Low-Impact Cycling',  sets: 1, reps: null, duration: 15, muscles: ['cardio', 'legs'] },
    ],
    Intermediate: [
      { name: 'Interval Running',    sets: 5, reps: null, duration: 3,  muscles: ['cardio'] },
      { name: 'Jump Rope',           sets: 4, reps: null, duration: 3,  muscles: ['cardio', 'legs'] },
      { name: 'Rowing Machine',      sets: 3, reps: null, duration: 5,  muscles: ['cardio', 'back'] },
    ],
    Advanced: [
      { name: 'Sprint Intervals',    sets: 8, reps: null, duration: 1,  muscles: ['cardio'] },
      { name: 'Assault Bike Tabata', sets: 8, reps: null, duration: 0.5, muscles: ['cardio', 'full body'] },
      { name: 'Stairmaster',         sets: 1, reps: null, duration: 30, muscles: ['cardio', 'legs'] },
    ],
  },
  'Weight Loss': {
    Beginner:     [
      { name: 'Walking Lunges',      sets: 3, reps: 10, muscles: ['legs'] },
      { name: 'Mountain Climbers',   sets: 3, reps: 20, muscles: ['core', 'cardio'] },
      { name: 'Step-Ups',            sets: 3, reps: 12, muscles: ['legs', 'glutes'] },
    ],
    Intermediate: [
      { name: 'Burpees',             sets: 4, reps: 10, muscles: ['full body', 'cardio'] },
      { name: 'Kettlebell Swing',    sets: 4, reps: 15, muscles: ['glutes', 'back', 'cardio'] },
      { name: 'Box Jump',            sets: 3, reps: 10, muscles: ['legs', 'cardio'] },
    ],
    Advanced: [
      { name: 'Barbell Complex',     sets: 5, reps: 6,  muscles: ['full body'] },
      { name: 'Battle Ropes',        sets: 6, reps: null, duration: 0.5, muscles: ['cardio', 'arms'] },
      { name: 'Sled Push',           sets: 5, reps: null, duration: 0.5, muscles: ['legs', 'cardio'] },
    ],
  },
  Flexibility: {
    Beginner:     [
      { name: 'Cat-Cow Stretch',     sets: 2, reps: 10, muscles: ['spine'] },
      { name: 'Child\'s Pose',       sets: 3, reps: null, duration: 1, muscles: ['back', 'hips'] },
      { name: 'Hip Flexor Stretch',  sets: 2, reps: null, duration: 1, muscles: ['hips'] },
    ],
    Intermediate: [
      { name: 'Downward Dog Flow',   sets: 3, reps: 8,  muscles: ['hamstrings', 'shoulders'] },
      { name: 'Pigeon Pose',         sets: 2, reps: null, duration: 2, muscles: ['hips', 'glutes'] },
      { name: 'World\'s Greatest',   sets: 2, reps: 5,  muscles: ['hips', 'thoracic'] },
    ],
    Advanced: [
      { name: 'Full Split Hold',     sets: 3, reps: null, duration: 2, muscles: ['hamstrings', 'hips'] },
      { name: 'Pancake Stretch',     sets: 3, reps: null, duration: 2, muscles: ['hamstrings', 'groin'] },
      { name: 'Shoulder Dislocate',  sets: 3, reps: 10, muscles: ['shoulders'] },
    ],
  },
};

const WARMUP = [
  { name: 'Dynamic Warm-Up', sets: 1, reps: null, duration: 5, muscles: ['full body'], isWarmup: true },
  { name: 'Foam Rolling',    sets: 1, reps: null, duration: 3, muscles: ['full body'], isWarmup: true },
];

const COOLDOWN = [
  { name: 'Static Stretching', sets: 1, reps: null, duration: 5, muscles: ['full body'], isCooldown: true },
];

// ── Workout Plan Generator ─────────────────────────────────────────────────
/**
 * Generates a full weekly workout plan for the user.
 * Adapts intensity, volume, and rest days to their profile and history.
 */
export async function generateWorkoutPlan(user) {
  const level      = user.fitnessLevel || 'Beginner';
  const goals      = user.fitnessGoals || ['General Fitness'];
  const schedule   = user.schedule || ['Morning'];
  const streakDays = user.streakCount || 0;

  // Determine training days per week based on level and history
  const daysPerWeek = level === 'Advanced' ? 5 : level === 'Intermediate' ? 4 : 3;

  // Select primary goal for exercise selection
  const primaryGoal = goals[0] || 'Strength';
  const secondaryGoal = goals[1] || null;

  // Get exercises from DB
  const primaryExercises = EXERCISE_DB[primaryGoal]?.[level] || EXERCISE_DB.Strength[level];
  const secondaryExercises = secondaryGoal ? (EXERCISE_DB[secondaryGoal]?.[level] || []) : [];

  // Build session pool
  const allExercises = [...primaryExercises, ...secondaryExercises.slice(0, 2)];

  // Generate daily sessions
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const activeDayIndices = selectTrainingDays(daysPerWeek, schedule);

  const weekPlan = DAYS.map((day, idx) => {
    const isTrainingDay = activeDayIndices.includes(idx);

    if (!isTrainingDay) {
      return {
        day,
        type: 'Rest',
        exercises: [],
        estimatedDuration: 0,
        estimatedCalories: 0,
        tip: 'Active recovery: light walk or stretching recommended.',
      };
    }

    // Alternate muscle groups for multi-day plans
    const dayExercises = rotateDayExercises(allExercises, idx, daysPerWeek);
    const sessionExercises = [...WARMUP, ...dayExercises, ...COOLDOWN];

    const estimatedDuration = estimateDuration(dayExercises);
    const estimatedCalories = estimateCalories(dayExercises, user.weight || 70, level);

    return {
      day,
      type: primaryGoal,
      exercises: sessionExercises,
      estimatedDuration,
      estimatedCalories,
      tip: getSessionTip(primaryGoal, level, streakDays),
    };
  });

  // Progressive overload recommendation
  const progressionNote = getProgressionNote(user, primaryGoal);

  return {
    planName: `${level} ${primaryGoal} Plan`,
    generatedFor: user.username || 'Athlete',
    fitnessLevel: level,
    primaryGoal,
    daysPerWeek,
    weekPlan,
    progressionNote,
    generatedAt: new Date().toISOString(),
    nextReviewDate: getNextReviewDate(streakDays),
  };
}

function selectTrainingDays(count, schedule) {
  // Map schedule preferences to day indices
  const dayGroups = {
    Morning: [0, 2, 4],    // Mon, Wed, Fri
    Evening: [1, 3, 5],    // Tue, Thu, Sat
    Weekends: [5, 6],      // Sat, Sun
    Afternoon: [1, 3, 5],
  };

  // Preferred days first
  const pref = schedule[0] || 'Morning';
  const preferred = dayGroups[pref] || [0, 2, 4];
  const all = [0, 1, 2, 3, 4, 5, 6];
  const remaining = all.filter(d => !preferred.includes(d));

  return [...preferred, ...remaining].slice(0, count);
}

function rotateDayExercises(exercises, dayIdx, daysPerWeek) {
  const splitSize = Math.ceil(exercises.length / daysPerWeek);
  const offset = (dayIdx * 2) % exercises.length;
  const slice = exercises.slice(offset, offset + splitSize);
  // Fill if slice is too short
  if (slice.length < 3 && exercises.length >= 3) {
    return exercises.slice(0, Math.min(4, exercises.length));
  }
  return slice.slice(0, 5); // cap at 5 exercises per session
}

function estimateDuration(exercises) {
  return exercises.reduce((total, ex) => {
    if (ex.duration) return total + ex.duration + 1;
    return total + (ex.sets * 2.5); // ~2.5 min per set including rest
  }, 0);
}

function estimateCalories(exercises, weightKg, level) {
  const MET = { Beginner: 5, Intermediate: 7, Advanced: 9 };
  const metValue = MET[level] || 6;
  const duration = estimateDuration(exercises) / 60; // hours
  return Math.round(metValue * weightKg * duration);
}

function getSessionTip(goal, level, streak) {
  const tips = {
    Strength: [
      'Focus on form over weight — proper technique prevents injury and builds strength faster.',
      'Rest 90–120 seconds between strength sets for optimal muscle recovery.',
      'Log your weights — progressive overload requires tracking your numbers.',
    ],
    Cardio: [
      'Stay in Zone 2 (conversational pace) for fat-burning cardio sessions.',
      'High-intensity intervals: work hard for 30 sec, recover for 90 sec.',
      'Hydrate! Aim for 500ml water per 30 minutes of cardio.',
    ],
    'Weight Loss': [
      'Compound movements burn more calories than isolation exercises — prioritise them.',
      'Keep rest periods short (45–60 sec) to maintain elevated heart rate.',
      'Nutrition matters more than exercise for weight loss — fuel wisely.',
    ],
    Flexibility: [
      'Never stretch cold muscles — always warm up for 5 minutes first.',
      'Hold each stretch for at least 30 seconds to see flexibility gains.',
      'Breathe deeply and relax into stretches — tension works against flexibility.',
    ],
  };
  const arr = tips[goal] || tips.Strength;
  const idx = streak % arr.length;
  return arr[idx];
}

function getProgressionNote(user, goal) {
  const workouts = user.totalWorkouts || 0;
  const level = user.fitnessLevel || 'Beginner';

  if (workouts < 5)    return 'Focus on building the habit. Consistency over intensity at this stage.';
  if (workouts < 20)   return 'You\'re building momentum! Increase weight by 2.5–5% when you complete all reps comfortably.';
  if (workouts < 50)   return 'Ready for deload? Every 4–6 weeks reduce volume by 40% to recover and come back stronger.';
  if (level === 'Intermediate') return 'Consider periodisation: 3-week progressive overload + 1 deload week cycle.';
  if (level === 'Advanced')     return 'Advanced: implement double progression — add reps first, then weight once rep target is met.';
  return 'Keep tracking — your data is your roadmap. Review 4-week trends weekly.';
}

function getNextReviewDate(streak) {
  const d = new Date();
  d.setDate(d.getDate() + (streak < 14 ? 7 : 14));
  return d.toISOString().split('T')[0];
}

// ── Motivation Message Engine ──────────────────────────────────────────────
/**
 * Generates a highly contextual motivation message based on:
 * - Time of day
 * - Streak status + churn risk
 * - Recent workout frequency
 * - Partner activity
 * - Milestone achievements
 * - Behavioural persona
 */
export async function generateMotivationMessage(user, partnerInfo = null) {
  const streak    = user.streakCount    || 0;
  const coins     = user.coins          || 0;
  const workouts  = user.totalWorkouts  || 0;
  const risk      = churnRisk(user);
  const persona   = behaviouralCluster(user);
  const hour      = new Date().getHours();

  const messages = [];

  // ── 1. Milestone Messages ─────────────────────────────────────────────
  if (streak === 1)   messages.push({ type: 'milestone', priority: 10, icon: '🎉', title: 'First Streak Day!', body: `You've started your journey, ${user.username}! Day 1 of what could be an incredible habit. Log tomorrow to keep it alive!` });
  if (streak === 7)   messages.push({ type: 'milestone', priority: 10, icon: '🔥', title: '1 Week Streak!', body: `A full week of showing up — that's discipline! You're in the top 30% of GymBuddy users. Keep the fire burning!` });
  if (streak === 14)  messages.push({ type: 'milestone', priority: 10, icon: '💪', title: '2-Week Warrior!', body: `14 days of consistency is where habits truly start forming. Your body is already adapting. Don't stop now!` });
  if (streak === 30)  messages.push({ type: 'milestone', priority: 10, icon: '🏆', title: '30-Day Champion!', body: `ONE MONTH! You're in an elite group — less than 8% of users reach Day 30. You've officially built a habit!` });
  if (streak === 100) messages.push({ type: 'milestone', priority: 10, icon: '👑', title: 'Century Club!', body: `100 consecutive days. You are an inspiration to every GymBuddy user. Share this moment — you've earned it!` });

  // ── 2. Churn Risk Alerts ─────────────────────────────────────────────
  if (risk === 'high' && streak > 0) {
    messages.push({ type: 'alert', priority: 9, icon: '⚠️', title: 'Streak at Risk!', body: `It's been over 48 hours since your last workout, ${user.username}. Your ${streak}-day streak needs today's proof before midnight!` });
  }
  if (risk === 'medium' && streak >= 7) {
    messages.push({ type: 'alert', priority: 8, icon: '⏰', title: 'Reminder', body: `You haven't logged in 24 hours. A quick 20-minute session is all it takes to protect your ${streak}-day streak today.` });
  }

  // ── 3. Partner Accountability ─────────────────────────────────────────
  if (partnerInfo) {
    const partnerStreak = partnerInfo.streakCount || 0;
    if (partnerStreak > streak) {
      messages.push({ type: 'social', priority: 7, icon: '🤝', title: `${partnerInfo.username} is ahead!`, body: `Your buddy ${partnerInfo.username} has a ${partnerStreak}-day streak vs your ${streak}. Time to close that gap — and motivate each other!` });
    }
    if (partnerStreak === streak && streak > 0) {
      messages.push({ type: 'social', priority: 6, icon: '✨', title: 'Perfectly in sync!', body: `You and ${partnerInfo.username} have matching ${streak}-day streaks! This is what accountability looks like. Keep going together!` });
    }
  }

  // ── 4. Time-of-Day Messages ───────────────────────────────────────────
  if (hour >= 5 && hour < 10) {
    messages.push({ type: 'time', priority: 4, icon: '🌅', title: 'Good Morning!', body: 'Morning workouts boost metabolism for hours after. You\'re already ahead of 90% of people who haven\'t started yet.' });
  } else if (hour >= 10 && hour < 14) {
    messages.push({ type: 'time', priority: 3, icon: '☀️', title: 'Midday check-in', body: 'Peak physical performance is typically at 2–6pm. Plan your workout now — book the time like a meeting.' });
  } else if (hour >= 17 && hour < 21) {
    messages.push({ type: 'time', priority: 4, icon: '🌆', title: 'Evening strength!', body: 'Evening workouts show 20% greater strength output on average. Your muscles are warmed up — make the most of it!' });
  }

  // ── 5. Coin / Reward Nudge ────────────────────────────────────────────
  if (coins >= 200 && coins < 500) {
    messages.push({ type: 'reward', priority: 5, icon: '🪙', title: `${coins} Coins and counting!`, body: 'You\'re building up a solid coin balance. Log today\'s workout for +15 more. Check the Marketplace for rewards!' });
  }
  if (coins >= 500) {
    messages.push({ type: 'reward', priority: 5, icon: '🎁', title: 'Ready to redeem!', body: `With ${coins} coins, you can unlock a Protein Powder Pack or Resistance Band Set right now. Treat yourself!` });
  }

  // ── 6. Persona-Based Messages ─────────────────────────────────────────
  const personaMsg = {
    'Dedicated Athlete':              { icon: '🏅', title: 'Elite Consistency', body: 'Your data shows elite-level commitment. Consider sharing your journey — your streak could inspire thousands.' },
    'Strength Seeker':                { icon: '🏋️', title: 'Progressive Overload', body: 'Did you increase your weights this week? Add 2.5kg to your main lifts today — small gains compound exponentially.' },
    'Cardio Enthusiast':              { icon: '🏃', title: 'Zone 2 Training', body: 'Are you mixing up your cardio? Adding 1 HIIT session this week can boost your VO2 max significantly.' },
    'Just Starting':                  { icon: '🌱', title: 'Every Expert Was Once a Beginner', body: 'Your first workout is the hardest one. Everything after is just showing up. You\'ve already done the hardest part — you started.' },
    'Inconsistent — Needs Accountability': { icon: '🔗', title: 'Your Partner Needs You', body: 'Consistency is a skill, not a talent. Try reducing your sessions to just 2x per week — sustainable beats perfect every time.' },
  }[persona];

  if (personaMsg) messages.push({ type: 'persona', priority: 3, ...personaMsg });

  // ── Sort by priority and return top 3 ────────────────────────────────
  const sorted = messages.sort((a, b) => b.priority - a.priority).slice(0, 3);

  // Fallback if nothing triggered
  if (sorted.length === 0) {
    sorted.push({
      type: 'general', priority: 1, icon: '💪',
      title: 'Stay Consistent!',
      body: `${workouts} workouts logged so far, ${user.username}. Every session counts. What will you crush today?`,
    });
  }

  return {
    messages: sorted,
    primaryMessage: sorted[0],
    churnRisk: risk,
    persona,
    generatedAt: new Date().toISOString(),
  };
}

// ── Exercise Variety Analyser ─────────────────────────────────────────────
/**
 * Analyses recent workout history to detect muscle group imbalances
 * and recommend exercise variety improvements.
 */
export async function analyseExerciseVariety(userId) {
  let workouts = [];

  if (isMockMode) {
    workouts = await db.workouts.find({ userId: String(userId) });
  } else {
    const { Workout } = await import('../models/Workout.js');
    workouts = await Workout.find({ userId });
  }

  // Aggregate muscle group frequency over last 30 days
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const recent = workouts.filter(w => new Date(w.date) >= cutoff);

  const muscleCounts = {};
  const exerciseNames = new Set();

  recent.forEach(w => {
    (w.exercises || []).forEach(ex => {
      exerciseNames.add(ex.name?.toLowerCase());
      const muscles = ex.muscles || inferMuscles(ex.name);
      muscles.forEach(m => { muscleCounts[m] = (muscleCounts[m] || 0) + 1; });
    });
  });

  // Detect imbalances
  const coreMuscles = ['chest', 'back', 'legs', 'shoulders', 'core', 'glutes'];
  const missing = coreMuscles.filter(m => !muscleCounts[m]);
  const dominant = Object.entries(muscleCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m]) => m);
  const totalSessions = recent.length;
  const varietyScore = Math.min(100, Math.round((Object.keys(muscleCounts).length / coreMuscles.length) * 100));

  const recommendations = missing.map(muscle => ({
    muscle,
    reason: `No ${muscle} exercises in the past 30 days — muscle imbalances can lead to injury.`,
    suggestedExercises: getSuggestedExercises(muscle),
  }));

  return {
    userId: String(userId),
    analysedSessions: totalSessions,
    periodDays: 30,
    varietyScore,
    muscleCoverage: muscleCounts,
    dominantMuscles: dominant,
    missingMuscles: missing,
    recommendations,
    generatedAt: new Date().toISOString(),
  };
}

function inferMuscles(exerciseName) {
  if (!exerciseName) return ['full body'];
  const n = exerciseName.toLowerCase();
  if (n.includes('squat') || n.includes('lunge') || n.includes('leg')) return ['legs', 'glutes'];
  if (n.includes('press') && n.includes('bench')) return ['chest', 'triceps'];
  if (n.includes('deadlift')) return ['back', 'legs', 'glutes'];
  if (n.includes('row')) return ['back', 'biceps'];
  if (n.includes('curl')) return ['biceps'];
  if (n.includes('push')) return ['chest', 'triceps'];
  if (n.includes('pull')) return ['back', 'biceps'];
  if (n.includes('plank') || n.includes('crunch') || n.includes('sit-up')) return ['core'];
  if (n.includes('shoulder') || n.includes('press') || n.includes('lateral')) return ['shoulders'];
  if (n.includes('run') || n.includes('cardio') || n.includes('bike')) return ['cardio'];
  return ['full body'];
}

function getSuggestedExercises(muscle) {
  const suggestions = {
    chest:     ['Push-Up', 'Bench Press', 'Chest Fly', 'Cable Crossover'],
    back:      ['Lat Pulldown', 'Seated Row', 'Bent-Over Row', 'Pull-Up'],
    legs:      ['Squat', 'Leg Press', 'Lunges', 'Leg Extension'],
    shoulders: ['Overhead Press', 'Lateral Raise', 'Face Pull', 'Front Raise'],
    core:      ['Plank', 'Russian Twist', 'Bicycle Crunch', 'Leg Raise'],
    glutes:    ['Hip Thrust', 'Glute Bridge', 'Donkey Kick', 'Cable Kickback'],
    biceps:    ['Barbell Curl', 'Hammer Curl', 'Incline Curl', 'Chin-Up'],
    triceps:   ['Tricep Pushdown', 'Skull Crusher', 'Dips', 'Overhead Extension'],
    hamstrings:['Romanian Deadlift', 'Leg Curl', 'Good Morning', 'Nordic Curl'],
    cardio:    ['HIIT Intervals', 'Jump Rope', 'Rowing Machine', 'Cycling'],
  };
  return (suggestions[muscle] || ['Compound Movements']).slice(0, 3);
}
