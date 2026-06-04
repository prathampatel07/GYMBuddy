/**
 * logger.js — Structured application logger
 * 
 * Features:
 *  - JSON format in production (machine-parseable by log aggregators)
 *  - Coloured pretty-print in development
 *  - Auto-rotated daily log files (combined + error-only)
 *  - Child loggers with bound context (requestId, userId, etc.)
 *  - Zero dependencies — uses only Node.js built-ins
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Config ─────────────────────────────────────────────────────────────────
const CONFIG = {
  level:    process.env.LOG_LEVEL  || 'info',
  format:   process.env.LOG_FORMAT || (process.env.NODE_ENV === 'production' ? 'json' : 'pretty'),
  toFile:   process.env.LOG_TO_FILE === 'true',
  dir:      process.env.LOG_DIR    || path.join(__dirname, '../../logs'),
  appName:  'gymbuddy-api',
};

const LEVELS = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const COLORS = { error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[36m', http: '\x1b[35m', debug: '\x1b[37m', reset: '\x1b[0m' };

// ── File Streams ────────────────────────────────────────────────────────────
let combinedStream = null;
let errorStream    = null;

function ensureLogDir() {
  if (!fs.existsSync(CONFIG.dir)) {
    fs.mkdirSync(CONFIG.dir, { recursive: true });
  }
}

function getLogPath(type) {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(CONFIG.dir, `${type}-${date}.log`);
}

function getStream(type) {
  if (!CONFIG.toFile) return null;
  ensureLogDir();
  return fs.createWriteStream(getLogPath(type), { flags: 'a' });
}

// ── Formatter ───────────────────────────────────────────────────────────────
function formatLog(level, message, meta = {}) {
  const ts = new Date().toISOString();
  const entry = {
    timestamp: ts,
    level,
    app:       CONFIG.appName,
    message,
    ...meta,
  };

  if (CONFIG.format === 'json') {
    return JSON.stringify(entry);
  }

  // Pretty coloured format for dev
  const color  = COLORS[level] || COLORS.reset;
  const reset  = COLORS.reset;
  const metaStr = Object.keys(meta).length
    ? ' ' + JSON.stringify(meta, null, 0)
    : '';
  return `${color}[${ts}] [${level.toUpperCase().padEnd(5)}]${reset} ${message}${metaStr}`;
}

// ── Core Write ───────────────────────────────────────────────────────────────
function write(level, message, meta = {}) {
  if (LEVELS[level] > LEVELS[CONFIG.level]) return;

  const line = formatLog(level, message, meta);

  // Console output
  if (level === 'error' || level === 'warn') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }

  // File output
  if (CONFIG.toFile) {
    if (!combinedStream) combinedStream = getStream('combined');
    combinedStream.write(line + '\n');

    if (level === 'error') {
      if (!errorStream) errorStream = getStream('error');
      errorStream.write(line + '\n');
    }
  }
}

// ── In-memory Recent Logs Ring Buffer (for /api/monitoring/logs) ─────────────
const RING_SIZE = 200;
const recentLogs = [];

function pushToRing(level, message, meta) {
  recentLogs.push({ timestamp: new Date().toISOString(), level, message, meta });
  if (recentLogs.length > RING_SIZE) recentLogs.shift();
}

// ── Public Logger API ────────────────────────────────────────────────────────
const logger = {
  error: (msg, meta = {}) => { write('error', msg, meta); pushToRing('error', msg, meta); },
  warn:  (msg, meta = {}) => { write('warn',  msg, meta); pushToRing('warn',  msg, meta); },
  info:  (msg, meta = {}) => { write('info',  msg, meta); pushToRing('info',  msg, meta); },
  http:  (msg, meta = {}) => { write('http',  msg, meta); pushToRing('http',  msg, meta); },
  debug: (msg, meta = {}) => { write('debug', msg, meta); pushToRing('debug', msg, meta); },

  /** Create a child logger that binds extra context to every log call */
  child: (context = {}) => ({
    error: (msg, meta = {}) => logger.error(msg, { ...context, ...meta }),
    warn:  (msg, meta = {}) => logger.warn(msg,  { ...context, ...meta }),
    info:  (msg, meta = {}) => logger.info(msg,  { ...context, ...meta }),
    http:  (msg, meta = {}) => logger.http(msg,  { ...context, ...meta }),
    debug: (msg, meta = {}) => logger.debug(msg, { ...context, ...meta }),
  }),

  /** Return the last N recent logs (used by monitoring endpoint) */
  getRecentLogs: (n = 50, levelFilter = null) => {
    const logs = levelFilter
      ? recentLogs.filter(l => l.level === levelFilter)
      : recentLogs;
    return logs.slice(-n);
  },
};

export default logger;
