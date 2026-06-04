/**
 * Workout Model — GymBuddy
 * Stores individual workout sessions with detailed exercise data.
 */
import mongoose from 'mongoose';
import { isMockMode } from '../config/db.js';
import { db } from '../config/mockDb.js';

const EXERCISE_TYPES = [
  'Strength', 'Cardio', 'HIIT', 'Yoga', 'Pilates',
  'CrossFit', 'Swimming', 'Running', 'Cycling', 'Other',
];

const exerciseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Exercise name is required'],
      trim: true,
      maxlength: [80, 'Exercise name cannot exceed 80 characters'],
    },
    type: {
      type: String,
      enum: { values: EXERCISE_TYPES, message: 'Invalid exercise type' },
      default: 'Strength',
    },
    sets: {
      type: Number,
      default: 0,
      min: [0, 'Sets cannot be negative'],
      max: [200, 'Sets seems too high'],
    },
    reps: {
      type: Number,
      default: 0,
      min: [0, 'Reps cannot be negative'],
      max: [10000, 'Reps seems too high'],
    },
    weight: {
      type: Number,
      default: 0,
      min: [0, 'Weight cannot be negative'],
      max: [2000, 'Weight seems too high'],
    },
    durationSecs: {
      type: Number,
      default: 0, // for cardio exercises in seconds
      min: 0,
    },
    distance: {
      type: Number,
      default: 0, // km — for running / cycling
      min: 0,
    },
  },
  { _id: false }
);

const workoutSchema = new mongoose.Schema(
  {
    // ── References ──────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    // ── Session Metadata ─────────────────────────────────────────────
    date: {
      type: Date,
      required: [true, 'Workout date is required'],
      validate: {
        validator: (d) => d <= new Date(),
        message: 'Workout date cannot be in the future',
      },
    },
    duration: {
      type: Number,
      default: 0,
      min: [0, 'Duration cannot be negative'],
      max: [1440, 'Duration cannot exceed 1440 minutes (24h)'],
    },
    calories: {
      type: Number,
      default: 0,
      min: [0, 'Calories cannot be negative'],
      max: [10000, 'Calories seems too high'],
    },
    notes: {
      type: String,
      default: '',
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },

    // ── Exercises ────────────────────────────────────────────────────
    exercises: {
      type: [exerciseSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'At least one exercise is required per workout',
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtuals ────────────────────────────────────────────────────────────
/**
 * totalVolume: sum of (sets × reps × weight) across all strength exercises.
 * This is the standard "training volume" metric used by powerlifters.
 */
workoutSchema.virtual('totalVolume').get(function () {
  return this.exercises.reduce((sum, ex) => {
    return sum + (ex.sets || 0) * (ex.reps || 0) * (ex.weight || 1);
  }, 0);
});

// ── Indexes ─────────────────────────────────────────────────────────────
// Primary compound index: fast history + date-range queries per user
workoutSchema.index({ userId: 1, date: -1 });
// Secondary: for weekly/monthly aggregation queries
workoutSchema.index({ userId: 1, createdAt: -1 });
// For leaderboard / global stats
workoutSchema.index({ date: -1 });

const MongooseWorkout = mongoose.models.Workout || mongoose.model('Workout', workoutSchema);

// ── Dual-mode proxy ─────────────────────────────────────────────────────
export const Workout = {
  find: (query, projection) =>
    isMockMode ? db.workouts.find(query) : MongooseWorkout.find(query, projection),
  findOne: (query, projection) =>
    isMockMode ? db.workouts.findOne(query) : MongooseWorkout.findOne(query, projection),
  findById: (id, projection) =>
    isMockMode ? db.workouts.findById(id) : MongooseWorkout.findById(id, projection),
  create: (data) =>
    isMockMode ? db.workouts.create(data) : MongooseWorkout.create(data),
  findByIdAndUpdate: (id, update, options) =>
    isMockMode
      ? db.workouts.findByIdAndUpdate(id, update, options)
      : MongooseWorkout.findByIdAndUpdate(id, update, { new: true, runValidators: true, ...options }),
  deleteOne: (query) =>
    isMockMode ? db.workouts.deleteOne(query) : MongooseWorkout.deleteOne(query),
  countDocuments: (query) =>
    isMockMode ? db.workouts.countDocuments(query) : MongooseWorkout.countDocuments(query),
  aggregate: (pipeline) =>
    isMockMode ? db.workouts.aggregate(pipeline) : MongooseWorkout.aggregate(pipeline),
};

export { workoutSchema, EXERCISE_TYPES };
