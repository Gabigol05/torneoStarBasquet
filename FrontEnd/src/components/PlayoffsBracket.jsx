import { useTournament } from '../context/TournamentContext';

const CUPS = [
  { key: 'oro',    label: 'Copa de Oro',    color: '#F0B429' },
  { key: 'plata',  label: 'Copa de Plata',  color: '#C7D1DD' },
  { key: 'bronce', label: 'Copa de Bronce', color: '#CD7F32' },
];

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
          <div className="bracket-round-label">Campeon</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', paddingTop: 80 }}>
            <div style={{ textAlign: 'center', color: accentColor ?? 'var(--gold)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill={accentColor ?? 'var(--gold)'} opacity=".3">
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

function CupBracket({ cup }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        fontFamily: "'Barlow Condensed'", fontSize: 13, fontWeight: 700,
        letterSpacing: 3, textTransform: 'uppercase', color: cup.color, marginBottom: 16,
      }}>
        <span style={{ width: 12, height: 12, borderRadius: 3, background: cup.color, display: 'inline-block' }}/>
        {cup.label}
      </div>
      <BracketVacio accentColor={cup.color}/>
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

        {mode === 'femenino' && (
          <div style={{ marginBottom: 8, fontFamily: "'Barlow Condensed'", fontSize: 12, fontWeight: 700,
            letterSpacing: 3, textTransform: 'uppercase', color: 'var(--fem2)' }}>
            Torneo Femenino
          </div>
        )}
        {mode === 'masculino' && (
          <div style={{ marginBottom: 8, fontFamily: "'Barlow Condensed'", fontSize: 12, fontWeight: 700,
            letterSpacing: 3, textTransform: 'uppercase', color: 'var(--masc2)' }}>
            Torneo Masculino
          </div>
        )}

        {CUPS.map(cup => (
          <CupBracket key={cup.key} cup={cup}/>
        ))}
      </section>
    </>
  );
}
