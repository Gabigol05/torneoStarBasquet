import { createContext, useContext, useState, useEffect } from 'react';
import { equiposFemenino } from '../data/femeninoData';

// Valor por defecto seguro — nunca es null
const DEFAULT = {
  equipos:         equiposFemenino.map(e => ({
    ...e,
    pj:0, pg:0, pp:0, pf:0, pc:0,
    historial:[], proximos:[],
    jugadoras: e.jugadoras.map(j => ({ ...j, pts:0, reb:0, ast:0, rob:0, tap:0, fgp:0, tpp:0, tlp:0, pj:0 })),
  })),
  partidos:        [],
  fechas:          [],
  statsPorPartido: {},
  isLoading:       false,
  error:           null,
};

export const StatsContext = createContext(DEFAULT);

// Hook seguro — siempre devuelve el DEFAULT si no hay Provider
export const useStats = () => {
  const ctx = useContext(StatsContext);
  return ctx ?? DEFAULT;
};
