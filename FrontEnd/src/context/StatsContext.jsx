import { createContext, useContext } from 'react';

// Contexto que comparte los equipos ya cargados por PageHome
// con cualquier componente profundo (Navbar, GlobalSearch, etc.)
// Sin doble fetch, sin prop drilling.
export const StatsContext = createContext({ equipos: [], partidos: [], fechas: [] });
export const useStats = () => useContext(StatsContext);
