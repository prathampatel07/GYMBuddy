import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Trophy, Flame, Dumbbell, Coins, Crown, Medal, Star, RefreshCw, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const RANK_STYLES = {
  1: { bg: 'from-yellow-500/20 to-yellow-600/5', border: 'border-yellow-500/50', badge: 'bg-yellow-500', icon: <Crown className="w-4 h-4 text-yellow-900" />, label: '👑' },
  2: { bg: 'from-gray-400/20 to-gray-500/5', border: 'border-gray-400/50', badge: 'bg-gray-400', icon: <Medal className="w-4 h-4 text-gray-900" />, label: '🥈' },
  3: { bg: 'from-gym-orange/20 to-gym-orange/5', border: 'border-gym-orange/50', badge: 'bg-gym-orange', icon: <Medal className="w-4 h-4 text-white" />, label: '🥉' },
};

function RankBadge({ rank }) {
  const style = RANK_STYLES[rank];
  if (!style) return (
    <div className="w-8 h-8 rounded-full bg-gym-border flex items-center justify-center text-xs font-extrabold text-gray-400">
      #{rank}
    </div>
  );
  return (
    <div className={`w-8 h-8 rounded-full ${style.badge} flex items-center justify-center text-sm`}>
      {style.icon}
    </div>
  );
}

function LeaderboardRow({ entry, index, isMe }) {
  const style = RANK_STYLES[entry.rank] || { bg: 'from-gym-card/30', border: 'border-gym-border' };
  const avatarLetters = (entry.name || entry.username || '??').slice(0, 2).toUpperCase();

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border bg-gradient-to-r ${style.bg} ${style.border} transition-all hover:brightness-110 ${isMe ? 'ring-2 ring-gym-green/50' : ''}`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <RankBadge rank={entry.rank} />

      {/* Avatar */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold shrink-0 ${
        isMe ? 'bg-gym-green text-gym-dark' : 'bg-gym-dark/60 text-gray-400 border border-gym-border'
      }`}>
        {avatarLetters}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-white truncate">{entry.name || entry.username}</span>
          {isMe && <span className="text-[10px] bg-gym-green/20 text-gym-green border border-gym-green/30 px-1.5 py-0.5 rounded-full font-bold">YOU</span>}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Dumbbell className="w-3 h-3" /> {entry.totalWorkouts || 0}
          </span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Coins className="w-3 h-3" /> {entry.coins || 0}
          </span>
          <span className="text-[10px] bg-gym-dark/40 border border-gym-border px-1.5 py-0.5 rounded text-gray-500">
            {entry.fitnessLevel || 'Beginner'}
          </span>
        </div>
      </div>

      {/* Streak */}
      <div className="flex flex-col items-end shrink-0">
        <div className="flex items-center gap-1">
          <Flame className="w-4 h-4 text-gym-orange" />
          <span className="text-lg font-extrabold text-white">{entry.streakCount || 0}</span>
        </div>
        <span className="text-[10px] text-gray-500">day streak</span>
      </div>
    </div>
  );
}

// Mock data for when API is empty
const MOCK_LEADERBOARD = [
  { rank: 1, username: 'iron_titan', name: 'Iron Titan', streakCount: 47, totalWorkouts: 183, coins: 4200, fitnessLevel: 'Advanced' },
  { rank: 2, username: 'cardio_queen', name: 'Cardio Queen', streakCount: 39, totalWorkouts: 155, coins: 3100, fitnessLevel: 'Advanced' },
  { rank: 3, username: 'flex_warrior', name: 'Flex Warrior', streakCount: 31, totalWorkouts: 122, coins: 2400, fitnessLevel: 'Intermediate' },
  { rank: 4, username: 'gym_beast_21', name: 'Gym Beast', streakCount: 24, totalWorkouts: 98, coins: 1800, fitnessLevel: 'Intermediate' },
  { rank: 5, username: 'push_harder', name: 'Push Harder', streakCount: 18, totalWorkouts: 76, coins: 1300, fitnessLevel: 'Intermediate' },
  { rank: 6, username: 'morning_lifter', name: 'Morning Lifter', streakCount: 14, totalWorkouts: 59, coins: 950, fitnessLevel: 'Beginner' },
  { rank: 7, username: 'fit_phoenix', name: 'Fit Phoenix', streakCount: 10, totalWorkouts: 41, coins: 700, fitnessLevel: 'Beginner' },
  { rank: 8, username: 'strength_seeker', name: 'Strength Seeker', streakCount: 7, totalWorkouts: 28, coins: 480, fitnessLevel: 'Beginner' },
];

export default function Leaderboard() {
  const { user } = useAuth();
  const [limit, setLimit] = useState(10);

  const { data: leaderboard, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: () => api.getLeaderboard(limit),
    staleTime: 30 * 1000, // 30 seconds
  });

  const displayData = (leaderboard && leaderboard.length > 0) ? leaderboard : MOCK_LEADERBOARD;
  const myRank = displayData.findIndex(e => e.username === user?.username) + 1;

  // Top 3 for podium
  const top3 = displayData.slice(0, 3);
  const rest = displayData.slice(3);

  return (
    <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-4 py-1.5 rounded-full text-xs text-yellow-400 font-bold mb-4">
          <Trophy className="w-3.5 h-3.5" /> Global Rankings
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-2">
          Hall of <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-gym-orange">Champions</span>
        </h1>
        <p className="text-gray-400 text-sm">Top users ranked by streak consistency and total workouts.</p>
      </div>

      {/* My Rank Banner (if not in top) */}
      {myRank > 3 && user && (
        <div className="bg-gym-green/10 border border-gym-green/30 rounded-xl px-4 py-3 flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-gym-green" />
            <span className="text-sm text-gray-300">Your rank: <strong className="text-white">#{myRank}</strong></span>
          </div>
          <Link to="/workouts" className="text-xs text-gym-green font-bold flex items-center gap-1 hover:underline">
            Log workout to climb <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-gym-card/30 border border-gym-border animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (
        <>
          {/* Podium — Top 3 */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {/* 2nd */}
            <div className="flex flex-col items-center pt-6">
              <div className="text-2xl mb-1">🥈</div>
              <div className="w-14 h-14 rounded-2xl bg-gray-400/20 border border-gray-400/40 flex items-center justify-center text-lg font-extrabold text-gray-300 mb-1">
                {(top3[1]?.name || top3[1]?.username || '??').slice(0, 2).toUpperCase()}
              </div>
              <div className="text-xs font-bold text-white text-center truncate w-full text-center">
                {top3[1]?.name || top3[1]?.username}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <Flame className="w-3 h-3 text-gym-orange" />
                <span className="text-xs font-bold text-white">{top3[1]?.streakCount || 0}d</span>
              </div>
              <div className="mt-1.5 h-16 w-full bg-gradient-to-t from-gray-500/30 to-transparent rounded-t-lg" />
            </div>

            {/* 1st */}
            <div className="flex flex-col items-center">
              <div className="text-3xl mb-1">👑</div>
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 border-2 border-yellow-500/60 flex items-center justify-center text-xl font-extrabold text-yellow-300 mb-1 shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                {(top3[0]?.name || top3[0]?.username || '??').slice(0, 2).toUpperCase()}
              </div>
              <div className="text-xs font-bold text-white text-center truncate w-full text-center">
                {top3[0]?.name || top3[0]?.username}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <Flame className="w-3 h-3 text-gym-orange" />
                <span className="text-xs font-bold text-yellow-400">{top3[0]?.streakCount || 0}d</span>
              </div>
              <div className="mt-1.5 h-24 w-full bg-gradient-to-t from-yellow-500/30 to-transparent rounded-t-lg" />
            </div>

            {/* 3rd */}
            <div className="flex flex-col items-center pt-10">
              <div className="text-2xl mb-1">🥉</div>
              <div className="w-14 h-14 rounded-2xl bg-gym-orange/20 border border-gym-orange/40 flex items-center justify-center text-lg font-extrabold text-gym-orange mb-1">
                {(top3[2]?.name || top3[2]?.username || '??').slice(0, 2).toUpperCase()}
              </div>
              <div className="text-xs font-bold text-white text-center truncate w-full text-center">
                {top3[2]?.name || top3[2]?.username}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <Flame className="w-3 h-3 text-gym-orange" />
                <span className="text-xs font-bold text-white">{top3[2]?.streakCount || 0}d</span>
              </div>
              <div className="mt-1.5 h-10 w-full bg-gradient-to-t from-gym-orange/30 to-transparent rounded-t-lg" />
            </div>
          </div>

          {/* Rest of list */}
          <div className="space-y-2 mb-4">
            {displayData.map((entry, i) => (
              <LeaderboardRow
                key={entry.username || i}
                entry={entry}
                index={i}
                isMe={user?.username === entry.username}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {limit < 50 && (
              <button
                onClick={() => setLimit(l => l + 10)}
                className="text-xs text-gym-green font-bold hover:underline cursor-pointer"
              >
                Show more →
              </button>
            )}
          </div>
        </>
      )}

      {/* CTA */}
      <div className="mt-8 bg-gradient-to-r from-gym-green/10 to-gym-teal/10 border border-gym-green/20 rounded-2xl p-5 text-center">
        <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
        <p className="text-white font-bold mb-1">Want to climb the ranks?</p>
        <p className="text-gray-400 text-xs mb-4">Log workouts daily and verify streaks to rise through the leaderboard.</p>
        <div className="flex gap-2 justify-center">
          <Link to="/workouts" className="px-4 py-2 bg-gym-green text-gym-dark text-xs font-bold rounded-xl hover:bg-gym-green/90 transition-all">
            Log Workout
          </Link>
          <Link to="/streaks" className="px-4 py-2 border border-gym-border text-gray-300 text-xs font-bold rounded-xl hover:border-gym-green/40 transition-all">
            Verify Streak
          </Link>
        </div>
      </div>
    </div>
  );
}
