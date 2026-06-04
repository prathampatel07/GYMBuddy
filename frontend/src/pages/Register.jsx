import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { Dumbbell, Lock, Mail, User, Loader, ArrowRight, ArrowLeft, CheckCircle, Ruler, Weight, Calendar, ChevronRight } from 'lucide-react';

const STEPS = ['Account', 'Profile'];
const FITNESS_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

export default function Register() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1 fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2 fields
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState('Beginner');

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleStep1 = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setCurrentStep(1);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Register with base credentials first
      await register(username, email, password);

      // Then update profile with step 2 metrics if provided
      if (name || age || gender || height || weight) {
        await api.updateProfile({
          name,
          age: age ? Number(age) : 0,
          gender,
          height: height ? Number(height) : 0,
          weight: weight ? Number(weight) : 0,
          fitnessLevel,
        });
      }
      toast.success(`Welcome to Gym Buddy, ${username}! 🎉 You earned 100 welcome coins!`);
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full pl-10 pr-4 py-3 bg-gym-dark/50 border border-gym-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gym-green transition-all";
  const bareInputClass = "w-full px-4 py-3 bg-gym-dark/50 border border-gym-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-gym-green transition-all";

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg bg-gym-card/40 backdrop-blur-xl border border-gym-border p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Glow effects */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gym-green/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gym-teal/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gym-green text-gym-dark p-3 rounded-xl mb-4 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Dumbbell className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Create Account</h2>
          <p className="text-gray-400 text-sm mt-2">Start your social fitness accountability journey</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((step, idx) => (
            <React.Fragment key={step}>
              <div className={`flex items-center gap-2 transition-all ${idx <= currentStep ? 'text-gym-green' : 'text-gray-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold border-2 transition-all ${
                  idx < currentStep ? 'bg-gym-green border-gym-green text-gym-dark' :
                  idx === currentStep ? 'border-gym-green text-gym-green bg-gym-green/10' :
                  'border-gym-border text-gray-500'
                }`}>
                  {idx < currentStep ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                </div>
                <span className="text-sm font-semibold hidden sm:block">{step}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 max-w-[60px] rounded-full transition-all ${idx < currentStep ? 'bg-gym-green' : 'bg-gym-border'}`}></div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Account Credentials */}
        {currentStep === 0 && (
          <form onSubmit={handleStep1} className="space-y-5">
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500"><User className="w-5 h-5" /></span>
                <input id="username" type="text" required minLength={3} className={inputClass} placeholder="gymstar_99"
                  value={username} onChange={e => setUsername(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500"><Mail className="w-5 h-5" /></span>
                <input id="email" type="email" required className={inputClass} placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500"><Lock className="w-5 h-5" /></span>
                <input id="password" type="password" required minLength={6} className={inputClass} placeholder="Min. 6 characters"
                  value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">Confirm Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500"><Lock className="w-5 h-5" /></span>
                <input id="confirm" type="password" required className={inputClass} placeholder="Repeat password"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>
            </div>
            <button type="submit"
              className="w-full py-3.5 bg-gym-green hover:bg-gym-green/90 text-gym-dark font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2 cursor-pointer">
              Next: Fitness Profile <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        )}

        {/* Step 2: Fitness Profile */}
        {currentStep === 1 && (
          <form onSubmit={handleFinalSubmit} className="space-y-5">
            <p className="text-xs text-gray-400 bg-gym-dark/30 border border-gym-border/40 p-3 rounded-lg">
              ✨ <strong className="text-white">Optional</strong> — Fill your fitness details to get better partner matches. You can skip and update later on your dashboard.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-xs font-semibold mb-1">Full Name</label>
                <input type="text" className={bareInputClass} placeholder="John Doe"
                  value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-gray-300 text-xs font-semibold mb-1">Age</label>
                <input type="number" min="13" max="100" className={bareInputClass} placeholder="25"
                  value={age} onChange={e => setAge(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-xs font-semibold mb-1">Gender</label>
              <div className="flex flex-wrap gap-2">
                {GENDERS.map(g => (
                  <button key={g} type="button" onClick={() => setGender(g)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      gender === g ? 'bg-gym-green/20 border-gym-green text-gym-green' : 'bg-gym-dark/40 border-gym-border text-gray-400 hover:border-gray-500'}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-xs font-semibold mb-1 flex items-center gap-1">
                  <Ruler className="w-3.5 h-3.5 text-gym-teal" /> Height (cm)
                </label>
                <input type="number" min="100" max="250" className={bareInputClass} placeholder="175"
                  value={height} onChange={e => setHeight(e.target.value)} />
              </div>
              <div>
                <label className="block text-gray-300 text-xs font-semibold mb-1 flex items-center gap-1">
                  <Weight className="w-3.5 h-3.5 text-gym-orange" /> Weight (kg)
                </label>
                <input type="number" min="30" max="300" className={bareInputClass} placeholder="70"
                  value={weight} onChange={e => setWeight(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-xs font-semibold mb-2">Fitness Experience Level</label>
              <div className="grid grid-cols-3 gap-3">
                {FITNESS_LEVELS.map((level, idx) => {
                  const colors = ['text-gym-green border-gym-green bg-gym-green/10', 'text-gym-teal border-gym-teal bg-gym-teal/10', 'text-gym-orange border-gym-orange bg-gym-orange/10'];
                  const inactiveClass = 'border-gym-border text-gray-400 bg-gym-dark/30';
                  return (
                    <button key={level} type="button" onClick={() => setFitnessLevel(level)}
                      className={`py-3 rounded-xl border-2 font-bold text-sm transition-all cursor-pointer ${fitnessLevel === level ? colors[idx] : inactiveClass}`}>
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setCurrentStep(0)}
                className="flex-1 py-3 border border-gym-border hover:bg-gym-border/30 text-gray-300 font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-3 bg-gym-green hover:bg-gym-green/90 text-gym-dark font-extrabold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                {loading ? <Loader className="w-5 h-5 animate-spin" /> : <>Create Account <CheckCircle className="w-5 h-5" /></>}
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-gym-green hover:underline font-semibold">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
