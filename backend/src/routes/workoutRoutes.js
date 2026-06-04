/**
 * Workout Routes — GymBuddy
 * Handles workout logging with coin transaction recording, history, and stats.
 */
import express from 'express';
import { Workout } from '../models/Workout.js';
import { User } from '../models/User.js';
import { CoinTransaction, recordCoinTransaction } from '../models/CoinTransaction.js';
import { protect } from '../middleware/auth.js';
import { validateWorkoutLog } from '../middleware/validate.js';

const router = express.Router();

const WORKOUT_COIN_REWARD = 15;
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─────────────────────────────────────────────────────────────────────────
// @desc    Log a new workout session
// @route   POST /api/workouts/log
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
router.post('/log', protect, validateWorkoutLog, async (req, res) => {
  const { date, exercises, notes, duration, calories } = req.body;
  const userId = String(req.user._id || req.user.id);

  try {
    // Normalise date to a proper Date object for Mongoose
    const workoutDate = new Date(date);

    const newWorkout = await Workout.create({
      userId,
      date: workoutDate,
      exercises: exercises.map((ex) => ({
        name: ex.name.trim(),
        type: ex.type || 'Strength',
        sets: Number(ex.sets) || 0,
        reps: Number(ex.reps) || 0,
        weight: Number(ex.weight) || 0,
        durationSecs: Number(ex.durationSecs) || 0,
        distance: Number(ex.distance) || 0,
      })),
      notes: notes || '',
      duration: duration ? Number(duration) : 0,
      calories: calories ? Number(calories) : Math.round((duration || 45) * 6.5),
    });

    // ── Award coins ──────────────────────────────────────────────────────
    const user = await User.findById(userId);
    const currentCoins = user?.coins ?? 0;
    const newCoins = await recordCoinTransaction({
      userId,
      type: 'earn',
      amount: WORKOUT_COIN_REWARD,
      source: 'workout_log',
      description: `Logged workout session on ${date}`,
      referenceId: String(newWorkout._id || newWorkout.id),
      referenceModel: 'Workout',
      currentBalance: currentCoins,
    });

    // ── Update user stats ────────────────────────────────────────────────
    await User.findByIdAndUpdate(userId, {
      coins: newCoins,
      lastWorkoutDate: workoutDate,
      $inc: { totalWorkouts: 1 },
    });

    res.status(201).json({
      workout: newWorkout,
      coinsEarned: WORKOUT_COIN_REWARD,
      newCoinBalance: newCoins,
    });
  } catch (error) {
    console.error('[Workouts] Log error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Get workout summary statistics
// @route   GET /api/workouts/stats
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
router.get('/stats', protect, async (req, res) => {
  const userId = String(req.user._id || req.user.id);

  try {
    const workouts = await Workout.find({ userId });
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    let totalDuration = 0;
    let totalCalories = 0;
    let thisWeek = 0;
    const weekdayCounts = { Sunday: 0, Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0 };

    workouts.forEach((w) => {
      totalDuration += w.duration || 0;
      totalCalories += w.calories || 0;

      const d = new Date(w.date);
      const dayName = WEEKDAY_NAMES[d.getDay()];
      if (dayName) weekdayCounts[dayName]++;
      if (d >= startOfWeek) thisWeek++;
    });

    const totalWorkouts = workouts.length;
    res.json({
      totalWorkouts,
      totalDuration,
      totalCalories,
      avgDuration: totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0,
      avgCalories: totalWorkouts > 0 ? Math.round(totalCalories / totalWorkouts) : 0,
      thisWeek,
      byWeekday: weekdayCounts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Get workout history (sorted, newest first)
// @route   GET /api/workouts/history
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
router.get('/history', protect, async (req, res) => {
  const userId = String(req.user._id || req.user.id);
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);

  try {
    const workouts = await Workout.find({ userId });
    workouts.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(workouts.slice(0, limit));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
