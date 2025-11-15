const mongoose = require('mongoose');

const pokemonSchema = new mongoose.Schema({
  name: String,
  baseSpecies: String,
  formLabel: String,
  pokeId: Number,
  images: Object,
  stats: Array,
  abilities: [String],
  levelUpMoves: [String],
  types: [String],
  forms: [String],
});


module.exports = mongoose.model('Pokemon', pokemonSchema);
