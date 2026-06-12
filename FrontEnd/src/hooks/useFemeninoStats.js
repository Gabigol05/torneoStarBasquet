import { useState, useEffect, useCallback } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';

const DEFAULT_STATS = {
  pj:0, pts_prom:0, reb_prom:0, ast_prom:0, rob_prom:0,
  tap_prom:0, per_prom:0, val_prom:0,
  pct_simples:0, pct_dobles:0, pct_triples:0,
  pts_total:0, reb_total:0, ast_total:0,
  mejor_pts:0, mejor_pts_rival:null,
  // aliases usados por componentes existentes
  pts:0, reb:0, ast:0, rob:0, tap:0, fgp:0, tpp:0, tlp:0,
};

function buildEquiposBase() {
  return equiposFemenino.map(e => ({
    ...e,
    pj:0, pg:0, pp:0, pf:0, pc:0,
    historial:[], proximos:[],
    jugadoras: e.jugadoras.map(j => ({ ...j, ...DEFAULT_STATS })),
  }));
}

async function fetchTodo() {
  if (!isConfigured) return null;

  const [
    { data: statsRows,        error: e1 },
    { data: partidosRows,     error: e2 },
    { data: fechasRows,       error: e3 },
    { data: statsPartRows,    error: e4 },
  ] = await Promise.all([
    supabase.from('estadisticas_femenino').select('*'),
    supabase.from('partidos_femenino').select('*').order('fecha_id', { ascending: true }),
    supabase.from('fechas_femenino').select('*').order('numero', { ascending: true }),
    supabase.from('stats_partido_femenino').select('*'),
  ]);

  // Si alguna tabla no existe todavía, no crashear
  const stats     = statsRows    ?? [];
  const partidos  = partidosRows ?? [];
  const fechas    = fechasRows   ?? [];
  const statsPart = statsPartRows ?? [];

  // Mapas para lookup rápido
  const statsMap = {};
  for (const r of stats) statsMap[r.jugadora_id] = r;

  const statsPorPartido = {};
  for (const r of statsPart) {
    if (!statsPorPartido[r.partido_id]) statsPorPartido[r.partido_id] = {};
    statsPorPartido[r.partido_id][r.jugadora_id] = r;
  }

  // Posiciones desde partidos finalizados
  const posMap = {};
  for (const p of partidos) {
    if (p.estado !== 'finalizado') continue;
    const li = p.equipo_local_id, vi = p.equipo_visit_id;
    if (!posMap[li]) posMap[li] = { pj:0,pg:0,pp:0,pf:0,pc:0 };
    if (!posMap[vi]) posMap[vi] = { pj:0,pg:0,pp:0,pf:0,pc:0 };
    posMap[li].pj++; posMap[vi].pj++;
    posMap[li].pf += p.puntos_local ?? 0;
    posMap[li].pc += p.puntos_visit ?? 0;
    posMap[vi].pf += p.puntos_visit ?? 0;
    posMap[vi].pc += p.puntos_local ?? 0;
    if ((p.puntos_local ?? 0) > (p.puntos_visit ?? 0)) {
      posMap[li].pg++; posMap[vi].pp++;
    } else {
      posMap[vi].pg++; posMap[li].pp++;
    }
  }

  const equipos = equiposFemenino.map(eq => {
    const pos = posMap[eq.id] ?? { pj:0,pg:0,pp:0,pf:0,pc:0 };

    const historial = partidos
      .filter(p => p.estado === 'finalizado' &&
        (p.equipo_local_id === eq.id || p.equipo_visit_id === eq.id))
      .map(p => {
        const esLocal = p.equipo_local_id === eq.id;
        const rivalId = esLocal ? p.equipo_visit_id : p.equipo_local_id;
        const rival   = equiposFemenino.find(e => e.id === rivalId)?.name ?? rivalId;
        const pf      = esLocal ? (p.puntos_local ?? 0) : (p.puntos_visit ?? 0);
        const pc      = esLocal ? (p.puntos_visit ?? 0) : (p.puntos_local ?? 0);
        return { partidoId: p.id, rival, pf, pc, resultado: pf > pc ? 'G':'P', fechaId: p.fecha_id };
      });

    const proximos = partidos
      .filter(p => p.estado === 'pendiente' &&
        (p.equipo_local_id === eq.id || p.equipo_visit_id === eq.id))
      .map(p => {
        const esLocal = p.equipo_local_id === eq.id;
        const rivalId = esLocal ? p.equipo_visit_id : p.equipo_local_id;
        const rival   = equiposFemenino.find(e => e.id === rivalId)?.name ?? rivalId;
        const fecha   = fechas.find(f => f.id === p.fecha_id);
        return { rival, fechaNum: fecha?.numero, fechaDesc: fecha?.descripcion, lugar: p.lugar };
      });

    return {
      ...eq,
      ...pos,
      historial,
      proximos,
      jugadoras: eq.jugadoras.map(j => {
        const st = statsMap[j.id] ?? {};
        return {
          ...j,
          ...DEFAULT_STATS,
          ...st,
          // aliases para componentes que usan los nombres cortos
          pts: st.pts_prom ?? 0,
          reb: st.reb_prom ?? 0,
          ast: st.ast_prom ?? 0,
          rob: st.rob_prom ?? 0,
          tap: st.tap_prom ?? 0,
          fgp: st.pct_dobles  ?? 0,
          tpp: st.pct_triples ?? 0,
          tlp: st.pct_simples ?? 0,
        };
      }),
    };
  });

  return { equipos, partidos, fechas, statsPorPartido };
}

export function useFemeninoStats() {
  const [equipos,         setEquipos]         = useState(buildEquiposBase);
  const [partidos,        setPartidos]        = useState([]);
  const [fechas,          setFechas]          = useState([]);
  const [statsPorPartido, setStatsPorPartido] = useState({});
  const [isLoading,       setIsLoading]       = useState(isConfigured);
  const [error,           setError]           = useState(null);
  const [lastUpdated,     setLastUpdated]     = useState(null);

  const refresh = useCallback(async () => {
    if (!isConfigured) return;
    try {
      setIsLoading(true);
      const data = await fetchTodo();
      if (!data) return;
      setEquipos(data.equipos);
      setPartidos(data.partidos);
      setFechas(data.fechas);
      setStatsPorPartido(data.statsPorPartido);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('[useFemeninoStats]', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch inicial
  useEffect(() => { refresh(); }, [refresh]);

  // Realtime — solo si Supabase está configurado
  useEffect(() => {
    if (!isConfigured || !supabase) return;
    const channel = supabase
      .channel('torneo-fem')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estadisticas_femenino'  }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos_femenino'      }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stats_partido_femenino' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fechas_femenino'        }, refresh)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [refresh]);

  return { equipos, partidos, fechas, statsPorPartido, isLoading, error, lastUpdated, refetch: refresh };
}
