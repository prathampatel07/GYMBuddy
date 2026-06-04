import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Coins, Gift, ShoppingBag, Dumbbell, Zap, Star, CheckCircle, Loader, Clock, Trophy, Lock } from 'lucide-react';

const CATEGORIES = [
  { id: 'All', icon: <Star className="w-4 h-4" /> },
  { id: 'Merchandise', icon: <ShoppingBag className="w-4 h-4" /> },
  { id: 'Supplements', icon: <Zap className="w-4 h-4" /> },
  { id: 'Access', icon: <Dumbbell className="w-4 h-4" /> },
  { id: 'Training', icon: <Trophy className="w-4 h-4" /> },
];

// Default marketplace items (injected if API returns empty)
const DEFAULT_ITEMS = [
  { _id: 'r1', name: 'Gym Buddy T-Shirt', category: 'Merchandise', coinCost: 500, description: 'Premium Gym Buddy branded tee', icon: '👕' },
  { _id: 'r2', name: 'Protein Powder Sample', category: 'Supplements', coinCost: 250, description: 'High-quality whey protein, 5 servings', icon: '🥤' },
  { _id: 'r3', name: '1 Month Premium Access', category: 'Access', coinCost: 1200, description: 'Unlock all advanced analytics & features', icon: '⭐' },
  { _id: 'r4', name: 'Personal Training Session', category: 'Training', coinCost: 800, description: '60-min session with a certified PT', icon: '🏋️' },
  { _id: 'r5', name: 'Resistance Band Set', category: 'Merchandise', coinCost: 400, description: '5 bands of varying resistance levels', icon: '🔗' },
  { _id: 'r6', name: 'Creatine Monohydrate', category: 'Supplements', coinCost: 350, description: '30-day supply of pure creatine', icon: '💊' },
  { _id: 'r7', name: 'Gym Locker Access (1 Week)', category: 'Access', coinCost: 150, description: 'Secure locker at partner gyms', icon: '🔐' },
  { _id: 'r8', name: 'Online Workout Program', category: 'Training', coinCost: 600, description: '8-week strength & conditioning program', icon: '📋' },
];

// Confetti particle component
function ConfettiPiece({ style }) {
  return <div style={style} className="absolute w-2 h-2 rounded-sm pointer-events-none" />;
}

export default function RewardsMarketplace() {
  const { user, refreshProfile } = useAuth();
  const qClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState('All');
  const [confettiActive, setConfettiActive] = useState(false);
  const [confettiParticles, setConfettiParticles] = useState([]);
  const [redeeming, setRedeeming] = useState(null);

  const { data: rawItems = [] } = useQuery({
    queryKey: ['rewardItems'],
    queryFn: api.getRewardItems,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['redemptionHistory'],
    queryFn: api.getRedemptionHistory,
  });

  const items = rawItems.length > 0 ? rawItems : DEFAULT_ITEMS;

  const triggerConfetti = () => {
    const colors = ['#10b981', '#14b8a6', '#f97316', '#facc15', '#60a5fa', '#a78bfa'];
    const particles = Array.from({ length: 48 }, (_, i) => ({
      id: i,
      style: {
        left: `${Math.random() * 100}%`,
        top: `-10px`,
        backgroundColor: colors[Math.floor(Math.random() * colors.length)],
        transform: `rotate(${Math.random() * 360}deg)`,
        animation: `confettiFall ${0.8 + Math.random() * 1.2}s ease-out ${Math.random() * 0.3}s forwards`,
        width: `${6 + Math.random() * 8}px`,
        height: `${6 + Math.random() * 8}px`,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      }
    }));
    setConfettiParticles(particles);
    setConfettiActive(true);
    setTimeout(() => { setConfettiActive(false); setConfettiParticles([]); }, 2500);
  };

  const redeemMutation = useMutation({
    mutationFn: api.redeemReward,
    onMutate: (itemId) => setRedeeming(itemId),
    onSuccess: (_, itemId) => {
      setRedeeming(null);
      qClient.invalidateQueries({ queryKey: ['redemptionHistory'] });
      qClient.invalidateQueries({ queryKey: ['rewardItems'] });
      if (refreshProfile) refreshProfile();
      triggerConfetti();
      toast.success('🎉 Reward redeemed successfully! Check your email for details.', { duration: 6000 });
    },
    onError: (err) => {
      setRedeeming(null);
      toast.error(err.message || 'Redemption failed');
    },
  });

  const filtered = items.filter(i => activeCategory === 'All' || i.category === activeCategory);
  const userCoins = user?.coins || 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 relative">
      {/* Confetti Layer */}
      {confettiActive && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          <style>{`@keyframes confettiFall { 0% { transform: translateY(0) rotate(0deg); opacity:1; } 100% { transform: translateY(100vh) rotate(720deg); opacity:0; } }`}</style>
          {confettiParticles.map(p => <ConfettiPiece key={p.id} style={p.style} />)}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-yellow-500/10 rounded-xl"><Gift className="w-7 h-7 text-yellow-400" /></div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Rewards Marketplace</h1>
            <p className="text-gray-400 text-sm">Redeem Fitness Coins for real-world rewards</p>
          </div>
        </div>
        {/* Coin Balance */}
        <div className="flex items-center gap-2.5 bg-yellow-500/10 border border-yellow-500/20 px-5 py-3 rounded-2xl">
          <Coins className="w-6 h-6 text-yellow-400" />
          <div>
            <p className="text-[10px] text-yellow-500/70 font-bold uppercase tracking-wider">Your Balance</p>
            <p className="text-2xl font-black text-yellow-400 leading-none">{userCoins.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* How to Earn */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Register', coins: 100, icon: '🎉' },
          { label: 'Log Workout', coins: 15, icon: '💪' },
          { label: 'Verify Streak', coins: 20, icon: '🔥' },
          { label: 'Partner Verify', coins: 20, icon: '🤝' },
        ].map(item => (
          <div key={item.label} className="bg-gym-card border border-gym-border p-3 rounded-xl text-center">
            <span className="text-2xl">{item.icon}</span>
            <p className="text-white font-bold text-sm mt-1">{item.label}</p>
            <p className="text-yellow-400 font-extrabold text-xs">+{item.coins} Coins</p>
          </div>
        ))}
      </div>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none">
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap border transition-all cursor-pointer shrink-0 ${
              activeCategory === cat.id
                ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                : 'border-gym-border text-gray-400 hover:border-gray-500 hover:text-gray-300'
            }`}>
            {cat.icon} {cat.id}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {filtered.map(item => {
          const canAfford = userCoins >= item.coinCost;
          const isRedeeming = redeeming === item._id;
          return (
            <div key={item._id}
              className={`bg-gym-card border rounded-2xl p-5 flex flex-col gap-4 transition-all ${
                canAfford ? 'border-gym-border hover:border-yellow-500/30 hover:shadow-[0_0_20px_rgba(234,179,8,0.07)]' : 'border-gym-border opacity-70'
              }`}>

              {/* Icon & Category */}
              <div className="flex items-start justify-between">
                <span className="text-4xl">{item.icon || '🎁'}</span>
                <span className="text-[10px] bg-gym-dark/50 border border-gym-border px-2.5 py-1 rounded-full text-gray-500 font-bold uppercase tracking-wide">
                  {item.category}
                </span>
              </div>

              {/* Name & Description */}
              <div className="flex-1 space-y-1">
                <h3 className="text-white font-extrabold text-base leading-tight">{item.name}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{item.description}</p>
              </div>

              {/* Cost + CTA */}
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 font-extrabold text-lg">{item.coinCost}</span>
                  <span className="text-gray-600 text-xs">coins</span>
                  {!canAfford && <Lock className="w-3.5 h-3.5 text-gray-600 ml-auto" />}
                </div>
                <button
                  onClick={() => canAfford && redeemMutation.mutate(item._id)}
                  disabled={!canAfford || isRedeeming || redeemMutation.isPending}
                  className={`w-full py-2.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    canAfford
                      ? 'bg-yellow-500 hover:bg-yellow-400 text-gym-dark shadow-[0_0_12px_rgba(234,179,8,0.2)] hover:shadow-[0_0_20px_rgba(234,179,8,0.35)]'
                      : 'bg-gym-border text-gray-600 cursor-not-allowed'
                  } disabled:opacity-60`}>
                  {isRedeeming
                    ? <Loader className="w-4 h-4 animate-spin" />
                    : canAfford
                    ? <><Gift className="w-4 h-4" /> Redeem</>
                    : <><Lock className="w-4 h-4" /> {item.coinCost - userCoins} more needed</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Redemption History */}
      {history.length > 0 && (
        <div className="bg-gym-card border border-gym-border rounded-2xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-gym-teal" /> Redemption History
          </h2>
          <div className="space-y-3">
            {history.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 bg-gym-dark/40 border border-gym-border/50 px-4 py-3 rounded-xl">
                <span className="text-2xl">{item.icon || '🎁'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{item.rewardName || item.name}</p>
                  <p className="text-gray-500 text-xs">{new Date(item.redeemedAt).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 font-bold text-sm">-{item.coinCost}</span>
                </div>
                <span className="flex items-center gap-1 text-xs text-gym-green font-bold bg-gym-green/10 border border-gym-green/20 px-2.5 py-1 rounded-full">
                  <CheckCircle className="w-3 h-3" /> Redeemed
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
