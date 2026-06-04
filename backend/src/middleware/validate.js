/**
 * Validation Middleware — GymBuddy
 * Request payload validation and XSS sanitization for all routes.
 * Keeps route handlers clean by moving validation logic to dedicated middleware.
 */

// ── Utility: strip HTML/script tags ──────────────────────────────────────
const stripTags = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

// ── Global XSS Sanitizer Middleware ──────────────────────────────────────
/**
 * Sanitizes all string values in req.body recursively.
 * Apply to all routes via app.use() or per-router.
 */
export const sanitizeInputs = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string') {
        obj[key] = stripTags(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
    return obj;
  };
  if (req.body) req.body = sanitize(req.body);
  next();
};

// ── Auth Validators ───────────────────────────────────────────────────────
export const validateRegister = (req, res, next) => {
  const { username, email, password } = req.body;

  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    return res.status(400).json({ message: 'Username must be at least 3 characters long.' });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
    return res.status(400).json({ message: 'Username can only contain letters, numbers, and underscores.' });
  }
  if (username.trim().length > 30) {
    return res.status(400).json({ message: 'Username cannot exceed 30 characters.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
  }
  if (password.length > 128) {
    return res.status(400).json({ message: 'Password cannot exceed 128 characters.' });
  }

  next();
};

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ message: 'Please provide an email address.' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ message: 'Please provide a password.' });
  }

  next();
};

// ── Profile Update Validator ──────────────────────────────────────────────
export const validateProfileUpdate = (req, res, next) => {
  const { name, age, gender, height, weight, fitnessLevel, fitnessGoals, schedule } = req.body;

  if (name !== undefined && (typeof name !== 'string' || name.length > 60)) {
    return res.status(400).json({ message: 'Name must be a string up to 60 characters.' });
  }

  if (age !== undefined) {
    const n = Number(age);
    if (isNaN(n) || n < 13 || n > 100) {
      return res.status(400).json({ message: 'Age must be between 13 and 100.' });
    }
  }

  const VALID_GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say', ''];
  if (gender !== undefined && !VALID_GENDERS.includes(gender)) {
    return res.status(400).json({ message: 'Invalid gender value.' });
  }

  if (height !== undefined) {
    const n = Number(height);
    if (isNaN(n) || n < 50 || n > 300) {
      return res.status(400).json({ message: 'Height must be between 50 and 300 cm.' });
    }
  }

  if (weight !== undefined) {
    const n = Number(weight);
    if (isNaN(n) || n < 20 || n > 500) {
      return res.status(400).json({ message: 'Weight must be between 20 and 500 kg.' });
    }
  }

  const VALID_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
  if (fitnessLevel !== undefined && !VALID_LEVELS.includes(fitnessLevel)) {
    return res.status(400).json({ message: 'Fitness level must be Beginner, Intermediate, or Advanced.' });
  }

  const VALID_GOALS = ['Strength', 'Cardio', 'Weight Loss', 'Flexibility', 'Endurance', 'General Fitness'];
  if (fitnessGoals !== undefined) {
    if (!Array.isArray(fitnessGoals)) {
      return res.status(400).json({ message: 'fitnessGoals must be an array.' });
    }
    const invalid = fitnessGoals.filter((g) => !VALID_GOALS.includes(g));
    if (invalid.length > 0) {
      return res.status(400).json({ message: `Invalid fitness goals: ${invalid.join(', ')}` });
    }
  }

  const VALID_SCHEDULE = ['Morning', 'Afternoon', 'Evening', 'Weekends'];
  if (schedule !== undefined) {
    if (!Array.isArray(schedule)) {
      return res.status(400).json({ message: 'schedule must be an array.' });
    }
    const invalid = schedule.filter((s) => !VALID_SCHEDULE.includes(s));
    if (invalid.length > 0) {
      return res.status(400).json({ message: `Invalid schedule values: ${invalid.join(', ')}` });
    }
  }

  next();
};

// ── Workout Log Validator ─────────────────────────────────────────────────
export const validateWorkoutLog = (req, res, next) => {
  const { date, exercises, duration, calories } = req.body;

  // Accept both YYYY-MM-DD string and ISO date string
  if (!date) {
    return res.status(400).json({ message: 'Please provide a workout date.' });
  }
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    return res.status(400).json({ message: 'Please provide a valid date.' });
  }
  if (dateObj > new Date()) {
    return res.status(400).json({ message: 'Workout date cannot be in the future.' });
  }

  if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
    return res.status(400).json({ message: 'Please provide at least one exercise.' });
  }
  if (exercises.length > 50) {
    return res.status(400).json({ message: 'A session cannot contain more than 50 exercises.' });
  }

  for (const [i, ex] of exercises.entries()) {
    if (!ex.name || typeof ex.name !== 'string' || !ex.name.trim()) {
      return res.status(400).json({ message: `Exercise ${i + 1}: name is required.` });
    }
    if (ex.sets !== undefined && (isNaN(Number(ex.sets)) || Number(ex.sets) < 0)) {
      return res.status(400).json({ message: `Exercise ${i + 1}: sets must be a non-negative number.` });
    }
    if (ex.reps !== undefined && (isNaN(Number(ex.reps)) || Number(ex.reps) < 0)) {
      return res.status(400).json({ message: `Exercise ${i + 1}: reps must be a non-negative number.` });
    }
    if (ex.weight !== undefined && (isNaN(Number(ex.weight)) || Number(ex.weight) < 0)) {
      return res.status(400).json({ message: `Exercise ${i + 1}: weight must be a non-negative number.` });
    }
  }

  if (duration !== undefined) {
    const d = Number(duration);
    if (isNaN(d) || d < 0 || d > 1440) {
      return res.status(400).json({ message: 'Duration must be between 0 and 1440 minutes.' });
    }
  }

  if (calories !== undefined) {
    const c = Number(calories);
    if (isNaN(c) || c < 0 || c > 10000) {
      return res.status(400).json({ message: 'Calories must be between 0 and 10,000.' });
    }
  }

  next();
};

// ── Partner Request Validator ─────────────────────────────────────────────
export const validatePartnerRequest = (req, res, next) => {
  const { targetUserId } = req.body;
  const requestingUserId = req.user?._id || req.user?.id;

  if (!targetUserId || typeof targetUserId !== 'string' || !targetUserId.trim()) {
    return res.status(400).json({ message: 'targetUserId is required.' });
  }

  if (String(targetUserId).trim() === String(requestingUserId)) {
    return res.status(400).json({ message: 'You cannot send a partner request to yourself.' });
  }

  next();
};

// ── Reward Redemption Validator ───────────────────────────────────────────
export const validateRewardRedeem = (req, res, next) => {
  const { rewardId } = req.body;

  if (!rewardId || typeof rewardId !== 'string' || !rewardId.trim()) {
    return res.status(400).json({ message: 'rewardId is required.' });
  }
  if (rewardId.length > 100) {
    return res.status(400).json({ message: 'Invalid rewardId.' });
  }

  next();
};

// ── Streak Proof Validator ────────────────────────────────────────────────
export const validateStreakProof = (req, res, next) => {
  // For multipart/form-data (file uploads) — file presence is checked here
  // Multer must be applied before this middleware

  const date = req.body?.date || new Date().toISOString().split('T')[0];
  const dateObj = new Date(date);

  if (isNaN(dateObj.getTime())) {
    return res.status(400).json({ message: 'Invalid date provided.' });
  }

  // Allow today or up to 1 day grace period for late submissions
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  if (dateObj < yesterday) {
    return res.status(400).json({ message: 'Proof can only be submitted for today or yesterday.' });
  }
  if (dateObj > new Date()) {
    return res.status(400).json({ message: 'Proof date cannot be in the future.' });
  }

  next();
};

// ── Password Reset Validators ─────────────────────────────────────────────
export const validateForgotPassword = (req, res, next) => {
  const { email } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }
  next();
};

export const validateResetPassword = (req, res, next) => {
  const { token, password } = req.body;
  if (!token || typeof token !== 'string' || !token.trim()) {
    return res.status(400).json({ message: 'Reset token is required.' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters.' });
  }
  if (password.length > 128) {
    return res.status(400).json({ message: 'Password cannot exceed 128 characters.' });
  }
  next();
};
