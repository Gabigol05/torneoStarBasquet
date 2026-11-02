import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { getVoterToken, getLocalVotes, setLocalVote } from '../lib/voter';

// ─── Encuestas públicas ───────────────────────────────────────────────────────
// ⚠️ Revisión general (seguridad + rendimiento):
//  - Antes el voto se insertaba directo en encuesta_votos desde el navegador,
//    con un "hash de IP" calculado en el propio navegador (vía api.ipify.org).
//    Como todo eso lo decidía el navegador, se podía votar infinitas veces
//    con un script, incluso en encuestas cerradas; y la tabla de votos (con
//    esos hashes de IP) era legible por cualquiera. Ahora se vota a través de
//    una función del servidor (fn_votar, ver seguridad_paso1.sql) que valida
//    que la encuesta esté abierta, que la opción sea de esa encuesta, y
//    calcula el control por red del lado del servidor.
//  - Ya no se consulta api.ipify.org: era una llamada a un servicio externo,
//    sin límite de tiempo, que demoraba la carga de las encuestas (y que
//    muchos bloqueadores de anuncios bloquean).
//  - Mientras el SQL nuevo no esté aplicado, este hook sigue funcionando con
//    el esquema viejo (cae a la consulta/insert directos) — así el orden en
//    que se suban el código y el SQL no rompe nada.

function groupResultados(rows) {
  const map = {};
  for (const r of rows) {
    if (!map[r.encuesta_id]) map[r.encuesta_id] = [];
    map[r.encuesta_id].push(r);
  }
  for (const id in map) map[id].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  return map;
}

// PostgREST devuelve PGRST202 cuando la función RPC todavía no existe.
const faltaFuncion = err => !!err && (err.code === 'PGRST202' || /Could not find the function/i.test(err.message ?? ''));

async function fetchResultados(ids) {
  if (!ids.length) return { data: [], error: null };
  return supabase.from('v_encuesta_resultados').select('*').in('encuesta_id', ids);
}

async function fetchMisVotos(token) {
  const r = await supabase.rpc('fn_mis_votos', { p_token: token });
  if (!r.error) return r.data ?? [];
  if (!faltaFuncion(r.error)) { console.warn('[useEncuestas] mis votos:', r.error.message); return []; }
  // Esquema viejo (antes de seguridad_paso1.sql)
  const { data, error } = await supabase.from('encuesta_votos').select('encuesta_id,opcion_id').eq('voter_token', token);
  if (error) console.warn('[useEncuestas] mis votos:', error.message);
  return data ?? [];
}

async function fetchTodo(token) {
  if (!isConfigured) return null;
  const { data: encuestasRows, error: e1 } = await supabase
    .from('encuestas').select('*').eq('activa', true).order('creado_en', { ascending: false });
  if (e1) console.warn('[useEncuestas] encuestas:', e1.message);
  const encuestas = encuestasRows ?? [];
  const ids = encuestas.map(e => e.id);
  // Resultados solo de las encuestas abiertas (antes se agregaban los votos
  // de TODAS las encuestas que existieron, en cada refresco).
  const [{ data: resultadosRows, error: e2 }, misVotosRows] = await Promise.all([
    fetchResultados(ids),
    fetchMisVotos(token),
  ]);
  if (e2) console.warn('[useEncuestas] resultados:', e2.message);
  return {
    encuestas,
    resultados: groupResultados(resultadosRows ?? []),
    misVotosMap: Object.fromEntries((misVotosRows ?? []).map(v => [v.encuesta_id, v.opcion_id])),
  };
}

export function useEncuestas() {
  const [encuestas,  setEncuestas]  = useState([]);
  const [resultados, setResultados] = useState({});
  const [misVotos,   setMisVotos]   = useState({}); // { encuestaId: opcionId } — fuente: DB + localStorage
  const [isLoading,  setIsLoading]  = useState(isConfigured);
  const [error,      setError]      = useState(null);
  const votingRef  = useRef(new Set());
  const fetchIdRef = useRef(0);
  const encuestasRef = useRef([]);

  const refresh = useCallback(async () => {
    if (!isConfigured) return;
    const miId = ++fetchIdRef.current;
    try {
      const data = await fetchTodo(getVoterToken());
      if (!data || miId !== fetchIdRef.current) return;
      encuestasRef.current = data.encuestas;
      setEncuestas(data.encuestas);
      setResultados(data.resultados);
      // Combina lo que dice la DB con lo que quedó en localStorage (por si la
      // red falló justo después de votar, igual lo recordamos local).
      setMisVotos({ ...getLocalVotes(), ...data.misVotosMap });
      setError(null);
    } catch (err) {
      console.error('[useEncuestas]', err);
      if (miId === fetchIdRef.current) setError(err.message);
    } finally {
      if (miId === fetchIdRef.current) setIsLoading(false);
    }
  }, []);

  // Solo los conteos (una consulta liviana) — para el refresco periódico.
  const refreshResultados = useCallback(async () => {
    const ids = encuestasRef.current.map(e => e.id);
    if (!ids.length) return;
    const { data, error: err } = await fetchResultados(ids);
    if (!err && data) setResultados(groupResultados(data));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const debounceRef = useRef(null);
  const refreshDebounced = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { debounceRef.current = null; refresh(); }, 900);
  }, [refresh]);

  // En vivo: solo cambios de encuestas/opciones (se abre/cierra una, se crea
  // una nueva). Los VOTOS ya no se escuchan en vivo: cada voto de cualquier
  // visitante hacía que TODOS los que tenían la página abierta volvieran a
  // descargar todo. Los conteos se refrescan cada 20 s mientras la página
  // está a la vista (y al instante cuando el propio visitante vota).
  useEffect(() => {
    if (!isConfigured || !supabase) return;
    let poll = null;
    const channel = supabase
      .channel('torneo-encuestas-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'encuestas' }, refreshDebounced)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'encuesta_opciones' }, refreshDebounced)
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (!poll) poll = setInterval(refresh, 60_000);
        } else if (status === 'SUBSCRIBED' && poll) {
          clearInterval(poll); poll = null;
        }
      });
    const conteos = setInterval(() => {
      if (document.visibilityState === 'visible') refreshResultados();
    }, 20_000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (poll) clearInterval(poll);
      clearInterval(conteos);
      supabase.removeChannel(channel);
    };
  }, [refresh, refreshDebounced, refreshResultados]);

  // Devuelve { ok:boolean, message?:string }
  const votar = useCallback(async (encuestaId, opcionId) => {
    if (!isConfigured || !supabase) return { ok: false, message: 'Votación no disponible' };
    if (misVotos[encuestaId])       return { ok: false, message: 'Ya votaste en esta encuesta' };
    if (votingRef.current.has(encuestaId)) return { ok: false, message: 'Procesando tu voto...' };

    votingRef.current.add(encuestaId);
    try {
      const token = getVoterToken();
      let { error: err } = await supabase.rpc('fn_votar', { p_encuesta: encuestaId, p_opcion: opcionId, p_token: token });
      if (faltaFuncion(err)) {
        // Esquema viejo (antes de seguridad_paso1.sql)
        ({ error: err } = await supabase.from('encuesta_votos')
          .insert({ encuesta_id: encuestaId, opcion_id: opcionId, voter_token: token, ip_hash: null }));
      }
      if (err) {
        // 23505 = ya había un voto con este dispositivo → "ya votaste".
        if (err.code === '23505' || /ya votaste/i.test(err.message ?? '')) {
          setLocalVote(encuestaId, opcionId);
          setMisVotos(v => ({ ...v, [encuestaId]: opcionId }));
          return { ok: false, message: 'Ya se registró un voto para esta encuesta desde tu dispositivo' };
        }
        if (/cerrada/i.test(err.message ?? '')) return { ok: false, message: 'Esta encuesta ya está cerrada' };
        if (/demasiados/i.test(err.message ?? '')) return { ok: false, message: 'Se alcanzó el límite de votos desde tu red para esta encuesta' };
        throw err;
      }
      setLocalVote(encuestaId, opcionId);
      setMisVotos(v => ({ ...v, [encuestaId]: opcionId }));
      await refreshResultados();
      return { ok: true };
    } catch (err) {
      console.error('[useEncuestas] votar:', err);
      return { ok: false, message: 'No se pudo registrar tu voto, probá de nuevo' };
    } finally {
      votingRef.current.delete(encuestaId);
    }
  }, [misVotos, refreshResultados]);

  return { encuestas, resultados, misVotos, isLoading, error, votar, refetch: refresh };
}
