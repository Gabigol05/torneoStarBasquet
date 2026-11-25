import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TABLAS } from './categoriaAdmin';
import { equiposFemenino } from '../data/femeninoData';
import { equiposMasculino } from '../data/masculinoData';
import { useTemporada } from '../context/TemporadaContext';
import { ordenarTabla } from '../components/TablaPosiciones.jsx';
import './resumen.css';

// ═══════════════════════════════════════════════════════════════════════════
// Resumen del panel (v2, pedido de Alvaro): datos clave, gráfico por fecha,
// estado de playoffs por copa, próximos/últimos partidos con acciones,
// encuesta activa, líderes y tabla por zona — mismo lenguaje que la web.
// ═══════════════════════════════════════════════════════════════════════════

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const COPAS = [
  { key: 'oro', label: 'Copa de Oro', color: '#F0B429' },
  { key: 'plata', label: 'Copa de Plata', color: '#C7D1DD' },
  { key: 'bronce', label: 'Copa de Bronce', color: '#CD7F32' },
];
const RONDAS = [
  { key: 'cuartos', label: 'Cuartos', total: 4 },
  { key: 'semifinal', label: 'Semis', total: 2 },
  { key: 'final', label: 'Final', total: 1 },
];
const INST = { cuartos: 'Cuartos', semifinal: 'Semi', final: 'Final', tercer_puesto: '3er puesto' };
const COPA_CORTA = { oro: 'Oro', plata: 'Plata', bronce: 'Bronce' };
const LIDERES = [
  { key: 'pts', label: 'Puntos', color: '#F0B429' },
  { key: 'reb', label: 'Rebotes', color: '#60A5FA' },
  { key: 'ast', label: 'Asistencias', color: '#22D07A' },
];

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function parseISO(iso) {
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}
const ddmm = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
const diaTxt = d => `${DIAS[d.getDay()]} ${ddmm(d)}`;
const hora = p => (p?.hora_inicio ? String(p.hora_inicio).slice(0, 5) : null);
const fmt1 = n => (Number.isInteger(n) ? String(n) : Number(n).toFixed(1));

function lunesDe(iso) {
  const d = parseISO(iso); const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function traerTodo(build) {
  const out = []; const paso = 1000;
  for (let desde = 0; desde < 50000; desde += paso) {
    const { data, error } = await build().range(desde, desde + paso - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < paso) break;
  }
  return out;
}

// ── Piezas ──────────────────────────────────────────────────────────────────
function Escudo({ eq, size = 28 }) {
  return (
    <span className="rs2-esc" style={{ width: size, height: size, borderColor: eq?.color ?? '#4A566E' }}>
      {eq?.logo ? <img src={eq.logo} alt="" loading="lazy" decoding="async"/> : <i>{(eq?.nombre ?? '?').slice(0, 2)}</i>}
    </span>
  );
}

function Card({ titulo, color, extra, children, className = '' }) {
  return (
    <section className={`rs2-card ${className}`} style={{ '--a': color }}>
      <header className="rs2-ct">
        <b><i/>{titulo}</b>
        {extra}
      </header>
      {children}
    </section>
  );
}

function Link({ children, onClick }) {
  return <button type="button" className="rs2-lk" onClick={onClick}>{children} →</button>;
}

function GraficoFechas({ filas }) {
  const [hover, setHover] = useState(null);
  const caja = useRef(null);
  const [ancho, setAncho] = useState(900);
  useEffect(() => {
    const el = caja.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => setAncho(Math.max(300, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [filas.length]);
  if (!filas.length) return <p className="rs2-vacio">Todavía no hay fechas cargadas.</p>;
  const W = ancho, H = W < 600 ? 200 : 240, pl = 26, pr = 34, pt = 18, pb = 26;
  const iw = W - pl - pr, ih = H - pt - pb, n = filas.length, bw = iw / n;
  const maxP = Math.max(4, ...filas.map(f => f.total));
  const escala = maxP <= 6 ? 2 : 4;
  const tope = Math.ceil(maxP / escala) * escala;
  const proms = filas.filter(f => f.prom != null).map(f => f.prom);
  const pMin = proms.length ? Math.floor((Math.min(...proms) - 10) / 10) * 10 : 0;
  const pMax = proms.length ? Math.ceil((Math.max(...proms) + 10) / 10) * 10 : 100;
  const yP = v => pt + ih - ((v - pMin) / Math.max(1, pMax - pMin)) * ih;
  const puntos = filas.map((f, i) => (f.prom != null ? [pl + i * bw + bw / 2, yP(f.prom)] : null)).filter(Boolean);
  const linea = puntos.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const ticks = [];
  for (let t = 0; t <= tope; t += escala) ticks.push(t);
  const h = hover != null ? filas[hover] : null;
  return (
    <div className="rs2-graf" ref={caja}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ height: H }} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="rs2-oro" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F0B429"/><stop offset="1" stopColor="#b9770e"/>
          </linearGradient>
        </defs>
        {ticks.map(t => {
          const y = pt + ih - (t / tope) * ih;
          return <g key={t}><line x1={pl} x2={W - pr} y1={y} y2={y} className="rs2-gl"/><text x={pl - 8} y={y + 4} textAnchor="end">{t}</text></g>;
        })}
        {proms.length > 0 && [pMin, (pMin + pMax) / 2, pMax].map(v => (
          <text key={v} x={W - pr + 8} y={yP(v) + 4} className="rs2-tp">{Math.round(v)}</text>
        ))}
        {filas.map((f, i) => {
          const x = pl + i * bw + bw * 0.2, w = bw * 0.6;
          const ht = (f.total / tope) * ih, hj = (f.jugados / tope) * ih;
          return (
            <g key={f.key} onMouseEnter={() => setHover(i)} className={hover === i ? 'is-h' : ''}>
              <rect x={pl + i * bw} y={pt} width={bw} height={ih} fill="transparent"/>
              <rect x={x} y={pt + ih - ht} width={w} height={ht} rx="5" className="rs2-bt"/>
              {f.jugados > 0 && <rect x={x} y={pt + ih - hj} width={w} height={hj} rx="5" fill="url(#rs2-oro)"/>}
              {f.proxima && <text x={x + w / 2} y={pt + ih - ht - 6} textAnchor="middle" className="rs2-tx-prox">Próx.</text>}
              {(bw >= 34 || i % 2 === 0 || f.proxima || i === n - 1) && (
                <text x={x + w / 2} y={H - 8} textAnchor="middle" className={f.proxima ? 'rs2-tx-prox' : ''}>{f.label}</text>
              )}
            </g>
          );
        })}
        {linea && <path d={linea} className="rs2-lp"/>}
        {puntos.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.5" className="rs2-cp"/>)}
      </svg>
      {h && (
        <div className="rs2-tip">
          <b>{h.nombre}</b>
          <span>{h.jugados}/{h.total} jugados</span>
          {h.prom != null && <span>{fmt1(h.prom)} pts por partido</span>}
        </div>
      )}
    </div>
  );
}

function FilaPartido({ p, eqL, eqV, jugado, sub, accion }) {
  const pl = p.puntos_local ?? 0, pv = p.puntos_visit ?? 0;
  return (
    <div className="rs2-mt">
      <div className="rs2-tm"><Escudo eq={eqL}/><span>{eqL?.nombre ?? 'Por definir'}</span></div>
      <div className="rs2-mid">
        {jugado
          ? <><b><span className={pl > pv ? 'w' : 'l'}>{pl}</span> - <span className={pv > pl ? 'w' : 'l'}>{pv}</span></b><small>Final</small></>
          : <><b>{hora(p) ?? '—'}</b><small>{sub}</small></>}
      </div>
      <div className="rs2-tm v"><Escudo eq={eqV}/><span>{eqV?.nombre ?? 'Por definir'}</span></div>
      <div className="rs2-tag">{accion}</div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export default function ResumenV2({ categoria, onNavigate, irACargarPartido, greeting }) {
  const T = TABLAS[categoria] ?? TABLAS.femenino;
  const lista = categoria === 'masculino' ? equiposMasculino : equiposFemenino;
  const { temporadaActivaId, temporadas } = useTemporada();
  const [temporadaSel, setTemporadaSel] = useState({});
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [modoLid, setModoLid] = useState('prom');
  const [zona, setZona] = useState(null);

  const tempsCat = useMemo(() => [...(temporadas ?? [])].filter(t => t.categoria === categoria).sort((a, b) => b.id - a.id), [temporadas, categoria]);
  const temporadaId = temporadaSel[categoria] ?? temporadaActivaId?.[categoria] ?? tempsCat[0]?.id ?? null;
  const temporada = tempsCat.find(t => t.id === temporadaId);

  useEffect(() => {
    if (temporadaId == null) return undefined;
    let cancelado = false;
    (async () => {
      setCargando(true); setError(null);
      try {
        const { data: fechas, error: fe } = await supabase.from(T.fechas).select('*').eq('temporada_id', temporadaId).order('numero', { ascending: true });
        if (fe) throw fe;
        const ids = (fechas ?? []).map(f => f.id);
        const [partidos, estad, jugadores, eqRows, encs] = await Promise.all([
          ids.length ? traerTodo(() => supabase.from(T.partidos).select('*').in('fecha_id', ids).order('id', { ascending: true })) : [],
          traerTodo(() => supabase.from(T.estadisticas).select('*').eq('temporada_id', temporadaId).order(T.jugadorIdField, { ascending: true })),
          traerTodo(() => supabase.from(T.jugadores).select('id,nombre,equipo_id').order('id', { ascending: true })),
          supabase.from(T.equipos).select('id,zona').then(r => r.data ?? []),
          supabase.from('encuestas').select('*').eq('activa', true).order('creado_en', { ascending: false }).limit(10).then(r => r.data ?? []),
        ]);
        const jugadosIds = partidos.filter(p => p.estado === 'finalizado').map(p => p.id);
        const conPlanilla = new Set();
        for (let i = 0; i < jugadosIds.length; i += 150) {
          const tanda = jugadosIds.slice(i, i + 150);
          const filas = await traerTodo(() => supabase.from(T.stats).select('partido_id').in('partido_id', tanda).order('partido_id', { ascending: true }));
          filas.forEach(r => conPlanilla.add(r.partido_id));
        }
        const enc = encs.find(e => (e.categoria == null || e.categoria === categoria || e.categoria === 'general')
          && (e.temporada_id == null || e.temporada_id === temporadaId)) ?? null;
        let encRes = [];
        if (enc) {
          const { data: r } = await supabase.from('v_encuesta_resultados').select('*').eq('encuesta_id', enc.id).order('orden');
          encRes = r ?? [];
        }
        if (!cancelado) setData({ fechas: fechas ?? [], partidos, estad, jugadores, eqRows, conPlanilla, enc, encRes });
      } catch (e) {
        if (!cancelado) setError(e.message ?? String(e));
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => { cancelado = true; };
  }, [temporadaId, categoria, T]);

  const info = useMemo(() => {
    if (!data) return null;
    const { fechas, partidos, estad, jugadores, eqRows, conPlanilla, enc, encRes } = data;
    const hoy = hoyISO();
    const zonaDe = Object.fromEntries(eqRows.map(r => [r.id, r.zona]));
    const eqMap = Object.fromEntries(lista.map(e => [e.id, { id: e.id, nombre: e.name ?? e.nombre, color: e.color, logo: e.logo, zona: zonaDe[e.id] ?? null }]));
    const fechaMap = Object.fromEntries(fechas.map(f => [f.id, f]));
    const dia = p => p.fecha_partido ?? fechaMap[p.fecha_id]?.fecha_dia ?? null;
    const jugMap = Object.fromEntries(jugadores.map(j => [j.id, j]));
    const jugados = partidos.filter(p => p.estado === 'finalizado');
    const pendientes = partidos.filter(p => p.estado !== 'finalizado');
    const total = partidos.length;
    const lunes = lunesDe(hoy);
    const estaSemana = jugados.filter(p => { const d = dia(p); return d && d >= lunes && d <= hoy; }).length;
    const ptsDe = p => (p.puntos_local ?? 0) + (p.puntos_visit ?? 0);

    // Por fecha (temporada regular) + playoffs juntos
    const filas = fechas.map(f => {
      const ps = partidos.filter(p => p.fecha_id === f.id && !p.es_playoff);
      const j = ps.filter(p => p.estado === 'finalizado');
      return { key: `f${f.id}`, label: `F${f.numero}`, nombre: (f.descripcion || '').trim() || `Fecha ${f.numero}`, total: ps.length, jugados: j.length,
        prom: j.length ? j.reduce((s, p) => s + ptsDe(p), 0) / j.length : null, fecha: f };
    }).filter(f => f.total > 0);
    const po = partidos.filter(p => p.es_playoff);
    if (po.length) {
      const j = po.filter(p => p.estado === 'finalizado');
      filas.push({ key: 'po', label: 'PO', nombre: 'Playoffs', total: po.length, jugados: j.length, prom: j.length ? j.reduce((s, p) => s + ptsDe(p), 0) / j.length : null });
    }
    const idxProx = filas.findIndex(f => f.jugados < f.total);
    if (idxProx >= 0) filas[idxProx].proxima = true;
    const prox = idxProx >= 0 ? filas[idxProx] : null;
    let proxInfo = null;
    if (prox) {
      const ps = prox.key === 'po' ? po.filter(p => p.estado !== 'finalizado') : partidos.filter(p => p.fecha_id === prox.fecha.id && p.estado !== 'finalizado');
      const dias = ps.map(dia).filter(Boolean).sort();
      const d = parseISO(dias[0] ?? prox.fecha?.fecha_dia);
      const enDias = d ? Math.round((d - parseISO(hoy)) / 86400000) : null;
      proxInfo = { label: prox.label, nombre: prox.nombre, d, enDias, cant: ps.length, sinHora: ps.filter(p => !hora(p)).length, avance: prox.jugados / prox.total };
    }
    const conPts = filas.filter(f => f.prom != null);
    const promGeneral = jugados.length ? jugados.reduce((s, p) => s + ptsDe(p), 0) / jugados.length : null;
    const ultimoProm = conPts[conPts.length - 1]?.prom ?? null;
    const anteProm = conPts[conPts.length - 2]?.prom ?? null;
    const record = jugados.reduce((m, p) => (ptsDe(p) > (m?.pts ?? -1) ? { pts: ptsDe(p), p } : m), null);
    const recordLbl = record ? (record.p.es_playoff ? `${COPA_CORTA[record.p.copa] ?? ''} ${INST[record.p.instancia] ?? 'PO'}` : `F${fechaMap[record.p.fecha_id]?.numero ?? '?'}`) : null;

    // Para revisar
    const sinPlanilla = jugados.filter(p => !conPlanilla.has(p.id));
    const sinMvp = jugados.filter(p => conPlanilla.has(p.id) && !p[T.mvpField]);
    const sinHora = pendientes.filter(p => dia(p) && !hora(p));
    const sinFecha = pendientes.filter(p => !dia(p));

    const etiqueta = p => (p.es_playoff ? `${COPA_CORTA[p.copa] ?? ''} ${INST[p.instancia] ?? 'Playoffs'}${p.llave && p.instancia !== 'final' ? ` ${p.llave}` : ''}` : `Fecha ${fechaMap[p.fecha_id]?.numero ?? '?'}`).trim();
    const ordProx = p => `${dia(p) ?? '9999'} ${hora(p) ?? '99:99'}`;
    const proximos = [...pendientes].sort((a, b) => ordProx(a).localeCompare(ordProx(b))).slice(0, 3);
    const ordUlt = p => `${dia(p) ?? '0000'} ${hora(p) ?? '00:00'} ${String(p.id).padStart(8, '0')}`;
    const ultimos = [...jugados].sort((a, b) => ordUlt(b).localeCompare(ordUlt(a))).slice(0, 3);

    // Playoffs por copa
    const copas = COPAS.map(c => {
      const pc = po.filter(p => p.copa === c.key);
      if (!pc.length) return { ...c, estado: 'Sin cruces cargados', rondas: [] };
      const primera = RONDAS.findIndex(r => pc.some(p => p.instancia === r.key));
      const rondas = RONDAS.slice(Math.max(0, primera)).map(r => {
        const ps = pc.filter(p => p.instancia === r.key);
        const total2 = Math.max(r.total, ps.length);
        return { ...r, jugados: ps.filter(p => p.estado === 'finalizado').length, total: total2 };
      });
      const act = rondas.find(r => r.jugados < r.total);
      rondas.forEach(r => { r.estado = r.jugados >= r.total ? 'ok' : r === act ? 'now' : ''; });
      const finalP = pc.find(p => p.instancia === 'final' && p.estado === 'finalizado');
      let estado;
      if (finalP) {
        const g = (finalP.puntos_local ?? 0) > (finalP.puntos_visit ?? 0) ? finalP.equipo_local_id : finalP.equipo_visit_id;
        estado = `Campeón: ${eqMap[g]?.nombre ?? '—'}`;
      } else if (act) {
        const pend = pc.filter(p => p.instancia === act.key && p.estado !== 'finalizado').map(dia).filter(Boolean).sort()[0];
        const d = parseISO(pend);
        estado = `${act.label} ${act.jugados}/${act.total}${d ? ` · ${diaTxt(d)}` : ''}`;
      }
      return { ...c, estado, rondas };
    });
    const hayPlayoffs = po.length > 0;
    const regularCompleta = filas.filter(f => f.key !== 'po').every(f => f.jugados >= f.total);

    // Líderes
    const idF = T.jugadorIdField;
    const lideres = Object.fromEntries(LIDERES.map(l => {
      const key = `${l.key}_${modoLid}`;
      const rows = estad.filter(r => (r[key] ?? 0) > 0)
        .sort((a, b) => (b[key] ?? 0) - (a[key] ?? 0)).slice(0, 5)
        .map(r => { const j = jugMap[r[idF]]; return { nombre: j?.nombre ?? '—', eq: eqMap[j?.equipo_id], v: r[key] ?? 0 }; });
      return [l.key, rows];
    }));

    // Tabla por zona (temporada regular)
    const fila = {};
    const reg = jugados.filter(p => !p.es_playoff).sort((a, b) => (fechaMap[a.fecha_id]?.numero ?? 0) - (fechaMap[b.fecha_id]?.numero ?? 0));
    for (const p of reg) {
      const pl = p.puntos_local ?? 0, pv = p.puntos_visit ?? 0;
      for (const [id, a, b] of [[p.equipo_local_id, pl, pv], [p.equipo_visit_id, pv, pl]]) {
        const f = (fila[id] ??= { id, pg: 0, pp: 0, pf: 0, pc: 0, forma: [] });
        f.pf += a; f.pc += b; if (a > b) f.pg++; else f.pp++;
        f.forma.push(a > b ? 'G' : 'P');
      }
    }
    const zonas = [...new Set(Object.keys(fila).map(id => eqMap[id]?.zona ?? '-'))].sort();

    // Encuesta
    const totVotos = encRes.reduce((s, r) => s + Number(r.votos || 0), 0);
    const encuesta = enc ? {
      pregunta: enc.pregunta, total: totVotos,
      opciones: [...encRes].sort((a, b) => Number(b.votos) - Number(a.votos)).slice(0, 4)
        .map(r => ({ texto: r.texto, pct: totVotos ? Math.round((Number(r.votos) / totVotos) * 100) : 0 })),
    } : null;

    return { eqMap, total, jugadosN: jugados.length, pendientesN: pendientes.length, estaSemana, filas, proxInfo,
      promGeneral, ultimoProm, anteProm, record, recordLbl, sinPlanilla, sinMvp, sinHora, sinFecha,
      proximos, ultimos, etiqueta, dia, conPlanilla, jugMap, copas, hayPlayoffs, regularCompleta, lideres, fila, zonas, encuesta };
  }, [data, lista, modoLid, T]);

  const zonaSel = zona && info?.zonas.includes(zona) ? zona : info?.zonas[0];
  const tabla = info ? ordenarTabla(Object.values(info.fila).filter(f => (info.eqMap[f.id]?.zona ?? '-') === zonaSel)).slice(0, 6) : [];
  const nZona = info ? Object.values(info.fila).filter(f => (info.eqMap[f.id]?.zona ?? '-') === zonaSel).length : 0;
  const corte = Math.ceil(nZona / 3);
  const copaPos = i => (i < corte ? '#F0B429' : i < corte * 2 ? '#C7D1DD' : '#CD7F32');

  const fase = info ? (info.hayPlayoffs ? 'Playoffs en juego' : info.regularCompleta && info.total ? 'Temporada regular terminada' : 'Temporada regular') : '';
  const pct = info?.total ? Math.round((info.jugadosN / info.total) * 100) : 0;
  const revisar = info ? [
    { n: info.sinPlanilla.length, txt: 'jugados sin planilla', tipo: 'r', ir: 'excel' },
    { n: info.sinMvp.length, txt: 'jugados sin MVP', tipo: 'w', ir: 'partidos' },
    { n: info.sinHora.length, txt: 'pendientes sin hora', tipo: 'w', ir: 'partidos' },
    { n: info.sinFecha.length, txt: 'pendientes sin fecha', tipo: 'w', ir: 'partidos' },
  ].filter(r => r.n > 0) : [];
  const delta = info?.ultimoProm != null && info?.anteProm != null ? info.ultimoProm - info.anteProm : null;

  return (
    <div className="rs2">
      <div className="rs2-ph">
        <div>
          <h1>{greeting || 'Resumen'}</h1>
          <p>Torneo {categoria}{temporada ? ` · ${temporada.nombre}` : ''}{fase && <> · <b>{fase}</b></>}</p>
        </div>
        {tempsCat.length > 0 && (
          <select className="rs2-sel" value={temporadaId ?? ''} onChange={e => setTemporadaSel(s => ({ ...s, [categoria]: Number(e.target.value) }))}>
            {tempsCat.map(t => (
              <option key={t.id} value={t.id}>{t.nombre}{t.id === temporadaActivaId?.[categoria] ? ' · en curso' : ' · archivada'}</option>
            ))}
          </select>
        )}
      </div>

      {error && <div className="rs2-err">No se pudieron traer los datos del resumen: {error}</div>}
      {cargando && !info && <div className="rs2-cargando">Cargando resumen…</div>}

      {info && (
        <div className={cargando ? 'rs2-body is-loading' : 'rs2-body'}>
          {/* ── Datos clave ── */}
          <div className="rs2-g rs2-k4">
            <Card titulo="Partidos jugados" color="#F0B429" extra={<small>{pct}%</small>}>
              <div className="rs2-kv"><span className="n">{info.jugadosN}</span><span className="u">/ {info.total}</span></div>
              <div className="rs2-pb"><i style={{ width: `${pct}%` }}/></div>
              <div className="rs2-ks">
                {info.estaSemana > 0 && <><span className="up">+{info.estaSemana}</span> esta semana · </>}
                {info.pendientesN} por jugar
              </div>
            </Card>
            <Card titulo="Próxima fecha" color="#60A5FA"
              extra={info.proxInfo?.enDias != null && <small>{info.proxInfo.enDias > 1 ? `en ${info.proxInfo.enDias} días` : info.proxInfo.enDias === 1 ? 'mañana' : info.proxInfo.enDias === 0 ? 'hoy' : 'atrasada'}</small>}>
              {info.proxInfo ? (
                <>
                  <div className="rs2-kv"><span className="n">{info.proxInfo.label}</span><span className="u">{info.proxInfo.d ? diaTxt(info.proxInfo.d) : 'sin fecha'}</span></div>
                  <div className="rs2-ks">
                    {info.proxInfo.cant} por jugar
                    {info.proxInfo.sinHora > 0 ? <> · <span className="dn">{info.proxInfo.sinHora} sin hora</span></> : ' · todos con hora'}
                  </div>
                  <div className="rs2-pb" style={{ '--a': '#60A5FA' }}><i style={{ width: `${Math.round(info.proxInfo.avance * 100)}%` }}/></div>
                </>
              ) : <div className="rs2-kv"><span className="n" style={{ fontSize: 30 }}>Todo jugado</span></div>}
            </Card>
            <Card titulo="Puntos por partido" color="#2EE08A" extra={<small>promedio</small>}>
              <div className="rs2-kv"><span className="n">{info.promGeneral != null ? fmt1(Math.round(info.promGeneral * 10) / 10) : '—'}</span><span className="u">pts</span></div>
              <div className="rs2-ks">
                {delta != null && <><span className={delta >= 0 ? 'up' : 'dn'}>{delta >= 0 ? '▲' : '▼'} {fmt1(Math.abs(Math.round(delta * 10) / 10))}</span> vs. fecha anterior</>}
                {info.record && <>{delta != null ? ' · ' : ''}récord {info.record.pts} ({info.recordLbl})</>}
              </div>
            </Card>
            <Card titulo="Para revisar" color={revisar.length ? '#FF6B6B' : '#2EE08A'}>
              {revisar.length ? (
                <div className="rs2-al">
                  {revisar.map(r => (
                    <button key={r.txt} type="button" className={r.tipo} onClick={() => onNavigate?.(r.ir)}>
                      <i>{r.n}</i>{r.n === 1 ? `Partido ${r.txt.replace('jugados', 'jugado').replace('pendientes', 'pendiente')}` : `Partidos ${r.txt}`}
                    </button>
                  ))}
                </div>
              ) : <div className="rs2-ok">✓ Todo en orden</div>}
            </Card>
          </div>

          {/* ── Gráfico + estado del torneo ── */}
          <div className="rs2-g rs2-r2">
            <Card titulo="Partidos por fecha" color="#F0B429" extra={
              <div className="rs2-leg">
                <span><i className="j"/>Jugados</span><span><i className="p"/>Programados</span><span><i className="l"/>Puntos x partido</span>
              </div>}>
              <GraficoFechas filas={info.filas}/>
            </Card>
            <Card titulo="Estado del torneo" color="#F0B429">
              <div className="rs2-fase">
                <span className={info.regularCompleta || info.hayPlayoffs ? 'a' : 'b'}>{info.regularCompleta || info.hayPlayoffs ? '✓ Regular' : '● Regular'}</span>
                <span className="rs2-flecha">→</span>
                <span className={info.hayPlayoffs ? 'b' : ''}>{info.hayPlayoffs ? '● Playoffs' : 'Playoffs'}</span>
              </div>
              <div className="rs2-copas">
                {info.copas.map(c => (
                  <button key={c.key} type="button" className="rs2-cp" style={{ '--k': c.color }} onClick={() => onNavigate?.('playoffs')}>
                    <div className="rs2-cp-h"><b>{c.label}</b><small>{c.estado}</small></div>
                    {c.rondas.length > 0 && (
                      <div className="rs2-rd">
                        {c.rondas.map(r => (
                          <span key={r.key} className={r.estado}>{r.estado === 'ok' ? `✓ ${r.label}` : r.estado === 'now' ? `${r.label} ${r.jugados}/${r.total}` : r.label}</span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* ── Próximos / últimos / encuesta ── */}
          <div className="rs2-g rs2-r3">
            <Card titulo="Próximos partidos" color="#60A5FA" extra={<Link onClick={() => onNavigate?.('partidos')}>Fixture</Link>}>
              <div className="rs2-ml">
                {info.proximos.length === 0 && <p className="rs2-vacio">No hay partidos pendientes.</p>}
                {info.proximos.map(p => {
                  const d = parseISO(info.dia(p));
                  return (
                    <FilaPartido key={p.id} p={p} eqL={info.eqMap[p.equipo_local_id]} eqV={info.eqMap[p.equipo_visit_id]}
                      sub={d ? diaTxt(d) : 'Sin fecha'}
                      accion={<>
                        <span>{p.lugar ? `📍 ${p.lugar} · ` : ''}{info.etiqueta(p)}</span>
                        {d
                          ? <button type="button" className="rs2-btn y" onClick={() => irACargarPartido?.()}>Cargar resultado</button>
                          : <button type="button" className="rs2-btn r" onClick={() => onNavigate?.('partidos')}>Poner fecha</button>}
                      </>}/>
                  );
                })}
              </div>
            </Card>
            <Card titulo="Últimos resultados" color="#2EE08A" extra={<Link onClick={() => onNavigate?.('historial')}>Historial</Link>}>
              <div className="rs2-ml">
                {info.ultimos.length === 0 && <p className="rs2-vacio">Todavía no se jugó ningún partido.</p>}
                {info.ultimos.map(p => {
                  const d = parseISO(info.dia(p));
                  const mvp = info.jugMap[p[T.mvpField]];
                  const planilla = info.conPlanilla.has(p.id);
                  return (
                    <FilaPartido key={p.id} p={p} jugado eqL={info.eqMap[p.equipo_local_id]} eqV={info.eqMap[p.equipo_visit_id]}
                      accion={<>
                        <span>{info.etiqueta(p)}{d ? ` · ${ddmm(d)}` : ''}{mvp ? ` · MVP ${mvp.nombre}` : ''}</span>
                        {planilla
                          ? <span className="rs2-btn g">✓ Planilla</span>
                          : <button type="button" className="rs2-btn r" onClick={() => irACargarPartido?.()}>Falta planilla</button>}
                      </>}/>
                  );
                })}
              </div>
            </Card>
            <Card titulo="Encuesta activa" color="#A78BFA" extra={<Link onClick={() => onNavigate?.('encuestas')}>Encuestas</Link>}>
              {info.encuesta ? (
                <>
                  <div className="rs2-enc-q">{info.encuesta.pregunta}</div>
                  <div className="rs2-ks" style={{ marginTop: 2 }}>{info.encuesta.total} {info.encuesta.total === 1 ? 'voto' : 'votos'}</div>
                  <div className="rs2-enc">
                    {info.encuesta.opciones.map((o, i) => (
                      <div key={i}>
                        <div className="rs2-enc-r"><span>{o.texto}</span><b>{o.pct}%</b></div>
                        <div className="rs2-pb" style={{ '--a': '#A78BFA', opacity: 1 - i * 0.18 }}><i style={{ width: `${o.pct}%` }}/></div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rs2-vacio-c">
                  <p>No hay ninguna encuesta activa.</p>
                  <button type="button" className="rs2-btn y" onClick={() => onNavigate?.('encuestas')}>+ Crear encuesta</button>
                </div>
              )}
            </Card>
          </div>

          {/* ── Líderes + tabla ── */}
          <div className="rs2-g rs2-r4">
            <Card titulo="Líderes" color="#F0B429" extra={
              <div className="rs2-seg">
                <button type="button" className={modoLid === 'prom' ? 'on' : ''} onClick={() => setModoLid('prom')}>Promedio</button>
                <button type="button" className={modoLid === 'total' ? 'on' : ''} onClick={() => setModoLid('total')}>Total</button>
              </div>}>
              <div className="rs2-ld">
                {LIDERES.map(l => {
                  const rows = info.lideres[l.key];
                  const top = rows[0]?.v || 1;
                  return (
                    <div key={l.key} className="rs2-lc" style={{ '--a': l.color }}>
                      <h5><span>{l.label}</span><span className="m">{modoLid === 'prom' ? 'x PJ' : 'total'}</span></h5>
                      {rows.length === 0 && <p className="rs2-vacio">Sin datos</p>}
                      {rows.map((r, i) => (
                        <div key={i} className="rs2-lr">
                          <span className={`p${i === 0 ? ' t' : ''}`}>{i + 1}</span>
                          <Escudo eq={r.eq} size={24}/>
                          <span className="nm"><b>{r.nombre}</b><i><u style={{ width: `${(r.v / top) * 100}%` }}/></i></span>
                          <span className="v">{fmt1(Math.round(r.v * 10) / 10)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card titulo="Tabla" color="#60A5FA" extra={info.zonas.length > 1 && (
              <div className="rs2-zt">
                {info.zonas.map(z => (
                  <button key={z} type="button" className={z === zonaSel ? 'on' : ''} onClick={() => setZona(z)}>{z === '-' ? 'General' : `Zona ${z}`}</button>
                ))}
              </div>)}>
              {tabla.length === 0 ? <p className="rs2-vacio">Todavía no hay partidos de temporada regular.</p> : (
                <table className="rs2-tb">
                  <thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>G-P</th><th>Dif</th><th>Últimos 5</th></tr></thead>
                  <tbody>
                    {tabla.map((f, i) => {
                      const eq = info.eqMap[f.id];
                      const dif = f.pf - f.pc;
                      return (
                        <tr key={f.id}>
                          <td><span className="pos" style={{ '--k': copaPos(i) }}>{i + 1}</span></td>
                          <td><span className="t"><Escudo eq={eq} size={24}/><span>{eq?.nombre ?? '—'}</span></span></td>
                          <td>{f.pg + f.pp}</td>
                          <td>{f.pg}-{f.pp}</td>
                          <td className={dif >= 0 ? 'mas' : 'menos'}>{dif > 0 ? '+' : ''}{dif}</td>
                          <td><span className="fm">{f.forma.slice(-5).map((x, k) => <i key={k} className={x === 'G' ? 'g' : 'p'}>{x}</i>)}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
