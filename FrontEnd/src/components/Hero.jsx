/* eslint-disable react/no-unknown-property */
/* Fragmento fiel al HTML original (ver scripts/build_star_components.py). */

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
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
          Temporada 2025 · En Curso
        </div>
        <h1 className="hero-title">
          TORNEO<br /><span>STAR</span><br />BÁSQUET
        </h1>
        <p className="hero-subtitle">Córdoba · Argentina · 2025</p>
        <div className="hero-cats">
          <a href="#femenino" className="cat-btn cat-fem">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M12 12v8M9 17h6"/></svg>
            Torneo Femenino
          </a>
          <a href="#masculino" className="cat-btn cat-masc">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="10" cy="14" r="4"/><path d="M14 10l6-6M16 4h4v4"/></svg>
            Torneo Masculino
          </a>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><div className="hero-stat-num">2</div><div className="hero-stat-lbl">Torneos</div></div>
          <div className="hero-stat"><div className="hero-stat-num">18</div><div className="hero-stat-lbl">Equipos</div></div>
          <div className="hero-stat"><div className="hero-stat-num">7</div><div className="hero-stat-lbl">Fechas</div></div>
          <div className="hero-stat"><div className="hero-stat-num">200+</div><div className="hero-stat-lbl">Jugadores</div></div>
          <div className="hero-stat"><div className="hero-stat-num">62</div><div className="hero-stat-lbl">Partidos</div></div>
        </div>
        <div className="scroll-arrow">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
        </div>
      </section>
    </>
  );
}
