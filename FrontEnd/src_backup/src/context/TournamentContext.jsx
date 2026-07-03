import { createContext, useState, useContext, useEffect } from 'react';

const TournamentContext = createContext();

export function TournamentProvider({ children }) {
  const [mode, setMode] = useState('masculino'); // 'masculino' | 'femenino'

  const toggleMode = () => {
    setMode((prev) => (prev === 'masculino' ? 'femenino' : 'masculino'));
  };

  useEffect(() => {
    // Aplicar la clase al document.body para theming global
    document.body.classList.remove('theme-masculino', 'theme-femenino');
    document.body.classList.add(`theme-${mode}`);
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
