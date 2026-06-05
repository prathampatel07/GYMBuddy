/**
 * app.js — Express application (without server.listen)
 * Exported separately so Supertest can import it for integration tests
 * without binding to a port.
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { sanitizeInputs } from './middleware/validate.js';
import { requestLogger, errorLogger } from './middleware/requestLogger.js';
import { maintenanceMode } from './config/featureFlags.js';
import logger from './config/logger.js';

// Routes
import authRoutes        from './routes/authRoutes.js';
import partnerRoutes     from './routes/partnerRoutes.js';
import workoutRoutes     from './routes/workoutRoutes.js';
import streakRoutes      from './routes/streakRoutes.js';
import rewardRoutes      from './routes/rewardRoutes.js';
import analyticsRoutes   from './routes/analyticsRoutes.js';
import aiRoutes          from './routes/aiRoutes.js';
import monitoringRoutes  from './routes/monitoringRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app = express();

// ── Database ──────────────────────────────────────────────────────────────
connectDB();

// ── Core Middleware ────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request Logging (before routes) ───────────────────────────────────────
app.use(requestLogger);

// ── Maintenance Mode Gate ─────────────────────────────────────────────────
app.use(maintenanceMode);

// Global XSS sanitiser — strips HTML/script tags from all string body fields
app.use(sanitizeInputs);

// Serve uploaded files (profile photos, streak proofs)
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

// ── Rate Limiting ──────────────────────────────────────────────────────────
app.use('/api/', apiLimiter);

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/partners',    partnerRoutes);
app.use('/api/workouts',    workoutRoutes);
app.use('/api/streaks',     streakRoutes);
app.use('/api/rewards',     rewardRoutes);
app.use('/api/analytics',   analyticsRoutes);
app.use('/api/ai',          aiRoutes);
app.use('/api/monitoring',  monitoringRoutes);

// ── Root & Legacy Health Check ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'GymBuddy API is running ✅', version: '2.0.0', timestamp: new Date().toISOString() });
});

// Legacy /api/health redirects to monitoring route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok'
  });
});

// ── 404 Handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ── Error Logger (must come before error handler) ─────────────────────────
app.use(errorLogger);

// ── Global Error Handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    message: err.message,
    requestId: req.requestId,
    // Never expose stack traces in production
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

export default app;
