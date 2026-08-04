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
import { GameCenterModal }  from './GameCenterModal';
import { PlayerProfileModal } from './PlayerProfileModal';
import { TeamPageFem }      from './TeamPageFem';
import { FavoritoCard }     from './FavoritoCard';
import { useStats }         from '../context/StatsContext';
import { useSwipe }         from '../hooks/useSwipe';
import { useFavorito }      from '../hooks/useFavorito';

const TABS = [
  { key: 'tabla',      label: 'Tabla'     },
  { key: 'resultados', label: 'Resultados' },
  { key: 'fixture',    label: 'Fixture'    },
  { key: 'jugadores',  label: 'Jugadoras'  },
  { key: 'equipos',    label: 'Equipos'    },
];

const IG_URL = 'https://www.instagram.com/torneostar.basquet/';

function buildJugadorasMap(equipos) {
  const map = {};
  for (const eq of equipos) {
    for (const j of eq.jugadoras ?? []) {
      map[j.id] = { ...j, equipoNombre: eq.name, equipoColor: eq.color };
    }
  }
  return map;
}

// Sistema de copas: banda segun posicion en la tabla (femenino: general; masculino: por zona)
function bandFor(rank) {
  if (rank <= 4) return { label: 'Copa de Oro', color: '#F0B429', tint: 'rgba(240,180,41,.06)' };
  if (rank <= 8) return { label: 'Copa de Plata', color: '#C7D1DD', tint: 'rgba(199,209,221,.045)' };
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

function MatchResultCard({ partido, equiposFem, jugadorasMap, fechas, onClick }) {
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

  const mvpJug = partido.mvp_jugadora_id ? jugadorasMap[partido.mvp_jugadora_id] : null;

  return (
    <div className="result-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="rc-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="rc-fecha">
            {fecha ? `Fecha ${fecha.numero}` : 'Partido'}
            {fecha?.fecha_dia && ` - ${fecha.fecha_dia.split('-').reverse().slice(0,2).join('/')}`}
          </span>
          {partido.hora_inicio && (
            <span style={{ fontSize: 11, color: '#4A566E', fontFamily: "'Barlow Condensed',sans-serif" }}>
              {String(partido.hora_inicio).slice(0, 5)}
            </span>
          )}
        </div>
        <span className={`rc-estado ${enVivo ? 'en-vivo' : 'finalizado'}`}>
          {enVivo ? 'EN VIVO' : 'FINAL'}
        </span>
      </div>

      <div className="rc-body">
        <div className={`rc-equipo ${ganLocal ? 'ganador' : ''}`}>
          <img src={localEq.logo} alt={localEq.name} className="rc-logo" loading="lazy"
            onError={e => { e.target.style.display = 'none'; }}/>
          <span className="rc-nombre">{localEq.name}</span>
          <span className="rc-pts" style={{ color: ganLocal ? localEq.color : '#6B7A99' }}>
            {ptsLocal}
          </span>
        </div>
        <div className="rc-sep">-</div>
        <div className={`rc-equipo rc-equipo-visit ${!ganLocal ? 'ganador' : ''}`}>
          <span className="rc-pts" style={{ color: !ganLocal ? visitEq.color : '#6B7A99' }}>
            {ptsVisit}
          </span>
          <span className="rc-nombre">{visitEq.name}</span>
          <img src={visitEq.logo} alt={visitEq.name} className="rc-logo" loading="lazy"
            onError={e => { e.target.style.display = 'none'; }}/>
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
  );
}

function FixtureCard({ partido, equiposFem, fechas }) {
  const localEq = equiposFem.find(e => e.id === partido.equipo_local_id);
  const visitEq = equiposFem.find(e => e.id === partido.equipo_visit_id);
  const fecha   = fechas.find(f => f.id === partido.fecha_id);
  if (!localEq || !visitEq) return null;
  return (
    <div className="fixture-card">
      <div className="fc2-header">
        <span className="fc2-fecha">
          {fecha ? `Fecha ${fecha.numero}` : 'Proximo'}
          {fecha?.fecha_dia && ` - ${fecha.fecha_dia.split('-').reverse().slice(0,2).join('/')}`}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {partido.hora_inicio && (
            <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, color: '#F0B429', letterSpacing: .5 }}>
              {String(partido.hora_inicio).slice(0, 5)}
            </span>
          )}
          {partido.lugar && <span className="fc2-lugar">{partido.lugar}</span>}
        </div>
      </div>
      <div className="fc2-body">
        <div className="fc2-equipo">
          <img src={localEq.logo} alt={localEq.name} className="fc2-logo" loading="lazy"
            onError={e => { e.target.style.display = 'none'; }}/>
          <span className="fc2-nombre" style={{ color: localEq.color }}>{localEq.name}</span>
        </div>
        <div className="fc2-vs">VS</div>
        <div className="fc2-equipo fc2-equipo-right">
          <span className="fc2-nombre" style={{ color: visitEq.color }}>{visitEq.name}</span>
          <img src={visitEq.logo} alt={visitEq.name} className="fc2-logo" loading="lazy"
            onError={e => { e.target.style.display = 'none'; }}/>
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

  const [activeTab,       setActiveTab]       = useState('tabla');
  const [prevTab,         setPrevTab]         = useState('tabla');
  const [selectedMatch,   setSelectedMatch]   = useState(null);
  const [selectedPlayer,  setSelectedPlayer]  = useState(null);
  const [selectedTeamId,  setSelectedTeamId]  = useState(null);
  const [searchJugadoras, setSearchJugadoras] = useState('');
  const [filterEquipoId,  setFilterEquipoId]  = useState(null);
  const [tappedCard,      setTappedCard]      = useState(null);
  const [fechaSelId,      setFechaSelId]      = useState(null);

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

  const jugadorasFiltradas = useMemo(() => {
    const q = searchJugadoras.toLowerCase();
    return equiposFemenino.flatMap(team =>
      team.jugadoras
        .filter(j => {
          const matchSearch = !q || j.nombre.toLowerCase().includes(q);
          const matchEq     = !filterEquipoId || team.id === filterEquipoId;
          return matchSearch && matchEq;
        })
        .map(j => ({ ...j, equipo: team.name, equipoColor: team.color, equipoId: team.id, equipoLogo: team.logo }))
    );
  }, [equiposFemenino, searchJugadoras, filterEquipoId]);

  const partidosFinalizados = useMemo(() =>
    partidos
      .filter(p => p.estado === 'finalizado')
      .filter(p => !fechaSelId || p.fecha_id === fechaSelId)
      .sort((a, b) => (b.fecha_id ?? 0) - (a.fecha_id ?? 0)),
    [partidos, fechaSelId]);

  const partidosPendientes = useMemo(() =>
    partidos
      
      .filter(p => !fechaSelId || p.fecha_id === fechaSelId)
      .sort((a, b) => {
        const df = (a.fecha_id ?? 0) - (b.fecha_id ?? 0);
        if (df !== 0) return df;
        return (a.hora_inicio ?? '99:99').localeCompare(b.hora_inicio ?? '99:99');
      }),
    [partidos, fechaSelId]);

  const equiposOrdenados = useMemo(() =>
    [...equiposFemenino].sort((a, b) => {
      const ptsA = a.pg * 2 + a.pp, ptsB = b.pg * 2 + b.pp;
      if (ptsB !== ptsA) return ptsB - ptsA;
      const difA = a.pf - a.pc, difB = b.pf - b.pc;
      if (difB !== difA) return difB - difA;
      return b.pf - a.pf;
    }),
    [equiposFemenino]);

  // Masculino: tabla dividida en Zona A / Zona B (asignación en equipos_masculino.zona)
  const zonaA = useMemo(() => equiposOrdenados.filter(t => t.zona === 'A'), [equiposOrdenados]);
  const zonaB = useMemo(() => equiposOrdenados.filter(t => t.zona === 'B'), [equiposOrdenados]);

  const modeColor = mode === 'femenino' ? 'var(--fem2)' : 'var(--masc2, #3b82f6)';

  const FechaChips = ({ modo }) => {
    if (fechas.length === 0) return null;
    return (
      <div className="fecha-chips" style={{ marginBottom: 16 }}>
        <button
          className={`fecha-chip ${!fechaSelId ? 'active' : ''}`}
          onClick={() => setFechaSelId(null)}
          style={!fechaSelId ? { borderColor: modeColor, color: modeColor } : {}}>
          ACUM
        </button>
        {fechas.map(f => (
          <button key={f.id}
            className={`fecha-chip ${fechaSelId === f.id ? 'active' : ''}`}
            onClick={() => setFechaSelId(prev => prev === f.id ? null : f.id)}
            style={fechaSelId === f.id ? { borderColor: modeColor, color: modeColor } : {}}>
            F{f.numero}
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
        allTeams={equiposFemenino}
        isLoadingStats={isLoadingStats}
        statsPorPartido={statsPorPartido}
        partidos={partidos}
        fechas={fechas}
        onSelectPlayer={handleSelectPlayer}
        mode={mode}
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
                  const jugadas = fechas.filter(f => partidos.some(p => p.fecha_id === f.id && p.estado === 'finalizado'));
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

          <div className="tab-nav">
            {TABS.map(tab => (
              <button key={tab.key} type="button"
                className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                style={activeTab === tab.key ? { color: modeColor, borderBottomColor: modeColor } : {}}
                onClick={() => setActiveTab(tab.key)}>
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
                {isLoadingStats ? <TableSkeleton/> : mode === 'femenino' ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left', paddingLeft: '20px' }}># Equipo</th>
                          <th>PJ</th><th>G</th><th>P</th>
                          <th>PF</th><th>PC</th><th>DIF</th><th>%</th>
                          <th style={{ color: modeColor }}>PTS</th>
                          <th className="th-racha">Forma</th>
                        </tr>
                      </thead>
                      <tbody>
                        {equiposOrdenados.flatMap((t, idx) => {
                          const pct = t.pj > 0 ? (t.pg / t.pj).toFixed(3) : '.000';
                          const dif = t.pf - t.pc;
                          const band = bandFor(idx + 1);
                          const isBandStart = idx === 0 || idx === 4 || idx === 8;
                          const rows = [];
                          if (isBandStart) {
                            rows.push(
                              <tr key={`band-${idx}`}>
                                <td colSpan={9} style={{ padding: '12px 16px 6px', fontFamily: "'Barlow Condensed'", fontSize: 10.5, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: band.color, borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,.08)' }}>
                                  {band.label}
                                </td>
                              </tr>
                            );
                          }
                          rows.push(
                            <tr key={t.id} className="table-row-clickable" onClick={() => handleSelectTeam(t)}
                              style={{ background: band.tint, boxShadow: `inset 3px 0 0 ${band.color}` }}>
                              <td className="team-cell">
                                <span className={`pos-num ${idx < 3 ? 'top3' : ''}`} style={{ color: band.color }}>{idx + 1}</span>
                                <img src={t.logo} alt={t.name} decoding="async"
                                  style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', marginRight: '8px' }}
                                  onError={e => { e.target.style.display = 'none'; }}/>
                                <span className="team-name-txt">{t.name}</span>
                                {esFavorito(t.id) && <span className="fav-star">*</span>}
                              </td>
                              <td>{t.pj}</td><td>{t.pg}</td><td>{t.pp}</td>
                              <td>{t.pf}</td><td>{t.pc}</td>
                              <td className={dif >= 0 ? 'green' : 'red'}>{dif > 0 ? `+${dif}` : dif}</td>
                              <td className="pct-td">{pct}</td>
                              <td className="pts-td" style={{ color: modeColor }}>{t.pg * 2 + t.pp}</td>
                              <td className="td-racha">
                                {t.historial?.slice(-5).map((h, i) => (
                                  <span key={i} className={`racha-pill ${h.resultado === 'G' ? 'racha-g' : 'racha-p'}`}>
                                    {h.resultado}
                                  </span>
                                ))}
                                {!t.historial?.length && <span className="racha-nd">-</span>}
                              </td>
                            </tr>
                          );
                          return rows;
                        })}
                      </tbody>
                    </table>
                    <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: "'Barlow Condensed'", fontSize: 11.5, letterSpacing: 1.5, color: '#8a96ad', textTransform: 'uppercase' }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: '#F0B429', display: 'inline-block' }}/>
                          Copa de Oro - 1 a 4
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: "'Barlow Condensed'", fontSize: 11.5, letterSpacing: 1.5, color: '#8a96ad', textTransform: 'uppercase' }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: '#C7D1DD', display: 'inline-block' }}/>
                          Copa de Plata - 5 a 8
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: "'Barlow Condensed'", fontSize: 11.5, letterSpacing: 1.5, color: '#8a96ad', textTransform: 'uppercase' }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: '#CD7F32', display: 'inline-block' }}/>
                          Copa de Bronce - 9+
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--gray)', textAlign: 'right' }}>
                        Desempate: PTS -&gt; DIF -&gt; PF
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="zonas-grid">
                    {[{ zona: 'A', lista: zonaA }, { zona: 'B', lista: zonaB }].map(({ zona, lista }) => (
                      <div className="table-wrap zona-tabla" key={zona}>
                        <div className="zona-tabla-title" style={{ color: modeColor }}>ZONA {zona}</div>
                        <table>
                          <thead>
                            <tr>
                              <th style={{ textAlign: 'left', paddingLeft: '20px' }}># Equipo</th>
                              <th>PJ</th><th>G</th><th>P</th>
                              <th>PF</th><th>PC</th><th>DIF</th><th>%</th>
                              <th style={{ color: modeColor }}>PTS</th>
                              <th className="th-racha">Forma</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lista.length === 0 ? (
                              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '20px', color: 'var(--gray)' }}>Sin equipos asignados a esta zona</td></tr>
                            ) : lista.flatMap((t, idx) => {
                              const pct = t.pj > 0 ? (t.pg / t.pj).toFixed(3) : '.000';
                              const dif = t.pf - t.pc;
                              const band = bandFor(idx + 1);
                              const isBandStart = idx === 0 || idx === 4 || idx === 8;
                              const rows = [];
                              if (isBandStart) {
                                rows.push(
                                  <tr key={`band-${zona}-${idx}`}>
                                    <td colSpan={9} style={{ padding: '12px 16px 6px', fontFamily: "'Barlow Condensed'", fontSize: 10.5, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: band.color, borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,.08)' }}>
                                      {band.label}
                                    </td>
                                  </tr>
                                );
                              }
                              rows.push(
                                <tr key={t.id} className="table-row-clickable" onClick={() => handleSelectTeam(t)}
                                  style={{ background: band.tint, boxShadow: `inset 3px 0 0 ${band.color}` }}>
                                  <td className="team-cell">
                                    <span className={`pos-num ${idx < 3 ? 'top3' : ''}`} style={{ color: band.color }}>{idx + 1}</span>
                                    <img src={t.logo} alt={t.name} decoding="async"
                                      style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', marginRight: '8px' }}
                                      onError={e => { e.target.style.display = 'none'; }}/>
                                    <span className="team-name-txt">{t.name}</span>
                                    {esFavorito(t.id) && <span className="fav-star">*</span>}
                                  </td>
                                  <td>{t.pj}</td><td>{t.pg}</td><td>{t.pp}</td>
                                  <td>{t.pf}</td><td>{t.pc}</td>
                                  <td className={dif >= 0 ? 'green' : 'red'}>{dif > 0 ? `+${dif}` : dif}</td>
                                  <td className="pct-td">{pct}</td>
                                  <td className="pts-td" style={{ color: modeColor }}>{t.pg * 2 + t.pp}</td>
                                  <td className="td-racha">
                                    {t.historial?.slice(-5).map((h, i) => (
                                      <span key={i} className={`racha-pill ${h.resultado === 'G' ? 'racha-g' : 'racha-p'}`}>
                                        {h.resultado}
                                      </span>
                                    ))}
                                    {!t.historial?.length && <span className="racha-nd">-</span>}
                                  </td>
                                </tr>
                              );
                              return rows;
                            })}
                          </tbody>
                        </table>
                        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: "'Barlow Condensed'", fontSize: 11.5, letterSpacing: 1.5, color: '#8a96ad', textTransform: 'uppercase' }}>
                              <span style={{ width: 10, height: 10, borderRadius: 3, background: '#F0B429', display: 'inline-block' }}/>
                              Copa de Oro - 1 a 4
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: "'Barlow Condensed'", fontSize: 11.5, letterSpacing: 1.5, color: '#8a96ad', textTransform: 'uppercase' }}>
                              <span style={{ width: 10, height: 10, borderRadius: 3, background: '#C7D1DD', display: 'inline-block' }}/>
                              Copa de Plata - 5 a 8
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: "'Barlow Condensed'", fontSize: 11.5, letterSpacing: 1.5, color: '#8a96ad', textTransform: 'uppercase' }}>
                              <span style={{ width: 10, height: 10, borderRadius: 3, background: '#CD7F32', display: 'inline-block' }}/>
                              Copa de Bronce - 9+
                            </div>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--gray)', textAlign: 'right' }}>
                            Desempate: PTS -&gt; DIF -&gt; PF
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'resultados' && (
              <div>
                <FechaChips modo="resultados"/>
                {isLoadingStats ? <ResultSkeleton/> : (
                  partidosFinalizados.length === 0 ? (
                    <EmptyState icon="B" title="Sin resultados todavia"
                      sub="Los resultados apareceran aca en cuanto se cargue el primer partido."/>
                  ) : (
                    <div className="results-grid">
                      {partidosFinalizados.map(p => (
                        <MatchResultCard key={p.id} partido={p}
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
                <FechaChips modo="fixture"/>
                {isLoadingStats ? <ResultSkeleton/> : (
                  partidosPendientes.length === 0 ? (
                    <EmptyState icon="C" title="Sin partidos en esta fecha"
                      sub="Todavia no hay partidos cargados para esta fecha."/>
                  ) : (
                    <div className="fixture-grid">
                      {partidosPendientes.map(p => (
                        p.estado === 'finalizado' ? (
                          <MatchResultCard key={p.id} partido={p}
                            equiposFem={equiposFemenino}
                            jugadorasMap={jugadorasMap}
                            fechas={fechas}
                            onClick={() => setSelectedMatch(p.id)}/>
                        ) : (
                          <FixtureCard key={p.id} partido={p}
                            equiposFem={equiposFemenino} fechas={fechas}/>
                        )
                      ))}
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

                <div className="filter-chips">
                  <button
                    className={`chip ${!filterEquipoId ? 'chip-active' : ''}`}
                    style={!filterEquipoId ? { borderColor: modeColor, color: modeColor } : {}}
                    onClick={() => setFilterEquipoId(null)}>
                    Todos
                  </button>
                  {equiposFemenino.map(eq => (
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

                <div className="jugadoras-count" style={{ marginBottom: '16px' }}>
                  {jugadorasFiltradas.length} {mode === 'femenino' ? 'jugadoras' : 'jugadores'}
                </div>

                <div className="players-grid">
                  {isLoadingStats ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="player-item">
                        <Skel w={44} h={44} radius={22} mb={0} style={{ flexShrink: 0 }}/>
                        <div style={{ flex: 1 }}>
                          <Skel w="70%" h={14} mb={6}/>
                          <Skel w="50%" h={11} mb={0}/>
                        </div>
                      </div>
                    ))
                  ) : jugadorasFiltradas.length === 0 ? (
                    <div style={{ gridColumn: '1/-1' }}>
                      <EmptyState icon="?"
                        title={searchJugadoras ? `Sin resultados para "${searchJugadoras}"` : (mode === 'femenino' ? 'Sin jugadoras' : 'Sin jugadores')}
                        sub={mode === 'femenino' ? 'Proba con otro nombre o equipo' : 'Los planteles se van a ir cargando desde el panel'} showIG={false}/>
                    </div>
                  ) : (
                    jugadorasFiltradas.map(j => (
                      <div className="player-item" key={j.id}
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
                        <div className="player-item-avatar"
                          style={{ background: `${j.equipoColor}22`, border: `1.5px solid ${j.equipoColor}55` }}>
                          <span style={{ fontFamily: "'Barlow Condensed'", fontSize: '14px', fontWeight: '700', color: j.equipoColor }}>
                            {j.nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                          </span>
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
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'equipos' && (
              <div className="teams-grid">
                {equiposFemenino.map(team => (
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
                      <div className="flip-card-front">
                        <div className="fc-logo-wrap" style={{ borderColor: team.color }}>
                          <img src={team.logo} alt={team.name} className="fc-logo-img" loading="lazy" decoding="async"
                            onError={e => { e.target.style.background = 'var(--dark4)'; }}/>
                        </div>
                        <h3 className="fc-name">{team.name}</h3>
                        <div className="fc-subtitle">{team.jugadoras.length} {mode === 'femenino' ? 'jugadoras' : 'jugadores'}</div>
                        {team.pj > 0 && (
                          <div style={{ marginTop: 6, fontSize: 13, color: team.color, fontFamily: "'Bebas Neue',sans-serif", letterSpacing: 1 }}>
                            {team.pg}G - {team.pp}P
                          </div>
                        )}
                      </div>
                      <div className="flip-card-back">
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














