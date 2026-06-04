/**
 * requestLogger.js — HTTP request/response logging middleware
 *
 * Logs every request with:
 *  - Method, path, status code, duration
 *  - Request ID (UUID v4) injected into req/res headers
 *  - User ID from JWT (if authenticated)
 *  - IP address (respects X-Forwarded-For from Render/Vercel)
 *  - Body size
 *  - Slow request warnings (> 1000ms)
 *  - Error capture with stack trace
 */

import crypto from 'crypto';
import logger from '../config/logger.js';
import { metrics } from '../config/metricsCollector.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

const SENSITIVE_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/reset-password'];
const SKIP_PATHS      = ['/api/health', '/favicon.ico', '/public/'];

// ── Request Logger Middleware ─────────────────────────────────────────────────
export function requestLogger(req, res, next) {
  // Skip noisy health-check and static paths
  if (SKIP_PATHS.some(p => req.path.startsWith(p))) return next();

  // Inject unique request ID for distributed tracing
  const requestId = crypto.randomUUID();
  req.requestId   = requestId;
  res.setHeader('X-Request-Id', requestId);

  const start  = Date.now();
  const ip     = getClientIp(req);
  const method = req.method;
  const url    = req.originalUrl || req.url;

  // Log request arrival
  logger.http(`→ ${method} ${url}`, {
    requestId,
    ip,
    userAgent: req.headers['user-agent']?.substring(0, 80),
    contentLength: req.headers['content-length'] || 0,
  });

  // Track active connections
  metrics.incrementConnections();

  // Intercept response finish
  res.on('finish', () => {
    const duration   = Date.now() - start;
    const status     = res.statusCode;
    const userId     = req.user?._id || req.user?.id || 'anon';

    // Record in metrics
    metrics.recordRequest(method, url, status, duration);
    metrics.decrementConnections();

    const meta = {
      requestId,
      method,
      url,
      status,
      duration: `${duration}ms`,
      ip,
      userId,
    };

    if (status >= 500) {
      logger.error(`← ${method} ${url} [${status}] ${duration}ms`, meta);
    } else if (status >= 400) {
      logger.warn(`← ${method} ${url} [${status}] ${duration}ms`, meta);
    } else if (duration > 1000) {
      logger.warn(`⚠️  SLOW ${method} ${url} [${status}] ${duration}ms`, { ...meta, threshold: '1000ms' });
    } else {
      logger.http(`← ${method} ${url} [${status}] ${duration}ms`, meta);
    }
  });

  // Intercept response error
  res.on('error', (err) => {
    metrics.decrementConnections();
    logger.error(`✗ Response error on ${method} ${url}`, {
      requestId,
      error: err.message,
      stack: err.stack,
    });
  });

  next();
}

// ── Error Logger Middleware (attach after all routes) ─────────────────────────
export function errorLogger(err, req, res, next) {
  const requestId = req.requestId || 'unknown';
  const userId    = req.user?._id || 'anon';

  logger.error(`💥 Unhandled error: ${err.message}`, {
    requestId,
    userId,
    method:  req.method,
    url:     req.originalUrl,
    stack:   err.stack,
    code:    err.code,
    status:  err.status || 500,
  });

  next(err); // Pass to Express default error handler
}
