import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Dumbbell, Users, Flame, Coins, ChevronRight, ChevronLeft,
  Check, Upload, Sparkles, Trophy, Star, Zap, Heart,
  ArrowRight, Play, X, Camera, Shield, Target, Clock,
  BarChart3, Award, Lock, Wifi
} from 'lucide-react';

// ── Prototype flows ───────────────────────────────────────────────────────
const FLOWS = [
  { id: 'onboarding', label: 'Onboarding', icon: <Dumbbell className="w-4 h-4" />, color: 'gym-green' },
  { id: 'matching',   label: 'Partner Matching', icon: <Users className="w-4 h-4" />, color: 'gym-teal' },
  { id: 'streak',     label: 'Streak Verification', icon: <Flame className="w-4 h-4" />, color: 'gym-orange' },
  { id: 'dashboard',  label: 'Dashboard Tour', icon: <BarChart3 className="w-4 h-4" />, color: 'gym-green' },
];

// ────────────────────────────────────────────────────────────────────────
// FLOW 1: Onboarding
// ────────────────────────────────────────────────────────────────────────
const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to GymBuddy 💪',
    subtitle: 'Your AI-powered fitness accountability partner',
    content: <WelcomeScreen />,
  },
  {
    id: 'account',
    title: 'Create Your Account',
    subtitle: 'Step 1 of 4 — Basic Info',
    content: <AccountStep />,
  },
  {
    id: 'metrics',
    title: 'Your Body Metrics',
    subtitle: 'Step 2 of 4 — Personalise your experience',
    content: <MetricsStep />,
  },
  {
    id: 'goals',
    title: 'Your Fitness Goals',
    subtitle: 'Step 3 of 4 — What are you training for?',
    content: <GoalsStep />,
  },
  {
    id: 'complete',
    title: 'You\'re all set! 🎉',
    subtitle: 'Step 4 of 4 — Welcome bonus unlocked',
    content: <CompleteStep />,
  },
];

function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center text-center py-4">
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-gym-green to-gym-teal flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.4)] animate-pulse">
        <Dumbbell className="w-12 h-12 text-white" />
      </div>
      <div className="grid grid-cols-3 gap-3 w-full mb-6">
        {[
          { icon: <Users className="w-5 h-5" />, label: 'AI Partner\nMatching', color: 'text-gym-green' },
          { icon: <Flame className="w-5 h-5" />, label: 'Verified\nStreaks', color: 'text-gym-orange' },
          { icon: <Coins className="w-5 h-5" />, label: 'Fitness\nCoins', color: 'text-yellow-400' },
        ].map((item, i) => (
          <div key={i} className="bg-gym-dark/60 border border-gym-border rounded-xl p-3 flex flex-col items-center gap-1.5">
            <span className={item.color}>{item.icon}</span>
            <span className="text-xs text-gray-400 text-center whitespace-pre-line leading-tight">{item.label}</span>
          </div>
        ))}
      </div>
      <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
        Join <span className="text-gym-green font-bold">50,000+</span> fitness enthusiasts who stay consistent with an accountability partner and AI-driven motivation.
      </p>
    </div>
  );
}

function AccountStep() {
  return (
    <div className="space-y-3">
      {[
        { label: 'Username', placeholder: 'gym_warrior', type: 'text' },
        { label: 'Email', placeholder: 'you@example.com', type: 'email' },
        { label: 'Password', placeholder: '••••••••', type: 'password' },
      ].map((f) => (
        <div key={f.label}>
          <label className="block text-gray-400 text-xs font-semibold mb-1.5">{f.label}</label>
          <input
            type={f.type}
            placeholder={f.placeholder}
            readOnly
            className="w-full px-3 py-2.5 bg-gym-dark/50 border border-gym-border rounded-xl text-white placeholder-gray-600 text-sm cursor-default"
          />
        </div>
      ))}
      <div className="flex items-center gap-2 mt-1">
        <div className="w-4 h-4 rounded bg-gym-green flex items-center justify-center shrink-0">
          <Check className="w-3 h-3 text-gym-dark" />
        </div>
        <span className="text-xs text-gray-500">I agree to the Terms of Service and Privacy Policy</span>
      </div>
    </div>
  );
}

function MetricsStep() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Age', val: '24', unit: 'years' },
          { label: 'Gender', val: 'Male', unit: '' },
          { label: 'Height', val: '178', unit: 'cm' },
          { label: 'Weight', val: '75', unit: 'kg' },
        ].map((f) => (
          <div key={f.label} className="bg-gym-dark/50 border border-gym-border rounded-xl p-3">
            <div className="text-xs text-gray-500 mb-1">{f.label}</div>
            <div className="flex items-end gap-1">
              <span className="text-xl font-bold text-white">{f.val}</span>
              {f.unit && <span className="text-xs text-gray-500 mb-0.5">{f.unit}</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-gym-green/10 border border-gym-green/30 rounded-xl p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">BMI</span>
          <span className="text-xs text-gym-green font-bold">Normal</span>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-extrabold text-white">23.6</span>
          <div className="flex-1 h-2 bg-gym-dark rounded-full mb-1 overflow-hidden">
            <div className="h-full w-[55%] bg-gradient-to-r from-gym-green to-gym-teal rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function GoalsStep() {
  const [selected, setSelected] = useState(['Strength', 'Cardio']);
  const goals = ['Strength', 'Cardio', 'Weight Loss', 'Flexibility', 'Endurance', 'General Fitness'];
  const schedules = ['Morning', 'Evening', 'Weekends'];
  const [selSched, setSelSched] = useState(['Morning']);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wider">Fitness Goals</div>
        <div className="flex flex-wrap gap-2">
          {goals.map((g) => (
            <button
              key={g}
              onClick={() => setSelected((s) => s.includes(g) ? s.filter(x => x !== g) : [...s, g])}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                selected.includes(g)
                  ? 'bg-gym-green/20 border-gym-green text-gym-green'
                  : 'bg-gym-dark/40 border-gym-border text-gray-400'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wider">Preferred Schedule</div>
        <div className="flex gap-2">
          {schedules.map((s) => (
            <button
              key={s}
              onClick={() => setSelSched((prev) => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                selSched.includes(s)
                  ? 'bg-gym-teal/20 border-gym-teal text-gym-teal'
                  : 'bg-gym-dark/40 border-gym-border text-gray-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wider">Fitness Level</div>
        <div className="grid grid-cols-3 gap-2">
          {['Beginner', 'Intermediate', 'Advanced'].map((l, i) => (
            <button key={l} className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${i === 1 ? 'bg-gym-green/20 border-gym-green text-gym-green' : 'border-gym-border text-gray-500'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompleteStep() {
  return (
    <div className="flex flex-col items-center text-center py-2">
      <div className="relative mb-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gym-green to-gym-teal flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)]">
          <Check className="w-10 h-10 text-white" />
        </div>
        <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center text-sm animate-bounce">🎉</div>
      </div>
      <div className="space-y-2 w-full mb-4">
        {[
          { icon: '🏅', label: 'Welcome Bonus', val: '+100 Coins', color: 'text-yellow-400' },
          { icon: '🤝', label: 'AI Partner Search', val: 'Starting...', color: 'text-gym-teal' },
          { icon: '🔥', label: 'Streak Tracker', val: 'Day 0 → Start!', color: 'text-gym-orange' },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between bg-gym-dark/50 border border-gym-border rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm text-gray-300 font-medium">{item.label}</span>
            </div>
            <span className={`text-sm font-bold ${item.color}`}>{item.val}</span>
          </div>
        ))}
      </div>
      <p className="text-gray-500 text-xs">Your account is ready. Let&apos;s find your perfect Gym Buddy!</p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// FLOW 2: Partner Matching
// ────────────────────────────────────────────────────────────────────────
const MATCHING_STEPS = [
  { id: 'ai_scanning', title: 'AI Scanning Matches', subtitle: 'Analysing 1,200+ users for compatibility' },
  { id: 'results', title: 'Your Top Matches', subtitle: 'Ranked by compatibility score' },
  { id: 'profile', title: 'Match Profile', subtitle: 'Alex Chen — 95% Compatible' },
  { id: 'sent', title: 'Request Sent! 🤝', subtitle: 'Alex will be notified instantly' },
];

const MOCK_PARTNERS = [
  { name: 'Alex Chen', score: 95, level: 'Intermediate', goals: ['Strength', 'Cardio'], schedule: 'Morning', location: 'Mumbai', avatar: '🏋️', color: 'from-gym-green/20 to-gym-teal/20', border: 'border-gym-green/40' },
  { name: 'Priya Shah', score: 87, level: 'Advanced', goals: ['Cardio', 'Endurance'], schedule: 'Evening', location: 'Pune', avatar: '🧘', color: 'from-gym-teal/20 to-blue-500/20', border: 'border-gym-teal/40' },
  { name: 'Rahul Verma', score: 72, level: 'Beginner', goals: ['Weight Loss', 'General Fitness'], schedule: 'Morning', location: 'Delhi', avatar: '🚴', color: 'from-gym-orange/20 to-yellow-500/20', border: 'border-gym-orange/40' },
];

function ScoreDial({ score, size = 80 }) {
  const radius = (size / 2) - 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 85 ? '#10b981' : score >= 70 ? '#14b8a6' : '#f97316';
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#1f2937" strokeWidth="7" />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color}
          strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-lg font-extrabold text-white leading-none">{score}%</span>
        <span className="text-[9px] text-gray-400 leading-none">match</span>
      </div>
    </div>
  );
}

function AIScanning() {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);
  const phases = ['Fetching users...', 'Analysing goals...', 'Scoring compatibility...', 'Ranking matches...'];
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return p + 2;
      });
    }, 50);
    const phaseInterval = setInterval(() => setPhase(p => Math.min(p + 1, 3)), 600);
    return () => { clearInterval(interval); clearInterval(phaseInterval); };
  }, []);
  return (
    <div className="flex flex-col items-center py-4 gap-5">
      <div className="relative w-28 h-28">
        <div className="absolute inset-0 rounded-full border-4 border-gym-green/20 animate-ping" />
        <div className="absolute inset-2 rounded-full border-4 border-gym-teal/30 animate-pulse" />
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gym-green/20 to-gym-teal/20 flex items-center justify-center border border-gym-green/30">
          <Sparkles className="w-10 h-10 text-gym-green" />
        </div>
      </div>
      <div className="w-full">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>{phases[phase]}</span>
          <span className="text-gym-green font-bold">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-gym-dark rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-gym-green to-gym-teal rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 w-full">
        {['Goals', 'Schedule', 'Level', 'Location', 'History', 'Activity'].map((tag, i) => (
          <div key={tag} className={`bg-gym-dark/50 border rounded-lg px-2 py-1.5 text-center text-xs transition-all ${i <= phase + 1 ? 'border-gym-green/40 text-gym-green' : 'border-gym-border text-gray-600'}`}>
            {i <= phase + 1 ? '✓ ' : ''}{tag}
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchResults({ onSelect }) {
  return (
    <div className="space-y-3">
      {MOCK_PARTNERS.map((p, i) => (
        <button
          key={p.name}
          onClick={() => onSelect(i)}
          className={`w-full bg-gradient-to-r ${p.color} border ${p.border} rounded-xl p-3 flex items-center gap-3 hover:brightness-110 transition-all cursor-pointer text-left`}
        >
          <div className="w-12 h-12 rounded-xl bg-gym-dark/60 flex items-center justify-center text-2xl shrink-0">{p.avatar}</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white text-sm">{p.name}</div>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {p.goals.map(g => <span key={g} className="text-[10px] bg-gym-dark/50 border border-gym-border px-1.5 py-0.5 rounded text-gray-400">{g}</span>)}
              <span className="text-[10px] bg-gym-dark/50 border border-gym-border px-1.5 py-0.5 rounded text-gray-400">📍 {p.location}</span>
            </div>
          </div>
          <ScoreDial score={p.score} size={56} />
        </button>
      ))}
    </div>
  );
}

function PartnerProfile() {
  const p = MOCK_PARTNERS[0];
  return (
    <div className="space-y-3">
      <div className={`bg-gradient-to-br ${p.color} border ${p.border} rounded-xl p-4 flex flex-col items-center text-center`}>
        <div className="text-5xl mb-2">{p.avatar}</div>
        <div className="font-extrabold text-white text-lg">{p.name}</div>
        <div className="text-gray-400 text-xs mt-0.5">📍 {p.location} · {p.level}</div>
        <ScoreDial score={p.score} size={72} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Goals', val: p.goals.join(', '), icon: '🎯' },
          { label: 'Schedule', val: p.schedule, icon: '⏰' },
          { label: 'Streak', val: '14 days 🔥', icon: '📊' },
          { label: 'Active Since', val: '3 months', icon: '🏅' },
        ].map((item) => (
          <div key={item.label} className="bg-gym-dark/50 border border-gym-border rounded-xl p-3">
            <div className="text-[10px] text-gray-500 mb-0.5">{item.icon} {item.label}</div>
            <div className="text-xs font-bold text-white">{item.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequestSent() {
  return (
    <div className="flex flex-col items-center text-center py-4 gap-4">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gym-teal to-gym-green flex items-center justify-center shadow-[0_0_30px_rgba(20,184,166,0.4)]">
        <Check className="w-10 h-10 text-white" />
      </div>
      <div className="space-y-2 w-full">
        <div className="bg-gym-dark/50 border border-gym-green/30 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-400">Request sent to</span>
          <span className="text-sm font-bold text-white">Alex Chen 🏋️</span>
        </div>
        <div className="bg-gym-dark/50 border border-gym-border rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-400">Estimated response</span>
          <span className="text-sm font-bold text-gym-green">~2 hours</span>
        </div>
      </div>
      <div className="bg-gym-teal/10 border border-gym-teal/30 rounded-xl p-3 w-full text-sm text-gray-300 leading-relaxed">
        💡 <strong className="text-white">While you wait:</strong> Log your first workout to start earning Fitness Coins and get your streak going!
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// FLOW 3: Streak Verification
// ────────────────────────────────────────────────────────────────────────
const STREAK_STEPS = [
  { id: 'upload', title: 'Upload Workout Proof', subtitle: 'Take a gym selfie or upload a photo' },
  { id: 'uploading', title: 'Uploading Proof...', subtitle: 'Securing your workout evidence' },
  { id: 'pending', title: 'Waiting for Buddy', subtitle: 'Alex Chen needs to verify your proof' },
  { id: 'verified', title: 'Streak Verified! 🔥', subtitle: 'Both partners earn coins' },
];

function UploadStep() {
  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed border-gym-border rounded-xl p-6 text-center bg-gym-dark/30 hover:border-gym-green/50 transition-all cursor-pointer group">
        <div className="w-14 h-14 rounded-full bg-gym-card/50 flex items-center justify-center mx-auto mb-3 group-hover:bg-gym-green/10 transition-all">
          <Camera className="w-7 h-7 text-gray-500 group-hover:text-gym-green transition-all" />
        </div>
        <p className="text-sm text-gray-400 font-semibold">Drop gym selfie here</p>
        <p className="text-xs text-gray-600 mt-1">or click to browse · JPG, PNG (max 10MB)</p>
      </div>
      <div className="bg-gym-dark/50 border border-gym-border rounded-xl p-3 overflow-hidden relative">
        <div className="flex items-start gap-3">
          <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-gym-green/30 to-gym-teal/30 shrink-0 flex items-center justify-center text-3xl">💪</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">gym_selfie_today.jpg</p>
            <p className="text-xs text-gray-500 mt-0.5">2.4 MB · Just now</p>
            <div className="mt-2 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-gym-green animate-pulse" />
              <span className="text-xs text-gym-green">Image verified — gym detected ✓</span>
            </div>
          </div>
          <button className="p-1 text-gray-500 hover:text-red-400 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500 font-semibold block mb-1.5">Optional note</label>
        <div className="w-full px-3 py-2 bg-gym-dark/50 border border-gym-border rounded-xl text-xs text-gray-400">Crushed chest day — 4 sets bench press 💪</div>
      </div>
    </div>
  );
}

function UploadingStep() {
  const [pct, setPct] = useState(0);
  const phases = [
    { at: 20, label: 'Compressing image...' },
    { at: 45, label: 'Uploading to secure server...' },
    { at: 70, label: 'Verifying content...' },
    { at: 90, label: 'Notifying partner...' },
    { at: 100, label: 'Complete! ✓' },
  ];
  const currentPhase = phases.filter(p => pct >= p.at).pop() || { label: 'Preparing...' };

  useEffect(() => {
    const t = setInterval(() => setPct(p => { if (p >= 100) { clearInterval(t); return 100; } return p + 1.5; }), 40);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center py-4 gap-5">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="42" fill="none" stroke="#1f2937" strokeWidth="8" />
          <circle cx="48" cy="48" r="42" fill="none" stroke="url(#upload-grad)"
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={264} strokeDashoffset={264 - (pct / 100) * 264}
            style={{ transition: 'stroke-dashoffset 0.1s linear' }}
          />
          <defs>
            <linearGradient id="upload-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-white">{Math.round(pct)}%</span>
          <Upload className="w-4 h-4 text-gym-green mt-0.5" />
        </div>
      </div>
      <p className="text-sm text-gray-400 animate-pulse">{currentPhase.label}</p>
      <div className="w-full space-y-2">
        {phases.map((phase) => (
          <div key={phase.label} className={`flex items-center gap-2 text-xs transition-all ${pct >= phase.at ? 'text-gym-green' : 'text-gray-600'}`}>
            <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${pct >= phase.at ? 'bg-gym-green border-gym-green' : 'border-gray-700'}`}>
              {pct >= phase.at && <Check className="w-2.5 h-2.5 text-gym-dark" />}
            </div>
            {phase.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function PendingVerification() {
  return (
    <div className="space-y-4">
      <div className="bg-gym-orange/10 border border-gym-orange/30 rounded-xl p-4 flex flex-col items-center text-center gap-2">
        <div className="w-12 h-12 rounded-full bg-gym-orange/20 flex items-center justify-center"><Clock className="w-6 h-6 text-gym-orange" /></div>
        <p className="text-sm font-bold text-white">Waiting for Alex Chen</p>
        <p className="text-xs text-gray-400">Usually responds within 30 minutes</p>
      </div>
      <div className="bg-gym-dark/50 border border-gym-border rounded-xl p-3">
        <div className="text-xs text-gray-500 mb-2 font-semibold">YOUR SUBMISSION</div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gym-green/30 to-gym-teal/30 flex items-center justify-center text-2xl">💪</div>
          <div>
            <p className="text-sm font-bold text-white">Today&apos;s Proof</p>
            <p className="text-xs text-gray-500">Submitted just now</p>
            <span className="text-[10px] bg-gym-orange/20 text-gym-orange border border-gym-orange/30 px-2 py-0.5 rounded-full mt-1 inline-block">⏳ Pending</span>
          </div>
        </div>
      </div>
      <div className="bg-gym-dark/50 border border-gym-border rounded-xl p-3">
        <div className="text-xs text-gray-500 mb-2 font-semibold">IF YOU DON&apos;T HEAR BACK</div>
        <p className="text-xs text-gray-400 leading-relaxed">Your streak won&apos;t be broken. GymBuddy gives a 12-hour grace period for partner verification.</p>
      </div>
    </div>
  );
}

function VerifiedStep() {
  const [showConfetti, setShowConfetti] = useState(true);
  useEffect(() => { const t = setTimeout(() => setShowConfetti(false), 3000); return () => clearTimeout(t); }, []);
  const confettiColors = ['#10b981', '#14b8a6', '#f97316', '#facc15', '#a78bfa'];
  return (
    <div className="flex flex-col items-center text-center relative overflow-hidden py-2">
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="absolute w-2 h-2 rounded-sm"
              style={{
                backgroundColor: confettiColors[i % confettiColors.length],
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20}%`,
                animation: `confettiFall ${1.5 + Math.random() * 1.5}s ease-in forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gym-green to-gym-teal flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(16,185,129,0.5)]">
        <Check className="w-10 h-10 text-white" />
      </div>
      <div className="text-4xl font-extrabold text-gym-green mb-1">🔥 Day 13</div>
      <p className="text-gray-400 text-sm mb-4">Streak is officially verified by Alex Chen!</p>
      <div className="space-y-2 w-full">
        {[
          { who: 'You earned', coins: '+20 Coins', color: 'text-yellow-400' },
          { who: 'Alex earned', coins: '+20 Coins', color: 'text-yellow-400' },
        ].map((r) => (
          <div key={r.who} className="bg-gym-dark/50 border border-gym-border rounded-xl px-4 py-2.5 flex justify-between items-center">
            <span className="text-sm text-gray-400">{r.who}</span>
            <span className={`text-sm font-bold ${r.color}`}>{r.coins} 🪙</span>
          </div>
        ))}
        <div className="bg-gym-green/10 border border-gym-green/30 rounded-xl px-4 py-2.5 flex justify-between items-center">
          <span className="text-sm text-gray-300 font-semibold">New Balance</span>
          <span className="text-sm font-extrabold text-gym-green">520 Coins 🏆</span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// FLOW 4: Dashboard Tour
// ────────────────────────────────────────────────────────────────────────
const DASHBOARD_STEPS = [
  { id: 'overview', title: 'Stats Overview', subtitle: 'Your performance at a glance' },
  { id: 'charts', title: 'Progress Charts', subtitle: 'Calories & frequency trends' },
  { id: 'partner', title: 'Your Gym Buddy', subtitle: 'Stay accountable together' },
  { id: 'actions', title: 'Quick Actions', subtitle: 'Jump into any feature instantly' },
];

function DashboardOverview() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Streak', val: '13', unit: 'days', icon: '🔥', color: 'text-gym-orange' },
          { label: 'Coins', val: '520', unit: '', icon: '🪙', color: 'text-yellow-400' },
          { label: 'BMI', val: '23.6', unit: '', icon: '📊', color: 'text-gym-teal' },
        ].map((s) => (
          <div key={s.label} className="bg-gym-card/50 border border-gym-border rounded-xl p-2.5 text-center">
            <div className="text-xl mb-1">{s.icon}</div>
            <div className={`text-lg font-extrabold ${s.color}`}>{s.val}<span className="text-xs font-normal text-gray-500 ml-0.5">{s.unit}</span></div>
            <div className="text-[10px] text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="bg-gradient-to-r from-gym-green/10 to-gym-teal/10 border border-gym-green/20 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-gym-green" />
          <span className="text-xs font-bold text-white">AI Motivation</span>
        </div>
        <p className="text-xs text-gray-300 leading-relaxed">&quot;You&apos;re in the <strong className="text-gym-green">top 8%</strong> of all users this week! One more workout and you hit your monthly goal 💪&quot;</p>
      </div>
    </div>
  );
}

function DashboardCharts() {
  const cals = [320, 450, 280, 500, 380, 420, 490];
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const maxCal = Math.max(...cals);
  return (
    <div className="space-y-3">
      <div className="bg-gym-dark/50 border border-gym-border rounded-xl p-3">
        <div className="text-xs text-gray-500 font-semibold mb-3">CALORIES THIS WEEK</div>
        <div className="flex items-end gap-1.5 h-20">
          {cals.map((c, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-gym-green to-gym-teal"
                style={{ height: `${(c / maxCal) * 100}%`, opacity: i === 6 ? 1 : 0.6 }}
              />
              <span className="text-[9px] text-gray-600">{days[i]}</span>
            </div>
          ))}
        </div>
        <div className="text-right text-xs text-gym-green font-bold mt-2">Total: 2,840 kcal</div>
      </div>
      <div className="bg-gym-dark/50 border border-gym-border rounded-xl p-3">
        <div className="text-xs text-gray-500 font-semibold mb-2">PROGRESS MILESTONES</div>
        {[
          { label: 'Monthly Workouts', pct: 72, color: 'from-gym-green to-gym-teal' },
          { label: 'Streak Goal (30d)', pct: 43, color: 'from-gym-orange to-yellow-500' },
        ].map((item) => (
          <div key={item.label} className="mb-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1"><span>{item.label}</span><span className="text-white font-bold">{item.pct}%</span></div>
            <div className="h-1.5 bg-gym-dark rounded-full overflow-hidden">
              <div className={`h-full bg-gradient-to-r ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardPartner() {
  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-gym-green/10 to-gym-teal/10 border border-gym-green/30 rounded-xl p-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-gym-dark/60 flex items-center justify-center text-3xl shrink-0">🏋️</div>
        <div className="flex-1">
          <p className="font-extrabold text-white">Alex Chen</p>
          <p className="text-xs text-gray-400">Active partner · 14-day streak 🔥</p>
          <div className="flex items-center gap-1 mt-1.5">
            <div className="w-2 h-2 rounded-full bg-gym-green animate-pulse" />
            <span className="text-xs text-gym-green font-semibold">Online now</span>
          </div>
        </div>
        <ScoreDial score={95} size={52} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Your streak', val: '13 days', icon: '🔥' },
          { label: 'Alex\'s streak', val: '14 days', icon: '🏆' },
          { label: 'Together since', val: '2 months', icon: '🤝' },
          { label: 'Joint workouts', val: '26 total', icon: '💪' },
        ].map((item) => (
          <div key={item.label} className="bg-gym-dark/50 border border-gym-border rounded-xl p-2.5">
            <div className="text-base mb-0.5">{item.icon}</div>
            <div className="text-sm font-bold text-white">{item.val}</div>
            <div className="text-[10px] text-gray-500">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardActions() {
  const actions = [
    { to: '/workouts', icon: <Dumbbell className="w-5 h-5" />, label: 'Log Workout', sub: '+15 Coins', color: 'from-gym-green/10', border: 'border-gym-green/30', iconColor: 'text-gym-green' },
    { to: '/streaks', icon: <Flame className="w-5 h-5" />, label: 'Verify Streak', sub: '+20 Coins', color: 'from-gym-orange/10', border: 'border-gym-orange/30', iconColor: 'text-gym-orange' },
    { to: '/partners', icon: <Users className="w-5 h-5" />, label: 'AI Partners', sub: 'Find Buddy', color: 'from-gym-teal/10', border: 'border-gym-teal/30', iconColor: 'text-gym-teal' },
    { to: '/rewards', icon: <Coins className="w-5 h-5" />, label: 'Redeem Coins', sub: '520 Coins', color: 'from-yellow-500/10', border: 'border-yellow-500/30', iconColor: 'text-yellow-400' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((a) => (
        <div key={a.label} className={`bg-gradient-to-br ${a.color} to-transparent border ${a.border} rounded-xl p-3 flex flex-col gap-2 cursor-pointer hover:brightness-110 transition-all`}>
          <span className={a.iconColor}>{a.icon}</span>
          <div>
            <div className="text-sm font-bold text-white">{a.label}</div>
            <div className="text-xs text-gym-green font-semibold">{a.sub}</div>
          </div>
          <ArrowRight className="w-3 h-3 text-gray-500 self-end" />
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// FLOW RENDERERS
// ────────────────────────────────────────────────────────────────────────
function OnboardingFlow({ step, setStep }) {
  const s = ONBOARDING_STEPS[step];
  return <FlowScreen step={step} steps={ONBOARDING_STEPS} setStep={setStep} title={s.title} subtitle={s.subtitle} content={s.content} />;
}

function MatchingFlow({ step, setStep }) {
  const [selectedPartner, setSelectedPartner] = useState(null);
  const stepDefs = MATCHING_STEPS;
  const s = stepDefs[step];

  const content = step === 0 ? <AIScanning /> :
    step === 1 ? <MatchResults onSelect={(i) => { setSelectedPartner(i); setStep(2); }} /> :
    step === 2 ? <PartnerProfile /> :
    <RequestSent />;

  return <FlowScreen step={step} steps={stepDefs} setStep={setStep} title={s.title} subtitle={s.subtitle} content={content} />;
}

function StreakFlow({ step, setStep }) {
  const s = STREAK_STEPS[step];
  const content = step === 0 ? <UploadStep /> :
    step === 1 ? <UploadingStep /> :
    step === 2 ? <PendingVerification /> :
    <VerifiedStep />;
  return <FlowScreen step={step} steps={STREAK_STEPS} setStep={setStep} title={s.title} subtitle={s.subtitle} content={content} />;
}

function DashboardFlow({ step, setStep }) {
  const s = DASHBOARD_STEPS[step];
  const content = step === 0 ? <DashboardOverview /> :
    step === 1 ? <DashboardCharts /> :
    step === 2 ? <DashboardPartner /> :
    <DashboardActions />;
  return <FlowScreen step={step} steps={DASHBOARD_STEPS} setStep={setStep} title={s.title} subtitle={s.subtitle} content={content} />;
}

// ────────────────────────────────────────────────────────────────────────
// SHARED FLOW SCREEN SHELL
// ────────────────────────────────────────────────────────────────────────
function FlowScreen({ step, steps, setStep, title, subtitle, content }) {
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;

  return (
    <div className="flex flex-col h-full">
      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 mb-4">
        {steps.map((_, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={`rounded-full transition-all cursor-pointer ${i === step ? 'w-6 h-2 bg-gym-green' : i < step ? 'w-2 h-2 bg-gym-green/50' : 'w-2 h-2 bg-gym-border'}`}
          />
        ))}
      </div>

      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-extrabold text-white leading-tight">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-none">{content}</div>

      {/* Navigation buttons */}
      <div className="flex gap-2 mt-4 pt-3 border-t border-gym-border shrink-0">
        {!isFirst && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-gym-border text-gray-400 text-sm font-semibold hover:bg-gym-border/30 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}
        {!isLast ? (
          <button
            onClick={() => setStep(s => s + 1)}
            className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-gym-green hover:bg-gym-green/90 text-gym-dark font-bold text-sm transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.2)]"
          >
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <Link
            to="/"
            className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-gym-green hover:bg-gym-green/90 text-gym-dark font-bold text-sm transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.2)]"
          >
            Open App <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// MAIN PROTOTYPE PAGE
// ────────────────────────────────────────────────────────────────────────
export default function Prototype() {
  const [activeFlow, setActiveFlow] = useState('onboarding');
  const [steps, setSteps] = useState({ onboarding: 0, matching: 0, streak: 0, dashboard: 0 });

  const setStep = (flowId) => (val) => {
    setSteps(prev => ({ ...prev, [flowId]: typeof val === 'function' ? val(prev[flowId]) : val }));
  };

  const flowComponents = {
    onboarding: <OnboardingFlow step={steps.onboarding} setStep={setStep('onboarding')} />,
    matching:   <MatchingFlow   step={steps.matching}   setStep={setStep('matching')} />,
    streak:     <StreakFlow     step={steps.streak}     setStep={setStep('streak')} />,
    dashboard:  <DashboardFlow  step={steps.dashboard}  setStep={setStep('dashboard')} />,
  };

  const FLOW_COLORS = {
    onboarding: 'border-gym-green/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]',
    matching:   'border-gym-teal/50 shadow-[0_0_20px_rgba(20,184,166,0.1)]',
    streak:     'border-gym-orange/50 shadow-[0_0_20px_rgba(249,115,22,0.1)]',
    dashboard:  'border-gym-green/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]',
  };

  return (
    <div className="min-h-screen bg-gym-dark text-gray-100 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-gym-green/10 border border-gym-green/30 px-4 py-1.5 rounded-full text-xs text-gym-green font-bold mb-4">
            <Play className="w-3 h-3" /> Interactive Prototype
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3">
            GymBuddy <span className="text-transparent bg-clip-text bg-gradient-to-r from-gym-green to-gym-teal">User Flows</span>
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
            Clickable prototype simulating all core interactions. Navigate through each flow step-by-step to experience the complete user journey.
          </p>
        </div>

        {/* Flow Selector */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {FLOWS.map((flow) => (
            <button
              key={flow.id}
              onClick={() => setActiveFlow(flow.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                activeFlow === flow.id
                  ? 'bg-gym-green/20 border-gym-green text-gym-green shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'border-gym-border text-gray-400 hover:border-gym-border/80 hover:text-white'
              }`}
            >
              {flow.icon} {flow.label}
            </button>
          ))}
        </div>

        {/* Two-column layout: phone mockup + info panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

          {/* Phone mockup */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Phone frame */}
              <div className="w-72 bg-[#0d1117] rounded-[44px] border-4 border-[#2d333b] shadow-2xl overflow-hidden"
                style={{ boxShadow: '0 0 60px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05)' }}>
                {/* Status bar */}
                <div className="flex items-center justify-between px-6 pt-3 pb-1">
                  <span className="text-[10px] text-gray-400 font-semibold">9:41</span>
                  <div className="flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-gray-400" />
                    <div className="flex gap-0.5">
                      {[3, 2.5, 2, 1.5].map((h, i) => (
                        <div key={i} className="w-1 rounded-sm bg-gray-400" style={{ height: `${h * 4}px` }} />
                      ))}
                    </div>
                    <div className="w-5 h-2.5 rounded-sm border border-gray-400 relative">
                      <div className="absolute inset-0.5 right-0.5 bg-gray-400 rounded-xs w-3/4" />
                    </div>
                  </div>
                </div>
                {/* Notch */}
                <div className="w-24 h-6 bg-[#0d1117] rounded-b-3xl mx-auto -mt-1 flex items-center justify-center">
                  <div className="w-12 h-2.5 bg-[#2d333b] rounded-full" />
                </div>
                {/* App header bar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-gym-border/50">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gym-green flex items-center justify-center">
                      <Dumbbell className="w-4 h-4 text-gym-dark" />
                    </div>
                    <span className="text-sm font-extrabold text-white">GymBuddy</span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-gym-card flex items-center justify-center text-xs">👤</div>
                </div>
                {/* Screen content */}
                <div className={`min-h-[520px] p-4 bg-gym-dark border-l border-r ${FLOW_COLORS[activeFlow]} flex flex-col`}>
                  {flowComponents[activeFlow]}
                </div>
                {/* Home bar */}
                <div className="flex justify-center py-3">
                  <div className="w-28 h-1 bg-gray-600 rounded-full" />
                </div>
              </div>

              {/* Glow effect under phone */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-48 h-8 bg-gym-green/20 blur-xl rounded-full" />
            </div>
          </div>

          {/* Info panel */}
          <div className="space-y-6">
            {/* Flow description */}
            <div className="bg-gym-card/40 border border-gym-border rounded-2xl p-6">
              <h2 className="text-xl font-extrabold text-white mb-1">
                {FLOWS.find(f => f.id === activeFlow)?.label}
              </h2>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                {activeFlow === 'onboarding' && 'The first-time user experience. A 4-step onboarding wizard that collects credentials, body metrics, fitness goals, and awards a welcome bonus.'}
                {activeFlow === 'matching'   && 'AI-powered partner discovery. Scans 1,200+ users using a proprietary compatibility algorithm across goals, schedule, level, and location.'}
                {activeFlow === 'streak'     && 'The core accountability loop. Users upload daily workout proof, partner verifies, and both earn Fitness Coins.'}
                {activeFlow === 'dashboard'  && 'Command center for all metrics. BMI, streaks, calories, partner status, and quick-launch buttons for all features.'}
              </p>

              {/* Step indicators */}
              <div className="space-y-2">
                {(activeFlow === 'onboarding' ? ONBOARDING_STEPS :
                  activeFlow === 'matching'   ? MATCHING_STEPS :
                  activeFlow === 'streak'     ? STREAK_STEPS :
                  DASHBOARD_STEPS
                ).map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setSteps(prev => ({ ...prev, [activeFlow]: i }))}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer text-left ${
                      steps[activeFlow] === i
                        ? 'bg-gym-green/10 border-gym-green/40 text-white'
                        : 'border-gym-border text-gray-500 hover:border-gym-border/80'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${steps[activeFlow] === i ? 'bg-gym-green text-gym-dark' : steps[activeFlow] > i ? 'bg-gym-green/30 text-gym-green' : 'bg-gym-border text-gray-600'}`}>
                      {steps[activeFlow] > i ? <Check className="w-3 h-3" /> : i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{s.title}</div>
                      <div className="text-xs text-gray-500">{s.subtitle}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* UX Design Notes */}
            <div className="bg-gym-card/40 border border-gym-border rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-gym-teal" /> UX Design Principles
              </h3>
              <div className="space-y-2">
                {[
                  { icon: '⚡', label: 'Micro-animations', desc: 'Every state transition has smooth CSS animations' },
                  { icon: '🎯', label: 'Progressive Disclosure', desc: 'Information revealed step-by-step, never overwhelming' },
                  { icon: '🎮', label: 'Gamification', desc: 'Coins, streaks, and ranks drive daily engagement' },
                  { icon: '📱', label: 'Mobile-first', desc: '375px base — scales up to desktop gracefully' },
                  { icon: '♿', label: 'Accessibility', desc: 'Keyboard navigation, ARIA labels, color contrast AA' },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-2.5">
                    <span className="text-base mt-0.5">{item.icon}</span>
                    <div>
                      <span className="text-xs font-bold text-white">{item.label}: </span>
                      <span className="text-xs text-gray-500">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation hint */}
            <div className="bg-gym-green/5 border border-gym-green/20 rounded-xl px-4 py-3 text-xs text-gray-400">
              💡 <strong className="text-white">Tip:</strong> Use the progress dots inside the phone or the step list above to jump to any screen. All interactions in the prototype are fully clickable.
            </div>

            <Link to="/" className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-gym-green to-gym-teal text-gym-dark font-extrabold text-sm hover:brightness-110 transition-all">
              <ArrowRight className="w-4 h-4" /> Launch Live App
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
