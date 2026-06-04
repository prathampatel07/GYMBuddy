/**
 * Reward Routes — GymBuddy
 * Marketplace catalog, redemption flow with coin deduction + transaction logging.
 */
import express from 'express';
import { User } from '../models/User.js';
import { RewardItem, seedRewardItems } from '../models/RewardItem.js';
import { CoinTransaction, recordCoinTransaction } from '../models/CoinTransaction.js';
import { protect } from '../middleware/auth.js';
import { validateRewardRedeem } from '../middleware/validate.js';

const router = express.Router();

// Seed catalog on startup
seedRewardItems();

// ─────────────────────────────────────────────────────────────────────────
// @desc    Get all active reward items in catalog
// @route   GET /api/rewards/catalog
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
router.get('/catalog', protect, async (req, res) => {
  try {
    const { category } = req.query;
    // In mock mode, find all items (isActive may not be stored); in real mode, filter active
    const allItems = await RewardItem.find({});
    let rewards = allItems.filter((item) => item.isActive !== false); // include if isActive is true or undefined
    if (category && category !== 'All') {
      rewards = rewards.filter((item) => item.category === category);
    }
    // Sort by sortOrder then coinCost
    rewards.sort((a, b) => ((a.sortOrder || 0) - (b.sortOrder || 0)) || (a.coinCost - b.coinCost));
    res.json(rewards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Redeem a reward with coin deduction + transaction log
// @route   POST /api/rewards/redeem
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
router.post('/redeem', protect, validateRewardRedeem, async (req, res) => {
  const { rewardId } = req.body;
  const userId = String(req.user._id || req.user.id);

  try {
    // Find the reward item
    const reward = await RewardItem.findById(rewardId);
    if (!reward) {
      return res.status(404).json({ message: 'Reward item not found.' });
    }
    if (!reward.isActive) {
      return res.status(400).json({ message: 'This reward is no longer available.' });
    }
    if (reward.stock !== -1 && reward.stock <= 0) {
      return res.status(400).json({ message: 'This reward is out of stock.' });
    }

    // Check user's coin balance
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const currentCoins = user.coins || 0;
    if (currentCoins < reward.coinCost) {
      return res.status(400).json({
        message: `Insufficient coins. You need ${reward.coinCost} but only have ${currentCoins}.`,
        required: reward.coinCost,
        current: currentCoins,
        deficit: reward.coinCost - currentCoins,
      });
    }

    // Deduct coins and record transaction
    const newCoins = await recordCoinTransaction({
      userId,
      type: 'spend',
      amount: reward.coinCost,
      source: 'reward_redeem',
      description: `Redeemed: ${reward.name}`,
      referenceId: String(reward._id || reward.id),
      referenceModel: 'RewardItem',
      currentBalance: currentCoins,
    });

    // Update user: new balance + push to redemption history
    await User.findByIdAndUpdate(userId, {
      coins: newCoins,
      $push: {
        redeemedRewards: {
          rewardId: String(reward._id || reward.id),
          rewardName: reward.name,
          coinCost: reward.coinCost,
          redeemedAt: new Date(),
        },
      },
    });

    // Decrement stock if limited
    if (reward.stock !== -1) {
      await RewardItem.findByIdAndUpdate(String(reward._id || reward.id), {
        $inc: { stock: -1, totalRedeemed: 1 },
      });
    } else {
      await RewardItem.findByIdAndUpdate(String(reward._id || reward.id), {
        $inc: { totalRedeemed: 1 },
      });
    }

    res.json({
      message: `Successfully redeemed "${reward.name}"! Check your email for details.`,
      rewardName: reward.name,
      coinCost: reward.coinCost,
      newCoinBalance: newCoins,
    });
  } catch (error) {
    console.error('[Rewards] Redeem error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Get user's redemption history
// @route   GET /api/rewards/my-rewards
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
router.get('/my-rewards', protect, async (req, res) => {
  const userId = String(req.user._id || req.user.id);
  try {
    const user = await User.findById(userId);
    const history = (user?.redeemedRewards || [])
      .sort((a, b) => new Date(b.redeemedAt) - new Date(a.redeemedAt));
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// @desc    Get user's coin transaction history
// @route   GET /api/rewards/transactions
// @access  Private
// ─────────────────────────────────────────────────────────────────────────
router.get('/transactions', protect, async (req, res) => {
  const userId = String(req.user._id || req.user.id);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);

  try {
    const transactions = await CoinTransaction.find({ userId });
    transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(transactions.slice(0, limit));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
