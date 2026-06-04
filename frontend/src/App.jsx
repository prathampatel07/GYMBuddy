import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Components & Pages
import Navbar              from './components/Navbar';
import Login               from './pages/Login';
import Register            from './pages/Register';
import Dashboard           from './pages/Dashboard';
import PartnerMatch        from './pages/PartnerMatch';
import WorkoutLogger       from './pages/WorkoutLogger';
import StreakVerifier      from './pages/StreakVerifier';
import RewardsMarketplace  from './pages/RewardsMarketplace';
import Leaderboard         from './pages/Leaderboard';
import Prototype           from './pages/Prototype';
import AIInsights          from './pages/AIInsights';
import MonitoringDashboard from './pages/MonitoringDashboard';
import { Loader }          from 'lucide-react';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gym-dark flex items-center justify-center">
        <Loader className="w-10 h-10 text-gym-green animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Redirect logged-in users away from auth pages
function RouteSecurity({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return children;
}

function AppContent() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gym-dark text-gray-100 flex flex-col font-sans">
        <Navbar />
        <main className="flex-1">
          <Routes>
            {/* Public Routes */}
            <Route path="/login"     element={<Login />} />
            <Route path="/register"  element={<RouteSecurity><Register /></RouteSecurity>} />
            <Route path="/prototype" element={<Prototype />} />
            <Route path="/status"    element={<MonitoringDashboard />} />

            {/* Protected Routes */}
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/partners"    element={<ProtectedRoute><PartnerMatch /></ProtectedRoute>} />
            <Route path="/workouts"    element={<ProtectedRoute><WorkoutLogger /></ProtectedRoute>} />
            <Route path="/streaks"     element={<ProtectedRoute><StreakVerifier /></ProtectedRoute>} />
            <Route path="/rewards"     element={<ProtectedRoute><RewardsMarketplace /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/ai"          element={<ProtectedRoute><AIInsights /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
