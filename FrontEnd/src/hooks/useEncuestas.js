import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { getVoterToken, getVoterIpHash, getLocalVotes, setLocalVote } from '../lib/voter';

// Arma { [encuesta_id]: [{opcion_id, texto, equipo_id, orden, votos}] } ordenado
function groupResultados(rows) {
  const map = {};
  for (const r of rows) {
    if (!map[r.encuesta_id]) map[r.encuesta_id] = [];
    map[r.encuesta_id].push(r);
  }
  for (const id in map) map[id].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  return map;
}

async function fetchTodo(voterToken, ipHash) {
  if (!isConfigured) return null;

  // ⚠️ FIX: ademas de buscar los votos por voter_token (se pierde si se borra
  // el localStorage, se usa modo incognito, o el navegador purga datos del
  // sitio), tambien se buscan por ip_hash — asi si alguien vota de nuevo
  // desde la misma red pero con un token "nuevo", igual lo reconocemos como
  // "ya votaste" en vez de dejarlo votar otra vez. El ip_hash ya se guardaba
  // en cada voto (para bloquear duplicados), pero antes solo se usaba para
  // ESE chequeo — nunca para reconocer al votante en una visita posterior.
  const queries = [
    supabase.from('encuestas').select('*').eq('activa', true).order('creado_en', { ascending: false }),
    supabase.from('v_encuesta_resultados').select('*'),
    supabase.from('encuesta_votos').select('encuesta_id,opcion_id').eq('voter_token', voterToken),
  ];
  if (ipHash) {
    queries.push(supabase.from('encuesta_votos').select('encuesta_id,opcion_id').eq('ip_hash', ipHash));
  }

  const [
    { data: encuestasRows, error: e1 },
    { data: resultadosRows, error: e2 },
    { data: misVotosRows, error: e3 },
    ipRes,
  ] = await Promise.all(queries);

  if (e1) console.warn('[useEncuestas] encuestas:', e1.message);
  if (e2) console.warn('[useEncuestas] resultados:', e2.message);
  if (e3) console.warn('[useEncuestas] mis_votos:', e3.message);
  if (ipRes?.error) console.warn('[useEncuestas] mis_votos_ip:', ipRes.error.message);

  const encuestas  = encuestasRows  ?? [];
  const resultados = groupResultados(resultadosRows ?? []);
  // Los que coinciden por ip_hash se cargan primero, y los que coinciden por
  // voter_token pisan encima — el token identifica el dispositivo con mas
  // precision, asi que gana si por algun motivo difirieran.
  const misVotosMap = {
    ...Object.fromEntries((ipRes?.data ?? []).map(v => [v.encuesta_id, v.opcion_id])),
    ...Object.fromEntries((misVotosRows ?? []).map(v => [v.encuesta_id, v.opcion_id])),
  };

  return { encuestas, resultados, misVotosMap };
}

export function useEncuestas() {
  const [encuestas,  setEncuestas]  = useState([]);
  const [resultados, setResultados] = useState({});
  const [misVotos,   setMisVotos]   = useState({}); // { encuestaId: opcionId } — fuente: DB + localStorage
  const [isLoading,  setIsLoading]  = useState(isConfigured);
  const [error,      setError]      = useState(null);
  const votingRef = useRef(new Set());
  const fetchingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!isConfigured || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      setIsLoading(true);
      const token = getVoterToken();
      const ipHash = await getVoterIpHash();
      const data = await fetchTodo(token, ipHash);
      if (!data) return;
      setEncuestas(data.encuestas);
      setResultados(data.resultados);
      // Combina lo que dice la DB con lo que quedó en localStorage (por si la
      // red falló justo después de insertar el voto, igual lo recordamos local)
      setMisVotos({ ...getLocalVotes(), ...data.misVotosMap });
      setError(null);
    } catch (err) {
      console.error('[useEncuestas]', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!isConfigured || !supabase) return;
    const channel = supabase
      .channel('torneo-encuestas-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'encuestas' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'encuesta_opciones' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'encuesta_votos' }, refresh)
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          const interval = setInterval(refresh, 60_000);
          return () => clearInterval(interval);
        }
      });
    return () => supabase.removeChannel(channel);
  }, [refresh]);

  // Devuelve { ok:boolean, message?:string }
  const votar = useCallback(async (encuestaId, opcionId) => {
    if (!isConfigured || !supabase) return { ok: false, message: 'Votación no disponible' };
    if (misVotos[encuestaId])       return { ok: false, message: 'Ya votaste en esta encuesta' };
    if (votingRef.current.has(encuestaId)) return { ok: false, message: 'Procesando tu voto...' };

    votingRef.current.add(encuestaId);
    try {
      const voter_token = getVoterToken();
      const ip_hash = await getVoterIpHash();

      const { error } = await supabase.from('encuesta_votos').insert({
        encuesta_id: encuestaId,
        opcion_id: opcionId,
        voter_token,
        ip_hash,
      });

      if (error) {
        // 23505 = violación de constraint UNIQUE → ya había un voto (mismo
        // token o misma IP). Lo tratamos como "ya votaste", no como error real.
        if (error.code === '23505') {
          setLocalVote(encuestaId, opcionId);
          setMisVotos(v => ({ ...v, [encuestaId]: opcionId }));
          return { ok: false, message: 'Ya se registró un voto para esta encuesta desde tu dispositivo o red' };
        }
        throw error;
      }

      setLocalVote(encuestaId, opcionId);
      setMisVotos(v => ({ ...v, [encuestaId]: opcionId }));
      await refresh();
      return { ok: true };
    } catch (err) {
      console.error('[useEncuestas] votar:', err);
      return { ok: false, message: 'No se pudo registrar tu voto, probá de nuevo' };
    } finally {
      votingRef.current.delete(encuestaId);
    }
  }, [misVotos, refresh]);

  return { encuestas, resultados, misVotos, isLoading, error, votar, refetch: refresh };
}
