/**
 * featureFlags.js — Runtime feature flag management
 *
 * Flags are initialised from environment variables at startup.
 * They can be toggled at runtime via POST /api/monitoring/flag
 * without requiring a redeploy.
 *
 * Usage in routes:
 *   import { FEATURES, requireFeature } from '../config/featureFlags.js';
 *   if (!FEATURES.AI_MATCHING) return res.status(503).json({ message: 'Feature disabled' });
 *   // OR as middleware:
 *   router.get('/matches', requireFeature('AI_MATCHING'), handler);
 */

export const FEATURES = {
  AI_MATCHING:          process.env.FEATURE_AI_MATCHING          !== 'false',
  STREAK_VERIFICATION:  process.env.FEATURE_STREAK_VERIFICATION  !== 'false',
  REWARDS:              process.env.FEATURE_REWARDS              !== 'false',
  LEADERBOARD:          process.env.FEATURE_LEADERBOARD          !== 'false',
  MAINTENANCE_MODE:     process.env.ENABLE_MAINTENANCE_MODE      === 'true',
};

/**
 * Express middleware — returns 503 if the named feature flag is disabled.
 * @param {string} flagName - key in FEATURES
 */
export function requireFeature(flagName) {
  return (req, res, next) => {
    if (!FEATURES[flagName]) {
      return res.status(503).json({
        message:  `This feature is currently disabled.`,
        feature:  flagName,
        retryAfter: 3600,
      });
    }
    next();
  };
}

/**
 * Maintenance mode middleware — blocks all API traffic during deploys.
 * Allowlisted: /api/health, /api/monitoring/*
 */
export function maintenanceMode(req, res, next) {
  if (!FEATURES.MAINTENANCE_MODE) return next();
  if (req.path.startsWith('/api/health') || req.path.startsWith('/api/monitoring')) return next();
  return res.status(503).json({
    message: '🔧 GymBuddy is under maintenance. We\'ll be back shortly!',
    retryAfter: 600,
  });
}
