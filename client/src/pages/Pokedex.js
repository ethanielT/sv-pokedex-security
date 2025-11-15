import React, { useEffect, useState } from 'react';
import axios from 'axios';
import PokemonCard from '../components/PokemonCard';

export default function Pokedex() {
  const [pokemonList, setPokemonList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [favorites, setFavorites] = useState([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios
      .get('/api/user/favorites', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setFavorites(res.data))
      .catch((err) => console.error('❌ Failed to fetch favorites:', err));
  }, []);


  // Fetch Pokémon on mount
  useEffect(() => {
    axios.get('/api/pokemon/base').then(res => {
      setPokemonList(res.data);
      setFilteredList(res.data);
    });
  }, []);

  // Apply search and filter
  useEffect(() => {
    let filtered = pokemonList;

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'All') {
      filtered = filtered.filter(p =>
        p.types.includes(typeFilter.toLowerCase())
      );
    }

    if (showOnlyFavorites) {
      const favoriteIds = favorites.map(f => f._id);
      filtered = filtered.filter(p => favoriteIds.includes(p._id));
    }

    setFilteredList(filtered);
  }, [searchTerm, typeFilter, pokemonList, favorites, showOnlyFavorites]);


  // Unique types for the dropdown
  const uniqueTypes = [
    'All',
    ...new Set(pokemonList.flatMap(p => p.types.map(t => t.charAt(0).toUpperCase() + t.slice(1))))
  ];

  return (
    <div>
      <button onClick={() => {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }}>
        Logout
      </button>

      <h1>Paldea Pokédex</h1>

      {/* 🔎 Search + Filter Controls */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ marginRight: '10px' }}
        />

        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          {uniqueTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <button onClick={() => setShowOnlyFavorites(prev => !prev)}>
          {showOnlyFavorites ? 'Show All' : 'Show Favorites'}
        </button>

      </div>

      {/* 🧬 Pokémon Display */}
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {filteredList.length > 0 ? (
          filteredList.map(p => (
            <PokemonCard key={p._id} pokemon={p} favorites={favorites} />
          ))
        ) : (
          <p>No Pokémon found.</p>
        )}
      </div>
    </div>
  );
}
