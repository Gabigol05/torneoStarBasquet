import { TournamentSelector } from './TournamentSelector';
import { useTournament } from '../context/TournamentContext';

const HERO_DATA = {
  masculino: {
    badge:    '♂ Torneo Masculino · En Curso',
    subtitle: 'Categoría Masculina · Córdoba · 2026',
  },
  femenino: {
    badge:    '♀ Torneo Femenino · En Curso',
    subtitle: 'Categoría Femenina · Córdoba · 2026',
  },
};

export function Hero() {
  const { mode } = useTournament();
  const data = HERO_DATA[mode];

  return (
    <section className={`hero hero-mode-${mode}`} id="inicio">
      <div className="hero-orb hero-orb-1"/>
      <div className="hero-orb hero-orb-2"/>
      <div className="hero-orb hero-orb-3"/>
      <div className="hero-grid"/>

      <div className={`hero-badge hero-badge-${mode}`}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
        {data.badge}
      </div>

      <h1 className="hero-title">
        TORNEO<br/><span>STAR </span>BÁSQUET
      </h1>

      <p className="hero-subtitle">{data.subtitle}</p>

      <TournamentSelector/>

      <div className="scroll-arrow">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
          <path d="M12 5v14M5 12l7 7 7-7"/>
        </svg>
      </div>
    </section>
  );
} 