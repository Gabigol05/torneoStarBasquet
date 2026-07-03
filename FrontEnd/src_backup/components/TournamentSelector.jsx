import { useTournament } from '../context/TournamentContext';

export function TournamentSelector({ compact = false }) {
  const { mode, toggleMode } = useTournament();

  if (compact) {
    // Versión compacta para el MobileHeader — cabe en 56px de altura
    return (
      <div
        className={`ts-compact mode-${mode}`}
        onClick={toggleMode}
        role="button"
        aria-label={`Cambiar a ${mode === 'masculino' ? 'femenino' : 'masculino'}`}
      >
        <span className={`ts-compact-opt ${mode === 'masculino' ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
            <circle cx="12" cy="12" r="4"/><path d="M16 8l5-5"/><path d="M16 3h5v5"/>
          </svg>
          ♂
        </span>
        <div className="ts-compact-slider" />
        <span className={`ts-compact-opt ${mode === 'femenino' ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
            <circle cx="12" cy="10" r="4"/><path d="M12 14v7"/><path d="M9 18h6"/>
          </svg>
          ♀
        </span>
      </div>
    );
  }

  // Versión normal — desktop y hero
  return (
    <div className="tournament-selector-wrap">
      <div
        className={`tournament-toggle mode-${mode}`}
        onClick={toggleMode}
        role="button"
        aria-label={`Modo actual: ${mode}. Tocar para cambiar.`}
      >
        <div className="tournament-toggle-slider" />
        <div className={`tournament-option ${mode === 'masculino' ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4"/><path d="M16 8l5-5"/><path d="M16 3h5v5"/>
          </svg>
          MASC
        </div>
        <div className={`tournament-option ${mode === 'femenino' ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="10" r="4"/><path d="M12 14v7"/><path d="M9 18h6"/>
          </svg>
          FEM
        </div>
      </div>
    </div>
  );
}
