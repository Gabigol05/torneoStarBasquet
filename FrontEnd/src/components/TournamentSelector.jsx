import { useTournament } from '../context/TournamentContext';

export function TournamentSelector() {
  const { mode, toggleMode } = useTournament();

  return (
    <div className="tournament-selector-wrap">
      <div 
        className={`tournament-toggle mode-${mode}`} 
        onClick={toggleMode}
      >
        <div className="tournament-toggle-slider"></div>
        
        <div className={`tournament-option ${mode === 'masculino' ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M16 8l5-5" />
            <path d="M16 3h5v5" />
          </svg>
          MASC
        </div>
        
        <div className={`tournament-option ${mode === 'femenino' ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="10" r="4" />
            <path d="M12 14v7" />
            <path d="M9 18h6" />
          </svg>
          FEM
        </div>
      </div>
    </div>
  );
}
