import { useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import { GameCenterModal } from './GameCenterModal';
import { UpcomingMatchWidget } from './UpcomingMatchWidget';
import { PlayerProfileModal } from './PlayerProfileModal';
import { TeamPageFem } from './TeamPageFem';
import { useFemeninoStats } from '../hooks/useFemeninoStats';

// Logos masculinos (mock)
import logoMambas   from '../assets/logo_mambas.png';
import logoToros    from '../assets/logo_toros.png';
import logoSpartans from '../assets/logo_spartans.png';

export function TorneoView() {
  const { mode } = useTournament();
  const { equipos: equiposFemenino, isLoading: isLoadingStats } = useFemeninoStats();

  const [activeTab, setActiveTab]         = useState('tabla');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeamFem, setSelectedTeamFem] = useState(null);

  // Cuando cambia el modo, resetear tab y equipo seleccionado
  const handleModeChange = (newTab) => {
    setActiveTab(newTab);
    setSelectedTeamFem(null);
  };

  const TABS = [
    { key: 'tabla',     label: '📊 Tabla' },
    { key: 'fixture',   label: '📅 Fixture' },
    { key: 'jugadores', label: '👤 Jugadores' },
    { key: 'equipos',   label: '🏀 Equipos' },
  ];

  const teamsDataMasc = [
    { id: 'm1', name: 'Black Mambas', logo: logoMambas,   record: '7 - 0', color: '#1f2937', pg: 7, pp: 0 },
    { id: 'm2', name: 'Los Toros',    logo: logoToros,     record: '6 - 1', color: '#ef4444', pg: 6, pp: 1 },
    { id: 'm3', name: 'Spartans',     logo: logoSpartans,  record: '5 - 2', color: '#b45309', pg: 5, pp: 2 },
  ];

  // Si hay equipo femenino seleccionado → mostrar su página
  if (selectedTeamFem && mode === 'femenino') {
    return (
      <TeamPageFem
        team={selectedTeamFem}
        onBack={() => setSelectedTeamFem(null)}
        allTeams={equiposFemenino}
        isLoadingStats={isLoadingStats}
      />
    );
  }

  const title = mode === 'masculino' ? 'TORNEO MASCULINO' : 'TORNEO FEMENINO';

  return (
    <>
      <GameCenterModal
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        mode={mode}
      />
      <PlayerProfileModal
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        player={selectedPlayer}
      />

      <div className="torneo-section" id="torneo-view">
        <div className="torneo-inner">

          {/* ── HEADER ── */}
          <div className="gender-header">
            <div>
              <div className="gender-pill">
                {mode === 'masculino' ? '♂ Categoría Masculina' : '♀ Categoría Femenina'}
              </div>
              <div className="gender-title" style={{ fontSize: '64px', lineHeight: '1' }}>
                {title.split(' ')[0]}<br />{title.split(' ')[1]}
              </div>
            </div>
            <div style={{ textAlign: 'right', paddingTop: '8px' }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '14px', fontWeight: '700', letterSpacing: '2px', color: 'var(--gray)', textTransform: 'uppercase' }}>
                Temporada Regular
              </div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: '28px', letterSpacing: '2px', color: 'var(--color-accent)', marginTop: '4px' }}>
                Jornada 1
              </div>
            </div>
          </div>

          {/* ── TABS (100% React, sin DOM) ── */}
          <div className="tab-nav">
            {TABS.map(tab => (
              <button
                key={tab.key}
                type="button"
                className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => handleModeChange(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ══════════════ TABLA ══════════════ */}
          {activeTab === 'tabla' && (
            <div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', paddingLeft: '20px' }}># Equipo</th>
                      <th>PJ</th><th>G</th><th>P</th><th>PF</th><th>PC</th><th>DIF</th><th>%</th><th>PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mode === 'femenino' ? (
                      equiposFemenino.map((t, idx) => {
                        const pct = t.pj > 0 ? (t.pg / t.pj).toFixed(3) : '.000';
                        const dif = t.pf - t.pc;
                        const pts = t.pg * 2;
                        return (
                          <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedTeamFem(t)}>
                            <td className="team-cell">
                              <span className={`pos-num ${idx < 3 ? 'top3' : ''}`}>{idx + 1}</span>
                              <img src={t.logo} alt={t.name} style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', marginRight: '8px' }} />
                              <span className="team-name-txt">{t.name}</span>
                            </td>
                            <td>{t.pj}</td><td>{t.pg}</td><td>{t.pp}</td>
                            <td>{t.pf}</td><td>{t.pc}</td>
                            <td className={dif >= 0 ? 'green' : 'red'}>{dif > 0 ? `+${dif}` : dif}</td>
                            <td className="pct-td">{pct}</td>
                            <td className="pts-td" style={{ color: 'var(--color-accent)' }}>{pts}</td>
                          </tr>
                        );
                      })
                    ) : (
                      teamsDataMasc.map((t, idx) => (
                        <tr key={t.id}>
                          <td className="team-cell">
                            <span className={`pos-num ${idx < 3 ? 'top3' : ''}`}>{idx + 1}</span>
                            <img src={t.logo} alt={t.name} style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', marginRight: '8px' }} />
                            <span className="team-name-txt">{t.name}</span>
                          </td>
                          <td>{t.pg + t.pp}</td><td>{t.pg}</td><td>{t.pp}</td>
                          <td>-</td><td>-</td><td>-</td><td className="pct-td">-</td>
                          <td className="pts-td" style={{ color: 'var(--color-accent)' }}>{t.pg * 2}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '48px' }} className="fixture-round-label">Últimos Resultados</div>
              <div className="matches-grid">
                <div className="match-card" style={{ cursor: 'pointer' }} onClick={() => setSelectedMatch(1)}>
                  <div className="mc-header">
                    <span className="mc-date">Próximamente</span>
                    <span className="mc-status s-fin">Pendiente</span>
                  </div>
                  <div className="mc-teams">
                    <div className="mc-team"><div className="mc-team-name">–</div></div>
                    <div className="mc-score-box"><div className="mc-score" style={{ color: 'var(--color-accent)' }}>– vs –</div></div>
                    <div className="mc-team"><div className="mc-team-name">–</div></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ FIXTURE ══════════════ */}
          {activeTab === 'fixture' && (
            <div>
              <div className="fixture-round-label">Próximos Partidos</div>
              <div className="matches-grid">
                <UpcomingMatchWidget
                  match={{ date: 'A confirmar', teamA: '–', teamB: '–' }}
                  mode={mode}
                />
              </div>
            </div>
          )}

          {/* ══════════════ JUGADORES ══════════════ */}
          {activeTab === 'jugadores' && (
            <div>
              <input
                type="text"
                className="search-bar"
                placeholder={mode === 'femenino' ? 'Buscar jugadora o equipo...' : 'Buscar jugador o equipo...'}
                style={{ marginBottom: '20px' }}
                onChange={e => {
                  const q = e.target.value.toLowerCase();
                  document.querySelectorAll('.player-item').forEach(el => {
                    el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
                  });
                }}
              />
              <div className="players-grid">
                {mode === 'femenino' ? (
                  equiposFemenino.flatMap(team =>
                    team.jugadoras.map(j => (
                      <div
                        className="player-item"
                        key={j.id}
                        onClick={() => setSelectedPlayer({
                          id: j.id, name: j.nombre, team: team.name,
                          fechaNac: j.fechaNac,
                          pts: j.pts ?? 0, reb: j.reb ?? 0, ast: j.ast ?? 0,
                        })}
                      >
                        <div className="player-item-avatar">
                          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '20px', color: 'var(--gray)' }}>
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        </div>
                        <div className="player-item-info">
                          <div className="player-item-name">{j.nombre}</div>
                          <div className="player-item-team">{team.name}</div>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  [1,2,3,4,5,6].map(i => (
                    <div className="player-item" key={i} onClick={() => setSelectedPlayer({ id: i, name: `Jugador ${i}`, team: 'Black Mambas', pts: 18.5 + i })}>
                      <div className="player-item-avatar">
                        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '20px', color: 'var(--gray)' }}>
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
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

          {/* ══════════════ EQUIPOS ══════════════ */}
          {activeTab === 'equipos' && (
            <div className="teams-grid">
              {mode === 'femenino' ? (
                equiposFemenino.map(team => (
                  <div
                    className="flip-card"
                    key={team.id}
                    onClick={() => setSelectedTeamFem(team)}
                  >
                    <div className="flip-card-inner">
                      <div className="flip-card-front">
                        <div className="fc-logo-wrap" style={{ borderColor: team.color }}>
                          <img src={team.logo} alt={team.name} className="fc-logo-img" />
                        </div>
                        <h3 className="fc-name">{team.name}</h3>
                        <div className="fc-subtitle">{team.jugadoras.length} jugadoras</div>
                      </div>
                      <div className="flip-card-back">
                        <img src={team.logo} alt="bg" className="fc-back-logo" />
                        <div className="fc-record-label">RÉCORD ACTUAL</div>
                        <div className="fc-record-val" style={{ color: team.color }}>{team.pg} - {team.pp}</div>
                        <div className="fc-team-name">{team.name}</div>
                        <div style={{ marginTop: '12px', fontSize: '13px', fontFamily: "'Barlow Condensed'", color: 'var(--gray)', letterSpacing: '1px' }}>
                          TAP PARA VER PLANTEL
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                teamsDataMasc.map(team => (
                  <div className="flip-card" key={team.id}>
                    <div className="flip-card-inner">
                      <div className="flip-card-front">
                        <div className="fc-logo-wrap" style={{ borderColor: team.color }}>
                          <img src={team.logo} alt={team.name} className="fc-logo-img" />
                        </div>
                        <h3 className="fc-name">{team.name}</h3>
                        <div className="fc-subtitle">{team.pg}G - {team.pp}P</div>
                      </div>
                      <div className="flip-card-back">
                        <img src={team.logo} alt="bg" className="fc-back-logo" />
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
    </>
  );
}
