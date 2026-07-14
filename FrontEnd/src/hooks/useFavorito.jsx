import { createContext, useContext, useState, useCallback } from 'react';

const KEY = 'star_basquet_favorito';
const FavoritoContext = createContext(null);

export function FavoritoProvider({ children }) {
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

  return (
    <FavoritoContext.Provider value={{ favoritoId, toggleFavorito, esFavorito }}>
      {children}
    </FavoritoContext.Provider>
  );
}

export function useFavorito() {
  const ctx = useContext(FavoritoContext);
  if (!ctx) throw new Error('useFavorito debe usarse dentro de FavoritoProvider');
  return ctx;
}
