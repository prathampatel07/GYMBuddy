/**
 * Analytics Routes — GymBuddy
 * Exposes aggregation-backed endpoints for workout summaries, progress, and leaderboard.
 */
import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getWeeklySummary,
  getMonthlySummary,
  getProgressReport,
  getLeaderboard,
} from '../services/analyticsService.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────
// @desc    Weekly workout summary
// @route   GET /api/analytics/weekly?offset=0
// @access  Private
// Query params:
//   offset (int, default 0): 0 = current week, 1 = last week, etc.
// ─────────────────────────────────────────────────────────────────────────
router.get('/weekly', protect, async (req, res) => {
  const userId = req.user._id || req.user.id;
  const weekOffset = parseInt(req.query.offset) || 0;

  if (weekOffset < 0 || weekOffset > 52) {
    return res.status(400).json({ message: 'offset must be between 0 and 52' });
  }

  try {
    const summary = await getWeeklySummary(userId, weekOffset);
    res.json(summary);
  } catch (err) {
    console.error('[Analytics] Weekly error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Monthly workout summary
// @route   GET /api/analytics/monthly?year=2026&month=6
// @access  Private
// Query params:
//   year  (int, default current year)
//   month (int 1-12, default current month)
// ─────────────────────────────────────────────────────────────────────────
router.get('/monthly', protect, async (req, res) => {
  const userId = req.user._id || req.user.id;
  const year   = parseInt(req.query.year)  || new Date().getFullYear();
  const month  = parseInt(req.query.month) || new Date().getMonth() + 1;

  if (month < 1 || month > 12) {
    return res.status(400).json({ message: 'month must be between 1 and 12' });
  }
  if (year < 2020 || year > 2100) {
    return res.status(400).json({ message: 'year must be between 2020 and 2100' });
  }

  try {
    const summary = await getMonthlySummary(userId, year, month);
    res.json(summary);
  } catch (err) {
    console.error('[Analytics] Monthly error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Full progress report — trends, PRs, heatmap, rank
// @route   GET /api/analytics/progress
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
router.get('/progress', protect, async (req, res) => {
  const userId = req.user._id || req.user.id;
  try {
    const report = await getProgressReport(userId);
    res.json(report);
  } catch (err) {
    console.error('[Analytics] Progress error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Global leaderboard — top users by streak + workouts
// @route   GET /api/analytics/leaderboard?limit=10
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
router.get('/leaderboard', protect, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50); // cap at 50
  try {
    const board = await getLeaderboard(limit);
    res.json(board);
  } catch (err) {
    console.error('[Analytics] Leaderboard error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

export default router;
