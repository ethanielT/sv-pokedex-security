const axios = require('axios');
const { isGen9 } = require('../utils/pokeapi');

// Search by name, move, or ability
exports.searchPokemon = async (req, res) => {
  const { name, move, ability } = req.query;

  try {
    if (name) {
      if (!isGen9(name)) {
        return res.status(404).json({ error: 'Not a Generation 9 Pokémon' });
      }

      const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${name.toLowerCase()}`);
      return res.json([response.data]);
    }

    if (move) {
      const moveData = await axios.get(`https://pokeapi.co/api/v2/move/${move.toLowerCase()}`);
      const allPoke = moveData.data.learned_by_pokemon || [];

      const filtered = allPoke.filter(p => isGen9(p.name));
      return res.json(filtered);
    }

    if (ability) {
      const abilityData = await axios.get(`https://pokeapi.co/api/v2/ability/${ability.toLowerCase()}`);
      const allPoke = abilityData.data.pokemon.map(p => p.pokemon);
      
      const filtered = allPoke.filter(p => isGen9(p.name));
      return res.json(filtered);
    }

    return res.status(400).json({ error: 'Provide a name, move, or ability query parameter.' });

  } catch (err) {
    res.status(404).json({ error: 'No results found.' });
  }
};

// Get full Pokémon details
exports.getPokemonDetails = async (req, res) => {
  const { name } = req.params;

  try {
    const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${name.toLowerCase()}`);
    const pokemon = response.data;

    const forms = pokemon.forms.map(form => form.name);
    const images = {
      default: pokemon.sprites.front_default,
      female: pokemon.sprites.front_female,
      shiny: pokemon.sprites.front_shiny,
      shiny_female: pokemon.sprites.front_shiny_female,
    };

    const stats = pokemon.stats.map(stat => ({
      name: stat.stat.name,
      value: stat.base_stat,
    }));

    const abilities = pokemon.abilities.map(ab => ab.ability.name);

    const levelUpMoves = pokemon.moves
      .filter(m => m.version_group_details.some(
        d => d.move_learn_method.name === 'level-up'
      ))
      .map(m => m.move.name);

    res.json({
      name: pokemon.name,
      id: pokemon.id,
      images,
      forms,
      stats,
      abilities,
      levelUpMoves
    });

  } catch (err) {
    res.status(404).json({ error: 'Pokémon not found.' });
  }
};
