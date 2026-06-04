/**
 * RewardItem Model — GymBuddy
 * Represents a single item in the Fitness Coins marketplace.
 * Replaces the hardcoded defaultRewards array in rewardRoutes.js.
 */
import mongoose from 'mongoose';
import { isMockMode } from '../config/db.js';
import { db } from '../config/mockDb.js';

const REWARD_CATEGORIES = ['Merchandise', 'Supplements', 'Access', 'Training', 'Digital'];

const rewardItemSchema = new mongoose.Schema(
  {
    // ── Identity ───────────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Reward name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    icon: {
      type: String,
      default: '🎁',
      maxlength: [10, 'Icon emoji cannot exceed 10 characters'],
    },

    // ── Categorisation ─────────────────────────────────────────────────
    category: {
      type: String,
      enum: {
        values: REWARD_CATEGORIES,
        message: `Category must be one of: ${REWARD_CATEGORIES.join(', ')}`,
      },
      required: [true, 'Category is required'],
      index: true,
    },

    // ── Pricing ────────────────────────────────────────────────────────
    coinCost: {
      type: Number,
      required: [true, 'Coin cost is required'],
      min: [1, 'Coin cost must be at least 1'],
      max: [100000, 'Coin cost cannot exceed 100,000'],
    },

    // ── Inventory ──────────────────────────────────────────────────────
    stock: {
      type: Number,
      default: -1, // -1 = unlimited stock
      min: [-1, 'Stock cannot be less than -1'],
    },
    totalRedeemed: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ── Availability ──────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    availableFrom: {
      type: Date,
      default: null,
    },
    availableUntil: {
      type: Date,
      default: null,
    },

    // ── Metadata ──────────────────────────────────────────────────────
    tags: {
      type: [String],
      default: [],
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtuals ──────────────────────────────────────────────────────────────
rewardItemSchema.virtual('inStock').get(function () {
  if (this.stock === -1) return true;
  return this.stock > 0;
});

rewardItemSchema.virtual('isAvailable').get(function () {
  if (!this.isActive) return false;
  const now = new Date();
  if (this.availableFrom && now < this.availableFrom) return false;
  if (this.availableUntil && now > this.availableUntil) return false;
  return this.inStock;
});

// ── Indexes ────────────────────────────────────────────────────────────────
rewardItemSchema.index({ category: 1, isActive: 1 });
rewardItemSchema.index({ coinCost: 1 });
rewardItemSchema.index({ sortOrder: 1, coinCost: 1 });

const MongooseRewardItem =
  mongoose.models.RewardItem || mongoose.model('RewardItem', rewardItemSchema);

// ── Default seed data ──────────────────────────────────────────────────────
export const DEFAULT_REWARD_ITEMS = [
  { name: 'Gym Buddy T-Shirt',           category: 'Merchandise',  coinCost: 500,  icon: '👕', description: 'Premium Gym Buddy branded performance tee, available in 4 sizes.',        stock: -1 },
  { name: 'Resistance Band Set',          category: 'Merchandise',  coinCost: 400,  icon: '🔗', description: '5 bands of varying resistance levels — perfect for home workouts.',       stock: -1 },
  { name: 'Protein Powder Sample Pack',   category: 'Supplements',  coinCost: 250,  icon: '🥤', description: 'High-quality whey protein, 5 individual serving sachets.',               stock: -1 },
  { name: 'Creatine Monohydrate (30d)',   category: 'Supplements',  coinCost: 350,  icon: '💊', description: '30-day supply of pure micronised creatine monohydrate.',                 stock: -1 },
  { name: '1 Month Premium Access',       category: 'Access',       coinCost: 1200, icon: '⭐', description: 'Unlock all advanced analytics, AI coaching, and priority matching.',    stock: -1 },
  { name: 'Gym Locker Access (1 Week)',   category: 'Access',       coinCost: 150,  icon: '🔐', description: 'Secure locker at any partner gym location for 7 days.',                  stock: -1 },
  { name: 'Personal Training Session',    category: 'Training',     coinCost: 800,  icon: '🏋️', description: '60-minute one-on-one session with a certified personal trainer.',        stock: 50 },
  { name: '8-Week Strength Program',      category: 'Training',     coinCost: 600,  icon: '📋', description: 'Expert-designed progressive overload strength & conditioning program.', stock: -1 },
  { name: 'Gym Buddy Water Bottle',       category: 'Merchandise',  coinCost: 300,  icon: '🍶', description: '750ml BPA-free insulated bottle with motivational quotes.',               stock: -1 },
  { name: 'Nutrition Plan (4 weeks)',     category: 'Digital',      coinCost: 450,  icon: '🥗', description: 'Personalised macro-based nutrition plan from a registered dietitian.',   stock: -1 },
];

/**
 * Seed default reward items on first run.
 * Safe to call multiple times — only inserts if catalog is empty.
 */
export async function seedRewardItems() {
  try {
    if (isMockMode) {
      const existing = await db.rewardItems.find({});
      if (existing.length === 0) {
        for (const item of DEFAULT_REWARD_ITEMS) {
          await db.rewardItems.create(item);
        }
        console.log(`🎁 Seeded ${DEFAULT_REWARD_ITEMS.length} reward items into mock DB`);
      }
    } else {
      const count = await MongooseRewardItem.countDocuments();
      if (count === 0) {
        await MongooseRewardItem.insertMany(DEFAULT_REWARD_ITEMS);
        console.log(`🎁 Seeded ${DEFAULT_REWARD_ITEMS.length} reward items into MongoDB`);
      }
    }
  } catch (err) {
    console.error('⚠️  Failed to seed reward items:', err.message);
  }
}

// ── Dual-mode proxy ──────────────────────────────────────────────────────
export const RewardItem = {
  find: (query, projection) =>
    isMockMode ? db.rewardItems.find(query) : MongooseRewardItem.find(query, projection),
  findOne: (query) =>
    isMockMode ? db.rewardItems.findOne(query) : MongooseRewardItem.findOne(query),
  findById: (id) =>
    isMockMode ? db.rewardItems.findById(id) : MongooseRewardItem.findById(id),
  create: (data) =>
    isMockMode ? db.rewardItems.create(data) : MongooseRewardItem.create(data),
  findByIdAndUpdate: (id, update, options) =>
    isMockMode
      ? db.rewardItems.findByIdAndUpdate(id, update, options)
      : MongooseRewardItem.findByIdAndUpdate(id, update, { new: true, ...options }),
  countDocuments: (query) =>
    isMockMode ? db.rewardItems.countDocuments(query) : MongooseRewardItem.countDocuments(query),
  insertMany: (items) =>
    isMockMode
      ? Promise.all(items.map((i) => db.rewardItems.create(i)))
      : MongooseRewardItem.insertMany(items),
};

export { REWARD_CATEGORIES };
