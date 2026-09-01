import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';
import { equiposMasculino } from '../data/masculinoData';
import { TABLAS } from './categoriaAdmin';
import { useTemporada } from '../context/TemporadaContext';
import { useConfirm } from '../components/ConfirmModal.jsx';
import { buildPools, bracketSizeFor, resolveWinner } from '../components/PlayoffsBracket.jsx';
import { INSTANCIA_LABEL } from '../lib/fechaLabel';

const ROSTER = { femenino: equiposFemenino, masculino: equiposMasculino };

const CUPS = [
  { key: 'oro',    label: 'Copa de Oro',    color: '#F0B429' },
  { key: 'plata',  label: 'Copa de Plata',  color: '#C7D1DD' },
  { key: 'bronce', label: 'Copa de Bronce', color: '#CD7F32' },
];

// Orden de rondas para un cuadro de 8 (cuartos->semifinal->final) — para un
// pool de 4 arranca directo en semifinal, y para uno de 2 directo en final.
const RONDAS_POR_SIZE = {
  8: ['cuartos', 'semifinal', 'final'],
  4: ['semifinal', 'final'],
  2: ['final'],
};

// ─── Panel "Cerrar Temporada Regular" ────────────────────────────────────────
// Arma automáticamente los cruces de playoff (Copa de Oro/Plata/Bronce) según
// la tabla de posiciones actual de la temporada activa, con EXACTAMENTE el
// mismo criterio de siembra y numeración de llave que usa el cuadro público
// (PlayoffsBracket.jsx — sortByStandings/buildPools/bracketSizeFor están
// importadas de ahí, no reimplementadas acá, para que nunca se desalineen).
// Ronda por ronda: primero cuartos (u semifinal/final directo si el pool es
// chico) sembrados por posición; una vez que TODOS los partidos de esa ronda
// están finalizados, este panel ofrece generar la ronda siguiente usando a
// los ganadores reales (resolveWinner). Nunca pisa partidos ya cargados.
export default function PlayoffsAdmin({ categoria: categoriaProp, setCategoria: setCategoriaProp } = {}) {
  const [categoriaLocal, setCategoriaLocal] = useState('femenino');
  const categoria    = categoriaProp ?? categoriaLocal;
  const setCategoria = setCategoriaProp ?? setCategoriaLocal;
  const tablas = TABLAS[categoria];
  const roster = ROSTER[categoria];
  // Cada categoría tiene su propia temporada activa (ver TemporadaContext)
  // — acá siempre se usa la de la categoría elegida en este panel.
  const { temporadaActivaId: temporadaActivaIdPorCategoria, temporadas } = useTemporada();
  const temporadaActivaId = temporadaActivaIdPorCategoria[categoria];
  const { confirm, ConfirmDialog } = useConfirm();

  const [loading, setLoading] = useState(false);
  const [generando, setGenerando] = useState(null); // key de la copa que se está generando
  const [msg, setMsg] = useState(null);
  const [equipos, setEquipos] = useState([]);       // roster + standings + zona (masc)
  const [partidosReg, setPartidosReg] = useState([]);   // partidos de temporada regular finalizados
  const [partidosPlayoff, setPartidosPlayoff] = useState([]); // partidos es_playoff=true de esta temporada
  const [fechas, setFechas] = useState([]);

  const temporadaActiva = temporadas.find(t => t.id === temporadaActivaId);
  const flash = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 4500); };

  const cargar = useCallback(async () => {
    if (!temporadaActivaId) return;
    setLoading(true);
    try {
      const [{ data: fechasT, error: fErr }, equiposDbQuery] = await Promise.all([
        supabase.from(tablas.fechas).select('id,numero').eq('temporada_id', temporadaActivaId),
        categoria === 'masculino'
          ? supabase.from('equipos_masculino').select('id,zona')
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (fErr) throw fErr;
      const { data: equiposDb } = equiposDbQuery;
      const zonaMap = Object.fromEntries((equiposDb ?? []).map(r => [r.id, r.zona]));

      const fechaIds = (fechasT ?? []).map(f => f.id);
      let partidos = [];
      if (fechaIds.length) {
        const { data: ps, error: pErr } = await supabase
          .from(tablas.partidos).select('*').in('fecha_id', fechaIds);
        if (pErr) throw pErr;
        partidos = ps ?? [];
      }

      const regulares   = partidos.filter(p => !p.es_playoff && p.estado === 'finalizado');
      const playoffRows = partidos.filter(p => p.es_playoff);

      // Standings de temporada regular a partir de los partidos finalizados —
      // mismo cálculo (pg*2+pp, dif, pf) que usa sortByStandings.
      const base = Object.fromEntries(roster.map(e => [e.id, {
        ...e, zona: zonaMap[e.id] ?? null, pj: 0, pg: 0, pp: 0, pf: 0, pc: 0,
      }]));
      for (const p of regulares) {
        const l = base[p.equipo_local_id], v = base[p.equipo_visit_id];
        const pl = p.puntos_local ?? 0, pv = p.puntos_visit ?? 0;
        if (l) { l.pj++; l.pf += pl; l.pc += pv; if (pl > pv) l.pg++; else l.pp++; }
        if (v) { v.pj++; v.pf += pv; v.pc += pl; if (pv > pl) v.pg++; else v.pp++; }
      }

      setEquipos(Object.values(base));
      setPartidosReg(regulares);
      setPartidosPlayoff(playoffRows);
      setFechas(fechasT ?? []);
    } catch (err) {
      flash(`❌ Error cargando datos: ${err.message}`, false);
    } finally {
      setLoading(false);
    }
  }, [categoria, temporadaActivaId, tablas, roster]);

  useEffect(() => { cargar(); }, [cargar]);

  const equipoMap = useMemo(() => Object.fromEntries(equipos.map(e => [e.id, e])), [equipos]);
  const pools = useMemo(() => buildPools(equipos, categoria), [equipos, categoria]);
  const hayPartidosRegulares = partidosReg.length > 0;

  // Busca (o determina el nombre para crear) la fecha compartida de una
  // instancia dentro de la temporada activa — varias copas pueden convivir
  // en la misma fecha/ronda (ej: semifinal de Oro y de Plata el mismo finde).
  const obtenerOcrearFecha = async (instancia) => {
    const descripcionBuscada = INSTANCIA_LABEL[instancia];
    const { data: existente, error: eErr } = await supabase
      .from(tablas.fechas).select('id')
      .eq('temporada_id', temporadaActivaId).eq('descripcion', descripcionBuscada)
      .maybeSingle();
    if (eErr) throw eErr;
    if (existente) return existente.id;

    const maxNumero = fechas.reduce((m, f) => Math.max(m, f.numero ?? 0), 0);
    const { data: nueva, error: nErr } = await supabase
      .from(tablas.fechas)
      .insert({ numero: maxNumero + 1, descripcion: descripcionBuscada, temporada_id: temporadaActivaId })
      .select('id').single();
    if (nErr) throw nErr;
    return nueva.id;
  };

  // Determina, para una copa puntual, en qué ronda está parada y qué haría
  // falta para avanzar. Devuelve { estado, siguienteRonda, pares, faltan }.
  //   estado: 'sin-equipos' | 'esperando' | 'lista' | 'completo'
  const estadoCopa = (cup) => {
    const pool = pools[cup.key] ?? [];
    const size = bracketSizeFor(pool.length);
    if (size === 0) return { estado: 'sin-equipos', pool, size };

    const partidosCopa = partidosPlayoff.filter(p => p.copa === cup.key);
    const rondas = RONDAS_POR_SIZE[size];
    const buscar = (instancia, llave) => partidosCopa.find(p => p.instancia === instancia && p.llave === llave) ?? null;

    for (let i = 0; i < rondas.length; i++) {
      const instancia = rondas[i];
      const yaCargados = partidosCopa.filter(p => p.instancia === instancia);

      if (yaCargados.length === 0) {
        // Esta ronda todavía no se generó — es la candidata a "Generar".
        let pares;
        if (i === 0) {
          // Primera ronda del cuadro: sembrada por posición.
          const seeded = pool.slice(0, size);
          if (instancia === 'cuartos') pares = [[0,7],[1,6],[2,5],[3,4]].map(([a,b]) => [seeded[a], seeded[b]]);
          else if (instancia === 'semifinal') pares = [[0,3],[1,2]].map(([a,b]) => [seeded[a], seeded[b]]);
          else pares = [[seeded[0], seeded[1]]];
        } else {
          // Ronda siguiente: sembrada con los GANADORES reales de la ronda anterior.
          const rondaPrevia = rondas[i - 1];
          if (instancia === 'semifinal') {
            // viene de cuartos (size 8): llave1=g(c1)vs g(c2), llave2=g(c3)vs g(c4)
            const g = [1,2,3,4].map(ll => resolveWinner(buscar('cuartos', ll), equipoMap));
            if (g.some(x => !x)) return { estado: 'esperando', pool, size, rondaEsperada: rondaPrevia };
            pares = [[g[0], g[1]], [g[2], g[3]]];
          } else { // final
            const nSemis = size === 8 ? 2 : 2;
            const g = Array.from({ length: nSemis }, (_, k) => resolveWinner(buscar('semifinal', k + 1), equipoMap));
            if (g.some(x => !x)) return { estado: 'esperando', pool, size, rondaEsperada: rondaPrevia };
            pares = [[g[0], g[1]]];
          }
        }
        if (pares.some(([a, b]) => !a || !b)) return { estado: 'sin-equipos', pool, size };
        return { estado: 'lista', pool, size, siguienteRonda: instancia, pares };
      }
      if (yaCargadosNoFinalizados(yaCargados)) return { estado: 'esperando-resultados', pool, size, rondaEsperada: instancia };
    }
    return { estado: 'completo', pool, size };
  };
  const yaCargadosNoFinalizados = (rows) => rows.some(p => p.estado !== 'finalizado');

  const generarRonda = async (cup, info) => {
    const nombresPares = info.pares.map(([a, b]) => `${a.name} vs ${b.name}`).join(' · ');
    const ok = await confirm(
      `¿Generar ${INSTANCIA_LABEL[info.siguienteRonda]} de ${cup.label}?\n\n${nombresPares}\n\nSe van a crear como partidos "pendiente" — cargás el resultado normal desde Partidos cuando se jueguen.`
    );
    if (!ok) return;
    setGenerando(cup.key);
    try {
      const fechaId = await obtenerOcrearFecha(info.siguienteRonda);
      const rows = info.pares.map((par, i) => ({
        fecha_id: fechaId,
        equipo_local_id: par[0].id,
        equipo_visit_id: par[1].id,
        estado: 'pendiente',
        es_playoff: true,
        copa: cup.key,
        instancia: info.siguienteRonda,
        llave: i + 1,
      }));
      const { error } = await supabase.from(tablas.partidos).insert(rows);
      if (error) throw error;
      flash(`✅ ${INSTANCIA_LABEL[info.siguienteRonda]} de ${cup.label} generada (${rows.length} partido${rows.length > 1 ? 's' : ''})`);
      await cargar();
    } catch (err) {
      flash(`❌ ${err.message}`, false);
    } finally {
      setGenerando(null);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 1, color: '#EEF2F8', margin: 0 }}>
          🏆 CERRAR TEMPORADA REGULAR
        </h2>
        <p style={{ color: '#6B7A99', fontSize: 13, margin: '4px 0 0' }}>
          Arma los cruces de playoff automáticamente según la tabla de posiciones actual de{' '}
          <strong style={{ color: '#F0B429' }}>{temporadaActiva?.nombre ?? 'la temporada activa'}</strong> —
          misma siembra que se ve en el cuadro público. Cada ronda siguiente se habilita sola cuando
          la anterior está 100% finalizada.
        </p>
      </div>

      {msg && (
        <div style={{
          marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, whiteSpace: 'pre-line',
          background: msg.ok ? 'rgba(34,208,122,.1)' : 'rgba(240,64,96,.1)',
          color: msg.ok ? '#22D07A' : '#F04060',
          border: `1px solid ${msg.ok ? 'rgba(34,208,122,.3)' : 'rgba(240,64,96,.3)'}`,
        }}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#6B7A99' }}>Cargando tabla de posiciones...</p>
      ) : !hayPartidosRegulares ? (
        <div style={{
          padding: 18, borderRadius: 10, background: '#0E1420', border: '1px solid #1C2535',
          color: '#6B7A99', fontSize: 13.5,
        }}>
          Todavía no hay partidos de temporada regular finalizados en {temporadaActiva?.nombre ?? 'esta temporada'} —
          la tabla de posiciones está vacía, así que no se puede armar el cuadro de playoffs todavía.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {CUPS.map(cup => {
            const info = estadoCopa(cup);
            return (
              <div key={cup.key} style={{
                padding: 18, borderRadius: 12, background: '#0E1420', border: `1px solid ${cup.color}33`,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
                  fontFamily: "'Barlow Condensed'", fontSize: 14, fontWeight: 700, letterSpacing: 2,
                  textTransform: 'uppercase', color: cup.color,
                }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: cup.color, display: 'inline-block' }} />
                  {cup.label}
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#4A566E', textTransform: 'none', letterSpacing: 0 }}>
                    {info.pool?.length ?? 0} equipo{(info.pool?.length ?? 0) === 1 ? '' : 's'} en el pool
                  </span>
                </div>

                {info.estado === 'sin-equipos' && (
                  <p style={{ color: '#4A566E', fontSize: 13, margin: 0 }}>
                    No hay equipos suficientes en este pool todavía para armar un cruce.
                  </p>
                )}

                {(info.estado === 'esperando' || info.estado === 'esperando-resultados') && (
                  <p style={{ color: '#F0B429', fontSize: 13, margin: 0 }}>
                    ⏳ Esperando que se carguen y finalicen todos los partidos de{' '}
                    <strong>{INSTANCIA_LABEL[info.rondaEsperada]}</strong> para poder armar la ronda siguiente.
                  </p>
                )}

                {info.estado === 'completo' && (
                  <p style={{ color: '#22D07A', fontSize: 13, margin: 0 }}>
                    ✅ Cuadro completo — la Final ya se jugó. Revisá el resultado en el cuadro público.
                  </p>
                )}

                {info.estado === 'lista' && (
                  <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                      {info.pares.map(([a, b], i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: '#CBD5E8',
                          padding: '7px 12px', borderRadius: 7, background: '#080C12',
                        }}>
                          <span style={{ color: '#4A566E', fontSize: 11, minWidth: 18 }}>{i + 1}.</span>
                          {a.logo && <img src={a.logo} alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />}
                          {a.name} <span style={{ color: '#4A566E' }}>vs</span> {b.name}
                          {b.logo && <img src={b.logo} alt="" style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} />}
                        </div>
                      ))}
                    </div>
                    <button onClick={() => generarRonda(cup, info)} disabled={generando === cup.key} style={{
                      padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: `linear-gradient(135deg, ${cup.color}, #FF6B2B)`, color: '#080C12',
                      fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, letterSpacing: 1,
                      opacity: generando === cup.key ? 0.6 : 1,
                    }}>
                      {generando === cup.key ? 'Generando...' : `🏆 GENERAR ${INSTANCIA_LABEL[info.siguienteRonda]?.toUpperCase()}`}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {ConfirmDialog}
    </div>
  );
}
