import { useState, useEffect, useCallback } from 'react';
import { equiposFemenino } from '../data/femeninoData';

// ============================================================
// CONFIGURACIÓN DEL BACKEND
// Cuando el backend esté listo, cambiá esta URL.
// En dev podés usar un archivo JSON local o mockear la respuesta.
// ============================================================
const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

// Tiempo entre refetches automáticos en milisegundos (5 minutos).
// Bajalo a 60000 (1 min) cuando el torneo esté en vivo.
const REFETCH_INTERVAL = 5 * 60 * 1000;

// ============================================================
// STATS DEFAULT — lo que se muestra cuando no hay datos aún.
// ============================================================
const DEFAULT_PLAYER_STATS = {
  pj:  0,
  pts: 0,
  reb: 0,
  ast: 0,
  rob: 0,
  tap: 0,
  fgp: 0,   // field goal %
  tpp: 0,   // triple %
  tlp: 0,   // tiro libre %
};

const DEFAULT_TEAM_STATS = {
  pj: 0,
  pg: 0,
  pp: 0,
  pf: 0,
  pc: 0,
};

// ============================================================
// HELPERS
// ============================================================

/**
 * Mergea los datos estáticos del plantel con las stats del backend.
 *
 * El backend debe responder con este formato:
 * {
 *   equipos: [
 *     {
 *       equipoId: "f_black_mamba",   // mismo id que femeninoData.js
 *       pj: 3, pg: 2, pp: 1, pf: 180, pc: 160,
 *       jugadoras: [
 *         {
 *           jugadoraId: "f_bm_01",   // mismo id que femeninoData.js
 *           pj: 3, pts: 12.5, reb: 4.1, ast: 2.3,
 *           rob: 1.2, tap: 0.5, fgp: 48.2, tpp: 33.3, tlp: 75.0
 *         },
 *         ...
 *       ]
 *     },
 *     ...
 *   ],
 *   partidos: [
 *     {
 *       equipoId: "f_black_mamba",
 *       fecha: "14/06/2026",
 *       rival: "Piratas",
 *       pf: 62,
 *       pc: 55,
 *       resultado: "G"   // "G" o "P"
 *     },
 *     ...
 *   ],
 *   proximos: [
 *     {
 *       equipoId: "f_black_mamba",
 *       fecha: "21/06/2026",
 *       rival: "Artigas BC",
 *       lugar: "Cancha Norte"
 *     },
 *     ...
 *   ]
 * }
 */
function mergeData(apiResponse) {
  const statsMap        = {};   // equipoId → team stats
  const jugadoraStatsMap = {};  // jugadoraId → player stats
  const partidosMap     = {};   // equipoId → [partidos]
  const proximosMap     = {};   // equipoId → [proximos]

  if (apiResponse?.equipos) {
    for (const eq of apiResponse.equipos) {
      statsMap[eq.equipoId] = {
        pj: eq.pj ?? 0,
        pg: eq.pg ?? 0,
        pp: eq.pp ?? 0,
        pf: eq.pf ?? 0,
        pc: eq.pc ?? 0,
      };
      if (eq.jugadoras) {
        for (const j of eq.jugadoras) {
          jugadoraStatsMap[j.jugadoraId] = {
            pj:  j.pj  ?? 0,
            pts: j.pts ?? 0,
            reb: j.reb ?? 0,
            ast: j.ast ?? 0,
            rob: j.rob ?? 0,
            tap: j.tap ?? 0,
            fgp: j.fgp ?? 0,
            tpp: j.tpp ?? 0,
            tlp: j.tlp ?? 0,
          };
        }
      }
    }
  }

  if (apiResponse?.partidos) {
    for (const p of apiResponse.partidos) {
      if (!partidosMap[p.equipoId]) partidosMap[p.equipoId] = [];
      partidosMap[p.equipoId].push(p);
    }
  }

  if (apiResponse?.proximos) {
    for (const p of apiResponse.proximos) {
      if (!proximosMap[p.equipoId]) proximosMap[p.equipoId] = [];
      proximosMap[p.equipoId].push(p);
    }
  }

  return equiposFemenino.map(equipo => ({
    ...equipo,
    ...(statsMap[equipo.id] ?? DEFAULT_TEAM_STATS),
    partidos: partidosMap[equipo.id] ?? [],
    proximos: proximosMap[equipo.id] ?? [],
    jugadoras: equipo.jugadoras.map(j => ({
      ...j,
      ...(jugadoraStatsMap[j.id] ?? DEFAULT_PLAYER_STATS),
    })),
  }));
}

// ============================================================
// HOOK PRINCIPAL
// ============================================================
export function useFemeninoStats() {
  const [equipos, setEquipos]     = useState(() => mergeData(null)); // arranca con 0s
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStats = useCallback(async () => {
    // Si no hay URL configurada, no intentamos el fetch.
    // El hook igual devuelve los datos estáticos con stats en 0.
    if (!API_BASE_URL) {
      console.info('[useFemeninoStats] VITE_API_URL no configurada — usando datos locales (stats en 0)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/femenino/stats`, {
        headers: { 'Content-Type': 'application/json' },
        // Si el backend requiere auth, agregá acá:
        // headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);

      const data = await res.json();
      setEquipos(mergeData(data));
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[useFemeninoStats] Error al fetchear stats:', err);
      setError(err.message);
      // No pisamos los datos anteriores en caso de error,
      // la UI sigue mostrando lo último que había.
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch inicial + refetch periódico
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, REFETCH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return {
    equipos,      // equiposFemenino mergeados con stats del backend
    isLoading,    // true solo durante el fetch, no bloquea la UI
    error,        // string con el error o null
    lastUpdated,  // Date del último fetch exitoso
    refetch: fetchStats, // para forzar un refresh manual
  };
}
