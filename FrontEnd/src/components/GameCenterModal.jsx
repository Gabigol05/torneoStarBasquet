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
  const etiquetas = ['Inicio', 'Q1', 'Q2', 'Q3', 'Q4', 'OT'].slice(0, qs.length + 1);
  const acum = [[0, 0]];
  qs.forEach(([a, b]) => { const [x, y] = acum[acum.length - 1]; acum.push([x + a, y + b]); });
  let maxL = 0, maxV = 0;
  acum.forEach(([a, b]) => { maxL = Math.max(maxL, a - b); maxV = Math.max(maxV, b - a); });
  const dif = qs.map(([a, b]) => Math.abs(a - b));
  const iClave = dif.indexOf(Math.max(...dif));
  const W = 420, H = 196, l = 30, r = 14, t = 18, base = 164;
  const tope = Math.max(...acum.flat(), 10) * 1.1;
  const X = i => l + (i * (W - l - r)) / qs.length;
  const Y = v => base - (v / tope) * (base - t);
  const linea = k => acum.map((p, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(p[k]).toFixed(1)}`).join(' ');
  const paso = tope > 60 ? 20 : 10;
  const ticks = []; for (let v = 0; v <= tope; v += paso) ticks.push(v);
  const fin = acum[acum.length - 1];
  return (
    <div className="rsm-card">
      <LeyendaEquipos eqL={eqL} eqV={eqV}/>
      <svg viewBox={`0 0 ${W} ${H}`} className="rsm-svg" role="img" aria-label="Evolución del marcador por cuarto">
        {ticks.map(v => (
          <g key={v}>
            <line x1={l} x2={W - r} y1={Y(v)} y2={Y(v)} stroke="rgba(255,255,255,.06)"/>
            <text x={l - 8} y={Y(v) + 4} textAnchor="end" fontSize="11" fill="#5C6880" fontFamily="'Barlow Condensed',sans-serif">{v}</text>
          </g>
        ))}
        {acum.slice(1, -1).map((_, i) => (
          <line key={i} x1={X(i + 1)} x2={X(i + 1)} y1={t} y2={base} stroke="rgba(255,255,255,.05)" strokeDasharray="3 4"/>
        ))}
        <path d={linea(0)} fill="none" stroke={cL} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
        <path d={linea(1)} fill="none" stroke={cV} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
        {acum.map((p, i) => (
          <g key={i}>
            <circle cx={X(i)} cy={Y(p[0])} r="4" fill={cL}/>
            <circle cx={X(i)} cy={Y(p[1])} r="4" fill={cV}/>
          </g>
        ))}
        <text x={X(qs.length) - 6} y={Y(Math.max(...fin)) - 9} textAnchor="end" fontFamily="'Bebas Neue',sans-serif" fontSize="18"
          fill={fin[0] >= fin[1] ? cL : cV}>{Math.max(...fin)}</text>
        <text x={X(qs.length) - 6} y={Y(Math.min(...fin)) + 20} textAnchor="end" fontFamily="'Bebas Neue',sans-serif" fontSize="18"
          fill={fin[0] >= fin[1] ? cV : cL}>{Math.min(...fin)}</text>
        {etiquetas.map((e, i) => (
          <text key={e} x={X(i)} y={H - 8} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#6B7A99"
            fontFamily="'Barlow Condensed',sans-serif">{e.toUpperCase()}</text>
        ))}
      </svg>
      <div className="rsm-chips">
        <div className="rsm-chip"><b style={{ color: cL }}>{maxL > 0 ? `+${maxL}` : '—'}</b><small>Máx. ventaja {eqL?.name}</small></div>
        <div className="rsm-chip"><b style={{ color: cV }}>{maxV > 0 ? `+${maxV}` : '—'}</b><small>Máx. ventaja {eqV?.name}</small></div>
        <div className="rsm-chip"><b>{etiquetas[iClave + 1]}</b><small>Cuarto clave ({qs[iClave][0]}-{qs[iClave][1]})</small></div>
      </div>
    </div>
  );
}

function CeldaCalor({ color, pct, conv, int, gana }) {
  const alpha = Math.round(25 + (Math.min(pct, 60) / 60) * 200).toString(16).padStart(2, '0');
  return (
    <div className={`rsm-cell${gana ? ' is-gana' : ''}`} style={{ background: hexA(color, alpha) }}>
      <b>{pct}%</b>
      {int > 0 && <small>{conv} de {int}</small>}
    </div>
  );
}

function MapaCalorTiros({ data }) {
  const { partido, eqLocal: eqL, eqVisit: eqV, statsLocal, statsVisit } = data;
  const cL = eqL?.color ?? '#8899BB', cV = eqV?.color ?? '#F0B429';
  const suma = (rows, k) => (rows ?? []).reduce((a, r) => a + (r[k] ?? 0), 0);
  const tipos = [
    ['TL', 'sc', 'sf', 'pct_simples'],
    ['2P', 'dc', 'df', 'pct_dobles'],
    ['3P', 'tc', 'tf', 'pct_triples'],
  ].map(([lbl, c, f, pk]) => {
    const lado = (rows, pctGuardado) => {
      const conv = suma(rows, c), int = conv + suma(rows, f);
      return { conv, int, pct: int > 0 ? Math.round((conv / int) * 100) : Math.round(Number(pctGuardado) || 0) };
    };
    return { lbl, a: lado(statsLocal, partido[`${pk}_local`]), b: lado(statsVisit, partido[`${pk}_visit`]) };
  });
  if (tipos.every(t => !t.a.pct && !t.b.pct && !t.a.int && !t.b.int)) return null;
  return (
    <div className="rsm-card">
      <div className="rsm-heat">
        <span/>
        <span className="rsm-heat-h" style={{ color: cL }}>{eqL?.name}</span>
        <span className="rsm-heat-h" style={{ color: cV }}>{eqV?.name}</span>
        {tipos.map(t => [
          <span key={t.lbl + 'r'} className="rsm-heat-r">{t.lbl}</span>,
          <CeldaCalor key={t.lbl + 'a'} color={cL} {...t.a} gana={t.a.pct > t.b.pct}/>,
          <CeldaCalor key={t.lbl + 'b'} color={cV} {...t.b} gana={t.b.pct > t.a.pct}/>,
        ])}
      </div>
      <div className="rsm-escala">0%<span/>60%+</div>
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
  let gL = 0, gV = 0;
  const filas = rubros.map(([lbl, a, b, menos]) => {
    const ganaL = menos ? a < b : a > b, ganaV = menos ? b < a : b > a;
    if (ganaL) gL++; if (ganaV) gV++;
    const mx = Math.max(a, b, 1);
    return (
      <div key={lbl} className="rsm-mr">
        <span className="rsm-n" style={ganaL ? { color: cL } : undefined}>{a}</span>
        <span className="rsm-b rsm-b--izq"><i style={{ width: `${(a / mx) * 100}%`, background: cL, opacity: ganaL ? 1 : .35 }}/></span>
        <span className="rsm-l">{lbl}{menos && <small>menos es mejor</small>}</span>
        <span className="rsm-b"><i style={{ width: `${(b / mx) * 100}%`, background: cV, opacity: ganaV ? 1 : .35 }}/></span>
        <span className="rsm-n" style={ganaV ? { color: cV } : undefined}>{b}</span>
      </div>
    );
  });
  return (
    <div className="rsm-card">
      <div className="rsm-mar">{filas}</div>
      <div className="rsm-tot">
        <span style={{ color: cL }}>{eqL?.name} ganó <b>{gL}</b></span>
        <span className="rsm-tot-m">rubros</span>
        <span style={{ color: cV }}>{eqV?.name} ganó <b>{gV}</b></span>
      </div>
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

              <div className="gc-score-board">
                <div className="gc-team">
                  <img src={data.eqLocal?.logo} alt={data.eqLocal?.name}
                    style={{ width:52, height:52, borderRadius:'50%', objectFit:'cover', marginBottom:8,
                      border: `2px solid ${data.eqLocal?.color ?? '#8899BB'}`, boxShadow: `0 0 14px ${hexA(data.eqLocal?.color ?? '#8899BB', '59')}` }}
                    onError={e => { e.target.style.display='none'; }}/>
                  <div className="gc-team-name" style={{ color: data.eqLocal?.color }}>
                    {data.eqLocal?.name}
                  </div>
                </div>
                <div className="gc-final-score">
                  <span style={{ color: data.eqLocal?.color }}>{data.partido.puntos_local}</span>
                  <span style={{ color:'#4A566E', fontSize:28, margin:'0 8px' }}>-</span>
                  <span style={{ color: data.eqVisit?.color }}>{data.partido.puntos_visit}</span>
                </div>
                <div className="gc-team">
                  <img src={data.eqVisit?.logo} alt={data.eqVisit?.name}
                    style={{ width:52, height:52, borderRadius:'50%', objectFit:'cover', marginBottom:8,
                      border: `2px solid ${data.eqVisit?.color ?? '#8899BB'}`, boxShadow: `0 0 14px ${hexA(data.eqVisit?.color ?? '#8899BB', '59')}` }}
                    onError={e => { e.target.style.display='none'; }}/>
                  <div className="gc-team-name" style={{ color: data.eqVisit?.color }}>
                    {data.eqVisit?.name}
                  </div>
                </div>
              </div>

              <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:16, flexWrap:'wrap' }}>
                {['q1','q2','q3','q4'].map(q => (
                  <div key={q} style={{ background:'#141C2A', borderRadius:8, padding:'6px 14px', textAlign:'center', minWidth:52 }}>
                    <div style={{ fontSize:9, color:'#4A566E', letterSpacing:1, fontFamily:"'Barlow Condensed'", textTransform:'uppercase' }}>{q.toUpperCase()}</div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16 }}>
                      <span style={{ color: data.eqLocal?.color }}>{data.partido[`${q}_local`] ?? 0}</span>
                      <span style={{ color:'#4A566E', margin:'0 4px' }}>-</span>
                      <span style={{ color: data.eqVisit?.color }}>{data.partido[`${q}_visit`] ?? 0}</span>
                    </div>
                  </div>
                ))}
                {(data.partido.ot_local ?? 0) > 0 && (
                  <div style={{ background:'#141C2A', borderRadius:8, padding:'6px 14px', textAlign:'center', minWidth:52 }}>
                    <div style={{ fontSize:9, color:'#F0B429', letterSpacing:1, fontFamily:"'Barlow Condensed'" }}>OT</div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16 }}>
                      <span style={{ color: data.eqLocal?.color }}>{data.partido.ot_local}</span>
                      <span style={{ color:'#4A566E', margin:'0 4px' }}>-</span>
                      <span style={{ color: data.eqVisit?.color }}>{data.partido.ot_visit}</span>
                    </div>
                  </div>
                )}
              </div>
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
                <div className="rsm-h"><h4>Cómo fue el partido</h4><span>marcador por cuarto</span></div>
                <EvolucionMarcador partido={data.partido} eqL={data.eqLocal} eqV={data.eqVisit}/>
                <div className="rsm-h"><h4>Tiros</h4><span>más color = mejor %</span></div>
                <MapaCalorTiros data={data}/>
                <div className="rsm-h"><h4>Cara a cara</h4><span>se resalta quién ganó cada rubro</span></div>
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



