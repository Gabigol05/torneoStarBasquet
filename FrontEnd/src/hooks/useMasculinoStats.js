import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { equiposMasculino } from '../data/masculinoData';

// ─── Defaults ─────────────────────────────────────────────────────────────────
const DEFAULT_STATS = {
  pj:0, pts_prom:0, reb_prom:0, ast_prom:0, rob_prom:0,
  tap_prom:0, per_prom:0, val_prom:0,
  pct_simples:0, pct_dobles:0, pct_triples:0,
  pts_total:0, reb_total:0, ast_total:0,
  rob_total:0, tap_total:0, val_total:0, per_total:0,
  mejor_pts:0, mejor_pts_rival:null,
  pts:0, reb:0, ast:0, rob:0, tap:0, fgp:0, tpp:0, tlp:0,
};

function buildEquiposBase() {
  return equiposMasculino.map(e => ({
    ...e,
    zona: null,
    pj:0, pg:0, pp:0, pf:0, pc:0,
    historial:[], proximos:[],
    jugadoras: [],
  }));
}

// A diferencia del femenino (roster estático + stats dinámicas), en masculino
// TODO viene de la base: equipos (para zona), jugadores (roster) y stats.
//
// `temporadaId`: si se pasa, deja afuera todo lo que no sea de esa temporada
// (fechas, y por lo tanto los partidos y stats que cuelgan de ellas) — así
// una temporada vieja se puede seguir mirando sin que se mezcle con la
// actual. Si es null/undefined trae todo sin filtrar.
async function fetchTodo(temporadaId) {
  if (!isConfigured) return null;

  let fechasQuery = supabase.from('fechas_masculino').select('*').order('numero', { ascending: true });
  if (temporadaId != null) fechasQuery = fechasQuery.eq('temporada_id', temporadaId);
  let statsQuery = supabase.from('estadisticas_masculino').select('*');
  if (temporadaId != null) statsQuery = statsQuery.eq('temporada_id', temporadaId);

  // partidos_masculino y stats_partido_masculino no tienen temporada_id
  // propio (cuelgan de fechas_masculino.temporada_id) — se traen completos
  // y se filtran más abajo contra las fechas ya filtradas.
  const [
    { data: equiposRows,   error: e0 },
    { data: jugadoresRows, error: e1b },
    { data: statsRows,     error: e1 },
    { data: partidosRows,  error: e2 },
    { data: fechasRows,    error: e3 },
    { data: statsPartRows, error: e4 },
  ] = await Promise.all([
    supabase.from('equipos_masculino').select('id,zona'),
    supabase.from('jugadores_masculino').select('*'),
    statsQuery,
    supabase.from('partidos_masculino')
      .select('*')
      .order('fecha_id', { ascending: true }),
    fechasQuery,
    supabase.from('stats_partido_masculino')
      .select('partido_id,jugador_id,pts,rd,ro,as_,rb,tp,pe,val,sc,sf,dc,df,tc,tf'),
  ]);

  if (e0)  console.warn('[useMasculinoStats] equipos:', e0.message);
  if (e1b) console.warn('[useMasculinoStats] jugadores:', e1b.message);
  if (e1)  console.warn('[useMasculinoStats] estadisticas:', e1.message);
  if (e2)  console.warn('[useMasculinoStats] partidos:', e2.message);
  if (e3)  console.warn('[useMasculinoStats] fechas:', e3.message);
  if (e4)  console.warn('[useMasculinoStats] stats_partido:', e4.message);

  const equiposDb  = equiposRows   ?? [];
  const jugadores  = jugadoresRows ?? [];
  const stats      = statsRows     ?? [];
  const fechas     = fechasRows    ?? [];

  // Filtrar partidos/stats de partido contra las fechas de la temporada
  // seleccionada (fechasRows ya viene filtrado por fechasQuery de arriba).
  const fechaIds   = new Set(fechas.map(f => f.id));
  const partidos   = (partidosRows  ?? []).filter(p => fechaIds.has(p.fecha_id));
  const partidoIds = new Set(partidos.map(p => p.id));
  const statsPart  = (statsPartRows ?? []).filter(r => partidoIds.has(r.partido_id));

  const zonaMap  = Object.fromEntries(equiposDb.map(r => [r.id, r.zona]));
  const statsMap = Object.fromEntries(stats.map(r => [r.jugador_id, r]));

  const statsPorPartido = {};
  for (const r of statsPart) {
    if (!statsPorPartido[r.partido_id]) statsPorPartido[r.partido_id] = {};
    statsPorPartido[r.partido_id][r.jugador_id] = r;
  }

  // Roster por equipo (viene de la DB, a diferencia del femenino estático)
  const rosterPorEquipo = {};
  for (const j of jugadores) {
    if (!rosterPorEquipo[j.equipo_id]) rosterPorEquipo[j.equipo_id] = [];
    rosterPorEquipo[j.equipo_id].push(j);
  }

  // ── Posiciones calculadas desde partidos finalizados ──
  // Los partidos de playoff (es_playoff=true) quedan afuera: la tabla de
  // posiciones es solo de temporada regular, si no un resultado de semifinal
  // o final terminaría sumando PJ/PG/PP/PF/PC como si fuera una fecha más.
  const posMap = {};
  for (const p of partidos) {
    if (p.estado !== 'finalizado') continue;
    if (p.es_playoff) continue;
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
  const fechaMap  = Object.fromEntries(fechas.map(f => [f.id, f]));
  const equipoMap = Object.fromEntries(equiposMasculino.map(e => [e.id, e]));

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
          // Playoffs: el partido trae su propia copa/instancia/llave (no la
          // fecha) porque una misma jornada puede mezclar cruces de más de
          // una copa el mismo fin de semana.
          esPlayoff: !!p.es_playoff,
          copa:      p.copa ?? null,
          instancia: p.instancia ?? null,
          llave:     p.llave ?? null,
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
          esPlayoff: !!p.es_playoff,
          copa:      p.copa ?? null,
          instancia: p.instancia ?? null,
          llave:     p.llave ?? null,
        });
      }
    }
  }

  // ── Armar equipos finales ──
  const equipos = equiposMasculino.map(eq => {
    const pos  = posMap[eq.id] ?? { pj:0,pg:0,pp:0,pf:0,pc:0 };
    const roster = rosterPorEquipo[eq.id] ?? [];
    return {
      ...eq,
      ...pos,
      zona: zonaMap[eq.id] ?? null,
      historial: historialMap[eq.id] ?? [],
      proximos:  proximosMap[eq.id]  ?? [],
      jugadoras: roster.map(j => {
        const st = statsMap[j.id] ?? {};
        return {
          id: j.id,
          nombre: j.nombre,
          numero: j.numero,
          fechaNac: j.fecha_nac,
          ...DEFAULT_STATS,
          ...st,
          // ⚠️ FIX preventivo (mismo bug que en femenino): si estadisticas_masculino
          // tiene su propia columna "id", el spread de arriba pisaría el id real
          // del jugador — se re-afirma acá para que nunca gane el de la tabla de stats.
          id: j.id,
          pts: st.pts_prom ?? 0,
          reb: st.reb_prom ?? 0,
          ast: st.ast_prom ?? 0,
          rob: st.rob_prom ?? 0,
          tap: st.tap_prom ?? 0,
          fgp: st.pct_dobles  ?? 0,
          tpp: st.pct_triples ?? 0,
          tlp: st.pct_simples ?? 0,
          sc_total: st.sc_total ?? 0, sf_total: st.sf_total ?? 0,
          dc_total: st.dc_total ?? 0, df_total: st.df_total ?? 0,
          tc_total: st.tc_total ?? 0, tf_total: st.tf_total ?? 0,
          sc_prom:  st.sc_prom  ?? 0, dc_prom: st.dc_prom ?? 0,
          tc_prom:  st.tc_prom  ?? 0,
        };
      }),
    };
  });

  return { equipos, partidos, fechas, statsPorPartido };
}

// ─── Hook principal ───────────────────────────────────────────────────────────
// `enabled`: si es false, no pide datos ni abre el canal de Realtime — se usa
// para no traer el masculino cuando el sitio está mostrando el femenino (y
// viceversa), ya que antes PageHome llamaba los dos hooks siempre a la vez.
// `temporadaId`: qué temporada mirar (normalmente `temporadaSeleccionadaId`
// de useTemporada()) — null trae todo sin filtrar por temporada.
export function useMasculinoStats(enabled = true, temporadaId = null) {
  const [equipos,         setEquipos]         = useState(buildEquiposBase);
  const [partidos,        setPartidos]        = useState([]);
  const [fechas,          setFechas]          = useState([]);
  const [statsPorPartido, setStatsPorPartido] = useState({});
  const [isLoading,       setIsLoading]       = useState(isConfigured);
  const [error,           setError]           = useState(null);
  const [lastUpdated,     setLastUpdated]     = useState(null);

  const fetchingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!isConfigured || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      setIsLoading(true);
      const data = await fetchTodo(temporadaId);
      if (!data) return;
      setEquipos(data.equipos);
      setPartidos(data.partidos);
      setFechas(data.fechas);
      setStatsPorPartido(data.statsPorPartido);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('[useMasculinoStats]', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [temporadaId]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [refresh, enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (!isConfigured || !supabase) return;
    const channel = supabase
      .channel('torneo-masc-rt')
      .on('postgres_changes', { event:'*', schema:'public', table:'equipos_masculino'       }, refresh)
      .on('postgres_changes', { event:'*', schema:'public', table:'jugadores_masculino'      }, refresh)
      .on('postgres_changes', { event:'*', schema:'public', table:'estadisticas_masculino'   }, refresh)
      .on('postgres_changes', { event:'*', schema:'public', table:'partidos_masculino'       }, refresh)
      .on('postgres_changes', { event:'*', schema:'public', table:'stats_partido_masculino'  }, refresh)
      .on('postgres_changes', { event:'*', schema:'public', table:'fechas_masculino'         }, refresh)
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[useMasculinoStats] Realtime error — usando polling fallback');
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
