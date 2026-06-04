/**
 * AI Routes — GymBuddy Phase 5
 * Exposes all AI-powered features: matching, recommendations, nudges, insights.
 */
import express from 'express';
import { protect } from '../middleware/auth.js';
import { User }    from '../models/User.js';
import { Match }   from '../models/Match.js';
import { Streak }  from '../models/Streak.js';

import { rankCandidates, calculateCompatibility, behaviouralCluster, churnRisk, predictedRetentionScore } from '../services/aiMatchingService.js';
import { generateWorkoutPlan, generateMotivationMessage, analyseExerciseVariety } from '../services/recommendationService.js';
import { generateNudges, predictOptimalReminderTime, calculateEngagementScore } from '../services/reminderService.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────
// @desc    Full AI partner recommendations with 5-pillar breakdown
// @route   GET /api/ai/matches
// @access  Private
// Query: minScore (default 20), limit (default 10), goalFilter (optional)
// ─────────────────────────────────────────────────────────────────────────
router.get('/matches', protect, async (req, res) => {
  const currentUserId = String(req.user._id || req.user.id);
  const minScore  = parseInt(req.query.minScore) || 20;
  const limit     = Math.min(parseInt(req.query.limit) || 10, 30);
  const goalFilter = req.query.goal ? req.query.goal.split(',') : null;

  try {
    const allUsers = await User.find({});
    const allMatches = await Match.find({});

    // Filter out users who are already matched / rejected with current user
    const matchMap = {};
    allMatches
      .filter(m => String(m.user1Id) === currentUserId || String(m.user2Id) === currentUserId)
      .forEach(m => {
        const other = String(m.user1Id) === currentUserId ? String(m.user2Id) : String(m.user1Id);
        matchMap[other] = m;
      });

    const candidates = allUsers.filter(u => {
      const uid = String(u._id || u.id);
      if (uid === currentUserId) return false;
      const existing = matchMap[uid];
      if (!existing) return true;
      if (existing.status === 'accepted') return false;
      if (existing.status === 'rejected') return false;
      if (existing.status === 'pending' && String(existing.actionUserId) === currentUserId) return false;
      return true; // incoming pending — show so they can accept
    });

    const ranked = rankCandidates(req.user, candidates, {
      minScore,
      maxResults: limit,
      boostGoals: goalFilter,
    });

    const results = ranked.map(r => ({
      user: {
        _id:             String(r.candidate._id || r.candidate.id),
        username:        r.candidate.username,
        name:            r.candidate.name || '',
        fitnessLevel:    r.candidate.fitnessLevel || 'Beginner',
        fitnessGoals:    r.candidate.fitnessGoals || [],
        schedule:        r.candidate.schedule || [],
        location:        r.candidate.location || '',
        profilePhotoUrl: r.candidate.profilePhotoUrl || '',
        streakCount:     r.candidate.streakCount || 0,
        totalWorkouts:   r.candidate.totalWorkouts || 0,
        coins:           r.candidate.coins || 0,
      },
      compatibility: {
        total:          r.total,
        label:          r.label,
        breakdown:      r.breakdown,
        sharedGoals:    r.sharedGoals,
        sharedSchedule: r.sharedSchedule,
        retentionScore: predictedRetentionScore(req.user, r.candidate, r.total),
      },
      matchStatus:      matchMap[String(r.candidate._id || r.candidate.id)]?.status || 'none',
      matchId:          matchMap[String(r.candidate._id || r.candidate.id)]?._id || null,
      isIncomingRequest: matchMap[String(r.candidate._id || r.candidate.id)]?.status === 'pending'
                       && String(matchMap[String(r.candidate._id || r.candidate.id)]?.actionUserId) !== currentUserId,
    }));

    res.json({
      results,
      count: results.length,
      currentUser: {
        cluster: behaviouralCluster(req.user),
        churnRisk: churnRisk(req.user),
      },
    });
  } catch (err) {
    console.error('[AI] Matches error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Compare two specific users' compatibility (detailed)
// @route   GET /api/ai/compatibility/:targetUserId
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
router.get('/compatibility/:targetUserId', protect, async (req, res) => {
  const { targetUserId } = req.params;
  try {
    const target = await User.findById(targetUserId);
    if (!target) return res.status(404).json({ message: 'User not found' });

    const result = calculateCompatibility(req.user, target);
    res.json({
      ...result,
      retentionScore: predictedRetentionScore(req.user, target, result.total),
      currentUserCluster: behaviouralCluster(req.user),
      targetCluster:      behaviouralCluster(target),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Generate AI-powered workout plan
// @route   GET /api/ai/workout-plan
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
router.get('/workout-plan', protect, async (req, res) => {
  try {
    const plan = await generateWorkoutPlan(req.user);
    res.json(plan);
  } catch (err) {
    console.error('[AI] Workout plan error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Get personalised motivation messages
// @route   GET /api/ai/motivation
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
router.get('/motivation', protect, async (req, res) => {
  try {
    const userId = String(req.user._id || req.user.id);

    // Get active partner info if any
    const allMatches = await Match.find({ status: 'accepted' });
    const activeMatch = allMatches.find(m => String(m.user1Id) === userId || String(m.user2Id) === userId);
    let partnerInfo = null;

    if (activeMatch) {
      const partnerId = String(activeMatch.user1Id) === userId ? String(activeMatch.user2Id) : String(activeMatch.user1Id);
      const partner   = await User.findById(partnerId);
      if (partner) partnerInfo = { username: partner.username, streakCount: partner.streakCount || 0 };
    }

    const result = await generateMotivationMessage(req.user, partnerInfo);
    res.json(result);
  } catch (err) {
    console.error('[AI] Motivation error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Analyse exercise variety and detect muscle imbalances
// @route   GET /api/ai/variety
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
router.get('/variety', protect, async (req, res) => {
  const userId = String(req.user._id || req.user.id);
  try {
    const analysis = await analyseExerciseVariety(userId);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Get smart engagement nudges
// @route   GET /api/ai/nudges
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
router.get('/nudges', protect, async (req, res) => {
  const userId = String(req.user._id || req.user.id);
  try {
    // Get partner info
    const allMatches = await Match.find({ status: 'accepted' });
    const activeMatch = allMatches.find(m => String(m.user1Id) === userId || String(m.user2Id) === userId);
    let partnerInfo = null;

    if (activeMatch) {
      const pid = String(activeMatch.user1Id) === userId ? String(activeMatch.user2Id) : String(activeMatch.user1Id);
      const p   = await User.findById(pid);
      if (p) partnerInfo = { username: p.username, streakCount: p.streakCount || 0 };
    }

    // Get pending proofs from partner
    let pendingProofs = [];
    if (partnerInfo) {
      const pid = String(activeMatch.user1Id) === userId ? String(activeMatch.user2Id) : String(activeMatch.user1Id);
      const all = await Streak.find({ userId: pid, status: 'pending' });
      pendingProofs = all;
    }

    const nudges = await generateNudges(req.user, partnerInfo, pendingProofs);
    res.json(nudges);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Get optimal reminder time + engagement score
// @route   GET /api/ai/insights
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
router.get('/insights', protect, async (req, res) => {
  const userId = String(req.user._id || req.user.id);
  try {
    const [optimalTime, engagementScore] = await Promise.all([
      predictOptimalReminderTime(userId),
      Promise.resolve(calculateEngagementScore(req.user)),
    ]);

    res.json({
      engagementScore,
      optimalReminderTime: optimalTime,
      cluster: behaviouralCluster(req.user),
      churnRisk: churnRisk(req.user),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
