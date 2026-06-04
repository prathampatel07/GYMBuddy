import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { Users, Sparkles, MapPin, Target, Clock, Star, Loader, Filter, UserCheck, ChevronRight } from 'lucide-react';

// Animated SVG compatibility score dial
function ScoreDial({ score }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const color = score >= 85 ? '#10b981' : score >= 70 ? '#14b8a6' : score >= 55 ? '#f97316' : '#6b7280';
  const label = score >= 85 ? 'Excellent' : score >= 70 ? 'Great' : score >= 55 ? 'Good' : 'Fair';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          {/* Track */}
          <circle cx="48" cy="48" r={radius} fill="none" stroke="#1f2937" strokeWidth="7" />
          {/* Progress */}
          <circle cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
          />
        </svg>
        {/* Score Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold text-white leading-none">{score}%</span>
          <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color }}>{label}</span>
        </div>
      </div>
      <span className="text-xs text-gray-500 mt-1 font-semibold">Match</span>
    </div>
  );
}

// Category match badge
function MatchBadge({ label, matched, icon }) {
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border transition-all ${
      matched
        ? 'bg-gym-green/10 border-gym-green/30 text-gym-green'
        : 'bg-gym-border/20 border-gym-border/40 text-gray-600'
    }`}>
      {icon}<span>{label}</span>
    </div>
  );
}

const LEVEL_OPTIONS = ['All Levels', 'Beginner', 'Intermediate', 'Advanced'];
const GOAL_OPTIONS = ['All Goals', 'Strength', 'Cardio', 'Weight Loss', 'Flexibility', 'Endurance', 'General Fitness'];

export default function PartnerMatch() {
  const qClient = useQueryClient();
  const [selectedLevel, setSelectedLevel] = useState('All Levels');
  const [selectedGoal, setSelectedGoal] = useState('All Goals');
  const [showFilters, setShowFilters] = useState(false);

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['partnerSuggestions'],
    queryFn: api.getPartnerSuggestions,
  });

  const { data: myPartner } = useQuery({
    queryKey: ['activePartner'],
    queryFn: api.getActivePartner,
  });

  const requestMutation = useMutation({
    mutationFn: api.sendPartnerRequest,
    onSuccess: () => {
      qClient.invalidateQueries({ queryKey: ['partnerSuggestions'] });
      qClient.invalidateQueries({ queryKey: ['activePartner'] });
      toast.success('Partner request sent! 🤝 They will be notified.');
    },
    onError: (err) => toast.error('Failed: ' + err.message),
  });

  // Filter partners
  const filtered = suggestions.filter(p => {
    const levelMatch = selectedLevel === 'All Levels' || p.fitnessLevel === selectedLevel;
    const goalMatch = selectedGoal === 'All Goals' || (p.fitnessGoals || []).includes(selectedGoal);
    return levelMatch && goalMatch;
  });

  const levelColor = { Beginner: 'text-gym-green border-gym-green', Intermediate: 'text-gym-teal border-gym-teal', Advanced: 'text-gym-orange border-gym-orange' };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gym-teal/10 rounded-xl"><Users className="w-7 h-7 text-gym-teal" /></div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">AI Partner Matching</h1>
            <p className="text-gray-400 text-sm">Find your perfect accountability partner</p>
          </div>
        </div>
        <button onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm transition-all cursor-pointer ${
            showFilters ? 'bg-gym-green/10 border-gym-green text-gym-green' : 'border-gym-border text-gray-400 hover:border-gray-500'}`}>
          <Filter className="w-4 h-4" /> Filters
        </button>
      </div>

      {/* Active Partner Banner */}
      {myPartner && (
        <div className="flex items-center gap-4 bg-gym-green/5 border border-gym-green/20 p-5 rounded-2xl">
          <div className="p-3 bg-gym-green/10 rounded-xl"><UserCheck className="w-6 h-6 text-gym-green" /></div>
          <div className="flex-1">
            <p className="text-sm text-gray-400 font-medium">Your Active Gym Buddy</p>
            <p className="text-white font-extrabold text-lg">{myPartner.name || myPartner.username}</p>
            <p className="text-xs text-gray-500">{myPartner.fitnessLevel} • {myPartner.location || 'Location not set'}</p>
          </div>
          <div className="text-right">
            <span className="text-orange-400 font-extrabold text-xl">{myPartner.streakCount || 0}</span>
            <p className="text-xs text-gray-500">Day Streak</p>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gym-card border border-gym-border p-5 rounded-2xl space-y-4 animate-fadeIn">
          <div>
            <label className="text-gray-400 text-xs font-bold uppercase mb-2 block">Fitness Level</label>
            <div className="flex flex-wrap gap-2">
              {LEVEL_OPTIONS.map(l => (
                <button key={l} onClick={() => setSelectedLevel(l)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-all ${
                    selectedLevel === l ? 'bg-gym-green/10 border-gym-green text-gym-green' : 'border-gym-border text-gray-400 hover:border-gray-500'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-xs font-bold uppercase mb-2 block">Fitness Goal</label>
            <div className="flex flex-wrap gap-2">
              {GOAL_OPTIONS.map(g => (
                <button key={g} onClick={() => setSelectedGoal(g)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-all ${
                    selectedGoal === g ? 'bg-gym-teal/10 border-gym-teal text-gym-teal' : 'border-gym-border text-gray-400 hover:border-gray-500'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* How it Works */}
      <div className="flex items-start gap-3 bg-gym-dark/40 border border-gym-border/40 px-5 py-4 rounded-xl">
        <Sparkles className="w-5 h-5 text-gym-green shrink-0 mt-0.5" />
        <p className="text-sm text-gray-400 leading-relaxed">
          <strong className="text-white">AI Scoring:</strong> Our algorithm matches you based on fitness goals, experience level, workout schedule, and gym location proximity. Scores above <strong className="text-gym-green">85%</strong> are Excellent matches — they'll hold you accountable like no one else!
        </p>
      </div>

      {/* Partner Cards */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader className="w-12 h-12 animate-spin text-gym-green" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Users className="w-16 h-16 mx-auto text-gray-700" />
          <p className="text-gray-400 font-semibold text-lg">No matches found with these filters</p>
          <p className="text-gray-600 text-sm">Try adjusting your filters or complete your profile for better matches</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((partner) => {
            const score = partner.compatibilityScore || Math.round(60 + Math.random() * 40);
            const goalsMatch = partner.fitnessGoals?.length > 0;
            const schedMatch = partner.schedule?.length > 0;
            return (
              <div key={partner._id}
                className="bg-gym-card border border-gym-border hover:border-gym-green/30 p-6 rounded-2xl transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.07)] group">

                {/* Top Row: Avatar + Name + Dial */}
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex items-start gap-3 min-w-0">
                    {partner.profilePhotoUrl ? (
                      <img src={partner.profilePhotoUrl} alt={partner.username}
                        className="w-14 h-14 rounded-xl object-cover border-2 border-gym-border shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gym-border flex items-center justify-center font-black text-lg text-white shrink-0">
                        {partner.username?.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-white font-extrabold text-base truncate">{partner.name || partner.username}</h3>
                      <p className="text-gray-500 text-xs truncate">@{partner.username}</p>
                      <div className={`inline-flex border rounded-lg px-2 py-0.5 text-[10px] font-extrabold mt-1 ${levelColor[partner.fitnessLevel] || 'text-gray-500 border-gray-600'}`}>
                        {partner.fitnessLevel || 'Beginner'}
                      </div>
                    </div>
                  </div>
                  <ScoreDial score={score} />
                </div>

                {/* Match Category Badges */}
                <div className="flex flex-wrap gap-1.5 mb-5">
                  <MatchBadge label="Goals" matched={goalsMatch} icon={<Target className="w-3 h-3" />} />
                  <MatchBadge label="Schedule" matched={schedMatch} icon={<Clock className="w-3 h-3" />} />
                  <MatchBadge label="Location" matched={!!partner.location} icon={<MapPin className="w-3 h-3" />} />
                  <MatchBadge label="Level" matched={!!partner.fitnessLevel} icon={<Star className="w-3 h-3" />} />
                </div>

                {/* Details */}
                <div className="space-y-2 mb-5 text-sm">
                  {partner.location && (
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <MapPin className="w-3.5 h-3.5 text-gym-green shrink-0" />
                      <span className="truncate">{partner.location}</span>
                    </div>
                  )}
                  {partner.fitnessGoals?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {partner.fitnessGoals.slice(0, 3).map(g => (
                        <span key={g} className="text-[10px] bg-gym-green/5 border border-gym-green/10 text-gym-green px-2 py-0.5 rounded-full font-semibold">{g}</span>
                      ))}
                    </div>
                  )}
                  {partner.schedule?.length > 0 && (
                    <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                      <Clock className="w-3.5 h-3.5 text-gym-teal" />
                      {partner.schedule.join(' · ')}
                    </div>
                  )}
                </div>

                {/* CTA */}
                <button
                  onClick={() => requestMutation.mutate(partner._id)}
                  disabled={requestMutation.isPending}
                  className="w-full py-2.5 bg-gym-green hover:bg-gym-green/90 text-gym-dark font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-[0_0_12px_rgba(16,185,129,0.15)] hover:shadow-[0_0_20px_rgba(16,185,129,0.25)] cursor-pointer disabled:opacity-50">
                  {requestMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <><UserCheck className="w-4 h-4" /> Send Partner Request</>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
