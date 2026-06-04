import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, Flame, Users, Coins, Dumbbell, Bell, CheckCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NOTIFICATION_TYPES = {
  streak_reminder: { icon: <Flame className="w-4 h-4 text-orange-500" />, bg: 'bg-orange-500/10 border-orange-500/20' },
  partner_verified: { icon: <Users className="w-4 h-4 text-gym-green" />, bg: 'bg-gym-green/10 border-gym-green/20' },
  coins_earned: { icon: <Coins className="w-4 h-4 text-yellow-400" />, bg: 'bg-yellow-500/10 border-yellow-500/20' },
  workout_reminder: { icon: <Dumbbell className="w-4 h-4 text-gym-teal" />, bg: 'bg-gym-teal/10 border-gym-teal/20' },
  milestone: { icon: <Coins className="w-4 h-4 text-purple-400" />, bg: 'bg-purple-500/10 border-purple-500/20' },
};

function generateNotifications(user) {
  const notifications = [];
  const now = new Date();
  const streak = user?.streakCount || 0;
  const coins = user?.coins || 0;

  // Streak reminder if early in the day
  const hour = now.getHours();
  if (hour < 20) {
    notifications.push({
      id: 'streak-reminder',
      type: 'streak_reminder',
      title: 'Daily Streak at Risk!',
      message: `You haven't uploaded workout proof today. Upload before midnight to maintain your ${streak}-day streak! 🔥`,
      time: 'Today',
      link: '/streaks',
      unread: true,
    });
  }

  // Welcome coins if new user
  if (coins > 0 && coins <= 200) {
    notifications.push({
      id: 'welcome-coins',
      type: 'coins_earned',
      title: 'Welcome Bonus Applied!',
      message: `You received 100 Fitness Coins for joining Gym Buddy. Start logging workouts to earn more!`,
      time: 'Recently',
      link: '/rewards',
      unread: true,
    });
  }

  // Milestone notifications
  if (streak >= 7) {
    notifications.push({
      id: 'streak-7',
      type: 'milestone',
      title: `🏆 ${streak}-Day Streak Milestone!`,
      message: `You're on a ${streak}-day workout streak! Top 10% of all Gym Buddy users. Keep it up!`,
      time: 'Today',
      link: '/streaks',
      unread: streak < 14,
    });
  }

  if (coins >= 500) {
    notifications.push({
      id: 'coins-500',
      type: 'coins_earned',
      title: 'Reward Unlocked!',
      message: `You have ${coins} coins — enough to redeem a Resistance Band Set or Protein Sample in the marketplace!`,
      time: '1 hour ago',
      link: '/rewards',
      unread: false,
    });
  }

  // Find partner reminder
  if (!user?.partner) {
    notifications.push({
      id: 'find-partner',
      type: 'workout_reminder',
      title: 'Find a Gym Buddy!',
      message: 'You don\'t have a workout partner yet. AI matching is ready — find your perfect accountability partner!',
      time: '2 hours ago',
      link: '/partners',
      unread: true,
    });
  }

  return notifications;
}

export default function NotificationCenter({ isOpen, onClose }) {
  const { user } = useAuth();
  const drawerRef = useRef();
  const notifications = generateNotifications(user);
  const unreadCount = notifications.filter(n => n.unread).length;

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  // Trap scroll on body when drawer is open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-gym-card border-l border-gym-border shadow-2xl z-50 transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-label="Notification Center"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gym-border shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gym-green" />
            <h2 className="text-lg font-extrabold text-white">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-gym-green text-gym-dark text-xs font-black px-2 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gym-border transition-colors text-gray-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mark All Read shortcut */}
        {unreadCount > 0 && (
          <div className="px-5 py-2 border-b border-gym-border/50 shrink-0">
            <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gym-green font-semibold cursor-pointer">
              <CheckCheck className="w-3.5 h-3.5" /> Mark all as read
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 px-3">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-16">
              <Bell className="w-14 h-14 text-gray-700" />
              <p className="text-gray-500 font-semibold">All caught up!</p>
              <p className="text-gray-600 text-xs">No new notifications right now</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const config = NOTIFICATION_TYPES[notif.type] || NOTIFICATION_TYPES.workout_reminder;
              return (
                <Link key={notif.id} to={notif.link} onClick={onClose}
                  className={`block p-4 rounded-xl border transition-all hover:brightness-110 ${config.bg} ${notif.unread ? 'opacity-100' : 'opacity-70'}`}>
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-gym-dark/40 shrink-0 mt-0.5">{config.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-white font-bold text-sm leading-snug truncate">{notif.title}</p>
                        {notif.unread && <span className="w-2 h-2 bg-gym-green rounded-full shrink-0 mt-0.5"></span>}
                      </div>
                      <p className="text-gray-400 text-xs leading-relaxed">{notif.message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-gray-600 text-[10px] font-semibold">{notif.time}</span>
                        <span className="text-gym-green text-[10px] font-bold flex items-center gap-0.5">
                          View <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gym-border shrink-0">
          <p className="text-xs text-gray-600 text-center">Notifications are generated based on your activity</p>
        </div>
      </div>
    </>
  );
}

// Export unread count helper for Navbar badge
export function useNotificationCount(user) {
  return generateNotifications(user).filter(n => n.unread).length;
}
