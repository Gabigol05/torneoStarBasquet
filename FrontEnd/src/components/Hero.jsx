/* eslint-disable react/no-unknown-property */
/* Fragmento fiel al HTML original (ver scripts/build_star_components.py). */
import { CounterUp } from './CounterUp';
import { TournamentSelector } from './TournamentSelector';

export function Hero() {
  return (
    <>
      {/* HERO */}
      <section className="hero" id="inicio">
        <div className="hero-orb hero-orb-1"></div>
        <div className="hero-orb hero-orb-2"></div>
        <div className="hero-orb hero-orb-3"></div>
        <div className="hero-grid"></div>
        <div className="hero-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" /></svg>
          Temporada 2026 · En Curso
        </div>
        <h1 className="hero-title">
          TORNEO<br /><span>STAR </span>BÁSQUET
        </h1>
        <p className="hero-subtitle">Córdoba · Argentina · 2026</p>
        <TournamentSelector />
        <div className="hero-stats">
          <div className="hero-stat"><div className="hero-stat-num"><CounterUp end="2" /></div><div className="hero-stat-lbl">Torneos</div></div>
          <div className="hero-stat"><div className="hero-stat-num"><CounterUp end="18" /></div><div className="hero-stat-lbl">Equipos</div></div>
          <div className="hero-stat"><div className="hero-stat-num"><CounterUp end="7" /></div><div className="hero-stat-lbl">Fechas</div></div>
          <div className="hero-stat"><div className="hero-stat-num"><CounterUp end="200" suffix="+" /></div><div className="hero-stat-lbl">Jugadores</div></div>
          <div className="hero-stat"><div className="hero-stat-num"><CounterUp end="62" /></div><div className="hero-stat-lbl">Partidos</div></div>
        </div>
        <div className="scroll-arrow">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
        </div>
      </section>
    </>
  );
}
