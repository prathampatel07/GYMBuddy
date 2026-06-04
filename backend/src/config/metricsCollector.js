/**
 * metricsCollector.js — In-process application metrics
 *
 * Tracks:
 *  - Request counts per route/method/status
 *  - Response time percentiles (P50, P95, P99)
 *  - Active connections
 *  - Error rates
 *  - System health (memory, uptime, CPU usage estimate)
 *  - Per-endpoint performance breakdown
 *  - User activity counters (logins, workouts logged, etc.)
 */

// ── Sliding window of response times (last 1000 requests) ───────────────────
const WINDOW = 1000;
const responseTimes = [];

// ── Request counters ────────────────────────────────────────────────────────
const counters = {
  totalRequests:   0,
  totalErrors:     0,
  activeConnections: 0,
  // Per-status buckets
  status2xx: 0,
  status3xx: 0,
  status4xx: 0,
  status5xx: 0,
};

// ── Per-route metrics map: route → { count, totalMs, errors } ─────────────
const routeMetrics = new Map();

// ── Application event counters ──────────────────────────────────────────────
const appEvents = {
  registrations: 0,
  logins:        0,
  workoutsLogged: 0,
  streaksVerified: 0,
  rewardsRedeemed: 0,
  partnersMatched:  0,
  aiInsightsViewed: 0,
};

// ── Start time ──────────────────────────────────────────────────────────────
const startTime = Date.now();

// ── Helpers ──────────────────────────────────────────────────────────────────
function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function normaliseRoute(path) {
  return path
    .replace(/\/[0-9a-f]{24}/g, '/:id')          // MongoDB ObjectIds
    .replace(/\/[0-9a-z]{16,}/gi, '/:id')         // nanoid-style IDs
    .replace(/\?.*$/, '');                        // strip query strings
}

// ── Public API ───────────────────────────────────────────────────────────────
export const metrics = {
  /** Record a completed HTTP request */
  recordRequest(method, path, statusCode, durationMs) {
    counters.totalRequests++;

    const bucket = Math.floor(statusCode / 100);
    if (bucket === 2) counters.status2xx++;
    else if (bucket === 3) counters.status3xx++;
    else if (bucket === 4) counters.status4xx++;
    else if (bucket === 5) { counters.status5xx++; counters.totalErrors++; }

    // Sliding window response times
    responseTimes.push(durationMs);
    if (responseTimes.length > WINDOW) responseTimes.shift();

    // Per-route tracking
    const route = `${method} ${normaliseRoute(path)}`;
    if (!routeMetrics.has(route)) {
      routeMetrics.set(route, { count: 0, totalMs: 0, errors: 0, min: Infinity, max: 0 });
    }
    const rm = routeMetrics.get(route);
    rm.count++;
    rm.totalMs += durationMs;
    if (durationMs < rm.min) rm.min = durationMs;
    if (durationMs > rm.max) rm.max = durationMs;
    if (bucket === 5) rm.errors++;
  },

  /** Track active connections */
  incrementConnections() { counters.activeConnections++; },
  decrementConnections() { counters.activeConnections = Math.max(0, counters.activeConnections - 1); },

  /** Track application-level events */
  track(event) {
    if (event in appEvents) appEvents[event]++;
  },

  /** Get full metrics snapshot */
  getSnapshot() {
    const uptimeMs  = Date.now() - startTime;
    const mem       = process.memoryUsage();
    const avg       = responseTimes.length
      ? responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length
      : 0;

    // Top 10 slowest routes by average response time
    const topRoutes = Array.from(routeMetrics.entries())
      .map(([route, rm]) => ({
        route,
        requests: rm.count,
        avgMs:    rm.count ? Math.round(rm.totalMs / rm.count) : 0,
        p95Ms:    0, // simplified — per-route percentiles need separate tracking
        minMs:    rm.min === Infinity ? 0 : rm.min,
        maxMs:    rm.max,
        errorRate: rm.count ? `${((rm.errors / rm.count) * 100).toFixed(1)}%` : '0%',
      }))
      .sort((a, b) => b.avgMs - a.avgMs)
      .slice(0, 10);

    return {
      uptime: {
        ms:      uptimeMs,
        seconds: Math.floor(uptimeMs / 1000),
        human:   formatUptime(uptimeMs),
      },
      requests: {
        ...counters,
        windowSize: responseTimes.length,
        errorRate: counters.totalRequests
          ? `${((counters.totalErrors / counters.totalRequests) * 100).toFixed(2)}%`
          : '0%',
      },
      latency: {
        avgMs: Math.round(avg),
        p50Ms: percentile(responseTimes, 50),
        p95Ms: percentile(responseTimes, 95),
        p99Ms: percentile(responseTimes, 99),
        minMs: responseTimes.length ? Math.min(...responseTimes) : 0,
        maxMs: responseTimes.length ? Math.max(...responseTimes) : 0,
      },
      memory: {
        rssBytes:      mem.rss,
        heapUsedBytes: mem.heapUsed,
        heapTotalBytes: mem.heapTotal,
        externalBytes: mem.external,
        rssMB:  +(mem.rss / 1024 / 1024).toFixed(1),
        heapMB: +(mem.heapUsed / 1024 / 1024).toFixed(1),
      },
      appEvents,
      topRoutes,
      collectedAt: new Date().toISOString(),
    };
  },

  /** Reset counters (useful for testing) */
  reset() {
    responseTimes.length = 0;
    Object.keys(counters).forEach(k => { counters[k] = 0; });
    Object.keys(appEvents).forEach(k => { appEvents[k] = 0; });
    routeMetrics.clear();
  },
};

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0)  return `${d}d ${h % 24}h ${m % 60}m`;
  if (h > 0)  return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0)  return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export default metrics;
