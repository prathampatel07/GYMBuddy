import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Dumbbell, Flame, Coins, Sparkles, User, MapPin, Calendar, Target,
  Edit3, Save, Check, Activity, TrendingUp, Award, Scale
} from 'lucide-react';

// BMI category helper
const getBMIData = (height, weight) => {
  if (!height || !weight || height === 0) return null;
  const bmi = (weight / ((height / 100) ** 2)).toFixed(1);
  let category, color;
  if (bmi < 18.5) { category = 'Underweight'; color = '#60a5fa'; }
  else if (bmi < 25) { category = 'Normal'; color = '#10b981'; }
  else if (bmi < 30) { category = 'Overweight'; color = '#f97316'; }
  else { category = 'Obese'; color = '#ef4444'; }
  return { bmi, category, color };
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gym-card border border-gym-border px-3 py-2 rounded-lg shadow-xl text-xs">
        <p className="text-gray-400 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }} className="font-bold">{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { user, updateProfileData, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState('Beginner');
  const [location, setLocation] = useState('');
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState([]);
  const [avatarBase64, setAvatarBase64] = useState('');

  const GOAL_OPTIONS = ['Strength', 'Cardio', 'Weight Loss', 'Flexibility', 'Endurance', 'General Fitness'];
  const SCHEDULE_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'Weekends'];
  const LEVEL_OPTIONS = ['Beginner', 'Intermediate', 'Advanced'];
  const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];

  // React Query: active partner
  const { data: partner } = useQuery({
    queryKey: ['activePartner'],
    queryFn: api.getActivePartner,
    staleTime: 1000 * 60 * 5,
  });

  // React Query: workout stats
  const { data: workoutStats } = useQuery({
    queryKey: ['workoutStats'],
    queryFn: api.getWorkoutStats,
  });

  // React Query: workout history for charts
  const { data: workoutHistory = [] } = useQuery({
    queryKey: ['workoutHistory'],
    queryFn: api.getWorkoutHistory,
  });

  // Prepare chart data from history (last 10 sessions for area chart)
  const caloriesChartData = workoutHistory.slice(0, 10).reverse().map((w, i) => ({
    session: w.date,
    Calories: w.calories || 0,
    Duration: w.duration || 0,
  }));

  // Weekly frequency from stats
  const weeklyData = workoutStats ? Object.entries(workoutStats.byWeekday || {}).map(([day, count]) => ({
    day: day.slice(0, 3),
    Workouts: count
  })) : [];

  const bmiData = getBMIData(user?.height, user?.weight);

  const getAIMotivation = () => {
    const streak = user?.streakCount || 0;
    if (streak === 0) return `Every champion starts with Day 1. Upload your workout proof today to begin your streak and earn 20 Fitness Coins!`;
    if (streak < 5) return `${streak}-day streak and counting, ${user?.username}! Build the habit while it's fresh — your partner is watching!`;
    if (streak < 14) return `${streak} days strong, ${user?.username}! You're in the top 25% of Gym Buddy users. Keep proving yourself!`;
    return `${streak} days — absolute BEAST MODE, ${user?.username}! Your streak is an inspiration to your entire fitness community! 🏆`;
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatarBase64(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleGoalToggle = (g) => setSelectedGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  const handleScheduleToggle = (s) => setSelectedSchedule(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const startEditing = () => {
    setName(user?.name || '');
    setAge(user?.age || '');
    setGender(user?.gender || '');
    setHeight(user?.height || '');
    setWeight(user?.weight || '');
    setFitnessLevel(user?.fitnessLevel || 'Beginner');
    setLocation(user?.location || '');
    setSelectedGoals(user?.fitnessGoals || []);
    setSelectedSchedule(user?.schedule || []);
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfileData({
        name, age: Number(age), gender, height: Number(height), weight: Number(weight),
        fitnessLevel, location, fitnessGoals: selectedGoals, schedule: selectedSchedule,
        profilePhoto: avatarBase64 || undefined
      });
      setIsEditing(false);
      setAvatarBase64('');
      toast.success('Profile updated successfully! ✨');
    } catch (err) {
      toast.error('Failed to update: ' + err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* AI Motivation Banner */}
      <div className="bg-gradient-to-r from-gym-green/20 via-gym-teal/10 to-transparent border border-gym-green/20 p-6 sm:p-8 rounded-2xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-gym-green/5 rounded-full blur-3xl"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            {user?.profilePhotoUrl ? (
              <img src={user.profilePhotoUrl} alt="Avatar"
                className="w-20 h-20 rounded-2xl object-cover border-2 border-gym-green shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gym-green/10 border-2 border-dashed border-gym-green flex items-center justify-center font-black text-2xl text-gym-green shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                {user?.username?.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 bg-gym-green/20 text-gym-green px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" /> AI Motivation Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1.5">
              Hey, <span className="text-gym-green">{user?.name || user?.username}</span>! 💪
            </h1>
            <p className="text-gray-300 text-sm leading-relaxed">"{getAIMotivation()}"</p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gym-card border border-gym-border p-5 rounded-2xl flex items-center gap-4 hover:border-orange-500/30 transition-all group">
          <div className="p-3.5 rounded-xl bg-orange-500/10 group-hover:scale-110 transition-transform">
            <Flame className="w-7 h-7 fill-orange-500 text-orange-500" />
          </div>
          <div>
            <span className="block text-gray-400 text-xs font-bold uppercase tracking-wider">Streak</span>
            <span className="text-2xl font-extrabold text-white">{user?.streakCount || 0} Days</span>
            <span className="block text-xs text-gray-500 mt-0.5">{user?.lastWorkoutDate || 'Start today!'}</span>
          </div>
        </div>
        <div className="bg-gym-card border border-gym-border p-5 rounded-2xl flex items-center gap-4 hover:border-yellow-500/30 transition-all group">
          <div className="p-3.5 rounded-xl bg-yellow-500/10 group-hover:scale-110 transition-transform">
            <Coins className="w-7 h-7 text-yellow-400" />
          </div>
          <div>
            <span className="block text-gray-400 text-xs font-bold uppercase tracking-wider">Fitness Coins</span>
            <span className="text-2xl font-extrabold text-white">{user?.coins || 0}</span>
            <Link to="/rewards" className="block text-xs text-gym-green hover:underline mt-0.5">Redeem in marketplace →</Link>
          </div>
        </div>
        <div className="bg-gym-card border border-gym-border p-5 rounded-2xl flex items-center gap-4 hover:border-gym-green/30 transition-all group">
          <div className="p-3.5 rounded-xl bg-gym-green/10 group-hover:scale-110 transition-transform">
            <Dumbbell className="w-7 h-7 text-gym-green" />
          </div>
          <div>
            <span className="block text-gray-400 text-xs font-bold uppercase tracking-wider">Gym Buddy</span>
            <span className="text-xl font-extrabold text-white truncate block max-w-[160px]">{partner?.username || 'No Partner'}</span>
            {partner
              ? <span className="block text-xs text-orange-400 mt-0.5">🔥 {partner.streakCount}-day streak</span>
              : <Link to="/partners" className="block text-xs text-gym-green hover:underline mt-0.5">Find a buddy →</Link>}
          </div>
        </div>
      </div>

      {/* Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* BMI Widget */}
        <div className="bg-gym-card border border-gym-border p-6 rounded-2xl shadow-md">
          <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
            <Scale className="w-5 h-5 text-gym-teal" /> BMI Calculator
          </h3>
          {bmiData ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <span className="text-5xl font-black" style={{ color: bmiData.color }}>{bmiData.bmi}</span>
                <p className="text-sm font-semibold mt-1" style={{ color: bmiData.color }}>{bmiData.category}</p>
              </div>
              {/* BMI scale bar */}
              <div className="space-y-1.5">
                <div className="relative h-3 rounded-full bg-gym-border overflow-hidden">
                  <div className="absolute h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(((bmiData.bmi - 10) / 30) * 100, 100)}%`, backgroundColor: bmiData.color }}></div>
                </div>
                <div className="flex justify-between text-[9px] text-gray-500 font-bold uppercase">
                  <span>Underweight</span><span>Normal</span><span>Overweight</span><span>Obese</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-gym-dark/40 rounded-xl p-3 border border-gym-border/60">
                  <span className="block text-[10px] text-gray-500 uppercase font-bold">Height</span>
                  <span className="text-white font-bold">{user?.height} cm</span>
                </div>
                <div className="bg-gym-dark/40 rounded-xl p-3 border border-gym-border/60">
                  <span className="block text-[10px] text-gray-500 uppercase font-bold">Weight</span>
                  <span className="text-white font-bold">{user?.weight} kg</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
              <Scale className="w-10 h-10 text-gray-600" />
              <p className="text-gray-400 text-sm font-medium">Add height & weight in your profile</p>
              <button onClick={startEditing} className="text-gym-green text-xs hover:underline font-bold cursor-pointer">Edit Profile →</button>
            </div>
          )}
        </div>

        {/* Calories Area Chart */}
        <div className="lg:col-span-2 bg-gym-card border border-gym-border p-6 rounded-2xl shadow-md">
          <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" /> Calories Burned Per Session
          </h3>
          {caloriesChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={caloriesChartData}>
                <defs>
                  <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="durGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="session" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                <Area type="monotone" dataKey="Calories" stroke="#f97316" strokeWidth={2} fill="url(#calGrad)" dot={{ fill: '#f97316', strokeWidth: 0, r: 3 }} />
                <Area type="monotone" dataKey="Duration" stroke="#14b8a6" strokeWidth={2} fill="url(#durGrad)" dot={{ fill: '#14b8a6', strokeWidth: 0, r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-gray-500 gap-2">
              <Activity className="w-10 h-10 text-gray-600" />
              <p className="text-sm font-medium">Log workouts to see your calorie trends</p>
              <Link to="/workouts" className="text-gym-green text-xs hover:underline font-bold">Log first workout →</Link>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Distribution Bar Chart */}
      <div className="bg-gym-card border border-gym-border p-6 rounded-2xl shadow-md">
        <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gym-green" /> Weekly Workout Frequency Distribution
        </h3>
        {weeklyData.some(d => d.Workouts > 0) ? (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 12, fontWeight: 600 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Workouts" fill="#10b981" radius={[6, 6, 0, 0]}
                background={{ fill: '#111827', radius: [6, 6, 0, 0] }} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[180px] flex flex-col items-center justify-center text-gray-500 gap-2">
            <Calendar className="w-10 h-10 text-gray-600" />
            <p className="text-sm font-medium">No workout history yet for frequency analysis</p>
          </div>
        )}
      </div>

      {/* Profile + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Profile Card */}
        <div className="lg:col-span-2 bg-gym-card border border-gym-border rounded-2xl p-6 sm:p-8 shadow-md">
          <div className="flex items-center justify-between border-b border-gym-border pb-4 mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-gym-green" /> Fitness Profile
            </h2>
            {isEditing ? (
              <button onClick={handleSaveProfile}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-gym-green hover:bg-gym-green/90 text-gym-dark font-bold text-sm rounded-lg cursor-pointer">
                <Save className="w-4 h-4" /> Save
              </button>
            ) : (
              <button onClick={startEditing}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-gym-border hover:bg-gym-border/75 text-gray-300 hover:text-white font-bold text-sm rounded-lg cursor-pointer">
                <Edit3 className="w-4 h-4" /> Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-5">
              {/* Avatar change */}
              <div className="flex items-center gap-4">
                {avatarBase64 || user?.profilePhotoUrl ? (
                  <img src={avatarBase64 || user.profilePhotoUrl} alt="Preview"
                    className="w-16 h-16 rounded-xl object-cover border-2 border-gym-green shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gym-border flex items-center justify-center text-gray-500 shrink-0 font-bold">
                    {user?.username?.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <label className="cursor-pointer text-sm text-gym-green font-semibold hover:underline">
                  Change Avatar
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[['Full Name', name, setName, 'text', 'John Doe'], ['Age', age, setAge, 'number', '25']].map(([label, val, setter, type, ph]) => (
                  <div key={label}>
                    <label className="block text-gray-400 text-xs font-semibold mb-1">{label}</label>
                    <input type={type} placeholder={ph} value={val} onChange={e => setter(e.target.value)}
                      className="w-full px-3 py-2 bg-gym-dark/50 border border-gym-border rounded-lg text-white text-sm focus:outline-none focus:border-gym-green" />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[['Height (cm)', height, setHeight, '175'], ['Weight (kg)', weight, setWeight, '70']].map(([label, val, setter, ph]) => (
                  <div key={label}>
                    <label className="block text-gray-400 text-xs font-semibold mb-1">{label}</label>
                    <input type="number" placeholder={ph} value={val} onChange={e => setter(e.target.value)}
                      className="w-full px-3 py-2 bg-gym-dark/50 border border-gym-border rounded-lg text-white text-sm focus:outline-none focus:border-gym-green" />
                  </div>
                ))}
                <div>
                  <label className="block text-gray-400 text-xs font-semibold mb-1">Level</label>
                  <select value={fitnessLevel} onChange={e => setFitnessLevel(e.target.value)}
                    className="w-full px-3 py-2 bg-gym-dark/50 border border-gym-border rounded-lg text-white text-sm focus:outline-none">
                    {LEVEL_OPTIONS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-xs font-semibold mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-gym-green" /> Location</label>
                <input type="text" placeholder="e.g. Downtown, Manhattan" value={location} onChange={e => setLocation(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gym-dark/50 border border-gym-border rounded-xl text-white text-sm focus:outline-none focus:border-gym-green" />
              </div>

              <div>
                <label className="block text-gray-400 text-xs font-semibold mb-2 flex items-center gap-1"><Target className="w-3.5 h-3.5 text-gym-green" /> Fitness Goals</label>
                <div className="flex flex-wrap gap-2">
                  {GOAL_OPTIONS.map(g => (
                    <button key={g} type="button" onClick={() => handleGoalToggle(g)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${selectedGoals.includes(g) ? 'bg-gym-green/20 border-gym-green text-gym-green' : 'bg-gym-dark/40 border-gym-border text-gray-400'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-xs font-semibold mb-2 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-gym-teal" /> Schedule</label>
                <div className="flex flex-wrap gap-2">
                  {SCHEDULE_OPTIONS.map(s => (
                    <button key={s} type="button" onClick={() => handleScheduleToggle(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${selectedSchedule.includes(s) ? 'bg-gym-teal/20 border-gym-teal text-gym-teal' : 'bg-gym-dark/40 border-gym-border text-gray-400'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  ['Name', user?.name || '—'],
                  ['Age', user?.age ? `${user.age} yrs` : '—'],
                  ['Gender', user?.gender || '—'],
                  ['Height', user?.height ? `${user.height} cm` : '—'],
                  ['Weight', user?.weight ? `${user.weight} kg` : '—'],
                  ['Level', user?.fitnessLevel || 'Beginner'],
                ].map(([label, val]) => (
                  <div key={label} className="bg-gym-dark/30 border border-gym-border/50 p-3 rounded-xl">
                    <span className="block text-[10px] text-gray-500 uppercase font-bold mb-0.5">{label}</span>
                    <span className="text-white font-semibold text-sm">{val}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <div className="flex-1 bg-gym-dark/30 border border-gym-border/50 p-3 rounded-xl">
                  <span className="block text-[10px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</span>
                  <span className="text-white font-medium text-sm">{user?.location || '—'}</span>
                </div>
                <div className="flex-1 bg-gym-dark/30 border border-gym-border/50 p-3 rounded-xl">
                  <span className="block text-[10px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Schedule</span>
                  <span className="text-white font-medium text-sm">{user?.schedule?.join(', ') || '—'}</span>
                </div>
              </div>
              {user?.fitnessGoals?.length > 0 && (
                <div>
                  <span className="block text-[10px] text-gray-500 uppercase font-bold mb-2">Fitness Goals</span>
                  <div className="flex flex-wrap gap-1.5">
                    {user.fitnessGoals.map(g => (
                      <span key={g} className="px-2.5 py-1 bg-gym-green/10 border border-gym-green/20 text-gym-green text-xs font-semibold rounded-lg">{g}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-gym-card border border-gym-border rounded-2xl p-6 shadow-md space-y-3">
          <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
          {[
            { to: '/streaks', icon: <Flame className="w-5 h-5 text-orange-500" />, label: 'Verify Workout Streak', sub: 'Claim 20 Coins →', bg: 'from-orange-500/10 to-orange-500/5', border: 'border-orange-500/20', color: 'text-orange-400' },
            { to: '/workouts', icon: <Dumbbell className="w-5 h-5 text-gym-green" />, label: 'Log Exercise Routine', sub: 'Track Progress →', bg: 'from-gym-green/5 to-transparent', border: 'border-gym-border', color: 'text-gray-200' },
            { to: '/partners', icon: <Sparkles className="w-5 h-5 text-gym-teal" />, label: 'AI Partner Matching', sub: 'Find Buddy →', bg: 'from-gym-teal/5 to-transparent', border: 'border-gym-border', color: 'text-gray-200' },
            { to: '/rewards', icon: <Coins className="w-5 h-5 text-yellow-500" />, label: 'Rewards Marketplace', sub: 'Redeem Coins →', bg: 'from-yellow-500/5 to-transparent', border: 'border-gym-border', color: 'text-gray-200' },
          ].map(item => (
            <Link key={item.to} to={item.to}
              className={`flex items-center justify-between p-3.5 bg-gradient-to-r ${item.bg} hover:brightness-125 border ${item.border} hover:border-gym-green/30 rounded-xl transition-all group ${item.color}`}>
              <div className="flex items-center gap-3">
                {item.icon}
                <span className="font-semibold text-sm">{item.label}</span>
              </div>
              <span className="text-xs text-gray-500 group-hover:translate-x-1 transition-transform">{item.sub}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
