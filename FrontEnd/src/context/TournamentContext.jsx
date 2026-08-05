import { createContext, useState, useContext, useEffect } from 'react';

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

  const toggleMode = () => {
    setMode((prev) => (prev === 'masculino' ? 'femenino' : 'masculino'));
  };

  useEffect(() => {
    // Aplicar la clase al document.body para theming global
    document.body.classList.remove('theme-masculino', 'theme-femenino');
    document.body.classList.add(`theme-${mode}`);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch {}
  }, [mode]);

  return (
    <TournamentContext.Provider value={{ mode, setMode, toggleMode }}>
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
