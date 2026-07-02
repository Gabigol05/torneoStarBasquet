import { useState } from 'react';

export function UpcomingMatchWidget({ match, mode }) {
  const [voted, setVoted] = useState(false);

  // Mock de votos (en el futuro vendrán del backend)
  const totalVotesMock = 120;
  const aVotesMock = 72; // 60%
  const bVotesMock = 48; // 40%

  const handleVote = (team) => {
    // Aquí iría la llamada al backend: fetch('/api/vote', { method: 'POST', body: team })
    setVoted(true);
  };

  const getPercentage = (votes) => Math.round((votes / totalVotesMock) * 100);
  const aPct = getPercentage(aVotesMock);
  const bPct = getPercentage(bVotesMock);

  return (
    <div className="match-card upcoming-widget">
      <div className="mc-header">
        <span className="mc-date">{match.date}</span>
        <span className="mc-status">PRÓXIMO</span>
      </div>
      
      <div className="mc-teams" style={{ marginBottom: voted ? '16px' : '0' }}>
        <div className="mc-team"><div className="mc-team-name">{match.teamA}</div></div>
        <div className="mc-score-box"><div style={{color: "var(--gray)", fontSize: "14px"}}>VS</div></div>
        <div className="mc-team"><div className="mc-team-name">{match.teamB}</div></div>
      </div>

      {!voted ? (
        <div className="vote-section">
          <div className="vote-question">¿QUIÉN GANARÁ?</div>
          <div className="vote-buttons">
            <button className="vote-btn btn-a" onClick={() => handleVote('A')}>{match.teamA}</button>
            <button className="vote-btn btn-b" onClick={() => handleVote('B')}>{match.teamB}</button>
          </div>
        </div>
      ) : (
        <div className="vote-results fade-refresh">
          <div className="vote-question" style={{ color: 'var(--green)' }}>¡VOTO REGISTRADO!</div>
          <div className="vote-bar-container">
            <div className="vote-bar">
              <div className="vote-bar-fill fill-a" style={{ width: `${aPct}%` }}></div>
              <div className="vote-bar-fill fill-b" style={{ width: `${bPct}%` }}></div>
            </div>
            <div className="vote-labels">
              <span className="vote-pct">{aPct}%</span>
              <span className="vote-pct">{bPct}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
