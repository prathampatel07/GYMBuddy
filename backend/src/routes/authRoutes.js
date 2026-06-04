import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { protect, JWT_SECRET } from '../middleware/auth.js';
import { uploadImage } from '../config/cloudinary.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validateRegister, validateLogin, validateProfileUpdate } from '../middleware/validate.js';

const router = express.Router();

// Generate Token
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', authLimiter, validateRegister, async (req, res) => {
  const { 
    username, 
    email, 
    password, 
    name, 
    age, 
    gender, 
    height, 
    weight, 
    fitnessLevel, 
    profilePhoto 
  } = req.body;

  try {
    // Check if user exists
    const emailExists = await User.findOne({ email });
    const usernameExists = await User.findOne({ username });

    if (emailExists || usernameExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Upload profile picture if provided (base64)
    let photoUrl = '';
    if (profilePhoto) {
      photoUrl = await uploadImage(profilePhoto, 'profile_photos');
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      name: name || '',
      age: age ? Number(age) : 0,
      gender: gender || '',
      height: height ? Number(height) : 0,
      weight: weight ? Number(weight) : 0,
      fitnessLevel: fitnessLevel || 'Beginner',
      profilePhotoUrl: photoUrl,
      coins: 100, // Welcome coins
      streakCount: 0
    });

    if (user) {
      res.status(201).json({
        _id: user._id || user.id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id || user.id)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Authenticate user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', authLimiter, validateLogin, async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check for user email
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id || user.id,
        username: user.username,
        email: user.email,
        token: generateToken(user._id || user.id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (user) {
      res.json({
        _id: user._id || user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        age: user.age,
        gender: user.gender,
        height: user.height,
        weight: user.weight,
        fitnessLevel: user.fitnessLevel,
        profilePhotoUrl: user.profilePhotoUrl,
        fitnessGoals: user.fitnessGoals,
        schedule: user.schedule,
        location: user.location,
        coins: user.coins,
        streakCount: user.streakCount,
        lastWorkoutDate: user.lastWorkoutDate,
        role: user.role
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update user profile details
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, validateProfileUpdate, async (req, res) => {
  const { 
    name, 
    age, 
    gender, 
    height, 
    weight, 
    fitnessLevel, 
    profilePhoto, 
    fitnessGoals, 
    schedule, 
    location 
  } = req.body;

  try {
    let photoUrl = req.user.profilePhotoUrl;
    if (profilePhoto) {
      photoUrl = await uploadImage(profilePhoto, 'profile_photos');
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id || req.user.id,
      {
        name: name !== undefined ? name : req.user.name,
        age: age !== undefined ? Number(age) : req.user.age,
        gender: gender !== undefined ? gender : req.user.gender,
        height: height !== undefined ? Number(height) : req.user.height,
        weight: weight !== undefined ? Number(weight) : req.user.weight,
        fitnessLevel: fitnessLevel !== undefined ? fitnessLevel : req.user.fitnessLevel,
        profilePhotoUrl: photoUrl,
        fitnessGoals: fitnessGoals !== undefined ? fitnessGoals : req.user.fitnessGoals,
        schedule: schedule !== undefined ? schedule : req.user.schedule,
        location: location !== undefined ? location : req.user.location
      },
      { new: true }
    );

    res.json({
      _id: updatedUser._id || updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      name: updatedUser.name,
      age: updatedUser.age,
      gender: updatedUser.gender,
      height: updatedUser.height,
      weight: updatedUser.weight,
      fitnessLevel: updatedUser.fitnessLevel,
      profilePhotoUrl: updatedUser.profilePhotoUrl,
      fitnessGoals: updatedUser.fitnessGoals,
      schedule: updatedUser.schedule,
      location: updatedUser.location,
      coins: updatedUser.coins,
      streakCount: updatedUser.streakCount,
      lastWorkoutDate: updatedUser.lastWorkoutDate,
      role: updatedUser.role
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Forgot Password - request reset link
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'No account registered with this email.' });
    }

    // Generate random token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set resetPasswordToken field in db
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    const resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour token validity

    await User.findByIdAndUpdate(user._id || user.id, {
      resetPasswordToken: hashedToken,
      resetPasswordExpire
    });

    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;
    console.log(`✉️ Password reset email link requested for ${email}: \n 👉 ${resetUrl}`);

    res.json({
      message: 'Password reset instructions sent. Please check server logs or response parameters.',
      resetToken: resetToken, // Returned in MVP for direct testing ease
      resetUrl
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Reset Password - save new password
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', authLimiter, async (req, res) => {
  const { token, password } = req.body;

  try {
    if (!token || !password || password.length < 6) {
      return res.status(400).json({ message: 'Token and a password of at least 6 characters required.' });
    }

    // Hash token to query
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const allUsers = await User.find({});
    // Find matching token that hasn't expired
    const user = allUsers.find(u => 
      u.resetPasswordToken === hashedToken && 
      new Date(u.resetPasswordExpire).getTime() > Date.now()
    );

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired password reset token.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user
    await User.findByIdAndUpdate(user._id || user.id, {
      password: hashedPassword,
      resetPasswordToken: undefined,
      resetPasswordExpire: undefined
    });

    res.json({ message: 'Password reset completed successfully. You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
