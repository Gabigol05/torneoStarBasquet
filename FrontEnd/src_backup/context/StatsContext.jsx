import { createContext, useContext } from 'react';
import { equiposFemenino } from '../data/femeninoData';

// ── Valor por defecto seguro ──────────────────────────────────────────────────
const DEFAULT = {
  equipos: equiposFemenino.map(e => ({
    ...e,
    pj:0, pg:0, pp:0, pf:0, pc:0,
    historial:[], proximos:[],
    jugadoras: e.jugadoras.map(j => ({
      ...j,
      pts:0, reb:0, ast:0, rob:0, tap:0,
      fgp:0, tpp:0, tlp:0, pj:0,
      pts_prom:0, reb_prom:0, ast_prom:0, rob_prom:0, tap_prom:0,
      per_prom:0, val_prom:0, pct_simples:0, pct_dobles:0, pct_triples:0,
      sc_total:0, sf_total:0, dc_total:0, df_total:0, tc_total:0, tf_total:0,
      sc_prom:0, dc_prom:0, tc_prom:0,
    })),
  })),
  partidos:        [],
  fechas:          [],
  statsPorPartido: {},
  isLoading:       false,
  error:           null,
  lastUpdated:     null,
  refetch:         () => {},
};

export const StatsContext = createContext(DEFAULT);

// Hook seguro — siempre devuelve DEFAULT si no hay Provider
export const useStats = () => {
  const ctx = useContext(StatsContext);
  return ctx ?? DEFAULT;
};