const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('username role createdAt');
    console.log('✅ Fetched users:', users.length);
    res.json(users);
  } catch (err) {
    console.error('❌ Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
});

// Get user by ID (admin only)
router.get('/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user role (admin only)
router.put('/users/:id/role', verifyToken, requireAdmin, async (req, res) => {
  const { role } = req.body;
  
  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' });
  }

  // Prevent admin from demoting themselves
  if (req.params.id === req.user._id.toString() && role === 'user') {
    return res.status(403).json({ error: 'Cannot demote yourself' });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Delete user (admin only)
router.delete('/users/:id', verifyToken, requireAdmin, async (req, res) => {
  // Prevent admin from deleting themselves
  if (req.params.id === req.user._id.toString()) {
    return res.status(403).json({ error: 'Cannot delete your own account' });
  }

  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get dashboard stats (admin only)
router.get('/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: 'admin' });
    const userCount = totalUsers - adminCount;

    res.json({
      totalUsers,
      adminCount,
      userCount
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get activity logs (admin only)
router.get('/activity-logs', verifyToken, requireAdmin, async (req, res) => {
  try {
    // Get recent logs grouped by action type
    const recentLogins = await ActivityLog.find({ action: 'LOGIN_SUCCESS' })
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('userId', 'username email');

    const failedAttempts = await ActivityLog.find({ action: 'LOGIN_FAILED' })
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('userId', 'username email');

    const accountLockouts = await ActivityLog.find({ action: 'ACCOUNT_LOCKED' })
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('userId', 'username email');

    const passwordChanges = await ActivityLog.find({ 
      $or: [
        { action: 'PASSWORD_CHANGED' },
        { action: 'PASSWORD_RESET' }
      ]
    })
      .sort({ timestamp: -1 })
      .limit(10)
      .populate('userId', 'username email');

    res.json({
      recentLogins,
      failedAttempts,
      accountLockouts,
      passwordChanges
    });
  } catch (err) {
    console.error('❌ Error fetching activity logs:', err);
    res.status(500).json({ error: 'Failed to fetch activity logs', details: err.message });
  }
});

module.exports = router;
