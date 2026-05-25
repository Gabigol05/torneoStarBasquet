export function GameCenterModal({ isOpen, onClose, mode }) {
  if (!isOpen) return null;

  // Datos mockeados dependiendo del modo
  const data = {
    teamA: { name: mode === 'masculino' ? 'BLACK MAMBAS' : 'LAS LEONAS', abbr: 'BM', score: 88, color: 't-blue' },
    teamB: { name: mode === 'masculino' ? 'LOS TOROS' : 'WOLVES FEM', abbr: 'LT', score: 74, color: 't-red' },
    quarters: [
      { q: '1Q', a: 22, b: 18 },
      { q: '2Q', a: 24, b: 20 },
      { q: '3Q', a: 18, b: 22 },
      { q: '4Q', a: 24, b: 14 }
    ],
    stats: [
      { label: '3PT %', a: 38, b: 32 },
      { label: 'REBOTES', a: 42, b: 35 },
      { label: 'ASISTENCIAS', a: 21, b: 15 },
      { label: 'PÉRDIDAS', a: 12, b: 16 }
    ],
    topScorers: {
      teamA: { name: 'Matías H.', pts: 24, reb: 4, ast: 7 },
      teamB: { name: 'Nicolás F.', pts: 22, reb: 5, ast: 4 }
    }
  };

  // Función para calcular el % de ancho de las barras (basado en el mayor)
  const getBarWidth = (valA, valB, isA) => {
    const total = valA + valB;
    if (total === 0) return '50%';
    const pct = isA ? (valA / total) * 100 : (valB / total) * 100;
    return `${pct}%`;
  };

  return (
    <div className="gc-overlay" onClick={onClose}>
      <div className="gc-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="gc-header">
          <button className="gc-close-btn" onClick={onClose}>&times;</button>
          <div style={{textAlign: 'center', color: 'var(--gray)', fontFamily: "'Barlow Condensed'", fontWeight: 600, letterSpacing: '2px', fontSize: '12px', marginBottom: '8px'}}>
            FINALIZADO · FASE REGULAR
          </div>
          <div className="gc-score-board">
            <div className="gc-team">
              <div className={`gc-team-logo ${data.teamA.color}`}>{data.teamA.abbr}</div>
              <div className="gc-team-name">{data.teamA.name}</div>
            </div>
            <div className="gc-final-score">
              {data.teamA.score} - {data.teamB.score}
            </div>
            <div className="gc-team">
              <div className={`gc-team-logo ${data.teamB.color}`}>{data.teamB.abbr}</div>
              <div className="gc-team-name">{data.teamB.name}</div>
            </div>
          </div>
        </div>

        <div className="gc-body">
          {/* QUARTERS TABLE */}
          <div>
            <div className="gc-section-title">Puntaje por Cuartos</div>
            <table className="gc-quarters-table">
              <thead>
                <tr>
                  <th>EQUIPO</th>
                  <th>1Q</th><th>2Q</th><th>3Q</th><th>4Q</th><th>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{data.teamA.abbr}</td>
                  {data.quarters.map((q, i) => <td key={i}>{q.a}</td>)}
                  <td>{data.teamA.score}</td>
                </tr>
                <tr>
                  <td>{data.teamB.abbr}</td>
                  {data.quarters.map((q, i) => <td key={i}>{q.b}</td>)}
                  <td>{data.teamB.score}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TEAM STATS */}
          <div>
            <div className="gc-section-title">Estadísticas de Equipo</div>
            {data.stats.map((stat, idx) => (
              <div className="gc-stat-row" key={idx}>
                <div className="gc-stat-labels">
                  <span>{stat.a}</span>
                  <span style={{color: 'var(--gray)'}}>{stat.label}</span>
                  <span>{stat.b}</span>
                </div>
                <div className="gc-stat-bar-bg">
                  <div className="gc-stat-bar-left" style={{width: getBarWidth(stat.a, stat.b, true)}}></div>
                  <div className="gc-stat-bar-right" style={{width: getBarWidth(stat.a, stat.b, false)}}></div>
                </div>
              </div>
            ))}
          </div>

          {/* TOP PERFORMERS */}
          <div>
            <div className="gc-section-title">Jugadores Destacados</div>
            <div className="gc-leaders">
              <div className="gc-leader-card">
                <div className="gc-leader-avatar">
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                </div>
                <div className="gc-leader-info">
                  <div className="gc-leader-name">{data.topScorers.teamA.name}</div>
                  <div className="gc-leader-stat">{data.topScorers.teamA.pts} PTS</div>
                </div>
              </div>
              <div className="gc-leader-card">
                <div className="gc-leader-avatar">
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                </div>
                <div className="gc-leader-info">
                  <div className="gc-leader-name">{data.topScorers.teamB.name}</div>
                  <div className="gc-leader-stat">{data.topScorers.teamB.pts} PTS</div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
