import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';

// ─── Defaults ─────────────────────────────────────────────────────────────────
const DEFAULT_STATS = {
  pj:0, pts_prom:0, reb_prom:0, ast_prom:0, rob_prom:0,
  tap_prom:0, per_prom:0, val_prom:0,
  pct_simples:0, pct_dobles:0, pct_triples:0,
  pts_total:0, reb_total:0, ast_total:0,
  rob_total:0, tap_total:0, val_total:0, per_total:0,
  mejor_pts:0, mejor_pts_rival:null,
  // aliases cortos para componentes existentes
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

// ─── Fetch optimizado: una sola ronda de queries paralelas ────────────────────
async function fetchTodo() {
  if (!isConfigured) return null;

  // Todas las queries en paralelo — mucho más rápido que secuencial
  const [
    { data: statsRows,     error: e1 },
    { data: partidosRows,  error: e2 },
    { data: fechasRows,    error: e3 },
    { data: statsPartRows, error: e4 },
  ] = await Promise.all([
    supabase.from('estadisticas_femenino').select('*'),
    supabase.from('partidos_femenino')
      .select('*')
      .order('fecha_id', { ascending: true }),
    supabase.from('fechas_femenino')
      .select('*')
      .order('numero', { ascending: true }),
    supabase.from('stats_partido_femenino')
      .select('partido_id,jugadora_id,pts,rd,ro,as_,rb,tp,pe,val,sc,sf,dc,df,tc,tf'),
  ]);

  // Log errores sin crashear — tablas pueden no existir todavía
  if (e1) console.warn('[useFemeninoStats] estadisticas:', e1.message);
  if (e2) console.warn('[useFemeninoStats] partidos:', e2.message);
  if (e3) console.warn('[useFemeninoStats] fechas:', e3.message);
  if (e4) console.warn('[useFemeninoStats] stats_partido:', e4.message);

  const stats     = statsRows    ?? [];
  const partidos  = partidosRows ?? [];
  const fechas    = fechasRows   ?? [];
  const statsPart = statsPartRows ?? [];

  // ── Maps de lookup O(1) ──
  const statsMap = Object.fromEntries(stats.map(r => [r.jugadora_id, r]));

  const statsPorPartido = {};
  for (const r of statsPart) {
    if (!statsPorPartido[r.partido_id]) statsPorPartido[r.partido_id] = {};
    statsPorPartido[r.partido_id][r.jugadora_id] = r;
  }

  // ── Posiciones calculadas desde partidos finalizados ──
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

  // ── Historial y próximos por equipo ──
  const historialMap = {};
  const proximosMap  = {};
  const fechaMap     = Object.fromEntries(fechas.map(f => [f.id, f]));
  const equipoMap    = Object.fromEntries(equiposFemenino.map(e => [e.id, e]));

  for (const p of partidos) {
    const lId = p.equipo_local_id, vId = p.equipo_visit_id;
    const fecha = fechaMap[p.fecha_id];

    if (p.estado === 'finalizado') {
      for (const [myId, rivalId, myPts, rivalPts] of [
        [lId, vId, p.puntos_local, p.puntos_visit],
        [vId, lId, p.puntos_visit, p.puntos_local],
      ]) {
        if (!historialMap[myId]) historialMap[myId] = [];
        historialMap[myId].push({
          partidoId: p.id,
          rival:     equipoMap[rivalId]?.name ?? rivalId,
          pf:        myPts ?? 0,
          pc:        rivalPts ?? 0,
          resultado: (myPts ?? 0) > (rivalPts ?? 0) ? 'G' : 'P',
          fechaId:   p.fecha_id,
          fechaNum:  fecha?.numero,
        });
      }
    } else if (p.estado === 'pendiente' || p.estado === 'en_juego') {
      for (const [myId, rivalId] of [[lId, vId],[vId, lId]]) {
        if (!proximosMap[myId]) proximosMap[myId] = [];
        proximosMap[myId].push({
          rival:     equipoMap[rivalId]?.name ?? rivalId,
          fechaNum:  fecha?.numero,
          fechaDesc: fecha?.descripcion,
          lugar:     p.lugar,
          hora:      p.hora_inicio ? String(p.hora_inicio).slice(0,5) : null,
          estado:    p.estado,
        });
      }
    }
  }

  // ── Armar equipos finales ──
  const equipos = equiposFemenino.map(eq => {
    const pos  = posMap[eq.id] ?? { pj:0,pg:0,pp:0,pf:0,pc:0 };
    return {
      ...eq,
      ...pos,
      historial: historialMap[eq.id] ?? [],
      proximos:  proximosMap[eq.id]  ?? [],
      jugadoras: eq.jugadoras.map(j => {
        const st = statsMap[j.id] ?? {};
        return {
          ...j,
          ...DEFAULT_STATS,
          ...st,
          // aliases cortos
          pts: st.pts_prom  ?? 0,
          reb: st.reb_prom  ?? 0,
          ast: st.ast_prom  ?? 0,
          rob: st.rob_prom  ?? 0,
          tap: st.tap_prom  ?? 0,
          fgp: st.pct_dobles  ?? 0,
          tpp: st.pct_triples ?? 0,
          tlp: st.pct_simples ?? 0,
          // tiros convertidos/fallados
          sc_total: st.sc_total ?? 0,
          sf_total: st.sf_total ?? 0,
          dc_total: st.dc_total ?? 0,
          df_total: st.df_total ?? 0,
          tc_total: st.tc_total ?? 0,
          tf_total: st.tf_total ?? 0,
          sc_prom:  st.sc_prom  ?? 0,
          dc_prom:  st.dc_prom  ?? 0,
          tc_prom:  st.tc_prom  ?? 0,
        };
      }),
    };
  });

  return { equipos, partidos, fechas, statsPorPartido };
}

// ─── Hook principal ───────────────────────────────────────────────────────────
// `enabled`: si es false, no pide datos ni abre el canal de Realtime — se usa
// para no traer el femenino cuando el sitio está mostrando el masculino (y
// viceversa), ya que antes PageHome llamaba los dos hooks siempre a la vez.
export function useFemeninoStats(enabled = true) {
  const [equipos,         setEquipos]         = useState(buildEquiposBase);
  const [partidos,        setPartidos]        = useState([]);
  const [fechas,          setFechas]          = useState([]);
  const [statsPorPartido, setStatsPorPartido] = useState({});
  const [isLoading,       setIsLoading]       = useState(isConfigured);
  const [error,           setError]           = useState(null);
  const [lastUpdated,     setLastUpdated]     = useState(null);

  // Evitar refetch si ya hay uno en curso
  const fetchingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!isConfigured || fetchingRef.current) return;
    fetchingRef.current = true;
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
      fetchingRef.current = false;
    }
  }, []);

  // Fetch inicial
  useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [refresh, enabled]);

  // Realtime — recibe push de Supabase, no pollea
  useEffect(() => {
    if (!enabled) return;
    if (!isConfigured || !supabase) return;
    const channel = supabase
      .channel('torneo-fem-rt')
      .on('postgres_changes', { event:'*', schema:'public', table:'estadisticas_femenino'  }, refresh)
      .on('postgres_changes', { event:'*', schema:'public', table:'partidos_femenino'       }, refresh)
      .on('postgres_changes', { event:'*', schema:'public', table:'stats_partido_femenino'  }, refresh)
      .on('postgres_changes', { event:'*', schema:'public', table:'fechas_femenino'         }, refresh)
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[useFemeninoStats] Realtime error — usando polling fallback');
          // Fallback: refresca cada 2 minutos si Realtime falla
          const interval = setInterval(refresh, 120_000);
          return () => clearInterval(interval);
        }
      });
    return () => supabase.removeChannel(channel);
  }, [refresh, enabled]);

  return {
    equipos, partidos, fechas, statsPorPartido,
    isLoading, error, lastUpdated, refetch: refresh,
  };
}