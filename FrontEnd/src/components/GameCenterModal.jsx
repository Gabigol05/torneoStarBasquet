import { useState, useEffect, useMemo } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';
import { equiposMasculino } from '../data/masculinoData';
import { esPartidoPlayoff, labelInstanciaCorta } from '../lib/fechaLabel';

// Alpha en hex de 2 digitos, concatenado directo al color (igual que en el
// resto de las tarjetas con color de equipo) — evita color-mix()/variables
// CSS con alpha dinamico, que no anda bien en navegadores viejos de celulares.
const hexA = (hex, alpha) => `${hex}${alpha}`;
// Ancho fijo de la columna "#" — necesario para calcular el offset `left`
// de la columna de nombre, que queda pegada justo al lado.
const STICKY_NUM_W = 32;

function Skeleton({ w = '100%', h = 16, radius = 4, style = {} }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'linear-gradient(90deg, #1C2535 25%, #243048 50%, #1C2535 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      ...style,
    }}/>
  );
}

function StatBar({ label, a, b, colorA, colorB }) {
  const total = (a ?? 0) + (b ?? 0);
  const pctA  = total > 0 ? ((a / total) * 100).toFixed(0) : 50;
  const pctB  = 100 - pctA;
  return (
    <div className="gc-stat-row">
      <span className="gc-stat-val-a" style={{ color: colorA }}>{a ?? '-'}</span>
      <div className="gc-stat-center">
        <div className="gc-stat-label">{label}</div>
        <div className="gc-stat-bar-track">
          <div className="gc-stat-bar-a" style={{ width: `${pctA}%`, background: colorA }}/>
          <div className="gc-stat-bar-b" style={{ width: `${pctB}%`, background: colorB }}/>
        </div>
      </div>
      <span className="gc-stat-val-b" style={{ color: colorB }}>{b ?? '-'}</span>
    </div>
  );
}

// ─── Share button ─────────────────────────────────────────────────────────────
// Autocontenido (no depende de addToast) porque GameCenterModal se abre desde
// varios lugares (TorneoView, TeamPageFem) que no siempre pasan el sistema de
// toasts — el feedback de "copiado" vive en el propio botón.
// ─── Resumen del partido (rediseño 23/11): A + B + D ────────────────────────
// A) Evolución del marcador cuarto a cuarto, con ventajas máximas y el
//    cuarto clave. B) Mapa de calor de tiros (TL/2P/3P): más color = mejor %.
// D) Cara a cara: barras enfrentadas, se resalta solo el que ganó el rubro
//    (en pérdidas y faltas gana el que tiene menos).
function LeyendaEquipos({ eqL, eqV }) {
  const cL = eqL?.color ?? '#8899BB', cV = eqV?.color ?? '#8899BB';
  return (
    <div className="rsm-ley">
      <span style={{ color: cL }}><i style={{ background: cL }}/>{eqL?.name ?? 'Local'}</span>
      <span style={{ color: cV }}>{eqV?.name ?? 'Visitante'}<i style={{ background: cV, margin: '0 0 0 6px' }}/></span>
    </div>
  );
}

function EvolucionMarcador({ partido, eqL, eqV }) {
  const cL = eqL?.color ?? '#8899BB', cV = eqV?.color ?? '#F0B429';
  const qs = ['q1', 'q2', 'q3', 'q4'].map(q => [partido[`${q}_local`] ?? 0, partido[`${q}_visit`] ?? 0]);
  if ((partido.ot_local ?? 0) > 0 || (partido.ot_visit ?? 0) > 0) qs.push([partido.ot_local ?? 0, partido.ot_visit ?? 0]);
  if (qs.every(([a, b]) => !a && !b)) return null;
  const etiquetas = ['', 'Q1', 'Q2', 'Q3', 'Q4', 'OT'].slice(0, qs.length + 1);
  const acum = [[0, 0]];
  qs.forEach(([a, b]) => { const [x, y] = acum[acum.length - 1]; acum.push([x + a, y + b]); });
  let maxL = 0, maxV = 0;
  acum.forEach(([a, b]) => { maxL = Math.max(maxL, a - b); maxV = Math.max(maxV, b - a); });
  const dif = qs.map(([a, b]) => Math.abs(a - b));
  const iClave = dif.indexOf(Math.max(...dif));
  const [qa, qb] = qs[iClave];

  const W = 440, H = 232, l = 14, r = 54, t = 20, base = 176;
  const tope = Math.max(...acum.flat(), 10) * 1.08;
  const X = i => l + (i * (W - l - r)) / qs.length;
  const Y = v => base - (v / tope) * (base - t);
  const P = (i, k) => [X(i), Y(acum[i][k])];
  const uid = `${partido.id ?? 'p'}`;

  // Franja entre las dos líneas, pintada con el color del que va ganando
  // (si en un cuarto se dan vuelta, el tramo se corta en el cruce).
  const franjas = [];
  for (let i = 0; i < qs.length; i++) {
    const d0 = acum[i][0] - acum[i][1], d1 = acum[i + 1][0] - acum[i + 1][1];
    const tramo = (u0, u1) => {
      const lerp = (a, b, u) => a + (b - a) * u;
      const pt = (k, u) => [lerp(X(i), X(i + 1), u), Y(lerp(acum[i][k], acum[i + 1][k], u))];
      const [a0, a1, b0, b1] = [pt(0, u0), pt(0, u1), pt(1, u0), pt(1, u1)];
      const dm = lerp(d0, d1, (u0 + u1) / 2);
      if (Math.abs(dm) < 0.01) return null;
      return <polygon key={`${i}-${u0}`} points={`${a0} ${a1} ${b1} ${b0}`} fill={dm > 0 ? cL : cV} opacity=".22"/>;
    };
    if (d0 * d1 < 0) { const u = d0 / (d0 - d1); franjas.push(tramo(0, u), tramo(u, 1)); }
    else franjas.push(tramo(0, 1));
  }
  const linea = k => acum.map((_, i) => `${i ? 'L' : 'M'}${P(i, k)[0].toFixed(1)},${P(i, k)[1].toFixed(1)}`).join(' ');
  const area = k => `${linea(k)} L${X(qs.length)},${base} L${X(0)},${base} Z`;
  const fin = acum[acum.length - 1];
  const ganaL = fin[0] >= fin[1];
  // Etiquetas finales a la derecha, separadas si quedan pegadas.
  let yL = Y(fin[0]), yV = Y(fin[1]);
  if (Math.abs(yL - yV) < 22) { const m = (yL + yV) / 2; if (yL <= yV) { yL = m - 11; yV = m + 11; } else { yL = m + 11; yV = m - 11; } }

  return (
    <div className="rsm-card rsm-evo">
      <svg viewBox={`0 0 ${W} ${H}`} className="rsm-svg" role="img" aria-label="Evolución del marcador por cuarto">
        <defs>
          <linearGradient id={`gL${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={cL} stopOpacity=".28"/><stop offset="1" stopColor={cL} stopOpacity="0"/></linearGradient>
          <linearGradient id={`gV${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={cV} stopOpacity=".28"/><stop offset="1" stopColor={cV} stopOpacity="0"/></linearGradient>
          <filter id={`gl${uid}`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
        </defs>
        {/* fondo de cada cuarto, alternado */}
        {qs.map((_, i) => i % 2 === 0 && (
          <rect key={i} x={X(i)} y={t - 8} width={X(i + 1) - X(i)} height={base - t + 8} fill="rgba(255,255,255,.025)"/>
        ))}
        <line x1={X(0)} x2={X(qs.length)} y1={base} y2={base} stroke="rgba(255,255,255,.12)"/>
        <path d={area(ganaL ? 1 : 0)} fill={`url(#${ganaL ? 'gV' : 'gL'}${uid})`}/>
        <path d={area(ganaL ? 0 : 1)} fill={`url(#${ganaL ? 'gL' : 'gV'}${uid})`}/>
        {franjas}
        {[[0, cL], [1, cV]].map(([k, c]) => (
          <g key={k}>
            <path d={linea(k)} fill="none" stroke={c} strokeWidth="6" opacity=".35" filter={`url(#gl${uid})`}/>
            <path d={linea(k)} fill="none" stroke={c} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
            {acum.map((_, i) => i > 0 && (
              <circle key={i} cx={P(i, k)[0]} cy={P(i, k)[1]} r={i === qs.length ? 5.5 : 3.5} fill={i === qs.length ? c : '#0F1622'} stroke={c} strokeWidth="2.5"/>
            ))}
          </g>
        ))}
        {/* marcador final */}
        <g fontFamily="'Bebas Neue',sans-serif">
          <rect x={X(qs.length) + 10} y={yL - 12} width="38" height="24" rx="7" fill={cL} opacity={ganaL ? 1 : .55}/>
          <text x={X(qs.length) + 29} y={yL + 7} textAnchor="middle" fontSize="19" fill="#0B1018">{fin[0]}</text>
          <rect x={X(qs.length) + 10} y={yV - 12} width="38" height="24" rx="7" fill={cV} opacity={!ganaL ? 1 : .55}/>
          <text x={X(qs.length) + 29} y={yV + 7} textAnchor="middle" fontSize="19" fill="#0B1018">{fin[1]}</text>
        </g>
        {/* parcial de cada cuarto, con el color del que lo ganó */}
        {qs.map(([a, b], i) => {
          const cx = (X(i) + X(i + 1)) / 2;
          const c = a > b ? cL : b > a ? cV : '#8A96AD';
          return (
            <g key={i} fontFamily="'Barlow Condensed',sans-serif" fontWeight="700" textAnchor="middle">
              <text x={cx} y={base + 20} fontSize="11" fill="#6B7A99" letterSpacing="1">{etiquetas[i + 1]}</text>
              <text x={cx} y={base + 40} fontSize="15" fill={c}>{a}-{b}</text>
            </g>
          );
        })}
      </svg>
      <div className="rsm-chips">
        <div className="rsm-chip" style={{ '--c': cL }}>
          <b style={{ color: maxL > 0 ? cL : '#6B7A99' }}>{maxL > 0 ? `+${maxL}` : '0'}</b>
          <small>Mayor ventaja</small><em style={{ color: cL }}>{eqL?.name}</em>
        </div>
        <div className="rsm-chip" style={{ '--c': cV }}>
          <b style={{ color: maxV > 0 ? cV : '#6B7A99' }}>{maxV > 0 ? `+${maxV}` : '0'}</b>
          <small>Mayor ventaja</small><em style={{ color: cV }}>{eqV?.name}</em>
        </div>
        <div className="rsm-chip" style={{ '--c': qa > qb ? cL : qb > qa ? cV : '#8A96AD' }}>
          <b>{etiquetas[iClave + 1]}</b>
          <small>Cuarto clave</small><em style={{ color: qa > qb ? cL : qb > qa ? cV : '#8A96AD' }}>{qa}-{qb}</em>
        </div>
      </div>
    </div>
  );
}

// Celda del mapa de tiros: fondo más intenso cuanto mejor el %, y un
// puntito por cada tiro intentado (lleno = convertido).
function CeldaCalor({ color, pct, conv, int, gana }) {
  const alpha = Math.round(30 + (Math.min(pct, 60) / 60) * 190).toString(16).padStart(2, '0');
  const max = 30;
  const escala = int > max ? max / int : 1;
  const llenos = Math.round(conv * escala), total = Math.round(int * escala);
  return (
    <div className={`rsm-cell${gana ? ' is-gana' : ''}`}
      style={{ background: `linear-gradient(145deg, ${hexA(color, alpha)}, ${hexA(color, '14')})`, borderColor: gana ? hexA(color, 'aa') : undefined }}>
      <div className="rsm-cell-top">
        <b>{pct}<small>%</small></b>
        {int > 0 && <span>{conv} de {int}</span>}
      </div>
      {total > 0 && (
        <div className="rsm-dots" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => <i key={i} className={i < llenos ? 'on' : ''}/>)}
        </div>
      )}
    </div>
  );
}

function MapaCalorTiros({ data }) {
  const { partido, eqLocal: eqL, eqVisit: eqV, statsLocal, statsVisit } = data;
  const cL = eqL?.color ?? '#8899BB', cV = eqV?.color ?? '#F0B429';
  const suma = (rows, k) => (rows ?? []).reduce((a, r) => a + (r[k] ?? 0), 0);
  const tipos = [
    ['Libres', 'TL', 1, 'sc', 'sf', 'pct_simples'],
    ['Dobles', '2P', 2, 'dc', 'df', 'pct_dobles'],
    ['Triples', '3P', 3, 'tc', 'tf', 'pct_triples'],
  ].map(([nom, lbl, val, c, f, pk]) => {
    const lado = (rows, pctGuardado) => {
      const conv = suma(rows, c), int = conv + suma(rows, f);
      return { conv, int, pts: conv * val, pct: int > 0 ? Math.round((conv / int) * 100) : Math.round(Number(pctGuardado) || 0) };
    };
    return { nom, lbl, val, a: lado(statsLocal, partido[`${pk}_local`]), b: lado(statsVisit, partido[`${pk}_visit`]) };
  });
  if (tipos.every(t => !t.a.pct && !t.b.pct && !t.a.int && !t.b.int)) return null;
  return (
    <div className="rsm-card">
      <div className="rsm-heat">
        <span/>
        <span className="rsm-heat-h" style={{ color: cL }}>{eqL?.name}</span>
        <span className="rsm-heat-h" style={{ color: cV }}>{eqV?.name}</span>
        {tipos.map(t => [
          <span key={t.lbl + 'r'} className="rsm-heat-r"><b>{t.lbl}</b><small>×{t.val}</small></span>,
          <CeldaCalor key={t.lbl + 'a'} color={cL} {...t.a} gana={t.a.pct > t.b.pct}/>,
          <CeldaCalor key={t.lbl + 'b'} color={cV} {...t.b} gana={t.b.pct > t.a.pct}/>,
        ])}
      </div>
    </div>
  );
}

function CaraACara({ data }) {
  const { eqLocal: eqL, eqVisit: eqV, statsLocal, statsVisit } = data;
  const cL = eqL?.color ?? '#8899BB', cV = eqV?.color ?? '#F0B429';
  const sL = k => (statsLocal ?? []).reduce((a, r) => a + (r[k] ?? 0), 0);
  const sV = k => (statsVisit ?? []).reduce((a, r) => a + (r[k] ?? 0), 0);
  const rubros = [
    ['Rebotes', sL('rd') + sL('ro'), sV('rd') + sV('ro')],
    ['Asistencias', sL('as_'), sV('as_')],
    ['Robos', sL('rb'), sV('rb')],
    ['Tapones', sL('tp'), sV('tp')],
    ['Pérdidas', sL('pe'), sV('pe'), true],
    ['Faltas', sL('fp'), sV('fp'), true],
  ];
  const filas = rubros.map(([lbl, a, b, menos]) => {
    const ganaL = menos ? a < b : a > b, ganaV = menos ? b < a : b > a;
    const mx = Math.max(a, b, 1);
    return (
      <div key={lbl} className="rsm-mr">
        <span className="rsm-n" style={ganaL ? { color: cL } : undefined}>{a}</span>
        <span className="rsm-b rsm-b--izq"><i style={{ width: `${(a / mx) * 100}%`, background: cL, opacity: ganaL ? 1 : .35 }}/></span>
        <span className="rsm-l">{lbl}</span>
        <span className="rsm-b"><i style={{ width: `${(b / mx) * 100}%`, background: cV, opacity: ganaV ? 1 : .35 }}/></span>
        <span className="rsm-n" style={ganaV ? { color: cV } : undefined}>{b}</span>
      </div>
    );
  });
  return (
    <div className="rsm-card">
      <div className="rsm-mar">{filas}</div>
    </div>
  );
}

function ShareMatchButton({ data, partidoId, mode }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async (e) => {
    e.stopPropagation();
    const { partido, eqLocal, eqVisit } = data;
    const url = `${window.location.origin}${window.location.pathname}?partido=${partidoId}&modo=${mode}`;
    const text = `🏀 ${eqLocal?.name} ${partido.puntos_local} - ${partido.puntos_visit} ${eqVisit?.name}\nTorneo Star Básquet 2026`;
    if (navigator.share) {
      try { await navigator.share({ title: `${eqLocal?.name} vs ${eqVisit?.name} — Star Básquet`, text, url }); }
      catch (_) {}
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank', 'noopener');
  };

  return (
    <button onClick={handleShare} title="Compartir partido" style={{
      position: 'absolute', top: 16, right: 16, zIndex: 10,
      display: 'flex', alignItems: 'center', gap: 6,
      height: 36, padding: copied ? '0 12px' : 0, width: copied ? 'auto' : 36,
      borderRadius: 18,
      background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)',
      justifyContent: 'center',
      color: copied ? '#7fe0a3' : '#EEF2F8', cursor: 'pointer',
      fontFamily: "'Barlow Condensed',sans-serif", fontSize: 13, fontWeight: 700,
      transition: 'width .2s, color .2s',
    }}>
      {copied ? '✓ Copiado' : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
      )}
    </button>
  );
}

export function GameCenterModal({ isOpen, onClose, partidoId, mode }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab,     setTab]     = useState('resumen');
  // Orden de la tabla de estadisticas por partido: null = orden original
  // (que ya viene por PTS descendente desde `enrich`). Se resetea cada vez
  // que se abre un partido nuevo, mas abajo.
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState(1);

  const esMasc       = mode === 'masculino';
  const roster       = esMasc ? equiposMasculino : equiposFemenino;
  const tablaPartido = esMasc ? 'partidos_masculino' : 'partidos_femenino';
  const tablaStats   = esMasc ? 'stats_partido_masculino' : 'stats_partido_femenino';
  const idField      = esMasc ? 'jugador_id' : 'jugadora_id';

  useEffect(() => {
    if (!isOpen) return;
    setTab('resumen');
    setData(null);
    setSortKey(null);
    setSortDir(1);
    if (!isConfigured || !partidoId) return;

    let ignore = false;
    setLoading(true);
    // Los nombres de jugador/a vienen de la base para las dos categorías
    // (jugadores_masculino / jugadoras_femenino) — femenino usaba antes un
    // roster fijo en el código (data/femeninoData.js), pero ese archivo ya
    // no trae planteles, así que el nombre siempre se resuelve en vivo.
    const tablaJugadores = esMasc ? 'jugadores_masculino' : 'jugadoras_femenino';
    const queries = [
      supabase.from(tablaPartido).select('*').eq('id', partidoId).single(),
      supabase.from(tablaStats).select('*').eq('partido_id', partidoId),
      supabase.from(tablaJugadores).select('id,nombre'),
    ];

    Promise.all(queries).then(([{ data: partido }, { data: stats }, { data: jugadoresRows }]) => {
      if (ignore) return;
      if (!partido) { setLoading(false); return; }

      const eqLocal = roster.find(e => e.id === partido.equipo_local_id);
      const eqVisit = roster.find(e => e.id === partido.equipo_visit_id);

      const nombrePorId = Object.fromEntries((jugadoresRows ?? []).map(j => [j.id, j.nombre]));
      const resolverNombre = (r) => nombrePorId[r[idField]] ?? r[idField];

      const enrich = (rows, eqId) =>
        (rows ?? [])
          .filter(r => r.equipo_id === eqId)
          .map(r => ({ ...r, jugadora_id: r[idField], nombre: resolverNombre(r) }))
          .sort((a, b) => b.pts - a.pts);

      const statsLocal = enrich(stats, partido.equipo_local_id);
      const statsVisit = enrich(stats, partido.equipo_visit_id);

      // MVP: leido directamente desde mvp_jugadora_id/mvp_jugador_id (definido por
      // el organizador), NO recalculado por valoracion.
      let mvpRow = null, mvpNombre = null;
      const mvpJugId = partido.mvp_jugadora_id ?? partido.mvp_jugador_id;
      if (mvpJugId) {
        mvpRow = (stats ?? []).find(r => r[idField] === mvpJugId) ?? null;
        mvpNombre = nombrePorId[mvpJugId] ?? null;
      }

      setData({ partido, eqLocal, eqVisit, statsLocal, statsVisit, mvpRow, mvpNombre });
      setLoading(false);
    }).catch(() => { if (!ignore) setLoading(false); });

    return () => { ignore = true; };
  }, [isOpen, partidoId, mode]);

  // ⚠️ Accesibilidad: cerrar con Escape (antes solo se podía con el click
  // afuera o el botón ✕ — no funcionaba nada con el teclado).
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = e => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Columnas ordenables de la tabla de estadisticas — 'sc'/'dc'/'tc' son los
  // convertidos de TL/2P/3P (lo que se ve en pantalla es "convertidos/intentados",
  // pero para ordenar tiene mas sentido comparar por lo que realmente metio).
  const statCols = [
    { key: 'pts', lbl: 'PTS' }, { key: 'val', lbl: 'VAL' },
    { key: 'sc',  lbl: 'TL'  }, { key: 'dc',  lbl: '2P'  }, { key: 'tc', lbl: '3P' },
    { key: 'rd',  lbl: 'RD'  }, { key: 'ro',  lbl: 'RO'  }, { key: 'as_', lbl: 'AS' },
    { key: 'rb',  lbl: 'ROB' }, { key: 'tp',  lbl: 'TAP' }, { key: 'pe', lbl: 'PER' },
    { key: 'fp',  lbl: 'FP'  },
  ];

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => -d);
    } else {
      setSortKey(key);
      setSortDir(1);
    }
  };

  const rowsActivas = tab === 'local' ? data?.statsLocal : data?.statsVisit;
  const sortedRows = useMemo(() => {
    if (!rowsActivas) return [];
    if (!sortKey) return rowsActivas;
    const copy = [...rowsActivas];
    copy.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (typeof av === 'string') return sortDir * av.localeCompare(bv ?? '');
      return sortDir * ((bv ?? 0) - (av ?? 0));
    });
    return copy;
  }, [rowsActivas, sortKey, sortDir]);

  if (!isOpen) return null;

  return (
    <div className="gc-overlay" onClick={onClose}
      style={{ backdropFilter: 'blur(6px)', background: 'rgba(3,5,10,.72)', animation: 'gcFadeIn .25s ease' }}>
      <div className="gc-modal" onClick={e => e.stopPropagation()}
        style={{ animation: 'gcPopIn .25s ease', boxShadow: '0 30px 90px rgba(0,0,0,.6)', border: '1px solid rgba(255,255,255,.1)', position: 'relative' }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, left: 16, zIndex: 10,
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#EEF2F8', cursor: 'pointer', padding: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>

        {!loading && data && <ShareMatchButton data={data} partidoId={partidoId} mode={mode} />}

        {loading && (
          <div style={{ padding: '2rem' }}>
            <Skeleton h={24} style={{ marginBottom: 20 }}/>
            <Skeleton h={80} radius={12} style={{ marginBottom: 16 }}/>
            <Skeleton h={16} style={{ marginBottom: 10 }}/>
            <Skeleton h={16} w="80%" style={{ marginBottom: 10 }}/>
            <Skeleton h={16} w="60%" />
          </div>
        )}

        {!loading && data && (
          <>
            <div className="gc-header" style={{
              background: `linear-gradient(120deg, ${hexA(data.eqLocal?.color ?? '#8899BB', '40')}, #1C2535 45%, ${hexA(data.eqVisit?.color ?? '#8899BB', '40')})`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{
                  fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 11, letterSpacing: 1.5,
                  color: '#7fe0a3', background: 'rgba(127,224,163,.12)', padding: '4px 12px', borderRadius: 100,
                  textTransform: 'uppercase',
                }}>
                  Final
                </span>
                <span style={{ color: 'var(--gray)', fontFamily: "'Barlow Condensed'", fontWeight: 600, letterSpacing: '2px', fontSize: '12px' }}>
                  {esMasc ? 'TORNEO MASCULINO' : 'TORNEO FEMENINO'}
                </span>
                {esPartidoPlayoff(data.partido) && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 11, letterSpacing: 1,
                    color: '#F0B429', background: 'rgba(240,180,41,.14)', border: '1px solid rgba(240,180,41,.4)',
                    padding: '4px 10px', borderRadius: 100, textTransform: 'uppercase',
                  }}>
                    🏆 {labelInstanciaCorta(data.partido)}
                  </span>
                )}
              </div>

              {(() => {
                const p = data.partido, eL = data.eqLocal, eV = data.eqVisit;
                const cLh = eL?.color ?? '#8899BB', cVh = eV?.color ?? '#8899BB';
                const gL = (p.puntos_local ?? 0) > (p.puntos_visit ?? 0), gV = (p.puntos_visit ?? 0) > (p.puntos_local ?? 0);
                const cuartos = ['q1', 'q2', 'q3', 'q4'].map(q => [q.toUpperCase(), p[`${q}_local`] ?? 0, p[`${q}_visit`] ?? 0]);
                if ((p.ot_local ?? 0) > 0 || (p.ot_visit ?? 0) > 0) cuartos.push(['OT', p.ot_local ?? 0, p.ot_visit ?? 0]);
                const esc = (eq, c, g) => (
                  <span className="rx-escudo" style={{ borderColor: c, boxShadow: g ? `0 0 18px ${hexA(c, '80')}` : 'none', opacity: g ? 1 : .7 }}>
                    {eq?.logo && <img src={eq.logo} alt={eq.name}/>}
                  </span>
                );
                return (
                  <div className="gc-tv">
                    <div className="rx-main">
                      <div className={`rx-lado${gL ? ' is-gano' : ''}`}><span className="rx-nombre">{eL?.name}</span>{esc(eL, cLh, !gV)}</div>
                      <div className="rx-marcador">
                        <span className="rx-pts" style={gL ? { color: cLh } : undefined}>{p.puntos_local}</span>
                        <span className="rx-guion">-</span>
                        <span className="rx-pts" style={gV ? { color: cVh } : undefined}>{p.puntos_visit}</span>
                      </div>
                      <div className={`rx-lado rx-lado--v${gV ? ' is-gano' : ''}`}>{esc(eV, cVh, !gL)}<span className="rx-nombre">{eV?.name}</span></div>
                    </div>
                    {p.q1_local != null && (
                      <div className="rx-cuartos">
                        {cuartos.map(([l, x, y]) => (
                          <span key={l} className={`rx-q${l === 'OT' ? ' is-ot' : ''}`}>
                            <small>{l}</small>
                            <b className={x > y ? '' : 'is-pierde'} style={x > y ? { color: cLh } : undefined}>{x}</b>
                            <i>-</i>
                            <b className={y > x ? '' : 'is-pierde'} style={y > x ? { color: cVh } : undefined}>{y}</b>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {data.mvpNombre && (
              <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(240,180,41,.08)', border:'1px solid rgba(240,180,41,.28)', borderRadius:12, padding:'12px 16px', margin:'20px 0' }}>
                <span style={{ fontSize:20 }}>*</span>
                <div>
                  <div style={{ fontSize:10, color:'#F0B429', fontFamily:"'Barlow Condensed'", fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>MVP del Partido</div>
                  <div style={{ fontSize:15, color:'#EEF2F8', fontFamily:"'Barlow Condensed'", fontWeight:700 }}>{data.mvpNombre}</div>
                </div>
                <div style={{ marginLeft:'auto', fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:'#F0B429' }}>
                  VAL {data.mvpRow?.val ?? 0}
                </div>
              </div>
            )}

            <div style={{ display:'flex', gap:6, marginBottom:20, borderBottom: '1px solid rgba(255,255,255,.08)', paddingBottom: 2 }}>
              {[
                ['resumen', 'Resumen', '#F0B429'],
                ['local', data.eqLocal?.name ?? 'Local', data.eqLocal?.color ?? '#F0B429'],
                ['visit', data.eqVisit?.name ?? 'Visit', data.eqVisit?.color ?? '#F0B429'],
              ].map(([k,l,c]) => (
                <button key={k} onClick={() => setTab(k)}
                  style={{ flex:1, padding:'9px 4px', background:'transparent',
                    border:'none', borderBottom: tab===k ? `2px solid ${c}` : '2px solid transparent',
                    color:tab===k?c:'#6b7a99', cursor:'pointer', fontSize:12.5, fontWeight: 700,
                    fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1, textTransform: 'uppercase' }}>
                  {l}
                </button>
              ))}
            </div>

            {tab === 'resumen' && (
              <div className="rsm">
                <div className="rsm-h"><h4>Cómo fue el partido</h4></div>
                <EvolucionMarcador partido={data.partido} eqL={data.eqLocal} eqV={data.eqVisit}/>
                <div className="rsm-h"><h4>Tiros</h4></div>
                <MapaCalorTiros data={data}/>
                <div className="rsm-h"><h4>Cara a cara</h4></div>
                <CaraACara data={data}/>
              </div>
            )}

            {(tab === 'local' || tab === 'visit') && (() => {
              const eqActivo = tab === 'local' ? data.eqLocal : data.eqVisit;
              const cAct = eqActivo?.color ?? '#8899BB';
              const SortArrow = ({ col }) => {
                const active = sortKey === col;
                return (
                  <span style={{ marginLeft: 3, fontSize: 8, display:'inline-block',
                    opacity: active ? 1 : 0.35, color: active ? '#F0B429' : 'inherit', transition: 'opacity .15s' }}>
                    {active && sortDir === -1 ? '▲' : '▼'}
                  </span>
                );
              };
              return (
              <>
              {sortKey && (
                <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:6 }}>
                  <button onClick={() => { setSortKey(null); setSortDir(1); }} style={{
                    display:'flex', alignItems:'center', gap:6,
                    background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)',
                    color:'#8899BB', fontFamily:"'Barlow Condensed',sans-serif", fontSize:11.5, fontWeight:700,
                    letterSpacing:.5, padding:'5px 10px', borderRadius:6, cursor:'pointer',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/>
                    </svg>
                    Orden original
                  </button>
                </div>
              )}
              <div className="scrollbar-accent" style={{ overflowX:'auto', padding: 1, borderRadius: 10,
                background: `linear-gradient(160deg, ${hexA(cAct, '35')}, #1C2535 60%)` }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, borderRadius: 9, overflow: 'hidden' }}>
                  <thead>
                    <tr>
                      {/* '#' y nombre quedan fijos (sticky) al scrollear horizontal — en
                          una tabla de 14 columnas, sin esto se pierde de vista quién es
                          quién apenas se desliza para ver el resto de las stats. */}
                      <th style={{ position:'sticky', left:0, zIndex:2, background:'#141C2A', color:'#8899AA', padding:'6px 8px', textAlign:'center', fontSize:10, whiteSpace:'nowrap', width:STICKY_NUM_W }}>#</th>
                      <th onClick={() => handleSort('nombre')} style={{ position:'sticky', left:STICKY_NUM_W, zIndex:2, background:'#141C2A', color: sortKey==='nombre' ? '#F0B429' : '#8899AA', padding:'6px 8px', textAlign:'left', fontSize:10, whiteSpace:'nowrap', boxShadow:'2px 0 4px rgba(0,0,0,.25)', cursor:'pointer' }}>
                        {esMasc ? 'Jugador' : 'Jugadora'}<SortArrow col="nombre"/>
                      </th>
                      {statCols.map(c => (
                        <th key={c.key} onClick={() => handleSort(c.key)} style={{ background: hexA(cAct, '1f'), color: sortKey===c.key ? '#F0B429' : '#8899AA', padding:'6px 8px', textAlign:'center', fontSize:10, whiteSpace:'nowrap', cursor:'pointer' }}>
                          {c.lbl}<SortArrow col={c.key}/>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((r, i) => {
                      const eq = eqActivo;
                      const rowBg = i%2===0 ? '#141C2A' : '#0E1420';
                      return (
                        <tr key={r.jugadora_id} style={{ background: `linear-gradient(90deg, ${hexA(cAct, i%2===0 ? '14' : '0a')}, #0B111C 60%)` }}>
                          <td style={{ position:'sticky', left:0, zIndex:1, background:rowBg, padding:'6px 8px', textAlign:'center', color:'#6B7A99', width:STICKY_NUM_W }}>{r.numero ?? '-'}</td>
                          <td style={{ position:'sticky', left:STICKY_NUM_W, zIndex:1, background:rowBg, boxShadow:'2px 0 4px rgba(0,0,0,.25)', padding:'6px 8px', textAlign:'left', color: eq?.color, fontWeight:600, minWidth:120, whiteSpace:'nowrap' }}>
                            {r.nombre.split(' ').slice(0,2).join(' ')}
                          </td>
                          <td style={{ padding:'6px 8px', textAlign:'center', color:'#F0B429', fontWeight:700, fontFamily:"'Bebas Neue',sans-serif", fontSize:16 }}>{r.pts}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', color: r.val >= 0 ? '#22D07A':'#F04060', fontFamily:"'Bebas Neue',sans-serif", fontSize:14 }}>{r.val}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.sc}/{r.sc + r.sf}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.dc}/{r.dc + r.df}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.tc}/{r.tc + r.tf}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.rd}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.ro}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.as_}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.rb}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.tp}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.pe}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.fp}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
              );
            })()}
          </>
        )}

        {!loading && !data && (
          <div style={{ padding:'3rem', textAlign:'center', color:'#6B7A99' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>-</div>
            <div>Estadisticas no disponibles para este partido</div>
          </div>
        )}
      </div>
    </div>
  );
}



