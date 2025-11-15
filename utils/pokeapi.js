const axios = require('axios');
const Pokemon = require('../models/Pokemon');

const dexIds = [31, 32, 33];
let validNames = new Set();

const loadRegionalPokemon = async () => {
  console.log('Starting to cache regional Pokémon...');

  try {
    const allSpecies = new Set();

    // Collect species from regional dexes
    for (const dexId of dexIds) {
      const res = await axios.get(`https://pokeapi.co/api/v2/pokedex/${dexId}`);
      const entries = res.data.pokemon_entries.map(e => e.pokemon_species.name.toLowerCase());
      entries.forEach(name => allSpecies.add(name));
    }

    const allForms = new Set();

    // For each species, get its varieties (forms)
    for (const speciesName of allSpecies) {
      try {
        const speciesRes = await axios.get(`https://pokeapi.co/api/v2/pokemon-species/${speciesName}`);
        const varieties = speciesRes.data.varieties;

        varieties.forEach(v => {
          const name = v.pokemon.name.toLowerCase();
          allForms.add(name);
        });
      } catch (err) {
        console.warn(`Failed to fetch varieties for ${speciesName}: ${err.message}`);
      }
    }

    validNames = allForms;
    console.log(`Resolved ${validNames.size} form names from Pokedex 31–33`);

    // Fetch each actual form via /pokemon/{form-name}
    for (const name of validNames) {
      const exists = await Pokemon.findOne({ name });
      if (exists) continue;

      try {
        const res = await axios.get(`https://pokeapi.co/api/v2/pokemon/${name}`);
        const data = res.data;
        const speciesRes = await axios.get(data.species.url);
        const baseSpeciesName = speciesRes.data.name;

        let formLabel = "Base Form";
        if (data.name !== baseSpeciesName) {
          const suffix = data.name.replace(`${baseSpeciesName}-`, '');
          formLabel = `Form: ` + suffix
            .replace(/-/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
        }

        const newPokemon = new Pokemon({
          name: data.name,
          baseSpecies: baseSpeciesName,
          formLabel: formLabel,
          pokeId: data.id,
          images: {
            default: data.sprites.front_default,
            female: data.sprites.front_female,
            shiny: data.sprites.front_shiny,
            shiny_female: data.sprites.front_shiny_female,
          },
          stats: data.stats.map(stat => ({
            name: stat.stat.name,
            value: stat.base_stat,
          })),
          abilities: data.abilities.map(ab => ab.ability.name),
          levelUpMoves: data.moves
            .filter(m =>
              m.version_group_details.some(
                d => d.move_learn_method.name === 'level-up'
              )
            )
            .map(m => m.move.name),
          types: data.types.map(t => t.type.name),
          forms: data.forms.map(f => f.name),
        });


        await newPokemon.save();
        console.log(`Cached ${name}`);
      } catch (err) {
        console.warn(`⚠️ Failed to fetch/cached ${name}: ${err.response?.status || err.message}`);
      }
    }

    console.log('All regional Pokémon forms cached to MongoDB');

  } catch (err) {
    console.error('Failed to load regional Pokémon:', err.message);
  }
};

const isInRegionalDex = (name) => validNames.has(name.toLowerCase());

module.exports = { loadRegionalPokemon, isInRegionalDex };