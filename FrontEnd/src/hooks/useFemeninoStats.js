import { useState, useEffect, useCallback } from 'react';
import { equiposFemenino } from '../data/femeninoData';

// ============================================================
// CONFIGURACIÓN
// Supabase se usa como fuente de datos directa.
// Cuando haya un backend propio, configurá VITE_API_URL
// y ese endpoint tiene prioridad sobre Supabase.
// ============================================================
const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL  ?? '';
const SUPABASE_ANON    = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const API_BASE_URL     = import.meta.env.VITE_API_URL ?? '';

// Tiempo entre refetches automáticos (5 minutos).
// Bajalo a 60000 (1 min) cuando el torneo esté en vivo.
const REFETCH_INTERVAL = 5 * 60 * 1000;

// ============================================================
// STATS DEFAULT
// ============================================================
const DEFAULT_PLAYER_STATS = {
  pj: 0, pts: 0, reb: 0, ast: 0,
  rob: 0, tap: 0, fgp: 0, tpp: 0, tlp: 0,
};

const DEFAULT_TEAM_STATS = {
  pj: 0, pg: 0, pp: 0, pf: 0, pc: 0,
};

// ============================================================
// MERGE — combina datos estáticos del plantel con stats
// ============================================================
function mergeData(apiResponse) {
  const statsMap         = {};
  const jugadoraStatsMap = {};
  const partidosMap      = {};
  const proximosMap      = {};

  if (apiResponse?.equipos) {
    for (const eq of apiResponse.equipos) {
      statsMap[eq.equipoId] = {
        pj: eq.pj ?? 0, pg: eq.pg ?? 0, pp: eq.pp ?? 0,
        pf: eq.pf ?? 0, pc: eq.pc ?? 0,
      };
      if (eq.jugadoras) {
        for (const j of eq.jugadoras) {
          jugadoraStatsMap[j.jugadoraId] = {
            pj:  j.pj  ?? 0, pts: j.pts ?? 0, reb: j.reb ?? 0,
            ast: j.ast ?? 0, rob: j.rob ?? 0, tap: j.tap ?? 0,
            fgp: j.fgp ?? 0, tpp: j.tpp ?? 0, tlp: j.tlp ?? 0,
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
// FETCH DESDE SUPABASE DIRECTO
// Lee estadisticas_femenino y arma la estructura que mergeData espera.
// Cuando tengas backend propio, este bloque queda como fallback.
// ============================================================
async function fetchFromSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON) return null;

  const headers = {
    'apikey': SUPABASE_ANON,
    'Authorization': `Bearer ${SUPABASE_ANON}`,
  };

  // Traemos todas las estadísticas en una sola query
  const statsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/estadisticas_femenino?select=*`,
    { headers }
  );
  if (!statsRes.ok) throw new Error(`Supabase stats: HTTP ${statsRes.status}`);
  const statsRows = await statsRes.json();

  // Traemos partidos finalizados
  const partidosRes = await fetch(
    `${SUPABASE_URL}/rest/v1/partidos_femenino?estado=eq.finalizado&select=*&order=fecha.desc`,
    { headers }
  );
  const partidosRows = partidosRes.ok ? await partidosRes.json() : [];

  // Traemos próximos partidos
  const proximosRes = await fetch(
    `${SUPABASE_URL}/rest/v1/partidos_femenino?estado=eq.pendiente&select=*&order=fecha.asc`,
    { headers }
  );
  const proximosRows = proximosRes.ok ? await proximosRes.json() : [];

  // Convertimos al formato que mergeData espera
  // Agrupamos stats por equipo usando femeninoData como referencia
  const statsPerEquipo = {};
  for (const row of statsRows) {
    // Extraemos el equipo_id del jugadora_id (ej: f_bm_01 → buscar en femeninoData)
    const equipo = equiposFemenino.find(eq =>
      eq.jugadoras.some(j => j.id === row.jugadora_id)
    );
    if (!equipo) continue;

    if (!statsPerEquipo[equipo.id]) {
      statsPerEquipo[equipo.id] = { equipoId: equipo.id, jugadoras: [] };
    }
    statsPerEquipo[equipo.id].jugadoras.push({
      jugadoraId: row.jugadora_id,
      pj:  row.pj  ?? 0, pts: row.pts ?? 0, reb: row.reb ?? 0,
      ast: row.ast ?? 0, rob: row.rob ?? 0, tap: row.tap ?? 0,
      fgp: row.fgp ?? 0, tpp: row.tpp ?? 0, tlp: row.tlp ?? 0,
    });
  }

  // Calculamos stats de equipo sumando/promediando jugadoras
  for (const eq of Object.values(statsPerEquipo)) {
    if (eq.jugadoras.length === 0) continue;
    const pjMax = Math.max(...eq.jugadoras.map(j => j.pj));
    eq.pj = pjMax;
    // pg/pp/pf/pc vendrán de partidos cuando haya datos
  }

  // Partidos finalizados → historial por equipo
  const partidos = [];
  for (const p of partidosRows) {
    if (p.equipo_local_id) {
      partidos.push({
        equipoId: p.equipo_local_id,
        fecha:    p.fecha ? new Date(p.fecha).toLocaleDateString('es-AR') : '',
        rival:    equiposFemenino.find(e => e.id === p.equipo_visit_id)?.name ?? p.equipo_visit_id,
        pf:       p.puntos_local  ?? 0,
        pc:       p.puntos_visit  ?? 0,
        resultado: (p.puntos_local ?? 0) >= (p.puntos_visit ?? 0) ? 'G' : 'P',
      });
    }
    if (p.equipo_visit_id) {
      partidos.push({
        equipoId: p.equipo_visit_id,
        fecha:    p.fecha ? new Date(p.fecha).toLocaleDateString('es-AR') : '',
        rival:    equiposFemenino.find(e => e.id === p.equipo_local_id)?.name ?? p.equipo_local_id,
        pf:       p.puntos_visit ?? 0,
        pc:       p.puntos_local ?? 0,
        resultado: (p.puntos_visit ?? 0) >= (p.puntos_local ?? 0) ? 'G' : 'P',
      });
    }
  }

  // Próximos partidos
  const proximos = [];
  for (const p of proximosRows) {
    if (p.equipo_local_id) {
      proximos.push({
        equipoId: p.equipo_local_id,
        fecha:    p.fecha ? new Date(p.fecha).toLocaleDateString('es-AR') : 'A confirmar',
        rival:    equiposFemenino.find(e => e.id === p.equipo_visit_id)?.name ?? p.equipo_visit_id,
        lugar:    p.lugar ?? '',
      });
    }
    if (p.equipo_visit_id) {
      proximos.push({
        equipoId: p.equipo_visit_id,
        fecha:    p.fecha ? new Date(p.fecha).toLocaleDateString('es-AR') : 'A confirmar',
        rival:    equiposFemenino.find(e => e.id === p.equipo_local_id)?.name ?? p.equipo_local_id,
        lugar:    p.lugar ?? '',
      });
    }
  }

  return {
    equipos:  Object.values(statsPerEquipo),
    partidos,
    proximos,
  };
}

// ============================================================
// FETCH DESDE BACKEND PROPIO (cuando VITE_API_URL esté seteado)
// Este es el contrato que el backend debe cumplir:
// GET /api/femenino/stats → { equipos, partidos, proximos }
// ============================================================
async function fetchFromBackend() {
  const res = await fetch(`${API_BASE_URL}/api/femenino/stats`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  return res.json();
}

// ============================================================
// HOOK PRINCIPAL
// ============================================================
export function useFemeninoStats() {
  const [equipos, setEquipos]         = useState(() => mergeData(null));
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStats = useCallback(async () => {
    const hasBackend  = Boolean(API_BASE_URL);
    const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON);

    if (!hasBackend && !hasSupabase) {
      console.info('[useFemeninoStats] Sin backend ni Supabase — usando datos locales (stats en 0)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Prioridad: backend propio > Supabase directo
      const data = hasBackend
        ? await fetchFromBackend()
        : await fetchFromSupabase();

      setEquipos(mergeData(data));
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[useFemeninoStats] Error al fetchear stats:', err);
      setError(err.message);
      // No pisamos los datos anteriores en caso de error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, REFETCH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return {
    equipos,
    isLoading,
    error,
    lastUpdated,
    refetch: fetchStats,
  };
}
