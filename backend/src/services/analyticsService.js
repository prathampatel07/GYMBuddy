/**
 * Analytics Service — GymBuddy
 * MongoDB aggregation pipelines for workout analytics, progress tracking, and leaderboard.
 * All functions include a mock-mode JS fallback for local development.
 */
import { isMockMode } from '../config/db.js';
import { db } from '../config/mockDb.js';
import mongoose from 'mongoose';

// ── Lazy model imports (avoids circular deps) ──────────────────────────────
const getWorkout = async () => (await import('../models/Workout.js')).Workout;
const getUser    = async () => (await import('../models/User.js')).User;
const getStreak  = async () => (await import('../models/Streak.js')).Streak;

// ── Helpers ────────────────────────────────────────────────────────────────
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function getWeekBounds(weekOffset = 0) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek - weekOffset * 7);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return { startOfWeek, endOfWeek };
}

function safeUserId(userId) {
  if (isMockMode) return String(userId);
  try { return new mongoose.Types.ObjectId(String(userId)); }
  catch { return String(userId); }
}

// ── 1. Weekly Summary ──────────────────────────────────────────────────────
/**
 * Returns a daily breakdown for the selected week.
 * weekOffset: 0 = current week, 1 = last week, etc.
 */
export async function getWeeklySummary(userId, weekOffset = 0) {
  const { startOfWeek, endOfWeek } = getWeekBounds(weekOffset);
  const userIdStr = String(userId);

  if (isMockMode) {
    // JS fallback
    const workouts = await db.workouts.find({ userId: userIdStr });
    const inRange = workouts.filter((w) => {
      const d = new Date(w.date);
      return d >= startOfWeek && d <= endOfWeek;
    });

    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const byDay = {};
    DAY_NAMES.forEach((d) => { byDay[d] = { sessions: 0, calories: 0, duration: 0, volume: 0 }; });

    inRange.forEach((w) => {
      const day = DAY_NAMES[new Date(w.date).getDay()];
      byDay[day].sessions++;
      byDay[day].calories += w.calories || 0;
      byDay[day].duration += w.duration || 0;
      byDay[day].volume += (w.exercises || []).reduce(
        (sum, e) => sum + (e.sets || 0) * (e.reps || 0) * (e.weight || 1), 0
      );
    });

    return {
      weekStart: startOfWeek.toISOString().split('T')[0],
      weekEnd: endOfWeek.toISOString().split('T')[0],
      weekOffset,
      totalSessions: inRange.length,
      totalCalories: inRange.reduce((s, w) => s + (w.calories || 0), 0),
      totalDuration: inRange.reduce((s, w) => s + (w.duration || 0), 0),
      dailyBreakdown: DAY_NAMES.map((day) => ({ day, ...byDay[day] })),
    };
  }

  // ── Real MongoDB aggregation pipeline ─────────────────────────────────
  const Workout = await getWorkout();
  const uid = safeUserId(userId);

  const pipeline = [
    {
      $match: {
        userId: uid,
        date: { $gte: startOfWeek, $lte: endOfWeek },
      },
    },
    {
      $addFields: {
        dayOfWeek: { $dayOfWeek: '$date' }, // 1=Sun, 7=Sat
        volume: {
          $reduce: {
            input: '$exercises',
            initialValue: 0,
            in: {
              $add: [
                '$$value',
                { $multiply: ['$$this.sets', '$$this.reps', { $ifNull: ['$$this.weight', 1] }] },
              ],
            },
          },
        },
      },
    },
    {
      $group: {
        _id: '$dayOfWeek',
        sessions: { $sum: 1 },
        calories: { $sum: '$calories' },
        duration: { $sum: '$duration' },
        volume: { $sum: '$volume' },
      },
    },
    { $sort: { _id: 1 } },
  ];

  const dayResults = await Workout.aggregate(pipeline);

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const byDay = {};
  DAY_NAMES.forEach((d, i) => { byDay[i + 1] = { day: d, sessions: 0, calories: 0, duration: 0, volume: 0 }; });
  dayResults.forEach((r) => { byDay[r._id] = { ...byDay[r._id], ...r }; delete byDay[r._id]._id; });

  const dailyBreakdown = Object.values(byDay);
  return {
    weekStart: startOfWeek.toISOString().split('T')[0],
    weekEnd: endOfWeek.toISOString().split('T')[0],
    weekOffset,
    totalSessions: dailyBreakdown.reduce((s, d) => s + d.sessions, 0),
    totalCalories: dailyBreakdown.reduce((s, d) => s + d.calories, 0),
    totalDuration: dailyBreakdown.reduce((s, d) => s + d.duration, 0),
    dailyBreakdown,
  };
}

// ── 2. Monthly Summary ────────────────────────────────────────────────────
/**
 * Returns a weekly breakdown grouped by ISO week within the target month.
 */
export async function getMonthlySummary(userId, year, month) {
  const y = parseInt(year) || new Date().getFullYear();
  const m = parseInt(month) || new Date().getMonth() + 1;
  const startOfMonth = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999);
  const userIdStr = String(userId);

  if (isMockMode) {
    const workouts = await db.workouts.find({ userId: userIdStr });
    const inMonth = workouts.filter((w) => {
      const d = new Date(w.date);
      return d >= startOfMonth && d <= endOfMonth;
    });

    const byWeek = {};
    inMonth.forEach((w) => {
      const week = getISOWeek(new Date(w.date));
      if (!byWeek[week]) byWeek[week] = { week, sessions: 0, calories: 0, duration: 0, volume: 0 };
      byWeek[week].sessions++;
      byWeek[week].calories += w.calories || 0;
      byWeek[week].duration += w.duration || 0;
      byWeek[week].volume += (w.exercises || []).reduce(
        (sum, e) => sum + (e.sets || 0) * (e.reps || 0) * (e.weight || 1), 0
      );
    });

    const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    return {
      year: y,
      month: m,
      monthName: MONTH_NAMES[m],
      totalSessions: inMonth.length,
      totalCalories: inMonth.reduce((s, w) => s + (w.calories || 0), 0),
      totalDuration: inMonth.reduce((s, w) => s + (w.duration || 0), 0),
      avgCaloriesPerSession: inMonth.length > 0
        ? Math.round(inMonth.reduce((s, w) => s + (w.calories || 0), 0) / inMonth.length) : 0,
      weeklyBreakdown: Object.values(byWeek).sort((a, b) => a.week - b.week),
    };
  }

  // ── Real MongoDB pipeline ──────────────────────────────────────────────
  const Workout = await getWorkout();
  const uid = safeUserId(userId);

  const pipeline = [
    { $match: { userId: uid, date: { $gte: startOfMonth, $lte: endOfMonth } } },
    {
      $addFields: {
        isoWeek: { $isoWeek: '$date' },
        volume: {
          $reduce: {
            input: '$exercises',
            initialValue: 0,
            in: { $add: ['$$value', { $multiply: ['$$this.sets', '$$this.reps', { $ifNull: ['$$this.weight', 1] }] }] },
          },
        },
      },
    },
    {
      $group: {
        _id: '$isoWeek',
        sessions: { $sum: 1 },
        calories: { $sum: '$calories' },
        duration: { $sum: '$duration' },
        volume: { $sum: '$volume' },
        avgCalories: { $avg: '$calories' },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { week: '$_id', sessions: 1, calories: 1, duration: 1, volume: 1, avgCalories: { $round: ['$avgCalories', 0] }, _id: 0 } },
  ];

  const weeklyBreakdown = await Workout.aggregate(pipeline);

  const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const totals = weeklyBreakdown.reduce((acc, w) => ({
    sessions: acc.sessions + w.sessions,
    calories: acc.calories + w.calories,
    duration: acc.duration + w.duration,
  }), { sessions: 0, calories: 0, duration: 0 });

  return {
    year: y, month: m, monthName: MONTH_NAMES[m],
    ...totals,
    avgCaloriesPerSession: totals.sessions > 0 ? Math.round(totals.calories / totals.sessions) : 0,
    weeklyBreakdown,
  };
}

// ── 3. Full Progress Report ───────────────────────────────────────────────
/**
 * Comprehensive 4-week trend + personal records + streak heatmap + rank.
 */
export async function getProgressReport(userId) {
  const userIdStr = String(userId);

  if (isMockMode) {
    const workouts = await db.workouts.find({ userId: userIdStr });
    const users    = await db.users.find({});
    const streaks  = await db.streaks.find({ userId: userIdStr });

    // 4-week trends
    const now = new Date();
    const fourWeeksAgo = new Date(now); fourWeeksAgo.setDate(now.getDate() - 28);
    const recent = workouts.filter((w) => new Date(w.date) >= fourWeeksAgo);

    // Group by week
    const weekMap = {};
    recent.forEach((w) => {
      const weekKey = `W${getISOWeek(new Date(w.date))}`;
      if (!weekMap[weekKey]) weekMap[weekKey] = { week: weekKey, sessions: 0, calories: 0, duration: 0 };
      weekMap[weekKey].sessions++;
      weekMap[weekKey].calories += w.calories || 0;
      weekMap[weekKey].duration += w.duration || 0;
    });

    // Personal records (max weight per exercise)
    const prMap = {};
    workouts.forEach((w) => {
      (w.exercises || []).forEach((ex) => {
        if (ex.weight > 0) {
          const key = ex.name.toLowerCase();
          if (!prMap[key] || ex.weight > prMap[key].weight) {
            prMap[key] = { exercise: ex.name, weight: ex.weight, sets: ex.sets, reps: ex.reps };
          }
        }
      });
    });

    // Streak heatmap (last 90 days)
    const ninetyDaysAgo = new Date(now); ninetyDaysAgo.setDate(now.getDate() - 90);
    const heatmap = streaks
      .filter((s) => new Date(s.date) >= ninetyDaysAgo && s.status === 'verified')
      .map((s) => ({ date: s.date, count: 1 }));

    // User rank by streak + workouts
    const allUsers = users.map((u) => ({ id: u._id || u.id, streakCount: u.streakCount || 0, totalWorkouts: u.totalWorkouts || 0 }));
    allUsers.sort((a, b) => (b.streakCount - a.streakCount) || (b.totalWorkouts - a.totalWorkouts));
    const rank = allUsers.findIndex((u) => String(u.id) === userIdStr) + 1;

    const me = users.find((u) => (u._id || u.id) === userIdStr) || {};

    return {
      userId: userIdStr,
      generatedAt: new Date().toISOString(),
      summary: {
        totalWorkouts: workouts.length,
        totalCalories: workouts.reduce((s, w) => s + (w.calories || 0), 0),
        totalDuration: workouts.reduce((s, w) => s + (w.duration || 0), 0),
        currentStreak: me.streakCount || 0,
        longestStreak: me.longestStreak || 0,
        coins: me.coins || 0,
        rank,
        totalUsers: users.length,
      },
      fourWeekTrend: Object.values(weekMap).sort((a, b) => a.week.localeCompare(b.week)),
      personalRecords: Object.values(prMap).sort((a, b) => b.weight - a.weight).slice(0, 10),
      streakHeatmap: heatmap,
    };
  }

  // ── Real MongoDB multi-pipeline ────────────────────────────────────────
  const Workout = await getWorkout();
  const User    = await getUser();
  const Streak  = await getStreak();
  const uid     = safeUserId(userId);
  const now     = new Date();
  const fourWeeksAgo = new Date(now); fourWeeksAgo.setDate(now.getDate() - 28);
  const ninetyDaysAgo = new Date(now); ninetyDaysAgo.setDate(now.getDate() - 90);

  const [trendData, prData, heatmapData, summaryData, rankData] = await Promise.all([
    // 4-week week-by-week trend
    Workout.aggregate([
      { $match: { userId: uid, date: { $gte: fourWeeksAgo } } },
      { $addFields: { isoWeek: { $isoWeek: '$date' } } },
      { $group: { _id: '$isoWeek', sessions: { $sum: 1 }, calories: { $sum: '$calories' }, duration: { $sum: '$duration' } } },
      { $sort: { _id: 1 } },
      { $project: { week: { $concat: ['W', { $toString: '$_id' }] }, sessions: 1, calories: 1, duration: 1, _id: 0 } },
    ]),

    // Personal records — max weight per unique exercise
    Workout.aggregate([
      { $match: { userId: uid } },
      { $unwind: '$exercises' },
      { $match: { 'exercises.weight': { $gt: 0 } } },
      { $group: { _id: { $toLower: '$exercises.name' }, exercise: { $first: '$exercises.name' }, weight: { $max: '$exercises.weight' }, sets: { $first: '$exercises.sets' }, reps: { $first: '$exercises.reps' } } },
      { $sort: { weight: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, exercise: 1, weight: 1, sets: 1, reps: 1 } },
    ]),

    // Streak heatmap (verified only, last 90 days)
    Streak.aggregate([
      { $match: { userId: uid, status: 'verified', date: { $gte: ninetyDaysAgo } } },
      { $project: { date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, count: { $literal: 1 }, _id: 0 } },
      { $sort: { date: 1 } },
    ]),

    // User totals
    Workout.aggregate([
      { $match: { userId: uid } },
      { $group: { _id: null, totalWorkouts: { $sum: 1 }, totalCalories: { $sum: '$calories' }, totalDuration: { $sum: '$duration' } } },
    ]),

    // Rank: count users with higher streak or workout count
    User.aggregate([
      { $group: { _id: '$_id', streakCount: { $first: '$streakCount' }, totalWorkouts: { $first: '$totalWorkouts' } } },
      { $sort: { streakCount: -1, totalWorkouts: -1 } },
    ]),
  ]);

  const me = await User.findById(userId);
  const rank = rankData.findIndex((u) => String(u._id) === String(uid)) + 1;
  const totals = summaryData[0] || { totalWorkouts: 0, totalCalories: 0, totalDuration: 0 };

  return {
    userId: String(userId),
    generatedAt: new Date().toISOString(),
    summary: {
      ...totals,
      currentStreak: me?.streakCount || 0,
      longestStreak: me?.longestStreak || 0,
      coins: me?.coins || 0,
      rank,
      totalUsers: rankData.length,
    },
    fourWeekTrend: trendData,
    personalRecords: prData,
    streakHeatmap: heatmapData,
  };
}

// ── 4. Leaderboard ────────────────────────────────────────────────────────
/**
 * Top N users ranked by streak count (primary) and total workouts (secondary).
 */
export async function getLeaderboard(limit = 10) {
  if (isMockMode) {
    const users = await db.users.find({});
    return users
      .sort((a, b) => (b.streakCount - a.streakCount) || ((b.totalWorkouts || 0) - (a.totalWorkouts || 0)))
      .slice(0, limit)
      .map((u, i) => ({
        rank: i + 1,
        username: u.username,
        name: u.name || u.username,
        profilePhotoUrl: u.profilePhotoUrl || '',
        streakCount: u.streakCount || 0,
        totalWorkouts: u.totalWorkouts || 0,
        coins: u.coins || 0,
        fitnessLevel: u.fitnessLevel || 'Beginner',
      }));
  }

  const User = await getUser();
  const results = await User.aggregate([
    {
      $project: {
        username: 1, name: 1, profilePhotoUrl: 1,
        streakCount: 1, totalWorkouts: 1, coins: 1, fitnessLevel: 1,
      },
    },
    { $sort: { streakCount: -1, totalWorkouts: -1, coins: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0, username: 1, name: 1, profilePhotoUrl: 1,
        streakCount: 1, totalWorkouts: 1, coins: 1, fitnessLevel: 1,
      },
    },
  ]);

  return results.map((u, i) => ({ rank: i + 1, ...u }));
}
