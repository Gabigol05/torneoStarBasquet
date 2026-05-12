/* eslint-disable react/no-unknown-property */
/* Fragmento fiel al HTML original (ver scripts/build_star_components.py). */

export function LeadersSection() {
  return (
    <>
      <section className="page-section" id="jugadores">
        <p className="section-eyebrow" style={{color: "var(--gold)"}}>Estadísticas Individuales</p>
        <h2 className="section-heading">Líderes <span className="gold">2025</span></h2>

        <div style={{marginBottom: "24px", fontFamily: "'Barlow Condensed'", fontSize: "12px", fontWeight: "700", letterSpacing: "3px", textTransform: "uppercase", color: "var(--gray)"}}>TORNEO FEMENINO</div>
        <div className="leaders-grid">
          <div className="leader-card fem">
            <div className="lc-stat-label">🏆 Líder en Puntos</div>
            <div className="lc-top"><div className="lc-avatar t-red">VG</div><div><div className="lc-player-name">Valentina G.</div><div className="lc-team-name">Las Leonas</div></div></div>
            <div className="lc-big-num" style={{color: "var(--fem2)"}}>21.4</div><div className="lc-sub">puntos por partido</div>
            <div className="lc-list">
              <div className="lc-row"><span className="lc-row-rank">2</span><span>Camila R. — Fuego Divino</span><span className="lc-row-val">20.1</span></div>
              <div className="lc-row"><span className="lc-row-rank">3</span><span>Lucía M. — Las Panteras</span><span className="lc-row-val">18.6</span></div>
            </div>
          </div>
          <div className="leader-card fem">
            <div className="lc-stat-label">🔁 Líder en Rebotes</div>
            <div className="lc-top"><div className="lc-avatar t-orange">AP</div><div><div className="lc-player-name">Agustina F.</div><div className="lc-team-name">Las Leonas</div></div></div>
            <div className="lc-big-num" style={{color: "var(--fem2)"}}>9.2</div><div className="lc-sub">rebotes por partido</div>
            <div className="lc-list">
              <div className="lc-row"><span className="lc-row-rank">2</span><span>Sofía P. — Las Águilas</span><span className="lc-row-val">8.9</span></div>
              <div className="lc-row"><span className="lc-row-rank">3</span><span>Lucía M. — Las Panteras</span><span className="lc-row-val">6.4</span></div>
            </div>
          </div>
          <div className="leader-card fem">
            <div className="lc-stat-label">🎯 Líder en Asistencias</div>
            <div className="lc-top"><div className="lc-avatar t-teal">FD</div><div><div className="lc-player-name">Florencia D.</div><div className="lc-team-name">Las Rockets</div></div></div>
            <div className="lc-big-num" style={{color: "var(--fem2)"}}>7.8</div><div className="lc-sub">asistencias por partido</div>
            <div className="lc-list">
              <div className="lc-row"><span className="lc-row-rank">2</span><span>Valentina G. — Las Leonas</span><span className="lc-row-val">6.1</span></div>
              <div className="lc-row"><span className="lc-row-rank">3</span><span>Camila R. — Fuego Divino</span><span className="lc-row-val">4.9</span></div>
            </div>
          </div>
        </div>

        <div style={{margin: "40px 0 24px", fontFamily: "'Barlow Condensed'", fontSize: "12px", fontWeight: "700", letterSpacing: "3px", textTransform: "uppercase", color: "var(--gray)"}}>TORNEO MASCULINO</div>
        <div className="leaders-grid">
          <div className="leader-card masc">
            <div className="lc-stat-label">🏆 Líder en Puntos</div>
            <div className="lc-top"><div className="lc-avatar t-blue">MH</div><div><div className="lc-player-name">Matías H.</div><div className="lc-team-name">Black Mambas</div></div></div>
            <div className="lc-big-num" style={{color: "var(--masc2)"}}>24.1</div><div className="lc-sub">puntos por partido</div>
            <div className="lc-list">
              <div className="lc-row"><span className="lc-row-rank">2</span><span>Nicolás F. — Los Toros</span><span className="lc-row-val">22.4</span></div>
              <div className="lc-row"><span className="lc-row-rank">3</span><span>Diego L. — Los Gladiadores</span><span className="lc-row-val">21.5</span></div>
            </div>
          </div>
          <div className="leader-card masc">
            <div className="lc-stat-label">🔁 Líder en Rebotes</div>
            <div className="lc-top"><div className="lc-avatar t-purple">DL</div><div><div className="lc-player-name">Diego L.</div><div className="lc-team-name">Los Gladiadores</div></div></div>
            <div className="lc-big-num" style={{color: "var(--masc2)"}}>10.2</div><div className="lc-sub">rebotes por partido</div>
            <div className="lc-list">
              <div className="lc-row"><span className="lc-row-rank">2</span><span>Ezequiel P. — Los Jaguares</span><span className="lc-row-val">9.1</span></div>
              <div className="lc-row"><span className="lc-row-rank">3</span><span>Sebastián R. — Los Fenix</span><span className="lc-row-val">8.3</span></div>
            </div>
          </div>
          <div className="leader-card masc">
            <div className="lc-stat-label">🎯 Líder en Asistencias</div>
            <div className="lc-top"><div className="lc-avatar t-blue">LM</div><div><div className="lc-player-name">Lucas M.</div><div className="lc-team-name">Black Mambas</div></div></div>
            <div className="lc-big-num" style={{color: "var(--masc2)"}}>8.4</div><div className="lc-sub">asistencias por partido</div>
            <div className="lc-list">
              <div className="lc-row"><span className="lc-row-rank">2</span><span>Matías H. — Black Mambas</span><span className="lc-row-val">7.2</span></div>
              <div className="lc-row"><span className="lc-row-rank">3</span><span>Rodrigo S. — El Escuadrón</span><span className="lc-row-val">5.1</span></div>
            </div>
          </div>
        </div>
      </section>

      <div className="full-rule"></div>
    </>
  );
}
