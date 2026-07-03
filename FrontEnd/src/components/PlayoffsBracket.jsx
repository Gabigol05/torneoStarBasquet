import { useTournament } from '../context/TournamentContext';

function BracketVacio({ accentColor }) {
  return (
    <div className="bracket-wrap">
      <div className="bracket">
        <div className="bracket-round">
          <div className="bracket-round-label">Cuartos</div>
          {[[1,8],[2,7],[3,6],[4,5]].map(([a,b]) => (
            <div key={a} className="bracket-match">
              <div className="bracket-team tbd">{a}. Por definir</div>
              <div className="bracket-team tbd">{b}. Por definir</div>
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
        <div className="bracket-round">
          <div className="bracket-round-label">Final</div>
          <div className="bracket-match" style={{ marginTop: 120 }}>
            <div className="bracket-team tbd">TBD</div>
            <div className="bracket-team tbd">TBD</div>
          </div>
        </div>
        <div className="bracket-round">
          <div className="bracket-round-label">🏆 Campeón</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', paddingTop: 80 }}>
            <div style={{ textAlign: 'center', color: 'var(--gold)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--gold)" opacity=".3">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: 18, letterSpacing: 2, marginTop: 8, opacity: .4 }}>
                Por definir
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlayoffsBracket() {
  const { mode } = useTournament();

  return (
    <>
      <section className="page-section" id="bracket">
        <p className="section-eyebrow" style={{ color: 'var(--gold)' }}>Postemporada</p>
        <h2 className="section-heading">Playoffs <span className="gold">2026</span></h2>

        {/* ── FEMENINO ── */}
        {mode === 'femenino' && (
          <>
            <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 12, fontWeight: 700,
              letterSpacing: 3, textTransform: 'uppercase', color: 'var(--fem2)', marginBottom: 16 }}>
              ♀ Bracket Femenino
            </div>
            <BracketVacio accentColor="var(--fem2)"/>
          </>
        )}

        {/* ── MASCULINO ── */}
        {mode === 'masculino' && (
          <>
            <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 12, fontWeight: 700,
              letterSpacing: 3, textTransform: 'uppercase', color: 'var(--masc2)', marginBottom: 16 }}>
              ♂ Bracket Masculino
            </div>
            <BracketVacio accentColor="var(--masc2)"/>
          </>
        )}
      </section>
    </>
  );
}