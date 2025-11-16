import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getToken, clearTokens } from '../utils/tokenManager';
import PokemonCard from '../components/PokemonCard';
import '../styles/Pokedex.css';

export default function Pokedex() {
  const navigate = useNavigate();
  const [pokemonList, setPokemonList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [favorites, setFavorites] = useState([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [userRole, setUserRole] = useState(() => localStorage.getItem('userRole'));

  useEffect(() => {
    const token = getToken();
    axios
      .get('/api/user/favorites', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        console.log('✅ Favorites loaded:', res.data.length, 'favorites');
        setFavorites(res.data);
      })
      .catch((err) => console.error('❌ Failed to fetch favorites:', err));
    
    axios
      .get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setUserRole(res.data.role);
        localStorage.setItem('userRole', res.data.role);
      })
      .catch((err) => console.error('❌ Failed to fetch user role:', err));
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
      const favoriteIds = favorites.map(f => {
        return f._id ? f._id.toString() : f.toString();
      });
      filtered = filtered.filter(p => favoriteIds.includes(p._id.toString()));
    }

    setFilteredList(filtered);
  }, [searchTerm, typeFilter, pokemonList, favorites, showOnlyFavorites]);


  // Unique types for the dropdown
  const uniqueTypes = [
    'All',
    ...new Set(pokemonList.flatMap(p => p.types.map(t => t.charAt(0).toUpperCase() + t.slice(1))))
  ];

  return (
    <div className="pokedex-container">
      <div className="pokedex-header">
        <h1>Paldea Pokédex</h1>
        <div className="header-actions">
          {userRole === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="back-btn"
            >
              Admin Dashboard
            </button>
          )}
          <button
            onClick={() => {
              clearTokens();
              window.location.href = '/login';
            }}
            className="logout-btn"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Controls row: search, type filter, favorites */}
      <div className="controls-row">
        <input
          className="search-input"
          type="text"
          placeholder="Search by name..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />

        <select className="type-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          {uniqueTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <button className="favorites-btn" onClick={() => setShowOnlyFavorites(prev => !prev)}>
          {showOnlyFavorites ? 'Show All' : 'Show Favorites'}
        </button>
      </div>

      {/* Pokémon Display */}
      <div className="pokemon-grid">
        {filteredList.length > 0 ? (
          filteredList.map(p => (
            <PokemonCard 
              key={p._id} 
              pokemon={p} 
              favorites={favorites}
              onFavoritesChange={setFavorites}
            />
          ))
        ) : (
          <div className="pokemon-empty">No Pokémon found.</div>
        )}
      </div>
    </div>
  );
}
