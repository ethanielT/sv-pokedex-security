import { useState, useEffect } from 'react';
import axios from 'axios';

export default function PokemonCard({ pokemon, favorites }) {
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    const isFavorite = favorites.some((p) => p._id === pokemon._id);
    setIsFav(isFavorite);
  }, [favorites, pokemon._id]);


  const toggleFavorite = async () => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        `/api/user/toggle-favorite/${pokemon._id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsFav(prev => !prev);
    } catch (err) {
      console.error('❌ Failed to toggle favorite:', err);
    }
  };


  return (
    <div style={{ border: '1px solid gray', padding: 10, margin: 10, width: 150 }}>
      <img src={pokemon.images.default} alt={pokemon.name} />
      <h4>{pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}</h4>
      <p>{pokemon.types.join(', ')}</p>
      
      <button onClick={toggleFavorite} style={{ fontSize: '20px', color: isFav ? 'gold' : 'gray', border: 'none', background: 'none' }}>
        {isFav ? '★' : '☆'}
      </button>    
    </div>
  );
}
