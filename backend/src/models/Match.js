/**
 * Match Model — GymBuddy
 * Represents a partner pairing request/acceptance between two users.
 * Enforces unique pairs to prevent duplicate requests.
 */
import mongoose from 'mongoose';
import { isMockMode } from '../config/db.js';
import { db } from '../config/mockDb.js';

const matchSchema = new mongoose.Schema(
  {
    // ── Users (always user1Id < user2Id lexically to enforce uniqueness) ──
    user1Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'user1Id is required'],
    },
    user2Id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'user2Id is required'],
    },

    // ── Status ────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ['pending', 'accepted', 'rejected', 'unmatched'],
        message: 'Status must be pending, accepted, rejected, or unmatched',
      },
      default: 'pending',
    },
    actionUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'actionUserId is required'], // who sent the request or took last action
    },

    // ── Compatibility Score ───────────────────────────────────────────
    score: {
      type: Number,
      default: 0,
      min: [0, 'Score cannot be negative'],
      max: [100, 'Score cannot exceed 100'],
    },
    scoreBreakdown: {
      goals: { type: Number, default: 0 },
      schedule: { type: Number, default: 0 },
      level: { type: Number, default: 0 },
      location: { type: Number, default: 0 },
    },

    // ── Timestamps ────────────────────────────────────────────────────
    acceptedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    unmatchedAt: {
      type: Date,
      default: null,
    },
    unmatchedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true, // createdAt = when request was sent
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtual: partnershipDurationDays ────────────────────────────────────
matchSchema.virtual('partnershipDurationDays').get(function () {
  if (this.status !== 'accepted' || !this.acceptedAt) return 0;
  const end = this.unmatchedAt || new Date();
  return Math.floor((end - this.acceptedAt) / (1000 * 60 * 60 * 24));
});

// ── Indexes ──────────────────────────────────────────────────────────────
// Prevent duplicate pairs — enforce unique partnership
matchSchema.index({ user1Id: 1, user2Id: 1 }, { unique: true });
// Fast lookup for a specific user's active partner
matchSchema.index({ user1Id: 1, status: 1 });
matchSchema.index({ user2Id: 1, status: 1 });
// Filter by status for admin queries
matchSchema.index({ status: 1, createdAt: -1 });

const MongooseMatch = mongoose.models.Match || mongoose.model('Match', matchSchema);

// ── Dual-mode proxy ──────────────────────────────────────────────────────
export const Match = {
  find: (query, projection) =>
    isMockMode ? db.matches.find(query) : MongooseMatch.find(query, projection),
  findOne: (query, projection) =>
    isMockMode ? db.matches.findOne(query) : MongooseMatch.findOne(query, projection),
  findById: (id, projection) =>
    isMockMode ? db.matches.findById(id) : MongooseMatch.findById(id, projection),
  create: (data) =>
    isMockMode ? db.matches.create(data) : MongooseMatch.create(data),
  findByIdAndUpdate: (id, update, options) =>
    isMockMode
      ? db.matches.findByIdAndUpdate(id, update, options)
      : MongooseMatch.findByIdAndUpdate(id, update, { new: true, runValidators: true, ...options }),
  findOneAndUpdate: (query, update, options) =>
    isMockMode
      ? db.matches.findOneAndUpdate(query, update, options)
      : MongooseMatch.findOneAndUpdate(query, update, { new: true, runValidators: true, ...options }),
  deleteOne: (query) =>
    isMockMode ? db.matches.deleteOne(query) : MongooseMatch.deleteOne(query),
  countDocuments: (query) =>
    isMockMode ? db.matches.countDocuments(query) : MongooseMatch.countDocuments(query),
  aggregate: (pipeline) =>
    isMockMode ? db.matches.aggregate(pipeline) : MongooseMatch.aggregate(pipeline),
};

export { matchSchema };
