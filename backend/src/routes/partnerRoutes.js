import express from 'express';
import { User }  from '../models/User.js';
import { Match } from '../models/Match.js';
import { protect } from '../middleware/auth.js';
import { calculateCompatibility, rankCandidates, behaviouralCluster } from '../services/aiMatchingService.js';

const router = express.Router();


// @desc    Get partner recommendations with compatibility scores
// @route   GET /api/partners/recommendations
// @access  Private
router.get('/recommendations', protect, async (req, res) => {
  try {
    const currentUserId = req.user._id || req.user.id;
    const currentUser = req.user;

    // Get all users in the system
    const allUsers = await User.find({});
    // Get all existing matches involving the current user
    const existingMatches = await Match.find({});
    const currentMatches = existingMatches.filter(m => m.user1Id === currentUserId || m.user2Id === currentUserId);

    // Map existing matches to quickly check status
    const matchMap = {};
    currentMatches.forEach(m => {
      const otherId = m.user1Id === currentUserId ? m.user2Id : m.user1Id;
      matchMap[otherId] = m;
    });

    const candidates = allUsers.filter(u => {
      const uid = String(u._id || u.id);
      if (uid === String(currentUserId)) return false;
      const existing = matchMap[uid];
      if (!existing) return true;
      if (existing.status === 'accepted' || existing.status === 'rejected') return false;
      if (existing.status === 'pending' && String(existing.actionUserId) === String(currentUserId)) return false;
      return true; // incoming pending — still show
    });

    const ranked = rankCandidates(currentUser, candidates, { minScore: 0, maxResults: 20 });

    const recommendations = ranked.map(({ candidate: u, total: score, breakdown, sharedGoals, sharedSchedule, label }) => {
      const otherId = String(u._id || u.id);
      const existingMatch = matchMap[otherId];
      return {
        _id:            otherId,
        username:       u.username,
        name:           u.name || '',
        fitnessLevel:   u.fitnessLevel || 'Beginner',
        fitnessGoals:   u.fitnessGoals || [],
        schedule:       u.schedule || [],
        location:       u.location || '',
        profilePhotoUrl: u.profilePhotoUrl || '',
        streakCount:    u.streakCount || 0,
        totalWorkouts:  u.totalWorkouts || 0,
        compatibilityScore: score,
        scoreBreakdown: breakdown,
        matchLabel:     label,
        sharedGoals,
        sharedSchedule,
        matchStatus:    existingMatch ? existingMatch.status : 'none',
        matchId:        existingMatch ? (existingMatch._id || existingMatch.id) : null,
        isIncomingRequest: existingMatch && existingMatch.status === 'pending' && String(existingMatch.actionUserId) !== String(currentUserId),
      };
    });

    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Send match request to another user
// @route   POST /api/partners/request
// @access  Private
router.post('/request', protect, async (req, res) => {
  const { targetUserId } = req.body;
  const currentUserId = req.user._id || req.user.id;

  try {
    if (!targetUserId) {
      return res.status(400).json({ message: 'Target user ID required' });
    }

    // Check if target user exists
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    // Check if a match record already exists
    const matches = await Match.find({});
    const existing = matches.find(m => 
      (m.user1Id === currentUserId && m.user2Id === targetUserId) ||
      (m.user1Id === targetUserId && m.user2Id === currentUserId)
    );

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ message: 'You are already matched with this user' });
      }
      if (existing.status === 'pending') {
        return res.status(400).json({ message: 'A request is already pending' });
      }
      
      // If rejected, allow re-requesting by updating status to pending
      const updated = await Match.findByIdAndUpdate(
        existing._id || existing.id,
        { status: 'pending', actionUserId: currentUserId },
        { new: true }
      );
      return res.json(updated);
    }

    // Create new match with full AI breakdown
    const compat = calculateCompatibility(req.user, targetUser);
    const newMatch = await Match.create({
      user1Id: currentUserId,
      user2Id: targetUserId,
      status: 'pending',
      score: compat.total,
      scoreBreakdown: compat.breakdown,
      actionUserId: currentUserId,
    });

    res.status(201).json(newMatch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Respond to match request (accept / reject)
// @route   POST /api/partners/respond
// @access  Private
router.post('/respond', protect, async (req, res) => {
  const { matchId, action } = req.body; // action: 'accept' or 'reject'
  const currentUserId = req.user._id || req.user.id;

  try {
    if (!matchId || !action || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Match ID and action (accept/reject) required' });
    }

    const match = await Match.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: 'Match request not found' });
    }

    // Verify current user is part of this match
    if (match.user1Id !== currentUserId && match.user2Id !== currentUserId) {
      return res.status(403).json({ message: 'Not authorized to respond to this request' });
    }

    const status = action === 'accept' ? 'accepted' : 'rejected';
    const updatedMatch = await Match.findByIdAndUpdate(
      matchId,
      { status, actionUserId: currentUserId },
      { new: true }
    );

    res.json(updatedMatch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get currently active partner details
// @route   GET /api/partners/active
// @access  Private
router.get('/active', protect, async (req, res) => {
  try {
    const currentUserId = req.user._id || req.user.id;

    // Find accepted match
    const matches = await Match.find({ status: 'accepted' });
    const activeMatch = matches.find(m => m.user1Id === currentUserId || m.user2Id === currentUserId);

    if (!activeMatch) {
      return res.json(null); // No active partner
    }

    const partnerId = activeMatch.user1Id === currentUserId ? activeMatch.user2Id : activeMatch.user1Id;
    const partner = await User.findById(partnerId);

    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    res.json({
      _id: partner._id || partner.id,
      username: partner.username,
      name: partner.name || '',
      email: partner.email,
      fitnessGoals: partner.fitnessGoals,
      schedule: partner.schedule,
      location: partner.location,
      fitnessLevel: partner.fitnessLevel || 'Beginner',
      profilePhotoUrl: partner.profilePhotoUrl || '',
      streakCount: partner.streakCount,
      lastWorkoutDate: partner.lastWorkoutDate,
      compatibilityScore: activeMatch.score
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Break partnership / unmatch
// @route   POST /api/partners/unmatch
// @access  Private
router.post('/unmatch', protect, async (req, res) => {
  try {
    const currentUserId = req.user._id || req.user.id;
    const matches = await Match.find({ status: 'accepted' });
    const activeMatch = matches.find(m => m.user1Id === currentUserId || m.user2Id === currentUserId);

    if (!activeMatch) {
      return res.status(400).json({ message: 'No active partner to unmatch' });
    }

    await Match.deleteOne({ _id: activeMatch._id || activeMatch.id });
    res.json({ message: 'Successfully unmatched' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
