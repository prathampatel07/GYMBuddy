import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { Dumbbell, Lock, Mail, Loader, ArrowLeft, KeyRound, CheckCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Forgot Password / Reset Simulation states
  const [isForgot, setIsForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [newPassword, setNewPassword] = useState('newpassword123');
  const [resetSuccess, setResetSuccess] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      toast.success(`Welcome back! 💪 Let's crush it today!`);
      navigate('/');
    } catch (err) {
      const msg = err.message || 'Invalid credentials';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.forgotPassword(forgotEmail);
      setResetToken(response.resetToken);
      setResetUrl(response.resetUrl);
      toast.success('Reset token generated — see below to proceed!');
    } catch (err) {
      const msg = err.message || 'Failed to request reset link';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.resetPassword(resetToken, newPassword);
      setResetSuccess(true);
      toast.success('Password reset! Signing you in automatically...', { duration: 5000 });
      setTimeout(() => {
        setIsForgot(false);
        setResetToken('');
        setResetUrl('');
        setResetSuccess(false);
        setEmail(forgotEmail);
        setPassword(newPassword);
      }, 3000);
    } catch (err) {
      const msg = err.message || 'Password reset failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-gym-card/40 backdrop-blur-xl border border-gym-border p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-gym-green/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-gym-teal/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gym-green text-gym-dark p-3 rounded-xl mb-4 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Dumbbell className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            {isForgot ? 'Reset Password' : 'Welcome Back'}
          </h2>
          <p className="text-gray-400 text-sm mt-2 text-center">
            {isForgot 
              ? 'Request a simulated recovery token or execute resets.' 
              : 'Log in to track your streak with Gym Buddy'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm mb-6 text-center">
            {error}
          </div>
        )}

        {resetSuccess && (
          <div className="bg-gym-green/10 border border-gym-green/30 text-gym-green p-4 rounded-lg text-sm mb-6 flex flex-col items-center gap-2 text-center">
            <CheckCircle className="w-8 h-8" />
            <span className="font-bold">Password Reset Completed!</span>
            <span className="text-xs text-gray-300">Auto-filling form details for login...</span>
          </div>
        )}

        {!isForgot ? (
          /* LOGIN FORM */
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gym-dark/50 border border-gym-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gym-green transition-all"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-gray-300 text-sm font-semibold" htmlFor="password">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgot(true)}
                  className="text-xs text-gym-green hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  id="password"
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gym-dark/50 border border-gym-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gym-green transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gym-green hover:bg-gym-green/90 text-gym-dark font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        ) : (
          /* FORGOT / RESET PASSWORD SIMULATOR */
          <div className="space-y-6">
            {!resetToken ? (
              <form onSubmit={handleForgotSubmit} className="space-y-5">
                <div>
                  <label className="block text-gray-300 text-sm font-semibold mb-2">
                    Enter Recovery Email
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                      <Mail className="w-5 h-5" />
                    </span>
                    <input
                      type="email"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gym-dark/50 border border-gym-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gym-green transition-all"
                      placeholder="you@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gym-teal hover:bg-gym-teal/90 text-gym-dark font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader className="w-5 h-5 animate-spin" /> : 'Request Reset Link'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsForgot(false)}
                  className="w-full py-2.5 border border-gym-border hover:bg-gym-border/30 text-gray-300 text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </button>
              </form>
            ) : (
              /* RESET TOKEN FOUND - EXECUTE RESET SIMULATOR */
              <form onSubmit={handleResetSubmit} className="space-y-5">
                <div className="bg-gym-dark/50 border border-gym-teal/30 p-4 rounded-xl text-xs space-y-2">
                  <div className="flex items-center gap-1 text-gym-teal font-extrabold">
                    <KeyRound className="w-3.5 h-3.5" /> Simulated Token Generated
                  </div>
                  <p className="text-gray-400 break-all">Token: <span className="text-white font-mono">{resetToken}</span></p>
                  <p className="text-gray-400">Normally emailed, this has been intercepted for testing.</p>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-semibold mb-2">
                    Enter New Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                      <Lock className="w-5 h-5" />
                    </span>
                    <input
                      type="text"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gym-dark/50 border border-gym-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gym-green transition-all"
                      placeholder="e.g. newpassword123"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gym-green hover:bg-gym-green/90 text-gym-dark font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader className="w-5 h-5 animate-spin" /> : 'Confirm Reset Password'}
                </button>
              </form>
            )}
          </div>
        )}

        <p className="mt-8 text-center text-sm text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-gym-green hover:underline font-semibold transition-colors">
            Sign up now
          </Link>
        </p>
      </div>
    </div>
  );
}
