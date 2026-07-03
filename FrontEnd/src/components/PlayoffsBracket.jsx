/* eslint-disable react/no-unknown-property */
/* Fragmento fiel al HTML original (ver scripts/build_star_components.py). */

export function PlayoffsBracket() {
  return (
    <>
      <section className="page-section" id="bracket">
        <p className="section-eyebrow" style={{color: "var(--gold)"}}>Postemporada</p>
        <h2 className="section-heading">Playoffs <span className="gold">2025</span></h2>

        <div style={{fontFamily: "'Barlow Condensed'", fontSize: "12px", fontWeight: "700", letterSpacing: "3px", textTransform: "uppercase", color: "var(--fem2)", marginBottom: "16px"}}>♀ Bracket Femenino</div>
        <div className="bracket-wrap">
          <div className="bracket">
            <div className="bracket-round">
              <div className="bracket-round-label">Cuartos</div>
              <div className="bracket-match"><div className="bracket-team tbd">1. Por definir</div><div className="bracket-team tbd">8. Por definir</div></div>
              <div className="bracket-match"><div className="bracket-team tbd">2. Por definir</div><div className="bracket-team tbd">7. Por definir</div></div>
              <div className="bracket-match"><div className="bracket-team tbd">3. Por definir</div><div className="bracket-team tbd">6. Por definir</div></div>
              <div className="bracket-match"><div className="bracket-team tbd">4. Por definir</div><div className="bracket-team tbd">5. Por definir</div></div>
            </div>
            <div className="bracket-round">
              <div className="bracket-round-label">Semifinal</div>
              <div className="bracket-match" style={{marginTop: "32px"}}><div className="bracket-team tbd">TBD</div><div className="bracket-team tbd">TBD</div></div>
              <div className="bracket-match" style={{marginTop: "80px"}}><div className="bracket-team tbd">TBD</div><div className="bracket-team tbd">TBD</div></div>
            </div>
            <div className="bracket-round">
              <div className="bracket-round-label">Final</div>
              <div className="bracket-match" style={{marginTop: "120px"}}><div className="bracket-team tbd">TBD</div><div className="bracket-team tbd">TBD</div></div>
            </div>
            <div className="bracket-round">
              <div className="bracket-round-label">🏆 Campeón</div>
              <div style={{display: "flex", alignItems: "center", justifyContent: "center", height: "100%", paddingTop: "80px"}}>
                <div style={{textAlign: "center", color: "var(--gold)"}}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--gold)" opacity=".3"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  <div style={{fontFamily: "'Bebas Neue'", fontSize: "18px", letterSpacing: "2px", marginTop: "8px", opacity: ".4"}}>Por definir</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="bracket-round">
          <div className="bracket-round-label">Semifinal</div>
          <div className="bracket-match" style={{ marginTop: 32 }}>
            <div className="bracket-team tbd">TBD</div>
            <div className="bracket-team tbd">TBD</div>
          </div>
          <div className="bracket-match" style={{ marginTop: 80 }}>
            <div className="bracket-team tbd">TBD</div>
            <div className="bracket-team tbd">TBD</div>
          </div>
        </div>

        <div style={{fontFamily: "'Barlow Condensed'", fontSize: "12px", fontWeight: "700", letterSpacing: "3px", textTransform: "uppercase", color: "var(--masc2)", margin: "48px 0 16px"}}>♂ Bracket Masculino</div>
        <div className="bracket-wrap">
          <div className="bracket">
            <div className="bracket-round">
              <div className="bracket-round-label">Cuartos</div>
              <div className="bracket-match"><div className="bracket-team tbd">1. Por definir</div><div className="bracket-team tbd">8. Por definir</div></div>
              <div className="bracket-match"><div className="bracket-team tbd">2. Por definir</div><div className="bracket-team tbd">7. Por definir</div></div>
              <div className="bracket-match"><div className="bracket-team tbd">3. Por definir</div><div className="bracket-team tbd">6. Por definir</div></div>
              <div className="bracket-match"><div className="bracket-team tbd">4. Por definir</div><div className="bracket-team tbd">5. Por definir</div></div>
            </div>
            <div className="bracket-round">
              <div className="bracket-round-label">Semifinal</div>
              <div className="bracket-match" style={{marginTop: "32px"}}><div className="bracket-team tbd">TBD</div><div className="bracket-team tbd">TBD</div></div>
              <div className="bracket-match" style={{marginTop: "80px"}}><div className="bracket-team tbd">TBD</div><div className="bracket-team tbd">TBD</div></div>
            </div>
            <div className="bracket-round">
              <div className="bracket-round-label">Final</div>
              <div className="bracket-match" style={{marginTop: "120px"}}><div className="bracket-team tbd">TBD</div><div className="bracket-team tbd">TBD</div></div>
            </div>
            <div className="bracket-round">
              <div className="bracket-round-label">🏆 Campeón</div>
              <div style={{display: "flex", alignItems: "center", justifyContent: "center", height: "100%", paddingTop: "80px"}}>
                <div style={{textAlign: "center", color: "var(--gold)"}}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--gold)" opacity=".3"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  <div style={{fontFamily: "'Bebas Neue'", fontSize: "18px", letterSpacing: "2px", marginTop: "8px", opacity: ".4"}}>Por definir</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
