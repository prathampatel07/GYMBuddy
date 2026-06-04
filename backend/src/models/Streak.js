/**
 * Streak Model — GymBuddy
 * One document per workout proof submission per user per day.
 * Partner must verify the proof to count the streak day.
 */
import mongoose from 'mongoose';
import { isMockMode } from '../config/db.js';
import { db } from '../config/mockDb.js';

const streakSchema = new mongoose.Schema(
  {
    // ── Core Fields ──────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Streak date is required'],
      validate: {
        validator: (d) => d <= new Date(),
        message: 'Streak date cannot be in the future',
      },
    },

    // ── Proof Content ────────────────────────────────────────────────
    proofText: {
      type: String,
      default: '',
      maxlength: [500, 'Proof text cannot exceed 500 characters'],
    },
    proofImageUrl: {
      type: String,
      default: '',
    },

    // ── Verification ─────────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ['pending', 'verified', 'rejected', 'failed'],
        message: 'Status must be pending, verified, rejected or failed',
      },
      default: 'pending',
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null means no partner has verified yet
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
      maxlength: [200, 'Rejection reason cannot exceed 200 characters'],
    },

    // ── Legacy base64 support (deprecated, use proofImageUrl) ────────
    proofImage: {
      type: String,
      default: '',
      select: false, // exclude from default queries (large data)
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtual: isVerified ──────────────────────────────────────────────────
streakSchema.virtual('isVerified').get(function () {
  return this.status === 'verified';
});

// ── Indexes ──────────────────────────────────────────────────────────────
// Unique: one proof per user per day (prevents double-submission)
streakSchema.index({ userId: 1, date: 1 }, { unique: true });
// For partner's pending proof queries
streakSchema.index({ partnerId: 1, status: 1 });
// For global streak history queries
streakSchema.index({ status: 1, date: -1 });

const MongooseStreak = mongoose.models.Streak || mongoose.model('Streak', streakSchema);

// ── Dual-mode proxy ──────────────────────────────────────────────────────
export const Streak = {
  find: (query, projection) =>
    isMockMode ? db.streaks.find(query) : MongooseStreak.find(query, projection),
  findOne: (query, projection) =>
    isMockMode ? db.streaks.findOne(query) : MongooseStreak.findOne(query, projection),
  findById: (id, projection) =>
    isMockMode ? db.streaks.findById(id) : MongooseStreak.findById(id, projection),
  create: (data) =>
    isMockMode ? db.streaks.create(data) : MongooseStreak.create(data),
  findByIdAndUpdate: (id, update, options) =>
    isMockMode
      ? db.streaks.findByIdAndUpdate(id, update, options)
      : MongooseStreak.findByIdAndUpdate(id, update, { new: true, runValidators: true, ...options }),
  findOneAndUpdate: (query, update, options) =>
    isMockMode
      ? db.streaks.findOneAndUpdate(query, update, options)
      : MongooseStreak.findOneAndUpdate(query, update, { new: true, runValidators: true, ...options }),
  deleteOne: (query) =>
    isMockMode ? db.streaks.deleteOne(query) : MongooseStreak.deleteOne(query),
  countDocuments: (query) =>
    isMockMode ? db.streaks.countDocuments(query) : MongooseStreak.countDocuments(query),
  aggregate: (pipeline) =>
    isMockMode ? db.streaks.aggregate(pipeline) : MongooseStreak.aggregate(pipeline),
};

export { streakSchema };
