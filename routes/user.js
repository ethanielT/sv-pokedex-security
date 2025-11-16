const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const xss = require('xss');
const User = require('../models/User');
const Pokemon = require('../models/Pokemon');
const { ObjectId } = require('mongodb');

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
  const { pokemonId } = req.params;

  try {
    // Validate ObjectId format
    if (!ObjectId.isValid(pokemonId)) {
      return res.status(400).json({ error: 'Invalid Pokémon ID format' });
    }

    const user = await User.findById(req.userId);
    const index = user.favorites.findIndex(id => id.toString() === pokemonId);
    
    if (index >= 0) {
      user.favorites.splice(index, 1); // remove
    } else {
      user.favorites.push(new ObjectId(pokemonId)); // add as ObjectId
    }

    await user.save();
    
    // Fetch the updated user and populate favorites
    const updatedUser = await User.findById(req.userId).populate('favorites');
    
    // Ensure we return the populated array
    const populatedFavorites = updatedUser.favorites || [];
    console.log('Returning favorites:', populatedFavorites.length, 'items');
    
    res.json({ favorites: populatedFavorites, isFavorite: index < 0 });
  } catch (err) {
    console.error('Error toggling favorite:', err);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

router.get('/favorites', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('favorites');
    res.json(user.favorites);
  } catch (err) {
    console.error('Error fetching favorites:', err);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Search endpoint with input sanitization
router.get('/search', authenticate, async (req, res) => {
  const { query } = req.query;

  try {
    // Sanitize search input to prevent XSS
    const cleanQuery = xss(query || '');
    
    if (cleanQuery.trim().length < 1) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Search in Pokemon collection (case-insensitive)
    const results = await Pokemon.find({
      name: { $regex: cleanQuery, $options: 'i' }
    }).limit(20);

    res.json({ results });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
