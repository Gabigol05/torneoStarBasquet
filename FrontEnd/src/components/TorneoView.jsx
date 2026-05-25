import { useEffect, useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import { GameCenterModal } from './GameCenterModal';
import { UpcomingMatchWidget } from './UpcomingMatchWidget';
import { PlayerProfileModal } from './PlayerProfileModal';

import logoMambas from '../assets/logo_mambas.png';
import logoToros from '../assets/logo_toros.png';
import logoSpartans from '../assets/logo_spartans.png';
import logoLeonas from '../assets/logo_leonas.png';
import logoWolves from '../assets/logo_wolves.png';
import logoQueens from '../assets/logo_queens.png';

export function TorneoView() {
  const { mode } = useTournament();
  const [data, setData] = useState({ isLoading: true, category: mode });
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // MOCK DE EQUIPOS DINÁMICO
  const teamsData = {
    masculino: [
      { id: 'm1', name: 'Black Mambas', logo: logoMambas, record: '7 - 0', color: '#1f2937' },
      { id: 'm2', name: 'Los Toros', logo: logoToros, record: '6 - 1', color: '#ef4444' },
      { id: 'm3', name: 'Spartans', logo: logoSpartans, record: '5 - 2', color: '#b45309' }
    ],
    femenino: [
      { id: 'f1', name: 'Las Leonas', logo: logoLeonas, record: '7 - 0', color: '#f59e0b' },
      { id: 'f2', name: 'Wolves Fem', logo: logoWolves, record: '5 - 2', color: '#8b5cf6' },
      { id: 'f3', name: 'Queens', logo: logoQueens, record: '4 - 3', color: '#ec4899' }
    ]
  };

  useEffect(() => {
    // Simular el fetch a la API cuando el mode cambia
    setData({ isLoading: true, category: mode });

    console.log(`[API MOCK] Fetching data for: ?categoria=${mode}`);

    const timer = setTimeout(() => {
      setData({ isLoading: false, category: mode });
    }, 600);

    return () => clearTimeout(timer);
  }, [mode]);

  const title = mode === 'masculino' ? 'TORNEO MASCULINO' : 'TORNEO FEMENINO';
  const prefix = mode === 'masculino' ? 'm' : 'f';

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
        <div className="torneo-inner fade-refresh" key={mode}>

          <div className="gender-header">
            <div>
              <div className="gender-pill">
                {mode === 'masculino' ? '♂ Categoría Masculina' : '♀ Categoría Femenina'}
              </div>
              <div className="gender-title" style={{ fontSize: '64px', lineHeight: '1' }}>
                {title.split(' ')[0]}<br />{title.split(' ')[1]}
              </div>
            </div>
            <div style={{ textAlign: "right", paddingTop: "8px" }}>
              <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: "14px", fontWeight: "700", letterSpacing: "2px", color: "var(--gray)", textTransform: "uppercase" }}>
                Temporada Regular
              </div>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "28px", letterSpacing: "2px", color: "var(--color-accent)", marginTop: "4px" }}>
                {data.isLoading ? 'Cargando datos...' : 'Jornada 7 de 12'}
              </div>
            </div>
          </div>

          <div className="tab-nav">
            <button type="button" className={`tab-btn active`} data-star-tab={`${prefix}:tabla`}>📊 Tabla</button>
            <button type="button" className="tab-btn" data-star-tab={`${prefix}:fixtures`}>📅 Fixture</button>
            <button type="button" className="tab-btn" data-star-tab={`${prefix}:jugadores`}>👤 Jugadores</button>
            <button type="button" className="tab-btn" data-star-tab={`${prefix}:equipos`}>🏀 Equipos</button>
          </div>

          {data.isLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--gray)' }}>
              <div style={{ fontSize: '24px', fontFamily: "'Bebas Neue'" }}>Cargando {mode}...</div>
            </div>
          ) : (
            <>
            <div className="tab-pane active" id={`${prefix}-tabla`}>
            {/* GRID LAYOUT APLICADO PARA LA TABLA EN MOBILE */}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{textAlign: "left", paddingLeft: "20px"}}># Equipo</th>
                    <th>PJ</th><th>G</th><th>P</th><th>PF</th><th>PC</th><th>DIF</th><th>%</th><th>PTS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="highlight-row">
                    <td className="team-cell">
                      <span className="pos-num top3">1</span>
                      <span className="team-crest t-blue">BM</span>
                      <span className="team-name-txt">{mode === 'masculino' ? 'Black Mambas' : 'Las Leonas'}</span>
                    </td>
                    <td>7</td><td>7</td><td>0</td><td>614</td><td>528</td><td className="green">+86</td><td className="pct-td">1.000</td><td className="pts-td" style={{color: "var(--color-accent)"}}>14</td>
                  </tr>
                  <tr>
                    <td className="team-cell">
                      <span className="pos-num">2</span>
                      <span className="team-crest t-red">LT</span>
                      <span className="team-name-txt">{mode === 'masculino' ? 'Los Toros' : 'Wolves Fem'}</span>
                    </td>
                    <td>7</td><td>6</td><td>1</td><td>588</td><td>541</td><td className="green">+47</td><td className="pct-td">.857</td><td className="pts-td" style={{color: "var(--color-accent)"}}>13</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div style={{ marginTop: '48px' }} className="fixture-round-label">Últimos Resultados</div>
            <div className="matches-grid">
              <div 
                className="match-card" 
                style={{cursor: 'pointer'}} 
                onClick={() => setSelectedMatch(1)}
                title="Ver detalles en Game Center"
              >
                <div className="mc-header">
                  <span className="mc-date">Dom 15 Jun · 15:00</span>
                  <span className="mc-status s-fin">Final</span>
                </div>
                <div className="mc-teams">
                  <div className="mc-team"><div className="mc-team-name winner">{mode === 'masculino' ? 'Black Mambas' : 'Las Leonas'}</div></div>
                  <div className="mc-score-box"><div className="mc-score" style={{color: "var(--color-accent)"}}>88 – 74</div></div>
                  <div className="mc-team"><div className="mc-team-name">{mode === 'masculino' ? 'Los Toros' : 'Wolves Fem'}</div></div>
                </div>
              </div>
            </div>
          </div>

          <div className="tab-pane" id={`${prefix}-fixtures`}>
            <div className="fixture-round-label">Jornada 8 - Próximos Partidos</div>
            <div className="matches-grid">
              <UpcomingMatchWidget 
                match={{
                  date: 'Dom 22 Jun · 16:30',
                  teamA: mode === 'masculino' ? 'Alumni' : 'Rangers F',
                  teamB: mode === 'masculino' ? 'Cordoba Sur' : 'City Basket'
                }} 
                mode={mode} 
              />
              <UpcomingMatchWidget 
                match={{
                  date: 'Dom 22 Jun · 18:00',
                  teamA: mode === 'masculino' ? 'Spartans' : 'Stars',
                  teamB: mode === 'masculino' ? 'Bulls' : 'Queens'
                }} 
                mode={mode} 
              />
            </div>
          </div>

          <div className="tab-pane" id={`${prefix}-jugadores`}>
            <input type="text" className="search-bar" placeholder="Buscar jugador o equipo..." data-star-filter={`${prefix}-jugadores`} />
            <div className="players-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div className="player-item" key={i} onClick={() => setSelectedPlayer({ id: i, name: `Jugador ${i}`, team: mode === 'masculino' ? 'Black Mambas' : 'Las Leonas', pts: 18.5 + i })}>
                  <div className="player-item-avatar">
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{width: '20px', color: 'var(--gray)'}}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                  </div>
                  <div className="player-item-info">
                    <div className="player-item-name">Jugador {i}</div>
                    <div className="player-item-team">{mode === 'masculino' ? 'Black Mambas' : 'Las Leonas'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="tab-pane" id={`${prefix}-equipos`}>
            <div className="teams-grid">
              
              {teamsData[mode].map((team) => (
                <div className="flip-card" key={team.id}>
                  <div className="flip-card-inner">
                    <div className="flip-card-front">
                      <div className="fc-logo-wrap" style={{borderColor: team.color}}>
                        <img src={team.logo} alt={team.name} className="fc-logo-img" />
                      </div>
                      <h3 className="fc-name">{team.name}</h3>
                    </div>
                    <div className="flip-card-back">
                      <img src={team.logo} alt="bg" className="fc-back-logo" />
                      <div className="fc-record-label">RÉCORD ACTUAL</div>
                      <div className="fc-record-val" style={{color: team.color}}>{team.record}</div>
                      <div className="fc-team-name">{team.name}</div>
                    </div>
                  </div>
                </div>
              ))}

            </div>
          </div>
            </>
          )}

        </div>
      </div>
      </>
      );
}
