/**
 * monitoringRoutes.js — Internal monitoring & observability API
 *
 * All routes require the MONITORING_SECRET header for protection.
 * Never expose these endpoints publicly without that header check.
 *
 * Endpoints:
 *  GET /api/monitoring/health    — Enhanced health check (public)
 *  GET /api/monitoring/metrics   — Full performance metrics (secret)
 *  GET /api/monitoring/logs      — Recent log tail (secret)
 *  GET /api/monitoring/features  — Feature flag status (secret)
 *  POST /api/monitoring/flag     — Toggle a feature flag (secret)
 *  GET /api/monitoring/version   — Build/version info (public)
 */

import express from 'express';
import os from 'os';
import { metrics }  from '../config/metricsCollector.js';
import logger       from '../config/logger.js';
import { FEATURES } from '../config/featureFlags.js';

const router = express.Router();

// ── Auth guard for sensitive monitoring endpoints ────────────────────────────
function requireMonitoringSecret(req, res, next) {
  const token = req.headers['x-monitoring-secret'] || req.query.secret;
  if (token && token === process.env.MONITORING_SECRET) return next();
  return res.status(403).json({ message: 'Forbidden' });
}

// ── GET /api/monitoring/health ─────────────────────────────────────────────
// Public — used by Render health checks and uptime monitors
router.get('/health', (req, res) => {
  const mem  = process.memoryUsage();
  const snap = metrics.getSnapshot();

  const status = {
    status:    'ok',
    timestamp: new Date().toISOString(),
    uptime:    snap.uptime.human,
    version:   process.env.npm_package_version || '1.0.0',
    env:       process.env.NODE_ENV || 'development',
    db:        process.env.MONGODB_URI ? 'mongodb' : 'mock',
    memory: {
      heapMB: snap.memory.heapMB,
      rssMB:  snap.memory.rssMB,
    },
    requests: {
      total:     snap.requests.totalRequests,
      errorRate: snap.requests.errorRate,
      avgLatencyMs: snap.latency.avgMs,
    },
  };

  // Return 503 if error rate > 20%
  const errRate = parseFloat(snap.requests.errorRate);
  if (errRate > 20) {
    status.status = 'degraded';
    return res.status(503).json(status);
  }

  res.json(status);
});

// ── GET /api/monitoring/version ────────────────────────────────────────────
router.get('/version', (req, res) => {
  res.json({
    version:    process.env.npm_package_version || '1.0.0',
    nodeVersion: process.version,
    platform:   process.platform,
    env:        process.env.NODE_ENV || 'development',
    buildAt:    process.env.BUILD_TIMESTAMP || 'unknown',
    gitCommit:  process.env.GIT_COMMIT_SHA  || 'unknown',
  });
});

// ── GET /api/monitoring/metrics ────────────────────────────────────────────
router.get('/metrics', requireMonitoringSecret, (req, res) => {
  const snap = metrics.getSnapshot();
  const system = {
    hostname:    os.hostname(),
    platform:    os.platform(),
    arch:        os.arch(),
    cpus:        os.cpus().length,
    loadAvg:     os.loadavg(),
    totalMemMB:  +(os.totalmem() / 1024 / 1024).toFixed(1),
    freeMemMB:   +(os.freemem() / 1024 / 1024).toFixed(1),
    nodeVersion: process.version,
    pid:         process.pid,
  };

  res.json({ ...snap, system });
});

// ── GET /api/monitoring/logs ───────────────────────────────────────────────
router.get('/logs', requireMonitoringSecret, (req, res) => {
  const n     = Math.min(parseInt(req.query.n) || 50, 200);
  const level = req.query.level || null;
  const logs  = logger.getRecentLogs(n, level);
  res.json({ count: logs.length, logs });
});

// ── GET /api/monitoring/features ──────────────────────────────────────────
router.get('/features', requireMonitoringSecret, (req, res) => {
  res.json({ features: { ...FEATURES } });
});

// ── POST /api/monitoring/flag ──────────────────────────────────────────────
router.post('/flag', requireMonitoringSecret, (req, res) => {
  const { key, value } = req.body;
  if (!(key in FEATURES)) {
    return res.status(400).json({ message: `Unknown feature flag: ${key}` });
  }
  FEATURES[key] = Boolean(value);
  logger.info(`Feature flag updated: ${key} = ${FEATURES[key]}`, {
    updatedBy: req.headers['x-admin-user'] || 'api',
  });
  res.json({ message: 'Flag updated', key, value: FEATURES[key] });
});

export default router;
