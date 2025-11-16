import { useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { getToken } from '../utils/tokenManager';
import '../styles/PokemonCard.css';

export default function PokemonCard({ pokemon, favorites, onFavoritesChange }) {
  const [isLoading, setIsLoading] = useState(false);

  const isFav = useMemo(() => {
    if (!Array.isArray(favorites)) return false;
    
    const pokemonId = pokemon._id?.toString() || pokemon._id;
    return favorites.some((p) => {
      const favId = p._id ? p._id.toString() : p.toString();
      return favId === pokemonId;
    });
  }, [favorites, pokemon._id]);

  const toggleFavorite = useCallback(async () => {
    const token = getToken();
    setIsLoading(true);

    try {
      const res = await axios.post(
        `/api/user/toggle-favorite/${pokemon._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (onFavoritesChange && res.data.favorites) {
        console.log('✅ Favorites updated:', res.data.favorites.map(p => p._id || p));
        onFavoritesChange(res.data.favorites);
      }
    } catch (err) {
      console.error('❌ Failed to toggle favorite:', err);
    } finally {
      setIsLoading(false);
    }
  }, [pokemon._id, onFavoritesChange]);

  return (
    <div className="pokemon-card">
      <img className="pokemon-image" src={pokemon.images.default} alt={pokemon.name} />
      <h4 className="pokemon-name">{pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}</h4>

      <div className="pokemon-types">
        {pokemon.types.map((t) => (
          <span key={t} className="type-badge">{t}</span>
        ))}
      </div>
      
      <button 
        onClick={toggleFavorite} 
        disabled={isLoading}
        className={`fav-btn ${isLoading ? 'loading' : ''}`}
        aria-pressed={isFav}
        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
        style={{ color: isFav ? 'gold' : 'gray' }}
      >
        {isFav ? '★' : '☆'}
      </button>
    </div>
  );
}
