import { createContext, useContext, useState, useEffect } from 'react';
import { equiposFemenino } from '../data/femeninoData';

// Valor por defecto seguro — nunca es null
// El plantel (jugadoras) ya no está embebido en equiposFemenino (ahora vive
// en la base, jugadoras_femenino) — este DEFAULT solo se usa como estado
// "todavía no cargó nada" antes de que el hook traiga los datos reales, así
// que un array vacío alcanza (a la par de como ya funcionaba masculino).
const DEFAULT = {
  equipos:         equiposFemenino.map(e => ({
    ...e,
    pj:0, pg:0, pp:0, pf:0, pc:0,
    historial:[], proximos:[],
    jugadoras: [],
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
