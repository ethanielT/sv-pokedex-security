const express = require('express');
const Pokemon = require('../models/Pokemon');

const router = express.Router();

router.get('/base', async (req, res) => {
  try {
    const pokemons = await Pokemon.find({ formLabel: 'Base Form' }).sort({ pokeId: 1 });
    res.json(pokemons);
  } catch (err) {
    console.error('Error in /base route:', err);
    res.status(500).json({ error: 'Failed to fetch Pokémon' });
  }
});

module.exports = router;
