import { useState, useCallback } from 'react';

const KEY = 'star_basquet_favorito';

export function useFavorito() {
  const [favoritoId, setFavoritoId] = useState(() => {
    try { return localStorage.getItem(KEY) ?? null; }
    catch { return null; }
  });

  const toggleFavorito = useCallback((equipoId) => {
    setFavoritoId(prev => {
      const next = prev === equipoId ? null : equipoId;
      try { 
        if (next) localStorage.setItem(KEY, next);
        else localStorage.removeItem(KEY);
      } catch {}
      return next;
    });
  }, []);

  const esFavorito = useCallback((equipoId) => favoritoId === equipoId, [favoritoId]);

  return { favoritoId, toggleFavorito, esFavorito };
}
