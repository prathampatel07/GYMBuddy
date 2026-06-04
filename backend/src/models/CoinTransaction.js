/**
 * CoinTransaction Model — GymBuddy
 * Full immutable audit log for every coin credit/debit.
 * This allows reconstructing a user's coin balance at any point in time
 * and provides transparency for gamification integrity.
 */
import mongoose from 'mongoose';
import { isMockMode } from '../config/db.js';
import { db } from '../config/mockDb.js';

const COIN_SOURCES = [
  'register',      // Welcome bonus
  'workout_log',   // Logging a workout session
  'streak_submit', // Submitting daily proof
  'streak_verify', // Partner verified your proof
  'partner_verify',// You verified partner's proof (they get coins, you get coins)
  'reward_redeem', // Spending coins on a reward
  'admin_grant',   // Manual adjustment by admin
  'admin_deduct',  // Manual deduction by admin
  'bonus',         // Special event / achievement bonus
  'penalty',       // Rule violation deduction
];

const coinTransactionSchema = new mongoose.Schema(
  {
    // ── Who ───────────────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
      index: true,
    },

    // ── What ──────────────────────────────────────────────────────────
    type: {
      type: String,
      enum: {
        values: ['earn', 'spend'],
        message: 'Transaction type must be earn or spend',
      },
      required: [true, 'Transaction type is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Transaction amount must be at least 1 coin'],
    },
    source: {
      type: String,
      enum: {
        values: COIN_SOURCES,
        message: `Source must be one of: ${COIN_SOURCES.join(', ')}`,
      },
      required: [true, 'Transaction source is required'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },

    // ── Balance Snapshot ─────────────────────────────────────────────
    balanceBefore: {
      type: Number,
      required: [true, 'Balance before transaction is required'],
      min: 0,
    },
    balanceAfter: {
      type: Number,
      required: [true, 'Balance after transaction is required'],
      min: 0,
    },

    // ── Reference ─────────────────────────────────────────────────────
    referenceId: {
      type: String,
      default: null, // ID of the workout / streak / reward that triggered this
    },
    referenceModel: {
      type: String,
      enum: ['Workout', 'Streak', 'RewardItem', 'User', null],
      default: null,
    },
  },
  {
    timestamps: true,
    // Transactions are immutable — disable updates
    statics: {
      updateOne: () => { throw new Error('CoinTransaction records are immutable'); },
      updateMany: () => { throw new Error('CoinTransaction records are immutable'); },
      findByIdAndUpdate: () => { throw new Error('CoinTransaction records are immutable'); },
    },
  }
);

// ── Indexes ──────────────────────────────────────────────────────────────
// Primary: user's chronological transaction history
coinTransactionSchema.index({ userId: 1, createdAt: -1 });
// Filter by source type per user (e.g. all workout earnings)
coinTransactionSchema.index({ userId: 1, source: 1 });
// Global admin/analytics queries
coinTransactionSchema.index({ source: 1, createdAt: -1 });

const MongooseCoinTransaction =
  mongoose.models.CoinTransaction ||
  mongoose.model('CoinTransaction', coinTransactionSchema);

// ── Dual-mode proxy ──────────────────────────────────────────────────────
export const CoinTransaction = {
  find: (query, projection) =>
    isMockMode ? db.transactions.find(query) : MongooseCoinTransaction.find(query, projection),
  findOne: (query) =>
    isMockMode ? db.transactions.findOne(query) : MongooseCoinTransaction.findOne(query),
  findById: (id) =>
    isMockMode ? db.transactions.findById(id) : MongooseCoinTransaction.findById(id),
  create: (data) =>
    isMockMode ? db.transactions.create(data) : MongooseCoinTransaction.create(data),
  countDocuments: (query) =>
    isMockMode ? db.transactions.countDocuments(query) : MongooseCoinTransaction.countDocuments(query),
  aggregate: (pipeline) =>
    isMockMode ? db.transactions.aggregate(pipeline) : MongooseCoinTransaction.aggregate(pipeline),
};

/**
 * Helper: Record a coin transaction and update user's balance atomically.
 * Use this instead of manually calling User.findByIdAndUpdate for coins.
 */
export async function recordCoinTransaction({ userId, type, amount, source, description, referenceId, referenceModel, currentBalance }) {
  const balanceBefore = currentBalance;
  const balanceAfter = type === 'earn' ? balanceBefore + amount : Math.max(0, balanceBefore - amount);

  await CoinTransaction.create({
    userId,
    type,
    amount,
    source,
    description: description || `${type === 'earn' ? '+' : '-'}${amount} coins from ${source}`,
    balanceBefore,
    balanceAfter,
    referenceId: referenceId ? String(referenceId) : null,
    referenceModel: referenceModel || null,
  });

  return balanceAfter;
}

export { COIN_SOURCES };
