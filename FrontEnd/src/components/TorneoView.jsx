import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

function Skel({ w = '100%', h = 16, radius = 6, mb = 8, style = {} }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius, marginBottom: mb,
      background: 'linear-gradient(90deg,#1C2535 25%,#243048 50%,#1C2535 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite',
      ...style,
    }}/>
  );
}

function ResultSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ background: '#0E1420', border: '1px solid #1C2535', borderRadius: 14, padding: 16 }}>
          <Skel w={80} h={12} mb={12}/>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Skel w={44} h={44} radius={22} mb={0}/>
            <Skel w={90} h={16} mb={0}/>
            <div style={{ flex: 1 }}/>
            <Skel w={60} h={32} mb={0}/>
            <div style={{ flex: 1 }}/>
            <Skel w={90} h={16} mb={0}/>
            <Skel w={44} h={44} radius={22} mb={0}/>
          </div>
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div style={{ padding: '8px 0' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid #1C2535', alignItems: 'center' }}>
          <Skel w={28} h={28} radius={14} mb={0}/>
          <Skel w={120} h={14} mb={0}/>
          <div style={{ flex: 1 }}/>
          {[40, 30, 30, 30, 40, 50].map((w, j) => <Skel key={j} w={w} h={14} mb={0}/>)}
        </div>
      ))}
    </div>
  );
}

import { useTournament }    from '../context/TournamentContext';
import { useEquiposDeTemporada } from '../hooks/useEquiposDeTemporada';
import { GameCenterModal, PlayerProfileModal, TeamPageFem } from './LazyModals';
import { FavoritoCard }     from './FavoritoCard';
import { useStats }         from '../context/StatsContext';
import { useSwipe }         from '../hooks/useSwipe';
import { useFavorito }      from '../hooks/useFavorito';
import { useWheelHorizontal } from '../hooks/useWheelHorizontal';
import { EscudoJugador } from './EscudoJugador.jsx';
import { TablaZona, tablaFechaAnterior } from './TablaPosiciones.jsx';
import { labelFecha, labelPartido, esPartidoPlayoff, COPA_LABEL, INSTANCIA_LABEL } from '../lib/fechaLabel';

const TABS = [
  { key: 'tabla',      label: 'Tabla'     },
  { key: 'resultados', label: 'Resultados' },
  { key: 'fixture',    label: 'Fixture'    },
  { key: 'equipos',    label: 'Equipos'    },
  { key: 'jugadores',  label: 'Jugadoras'  },
];

const IG_URL = 'https://www.instagram.com/torneostar.basquet/';

// Exportada (junto con MatchResultCard/FixtureCard más abajo) para que
// PlayoffsBracket.jsx pueda mostrar los resultados y próximos partidos de
// playoff con EXACTAMENTE la misma tarjeta — mismos degradados de color,
// mismo detalle de parciales/MVP/porcentajes — que usa Resultados para la
// temporada regular, en vez de una versión compacta aparte.
export function buildJugadorasMap(equipos) {
  const map = {};
  for (const eq of equipos) {
    for (const j of eq.jugadoras ?? []) {
      map[j.id] = { ...j, equipoNombre: eq.name, equipoColor: eq.color };
    }
  }
  return map;
}

// Sistema de copas: banda segun posicion DENTRO DE LA ZONA (A o B), con el
// mismo corte dinamico que usa buildPools() en PlayoffsBracket.jsx (cada
// zona partida en 3 grupos de ~1/3 de sus equipos, redondeando para arriba)
// — así la banda de color que se ve acá en la tabla SIEMPRE coincide con la
// copa real a la que ese equipo va a jugar. `zoneSize` es la cantidad de
// equipos de esa zona (lista.length); si no se pasa, cae en el viejo corte
// fijo de 4/8 por compatibilidad.
function bandFor(rank, zoneSize) {
  const g = Math.ceil((zoneSize || 12) / 3);
  if (rank <= g)     return { label: 'Copa de Oro', color: '#F0B429', tint: 'rgba(240,180,41,.06)' };
  if (rank <= g * 2) return { label: 'Copa de Plata', color: '#C7D1DD', tint: 'rgba(199,209,221,.045)' };
  return { label: 'Copa de Bronce', color: '#CD7F32', tint: 'rgba(205,127,50,.05)' };
}

function EmptyState({ icon, title, sub, showIG = true }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      <div className="empty-sub">{sub}</div>
      {showIG && (
        <a href={IG_URL} target="_blank" rel="noopener noreferrer" className="empty-ig-btn">
          Seguinos en Instagram
        </a>
      )}
    </div>
  );
}

// Alpha en hex de 2 digitos, concatenado directo al color del equipo (ej:
// "#D4A017" + "59" = ~35% opacidad). Evita color-mix()/variables CSS con
// alpha dinamico, que no anda bien en navegadores viejos de celulares.
const hexA = (hex, alpha) => `${hex}${alpha}`;

const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DIAS_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ddmm = iso => (iso ? iso.split('-').reverse().slice(0, 2).join('/') : '');

// Separador de día del fixture: cajita tipo calendario + "Sábado 21 de
// noviembre" + cantidad de partidos, cancha(s) y horario de ese día.
function DiaSeparador({ fechaISO, partidosDia }) {
  const d = new Date(fechaISO + 'T00:00:00');
  const lugares = [...new Set(partidosDia.map(p => p.lugar).filter(Boolean))];
  const horas = partidosDia.map(p => p.hora_inicio).filter(Boolean).map(h => String(h).slice(0, 5)).sort();
  const n = partidosDia.length;
  return (
    <div className="dia-sep">
      <div className="dia-sep-cal"><small>{DIAS_CORTO[d.getDay()]}</small><b>{d.getDate()}</b></div>
      <div className="dia-sep-txt">
        <span className="dia-sep-tit">{DIAS_LARGO[d.getDay()]} {d.getDate()} de {MESES[d.getMonth()]}</span>
        <span className="dia-sep-sub">
          <b>{n} {n === 1 ? 'partido' : 'partidos'}</b>
          {lugares.length > 0 && <> · 📍 {lugares.join(' / ')}</>}
          {horas.length > 0 && <span className="dia-sep-horas"> · {horas[0]}{horas.length > 1 && horas[horas.length - 1] !== horas[0] ? ` a ${horas[horas.length - 1]}` : ' hs'}</span>}
        </span>
      </div>
      <span className="dia-sep-linea"/>
    </div>
  );
}

const TAB_ICONOS = {
  tabla: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></>,
  resultados: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></>,
  fixture: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  jugadores: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></>,
  equipos: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
};

const INSTANCIA_CHIP = { cuartos: 'Cuartos', semifinal: 'Semis', tercer_puesto: '3er puesto', final: 'Final' };

// Color de acento por copa — mismo lenguaje visual que el cuadro de playoffs
// y la referencia de bandas de la tabla de posiciones (Oro/Plata/Bronce).
const COPA_COLOR = { oro: '#F0B429', plata: '#C7D1DD', bronce: '#CD7F32' };

function PlayoffTag({ partido }) {
  if (!esPartidoPlayoff(partido)) return null;
  const color = COPA_COLOR[partido.copa] ?? '#F0B429';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontFamily: "'Barlow Condensed'", fontSize: 10, fontWeight: 700,
      letterSpacing: 1.5, textTransform: 'uppercase', color,
      border: `1px solid ${color}66`, background: `${color}1a`,
      borderRadius: 4, padding: '2px 6px',
    }}>
      Playoffs
    </span>
  );
}

// Tarjetas de partido (rediseño 23/11): todo centrado en un eje, marcador
// "estilo TV" (nombre · escudo · 53 - 45 · escudo · nombre), cuartos en
// pastillas con el ganador de cada uno en su color, % de tiro en barras
// enfrentadas y MVP con el escudo de su equipo. Los escudos grandes y
// transparentes a los costados llenan el ancho en PC. Se adapta por container
// query (.rx-card), así también se ve bien en columnas angostas (playoffs).
function EscudoRx({ eq, color, destacado = true }) {
  return (
    <span className="rx-escudo" style={{
      borderColor: color,
      boxShadow: destacado ? `0 0 16px ${hexA(color,'73')}` : 'none',
      opacity: destacado ? 1 : .7,
    }}>
      <img src={eq.logo} alt={eq.name} loading="lazy" onError={e => { e.target.style.display = 'none'; }}/>
    </span>
  );
}

function MarcasAgua({ localEq, visitEq }) {
  return (
    <>
      <img aria-hidden="true" alt="" src={localEq.logo} className="rx-marca rx-marca--l" loading="lazy"/>
      <img aria-hidden="true" alt="" src={visitEq.logo} className="rx-marca rx-marca--v" loading="lazy"/>
    </>
  );
}

function BadgePartido({ partido, fecha, defecto }) {
  const diaCal = partido.fecha_partido ?? fecha?.fecha_dia;
  return (
    <span className="rx-badge">
      {/* En playoffs el label ya dice la copa y la instancia: se saca el
          "Playoffs ·" del principio para que entre en una línea. */}
      <b>{(labelPartido(partido, fecha) ?? defecto).replace(/^playoffs?\s*·\s*/i, '')}</b>
      {diaCal && ` · ${diaCal.split('-').reverse().slice(0,2).join('/')}`}
      {partido.hora_inicio && ` · ${String(partido.hora_inicio).slice(0, 5)}`}
    </span>
  );
}

export function ResultadoCard({ partido, equiposFem, jugadorasMap, fechas, onClick }) {
  const localEq = equiposFem.find(e => e.id === partido.equipo_local_id);
  const visitEq = equiposFem.find(e => e.id === partido.equipo_visit_id);
  const fecha   = fechas.find(f => f.id === partido.fecha_id);
  const enVivo  = partido.estado === 'en_juego';

  const ptsLocal = partido.puntos_local ??
    ((partido.q1_local ?? 0) + (partido.q2_local ?? 0) +
     (partido.q3_local ?? 0) + (partido.q4_local ?? 0) + (partido.ot_local ?? 0));
  const ptsVisit = partido.puntos_visit ??
    ((partido.q1_visit ?? 0) + (partido.q2_visit ?? 0) +
     (partido.q3_visit ?? 0) + (partido.q4_visit ?? 0) + (partido.ot_visit ?? 0));
  const ganLocal = ptsLocal > ptsVisit;
  const ganVisit = ptsVisit > ptsLocal;

  if (!localEq || !visitEq) return null;

  // partidos_masculino guarda la columna como "mvp_jugador_id" (sin "a"),
  // partidos_femenino como "mvp_jugadora_id" — sin este fallback el MVP
  // nunca se mostraba en los partidos de masculino.
  const mvpJugId = partido.mvp_jugadora_id ?? partido.mvp_jugador_id;
  const mvpJug = mvpJugId ? jugadorasMap[mvpJugId] : null;
  const mvpEq = mvpJug ? equiposFem.find(e => e.name === mvpJug.equipoNombre) : null;
  const cL = localEq.color ?? '#8899BB', cV = visitEq.color ?? '#8899BB';

  const cuartos = ['q1', 'q2', 'q3', 'q4'].map(q => [q.toUpperCase(), partido[`${q}_local`] ?? 0, partido[`${q}_visit`] ?? 0]);
  if ((partido.ot_local ?? 0) > 0 || (partido.ot_visit ?? 0) > 0) cuartos.push(['OT', partido.ot_local ?? 0, partido.ot_visit ?? 0]);
  const pcts = partido.pct_dobles_local != null ? [
    ['TL', partido.pct_simples_local, partido.pct_simples_visit],
    ['2P', partido.pct_dobles_local,  partido.pct_dobles_visit],
    ['3P', partido.pct_triples_local, partido.pct_triples_visit],
  ].map(([l, x, y]) => [l, Math.round(Number(x) || 0), Math.round(Number(y) || 0)]) : null;

  return (
    <div className="rx-card" onClick={onClick} style={{
      cursor: onClick ? 'pointer' : 'default',
      backgroundImage: `linear-gradient(100deg, ${hexA(cL,'24')}, transparent 38%, transparent 62%, ${hexA(cV,'24')})`,
    }}>
      <MarcasAgua localEq={localEq} visitEq={visitEq}/>
      <div className="rx-top">
        <BadgePartido partido={partido} fecha={fecha} defecto="Partido"/>
        <span className="rx-top-der">
          <span className={`rx-estado${enVivo ? ' is-vivo' : ''}`}>{enVivo ? 'En vivo' : 'Final'}</span>
        </span>
      </div>

      <div className="rx-main">
        <div className={`rx-lado${ganLocal ? ' is-gano' : ''}`}>
          <span className="rx-nombre">{localEq.name}</span>
          <EscudoRx eq={localEq} color={cL} destacado={!ganVisit}/>
        </div>
        <div className="rx-marcador">
          <span className="rx-pts" style={ganLocal ? { color: cL } : undefined}>{ptsLocal}</span>
          <span className="rx-guion">-</span>
          <span className="rx-pts" style={ganVisit ? { color: cV } : undefined}>{ptsVisit}</span>
        </div>
        <div className={`rx-lado rx-lado--v${ganVisit ? ' is-gano' : ''}`}>
          <EscudoRx eq={visitEq} color={cV} destacado={!ganLocal}/>
          <span className="rx-nombre">{visitEq.name}</span>
        </div>
      </div>

      {partido.q1_local != null && (
        <div className="rx-cuartos">
          {cuartos.map(([l, x, y]) => (
            <span key={l} className={`rx-q${l === 'OT' ? ' is-ot' : ''}`}>
              <small>{l}</small>
              <b className={x > y ? '' : 'is-pierde'} style={x > y ? { color: cL } : undefined}>{x}</b>
              <i>-</i>
              <b className={y > x ? '' : 'is-pierde'} style={y > x ? { color: cV } : undefined}>{y}</b>
            </span>
          ))}
        </div>
      )}

      {pcts && (
        <div className="rx-pcts">
          {pcts.map(([l, x, y]) => (
            <div key={l} className="rx-pct">
              <span className={x >= y ? 'is-mejor' : ''}>{x}%</span>
              <span className="rx-pct-barras">
                <i style={{ width: `${Math.min(x, 100)}%`, background: cL }}/>
                <b>{l}</b>
                <i style={{ width: `${Math.min(y, 100)}%`, background: cV }}/>
              </span>
              <span className={y > x ? 'is-mejor' : ''}>{y}%</span>
            </div>
          ))}
        </div>
      )}

      {(mvpJug || onClick) && (
        <div className={`rx-mvp${mvpJug ? '' : ' rx-mvp--solo'}`}>
          {mvpJug && (
            <div className="rx-mvp-centro">
              <span className="rx-mvp-tag">MVP</span>
              {mvpEq && (
                <span className="rx-mvp-escudo" style={{ borderColor: mvpEq.color }}>
                  <img src={mvpEq.logo} alt="" loading="lazy"/>
                </span>
              )}
              <span className="rx-mvp-nombre">{mvpJug.nombre}</span>
              <span className="rx-mvp-eq" style={{ color: mvpJug.equipoColor }}>{mvpJug.equipoNombre}</span>
            </div>
          )}
          {onClick && <span className="rx-ver">Ver partido ›</span>}
        </div>
      )}
    </div>
  );
}

export function ProximoCard({ partido, equiposFem, fechas }) {
  const localEq = equiposFem.find(e => e.id === partido.equipo_local_id);
  const visitEq = equiposFem.find(e => e.id === partido.equipo_visit_id);
  const fecha   = fechas.find(f => f.id === partido.fecha_id);
  if (!localEq || !visitEq) return null;
  const cL = localEq.color ?? '#8899BB', cV = visitEq.color ?? '#8899BB';
  const hora = partido.hora_inicio ? String(partido.hora_inicio).slice(0, 5) : null;
  return (
    <div className="rx-card rx-card--fixture" style={{
      backgroundImage: `linear-gradient(100deg, ${hexA(cL,'24')}, transparent 38%, transparent 62%, ${hexA(cV,'24')})`,
    }}>
      <MarcasAgua localEq={localEq} visitEq={visitEq}/>
      <div className="rx-top">
        <BadgePartido partido={{ ...partido, hora_inicio: null }} fecha={fecha} defecto="Próximo"/>
        <span className="rx-top-der">
          <span className="rx-estado is-proximo">Próximo</span>
        </span>
      </div>
      <div className="rx-main">
        <div className="rx-lado is-gano">
          <span className="rx-nombre">{localEq.name}</span>
          <EscudoRx eq={localEq} color={cL}/>
        </div>
        <div className="rx-hora">
          <span className="rx-hora-num">{hora ?? 'VS'}</span>
          {hora && <span className="rx-hora-lbl">hs</span>}
        </div>
        <div className="rx-lado rx-lado--v is-gano">
          <EscudoRx eq={visitEq} color={cV}/>
          <span className="rx-nombre">{visitEq.name}</span>
        </div>
      </div>
      {partido.lugar && <div className="rx-lugar">📍 {partido.lugar}</div>}
    </div>
  );
}

// Versiones anteriores: se siguen usando en el cuadro de playoffs
// (PlayoffsBracket.jsx), que tiene su propio estilo para estas tarjetas.
export function MatchResultCard({ partido, equiposFem, jugadorasMap, fechas, onClick }) {
  const localEq = equiposFem.find(e => e.id === partido.equipo_local_id);
  const visitEq = equiposFem.find(e => e.id === partido.equipo_visit_id);
  const fecha   = fechas.find(f => f.id === partido.fecha_id);
  const enVivo  = partido.estado === 'en_juego';

  const ptsLocal = partido.puntos_local ??
    ((partido.q1_local ?? 0) + (partido.q2_local ?? 0) +
     (partido.q3_local ?? 0) + (partido.q4_local ?? 0) + (partido.ot_local ?? 0));
  const ptsVisit = partido.puntos_visit ??
    ((partido.q1_visit ?? 0) + (partido.q2_visit ?? 0) +
     (partido.q3_visit ?? 0) + (partido.q4_visit ?? 0) + (partido.ot_visit ?? 0));
  const ganLocal = ptsLocal > ptsVisit;

  if (!localEq || !visitEq) return null;

  // partidos_masculino guarda la columna como "mvp_jugador_id" (sin "a"),
  // partidos_femenino como "mvp_jugadora_id" — sin este fallback el MVP
  // nunca se mostraba en los partidos de masculino.
  const mvpJugId = partido.mvp_jugadora_id ?? partido.mvp_jugador_id;
  const mvpJug = mvpJugId ? jugadorasMap[mvpJugId] : null;
  const diaCal = partido.fecha_partido ?? fecha?.fecha_dia;
  const cL = localEq.color ?? '#8899BB', cV = visitEq.color ?? '#8899BB';

  return (
    <div className="result-card-v2" onClick={onClick} style={{
      cursor: onClick ? 'pointer' : 'default',
      background: `linear-gradient(115deg, ${hexA(cL,'55')}, #1C2535 40%, ${hexA(cV,'55')})`,
    }}>
      <div className="rc2-inner" style={{
        background: `linear-gradient(135deg, ${hexA(cL,'1a')}, #0B111C 45%, ${hexA(cV,'1a')})`,
      }}>
        <div className="rc2-header">
          <span className="fc2v-badge">
            {labelPartido(partido, fecha) ?? 'Partido'}
            {diaCal && ` · ${diaCal.split('-').reverse().slice(0,2).join('/')}`}
            {partido.hora_inicio && ` · ${String(partido.hora_inicio).slice(0, 5)}`}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <PlayoffTag partido={partido}/>
            <span className={`rc-estado ${enVivo ? 'en-vivo' : 'finalizado'}`}>
              {enVivo ? 'EN VIVO' : 'FINAL'}
            </span>
          </div>
        </div>

        <div className="rc2-body">
          <div className="fc2v-team">
            <img src={localEq.logo} alt={localEq.name} className="fc2v-logo" loading="lazy"
              style={{ borderColor: cL, boxShadow: `0 0 14px ${hexA(cL,'59')}`, opacity: ganLocal ? 1 : .55 }}
              onError={e => { e.target.style.display = 'none'; }}/>
            <span className="fc2v-name" style={{ color: ganLocal ? '#EEF2F8' : '#6B7A99' }}>{localEq.name}</span>
            <span className="rc2-pts" style={{ color: ganLocal ? cL : '#6B7A99' }}>{ptsLocal}</span>
          </div>
          <div className="fc2v-vs">-</div>
          <div className="fc2v-team">
            <img src={visitEq.logo} alt={visitEq.name} className="fc2v-logo" loading="lazy"
              style={{ borderColor: cV, boxShadow: `0 0 14px ${hexA(cV,'59')}`, opacity: !ganLocal ? 1 : .55 }}
              onError={e => { e.target.style.display = 'none'; }}/>
            <span className="fc2v-name" style={{ color: !ganLocal ? '#EEF2F8' : '#6B7A99' }}>{visitEq.name}</span>
            <span className="rc2-pts" style={{ color: !ganLocal ? cV : '#6B7A99' }}>{ptsVisit}</span>
          </div>
        </div>

        {partido.q1_local != null && (
        <div className="rc-parciales">
          {['q1', 'q2', 'q3', 'q4'].map(q => (
            <div key={q} className="rc-parcial">
              <span className="rc-parcial-lbl">{q.toUpperCase()}</span>
              <span className="rc-parcial-vals">
                <span style={{ color: localEq.color }}>{partido[`${q}_local`] ?? 0}</span>
                <span className="rc-parcial-sep">-</span>
                <span style={{ color: visitEq.color }}>{partido[`${q}_visit`] ?? 0}</span>
              </span>
            </div>
          ))}
          {((partido.ot_local ?? 0) > 0 || (partido.ot_visit ?? 0) > 0) && (
            <div className="rc-parcial" style={{ borderColor: 'rgba(240,180,41,.3)' }}>
              <span className="rc-parcial-lbl" style={{ color: '#F0B429' }}>OT</span>
              <span className="rc-parcial-vals">
                <span style={{ color: localEq.color }}>{partido.ot_local ?? 0}</span>
                <span className="rc-parcial-sep">-</span>
                <span style={{ color: visitEq.color }}>{partido.ot_visit ?? 0}</span>
              </span>
            </div>
          )}
        </div>
      )}

      {mvpJug && (
        <div className="rc-mvp">
          <span style={{ fontSize: 16 }}>*</span>
          <div>
            <div className="rc-mvp-label">MVP del partido</div>
            <div className="rc-mvp-name">{mvpJug.nombre}</div>
          </div>
          <div className="rc-mvp-pts">{mvpJug.equipoNombre}</div>
        </div>
      )}

      {partido.pct_dobles_local != null && (
        <div className="rc-pct-row">
          <span className="rc-pct-item">
            <span className="rc-pct-lbl">TL%</span>
            <span style={{ color: localEq.color }}>{partido.pct_simples_local}%</span>
            <span className="rc-pct-sep">.</span>
            <span style={{ color: visitEq.color }}>{partido.pct_simples_visit}%</span>
          </span>
          <span className="rc-pct-item">
            <span className="rc-pct-lbl">2P%</span>
            <span style={{ color: localEq.color }}>{partido.pct_dobles_local}%</span>
            <span className="rc-pct-sep">.</span>
            <span style={{ color: visitEq.color }}>{partido.pct_dobles_visit}%</span>
          </span>
          <span className="rc-pct-item">
            <span className="rc-pct-lbl">3P%</span>
            <span style={{ color: localEq.color }}>{partido.pct_triples_local}%</span>
            <span className="rc-pct-sep">.</span>
            <span style={{ color: visitEq.color }}>{partido.pct_triples_visit}%</span>
          </span>
        </div>
      )}
      </div>
    </div>
  );
}

export function FixtureCard({ partido, equiposFem, fechas }) {
  const localEq = equiposFem.find(e => e.id === partido.equipo_local_id);
  const visitEq = equiposFem.find(e => e.id === partido.equipo_visit_id);
  const fecha   = fechas.find(f => f.id === partido.fecha_id);
  if (!localEq || !visitEq) return null;
  const diaCal = partido.fecha_partido ?? fecha?.fecha_dia;
  const cL = localEq.color ?? '#8899BB', cV = visitEq.color ?? '#8899BB';
  return (
    <div className="fixture-card-v2" style={{
      background: `linear-gradient(115deg, ${hexA(cL,'55')}, #1C2535 40%, ${hexA(cV,'55')})`,
    }}>
      <div className="fc2v-inner" style={{
        background: `linear-gradient(135deg, ${hexA(cL,'1a')}, #0B111C 45%, ${hexA(cV,'1a')})`,
      }}>
        <div className="fc2v-header">
          <span className="fc2v-badge">
            {labelPartido(partido, fecha) ?? 'Proximo'}
            {diaCal && ` · ${diaCal.split('-').reverse().slice(0,2).join('/')}`}
            {partido.hora_inicio && ` · ${String(partido.hora_inicio).slice(0, 5)}`}
          </span>
          {partido.lugar && <span className="fc2v-lugar">📍 {partido.lugar}</span>}
        </div>
        <div className="fc2v-body">
          <div className="fc2v-team">
            <img src={localEq.logo} alt={localEq.name} className="fc2v-logo" loading="lazy"
              style={{ borderColor: cL, boxShadow: `0 0 14px ${hexA(cL,'59')}` }}
              onError={e => { e.target.style.display = 'none'; }}/>
            <span className="fc2v-name">{localEq.name}</span>
          </div>
          <div className="fc2v-vs">VS</div>
          <div className="fc2v-team">
            <img src={visitEq.logo} alt={visitEq.name} className="fc2v-logo" loading="lazy"
              style={{ borderColor: cV, boxShadow: `0 0 14px ${hexA(cV,'59')}` }}
              onError={e => { e.target.style.display = 'none'; }}/>
            <span className="fc2v-name">{visitEq.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TorneoView({ onSelectPlayer: extSelectPlayer, onSelectTeam: extSelectTeam }) {
  const { mode } = useTournament();
  const {
    equipos: equiposFemenino = [],
    isLoading: isLoadingStats = false,
    error: statsError = null,
    partidos = [],
    fechas = [],
    statsPorPartido = {},
  } = useStats();
  const { toggleFavorito, esFavorito } = useFavorito();
  const filterChipsWheelRef = useWheelHorizontal();
  const fechaChipsWheelRef  = useWheelHorizontal();

  const [activeTab,       setActiveTab]       = useState('tabla');
  const [prevTab,         setPrevTab]         = useState('tabla');
  const [selectedMatch,   setSelectedMatch]   = useState(null);
  const [selectedPlayer,  setSelectedPlayer]  = useState(null);
  const [selectedTeamId,  setSelectedTeamId]  = useState(null);
  const [searchJugadoras, setSearchJugadoras] = useState('');
  const [filterEquipoId,  setFilterEquipoId]  = useState(null);
  // Renderizar los ~230 jugadores de una sola vez es pesado en celulares
  // gama media (cada card tiene degradado + sombra inline) — se muestra de a
  // tandas y se resetea cada vez que cambia la búsqueda o el filtro de equipo.
  const PLAYERS_PAGE_SIZE = 24;
  const [playersVisible, setPlayersVisible] = useState(PLAYERS_PAGE_SIZE);
  const [tappedCard,      setTappedCard]      = useState(null);
  const [fechaSelId,      setFechaSelId]      = useState(null);
  // Resultados: Temporada Regular vs Playoffs son dos vistas separadas — no
  // se mezclan en la misma lista para que un resultado de semifinal no
  // aparezca revuelto entre los de la fase regular.
  const [resultadosView,  setResultadosView]  = useState('regular'); // 'regular' | 'playoffs'
  const [copaSelId,       setCopaSelId]       = useState(null);
  // Fixture: igual que en Resultados, los playoffs van aparte y solo se ven
  // al tocar el chip "Playoffs" (por defecto se muestra la temporada regular).
  const [fixtureView,     setFixtureView]     = useState('regular'); // 'regular' | 'playoffs'
  const [instanciaSel,    setInstanciaSel]    = useState(null);

  const jugadorasMap = useMemo(() => buildJugadorasMap(equiposFemenino), [equiposFemenino]);

  const selectedTeamFem = selectedTeamId
    ? equiposFemenino.find(e => e.id === selectedTeamId) ?? null
    : null;

  const tabKeys = TABS.map(t => t.key);

  const goNextTab = useCallback(() => {
    const i = tabKeys.indexOf(activeTab);
    if (i < tabKeys.length - 1) setActiveTab(tabKeys[i + 1]);
  }, [activeTab, tabKeys]);

  const goPrevTab = useCallback(() => {
    const i = tabKeys.indexOf(activeTab);
    if (i > 0) setActiveTab(tabKeys[i - 1]);
  }, [activeTab, tabKeys]);

  const swipeHandlers = useSwipe({ onSwipeLeft: goNextTab, onSwipeRight: goPrevTab });

  useEffect(() => {
    const handler = e => {
      if (TABS.find(t => t.key === e.detail?.tab)) {
        setActiveTab(e.detail.tab);
        setSelectedTeamId(null);
      }
    };
    window.addEventListener('star:tab', handler);
    return () => window.removeEventListener('star:tab', handler);
  }, []);

  // Avisa qué pestaña quedó abierta (lo usa el menú de arriba para marcarla).
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('star:tab-actual', { detail: { tab: activeTab } }));
  }, [activeTab]);

  useEffect(() => {
    const t = setTimeout(() => {
      document.querySelectorAll('.reveal-on-scroll:not(.in-view)').forEach(el => el.classList.add('in-view'));
    }, 80);
    return () => clearTimeout(t);
  }, [activeTab]);

  const handleSelectPlayer = p => { setSelectedPlayer(p); extSelectPlayer?.(p); };

  const handleSelectTeam = t => {
    setPrevTab(activeTab);
    setSelectedTeamId(t.id);
    extSelectTeam?.(t);
  };

  const handleBackFromTeam = () => {
    setSelectedTeamId(null);
    setActiveTab(prevTab);
  };

  // Igual que en Hero.jsx / SeasonKpis.jsx: `zona` (A/B) es un dato GLOBAL en
  // la base, no algo fijado por temporada, así que por sí solo no sirve para
  // decidir "este equipo juega la temporada que estoy mirando" — un equipo
  // nuevo de Clausura con zona asignada aparecía también dentro de Apertura
  // (archivada), y equipos que ya no juegan aparecían en Clausura. Lo
  // confiable es si el equipo tiene partidos/historial DENTRO de esa
  // temporada puntual (`equipos` ya viene con pj/historial filtrado por
  // temporada desde el hook); la zona solo se usa como fallback para que un
  // equipo recién armado con 0 partidos igual aparezca, y únicamente cuando
  // la temporada mirada es la ACTIVA ahora mismo (nunca para una archivada).
  const { equiposDeTemporada, activaCategoria } = useEquiposDeTemporada(equiposFemenino, mode);

  const jugadorasFiltradas = useMemo(() => {
    const q = searchJugadoras.toLowerCase();
    return equiposDeTemporada.flatMap(team =>
      team.jugadoras
        .filter(j => {
          const matchSearch = !q || j.nombre.toLowerCase().includes(q);
          const matchEq     = !filterEquipoId || team.id === filterEquipoId;
          return matchSearch && matchEq;
        })
        .map(j => ({ ...j, equipo: team.name, equipoColor: team.color, equipoId: team.id, equipoLogo: team.logo }))
    );
  }, [equiposDeTemporada, searchJugadoras, filterEquipoId]);

  // Volver a la primera tanda cada vez que cambia la búsqueda o el filtro
  useEffect(() => { setPlayersVisible(PLAYERS_PAGE_SIZE); }, [searchJugadoras, filterEquipoId]);

  const jugadorasVisibles = useMemo(
    () => jugadorasFiltradas.slice(0, playersVisible),
    [jugadorasFiltradas, playersVisible]
  );

  // Una jornada ("Fecha 1") puede jugarse en mas de un dia calendario (ej: 8
  // partidos el sabado, 3 el domingo) — antes esto solo ordenaba por
  // fecha_id + hora_inicio, entonces un partido de las 10:00 del domingo
  // aparecia ANTES que uno de las 20:00 del sabado, mezclando los dias.
  // Ahora se ordena tambien por la fecha calendario real de cada partido.
  const fechaDiaPorId = useMemo(() =>
    Object.fromEntries(fechas.map(f => [f.id, f.fecha_dia])),
    [fechas]);
  const fechaCalendario = p => p.fecha_partido ?? fechaDiaPorId[p.fecha_id] ?? '';

  // Orden de instancias dentro de la vista de Playoffs — cuartos primero,
  // final al final, sin importar el orden en que se cargaron los partidos.
  const ORDEN_INSTANCIA = { cuartos: 0, semifinal: 1, tercer_puesto: 2, final: 3 };

  const partidosFinalizados = useMemo(() =>
    partidos
      .filter(p => p.estado === 'finalizado')
      .filter(p => resultadosView === 'playoffs' ? !!p.es_playoff : !p.es_playoff)
      .filter(p => resultadosView === 'playoffs'
        ? (!copaSelId || p.copa === copaSelId)
        : (!fechaSelId || p.fecha_id === fechaSelId))
      .sort((a, b) => {
        if (resultadosView === 'playoffs') {
          const oi = (ORDEN_INSTANCIA[a.instancia] ?? 9) - (ORDEN_INSTANCIA[b.instancia] ?? 9);
          if (oi !== 0) return oi;
          const ci = (a.copa ?? '').localeCompare(b.copa ?? '');
          if (ci !== 0) return ci;
          return (a.llave ?? 0) - (b.llave ?? 0);
        }
        const df = (b.fecha_id ?? 0) - (a.fecha_id ?? 0);
        if (df !== 0) return df;
        const dd = fechaCalendario(b).localeCompare(fechaCalendario(a));
        if (dd !== 0) return dd;
        return (b.hora_inicio ?? '').localeCompare(a.hora_inicio ?? '');
      }),
    [partidos, fechaSelId, fechaDiaPorId, resultadosView, copaSelId]);

  // Copas con al menos un resultado de playoff cargado — para armar los
  // chips de filtro secundarios dentro de la vista de Playoffs.
  const copasConPlayoff = useMemo(() => {
    const set = new Set(
      partidos.filter(p => p.estado === 'finalizado' && p.es_playoff && p.copa).map(p => p.copa)
    );
    return ['oro', 'plata', 'bronce'].filter(c => set.has(c));
  }, [partidos]);

  const hayPlayoffsCargados = useMemo(
    () => partidos.some(p => p.es_playoff),
    [partidos]
  );

  const partidosPendientes = useMemo(() =>
    partidos
      .filter(p => fixtureView === 'playoffs' ? !!p.es_playoff : !p.es_playoff)
      .filter(p => fixtureView === 'playoffs'
        ? (!instanciaSel || p.instancia === instanciaSel)
        : (!fechaSelId || p.fecha_id === fechaSelId))
      .sort((a, b) => {
        if (fixtureView === 'playoffs') {
          const oi = (ORDEN_INSTANCIA[a.instancia] ?? 9) - (ORDEN_INSTANCIA[b.instancia] ?? 9);
          if (oi !== 0) return oi;
        }
        const df = (a.fecha_id ?? 0) - (b.fecha_id ?? 0);
        if (df !== 0) return df;
        const dd = fechaCalendario(a).localeCompare(fechaCalendario(b));
        if (dd !== 0) return dd;
        return (a.hora_inicio ?? '99:99').localeCompare(b.hora_inicio ?? '99:99');
      }),
    [partidos, fechaSelId, fechaDiaPorId, fixtureView, instanciaSel]);

  // Fechas de temporada regular para el fixture: se saca la jornada cuyos
  // partidos son todos de playoffs (ej: "Fecha 12" = cuartos), que ahora va
  // en el chip de Playoffs con su nombre (Cuartos, Semis, Final).
  const fechasRegulares = useMemo(() => fechas.filter(f => {
    const ps = partidos.filter(p => p.fecha_id === f.id);
    return !(ps.length > 0 && ps.every(p => p.es_playoff));
  }), [fechas, partidos]);

  // Próxima jornada a jugarse (punto verde en su chip).
  const fechaProximaId = useMemo(() => {
    const pend = fechasRegulares
      .filter(f => partidos.some(p => p.fecha_id === f.id && p.estado !== 'finalizado' && !p.es_playoff))
      .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0));
    return pend[0]?.id ?? null;
  }, [fechasRegulares, partidos]);

  // Instancias de playoff cargadas (Cuartos, Semis, ...) con su día.
  const instanciasPlayoff = useMemo(() => {
    const porInst = {};
    for (const p of partidos) {
      if (!p.es_playoff || !p.instancia) continue;
      (porInst[p.instancia] ??= []).push(p);
    }
    return Object.entries(porInst)
      .sort(([a], [b]) => (ORDEN_INSTANCIA[a] ?? 9) - (ORDEN_INSTANCIA[b] ?? 9))
      .map(([inst, ps]) => ({
        inst,
        dia: ps.map(fechaCalendario).filter(Boolean).sort()[0] ?? '',
        pendiente: ps.some(p => p.estado !== 'finalizado'),
      }));
  }, [partidos, fechaDiaPorId]);
  const instanciaProxima = instanciasPlayoff.find(i => i.pendiente)?.inst ?? null;

  // En el celular la fila de chips se desliza: se centra en el chip elegido
  // (o en la próxima fecha) para no tener que buscarlo al final de la fila.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      document.querySelectorAll('.fecha-chips--v3').forEach(fila => {
        if (fila.scrollWidth <= fila.clientWidth) return;
        const chip = fila.querySelector('.fx-chip.is-on:not(.fx-chip--acum)') ?? fila.querySelector('.fx-chip.is-prox');
        if (chip) fila.scrollLeft = chip.offsetLeft - fila.clientWidth / 2 + chip.offsetWidth / 2;
      });
    });
    return () => cancelAnimationFrame(id);
  }, [activeTab, fechaSelId, fixtureView, instanciaSel, resultadosView, copaSelId, partidos.length]);

  const equiposOrdenados = useMemo(() =>
    [...equiposDeTemporada].sort((a, b) => {
      const ptsA = a.pg * 2 + a.pp, ptsB = b.pg * 2 + b.pp;
      if (ptsB !== ptsA) return ptsB - ptsA;
      const difA = a.pf - a.pc, difB = b.pf - b.pc;
      if (difB !== difA) return difB - difA;
      return b.pf - a.pf;
    }),
    [equiposDeTemporada]);

  // Tabla dividida en Zona A / Zona B (asignación en equipos_femenino.zona /
  // equipos_masculino.zona) — femenino y masculino comparten el mismo bloque
  // de abajo desde que femenino también pasó a jugarse por zonas.
  //
  // ⚠️ `zona` es un dato GLOBAL/actual en la base, no algo guardado por
  // temporada. Para la temporada ACTIVA coincide con la realidad de hoy, pero
  // para una temporada ARCHIVADA ya no dice nada confiable: un equipo que
  // jugó esa temporada puede hoy tener la zona de la temporada nueva, o
  // ninguna — usarla ahí mezclaba equipos entre temporadas y, peor, dejaba
  // afuera de la tabla a equipos que sí jugaron pero se quedaron sin zona
  // asignada (reporte de Alvaro: "sale con menos equipos la tabla en el
  // apertura"). Por eso acá solo se arma por zona cuando se está mirando la
  // temporada activa; cualquier temporada archivada usa la tabla general
  // (mismo método que se usaba antes de que existieran las zonas), que no
  // depende de ningún dato mutable de hoy y queda igual de fija que el resto
  // de esa temporada finalizada.
  const zonaA = useMemo(() => activaCategoria ? equiposOrdenados.filter(t => t.zona === 'A') : [], [equiposOrdenados, activaCategoria]);
  const zonaB = useMemo(() => activaCategoria ? equiposOrdenados.filter(t => t.zona === 'B') : [], [equiposOrdenados, activaCategoria]);
  const usaZonasEnVista = activaCategoria && (zonaA.length > 0 || zonaB.length > 0);
  // Paneles a renderizar en la tabla de posiciones: 2 (Zona A / Zona B)
  // cuando la vista usa zonas, o 1 solo panel "Tabla General" (con todos los
  // equipos de esa temporada juntos, dividido en tercios Oro/Plata/Bronce
  // igual que bandFor de más abajo) para cualquier temporada archivada.
  const panelesTabla = usaZonasEnVista
    ? [{ zona: 'A', lista: zonaA }, { zona: 'B', lista: zonaB }]
    : [{ zona: null, lista: equiposOrdenados }];

  const modeColor = mode === 'femenino' ? 'var(--fem2)' : 'var(--masc2, #3b82f6)';

  // Tabla como estaba antes de la última fecha jugada — para las flechas de
  // "subió / bajó" de la tabla de posiciones.
  const tablaAnterior = useMemo(() => tablaFechaAnterior(partidos, fechas), [partidos, fechas]);

  // En "Resultados / Temporada Regular" no tiene sentido ofrecer un chip para
  // una fecha cuyo único partido terminó re-marcado como playoff (ej: una
  // "Fecha 10" que en realidad era la semifinal) — el chip quedaba
  // seleccionable pero apuntaba a un "sin resultados todavía" fantasma,
  // porque esa fecha ya no tiene ningún partido de temporada regular. El chip
  // sigue existiendo del lado de Fixture (ahí sí puede haber un pendiente) y
  // ese partido sigue viéndose bien del lado de Playoffs — esto solo saca el
  // chip vacío de en medio.
  const fechasConResultadoRegular = useMemo(
    () => fechas.filter(f => partidos.some(p => p.fecha_id === f.id && p.estado === 'finalizado' && !p.es_playoff)),
    [fechas, partidos]);

  // Día de cada jornada para el chip: si la fecha no tiene `fecha_dia`
  // cargado (pasaba con la Fecha 11), se usa el primer día de sus partidos.
  const diaDeFecha = useMemo(() => {
    const m = {};
    for (const f of fechas) {
      const dias = partidos.filter(p => p.fecha_id === f.id).map(p => p.fecha_partido).filter(Boolean).sort();
      m[f.id] = f.fecha_dia ?? dias[0] ?? null;
    }
    return m;
  }, [fechas, partidos]);

  const FechaChips = ({ modo }) => {
    const lista = modo === 'resultados' ? fechasConResultadoRegular : fechasRegulares;
    if (lista.length === 0) return null;
    return (
      <div className="fecha-chips fecha-chips--v3" ref={fechaChipsWheelRef} style={{ marginBottom: 16, '--chip-c': modeColor }}>
        <button
          className={`fx-chip fx-chip--acum${!fechaSelId ? ' is-on' : ''}`}
          onClick={() => setFechaSelId(null)}>
          <b>ACUM</b><small>Todas</small>
        </button>
        {lista.map(f => (
          <button key={f.id}
            className={`fx-chip${fechaSelId === f.id ? ' is-on' : ''}${modo === 'fixture' && f.id === fechaProximaId ? ' is-prox' : ''}`}
            onClick={() => setFechaSelId(prev => prev === f.id ? null : f.id)}>
            <b>F{f.numero}</b><small>{ddmm(diaDeFecha[f.id]) || '—'}</small>
          </button>
        ))}
      </div>
    );
  };

  // Fixture / Playoffs: un chip por instancia (Cuartos, Semis, Final) con su día.
  const InstanciaChips = () => {
    if (instanciasPlayoff.length === 0) return null;
    return (
      <div className="fecha-chips fecha-chips--v3" style={{ marginBottom: 16 }}>
        <button className={`fx-chip fx-chip--po fx-chip--acum${!instanciaSel ? ' is-on' : ''}`}
          onClick={() => setInstanciaSel(null)}>
          <b>Todos</b><small>Playoffs</small>
        </button>
        {instanciasPlayoff.map(({ inst, dia }) => (
          <button key={inst}
            className={`fx-chip fx-chip--po${instanciaSel === inst ? ' is-on' : ''}${inst === instanciaProxima ? ' is-prox' : ''}`}
            onClick={() => setInstanciaSel(prev => prev === inst ? null : inst)}>
            <b>{INSTANCIA_CHIP[inst] ?? inst}</b><small>{ddmm(dia) || 'A definir'}</small>
          </button>
        ))}
      </div>
    );
  };

  // Temporada Regular / Playoffs — dos chips grandes que separan por completo
  // los resultados de fase regular de los de postemporada. El chip de
  // Playoffs solo aparece si ya hay al menos un partido cargado como tal.
  const ResultadosViewChips = (vista = resultadosView, setVista = setResultadosView) => {
    if (!hayPlayoffsCargados) return null;
    return (
      <div className="fecha-chips view-toggle" style={{ marginBottom: 14 }}>
        <button
          className={`fecha-chip ${vista === 'regular' ? 'active' : ''}`}
          onClick={() => setVista('regular')}
          style={vista === 'regular' ? { borderColor: modeColor, color: modeColor } : {}}>
          Temporada Regular
        </button>
        <button
          className={`fecha-chip ${vista === 'playoffs' ? 'active' : ''}`}
          onClick={() => setVista('playoffs')}
          style={vista === 'playoffs' ? { borderColor: '#F0B429', color: '#F0B429' } : {}}>
          Playoffs
        </button>
      </div>
    );
  };

  // Dentro de la vista de Playoffs, filtro secundario por copa (Oro/Plata/
  // Bronce) — solo se muestra si hay resultados de más de una copa cargados.
  const CopaChips = () => {
    if (resultadosView !== 'playoffs' || copasConPlayoff.length < 2) return null;
    return (
      <div className="fecha-chips fecha-chips--v3" style={{ marginBottom: 16 }}>
        <button
          className={`fx-chip fx-chip--po fx-chip--acum${!copaSelId ? ' is-on' : ''}`}
          onClick={() => setCopaSelId(null)}>
          <b>Todas</b><small>Copas</small>
        </button>
        {copasConPlayoff.map(c => (
          <button key={c}
            className={`fx-chip fx-chip--po${copaSelId === c ? ' is-on' : ''}`}
            onClick={() => setCopaSelId(prev => prev === c ? null : c)}
            style={{ '--po-c': COPA_COLOR[c] }}>
            <b>{COPA_LABEL[c].replace('Copa de ', '')}</b><small>Copa</small>
          </button>
        ))}
      </div>
    );
  };

  if (selectedTeamFem) {
    return (
      <TeamPageFem
        team={selectedTeamFem}
        onBack={handleBackFromTeam}
        allTeams={equiposDeTemporada}
        isLoadingStats={isLoadingStats}
        statsPorPartido={statsPorPartido}
        partidos={partidos}
        fechas={fechas}
        onSelectPlayer={handleSelectPlayer}
        mode={mode}
        usaZonas={usaZonasEnVista}
      />
    );
  }

  return (
    <>
      <GameCenterModal
        key={selectedMatch ?? 'none'}
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        partidoId={selectedMatch}
        mode={mode}
      />
      <PlayerProfileModal
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        player={selectedPlayer}
        statsPorPartido={statsPorPartido}
        partidos={partidos}
        fechas={fechas}
        mode={mode}
      />

      <div className="torneo-section" id="torneo-view">
        <div className="torneo-inner">

          <div className="gender-header">
            <div>
              <div className="gender-pill">
                {mode === 'masculino' ? 'Categoria Masculina' : 'Categoria Femenina'}
              </div>
              <div className="gender-title" style={{ fontSize: '64px', lineHeight: 1 }}>
                TORNEO<br/>{mode === 'masculino' ? 'MASCULINO' : 'FEMENINO'}
              </div>
            </div>
            <div style={{ textAlign: 'right', paddingTop: '8px' }}>
              <div style={{ fontFamily: "'Barlow Condensed'", fontSize: '14px', fontWeight: '700', letterSpacing: '2px', color: 'var(--gray)', textTransform: 'uppercase' }}>
                Temporada Regular
              </div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: '28px', letterSpacing: '2px', color: modeColor, marginTop: '4px' }}>
                {fechas.length > 0 ? (() => {
                  // Los partidos de playoff no cuentan acá — este encabezado
                  // es "en qué fecha va la temporada regular", no postemporada.
                  const jugadas = fechas.filter(f => partidos.some(p => p.fecha_id === f.id && p.estado === 'finalizado' && !p.es_playoff));
                  return jugadas.length > 0 ? `Fecha ${Math.max(...jugadas.map(f => f.numero))}` : 'Jornada 1';
                })() : 'Jornada 1'}
              </div>
            </div>
          </div>

          <FavoritoCard onSelectTeam={handleSelectTeam}/>

          {statsError && (
            <div className="stats-error-banner">
              Error al cargar estadisticas. Reintentando...
            </div>
          )}

          <div className="tab-nav tnv" style={{ '--tnv-c': modeColor }}>
            {TABS.map(tab => (
              <button key={tab.key} type="button"
                className={`tnv-tab${activeTab === tab.key ? ' is-on' : ''}`}
                onClick={() => setActiveTab(tab.key)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {TAB_ICONOS[tab.key]}
                </svg>
                {tab.key === 'jugadores' ? (mode === 'femenino' ? 'Jugadoras' : 'Jugadores') : tab.label}
              </button>
            ))}
          </div>

          <div className="tab-swipe-dots">
            {TABS.map(t => (
              <span key={t.key}
                className={`tab-dot ${activeTab === t.key ? 'active' : ''}`}
                style={activeTab === t.key ? { background: modeColor, transform: 'scale(1.3)' } : {}}
                onClick={() => setActiveTab(t.key)}/>
            ))}
          </div>

          <div {...swipeHandlers} style={{ touchAction: 'pan-y' }}>

            {activeTab === 'tabla' && (
              <div>
                {isLoadingStats ? <TableSkeleton/> : (
                  <>
                  <div className={`tp2-wrap${panelesTabla.length === 1 ? ' tp2-wrap--una' : ''}`}>
                    {panelesTabla.map(({ zona, lista }) => (
                      <TablaZona key={zona ?? 'general'}
                        titulo={zona ? `Zona ${zona}` : 'Tabla general'}
                        lista={lista}
                        anterior={tablaAnterior}
                        modeColor={modeColor}
                        esFavorito={esFavorito}
                        onSelect={handleSelectTeam}
                        vacio={zona ? 'Sin equipos asignados a esta zona' : 'Sin equipos en esta temporada'}/>
                    ))
                  }
                  </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'resultados' && (
              <div>
                {/* Se llaman como funciones (no como <Componente/>): al estar
                    definidos adentro del render, como componentes se
                    desmontaban en cada render y la fila de chips volvía al
                    principio del scroll después de tocar uno de la derecha. */}
                {ResultadosViewChips()}
                {resultadosView === 'playoffs' ? CopaChips() : FechaChips({ modo: 'resultados' })}
                {isLoadingStats ? <ResultSkeleton/> : (
                  partidosFinalizados.length === 0 ? (
                    resultadosView === 'playoffs' ? (
                      <EmptyState icon="🏆" title="Sin resultados de playoffs todavia"
                        sub="Los resultados de postemporada apareceran aca en cuanto se cargue el primer partido."/>
                    ) : (
                      <EmptyState icon="🏀" title="Sin resultados todavia"
                        sub="Los resultados apareceran aca en cuanto se cargue el primer partido."/>
                    )
                  ) : (
                    <div className="results-grid">
                      {partidosFinalizados.map(p => (
                        <ResultadoCard key={p.id} partido={p}
                          equiposFem={equiposFemenino}
                          jugadorasMap={jugadorasMap}
                          fechas={fechas}
                          onClick={() => setSelectedMatch(p.id)}/>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}

            {activeTab === 'fixture' && (
              <div>
                {ResultadosViewChips(fixtureView, setFixtureView)}
                {fixtureView === 'playoffs' ? InstanciaChips() : FechaChips({ modo: 'fixture' })}
                {isLoadingStats ? <ResultSkeleton/> : (
                  partidosPendientes.length === 0 ? (
                    <EmptyState icon="📅" title="Sin partidos en esta fecha"
                      sub="Todavia no hay partidos cargados para esta fecha."/>
                  ) : (
                    <div className="fixture-grid">
                      {(() => {
                        let lastDia = null;
                        const porDia = {};
                        for (const q of partidosPendientes) (porDia[fechaCalendario(q)] ??= []).push(q);
                        return partidosPendientes.map(p => {
                          const diaCal = fechaCalendario(p);
                          const mostrarDivisor = diaCal && diaCal !== lastDia;
                          lastDia = diaCal;
                          return (
                            <div key={p.id} style={{ display: 'contents' }}>
                              {mostrarDivisor && (
                                <DiaSeparador fechaISO={diaCal} partidosDia={porDia[diaCal] ?? []}/>
                              )}
                              {p.estado === 'finalizado' ? (
                                <ResultadoCard partido={p}
                                  equiposFem={equiposFemenino}
                                  jugadorasMap={jugadorasMap}
                                  fechas={fechas}
                                  onClick={() => setSelectedMatch(p.id)}/>
                              ) : (
                                <ProximoCard partido={p}
                                  equiposFem={equiposFemenino} fechas={fechas}/>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )
                )}
              </div>
            )}

            {activeTab === 'jugadores' && (
              <div>
                <input type="text" className="search-bar"
                  placeholder={mode === 'femenino' ? 'Buscar jugadora...' : 'Buscar jugador...'}
                  value={searchJugadoras}
                  onChange={e => setSearchJugadoras(e.target.value)}
                  style={{ marginBottom: '12px' }}/>

                <div className="chips-fade-wrap">
                  <div className="filter-chips" ref={filterChipsWheelRef}>
                    <button
                      className={`chip ${!filterEquipoId ? 'chip-active' : ''}`}
                      style={!filterEquipoId ? { borderColor: modeColor, color: modeColor } : {}}
                      onClick={() => setFilterEquipoId(null)}>
                      Todos
                    </button>
                    {equiposDeTemporada.map(eq => (
                      <button key={eq.id}
                        className={`chip ${filterEquipoId === eq.id ? 'chip-active' : ''}`}
                        style={filterEquipoId === eq.id ? { borderColor: eq.color, color: eq.color, background: `${eq.color}15` } : {}}
                        onClick={() => setFilterEquipoId(prev => prev === eq.id ? null : eq.id)}>
                        <img src={eq.logo} alt="" loading="lazy" decoding="async"
                          style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }}
                          onError={e => { e.target.style.display = 'none'; }}/>
                        {eq.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="jugadoras-count" style={{ marginBottom: '16px' }}>
                  {jugadorasFiltradas.length} {mode === 'femenino' ? 'jugadoras' : 'jugadores'}
                </div>

                <div className="players-grid">
                  {isLoadingStats ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="player-item">
                        <div className="player-item-inner">
                          <Skel w={44} h={44} radius={22} mb={0} style={{ flexShrink: 0 }}/>
                          <div style={{ flex: 1 }}>
                            <Skel w="70%" h={14} mb={6}/>
                            <Skel w="50%" h={11} mb={0}/>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : jugadorasFiltradas.length === 0 ? (
                    <div style={{ gridColumn: '1/-1' }}>
                      <EmptyState icon="🔍"
                        title={searchJugadoras ? `Sin resultados para "${searchJugadoras}"` : (mode === 'femenino' ? 'Sin jugadoras' : 'Sin jugadores')}
                        sub={mode === 'femenino' ? 'Proba con otro nombre o equipo' : 'Van a aparecer apenas se juegue la primera fecha'} showIG={false}/>
                    </div>
                  ) : (
                    jugadorasVisibles.map(j => (
                      <div className="player-item" key={j.id}
                        style={{ background: `linear-gradient(160deg, ${hexA(j.equipoColor, '60')}, #1C2535 60%)` }}
                        onClick={() => handleSelectPlayer({
                          ...j,
                          id: j.id, name: j.nombre, team: j.equipo,
                          fechaNac: j.fechaNac, equipoId: j.equipoId,
                          color: j.equipoColor,
                          sc_total: j.sc_total ?? 0, sf_total: j.sf_total ?? 0,
                          dc_total: j.dc_total ?? 0, df_total: j.df_total ?? 0,
                          tc_total: j.tc_total ?? 0, tf_total: j.tf_total ?? 0,
                          sc_prom:  j.sc_prom  ?? 0, dc_prom: j.dc_prom ?? 0,
                          tc_prom:  j.tc_prom  ?? 0,
                        })}>
                        <div className="player-item-inner" style={{ background: `linear-gradient(160deg, ${hexA(j.equipoColor, '12')}, #0B111C 55%)` }}>
                        <div className="player-item-avatar"
                          style={{ background: `${j.equipoColor}22`, border: `1.5px solid ${j.equipoColor}`, boxShadow: `0 0 10px ${hexA(j.equipoColor, '59')}` }}>
                          <EscudoJugador logo={j.equipoLogo} equipoId={j.equipoId} nombre={j.nombre} color={j.equipoColor}/>
                        </div>
                        <div className="player-item-info">
                          <div className="player-item-name">{j.nombre}</div>
                          <div className="player-item-team">{j.equipo}</div>
                          {(j.pts_prom ?? 0) > 0 && (
                            <div className="player-item-stats">
                              <span style={{ color: '#F0B429' }}>{j.pts_prom} PTS</span>
                              <span style={{ color: '#4A566E' }}> - </span>
                              <span>{j.reb_prom} REB</span>
                              <span style={{ color: '#4A566E' }}> - </span>
                              <span>{j.ast_prom} AST</span>
                            </div>
                          )}
                        </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {playersVisible < jugadorasFiltradas.length && (
                  <button
                    className="load-more-btn"
                    onClick={() => setPlayersVisible(v => v + PLAYERS_PAGE_SIZE)}
                    style={{ borderColor: modeColor, color: modeColor }}>
                    Cargar más ({jugadorasFiltradas.length - playersVisible} restantes)
                  </button>
                )}
              </div>
            )}

            {activeTab === 'equipos' && (
              <div className="teams-grid">
                {equiposDeTemporada.map(team => (
                  <div
                    className={`flip-card${tappedCard === team.id ? ' tapped' : ''}`}
                    key={team.id}
                    onClick={() => {
                      const isTouch = window.matchMedia('(hover: none)').matches;
                      if (isTouch && tappedCard !== team.id) setTappedCard(team.id);
                      else { setTappedCard(null); handleSelectTeam(team); }
                    }}
                    onMouseLeave={() => setTappedCard(null)}>
                    <button
                      className={`fc-fav-btn ${esFavorito(team.id) ? 'active' : ''}`}
                      onClick={e => { e.stopPropagation(); toggleFavorito(team.id); }}
                      title={esFavorito(team.id) ? 'Quitar favorito' : 'Marcar como favorito'}>
                      {esFavorito(team.id) ? '*' : 'o'}
                    </button>
                    <div className="flip-card-inner">
                      <div className="flip-card-front" style={{ background: `linear-gradient(160deg, ${hexA(team.color, '70')}, #1C2535 65%)` }}>
                        <div className="fc-front-inner" style={{ background: `linear-gradient(160deg, ${hexA(team.color, '14')}, #0B111C 60%)` }}>
                          <div className="fc-logo-wrap" style={{ borderColor: team.color, boxShadow: `0 0 16px ${hexA(team.color, '59')}` }}>
                            <img src={team.logo} alt={team.name} className="fc-logo-img" loading="lazy" decoding="async"
                              onError={e => { e.target.style.background = 'var(--dark4)'; }}/>
                          </div>
                          <h3 className="fc-name">{team.name}</h3>
                          <div className="fc-subtitle" style={{ color: team.color }}>{team.jugadoras.length} {mode === 'femenino' ? 'jugadoras' : 'jugadores'}</div>
                          {team.pj > 0 && (
                            <div style={{ marginTop: 6, fontSize: 13, color: team.color, fontFamily: "'Bebas Neue',sans-serif", letterSpacing: 1 }}>
                              {team.pg}G - {team.pp}P
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flip-card-back" style={{ borderColor: team.color }}>
                        <img src={team.logo} alt="bg" className="fc-back-logo" loading="lazy" decoding="async"/>
                        <div className="fc-record-label">RECORD ACTUAL</div>
                        <div className="fc-record-val" style={{ color: team.color }}>{team.pg} - {team.pp}</div>
                        <div className="fc-team-name">{team.name}</div>
                        <div style={{ marginTop: '12px', fontSize: '13px', fontFamily: "'Barlow Condensed'", color: 'var(--gray)', letterSpacing: '1px' }}>
                          TAP PARA VER PLANTEL
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}














