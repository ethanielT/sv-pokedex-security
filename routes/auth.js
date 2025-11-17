const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'development'
});

// Helper validation
const validateUsername = (username) => {
  if (!username || typeof username !== 'string') return 'Username is required';
  if (username.length < 4) return 'Username must be at least 4 characters';
  if (username.length > 30) return 'Username must be at most 30 characters';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username may only contain letters, numbers, and underscores';
  return null;
};

const validatePassword = (password) => {
  if (!password || typeof password !== 'string') return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[a-zA-Z]/.test(password)) return 'Password must contain at least one letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return null;
};

const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Please provide a valid email address';
  return null;
};

// Register
router.post('/register', authLimiter, async (req, res) => {
  const { username, email, password } = req.body;

  // Field validation
  const usernameError = validateUsername(username);
  const passwordError = validatePassword(password);
  const emailError = validateEmail(email);
  if (usernameError || passwordError || emailError) {
    return res.status(400).json({ fieldErrors: { username: usernameError, email: emailError, password: passwordError } });
  }

  try {
    const userExists = await User.findOne({ username });
    if (userExists) return res.status(400).json({ error: 'Username already taken' });

    const emailExists = await User.findOne({ email });
    if (emailExists) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ 
      username,
      email,
      password: hashedPassword, 
      role: 'user',
      favorites: [] 
    });
    await user.save();

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, role: user.role, expiresIn: 7 * 24 * 60 * 60 });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login with account lockout and activity logging
router.post('/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;

  // Field validation
  const usernameError = validateUsername(username);
  const passwordError = validatePassword(password);
  // For login we only enforce presence/length; don't reveal which is wrong on auth failure
  if (usernameError || passwordError) {
    return res.status(400).json({ fieldErrors: { username: usernameError, password: passwordError } });
  }

  try {
    const user = await User.findOne({ username });

    // Check if account is locked
    if (user && user.lockoutUntil && new Date() < user.lockoutUntil) {
      const minutesRemaining = Math.ceil((user.lockoutUntil - new Date()) / 60000);
      // Log failed attempt during lockout
      await ActivityLog.create({
        userId: user._id,
        action: 'LOGIN_FAILED',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        timestamp: new Date()
      });
      return res.status(429).json({ 
        error: `Account is locked due to too many failed attempts. Try again in ${minutesRemaining} minutes.` 
      });
    }

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      // Increment failed attempts and log
      user.failedLoginAttempts += 1;
      
      // Lock account after 5 failed attempts
      if (user.failedLoginAttempts >= 5) {
        user.lockoutUntil = new Date(Date.now() + 30 * 60 * 1000); // 30-minute lockout
        await user.save();
        // Log account locked
        await ActivityLog.create({
          userId: user._id,
          action: 'ACCOUNT_LOCKED',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          timestamp: new Date()
        });
        return res.status(429).json({ 
          error: 'Account locked due to too many failed attempts. Try again in 30 minutes.' 
        });
      }
      
      await user.save();
      // Log failed attempt
      await ActivityLog.create({
        userId: user._id,
        action: 'LOGIN_FAILED',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        timestamp: new Date()
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Successful login - reset failed attempts and log
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    await user.save();

    // Log successful login
    await ActivityLog.create({
      userId: user._id,
      action: 'LOGIN_SUCCESS',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date()
    });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, role: user.role, expiresIn: 7 * 24 * 60 * 60 });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Password change endpoint - requires authentication
router.post('/change-password', verifyToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  // Validate new password
  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify old password
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Ensure new password is different
    if (oldPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    // Hash and save new password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Log password change
    await ActivityLog.create({
      userId: user._id,
      action: 'PASSWORD_CHANGED',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date()
    });

    res.json({ message: 'Password updated successfully. Please login again.' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Forgot password
router.post('/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: 'If an account exists with that email, a reset link will be sent.' });
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    user.resetToken = resetTokenHash;
    user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // For development, logging the token instead of email
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}&email=${email}`;
    
    console.log('🔐 Password Reset Link (Development Only):', resetLink);
    
    // Always return same message for security
    res.status(200).json({ 
      message: 'If an account exists with that email, a reset link will be sent.'
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  const { token, email, newPassword } = req.body;

  if (!token || !email || !newPassword) {
    return res.status(400).json({ error: 'Token, email, and new password are required' });
  }

  // Validate new password
  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  try {
    // Hash token for comparison
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      email,
      resetToken: resetTokenHash,
      resetTokenExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Update password and clear reset token
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    
    // IMPORTANT: Clear lockout when password is reset
    user.failedLoginAttempts = 0;
    user.lockoutUntil = null;
    
    await user.save();

    // Log password reset
    await ActivityLog.create({
      userId: user._id,
      action: 'PASSWORD_RESET',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date()
    });

    res.json({ message: 'Password reset successfully. Please login with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user info (role, username)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('username role');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
