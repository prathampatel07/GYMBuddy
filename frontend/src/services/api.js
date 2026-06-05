const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://gymbuddy-api-production.up.railway.app/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

const safeJson = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
};

export const api = {
  // ─── Auth ────────────────────────────────────────────────────────────
  async register(username, email, password) {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    return safeJson(res);
  },

  async login(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return safeJson(res);
  },

  async getProfile() {
    const res = await fetch(`${API_URL}/auth/profile`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return safeJson(res);
  },

  async updateProfile(profileData) {
    const res = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(profileData),
    });
    return safeJson(res);
  },

  async forgotPassword(email) {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return safeJson(res);
  },

  async resetPassword(token, password) {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    return safeJson(res);
  },

  // ─── Partners ────────────────────────────────────────────────────────
  /** AI-based partner suggestions (alias for recommendations) */
  async getPartnerSuggestions() {
    const res = await fetch(`${API_URL}/partners/recommendations`, {
      method: 'GET',
      headers: getHeaders(),
    });
    // Graceful fallback: return empty array on error (backend may 404 if no matches)
    const data = await res.json().catch(() => []);
    if (!res.ok) return [];
    return Array.isArray(data) ? data : (data.recommendations || data.users || []);
  },

  /** Send a partner request by target user ID */
  async sendPartnerRequest(targetUserId) {
    const res = await fetch(`${API_URL}/partners/request`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ targetUserId }),
    });
    return safeJson(res);
  },

  async getRecommendations() {
    return this.getPartnerSuggestions();
  },

  async sendMatchRequest(targetUserId) {
    return this.sendPartnerRequest(targetUserId);
  },

  async respondToMatchRequest(matchId, action) {
    const res = await fetch(`${API_URL}/partners/respond`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ matchId, action }),
    });
    return safeJson(res);
  },

  async getActivePartner() {
    const res = await fetch(`${API_URL}/partners/active`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return null;
    return data?.partner || data || null;
  },

  async unmatch() {
    const res = await fetch(`${API_URL}/partners/unmatch`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return safeJson(res);
  },

  // ─── Workouts ────────────────────────────────────────────────────────
  async logWorkout(workoutData) {
    const res = await fetch(`${API_URL}/workouts/log`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(workoutData),
    });
    return safeJson(res);
  },

  async getWorkoutHistory() {
    const res = await fetch(`${API_URL}/workouts/history`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => []);
    if (!res.ok) return [];
    return Array.isArray(data) ? data : (data.workouts || []);
  },

  async getWorkoutStats() {
    const res = await fetch(`${API_URL}/workouts/stats`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return {};
    return data.stats || data;
  },

  // ─── Streaks ─────────────────────────────────────────────────────────
  /** Upload a workout proof image (FormData with 'proof' file field) */
  async uploadStreakProof(formData) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/streaks/proof`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,  // Don't set Content-Type — browser sets multipart boundary
    });
    return safeJson(res);
  },

  /** Legacy text-based proof submission */
  async submitStreakProof(proofText, proofImage, date) {
    const res = await fetch(`${API_URL}/streaks/proof`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ proofText, proofImage, date }),
    });
    return safeJson(res);
  },

  async getStreakStatus() {
    const res = await fetch(`${API_URL}/streaks/status`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { currentStreak: 0, longestStreak: 0, totalVerified: 0 };
    return data;
  },

  /** Fetch proof submission history (own + partner's) */
  async getProofHistory() {
    const res = await fetch(`${API_URL}/streaks/history`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => []);
    if (!res.ok) return [];
    return Array.isArray(data) ? data : (data.proofs || []);
  },

  async verifyPartnerProof(proofId) {
    const res = await fetch(`${API_URL}/streaks/verify-partner`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ proofId }),
    });
    return safeJson(res);
  },

  // ─── Rewards ─────────────────────────────────────────────────────────
  /** Get marketplace items (alias: getRewardItems) */
  async getRewardItems() {
    const res = await fetch(`${API_URL}/rewards/catalog`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => []);
    if (!res.ok) return [];
    return Array.isArray(data) ? data : (data.items || data.catalog || []);
  },

  async getRewardsCatalog() {
    return this.getRewardItems();
  },

  async redeemReward(rewardId) {
    const res = await fetch(`${API_URL}/rewards/redeem`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ rewardId }),
    });
    return safeJson(res);
  },

  /** Get redemption history (alias: getRedemptionHistory) */
  async getRedemptionHistory() {
    const res = await fetch(`${API_URL}/rewards/my-rewards`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => []);
    if (!res.ok) return [];
    return Array.isArray(data) ? data : (data.redemptions || data.rewards || []);
  },

  async getMyRewards() {
    return this.getRedemptionHistory();
  },

  // ─── Coin Transactions ───────────────────────────────────────────────
  async getCoinTransactions(limit = 20) {
    const res = await fetch(`${API_URL}/rewards/transactions?limit=${limit}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => []);
    if (!res.ok) return [];
    return Array.isArray(data) ? data : [];
  },

  // ─── Analytics ───────────────────────────────────────────────────────
  async getWeeklySummary(offset = 0) {
    const res = await fetch(`${API_URL}/analytics/weekly?offset=${offset}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    return data;
  },

  async getMonthlySummary(year, month) {
    const y = year || new Date().getFullYear();
    const m = month || new Date().getMonth() + 1;
    const res = await fetch(`${API_URL}/analytics/monthly?year=${y}&month=${m}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    return data;
  },

  async getProgressReport() {
    const res = await fetch(`${API_URL}/analytics/progress`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return null;
    return data;
  },

  async getLeaderboard(limit = 10) {
    const res = await fetch(`${API_URL}/analytics/leaderboard?limit=${limit}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => []);
    if (!res.ok) return [];
    return Array.isArray(data) ? data : [];
  },

  // ─── AI Features ─────────────────────────────────────────────────────
  async getAIMatches({ minScore = 20, limit = 10, goal } = {}) {
    const params = new URLSearchParams({ minScore, limit });
    if (goal) params.append('goal', goal);
    const res = await fetch(`${API_URL}/ai/matches?${params}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => ({ results: [] }));
    if (!res.ok) return { results: [], count: 0 };
    return data;
  },

  async getCompatibility(targetUserId) {
    const res = await fetch(`${API_URL}/ai/compatibility/${targetUserId}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return null;
    return data;
  },

  async getWorkoutPlan() {
    const res = await fetch(`${API_URL}/ai/workout-plan`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return null;
    return data;
  },

  async getMotivation() {
    const res = await fetch(`${API_URL}/ai/motivation`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return null;
    return data;
  },

  async getVarietyAnalysis() {
    const res = await fetch(`${API_URL}/ai/variety`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return null;
    return data;
  },

  async getNudges() {
    const res = await fetch(`${API_URL}/ai/nudges`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => ({ nudges: [] }));
    if (!res.ok) return { nudges: [], count: 0 };
    return data;
  },

  async getAIInsights() {
    const res = await fetch(`${API_URL}/ai/insights`, {
      method: 'GET',
      headers: getHeaders(),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return null;
    return data;
  },
};

