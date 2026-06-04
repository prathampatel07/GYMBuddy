import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Dumbbell, Flame, Coins, LogOut, Bell, Trophy, Sparkles, Activity } from 'lucide-react';
import NotificationCenter, { useNotificationCount } from './NotificationCenter';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = useNotificationCount(user);

  if (!user) return null;

  const isActive = (path) => location.pathname === path;
  
  const linkClass = (path) => 
    `flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
      isActive(path) 
        ? 'bg-gym-green/20 text-gym-green border-b-2 border-gym-green shadow-[0_0_12px_rgba(16,185,129,0.2)]' 
        : 'text-gray-400 hover:text-white hover:bg-gym-border/30'
    }`;

  return (
    <>
      <nav className="sticky top-0 z-40 bg-gym-dark/80 backdrop-blur-md border-b border-gym-border px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-gym-green text-gym-dark p-2 rounded-lg group-hover:scale-110 transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            <Dumbbell className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-gray-200 to-gym-green bg-clip-text text-transparent">
            GYM<span className="text-gym-green">Buddy</span>
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          <Link to="/" className={linkClass('/')}>Dashboard</Link>
          <Link to="/partners" className={linkClass('/partners')}>Find Partner</Link>
          <Link to="/workouts" className={linkClass('/workouts')}>Workouts</Link>
          <Link to="/streaks" className={linkClass('/streaks')}>Streaks</Link>
          <Link to="/rewards" className={linkClass('/rewards')}>Marketplace</Link>
          <Link to="/leaderboard" className={linkClass('/leaderboard')}>
            <Trophy className="w-3.5 h-3.5" /> Leaderboard
          </Link>
          <Link
            to="/ai"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
              isActive('/ai')
                ? 'bg-gym-green/20 text-gym-green shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'text-gym-green/80 hover:text-gym-green hover:bg-gym-green/10'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> AI Coach
          </Link>
        </div>

        {/* Right Side: Stats + Bell + Profile */}
        <div className="flex items-center gap-3">
          {/* Streak Pill */}
          <div className="flex items-center gap-1 bg-orange-500/10 text-orange-400 border border-orange-500/30 px-3 py-1.5 rounded-full text-sm font-semibold shadow-[0_0_8px_rgba(249,115,22,0.15)]">
            <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
            <span>{user.streakCount || 0} Day{(user.streakCount || 0) !== 1 ? 's' : ''}</span>
          </div>

          {/* Coins Pill */}
          <div className="hidden sm:flex items-center gap-1.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-3 py-1.5 rounded-full text-sm font-semibold shadow-[0_0_8px_rgba(234,179,8,0.15)]">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span>{user.coins || 0}</span>
          </div>

          {/* Notification Bell */}
          <button
            id="notification-bell"
            onClick={() => setNotifOpen(true)}
            className="relative p-2 hover:bg-gym-border/40 text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-gym-green text-gym-dark text-[10px] font-black rounded-full flex items-center justify-center px-0.5 shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Username + Logout */}
          <div className="flex items-center gap-2 border-l border-gym-border pl-3">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-sm font-semibold text-white leading-tight">{user.username}</span>
              <span className="text-xs text-gray-500">Gym Member</span>
            </div>
            <Link
              to="/status"
              title="System Status"
              className="p-2 hover:bg-cyan-500/10 text-gray-400 hover:text-cyan-400 rounded-lg transition-colors duration-300"
            >
              <Activity className="w-5 h-5" />
            </Link>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-lg transition-colors duration-300 cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Notification Drawer */}
      <NotificationCenter isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}
