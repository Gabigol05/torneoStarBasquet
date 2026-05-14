import { useEffect, useState } from 'react';
import { useTournament } from '../context/TournamentContext';

export function TorneoView() {
  const { mode } = useTournament();
  const [data, setData] = useState({ isLoading: true, category: mode });

  useEffect(() => {
    // Simular el fetch a la API cuando el mode cambia
    // fetch(`/api/torneo?categoria=${mode}`).then(...)
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
          <div style={{textAlign: "right", paddingTop: "8px"}}>
            <div style={{fontFamily: "'Barlow Condensed',sans-serif", fontSize: "14px", fontWeight: "700", letterSpacing: "2px", color: "var(--gray)", textTransform: "uppercase"}}>
              Temporada Regular
            </div>
            <div style={{fontFamily: "'Bebas Neue',sans-serif", fontSize: "28px", letterSpacing: "2px", color: "var(--color-accent)", marginTop: "4px"}}>
              Cargando datos...
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
                      <span className="team-crest">T1</span>
                      <span className="team-name-txt">Equipo A ({mode})</span>
                    </td>
                    <td>7</td><td>7</td><td>0</td><td>614</td><td>528</td><td className="green">+86</td><td className="pct-td">1.000</td><td className="pts-td" style={{color: "var(--color-accent)"}}>14</td>
                  </tr>
                  <tr>
                    <td className="team-cell">
                      <span className="pos-num">2</span>
                      <span className="team-crest">T2</span>
                      <span className="team-name-txt">Equipo B ({mode})</span>
                    </td>
                    <td>7</td><td>6</td><td>1</td><td>588</td><td>541</td><td className="green">+47</td><td className="pct-td">.857</td><td className="pts-td" style={{color: "var(--color-accent)"}}>13</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div style={{ marginTop: '48px' }} className="fixture-round-label">Últimos Resultados</div>
            <div className="matches-grid">
              <div className="match-card">
                <div className="mc-header">
                  <span className="mc-date">Dom 15 Jun · 15:00</span>
                  <span className="mc-status s-fin">Final</span>
                </div>
                <div className="mc-teams">
                  <div className="mc-team"><div className="mc-team-name winner">Equipo A</div></div>
                  <div className="mc-score-box"><div className="mc-score" style={{color: "var(--color-accent)"}}>88 – 74</div></div>
                  <div className="mc-team"><div className="mc-team-name">Equipo B</div></div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
