import { useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import { useStats } from '../context/StatsContext';

const CUPS = [
  { key: 'oro',    label: 'Copa de Oro',    color: '#F0B429' },
  { key: 'plata',  label: 'Copa de Plata',  color: '#C7D1DD' },
  { key: 'bronce', label: 'Copa de Bronce', color: '#CD7F32' },
];

// Mismo criterio de orden que la tabla de posiciones (TorneoView): PTS -> DIF -> PF.
function sortByStandings(equipos) {
  return [...(equipos ?? [])].sort((a, b) => {
    const ptsA = (a.pg ?? 0) * 2 + (a.pp ?? 0), ptsB = (b.pg ?? 0) * 2 + (b.pp ?? 0);
    if (ptsB !== ptsA) return ptsB - ptsA;
    const difA = (a.pf ?? 0) - (a.pc ?? 0), difB = (b.pf ?? 0) - (b.pc ?? 0);
    if (difB !== difA) return difB - difA;
    return (b.pf ?? 0) - (a.pf ?? 0);
  });
}

// Arma los 3 pools (oro/plata/bronce) según la posición actual en la tabla,
// con el mismo corte que ya se usa para las bandas de color (1-4 oro, 5-8
// plata, resto bronce). En masculino se arma por zona (A/B) y se combinan,
// igual que la banda por zona que ya se muestra en la tabla de posiciones.
function buildPools(equipos, mode) {
  if (mode === 'masculino') {
    const zonaA = sortByStandings(equipos.filter(t => t.zona === 'A'));
    const zonaB = sortByStandings(equipos.filter(t => t.zona === 'B'));
    return {
      oro:    sortByStandings([...zonaA.slice(0, 4), ...zonaB.slice(0, 4)]),
      plata:  sortByStandings([...zonaA.slice(4, 8), ...zonaB.slice(4, 8)]),
      bronce: sortByStandings([...zonaA.slice(8),    ...zonaB.slice(8)]),
    };
  }
  const ordenados = sortByStandings(equipos);
  return {
    oro:    ordenados.slice(0, 4),
    plata:  ordenados.slice(4, 8),
    bronce: ordenados.slice(8),
  };
}

// Cuadro más grande que entra limpio dado el tamaño del pool: 8 (cuartos),
// 4 (semis) o 2 (solo final). Si hay menos de 2 equipos no alcanza para
// armar nada real todavía.
function bracketSizeFor(n) {
  if (n >= 8) return 8;
  if (n >= 4) return 4;
  if (n >= 2) return 2;
  return 0;
}

function TeamSeed({ team, seed }) {
  if (!team) return <div className="bracket-team tbd">Por definir</div>;
  return (
    <div className="bracket-team">
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
        <img src={team.logo} alt="" decoding="async"
          style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          onError={e => { e.target.style.display = 'none'; }}/>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {seed}. {team.name}
        </span>
      </span>
    </div>
  );
}

// Bracket "en vivo": muestra cómo quedarían los cruces HOY según la tabla de
// posiciones actual — no resultados jugados de playoffs (todavía no hay
// carga de partidos de postemporada), sino la proyección de semillas que se
// va actualizando sola a medida que cambia la tabla de la fase regular.
function BracketProyectado({ pool, accentColor }) {
  const size = bracketSizeFor(pool.length);
  if (size === 0) return <BracketVacio accentColor={accentColor} />;

  const seeded = pool.slice(0, size);

  if (size === 8) {
    const pairs = [[0,7],[1,6],[2,5],[3,4]];
    return (
      <div className="bracket-wrap">
        <div className="bracket">
          <div className="bracket-round">
            <div className="bracket-round-label">Cuartos</div>
            {pairs.map(([a, b]) => (
              <div key={a} className="bracket-match">
                <TeamSeed team={seeded[a]} seed={a + 1}/>
                <TeamSeed team={seeded[b]} seed={b + 1}/>
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

  if (size === 4) {
    const pairs = [[0,3],[1,2]];
    return (
      <div className="bracket-wrap">
        <div className="bracket">
          <div className="bracket-round">
            <div className="bracket-round-label">Semifinal</div>
            {pairs.map(([a, b]) => (
              <div key={a} className="bracket-match">
                <TeamSeed team={seeded[a]} seed={a + 1}/>
                <TeamSeed team={seeded[b]} seed={b + 1}/>
              </div>
            ))}
          </div>
          <div className="bracket-round">
            <div className="bracket-round-label">Final</div>
            <div className="bracket-match" style={{ marginTop: 32 }}>
              <div className="bracket-team tbd">TBD</div>
              <div className="bracket-team tbd">TBD</div>
            </div>
          </div>
          <div className="bracket-round">
            <div className="bracket-round-label">Campeon</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', paddingTop: 40 }}>
              <div style={{ textAlign: 'center', color: accentColor ?? 'var(--gold)' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill={accentColor ?? 'var(--gold)'} opacity=".3">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <div style={{ fontFamily: "'Bebas Neue'", fontSize: 16, letterSpacing: 2, marginTop: 8, opacity: .4 }}>
                  Por definir
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // size === 2 — solo alcanza para una final directa
  return (
    <div className="bracket-wrap">
      <div className="bracket">
        <div className="bracket-round">
          <div className="bracket-round-label">Final</div>
          <div className="bracket-match">
            <TeamSeed team={seeded[0]} seed={1}/>
            <TeamSeed team={seeded[1]} seed={2}/>
          </div>
        </div>
      </div>
    </div>
  );
}

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

function CupBracket({ cup, pool }) {
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
      <BracketProyectado pool={pool} accentColor={cup.color}/>
    </div>
  );
}

export function PlayoffsBracket() {
  const { mode } = useTournament();
  const { equipos } = useStats();

  const pools = useMemo(() => buildPools(equipos ?? [], mode), [equipos, mode]);

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
        <div style={{ marginBottom: 24, fontFamily: "'Barlow Condensed'", fontSize: 12, color: 'var(--gray)' }}>
          Cruces proyectados según la posición actual en la tabla — se actualizan solos a medida que se cargan resultados.
        </div>

        {CUPS.map(cup => (
          <CupBracket key={cup.key} cup={cup} pool={pools[cup.key]}/>
        ))}
      </section>
    </>
  );
}
