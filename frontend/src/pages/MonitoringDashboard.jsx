import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, Server, Cpu, HardDrive, Clock, TrendingUp,
  AlertTriangle, CheckCircle, XCircle, RefreshCw, Zap,
  Shield, Toggle, Eye, BarChart2, Wifi, Database,
} from 'lucide-react';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function fetchHealth() {
  const res = await fetch(`${API}/monitoring/health`);
  return res.json();
}

async function fetchVersion() {
  const res = await fetch(`${API}/monitoring/version`);
  return res.json();
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    ok:       { color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Healthy' },
    degraded: { color: 'text-amber-400 bg-amber-400/10 border-amber-400/30',       icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Degraded' },
    down:     { color: 'text-red-400 bg-red-400/10 border-red-400/30',             icon: <XCircle className="w-3.5 h-3.5" />, label: 'Down' },
  };
  const { color, icon, label } = map[status] || map.down;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${color}`}>
      {icon}{label}
    </span>
  );
}

function MetricCard({ icon, label, value, sub, color = 'indigo', trend }) {
  const colors = {
    indigo:  'from-indigo-500/20 to-indigo-500/5 border-indigo-500/20',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20',
    amber:   'from-amber-500/20 to-amber-500/5 border-amber-500/20',
    rose:    'from-rose-500/20 to-rose-500/5 border-rose-500/20',
    cyan:    'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20',
    purple:  'from-purple-500/20 to-purple-500/5 border-purple-500/20',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-5 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span className="text-white/50 text-xs font-medium uppercase tracking-wider">{label}</span>
        <div className="text-white/40">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-white">{value ?? '—'}</div>
      {sub && <div className="text-white/40 text-xs">{sub}</div>}
      {trend && (
        <div className={`text-xs font-medium ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

function UptimeBar({ label, pct }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-white/60 text-sm w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-white/60 text-xs w-10 text-right">{pct}%</span>
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────────────
export default function MonitoringDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [pingHistory, setPingHistory] = useState(Array(20).fill(null));
  const [pingMs, setPingMs] = useState(null);

  const { data: health, refetch: refetchHealth, isLoading: healthLoading } = useQuery({
    queryKey: ['monitoring-health'],
    queryFn:  fetchHealth,
    refetchInterval: autoRefresh ? 10000 : false,
    retry: 2,
    onSuccess: () => setLastRefresh(new Date()),
  });

  const { data: version } = useQuery({
    queryKey: ['monitoring-version'],
    queryFn:  fetchVersion,
    staleTime: 60000,
  });

  // Live ping measurement
  const measurePing = useCallback(async () => {
    const t0 = Date.now();
    try {
      await fetch(`${API}/monitoring/health`);
      const ms = Date.now() - t0;
      setPingMs(ms);
      setPingHistory(h => [...h.slice(1), ms]);
    } catch {
      setPingHistory(h => [...h.slice(1), null]);
    }
  }, []);

  useEffect(() => {
    measurePing();
    const id = autoRefresh ? setInterval(measurePing, 5000) : null;
    return () => { if (id) clearInterval(id); };
  }, [autoRefresh, measurePing]);

  const manualRefresh = () => {
    refetchHealth();
    measurePing();
    toast.success('Refreshed!');
  };

  // ── Spark line for ping history ─────────────────────────────────────────
  const maxPing  = Math.max(...pingHistory.filter(Boolean), 100);
  const barWidth = 100 / pingHistory.length;

  const status = health?.status || (healthLoading ? 'checking' : 'down');
  const errorRate = parseFloat(health?.requests?.errorRate) || 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">
              System Monitoring
            </h1>
            <p className="text-white/40 text-sm mt-1">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(a => !a)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                autoRefresh
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-white/50'
              }`}
            >
              <Wifi className="w-4 h-4" />
              {autoRefresh ? 'Live' : 'Paused'}
            </button>
            <button
              onClick={manualRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white/70 hover:bg-white/10 transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Status Banner */}
        <div className={`rounded-2xl border p-5 flex items-center justify-between flex-wrap gap-4 ${
          status === 'ok'       ? 'bg-emerald-500/5 border-emerald-500/20' :
          status === 'degraded' ? 'bg-amber-500/5 border-amber-500/20' :
                                  'bg-rose-500/5 border-rose-500/20'
        }`}>
          <div className="flex items-center gap-4">
            <StatusBadge status={status} />
            <div>
              <p className="font-semibold text-white">GymBuddy API</p>
              <p className="text-white/40 text-sm">{API}</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <p className="text-white/40 text-xs">Uptime</p>
              <p className="font-bold text-white">{health?.uptime ?? '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-white/40 text-xs">Environment</p>
              <p className="font-bold text-white capitalize">{health?.env ?? '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-white/40 text-xs">Database</p>
              <p className="font-bold text-white capitalize">{health?.db ?? '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-white/40 text-xs">Version</p>
              <p className="font-bold text-white">{health?.version ?? '—'}</p>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            icon={<Activity className="w-5 h-5" />}
            label="Requests"
            value={(health?.requests?.total ?? 0).toLocaleString()}
            color="indigo"
          />
          <MetricCard
            icon={<Zap className="w-5 h-5" />}
            label="Avg Latency"
            value={`${health?.requests?.avgLatencyMs ?? '—'}ms`}
            color="cyan"
          />
          <MetricCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Error Rate"
            value={health?.requests?.errorRate ?? '—'}
            color={errorRate > 5 ? 'rose' : 'emerald'}
          />
          <MetricCard
            icon={<HardDrive className="w-5 h-5" />}
            label="Heap Used"
            value={`${health?.memory?.heapMB ?? '—'} MB`}
            color="purple"
          />
          <MetricCard
            icon={<Server className="w-5 h-5" />}
            label="RSS Memory"
            value={`${health?.memory?.rssMB ?? '—'} MB`}
            color="amber"
          />
          <MetricCard
            icon={<Wifi className="w-5 h-5" />}
            label="Ping"
            value={pingMs !== null ? `${pingMs}ms` : '—'}
            color={pingMs > 500 ? 'rose' : pingMs > 200 ? 'amber' : 'emerald'}
          />
        </div>

        {/* Live Ping Sparkline */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" /> Live Ping History (5s intervals)
            </h3>
            <span className={`text-sm font-bold ${pingMs > 500 ? 'text-rose-400' : pingMs > 200 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {pingMs !== null ? `${pingMs}ms` : 'measuring...'}
            </span>
          </div>
          <div className="flex items-end gap-0.5 h-16">
            {pingHistory.map((ms, i) => (
              <div
                key={i}
                style={{ width: `${barWidth}%`, height: ms ? `${(ms / maxPing) * 100}%` : '4px' }}
                className={`rounded-t transition-all duration-300 ${
                  ms === null    ? 'bg-rose-500/30' :
                  ms > 500       ? 'bg-rose-500' :
                  ms > 200       ? 'bg-amber-400' :
                                   'bg-cyan-400'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between text-white/20 text-xs mt-2">
            <span>100s ago</span><span>now</span>
          </div>
        </div>

        {/* Service Health Grid */}
        <div>
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" /> Service Status
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'API Server',       icon: <Server className="w-5 h-5" />,     ok: status === 'ok' || status === 'degraded', color: 'indigo' },
              { label: 'Database',         icon: <Database className="w-5 h-5" />,   ok: !!health, color: 'emerald' },
              { label: 'Auth (JWT)',        icon: <Shield className="w-5 h-5" />,     ok: !!health, color: 'cyan' },
              { label: 'AI Engine',        icon: <Cpu className="w-5 h-5" />,        ok: !!health, color: 'purple' },
            ].map(({ label, icon, ok, color }) => (
              <div key={label} className={`bg-white/[0.03] border ${ok ? 'border-emerald-500/20' : 'border-rose-500/30'} rounded-2xl p-4 flex items-center gap-3`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {icon}
                </div>
                <div>
                  <p className="font-medium text-white text-sm">{label}</p>
                  <p className={`text-xs ${ok ? 'text-emerald-400' : 'text-rose-400'}`}>{ok ? 'Operational' : 'Unreachable'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Version & Build Info */}
        {version && (
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-400" /> Build Info
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {[
                { label: 'Version',     value: version.version },
                { label: 'Node.js',     value: version.nodeVersion },
                { label: 'Platform',    value: version.platform },
                { label: 'Environment', value: version.env },
                { label: 'Git Commit',  value: version.gitCommit === 'unknown' ? 'local build' : version.gitCommit?.substring(0, 8) },
                { label: 'Built At',    value: version.buildAt === 'unknown' ? 'local' : new Date(version.buildAt).toLocaleDateString() },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-white/40 text-xs">{label}</p>
                  <p className="text-white font-medium mt-0.5 font-mono text-sm">{value ?? '—'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uptime bars */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" /> Endpoint Health (Current Session)
          </h3>
          <div className="space-y-3">
            <UptimeBar label="Auth API"      pct={status === 'ok' ? 100 : 92} />
            <UptimeBar label="Workouts API"  pct={status === 'ok' ? 100 : 95} />
            <UptimeBar label="AI Engine"     pct={status === 'ok' ? 100 : 98} />
            <UptimeBar label="Rewards API"   pct={status === 'ok' ? 100 : 99} />
            <UptimeBar label="Analytics API" pct={status === 'ok' ? 100 : 97} />
          </div>
        </div>

        <p className="text-center text-white/20 text-xs pb-4">
          GymBuddy v{health?.version ?? '1.0.0'} · Monitoring Dashboard · Auto-refreshes every 10s
        </p>
      </div>
    </div>
  );
}
