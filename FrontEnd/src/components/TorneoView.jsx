import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import { GameCenterModal } from './GameCenterModal';
import { UpcomingMatchWidget } from './UpcomingMatchWidget';
import { PlayerProfileModal } from './PlayerProfileModal';
import { TeamPageFem } from './TeamPageFem';
import { FavoritoCard } from './FavoritoCard';
import { useFemeninoStats } from '../hooks/useFemeninoStats';
import { useSwipe } from '../hooks/useSwipe';
import { useFavorito } from '../hooks/useFavorito';

import logoMambas   from '../assets/logo_mambas.png';
import logoToros    from '../assets/logo_toros.png';
import logoSpartans from '../assets/logo_spartans.png';

const TABS = [
  { key: 'tabla',     label: '📊 Tabla'    },
  { key: 'fixture',   label: '📅 Fixture'  },
  { key: 'jugadores', label: '👤 Jugadoras'},
  { key: 'equipos',   label: '🏀 Equipos'  },
];

const TEAMS_MASC = [
  { id: 'm1', name: 'Black Mambas', logo: logoMambas,  record: '7 - 0', color: '#3b82f6', pg: 7, pp: 0 },
  { id: 'm2', name: 'Los Toros',    logo: logoToros,   record: '6 - 1', color: '#ef4444', pg: 6, pp: 1 },
  { id: 'm3', name: 'Spartans',     logo: logoSpartans,record: '5 - 2', color: '#b45309', pg: 5, pp: 2 },
];

const IG_URL = 'https://www.instagram.com/torneostar.basquet/';

function EmptyState({ icon, title, sub, showIG = true }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      <div className="empty-sub">{sub}</div>
      {showIG && (
        <a href={IG_URL} target="_blank" rel="noopener noreferrer" className="empty-ig-btn">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
          Seguinos en Instagram
        </a>
      )}
    </div>
  );
}

export function TorneoView({ onSelectPlayer: extSelectPlayer, onSelectTeam: extSelectTeam }) {
  const { mode } = useTournament();
  const { equipos: equiposFemenino, isLoading: isLoadingStats, error: statsError } = useFemeninoStats();
  const { toggleFavorito, esFavorito } = useFavorito();

  const [activeTab, setActiveTab]           = useState('tabla');
  const [selectedMatch, setSelectedMatch]   = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [searchJugadoras, setSearchJugadoras] = useState('');
  const [filterEquipoId, setFilterEquipoId]   = useState(null);
  const [tappedCard, setTappedCard]           = useState(null);

  const selectedTeamFem = selectedTeamId
    ? equiposFemenino.find(e => e.id === selectedTeamId) ?? null
    : null;

  const tabKeys = TABS.map(t => t.key);

  // Swipe entre tabs
  const goNextTab = useCallback(() => {
    const idx = tabKeys.indexOf(activeTab);
    if (idx < tabKeys.length - 1) setActiveTab(tabKeys[idx + 1]);
  }, [activeTab, tabKeys]);
  const goPrevTab = useCallback(() => {
    const idx = tabKeys.indexOf(activeTab);
    if (idx > 0) setActiveTab(tabKeys[idx - 1]);
  }, [activeTab, tabKeys]);
  const swipeHandlers = useSwipe({ onSwipeLeft: goNextTab, onSwipeRight: goPrevTab });

  // Escuchar evento del navbar
  useEffect(() => {
    const handler = (e) => {
      if (TABS.find(t => t.key === e.detail?.tab)) {
        setActiveTab(e.detail.tab);
        setSelectedTeamId(null);
      }
    };
    window.addEventListener('star:tab', handler);
    return () => window.removeEventListener('star:tab', handler);
  }, []);

  // Re-activar reveal al cambiar tab
  useEffect(() => {
    const timer = setTimeout(() => {
      document.querySelectorAll('.reveal-on-scroll:not(.in-view)').forEach(el => el.classList.add('in-view'));
    }, 80);
    return () => clearTimeout(timer);
  }, [activeTab]);

  const handleSelectPlayer = (p) => { setSelectedPlayer(p); extSelectPlayer?.(p); };
  const handleSelectTeam   = (t) => { setSelectedTeamId(t.id); extSelectTeam?.(t); };

  // Jugadoras filtradas — memoizadas para evitar re-renders
  const jugadorasFiltradas = useMemo(() => {
    const q = searchJugadoras.toLowerCase();
    return equiposFemenino.flatMap(team =>
      team.jugadoras
        .filter(j => {
          const matchSearch = !q || j.nombre.toLowerCase().includes(q);
          const matchFilter = !filterEquipoId || team.id === filterEquipoId;
          return matchSearch && matchFilter;
        })
        .map(j => ({ ...j, equipo: team.name, equipoColor: team.color, equipoId: team.id }))
    );
  }, [equiposFemenino, searchJugadoras, filterEquipoId]);

  // Color del modo activo para tabs
  const modeColor = mode === 'femenino' ? 'var(--fem2)' : 'var(--masc2, #3b82f6)';

  if (selectedTeamFem && mode === 'femenino') {
    return (
      <TeamPageFem
        team={selectedTeamFem}
        onBack={() => setSelectedTeamId(null)}
        allTeams={equiposFemenino}
        isLoadingStats={isLoadingStats}
        onSelectPlayer={handleSelectPlayer}
      />
    );
  }

  return (
    <>
      <GameCenterModal isOpen={!!selectedMatch} onClose={() => setSelectedMatch(null)} mode={mode} />
      <PlayerProfileModal isOpen={!!selectedPlayer} onClose={() => setSelectedPlayer(null)} player={selectedPlayer} />

      <div className="torneo-section" id="torneo-view">
        <div className="torneo-inner">

          {/* HEADER */}
          <div className="gender-header">
            <div>
              <div className="gender-pill">
                {mode === 'masculino' ? '♂ Categoría Masculina' : '♀ Categoría Femenina'}
              </div>
              <div className="gender-title" style={{ fontSize: '64px', lineHeight: '1' }}>
                {mode === 'masculino' ? 'TORNEO' : 'TORNEO'}<br />
                {mode === 'masculino' ? 'MASCULINO' : 'FEMENINO'}
              </div>
            </div>
            <div style={{ textAlign: 'right', paddingTop: '8px' }}>
              <div style={{ fontFamily: "'Barlow Condensed'", fontSize: '14px', fontWeight: '700', letterSpacing: '2px', color: 'var(--gray)', textTransform: 'uppercase' }}>
                Temporada Regular
              </div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: '28px', letterSpacing: '2px', color: modeColor, marginTop: '4px' }}>
                Jornada 1
              </div>
            </div>
          </div>

          {/* Card de equipo favorito */}
          {mode === 'femenino' && (
            <FavoritoCard onSelectTeam={handleSelectTeam} />
          )}

          {/* Banner error stats */}
          {statsError && mode === 'femenino' && (
            <div className="stats-error-banner">
              ⚠️ No se pudieron cargar las estadísticas. Reintentando automáticamente.
            </div>
          )}

          {/* TABS — color reactivo al modo */}
          <div className="tab-nav">
            {TABS.map((tab, idx) => (
              <button
                key={tab.key}
                type="button"
                className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                style={activeTab === tab.key ? { color: modeColor, borderBottomColor: modeColor } : {}}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Indicador swipe dots */}
          <div className="tab-swipe-dots">
            {TABS.map(t => (
              <span
                key={t.key}
                className={`tab-dot ${activeTab === t.key ? 'active' : ''}`}
                style={activeTab === t.key ? { background: modeColor, transform: 'scale(1.3)' } : {}}
                onClick={() => setActiveTab(t.key)}
              />
            ))}
          </div>

          {/* CONTENIDO con swipe */}
          <div {...swipeHandlers} style={{ touchAction: 'pan-y' }}>

            {/* ══ TABLA ══ */}
            {activeTab === 'tabla' && (
              <div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', paddingLeft: '20px' }}># Equipo</th>
                        <th>PJ</th><th>G</th><th>P</th><th>PF</th><th>PC</th><th>DIF</th><th>%</th>
                        <th style={{ color: modeColor }}>PTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mode === 'femenino' ? (
                        equiposFemenino.map((t, idx) => {
                          const pct = t.pj > 0 ? (t.pg / t.pj).toFixed(3) : '.000';
                          const dif = t.pf - t.pc;
                          return (
                            <tr key={t.id} className="table-row-clickable" onClick={() => handleSelectTeam(t)}>
                              <td className="team-cell">
                                <span className={`pos-num ${idx < 3 ? 'top3' : ''}`}>{idx + 1}</span>
                                <img src={t.logo} alt={t.name} loading="lazy" decoding="async"
                                  style={{ width:'26px', height:'26px', borderRadius:'50%', objectFit:'cover', marginRight:'8px' }}
                                  onError={e => { e.target.style.display='none'; }} />
                                <span className="team-name-txt">{t.name}</span>
                                {esFavorito(t.id) && <span className="fav-star">⭐</span>}
                              </td>
                              <td>{t.pj}</td><td>{t.pg}</td><td>{t.pp}</td>
                              <td>{t.pf}</td><td>{t.pc}</td>
                              <td className={dif >= 0 ? 'green' : 'red'}>{dif > 0 ? `+${dif}` : dif}</td>
                              <td className="pct-td">{pct}</td>
                              <td className="pts-td" style={{ color: modeColor }}>{t.pg * 2}</td>
                            </tr>
                          );
                        })
                      ) : (
                        TEAMS_MASC.map((t, idx) => (
                          <tr key={t.id}>
                            <td className="team-cell">
                              <span className={`pos-num ${idx < 3 ? 'top3' : ''}`}>{idx + 1}</span>
                              <img src={t.logo} alt={t.name} loading="lazy" decoding="async"
                                style={{ width:'26px', height:'26px', borderRadius:'50%', objectFit:'cover', marginRight:'8px' }} />
                              <span className="team-name-txt">{t.name}</span>
                            </td>
                            <td>{t.pg+t.pp}</td><td>{t.pg}</td><td>{t.pp}</td>
                            <td>-</td><td>-</td><td>-</td><td className="pct-td">-</td>
                            <td className="pts-td" style={{ color: modeColor }}>{t.pg*2}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop:'48px' }} className="fixture-round-label">Últimos Resultados</div>
                <div className="matches-grid">
                  <div className="match-card" style={{ cursor:'pointer' }} onClick={() => setSelectedMatch(1)}>
                    <div className="mc-header">
                      <span className="mc-date">Próximamente</span>
                      <span className="mc-status s-fin">Pendiente</span>
                    </div>
                    <div className="mc-teams">
                      <div className="mc-team"><div className="mc-team-name">–</div></div>
                      <div className="mc-score-box"><div className="mc-score" style={{ color: modeColor }}>– vs –</div></div>
                      <div className="mc-team"><div className="mc-team-name">–</div></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ FIXTURE ══ */}
            {activeTab === 'fixture' && (
              <EmptyState
                icon="📅"
                title="Fixture pendiente de publicación"
                sub="Los partidos se cargarán cuando se confirme el fixture oficial. Seguinos para enterarte primero."
              />
            )}

            {/* ══ JUGADORES ══ */}
            {activeTab === 'jugadores' && (
              <div>
                {/* Buscador */}
                <input
                  type="text"
                  className="search-bar"
                  placeholder={mode === 'femenino' ? 'Buscar jugadora...' : 'Buscar jugador...'}
                  value={searchJugadoras}
                  onChange={e => setSearchJugadoras(e.target.value)}
                  style={{ marginBottom: '12px' }}
                />

                {/* Chips de filtro por equipo — solo femenino */}
                {mode === 'femenino' && (
                  <div className="filter-chips">
                    <button
                      className={`chip ${!filterEquipoId ? 'chip-active' : ''}`}
                      style={!filterEquipoId ? { borderColor: modeColor, color: modeColor } : {}}
                      onClick={() => setFilterEquipoId(null)}
                    >
                      Todos
                    </button>
                    {equiposFemenino.map(eq => (
                      <button
                        key={eq.id}
                        className={`chip ${filterEquipoId === eq.id ? 'chip-active' : ''}`}
                        style={filterEquipoId === eq.id ? { borderColor: eq.color, color: eq.color, background: `${eq.color}15` } : {}}
                        onClick={() => setFilterEquipoId(prev => prev === eq.id ? null : eq.id)}
                      >
                        <img src={eq.logo} alt="" loading="lazy" decoding="async"
                          style={{ width:'16px', height:'16px', borderRadius:'50%', objectFit:'cover' }}
                          onError={e => { e.target.style.display='none'; }} />
                        {eq.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Conteo */}
                <div className="jugadoras-count" style={{ marginBottom:'16px' }}>
                  {jugadorasFiltradas.length} {mode === 'femenino' ? 'jugadoras' : 'jugadores'}
                  {filterEquipoId && ` · ${equiposFemenino.find(e=>e.id===filterEquipoId)?.name}`}
                </div>

                <div className="players-grid">
                  {mode === 'femenino' ? (
                    jugadorasFiltradas.length === 0 ? (
                      <div style={{ gridColumn:'1/-1' }}>
                        <EmptyState icon="🔍" title={`Sin resultados para "${searchJugadoras}"`} sub="Probá con otro nombre o equipo" showIG={false} />
                      </div>
                    ) : (
                      jugadorasFiltradas.map(j => (
                        <div
                          className="player-item"
                          key={j.id}
                          onClick={() => handleSelectPlayer({
                            id: j.id, name: j.nombre, team: j.equipo,
                            fechaNac: j.fechaNac,
                            pts: j.pts ?? 0, reb: j.reb ?? 0, ast: j.ast ?? 0,
                          })}
                        >
                          <div className="player-item-avatar"
                            style={{ background:`${j.equipoColor}22`, border:`1.5px solid ${j.equipoColor}55` }}>
                            <span style={{ fontFamily:"'Barlow Condensed'", fontSize:'14px', fontWeight:'700', color: j.equipoColor }}>
                              {j.nombre.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                          <div className="player-item-info">
                            <div className="player-item-name">{j.nombre}</div>
                            <div className="player-item-team">{j.equipo}</div>
                          </div>
                        </div>
                      ))
                    )
                  ) : (
                    [1,2,3,4,5,6].map(i => (
                      <div className="player-item" key={i}
                        onClick={() => handleSelectPlayer({ id:i, name:`Jugador ${i}`, team:'Black Mambas', pts:0, reb:0, ast:0 })}>
                        <div className="player-item-avatar">
                          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width:'20px', color:'var(--gray)' }}>
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          </svg>
                        </div>
                        <div className="player-item-info">
                          <div className="player-item-name">Jugador {i}</div>
                          <div className="player-item-team">Black Mambas</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ══ EQUIPOS ══ */}
            {activeTab === 'equipos' && (
              <div className="teams-grid">
                {mode === 'femenino' ? (
                  equiposFemenino.map(team => (
                    <div
                      className={`flip-card${tappedCard === team.id ? ' tapped' : ''}`}
                      key={team.id}
                      onClick={() => {
                        const isTouch = window.matchMedia('(hover: none)').matches;
                        if (isTouch && tappedCard !== team.id) {
                          setTappedCard(team.id);
                        } else {
                          setTappedCard(null);
                          handleSelectTeam(team);
                        }
                      }}
                      onMouseLeave={() => setTappedCard(null)}
                    >
                      <div className="flip-card-inner">
                        <div className="flip-card-front">
                          <div className="fc-logo-wrap" style={{ borderColor: team.color }}>
                            <img src={team.logo} alt={team.name} className="fc-logo-img" loading="lazy" decoding="async"
                              onError={e => { e.target.style.background='var(--dark4)'; }} />
                          </div>
                          <h3 className="fc-name">{team.name}</h3>
                          <div className="fc-subtitle">{team.jugadoras.length} jugadoras</div>
                          {/* Botón favorito */}
                          <button
                            className={`fc-fav-btn ${esFavorito(team.id) ? 'active' : ''}`}
                            onClick={e => { e.stopPropagation(); toggleFavorito(team.id); }}
                            title={esFavorito(team.id) ? 'Quitar favorito' : 'Marcar como favorito'}
                          >
                            {esFavorito(team.id) ? '⭐' : '☆'}
                          </button>
                        </div>
                        <div className="flip-card-back">
                          <img src={team.logo} alt="bg" className="fc-back-logo" loading="lazy" decoding="async" />
                          <div className="fc-record-label">RÉCORD ACTUAL</div>
                          <div className="fc-record-val" style={{ color: team.color }}>{team.pg} - {team.pp}</div>
                          <div className="fc-team-name">{team.name}</div>
                          <div style={{ marginTop:'12px', fontSize:'13px', fontFamily:"'Barlow Condensed'", color:'var(--gray)', letterSpacing:'1px' }}>
                            TAP PARA VER PLANTEL
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  TEAMS_MASC.map(team => (
                    <div
                      className={`flip-card${tappedCard === team.id ? ' tapped' : ''}`}
                      key={team.id}
                      onClick={() => {
                        const isTouch = window.matchMedia('(hover: none)').matches;
                        if (isTouch) setTappedCard(tappedCard === team.id ? null : team.id);
                      }}
                      onMouseLeave={() => setTappedCard(null)}
                    >
                      <div className="flip-card-inner">
                        <div className="flip-card-front">
                          <div className="fc-logo-wrap" style={{ borderColor: team.color }}>
                            <img src={team.logo} alt={team.name} className="fc-logo-img" loading="lazy" decoding="async" />
                          </div>
                          <h3 className="fc-name">{team.name}</h3>
                          <div className="fc-subtitle">{team.pg}G - {team.pp}P</div>
                        </div>
                        <div className="flip-card-back">
                          <img src={team.logo} alt="bg" className="fc-back-logo" loading="lazy" decoding="async" />
                          <div className="fc-record-label">RÉCORD ACTUAL</div>
                          <div className="fc-record-val" style={{ color: team.color }}>{team.record}</div>
                          <div className="fc-team-name">{team.name}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
