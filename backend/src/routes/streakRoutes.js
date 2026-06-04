/**
 * Streak Routes — GymBuddy
 * Handles daily workout proof submissions, partner verification, and streak history.
 */
import express from 'express';
import { Streak }  from '../models/Streak.js';
import { User }    from '../models/User.js';
import { Match }   from '../models/Match.js';
import { protect } from '../middleware/auth.js';
import { validateStreakProof } from '../middleware/validate.js';
import { uploadImage } from '../config/cloudinary.js';
import { recordCoinTransaction } from '../models/CoinTransaction.js';

const router = express.Router();

const STREAK_SUBMIT_COINS  = 20;
const STREAK_VERIFY_COINS  = 20; // coins verifier also earns

// ── Helper: get active partner ID ─────────────────────────────────────────
const getActivePartnerId = async (userId) => {
  const userIdStr = String(userId);
  const matches = await Match.find({ status: 'accepted' });
  const activeMatch = matches.find(
    (m) => String(m.user1Id) === userIdStr || String(m.user2Id) === userIdStr
  );
  if (!activeMatch) return null;
  return String(activeMatch.user1Id) === userIdStr
    ? String(activeMatch.user2Id)
    : String(activeMatch.user1Id);
};

// ── Helper: compute updated streak from last workout date ─────────────────
const computeNewStreak = (currentStreak, lastWorkoutDate, proofDate) => {
  const proofDateObj = new Date(proofDate);
  const proofDateStr = proofDateObj.toISOString().split('T')[0];

  if (!lastWorkoutDate) return 1;

  const last = new Date(lastWorkoutDate);
  const lastStr = last.toISOString().split('T')[0];

  if (lastStr === proofDateStr) return currentStreak; // Same day

  const diffMs = proofDateObj - last;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return currentStreak + 1; // Consecutive day
  return 1; // Gap — streak resets
};

// ─────────────────────────────────────────────────────────────────────────
// @desc    Submit daily workout proof
// @route   POST /api/streaks/proof
// @access  Private
// Accepts: multipart/form-data with 'proof' file OR JSON with proofImage (base64)
// ─────────────────────────────────────────────────────────────────────────
router.post('/proof', protect, validateStreakProof, async (req, res) => {
  const userId    = String(req.user._id || req.user.id);
  const proofDate = req.body.date || new Date().toISOString().split('T')[0];
  const proofText = req.body.proofText || 'Completed workout!';

  try {
    const proofDateObj = new Date(proofDate);

    // ── Duplicate check ────────────────────────────────────────────────
    const existingProof = await Streak.findOne({ userId, date: proofDateStr(proofDateObj) });
    if (existingProof) {
      return res.status(400).json({ message: 'Proof already submitted for this date!' });
    }

    // ── Handle image upload ────────────────────────────────────────────
    let photoUrl = '';
    if (req.file) {
      // Multer file buffer → base64 → Cloudinary
      const base64 = req.file.buffer.toString('base64');
      const dataUri = `data:${req.file.mimetype};base64,${base64}`;
      photoUrl = await uploadImage(dataUri, 'streak_proofs');
    } else if (req.body.proofImage) {
      photoUrl = await uploadImage(req.body.proofImage, 'streak_proofs');
    }

    // ── Partner lookup ─────────────────────────────────────────────────
    const partnerId     = await getActivePartnerId(userId);
    const initialStatus = partnerId ? 'pending' : 'verified';

    // ── Create proof document ──────────────────────────────────────────
    const newProof = await Streak.create({
      userId,
      date: proofDateObj,
      proofText,
      proofImageUrl: photoUrl,
      partnerId:     partnerId || null,
      status:        initialStatus,
    });

    // ── If no partner: award coins + update streak immediately ─────────
    if (!partnerId) {
      const user       = await User.findById(userId);
      const newStreak  = computeNewStreak(user.streakCount || 0, user.lastWorkoutDate, proofDate);
      const currentCoins = user?.coins ?? 0;
      const newCoins   = await recordCoinTransaction({
        userId,
        type: 'earn',
        amount: STREAK_SUBMIT_COINS,
        source: 'streak_submit',
        description: `Solo streak verified — Day ${newStreak}`,
        referenceId: String(newProof._id || newProof.id),
        referenceModel: 'Streak',
        currentBalance: currentCoins,
      });

      await User.findByIdAndUpdate(userId, {
        streakCount:     newStreak,
        lastWorkoutDate: proofDateObj,
        coins:           newCoins,
        $set: { longestStreak: Math.max(newStreak, user.longestStreak || 0) },
      });

      // Update proof to verified
      await Streak.findByIdAndUpdate(String(newProof._id || newProof.id), {
        status:     'verified',
        verifiedAt: new Date(),
      });

      return res.status(201).json({
        proof:       newProof,
        streakCount: newStreak,
        coins:       newCoins,
        coinsEarned: STREAK_SUBMIT_COINS,
        message:     `Day ${newStreak} streak verified! +${STREAK_SUBMIT_COINS} Fitness Coins 🔥`,
      });
    }

    // ── If partner exists: pending — wait for their verification ───────
    res.status(201).json({
      proof:   newProof,
      message: 'Proof submitted! Waiting for your Gym Buddy to verify it. 🤝',
    });
  } catch (error) {
    console.error('[Streaks] Proof submit error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Verify partner's workout proof
// @route   POST /api/streaks/verify-partner
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
router.post('/verify-partner', protect, async (req, res) => {
  const { proofId } = req.body;
  const verifierUserId = String(req.user._id || req.user.id);

  try {
    if (!proofId) {
      return res.status(400).json({ message: 'proofId is required.' });
    }

    const proof = await Streak.findById(proofId);
    if (!proof) {
      return res.status(404).json({ message: 'Workout proof not found.' });
    }
    if (proof.status === 'verified') {
      return res.status(400).json({ message: 'This proof has already been verified.' });
    }
    if (String(proof.userId) === verifierUserId) {
      return res.status(403).json({ message: 'You cannot verify your own proof.' });
    }

    // Confirm the verifier is the submitter's active partner
    const partnerId = await getActivePartnerId(verifierUserId);
    if (!partnerId || String(partnerId) !== String(proof.userId)) {
      return res.status(403).json({ message: 'You are not this user\'s active partner.' });
    }

    // ── Mark proof verified ────────────────────────────────────────────
    await Streak.findByIdAndUpdate(proofId, {
      status:     'verified',
      partnerId:  verifierUserId,
      verifiedAt: new Date(),
    });

    // ── Award coins to submitter (proof owner) ─────────────────────────
    const submitterUserId = String(proof.userId);
    const submitter       = await User.findById(submitterUserId);
    const submitterStreak = computeNewStreak(
      submitter.streakCount || 0,
      submitter.lastWorkoutDate,
      proof.date
    );
    const submitterCoins = await recordCoinTransaction({
      userId:         submitterUserId,
      type:           'earn',
      amount:         STREAK_SUBMIT_COINS,
      source:         'streak_verify',
      description:    `Partner verified streak — Day ${submitterStreak}`,
      referenceId:    proofId,
      referenceModel: 'Streak',
      currentBalance: submitter.coins ?? 0,
    });

    await User.findByIdAndUpdate(submitterUserId, {
      streakCount:     submitterStreak,
      lastWorkoutDate: proof.date,
      coins:           submitterCoins,
      $set: { longestStreak: Math.max(submitterStreak, submitter.longestStreak || 0) },
    });

    // ── Award coins to verifier too ────────────────────────────────────
    const verifier      = await User.findById(verifierUserId);
    const verifierCoins = await recordCoinTransaction({
      userId:         verifierUserId,
      type:           'earn',
      amount:         STREAK_VERIFY_COINS,
      source:         'partner_verify',
      description:    `Verified partner streak proof`,
      referenceId:    proofId,
      referenceModel: 'Streak',
      currentBalance: verifier.coins ?? 0,
    });

    await User.findByIdAndUpdate(verifierUserId, { coins: verifierCoins });

    res.json({
      message:            `Proof verified! Both you and ${submitter.username} earn +${STREAK_SUBMIT_COINS} Coins! 🎉`,
      submitterStreak:    submitterStreak,
      submitterCoins:     submitterCoins,
      verifierCoinsEarned: STREAK_VERIFY_COINS,
    });
  } catch (error) {
    console.error('[Streaks] Verify error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Get streak status for current user
// @route   GET /api/streaks/status
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
router.get('/status', protect, async (req, res) => {
  const userId    = String(req.user._id || req.user.id);
  const today     = new Date().toISOString().split('T')[0];

  try {
    const currentUser = await User.findById(userId);
    const partnerId   = await getActivePartnerId(userId);

    // Check if user submitted today
    const todayProof = await Streak.findOne({ userId, date: proofDateStr(new Date()) });

    let partnerInfo          = null;
    let partnerPendingProofs = [];

    if (partnerId) {
      const partnerUser = await User.findById(partnerId);
      if (partnerUser) {
        partnerInfo = {
          _id:             partnerId,
          username:        partnerUser.username,
          streakCount:     partnerUser.streakCount,
          lastWorkoutDate: partnerUser.lastWorkoutDate,
        };

        // Partner proofs waiting for current user to verify
        const partnerProofs = await Streak.find({ userId: partnerId, status: 'pending' });
        partnerPendingProofs = partnerProofs
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .map((p) => ({ ...p, isPartnerProof: true }));
      }
    }

    res.json({
      currentStreak:   currentUser.streakCount  || 0,
      longestStreak:   currentUser.longestStreak || 0,
      totalVerified:   await Streak.countDocuments({ userId, status: 'verified' }),
      lastWorkoutDate: currentUser.lastWorkoutDate,
      coins:           currentUser.coins || 0,
      submittedToday:  !!todayProof,
      partner:         partnerInfo,
      partnerPendingProofs,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Get proof submission history (own + partner's for timeline)
// @route   GET /api/streaks/history
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
router.get('/history', protect, async (req, res) => {
  const userId    = String(req.user._id || req.user.id);
  const limit     = Math.min(parseInt(req.query.limit) || 20, 100);

  try {
    const partnerId = await getActivePartnerId(userId);

    // User's own proofs
    const ownProofs = await Streak.find({ userId });
    const mapped = ownProofs.map((p) => ({
      ...p,
      _id:           p._id || p.id,
      isPartnerProof: false,
      submittedAt:   p.createdAt,
      photoUrl:      p.proofImageUrl || '',
    }));

    // Partner's proofs (for timeline context)
    let partnerProofs = [];
    if (partnerId) {
      const raw = await Streak.find({ userId: partnerId });
      partnerProofs = raw.map((p) => ({
        ...p,
        _id:            p._id || p.id,
        isPartnerProof: true,
        submittedAt:    p.createdAt,
        photoUrl:       p.proofImageUrl || '',
      }));
    }

    const combined = [...mapped, ...partnerProofs]
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, limit);

    res.json(combined);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── Internal helper ───────────────────────────────────────────────────────
// Normalise a Date to midnight for consistent daily indexing
function proofDateStr(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default router;
