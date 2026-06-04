import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  Sparkles, Brain, Dumbbell, Flame, Target, Clock, Zap, Shield,
  ChevronRight, ChevronDown, BarChart3, Users, Lightbulb, Bell,
  TrendingUp, Award, RefreshCw, AlertTriangle, CheckCircle,
  Activity, Layers, Calendar, ArrowRight, Info
} from 'lucide-react';

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle, color = 'text-gym-green' }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`p-2 rounded-xl bg-gym-card border border-gym-border ${color}`}>{icon}</div>
      <div>
        <h2 className="text-lg font-extrabold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}

function StatPill({ label, value, color = 'text-gym-green', bg = 'bg-gym-green/10', border = 'border-gym-green/30' }) {
  return (
    <div className={`${bg} border ${border} rounded-xl px-4 py-2.5 text-center`}>
      <div className={`text-xl font-extrabold ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function NudgePriorityBadge({ type }) {
  const map = {
    urgent:  { color: 'bg-red-500/20 text-red-400 border-red-500/30', label: 'URGENT' },
    high:    { color: 'bg-gym-orange/20 text-gym-orange border-gym-orange/30', label: 'HIGH' },
    medium:  { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'MEDIUM' },
    social:  { color: 'bg-gym-teal/20 text-gym-teal border-gym-teal/30', label: 'SOCIAL' },
    reward:  { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', label: 'REWARD' },
    info:    { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'INFO' },
  };
  const style = map[type] || map.info;
  return (
    <span className={`text-[9px] font-black border px-1.5 py-0.5 rounded-full ${style.color}`}>
      {style.label}
    </span>
  );
}

// Circular score dial (SVG)
function ScoreDial({ score = 0, size = 100, label = 'Score', color = '#10b981' }) {
  const r = (size / 2) - 10;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f2937" strokeWidth="9" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
          strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-extrabold text-white">{score}</div>
        <div className="text-[10px] text-gray-500">{label}</div>
      </div>
    </div>
  );
}

// Weekly plan day card
function DayCard({ day, isExpanded, onToggle }) {
  const isRest = day.type === 'Rest';
  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${isRest ? 'border-gym-border opacity-60' : 'border-gym-border hover:border-gym-green/30'}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${isRest ? 'bg-gray-600' : 'bg-gym-green animate-pulse'}`} />
          <span className="text-sm font-bold text-white">{day.day}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isRest ? 'bg-gray-800 text-gray-500' : 'bg-gym-green/20 text-gym-green'}`}>
            {isRest ? 'Rest' : day.type}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!isRest && (
            <>
              <span className="text-xs text-gray-500">{day.estimatedDuration}min</span>
              <span className="text-xs text-gym-orange">~{day.estimatedCalories} kcal</span>
            </>
          )}
          {!isRest && (isExpanded
            ? <ChevronDown className="w-4 h-4 text-gray-400" />
            : <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {!isRest && isExpanded && (
        <div className="px-4 pb-4 space-y-1.5 border-t border-gym-border pt-3">
          {day.exercises.map((ex, i) => (
            <div key={i} className={`flex items-center justify-between py-1.5 ${ex.isWarmup ? 'opacity-60' : ''} ${ex.isCooldown ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ex.isWarmup || ex.isCooldown ? 'bg-gray-600' : 'bg-gym-green'}`} />
                <span className="text-xs text-gray-300">{ex.name}</span>
                {(ex.isWarmup || ex.isCooldown) && (
                  <span className="text-[9px] text-gray-600 italic">{ex.isWarmup ? 'Warm-up' : 'Cool-down'}</span>
                )}
              </div>
              <div className="text-xs text-gray-500 tabular-nums">
                {ex.duration
                  ? `${ex.duration}min`
                  : ex.sets && ex.reps
                  ? `${ex.sets}×${ex.reps}`
                  : ex.sets ? `${ex.sets} sets` : ''}
              </div>
            </div>
          ))}
          {day.tip && (
            <div className="mt-2 bg-gym-teal/10 border border-gym-teal/20 rounded-lg px-3 py-2 flex gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-gym-teal flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400 leading-relaxed">{day.tip}</p>
            </div>
          )}
        </div>
      )}

      {isRest && (
        <div className="px-4 pb-3 text-xs text-gray-600 italic">{day.tip}</div>
      )}
    </div>
  );
}

// Pillar bar for compatibility breakdown
function PillarBar({ label, value, max, color }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-bold">{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-gym-dark rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function AIInsights() {
  const { user } = useAuth();
  const [expandedDays, setExpandedDays] = useState({ 0: true }); // Monday open by default
  const [activeTab, setActiveTab] = useState('overview');

  const { data: motivation, isLoading: loadingMotivation, refetch: refetchMotivation } = useQuery({
    queryKey: ['ai-motivation'],
    queryFn: () => api.getMotivation(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: workoutPlan, isLoading: loadingPlan, refetch: refetchPlan } = useQuery({
    queryKey: ['ai-workout-plan'],
    queryFn: () => api.getWorkoutPlan(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: variety, isLoading: loadingVariety } = useQuery({
    queryKey: ['ai-variety'],
    queryFn: () => api.getVarietyAnalysis(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: nudgesData, isLoading: loadingNudges, refetch: refetchNudges } = useQuery({
    queryKey: ['ai-nudges'],
    queryFn: () => api.getNudges(),
    staleTime: 2 * 60 * 1000,
  });

  const { data: insights, isLoading: loadingInsights } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: () => api.getAIInsights(),
    staleTime: 5 * 60 * 1000,
  });

  const TABS = [
    { id: 'overview',  label: 'Overview',      icon: <Brain className="w-3.5 h-3.5" /> },
    { id: 'plan',      label: 'Workout Plan',  icon: <Dumbbell className="w-3.5 h-3.5" /> },
    { id: 'variety',   label: 'Muscle Map',    icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'nudges',    label: 'Smart Nudges',  icon: <Bell className="w-3.5 h-3.5" /> },
  ];

  const engScore = insights?.engagementScore?.score ?? 0;
  const engLabel = insights?.engagementScore?.label ?? 'Loading...';
  const engColor = engScore >= 80 ? '#10b981' : engScore >= 60 ? '#14b8a6' : engScore >= 40 ? '#f97316' : '#ef4444';

  const RISK_STYLE = {
    low:    { color: 'text-gym-green', bg: 'bg-gym-green/10 border-gym-green/30',   icon: <CheckCircle className="w-4 h-4" />, label: 'Low Risk' },
    medium: { color: 'text-gym-orange', bg: 'bg-gym-orange/10 border-gym-orange/30', icon: <AlertTriangle className="w-4 h-4" />, label: 'Medium Risk' },
    high:   { color: 'text-red-400',   bg: 'bg-red-500/10 border-red-500/30',        icon: <AlertTriangle className="w-4 h-4" />, label: 'High Risk' },
  };
  const riskStyle = RISK_STYLE[insights?.churnRisk] || RISK_STYLE.low;

  return (
    <div className="min-h-screen px-4 py-8 max-w-3xl mx-auto">

      {/* Hero Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-gym-green/10 border border-gym-green/30 px-4 py-1.5 rounded-full text-xs text-gym-green font-bold mb-4">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" /> AI-Powered Insights
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-gym-green to-gym-teal">Smart Coach</span>
        </h1>
        <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
          Personalised workout plans, motivation messages, muscle gap analysis and smart engagement nudges — all generated from your activity data.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-7 bg-gym-card/50 border border-gym-border rounded-xl p-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-gym-green text-gym-dark shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ══ TAB: Overview ══ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">

          {/* Engagement Score + Cluster */}
          <div className="bg-gym-card/50 border border-gym-border rounded-2xl p-5">
            <SectionHeader icon={<Activity className="w-5 h-5" />} title="Engagement Health Score" subtitle="Based on recency, streak, volume & social activity" />
            <div className="flex items-center gap-6">
              <ScoreDial score={engScore} size={110} label={engLabel} color={engColor} />
              <div className="flex-1 space-y-3">
                <div className={`flex items-center gap-2 text-sm font-bold ${riskStyle.color} border ${riskStyle.bg} px-3 py-2 rounded-xl`}>
                  {riskStyle.icon} Churn Risk: {riskStyle.label}
                </div>
                <div className="bg-gym-dark/60 border border-gym-border rounded-xl px-3 py-2">
                  <div className="text-[10px] text-gray-500 mb-0.5">Behavioural Persona</div>
                  <div className="text-sm font-bold text-white">{insights?.cluster ?? '...'}</div>
                </div>
                <div className="bg-gym-dark/60 border border-gym-border rounded-xl px-3 py-2">
                  <div className="text-[10px] text-gray-500 mb-0.5">Optimal Reminder Time</div>
                  <div className="text-sm font-bold text-gym-teal">{insights?.optimalReminderTime?.message ?? '...'}</div>
                </div>
              </div>
            </div>

            {/* Breakdown bars */}
            {insights?.engagementScore?.breakdown && (
              <div className="mt-5 space-y-2">
                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Score Breakdown</div>
                <PillarBar label="Recency (last workout)" value={insights.engagementScore.breakdown.recency || 0} max={40} color="bg-gym-green" />
                <PillarBar label="Streak Momentum"        value={Math.round(insights.engagementScore.breakdown.streak || 0)} max={30} color="bg-gym-teal" />
                <PillarBar label="Total Volume"           value={Math.round(insights.engagementScore.breakdown.volume || 0)} max={20} color="bg-gym-orange" />
                <PillarBar label="Social (Partner)"       value={insights.engagementScore.breakdown.social || 0} max={10} color="bg-yellow-500" />
              </div>
            )}
          </div>

          {/* Motivation Messages */}
          <div className="bg-gym-card/50 border border-gym-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader icon={<Zap className="w-5 h-5 text-yellow-400" />} title="AI Motivation" subtitle="Personalised messages based on your behaviour" color="text-yellow-400" />
              <button onClick={() => refetchMotivation()} className="p-1.5 hover:bg-gym-border/40 rounded-lg text-gray-500 hover:text-white transition-colors cursor-pointer" title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {loadingMotivation ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-gym-dark/50 animate-pulse" />)}
              </div>
            ) : motivation?.messages?.length ? (
              <div className="space-y-3">
                {motivation.messages.map((msg, i) => (
                  <div key={i} className={`border rounded-xl p-4 ${i === 0 ? 'border-gym-green/40 bg-gym-green/5' : 'border-gym-border bg-gym-dark/30'}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{msg.icon}</span>
                      <div>
                        <div className="text-sm font-bold text-white mb-1">{msg.title}</div>
                        <p className="text-xs text-gray-400 leading-relaxed">{msg.body}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm">Log your first workout to unlock personalised messages!</div>
            )}

            {motivation && (
              <div className="mt-3 flex gap-2">
                <span className="text-[10px] text-gray-600">Persona: <strong className="text-gray-400">{motivation.persona}</strong></span>
                <span className="text-[10px] text-gray-600">Risk: <strong className="text-gray-400">{motivation.churnRisk}</strong></span>
              </div>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-4 gap-2">
            <StatPill label="Streak" value={`${user?.streakCount || 0}d`} color="text-gym-orange" bg="bg-gym-orange/10" border="border-gym-orange/30" />
            <StatPill label="Workouts" value={user?.totalWorkouts || 0} />
            <StatPill label="Coins" value={user?.coins || 0} color="text-yellow-400" bg="bg-yellow-500/10" border="border-yellow-500/30" />
            <StatPill label="BMI" value={user?.bmi ? user.bmi.toFixed(1) : '—'} color="text-gym-teal" bg="bg-gym-teal/10" border="border-gym-teal/30" />
          </div>

          {/* Future ML Roadmap */}
          <div className="bg-gym-card/40 border border-gym-border rounded-2xl p-5">
            <SectionHeader icon={<TrendingUp className="w-5 h-5 text-gym-teal" />} title="Future AI Roadmap" subtitle="Planned deep learning upgrades" color="text-gym-teal" />
            <div className="space-y-2">
              {[
                { icon: '🧠', stage: 'Q3 2026', title: 'Retention Prediction Model', desc: 'Logistic regression on matched-pair data to predict 30-day partnership retention.', ready: false },
                { icon: '📊', stage: 'Q4 2026', title: 'Streak Churn LSTM', desc: 'Time-series model on workout gap patterns predicting next-7-day break probability.', ready: false },
                { icon: '🎯', stage: 'Q4 2026', title: 'Persona Clustering (DBSCAN)', desc: 'Unsupervised behavioural clustering across goals, schedule, and streak for smart filtering.', ready: false },
                { icon: '⏰', stage: 'Q1 2027', title: 'Optimal Nudge Timing (GMM)', desc: 'Gaussian mixture model to predict best send-time per user from 6-week training history.', ready: false },
                { icon: '💬', stage: 'Q1 2027', title: 'Sentiment-Adapted Messages', desc: 'NLP-based motivational tone adaptation — stern coach vs gentle encouragement per persona.', ready: false },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-2.5 border-b border-gym-border last:border-0">
                  <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{item.title}</span>
                      <span className="text-[9px] bg-gym-teal/20 text-gym-teal border border-gym-teal/30 px-2 py-0.5 rounded-full font-bold">{item.stage}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB: Workout Plan ══ */}
      {activeTab === 'plan' && (
        <div className="space-y-5">
          {loadingPlan ? (
            <div className="space-y-3">
              {[...Array(7)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-gym-card/30 animate-pulse" />)}
            </div>
          ) : workoutPlan ? (
            <>
              {/* Plan header */}
              <div className="bg-gradient-to-r from-gym-green/10 to-gym-teal/10 border border-gym-green/30 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-lg font-extrabold text-white">{workoutPlan.planName}</div>
                    <div className="text-xs text-gray-400 mt-0.5">For <strong className="text-white">{workoutPlan.generatedFor}</strong> · Review by {workoutPlan.nextReviewDate}</div>
                  </div>
                  <button onClick={() => refetchPlan()} className="p-1.5 hover:bg-gym-border/40 rounded-lg text-gray-500 hover:text-white transition-colors cursor-pointer">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gym-dark/50 rounded-xl p-2.5 text-center">
                    <div className="text-sm font-extrabold text-gym-green">{workoutPlan.daysPerWeek}</div>
                    <div className="text-[10px] text-gray-500">Days/week</div>
                  </div>
                  <div className="bg-gym-dark/50 rounded-xl p-2.5 text-center">
                    <div className="text-sm font-extrabold text-gym-teal">{workoutPlan.primaryGoal}</div>
                    <div className="text-[10px] text-gray-500">Primary Goal</div>
                  </div>
                  <div className="bg-gym-dark/50 rounded-xl p-2.5 text-center">
                    <div className="text-sm font-extrabold text-gym-orange">{workoutPlan.fitnessLevel}</div>
                    <div className="text-[10px] text-gray-500">Level</div>
                  </div>
                </div>
              </div>

              {/* Progression tip */}
              {workoutPlan.progressionNote && (
                <div className="bg-gym-teal/10 border border-gym-teal/30 rounded-xl px-4 py-3 flex gap-2.5">
                  <TrendingUp className="w-4 h-4 text-gym-teal flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-300 leading-relaxed"><strong className="text-gym-teal">Progression Note:</strong> {workoutPlan.progressionNote}</p>
                </div>
              )}

              {/* Weekly schedule */}
              <div className="space-y-2">
                {workoutPlan.weekPlan?.map((day, i) => (
                  <DayCard
                    key={day.day}
                    day={day}
                    isExpanded={!!expandedDays[i]}
                    onToggle={() => setExpandedDays(prev => ({ ...prev, [i]: !prev[i] }))}
                  />
                ))}
              </div>

              <div className="text-xs text-gray-600 text-center">
                Plan generated {new Date(workoutPlan.generatedAt).toLocaleString()} · Updates weekly
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Dumbbell className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Complete your profile (goals, level) to generate your personalised plan.</p>
              <Link to="/" className="mt-3 inline-flex items-center gap-1 text-gym-green text-xs font-bold hover:underline">
                Update Profile <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: Muscle Map ══ */}
      {activeTab === 'variety' && (
        <div className="space-y-5">
          {loadingVariety ? (
            <div className="h-64 rounded-xl bg-gym-card/30 animate-pulse" />
          ) : variety ? (
            <>
              {/* Variety score */}
              <div className="bg-gym-card/50 border border-gym-border rounded-2xl p-5 flex items-center gap-6">
                <ScoreDial score={variety.varietyScore ?? 0} size={100} label="Variety" color="#14b8a6" />
                <div className="flex-1">
                  <div className="text-sm font-bold text-white mb-1">Exercise Variety Score</div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Based on {variety.analysedSessions} sessions over {variety.periodDays} days. Higher = better muscle coverage.
                  </p>
                  {variety.dominantMuscles?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {variety.dominantMuscles.map(m => (
                        <span key={m} className="text-[10px] bg-gym-green/20 text-gym-green border border-gym-green/30 px-2 py-0.5 rounded-full font-semibold">
                          ✓ {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Coverage heatmap */}
              <div className="bg-gym-card/50 border border-gym-border rounded-2xl p-5">
                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-3">Muscle Group Coverage (last 30 days)</div>
                <div className="space-y-2">
                  {['chest', 'back', 'legs', 'shoulders', 'core', 'glutes', 'biceps', 'triceps', 'cardio'].map(muscle => {
                    const count = variety.muscleCoverage?.[muscle] || 0;
                    const max = Math.max(...Object.values(variety.muscleCoverage || {}), 1);
                    const pct = Math.round((count / max) * 100);
                    return (
                      <div key={muscle}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className={`capitalize font-medium ${count === 0 ? 'text-red-400' : 'text-gray-400'}`}>{muscle}</span>
                          <span className={count === 0 ? 'text-red-400' : 'text-white'}>{count === 0 ? 'MISSING' : `${count}×`}</span>
                        </div>
                        <div className="h-1.5 bg-gym-dark rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${count === 0 ? 'bg-red-500/30' : count / max > 0.7 ? 'bg-gym-green' : 'bg-gym-teal'}`}
                            style={{ width: count === 0 ? '3%' : `${pct}%`, transition: 'width 0.7s ease' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Imbalance recommendations */}
              {variety.recommendations?.length > 0 ? (
                <div className="bg-gym-card/50 border border-gym-border rounded-2xl p-5">
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-3">⚠️ Detected Imbalances</div>
                  <div className="space-y-3">
                    {variety.recommendations.map((rec, i) => (
                      <div key={i} className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-sm font-bold text-white capitalize">{rec.muscle}</div>
                            <p className="text-xs text-gray-400 mt-0.5">{rec.reason}</p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {rec.suggestedExercises?.map(ex => (
                                <span key={ex} className="text-[10px] bg-gym-dark border border-gym-border px-2 py-0.5 rounded-lg text-gray-300">{ex}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : variety.analysedSessions > 0 ? (
                <div className="bg-gym-green/5 border border-gym-green/20 rounded-xl p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-gym-green mx-auto mb-2" />
                  <p className="text-sm font-bold text-white">Great variety!</p>
                  <p className="text-xs text-gray-400 mt-1">You're hitting all major muscle groups consistently.</p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Log at least 3 workouts to see your muscle map analysis.
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500 text-sm">No workout data yet. Start logging sessions!</div>
          )}
        </div>
      )}

      {/* ══ TAB: Smart Nudges ══ */}
      {activeTab === 'nudges' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-white">Smart Engagement Nudges</h3>
              <p className="text-xs text-gray-500 mt-0.5">AI-generated reminders prioritised by urgency</p>
            </div>
            <button onClick={() => refetchNudges()} className="p-2 hover:bg-gym-border/40 rounded-xl text-gray-500 hover:text-white transition-colors cursor-pointer">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loadingNudges ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-gym-card/30 animate-pulse" />)}
            </div>
          ) : nudgesData?.nudges?.length ? (
            <>
              <div className="flex items-center gap-3">
                <div className="text-2xl font-extrabold text-white">{nudgesData.count}</div>
                <div className="text-sm text-gray-400">active nudge{nudgesData.count !== 1 ? 's' : ''}</div>
                {nudgesData.urgentCount > 0 && (
                  <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full text-xs font-bold">
                    {nudgesData.urgentCount} urgent
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {nudgesData.nudges.map((nudge, i) => (
                  <div key={nudge.id || i} className={`border rounded-xl p-4 ${nudge.type === 'urgent' ? 'border-red-500/40 bg-red-500/5' : nudge.type === 'high' ? 'border-gym-orange/40 bg-gym-orange/5' : 'border-gym-border bg-gym-dark/30'}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{nudge.icon}</span>
                        <span className="text-sm font-bold text-white">{nudge.title}</span>
                      </div>
                      <NudgePriorityBadge type={nudge.type} />
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed mb-3">{nudge.message}</p>
                    {nudge.cta && (
                      <Link
                        to={nudge.cta.path}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-gym-green hover:underline"
                      >
                        {nudge.cta.label} <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                    {nudge.urgencyHours !== undefined && (
                      <div className="mt-2 text-[10px] text-red-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {nudge.urgencyHours}h remaining window
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-gym-green mx-auto mb-3" />
              <p className="text-white font-bold mb-1">All clear! 🎉</p>
              <p className="text-gray-500 text-sm">No pending nudges right now. Keep up the great work!</p>
            </div>
          )}

          {/* How nudges work */}
          <div className="bg-gym-card/40 border border-gym-border rounded-2xl p-5 mt-4">
            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> How Smart Nudges Work
            </div>
            <div className="space-y-2">
              {[
                { icon: '⚠️', name: 'Urgent', desc: 'Streak about to break — immediate action required' },
                { icon: '🔔', name: 'High',   desc: '>20h since last workout with active streak' },
                { icon: '🤝', name: 'Social', desc: 'Partner submitted proof or is outpacing your streak' },
                { icon: '🪙', name: 'Reward', desc: 'You\'re within 5 workouts of a redeemable milestone' },
                { icon: 'ℹ️', name: 'Info',   desc: 'Weekly summaries, partner suggestions, first steps' },
              ].map(n => (
                <div key={n.name} className="flex items-start gap-2.5 text-xs">
                  <span className="flex-shrink-0">{n.icon}</span>
                  <span className="font-bold text-white w-14">{n.name}:</span>
                  <span className="text-gray-500">{n.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom CTAs */}
      <div className="grid grid-cols-2 gap-3 mt-8">
        <Link to="/partners" className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gym-teal/10 border border-gym-teal/30 text-gym-teal text-sm font-bold hover:bg-gym-teal/20 transition-all">
          <Users className="w-4 h-4" /> AI Matches
        </Link>
        <Link to="/workouts" className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gym-green/10 border border-gym-green/30 text-gym-green text-sm font-bold hover:bg-gym-green/20 transition-all">
          <Dumbbell className="w-4 h-4" /> Log Workout
        </Link>
      </div>
    </div>
  );
}
