import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Dumbbell, Plus, Loader, TrendingUp, History, X, ChevronRight, BarChart2, Flame } from 'lucide-react';

const EXERCISE_TYPES = ['Strength', 'Cardio', 'HIIT', 'Yoga', 'Pilates', 'CrossFit', 'Swimming', 'Running', 'Cycling', 'Other'];
const TABS = ['Log Workout', 'History', 'Analytics'];

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

export default function WorkoutLogger() {
  const qClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('Log Workout');

  // Form state
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseType, setExerciseType] = useState('Strength');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState('');
  const [duration, setDuration] = useState('45');
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState([]);

  // React Query: workout history
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['workoutHistory'],
    queryFn: api.getWorkoutHistory,
  });

  // React Query: stats
  const { data: stats } = useQuery({
    queryKey: ['workoutStats'],
    queryFn: api.getWorkoutStats,
  });

  // Log workout mutation
  const logMutation = useMutation({
    mutationFn: api.logWorkout,
    onSuccess: () => {
      qClient.invalidateQueries({ queryKey: ['workoutHistory'] });
      qClient.invalidateQueries({ queryKey: ['workoutStats'] });
      qClient.invalidateQueries({ queryKey: ['activePartner'] });
      toast.success('Workout logged! 💪 +15 Fitness Coins');
      setExercises([]);
      setExerciseName(''); setSets('3'); setReps('10'); setWeight(''); setDuration('45'); setCalories('');
      setNotes('');
    },
    onError: (err) => toast.error('Log failed: ' + err.message),
  });

  const addExercise = () => {
    if (!exerciseName.trim()) { toast.error('Enter an exercise name'); return; }
    setExercises(prev => [...prev, {
      name: exerciseName, type: exerciseType,
      sets: Number(sets), reps: Number(reps),
      weight: weight ? Number(weight) : 0,
      id: Date.now()
    }]);
    setExerciseName(''); setSets('3'); setReps('10'); setWeight('');
  };

  const handleSubmit = () => {
    if (exercises.length === 0) { toast.error('Add at least one exercise'); return; }
    logMutation.mutate({
      exercises,
      duration: Number(duration),
      calories: calories ? Number(calories) : Math.round(Number(duration) * 6.5),
      notes,
    });
  };

  // Analytics data preparation
  const analyticsData = history.slice(0, 14).reverse().map(w => ({
    date: new Date(w.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    Calories: w.calories || 0,
    Duration: w.duration || 0,
    Volume: w.exercises?.reduce((acc, e) => acc + (e.sets * e.reps * (e.weight || 1)), 0) || 0,
  }));

  const weeklyData = stats ? Object.entries(stats.byWeekday || {}).map(([day, count]) => ({
    day: day.slice(0, 3),
    Sessions: count
  })) : [];

  const inputCls = "w-full px-3 py-2.5 bg-gym-dark/60 border border-gym-border rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gym-green transition-all";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-gym-green/10 rounded-xl"><Dumbbell className="w-7 h-7 text-gym-green" /></div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Workout Logger</h1>
          <p className="text-gray-400 text-sm">Track, analyze, and dominate your fitness journey</p>
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Workouts', val: stats.totalWorkouts || 0, color: 'text-gym-green', icon: <Dumbbell className="w-4 h-4 text-gym-green" /> },
            { label: 'Total Calories', val: `${stats.totalCalories || 0} kcal`, color: 'text-orange-400', icon: <Flame className="w-4 h-4 text-orange-400" /> },
            { label: 'Avg Duration', val: `${Math.round(stats.avgDuration || 0)} min`, color: 'text-gym-teal', icon: <TrendingUp className="w-4 h-4 text-gym-teal" /> },
            { label: 'This Week', val: stats.thisWeek || 0, color: 'text-yellow-400', icon: <BarChart2 className="w-4 h-4 text-yellow-400" /> },
          ].map(s => (
            <div key={s.label} className="bg-gym-card border border-gym-border p-4 rounded-xl flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold uppercase">{s.icon} {s.label}</div>
              <span className={`text-xl font-extrabold ${s.color}`}>{s.val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gym-border gap-1">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-bold rounded-t-xl transition-all cursor-pointer ${activeTab === tab
              ? 'text-gym-green bg-gym-green/10 border-b-2 border-gym-green -mb-px'
              : 'text-gray-500 hover:text-gray-300'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Log Workout Tab */}
      {activeTab === 'Log Workout' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Exercise Form */}
          <div className="lg:col-span-3 bg-gym-card border border-gym-border p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-white text-lg flex items-center gap-2"><Plus className="w-5 h-5 text-gym-green" /> Add Exercises</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">Exercise Name</label>
                <input type="text" placeholder="e.g. Bench Press" value={exerciseName} onChange={e => setExerciseName(e.target.value)}
                  className={inputCls} onKeyDown={e => e.key === 'Enter' && addExercise()} />
              </div>
              <div>
                <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">Type</label>
                <select value={exerciseType} onChange={e => setExerciseType(e.target.value)} className={inputCls}>
                  {EXERCISE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">Weight (kg)</label>
                <input type="number" placeholder="Optional" value={weight} onChange={e => setWeight(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">Sets</label>
                <input type="number" min="1" value={sets} onChange={e => setSets(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">Reps</label>
                <input type="number" min="1" value={reps} onChange={e => setReps(e.target.value)} className={inputCls} />
              </div>
            </div>

            <button onClick={addExercise}
              className="w-full py-2.5 border border-gym-green/40 hover:border-gym-green text-gym-green hover:bg-gym-green/10 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 cursor-pointer">
              <Plus className="w-4 h-4" /> Add to Session
            </button>

            {/* Exercise List */}
            {exercises.length > 0 && (
              <div className="space-y-2 mt-2">
                {exercises.map((ex, i) => (
                  <div key={ex.id} className="flex items-center justify-between bg-gym-dark/50 border border-gym-border/60 px-3 py-2.5 rounded-xl">
                    <div>
                      <p className="text-white font-semibold text-sm">{ex.name}</p>
                      <p className="text-gray-500 text-xs">{ex.sets}×{ex.reps}{ex.weight ? ` @ ${ex.weight}kg` : ''} • {ex.type}</p>
                    </div>
                    <button onClick={() => setExercises(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-gray-600 hover:text-red-400 transition-colors cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Session Summary */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-gym-card border border-gym-border p-5 rounded-2xl space-y-4">
              <h3 className="font-bold text-white text-lg">Session Details</h3>
              <div>
                <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">Duration (minutes)</label>
                <input type="number" min="1" value={duration} onChange={e => setDuration(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">Calories Burned (optional)</label>
                <input type="number" placeholder="Auto-estimated if blank" value={calories} onChange={e => setCalories(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-gray-400 text-xs font-bold uppercase mb-1 block">Notes</label>
                <textarea rows={3} placeholder="How was your workout?" value={notes} onChange={e => setNotes(e.target.value)}
                  className={inputCls + ' resize-none'} />
              </div>
            </div>

            <div className="bg-gym-green/5 border border-gym-green/20 p-4 rounded-xl text-sm text-gray-300 space-y-1.5">
              <p className="font-bold text-gym-green text-base">Session Summary</p>
              <p>🏋️ <strong className="text-white">{exercises.length}</strong> exercises added</p>
              <p>⏱️ <strong className="text-white">{duration} min</strong> duration</p>
              <p>🔥 <strong className="text-white">{calories || Math.round(Number(duration) * 6.5)} kcal</strong> estimated</p>
              <p className="text-gym-green text-xs pt-1">+15 Fitness Coins on log ✨</p>
            </div>

            <button onClick={handleSubmit} disabled={logMutation.isPending}
              className="w-full py-3.5 bg-gym-green hover:bg-gym-green/90 text-gym-dark font-extrabold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-base">
              {logMutation.isPending ? <Loader className="w-5 h-5 animate-spin" /> : <><Dumbbell className="w-5 h-5" /> Save Workout</>}
            </button>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'History' && (
        <div className="space-y-4">
          {historyLoading ? (
            <div className="flex justify-center py-16"><Loader className="w-10 h-10 animate-spin text-gym-green" /></div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Dumbbell className="w-14 h-14 mx-auto mb-4 text-gray-700" />
              <p className="text-lg font-semibold text-gray-400">No workouts logged yet</p>
              <p className="text-sm mt-1">Start your first session and build that streak!</p>
            </div>
          ) : history.map((workout, idx) => (
            <div key={idx} className="bg-gym-card border border-gym-border p-5 rounded-2xl hover:border-gym-green/20 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white font-bold">{new Date(workout.date).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{workout.exercises?.length || 0} exercises • {workout.duration} min</p>
                </div>
                <div className="text-right">
                  <span className="text-orange-400 font-bold">{workout.calories} kcal</span>
                  {workout.notes && <p className="text-xs text-gray-600 mt-0.5 max-w-[150px] truncate">{workout.notes}</p>}
                </div>
              </div>
              {workout.exercises?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {workout.exercises.map((ex, i) => (
                    <span key={i} className="text-xs bg-gym-dark/60 border border-gym-border/60 px-2.5 py-1 rounded-lg text-gray-300 font-medium">
                      {ex.name}{ex.sets ? ` ${ex.sets}×${ex.reps}` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'Analytics' && (
        <div className="space-y-6">
          {analyticsData.length > 0 ? (
            <>
              <div className="bg-gym-card border border-gym-border p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" /> Calories & Duration Trend
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={analyticsData}>
                    <defs>
                      <linearGradient id="calG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="durG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="Calories" stroke="#f97316" strokeWidth={2} fill="url(#calG)" dot={{ r: 3, fill: '#f97316' }} />
                    <Area type="monotone" dataKey="Duration" stroke="#10b981" strokeWidth={2} fill="url(#durG)" dot={{ r: 3, fill: '#10b981' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gym-card border border-gym-border p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-gym-green" /> Total Volume (Sets × Reps × Weight)
                </h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={analyticsData} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Volume" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-gray-500">
              <BarChart2 className="w-14 h-14 mx-auto mb-4 text-gray-700" />
              <p className="font-semibold text-gray-400 text-lg">Log some workouts to see analytics</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
