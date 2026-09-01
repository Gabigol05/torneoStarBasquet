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
    jugadoras: [],
  }));
}

// ─── Fetch optimizado: una sola ronda de queries paralelas ────────────────────
// El plantel (jugadoras_femenino) viene de la base igual que en masculino —
// dejó de ser un array estático para que el roster esté siempre al día
// (altas/bajas por temporada) sin necesitar un deploy de código.
//
// `temporadaId`: si se pasa, deja afuera todo lo que no sea de esa temporada
// (fechas, y por lo tanto los partidos y stats que cuelgan de ellas) — así
// una temporada vieja se puede seguir mirando sin que se mezcle con la
// actual. Si es null/undefined trae todo sin filtrar (fallback mientras
// TemporadaContext todavía no resolvió cuál es la temporada activa).
async function fetchTodo(temporadaId) {
  if (!isConfigured) return null;

  let fechasQuery = supabase.from('fechas_femenino').select('*').order('numero', { ascending: true });
  if (temporadaId != null) fechasQuery = fechasQuery.eq('temporada_id', temporadaId);
  let statsQuery = supabase.from('estadisticas_femenino').select('*');
  if (temporadaId != null) statsQuery = statsQuery.eq('temporada_id', temporadaId);

  // Todas las queries en paralelo — mucho más rápido que secuencial.
  // partidos_femenino y stats_partido_femenino NO tienen temporada_id propio
  // (cuelgan de fechas_femenino.temporada_id), así que se traen completos y
  // se filtran acá abajo contra las fechas ya filtradas — evita una vuelta
  // secuencial extra sin perder el filtro.
  const [
    { data: jugadorasRows, error: e0 },
    { data: statsRows,     error: e1 },
    { data: partidosRows,  error: e2 },
    { data: fechasRows,    error: e3 },
    { data: statsPartRows, error: e4 },
  ] = await Promise.all([
    supabase.from('jugadoras_femenino').select('*'),
    statsQuery,
    supabase.from('partidos_femenino')
      .select('*')
      .order('fecha_id', { ascending: true }),
    fechasQuery,
    supabase.from('stats_partido_femenino')
      .select('partido_id,jugadora_id,pts,rd,ro,as_,rb,tp,pe,val,sc,sf,dc,df,tc,tf'),
  ]);

  // Log errores sin crashear — tablas pueden no existir todavía
  if (e0) console.warn('[useFemeninoStats] jugadoras:', e0.message);
  if (e1) console.warn('[useFemeninoStats] estadisticas:', e1.message);
  if (e2) console.warn('[useFemeninoStats] partidos:', e2.message);
  if (e3) console.warn('[useFemeninoStats] fechas:', e3.message);
  if (e4) console.warn('[useFemeninoStats] stats_partido:', e4.message);

  const jugadoras = jugadorasRows ?? [];
  const stats     = statsRows    ?? [];
  const fechas    = fechasRows   ?? [];

  // Filtrar partidos/stats de partido contra las fechas de la temporada
  // seleccionada (fechasRows ya viene filtrado por fechasQuery de arriba).
  const fechaIds       = new Set(fechas.map(f => f.id));
  const partidos       = (partidosRows  ?? []).filter(p => fechaIds.has(p.fecha_id));
  const partidoIds     = new Set(partidos.map(p => p.id));
  const statsPart      = (statsPartRows ?? []).filter(r => partidoIds.has(r.partido_id));

  // Roster por equipo (viene de la base, a la par de masculino)
  const rosterPorEquipo = {};
  for (const j of jugadoras) {
    if (!rosterPorEquipo[j.equipo_id]) rosterPorEquipo[j.equipo_id] = [];
    rosterPorEquipo[j.equipo_id].push(j);
  }

  // ── Maps de lookup O(1) ──
  const statsMap = Object.fromEntries(stats.map(r => [r.jugadora_id, r]));

  const statsPorPartido = {};
  for (const r of statsPart) {
    if (!statsPorPartido[r.partido_id]) statsPorPartido[r.partido_id] = {};
    statsPorPartido[r.partido_id][r.jugadora_id] = r;
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
  const equipos = equiposFemenino.map(eq => {
    const pos    = posMap[eq.id] ?? { pj:0,pg:0,pp:0,pf:0,pc:0 };
    const roster = rosterPorEquipo[eq.id] ?? [];
    return {
      ...eq,
      ...pos,
      historial: historialMap[eq.id] ?? [],
      proximos:  proximosMap[eq.id]  ?? [],
      jugadoras: roster.map(j => {
        const st = statsMap[j.id] ?? {};
        return {
          nombre: j.nombre,
          numero: j.numero,
          fechaNac: j.fecha_nac,
          fotoUrl: j.foto_url,
          equipoId: j.equipo_id,
          ...DEFAULT_STATS,
          ...st,
          // ⚠️ FIX: estadisticas_femenino tiene su propia columna "id"
          // (autoincremental, PK de esa tabla) distinta de jugadora_id — el
          // spread de arriba la pisaría si no se reafirmara, y el resto del
          // sitio terminaría usando ese id numérico en vez del id real de la
          // jugadora (ej. "f_tl_13"), rompiendo cualquier búsqueda posterior
          // que dependiera de él (como el historial de stats por fecha).
          id: j.id,
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
// `temporadaId`: qué temporada mirar (normalmente `temporadaSeleccionadaId`
// de useTemporada()) — null trae todo sin filtrar por temporada.
export function useFemeninoStats(enabled = true, temporadaId = null) {
  const [equipos,         setEquipos]         = useState(buildEquiposBase);
  const [partidos,        setPartidos]        = useState([]);
  const [fechas,          setFechas]          = useState([]);
  const [statsPorPartido, setStatsPorPartido] = useState({});
  const [isLoading,       setIsLoading]       = useState(isConfigured);
  const [error,           setError]           = useState(null);
  const [lastUpdated,     setLastUpdated]     = useState(null);

  // ⚠️ FIX BUG (reporte Alvaro: al recargar la página a veces el hero queda
  // pegado en "En Curso" hasta que cambiás de torneo y volvés). Antes había
  // acá un "fetchingRef" que directamente CANCELABA cualquier refresh() que
  // llegara mientras otro seguía en vuelo. Al recargar, TemporadaContext
  // todavía no resolvió cuál es la temporada activa en el primer render, así
  // que este hook arranca con temporadaId=null (fetchTodo(null) trae TODAS
  // las fechas/partidos de todas las temporadas, no solo la actual). Un
  // instante después TemporadaContext resuelve el id real, `refresh` cambia
  // de identidad (depende de temporadaId) y el efecto de abajo dispara un
  // SEGUNDO refresh() ya con el filtro correcto — pero si el primero (el de
  // temporadaId=null) todavía no había terminado, fetchingRef seguía en
  // true y ese segundo refresh, el único con el dato bueno, se descartaba
  // en silencio. La página quedaba mostrando el conteo de TODAS las
  // temporadas (fechasJugadas > 0 de temporadas viejas) y no se volvía a
  // pedir nada hasta el próximo trigger real (ej: apagar/prender el hook al
  // cambiar de torneo con `enabled`).
  // Ahora, en vez de bloquear el refresh nuevo, se dejan correr los dos pero
  // se ignora el resultado de cualquiera que ya haya quedado viejo (si para
  // cuando responde ya se pidió un refresh más nuevo) — así nunca se pierde
  // el fetch con los datos correctos, sea cual sea el orden en que respondan.
  const fetchIdRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!isConfigured) return;
    const miId = ++fetchIdRef.current;
    try {
      setIsLoading(true);
      const data = await fetchTodo(temporadaId);
      if (!data) return;
      if (miId !== fetchIdRef.current) return; // ya hay un refresh más nuevo en curso/resuelto
      setEquipos(data.equipos);
      setPartidos(data.partidos);
      setFechas(data.fechas);
      setStatsPorPartido(data.statsPorPartido);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('[useFemeninoStats]', err);
      if (miId === fetchIdRef.current) setError(err.message);
    } finally {
      if (miId === fetchIdRef.current) setIsLoading(false);
    }
  }, [temporadaId]);

  // Fetch inicial — y de nuevo cada vez que cambia la temporada elegida
  // (refresh ya cambia de identidad cuando cambia temporadaId, así que este
  // efecto se re-dispara solo).
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
      .on('postgres_changes', { event:'*', schema:'public', table:'jugadoras_femenino'      }, refresh)
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