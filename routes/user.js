const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    console.error('❌ Token verification failed:', err.message);
    return res.sendStatus(403);
  }
};


router.post('/toggle-favorite/:pokemonId', authenticate, async (req, res) => {
    console.log('🟡 Hit toggle-favorite route');
  const user = await User.findById(req.userId);
  const { pokemonId } = req.params;

  const index = user.favorites.indexOf(pokemonId);
  if (index >= 0) {
    user.favorites.splice(index, 1); // remove
  } else {
    user.favorites.push(pokemonId); // add
  }

  await user.save();
  res.json({ favorites: user.favorites });
});

router.get('/favorites', authenticate, async (req, res) => {
  const user = await User.findById(req.userId).populate('favorites');
  res.json(user.favorites);
});

module.exports = router;
