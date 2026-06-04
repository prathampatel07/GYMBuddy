/**
 * User Model — GymBuddy
 * Full Mongoose schema with validation, indexes, virtuals, and mock/real proxy.
 */
import mongoose from 'mongoose';
import { isMockMode } from '../config/db.js';
import { db } from '../config/mockDb.js';

const FITNESS_GOALS = ['Strength', 'Cardio', 'Weight Loss', 'Flexibility', 'Endurance', 'General Fitness'];
const SCHEDULE_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'Weekends'];

const userSchema = new mongoose.Schema(
  {
    // ── Core Identity ────────────────────────────────────────────────
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Never return password in queries by default
    },
    role: {
      type: String,
      enum: { values: ['user', 'admin'], message: 'Role must be user or admin' },
      default: 'user',
    },

    // ── Profile Metrics ──────────────────────────────────────────────
    name: {
      type: String,
      trim: true,
      maxlength: [60, 'Name cannot exceed 60 characters'],
      default: '',
    },
    age: {
      type: Number,
      min: [13, 'Age must be at least 13'],
      max: [100, 'Age must be at most 100'],
      default: null,
    },
    gender: {
      type: String,
      enum: {
        values: ['Male', 'Female', 'Other', 'Prefer not to say', ''],
        message: 'Invalid gender value',
      },
      default: '',
    },
    height: {
      type: Number,
      min: [50, 'Height must be at least 50 cm'],
      max: [300, 'Height must be at most 300 cm'],
      default: null,
    },
    weight: {
      type: Number,
      min: [20, 'Weight must be at least 20 kg'],
      max: [500, 'Weight must be at most 500 kg'],
      default: null,
    },
    fitnessLevel: {
      type: String,
      enum: {
        values: ['Beginner', 'Intermediate', 'Advanced'],
        message: 'Fitness level must be Beginner, Intermediate or Advanced',
      },
      default: 'Beginner',
    },
    profilePhotoUrl: {
      type: String,
      default: '',
    },

    // ── Fitness Preferences ──────────────────────────────────────────
    fitnessGoals: {
      type: [String],
      validate: {
        validator: (goals) => goals.every((g) => FITNESS_GOALS.includes(g)),
        message: `Fitness goals must be one of: ${FITNESS_GOALS.join(', ')}`,
      },
      default: [],
    },
    schedule: {
      type: [String],
      validate: {
        validator: (sched) => sched.every((s) => SCHEDULE_OPTIONS.includes(s)),
        message: `Schedule must be one of: ${SCHEDULE_OPTIONS.join(', ')}`,
      },
      default: [],
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters'],
      default: '',
    },

    // ── Gamification State ───────────────────────────────────────────
    coins: {
      type: Number,
      default: 100, // 100 welcome bonus
      min: [0, 'Coins cannot be negative'],
    },
    streakCount: {
      type: Number,
      default: 0,
      min: [0, 'Streak count cannot be negative'],
    },
    longestStreak: {
      type: Number,
      default: 0,
      min: [0, 'Longest streak cannot be negative'],
    },
    lastWorkoutDate: {
      type: Date,
      default: null,
    },
    totalWorkouts: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── Partner Reference ────────────────────────────────────────────
    activePartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // ── Redeemed Rewards (embedded for fast reads) ───────────────────
    redeemedRewards: [
      {
        rewardId: { type: String, required: true },
        rewardName: { type: String },
        coinCost: { type: Number },
        redeemedAt: { type: Date, default: Date.now },
      },
    ],

    // ── Password Reset ───────────────────────────────────────────────
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpire: { type: Date, select: false },
  },
  {
    timestamps: true, // createdAt, updatedAt auto-managed
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtuals ──────────────────────────────────────────────────────────
userSchema.virtual('bmi').get(function () {
  if (!this.height || !this.weight || this.height === 0) return null;
  const bmi = this.weight / (this.height / 100) ** 2;
  return Math.round(bmi * 10) / 10;
});

userSchema.virtual('bmiCategory').get(function () {
  const bmi = this.bmi;
  if (!bmi) return null;
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
});

// ── Indexes ────────────────────────────────────────────────────────────
// Compound index for partner matching queries
userSchema.index({ fitnessLevel: 1, location: 1 });
// Compound index for leaderboard queries
userSchema.index({ streakCount: -1, totalWorkouts: -1 });
// Text search index
userSchema.index({ username: 'text', name: 'text', location: 'text' });

// ── Pre-save hook: keep longestStreak in sync ──────────────────────────
userSchema.pre('save', function (next) {
  if (this.streakCount > this.longestStreak) {
    this.longestStreak = this.streakCount;
  }
  next();
});

const MongooseUser = mongoose.models.User || mongoose.model('User', userSchema);

// ── Dual-mode proxy ────────────────────────────────────────────────────
export const User = {
  find: (query, projection) =>
    isMockMode ? db.users.find(query) : MongooseUser.find(query, projection),
  findOne: (query, projection) =>
    isMockMode ? db.users.findOne(query) : MongooseUser.findOne(query, projection),
  findById: (id, projection) =>
    isMockMode ? db.users.findById(id) : MongooseUser.findById(id, projection),
  create: (data) =>
    isMockMode ? db.users.create(data) : MongooseUser.create(data),
  findByIdAndUpdate: (id, update, options) =>
    isMockMode
      ? db.users.findByIdAndUpdate(id, update, options)
      : MongooseUser.findByIdAndUpdate(id, update, { new: true, runValidators: true, ...options }),
  findOneAndUpdate: (query, update, options) =>
    isMockMode
      ? db.users.findOneAndUpdate(query, update, options)
      : MongooseUser.findOneAndUpdate(query, update, { new: true, runValidators: true, ...options }),
  deleteOne: (query) =>
    isMockMode ? db.users.deleteOne(query) : MongooseUser.deleteOne(query),
  countDocuments: (query) =>
    isMockMode ? db.users.countDocuments(query) : MongooseUser.countDocuments(query),
  aggregate: (pipeline) =>
    isMockMode ? db.users.aggregate(pipeline) : MongooseUser.aggregate(pipeline),
};

export { userSchema };
