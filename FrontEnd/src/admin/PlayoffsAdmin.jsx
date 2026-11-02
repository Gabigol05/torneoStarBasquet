import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';
import { equiposMasculino } from '../data/masculinoData';
import { TABLAS } from './categoriaAdmin';
import { useTemporada } from '../context/TemporadaContext';
import { useConfirm } from '../components/ConfirmModal.jsx';
import { buildPools, bracketSizeFor, resolveWinner, primeraRonda, sortByStandings } from '../components/PlayoffsBracket.jsx';
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
  const [editando, setEditando] = useState(null);   // key de la copa cuya ronda ya generada se está corrigiendo
  const [msg, setMsg] = useState(null);
  const [equipos, setEquipos] = useState([]);       // roster + standings + zona (masc)
  const [partidosReg, setPartidosReg] = useState([]);   // partidos de temporada regular finalizados
  const [regularesSinJugar, setRegularesSinJugar] = useState(0); // de temporada regular, todavía no finalizados
  const [partidosPlayoff, setPartidosPlayoff] = useState([]); // partidos es_playoff=true de esta temporada
  const [fechas, setFechas] = useState([]);

  const temporadaActiva = temporadas.find(t => t.id === temporadaActivaId);
  const flash = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 4500); };

  const cargar = useCallback(async () => {
    if (!temporadaActivaId) return;
    setLoading(true);
    try {
      // La zona (A/B) se lee de la tabla de equipos de la categoría elegida —
      // femenino también la tiene desde que pasó a jugarse por zonas
      // (add_zonas_femenino.sql), a la par de masculino.
      const [{ data: fechasT, error: fErr }, equiposDbQuery] = await Promise.all([
        supabase.from(tablas.fechas).select('id,numero').eq('temporada_id', temporadaActivaId),
        supabase.from(tablas.equipos).select('id,zona'),
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
      setRegularesSinJugar(partidos.filter(p => !p.es_playoff && p.estado !== 'finalizado').length);
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
          // Primera ronda del cuadro: cruce entre zonas (1°A vs 4°B, 2°B vs
          // 3°A, 1°B vs 4°A, 2°A vs 3°B) — misma función que usa el cuadro
          // público para proyectar, así nunca se desalinean.
          pares = primeraRonda(pool, size).pares;
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
      if (yaCargadosNoFinalizados(yaCargados)) {
        const filas = [...yaCargados].sort((a, b) => (a.llave ?? 0) - (b.llave ?? 0));
        return { estado: 'esperando-resultados', pool, size, rondaEsperada: instancia, filas };
      }
    }
    return { estado: 'completo', pool, size };
  };
  const yaCargadosNoFinalizados = (rows) => rows.some(p => p.estado !== 'finalizado');

  // Equipos que YA juegan playoff en OTRA copa de esta temporada — si el
  // armado manual mete a uno de esos en esta copa, se avisa antes de guardar
  // (un mismo equipo no debería jugar dos copas a la vez).
  const ocupadosEnOtrasCopas = (cupKey) => {
    const m = {};
    for (const p of partidosPlayoff) {
      if (p.copa === cupKey) continue;
      const label = CUPS.find(c => c.key === p.copa)?.label ?? p.copa;
      m[p.equipo_local_id] = label;
      m[p.equipo_visit_id] = label;
    }
    return m;
  };

  const avisoConflictos = (cup, idsPares) => {
    const ocupados = ocupadosEnOtrasCopas(cup.key);
    const conflictos = idsPares.flat().filter(id => ocupados[id]);
    if (!conflictos.length) return '';
    return '\n\n⚠️ Ojo: ' + conflictos.map(id => `${equipoMap[id]?.name ?? id} ya juega en ${ocupados[id]}`).join(', ') + '.';
  };

  // `idsPares` = [[localId, visitaId], ...] en el orden de las llaves (1, 2, ...)
  // — viene del editor, sea la sugerencia tal cual o armado a mano.
  const generarRonda = async (cup, instancia, idsPares) => {
    const nombresPares = idsPares.map(([a, b], i) => `${i + 1}. ${equipoMap[a]?.name} vs ${equipoMap[b]?.name}`).join('\n');
    const ok = await confirm(
      `¿Generar ${INSTANCIA_LABEL[instancia]} de ${cup.label}?\n\n${nombresPares}${avisoConflictos(cup, idsPares)}\n\nSe van a crear como partidos "pendiente" — cargás el resultado normal (Excel o Partidos) cuando se jueguen.`
    );
    if (!ok) return;
    setGenerando(cup.key);
    try {
      const fechaId = await obtenerOcrearFecha(instancia);
      const rows = idsPares.map(([localId, visitId], i) => ({
        fecha_id: fechaId,
        equipo_local_id: localId,
        equipo_visit_id: visitId,
        estado: 'pendiente',
        es_playoff: true,
        copa: cup.key,
        instancia,
        llave: i + 1,
      }));
      const { error } = await supabase.from(tablas.partidos).insert(rows);
      if (error) throw error;
      flash(`✅ ${INSTANCIA_LABEL[instancia]} de ${cup.label} generada (${rows.length} partido${rows.length > 1 ? 's' : ''})`);
      await cargar();
    } catch (err) {
      flash(`❌ ${err.message}`, false);
    } finally {
      setGenerando(null);
    }
  };

  // Corregir los equipos de una ronda YA generada: solo se tocan los cruces
  // que siguen "pendiente" (los que ya se jugaron quedan bloqueados en el
  // editor). Se mantiene la llave de cada partido — solo cambian los equipos.
  const guardarCorreccion = async (cup, instancia, filas, idsPares) => {
    const cambios = filas
      .map((f, i) => ({ f, nuevo: idsPares[i] }))
      .filter(({ f, nuevo }) => f.estado === 'pendiente' && nuevo &&
        (f.equipo_local_id !== nuevo[0] || f.equipo_visit_id !== nuevo[1]));
    if (!cambios.length) { flash('No hay cambios para guardar.'); setEditando(null); return; }
    const detalle = cambios.map(({ f, nuevo }) =>
      `Cruce ${f.llave}: ${equipoMap[nuevo[0]]?.name} vs ${equipoMap[nuevo[1]]?.name}`).join('\n');
    const ok = await confirm(
      `¿Guardar los cambios en ${INSTANCIA_LABEL[instancia]} de ${cup.label}?\n\n${detalle}${avisoConflictos(cup, cambios.map(c => c.nuevo))}`
    );
    if (!ok) return;
    setGenerando(cup.key);
    try {
      for (const { f, nuevo } of cambios) {
        const { error } = await supabase.from(tablas.partidos)
          .update({ equipo_local_id: nuevo[0], equipo_visit_id: nuevo[1] })
          .eq('id', f.id).eq('estado', 'pendiente');
        if (error) throw error;
      }
      flash(`✅ Cruces de ${INSTANCIA_LABEL[instancia]} de ${cup.label} corregidos (${cambios.length})`);
      setEditando(null);
      await cargar();
    } catch (err) {
      flash(`❌ ${err.message}`, false);
    } finally {
      setGenerando(null);
    }
  };

  // Deshacer una ronda generada que TODAVÍA NO SE JUGÓ (ningún partido
  // finalizado ni en juego): borra esos partidos pendientes y la copa vuelve
  // a mostrar el editor con la sugerencia, para armarla de nuevo. No toca la
  // temporada, la tabla ni ningún partido jugado. Si la fecha de esa
  // instancia (ej. "Cuartos de Final") queda vacía —porque ninguna otra copa
  // la usa— también se borra, para que no quede una jornada vacía en el sitio.
  const deshacerRonda = async (cup, instancia, filas) => {
    if (filas.some(f => f.estado !== 'pendiente')) {
      flash('❌ Esa ronda ya tiene partidos jugados o en juego — se puede corregir, pero no deshacer.', false);
      return;
    }
    const ok = await confirm(
      `¿Deshacer ${INSTANCIA_LABEL[instancia]} de ${cup.label}?\n\nSe borran sus ${filas.length} partido${filas.length > 1 ? 's' : ''} pendiente${filas.length > 1 ? 's' : ''} (todavía no se jugó ninguno) y vas a poder armar los cruces de nuevo. La temporada y la tabla no se tocan.`
    );
    if (!ok) return;
    setGenerando(cup.key);
    try {
      const ids = filas.map(f => f.id);
      const { error } = await supabase.from(tablas.partidos)
        .delete().in('id', ids).eq('estado', 'pendiente').eq('es_playoff', true);
      if (error) throw error;
      for (const fechaId of [...new Set(filas.map(f => f.fecha_id))]) {
        const { count } = await supabase.from(tablas.partidos)
          .select('id', { count: 'exact', head: true }).eq('fecha_id', fechaId);
        if (count === 0) await supabase.from(tablas.fechas).delete().eq('id', fechaId);
      }
      flash(`✅ ${INSTANCIA_LABEL[instancia]} de ${cup.label} deshecha — ya podés armarla de nuevo.`);
      setEditando(null);
      await cargar();
    } catch (err) {
      flash(`❌ ${err.message}`, false);
    } finally {
      setGenerando(null);
    }
  };

  // Etiqueta de cada equipo para el editor: "1°A", "7°B"... (o el puesto en
  // la tabla general si no hay zonas). Y la lista de equipos que se pueden
  // arrastrar: todos los que jugaron esta temporada, sin importar a qué copa
  // clasificaron — el organizador puede pasar un equipo de copa si quiere.
  const { etiquetaPorId, bancoPorZona } = useMemo(() => {
    const jugaron = equipos.filter(e => e.pj > 0);
    const base = jugaron.length ? jugaron : equipos;
    const etiquetas = {};
    const grupos = [];
    const zonas = [...new Set(base.map(e => e.zona).filter(Boolean))].sort();
    if (zonas.length) {
      for (const z of zonas) {
        const lista = sortByStandings(base.filter(e => e.zona === z));
        lista.forEach((e, i) => { etiquetas[e.id] = `${i + 1}°${z}`; });
        grupos.push({ titulo: `Zona ${z}`, equipos: lista });
      }
      const sinZona = sortByStandings(base.filter(e => !e.zona));
      if (sinZona.length) grupos.push({ titulo: 'Sin zona', equipos: sinZona });
    } else {
      const lista = sortByStandings(base);
      lista.forEach((e, i) => { etiquetas[e.id] = `${i + 1}°`; });
      grupos.push({ titulo: 'Tabla general', equipos: lista });
    }
    return { etiquetaPorId: etiquetas, bancoPorZona: grupos };
  }, [equipos]);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 1, color: '#EEF2F8', margin: 0 }}>
          🏆 PLAYOFFS — ARMAR CRUCES
        </h2>
        <p style={{ color: '#6B7A99', fontSize: 13, margin: '4px 0 0' }}>
          Arma los cruces de playoff automáticamente según la tabla de posiciones actual de{' '}
          <strong style={{ color: '#F0B429' }}>{temporadaActiva?.nombre ?? 'la temporada activa'}</strong> —
          misma siembra que se ve en el cuadro público (con zonas: 1°A vs 4°B, 2°A vs 3°B y al revés).
          Antes de generar podés reacomodar los cruces a mano arrastrando equipos. Cada ronda siguiente
          se habilita sola cuando la anterior está 100% finalizada.
        </p>
        {/* Pedido de Alvaro: dejar claro que armar o corregir los playoffs no
            "cierra" nada. Generar cruces solo crea partidos de playoff
            pendientes: la temporada sigue activa (eso solo cambia desde
            Temporadas), la tabla de posiciones no se toca (los hooks del sitio
            excluyen es_playoff) y cualquier ronda que todavía no se jugó se
            puede corregir o deshacer y volver a armar las veces que haga falta. */}
        <div style={{
          marginTop: 12, padding: '10px 14px', borderRadius: 10, fontSize: 12.5, lineHeight: 1.55,
          background: 'rgba(34,208,122,.07)', border: '1px solid rgba(34,208,122,.25)', color: '#9FE3C1',
        }}>
          🔒 Armar o corregir los cruces <b>no cierra la temporada</b> ni cambia la tabla de posiciones: la temporada
          sigue en curso hasta que la cambies vos desde <b>Temporadas</b>. Mientras una ronda no se haya jugado,
          podés <b>corregir</b> sus cruces o <b>deshacerla</b> y volver a armarla.
        </div>
        {regularesSinJugar > 0 && (
          <div style={{
            marginTop: 10, padding: '10px 14px', borderRadius: 10, fontSize: 12.5, lineHeight: 1.55,
            background: 'rgba(240,180,41,.07)', border: '1px solid rgba(240,180,41,.3)', color: '#F0B429',
          }}>
            ⚠️ Todavía hay {regularesSinJugar} partido{regularesSinJugar === 1 ? '' : 's'} de temporada regular sin
            resultado — la tabla (y por lo tanto la sugerencia de cruces) puede cambiar cuando se carguen.
          </div>
        )}
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

                {/* Corregir una ronda ya generada (mientras sus cruces sigan
                    pendientes) — por si se generó con un error. */}
                {info.estado === 'esperando-resultados' && info.filas?.some(f => f.estado === 'pendiente') && (
                  editando === cup.key ? (
                    <div style={{ marginTop: 14 }}>
                      <EditorCruces
                        key={`edit-${cup.key}-${info.rondaEsperada}-${info.filas.map(f => f.id).join('-')}`}
                        instancia={info.rondaEsperada}
                        inicial={info.filas.map(f => [f.equipo_local_id, f.equipo_visit_id])}
                        bloqueadas={info.filas.map(f => f.estado !== 'pendiente')}
                        textoReset="↺ Deshacer cambios"
                        textoConfirmar="💾 GUARDAR CAMBIOS"
                        accent={cup.color}
                        equipoMap={equipoMap}
                        etiquetaPorId={etiquetaPorId}
                        bancoPorZona={bancoPorZona}
                        ocupados={ocupadosEnOtrasCopas(cup.key)}
                        ocupado={generando === cup.key}
                        onConfirmar={ids => guardarCorreccion(cup, info.rondaEsperada, info.filas, ids)}
                        onCancelar={() => setEditando(null)}
                      />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button onClick={() => setEditando(cup.key)} style={btnSecundario}>
                        ✏️ Corregir cruces de {INSTANCIA_LABEL[info.rondaEsperada]}
                      </button>
                      {info.filas.every(f => f.estado === 'pendiente') && (
                        <button onClick={() => deshacerRonda(cup, info.rondaEsperada, info.filas)}
                          disabled={generando === cup.key}
                          style={{ ...btnSecundario, color: '#F08098', borderColor: 'rgba(240,64,96,.35)' }}>
                          ↩️ Deshacer {INSTANCIA_LABEL[info.rondaEsperada]}
                        </button>
                      )}
                    </div>
                  )
                )}

                {info.estado === 'completo' && (
                  <p style={{ color: '#22D07A', fontSize: 13, margin: 0 }}>
                    ✅ Cuadro completo — la Final ya se jugó. Revisá el resultado en el cuadro público.
                  </p>
                )}

                {/* Ronda lista para generar: arranca con la sugerencia
                    automática y se puede reacomodar a mano arrastrando. */}
                {info.estado === 'lista' && (
                  <EditorCruces
                    key={`new-${cup.key}-${info.siguienteRonda}-${info.pares.map(([a, b]) => `${a.id}:${b.id}`).join('|')}`}
                    instancia={info.siguienteRonda}
                    inicial={info.pares.map(([a, b]) => [a.id, b.id])}
                    textoReset="↺ Volver a la sugerencia"
                    textoConfirmar={`🏆 GENERAR ${INSTANCIA_LABEL[info.siguienteRonda]?.toUpperCase()}`}
                    accent={cup.color}
                    equipoMap={equipoMap}
                    etiquetaPorId={etiquetaPorId}
                    bancoPorZona={bancoPorZona}
                    ocupados={ocupadosEnOtrasCopas(cup.key)}
                    ocupado={generando === cup.key}
                    onConfirmar={ids => generarRonda(cup, info.siguienteRonda, ids)}
                  />
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

const btnSecundario = {
  marginTop: 12, padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
  background: 'transparent', border: '1px solid #2A3650', color: '#CBD5E8',
  fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: .5,
};

// A qué ronda va el ganador de cada cruce — se muestra en el editor para que
// quien arma a mano sepa cómo se encadena el cuadro (cuartos 1-2 → Semi 1,
// 3-4 → Semi 2; semis → Final). Es el mismo encadenamiento que usan el
// cuadro público y la generación automática de la ronda siguiente.
function destinoGanador(instancia, i) {
  if (instancia === 'cuartos') return i < 2 ? 'Semi 1' : 'Semi 2';
  if (instancia === 'semifinal') return 'Final';
  return null;
}

// Color del equipo para degradés — solo si es un hex #RRGGBB (se le
// concatena el alfa, igual que en las tarjetas del sitio).
function colorEquipo(t) {
  return /^#[0-9a-f]{6}$/i.test(t?.color ?? '') ? t.color : '#5A6B85';
}

// Escudo redondo con anillo y resplandor del color del equipo — mismo
// tratamiento que los escudos del cuadro público (PlayoffsBracket).
function EscudoEquipo({ t, size }) {
  const c = colorEquipo(t);
  const estilo = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0, objectFit: 'cover',
    border: `2px solid ${c}`, boxShadow: `0 0 10px ${c}59`, background: '#0B111C',
  };
  if (!t?.logo) {
    return (
      <span style={{ ...estilo, display: 'grid', placeItems: 'center', color: c,
        fontFamily: "'Bebas Neue',sans-serif", fontSize: size * 0.45 }}>
        {(t?.name ?? '?').slice(0, 1)}
      </span>
    );
  }
  return <img src={t.logo} alt="" draggable={false} style={estilo} onError={e => { e.currentTarget.style.visibility = 'hidden'; }} />;
}

// ─── Editor de cruces (arrastrar y soltar) ───────────────────────────────────
// Pedido de Alvaro: poder armar o corregir los cruces de playoff a mano desde
// el panel, por si la sugerencia automática tiene un error o el organizador
// quiere usar otro criterio.
//
// - Arranca con `inicial` (la sugerencia automática, o los cruces ya
//   generados si se está corrigiendo) y se puede reacomodar:
//     · arrastrando un equipo de la lista de la derecha a un casillero,
//     · arrastrando de un casillero a otro (intercambia los dos),
//     · o sin arrastrar (celular/tablet): tocar un equipo y después tocar el
//       casillero donde va.
// - Se puede usar CUALQUIER equipo de la categoría, aunque haya clasificado a
//   otra copa. Si ya juega en otra copa, se marca y se avisa antes de guardar.
// - `bloqueadas[i] = true` deja fijo ese cruce (ya se jugó).
// - Trabaja con ids; `onConfirmar` recibe [[localId, visitaId], ...] en el
//   orden de las llaves.
function EditorCruces({
  instancia, inicial, bloqueadas = [], textoReset, textoConfirmar, accent,
  equipoMap, etiquetaPorId, bancoPorZona, ocupados = {}, ocupado, onConfirmar, onCancelar,
}) {
  const [draft, setDraft] = useState(() => inicial.map(p => [p[0] ?? null, p[1] ?? null]));
  const [sel, setSel] = useState(null);     // { tipo:'banco', id } | { tipo:'slot', i, s }
  const [sobre, setSobre] = useState(null); // casillero bajo el cursor mientras se arrastra ("i-s")

  const bloqueado = i => !!bloqueadas[i];
  const ubicacion = useMemo(() => {
    const m = {};
    draft.forEach((par, i) => par.forEach((id, s) => { if (id) m[id] = { i, s }; }));
    return m;
  }, [draft]);

  const mover = (origen, destino) => {
    if (!origen || bloqueado(destino.i)) return;
    setDraft(prev => {
      const next = prev.map(p => [...p]);
      if (origen.tipo === 'slot') {
        if (bloqueado(origen.i)) return prev;
        const tmp = next[origen.i][origen.s];
        next[origen.i][origen.s] = next[destino.i][destino.s];
        next[destino.i][destino.s] = tmp;
        return next;
      }
      // Desde la lista: si el equipo ya estaba en otro casillero, se
      // intercambia con el de destino (así nunca queda repetido).
      const donde = prev.flatMap((p, i) => p.map((id, s) => (id === origen.id ? { i, s } : null))).find(Boolean);
      if (donde) {
        if (bloqueado(donde.i)) return prev;
        next[donde.i][donde.s] = next[destino.i][destino.s];
      }
      next[destino.i][destino.s] = origen.id;
      return next;
    });
  };

  const quitar = (i, s) => {
    if (bloqueado(i)) return;
    setDraft(prev => prev.map((p, k) => (k === i ? p.map((id, t) => (t === s ? null : id)) : p)));
  };
  const invertir = i => {
    if (bloqueado(i)) return;
    setDraft(prev => prev.map((p, k) => (k === i ? [p[1], p[0]] : p)));
  };
  const resetear = () => { setDraft(inicial.map(p => [p[0] ?? null, p[1] ?? null])); setSel(null); };

  // Arrastrar y soltar (escritorio)
  const onDragStart = origen => e => {
    e.dataTransfer.setData('text/plain', JSON.stringify(origen));
    e.dataTransfer.effectAllowed = 'move';
  };
  const leerOrigen = e => { try { return JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return null; } };
  const onDropSlot = (i, s) => e => { e.preventDefault(); setSobre(null); mover(leerOrigen(e), { i, s }); setSel(null); };
  const onDropBanco = e => {
    e.preventDefault();
    const o = leerOrigen(e);
    if (o?.tipo === 'slot') quitar(o.i, o.s);
  };

  // Tocar y tocar (celular)
  const tocarSlot = (i, s) => {
    if (sel) {
      if (!(sel.tipo === 'slot' && sel.i === i && sel.s === s)) mover(sel, { i, s });
      setSel(null);
    } else if (draft[i][s] && !bloqueado(i)) {
      setSel({ tipo: 'slot', i, s });
    }
  };
  const tocarEquipo = id => {
    setSel(prev => (prev?.tipo === 'banco' && prev.id === id ? null : { tipo: 'banco', id }));
  };

  const vacios = draft.some(p => !p[0] || !p[1]);
  const conflictos = draft.flat().filter(id => id && ocupados[id]);
  const cambio = JSON.stringify(draft) !== JSON.stringify(inicial.map(p => [p[0] ?? null, p[1] ?? null]));

  // Función de render (no componente): si fuera <Casillero/> definido acá
  // adentro, cada re-render (p.ej. al pasar por arriba arrastrando) lo
  // desmontaría y volvería a montar, y el navegador cancela el arrastre
  // cuando desaparece el elemento que se está arrastrando.
  const casillero = (i, s) => {
    const id = draft[i][s];
    const t = id ? equipoMap[id] : null;
    const c = colorEquipo(t);
    const lock = bloqueado(i);
    const visita = s === 1;
    const seleccionado = sel?.tipo === 'slot' && sel.i === i && sel.s === s;
    const destino = sobre === `${i}-${s}` || (sel && !lock && !seleccionado);
    const comunes = {
      key: `${i}-${s}`,
      draggable: !!id && !lock,
      onDragStart: onDragStart({ tipo: 'slot', i, s }),
      onDragOver: e => { if (!lock) { e.preventDefault(); setSobre(`${i}-${s}`); } },
      onDragLeave: () => setSobre(null),
      onDrop: onDropSlot(i, s),
      onClick: () => !lock && tocarSlot(i, s),
    };

    if (!t) {
      return (
        <div {...comunes} className="pe-slot" style={{
          flex: 1, minWidth: 0, minHeight: 54, borderRadius: 10, cursor: lock ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          border: `1.5px dashed ${destino ? accent : '#2A3650'}`,
          background: destino ? `${accent}14` : 'rgba(8,12,18,.6)',
          color: destino ? accent : '#4A566E', fontSize: 12.5,
        }}>
          <span style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px dashed currentColor', opacity: .6 }} />
          {visita ? 'Visitante' : 'Local'} · soltá un equipo acá
        </div>
      );
    }

    return (
      <div {...comunes} className={`pe-slot${visita ? ' pe-slot-v' : ''}`} style={{
        flex: 1, minWidth: 0, minHeight: 54, borderRadius: 10, padding: '8px 10px',
        display: 'flex', flexDirection: visita ? 'row-reverse' : 'row', alignItems: 'center', gap: 10,
        cursor: lock ? 'not-allowed' : 'grab',
        background: `linear-gradient(${visita ? 260 : 100}deg, ${c}33, #0B111C 72%)`,
        border: `1px solid ${seleccionado || destino ? accent : `${c}55`}`,
        boxShadow: seleccionado ? `0 0 0 2px ${accent}55` : destino ? `0 0 0 1px ${accent}55` : 'none',
        opacity: lock ? 0.6 : 1,
      }}>
        <EscudoEquipo t={t} size={32} />
        <div className="pe-slot-txt" style={{ minWidth: 0, flex: 1, textAlign: visita ? 'right' : 'left' }}>
          <div style={{
            fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 15.5, color: '#EEF2F8',
            lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {t.name}{ocupados[id] && <span title={`Ya juega en ${ocupados[id]}`} style={{ fontSize: 12, marginLeft: 5 }}>⚠️</span>}
          </div>
          <div style={{ marginTop: 3, display: 'flex', gap: 5, justifyContent: visita ? 'flex-end' : 'flex-start', alignItems: 'center' }}>
            <span style={{
              fontSize: 10.5, fontWeight: 700, color: c, background: `${c}1f`, border: `1px solid ${c}40`,
              borderRadius: 100, padding: '1px 7px', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: .5,
            }}>{etiquetaPorId[id] ?? '—'}</span>
            <span style={{ fontSize: 10, color: '#4A566E', fontWeight: 700, letterSpacing: 1 }}>{visita ? 'VISITANTE' : 'LOCAL'}</span>
          </div>
        </div>
        {!lock && (
          <button className="pe-x" onClick={e => { e.stopPropagation(); quitar(i, s); }} title="Sacar del cruce"
            style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', padding: 0,
              background: 'rgba(8,12,18,.7)', border: '1px solid #2A3650', color: '#6B7A99', fontSize: 11, lineHeight: '20px',
            }}>✕</button>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Hover y ajustes de celular (los estilos inline no pueden :hover ni @media). */}
      <style>{`
        .pe-chip { transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease; }
        .pe-chip:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,0,0,.35); }
        .pe-chip:active { cursor: grabbing; }
        .pe-slot { transition: border-color .12s ease, box-shadow .12s ease, background .12s ease; }
        .pe-x:hover { color: #F04060 !important; border-color: #F0406088 !important; }
        .pe-lv:hover { color: ${accent} !important; border-color: ${accent}88 !important; }
        .pe-lv-corto { display: none; }
        @media (max-width: 560px) {
          .pe-row { flex-direction: column; align-items: stretch !important; }
          .pe-row .pe-vs { align-self: center; margin: -4px 0; }
          .pe-slot-v { flex-direction: row !important; }
          .pe-lv-largo { display: none; }
          .pe-lv-corto { display: inline; }
          .pe-slot-v .pe-slot-txt { text-align: left !important; }
          .pe-slot-v .pe-slot-txt > div:last-child { justify-content: flex-start !important; }
        }
      `}</style>

      <p style={{ color: '#6B7A99', fontSize: 12.5, margin: '0 0 14px', lineHeight: 1.5 }}>
        Arrastrá un equipo a un casillero (o tocá el equipo y después el casillero). Entre dos casilleros se intercambian.
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Cruces — mismo lenguaje visual que las tarjetas de partido del
            sitio: borde y fondo con degradé de los colores de los dos equipos. */}
        <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {draft.map((par, i) => {
            const cL = colorEquipo(equipoMap[par[0]]);
            const cV = colorEquipo(equipoMap[par[1]]);
            const destinoTxt = destinoGanador(instancia, i);
            return (
              <div key={i} style={{ padding: 1, borderRadius: 14, background: `linear-gradient(115deg, ${cL}55, #1C2535 40%, ${cV}55)` }}>
                <div style={{ borderRadius: 13, padding: '10px 12px 12px', background: `linear-gradient(135deg, ${cL}1a, #0B111C 45%, ${cV}1a)` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, letterSpacing: 1.5, color: '#EEF2F8', whiteSpace: 'nowrap' }}>
                      Cruce {i + 1}
                    </span>
                    {destinoTxt && (
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, letterSpacing: .8, textTransform: 'uppercase',
                        color: accent, background: `${accent}14`, border: `1px solid ${accent}33`, borderRadius: 100, padding: '2px 9px', whiteSpace: 'nowrap',
                        fontFamily: "'Barlow Condensed',sans-serif",
                      }}>Ganador → {destinoTxt}</span>
                    )}
                    {bloqueado(i) && (
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, color: '#22D07A', background: 'rgba(34,208,122,.1)',
                        border: '1px solid rgba(34,208,122,.3)', borderRadius: 100, padding: '2px 9px',
                      }}>✓ Ya jugado</span>
                    )}
                    {!bloqueado(i) && (
                      <button className="pe-lv" onClick={() => invertir(i)} title="Invertir local / visitante"
                        style={{
                          marginLeft: 'auto', background: 'rgba(8,12,18,.6)', border: '1px solid #2A3650', borderRadius: 100,
                          color: '#8899BB', cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: '3px 10px',
                          fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: .5, whiteSpace: 'nowrap',
                        }}>
                        ⇄ <span className="pe-lv-largo">Local / Visitante</span><span className="pe-lv-corto">L/V</span>
                      </button>
                    )}
                  </div>
                  <div className="pe-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {casillero(i, 0)}
                    <span className="pe-vs" style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center',
                      background: '#080C12', border: '1px solid #2A3650', color: '#8899BB',
                      fontFamily: "'Bebas Neue',sans-serif", fontSize: 13, letterSpacing: 1,
                    }}>VS</span>
                    {casillero(i, 1)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Equipos para arrastrar */}
        <div onDragOver={e => e.preventDefault()} onDrop={onDropBanco}
          onClick={e => { if (e.target === e.currentTarget && sel?.tipo === 'slot') { quitar(sel.i, sel.s); setSel(null); } }}
          style={{
            flex: '1 1 300px', padding: 14, borderRadius: 14, background: 'linear-gradient(160deg,#101826,#0B111C)',
            border: '1px solid #1C2535', maxHeight: 520, overflowY: 'auto',
          }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 15, letterSpacing: 1.5, color: '#EEF2F8', marginBottom: 2 }}>
            Equipos
          </div>
          <div style={{ fontSize: 11.5, color: '#4A566E', marginBottom: 12 }}>
            Los que ya están en un cruce aparecen atenuados con su número (C1, C2…).
          </div>
          {bancoPorZona.map(g => (
            <div key={g.titulo} style={{ marginBottom: 14 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                fontSize: 10.5, color: '#6B7A99', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
              }}>
                {g.titulo}
                <span style={{ flex: 1, height: 1, background: '#1C2535' }} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {g.equipos.map(t => {
                  const en = ubicacion[t.id];
                  const elegido = sel?.tipo === 'banco' && sel.id === t.id;
                  const c = colorEquipo(t);
                  return (
                    <div key={t.id} className="pe-chip" draggable onDragStart={onDragStart({ tipo: 'banco', id: t.id })}
                      onClick={() => tocarEquipo(t.id)}
                      title={en ? `Está en el cruce ${en.i + 1}` : ocupados[t.id] ? `Ya juega en ${ocupados[t.id]}` : 'Arrastralo a un casillero'}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7, padding: '4px 11px 4px 4px', borderRadius: 100,
                        cursor: 'grab', userSelect: 'none',
                        background: elegido ? `${accent}2e` : `linear-gradient(90deg, ${c}2a, #0E1420 75%)`,
                        border: `1px solid ${elegido ? accent : `${c}50`}`,
                        boxShadow: elegido ? `0 0 0 2px ${accent}44` : 'none',
                        opacity: en && !elegido ? 0.45 : 1,
                      }}>
                      <EscudoEquipo t={t} size={24} />
                      <span style={{ color: c, fontWeight: 700, fontSize: 10.5, fontFamily: "'Barlow Condensed',sans-serif" }}>{etiquetaPorId[t.id]}</span>
                      <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 600, fontSize: 13, color: '#EEF2F8', whiteSpace: 'nowrap' }}>{t.name}</span>
                      {en && (
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: '#0B111C', background: '#8899BB', borderRadius: 100, padding: '0 5px' }}>
                          C{en.i + 1}
                        </span>
                      )}
                      {!en && ocupados[t.id] && <span title={`Ya juega en ${ocupados[t.id]}`} style={{ fontSize: 10 }}>⚠️</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {conflictos.length > 0 && (
        <p style={{ color: '#F0B429', fontSize: 12.5, margin: '10px 0 0' }}>
          ⚠️ {conflictos.map(id => `${equipoMap[id]?.name} ya juega en ${ocupados[id]}`).join(' · ')}
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 14 }}>
        <button onClick={() => onConfirmar(draft)} disabled={ocupado || vacios} style={{
          padding: '10px 18px', borderRadius: 8, border: 'none', cursor: vacios ? 'not-allowed' : 'pointer',
          background: `linear-gradient(135deg, ${accent}, #FF6B2B)`, color: '#080C12',
          fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, letterSpacing: 1,
          opacity: ocupado || vacios ? 0.5 : 1,
        }}>
          {ocupado ? 'Guardando...' : textoConfirmar}
        </button>
        {cambio && <button onClick={resetear} style={{ ...btnSecundario, marginTop: 0 }}>{textoReset}</button>}
        {onCancelar && <button onClick={onCancelar} style={{ ...btnSecundario, marginTop: 0 }}>Cancelar</button>}
        {vacios && <span style={{ color: '#6B7A99', fontSize: 12.5 }}>Completá todos los casilleros para continuar.</span>}
      </div>
    </div>
  );
}
