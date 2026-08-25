import { createContext, useState, useContext, useEffect, useRef, useCallback, useMemo } from 'react';
import { trackEvent } from '../lib/analytics.js';

const TournamentContext = createContext();
const STORAGE_KEY = 'star_basquet_mode';

function readStoredMode() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'femenino' || stored === 'masculino' ? stored : 'masculino';
  } catch {
    return 'masculino';
  }
}

export function TournamentProvider({ children }) {
  // Antes esto arrancaba siempre en 'masculino' sin importar que estuvieras
  // viendo femenino — al recargar la pagina (F5, o el auto-reload cuando
  // hay un deploy nuevo) te mandaba de vuelta al inicio del lado masculino.
  // Ahora se guarda el ultimo modo elegido y se restaura al cargar.
  const [mode, setMode] = useState(readStoredMode); // 'masculino' | 'femenino'
  const isFirstRender = useRef(true);

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'masculino' ? 'femenino' : 'masculino'));
  }, []);

  useEffect(() => {
    // Aplicar la clase al document.body para theming global
    document.body.classList.remove('theme-masculino', 'theme-femenino');
    document.body.classList.add(`theme-${mode}`);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch {}

    // No contar la restauracion inicial (leida de localStorage) como un
    // "cambio" de torneo — solo eventos de cambio real, para saber que
    // categoria mira mas la gente.
    if (isFirstRender.current) {
      isFirstRender.current = false;
    } else {
      trackEvent('switch_tournament_mode', { mode });
    }
  }, [mode]);

  // Este contexto envuelve toda la app (theming + qué categoría se ve) — sin
  // memoizar, cada render de TournamentProvider fuerza un re-render en cadena
  // de todo lo que llama useTournament(), use o no `mode`.
  const value = useMemo(() => ({ mode, setMode, toggleMode }), [mode, toggleMode]);

  return (
    <TournamentContext.Provider value={value}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
}
