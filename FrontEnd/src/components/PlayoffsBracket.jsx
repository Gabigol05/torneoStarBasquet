import { useMemo } from 'react';
import { useTournament } from '../context/TournamentContext';
import { useStats } from '../context/StatsContext';

const CUPS = [
  { key: 'oro',    label: 'Copa de Oro',    color: '#F0B429' },
  { key: 'plata',  label: 'Copa de Plata',  color: '#C7D1DD' },
  { key: 'bronce', label: 'Copa de Bronce', color: '#CD7F32' },
];

// Alpha en hex de 2 digitos, concatenado directo al color (igual que en las
// tarjetas de fixture/resultado/lider/votaciones) — evita color-mix()/
// variables CSS con alpha dinamico, que no anda bien en navegadores viejos.
const hexA = (hex, alpha) => `${hex}${alpha}`;

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
      <span style={{ display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' }}>
        <img src={team.logo} alt="" decoding="async"
          style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
            border: `1.5px solid ${team.color}`, boxShadow: `0 0 6px ${hexA(team.color, '59')}` }}
          onError={e => { e.target.style.display = 'none'; }}/>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {seed}. {team.name}
        </span>
      </span>
    </div>
  );
}

// Wrapper de un cruce con equipos reales: degradado con los colores de ambos
// equipos (mismo lenguaje que fixture/resultado/votaciones). Los cruces que
// todavia son "TBD" en ambos lados siguen usando el .bracket-match plano.
function BracketMatch({ teamA, teamB, seedA, seedB }) {
  const cA = teamA?.color ?? '#5A6B85';
  const cB = teamB?.color ?? '#5A6B85';
  return (
    <div className="bracket-match" style={{ background: `linear-gradient(115deg, ${hexA(cA, '55')}, #1C2535 45%, ${hexA(cB, '55')})` }}>
      <div className="bracket-match-inner" style={{ background: `linear-gradient(135deg, ${hexA(cA, '14')}, #0B111C 45%, ${hexA(cB, '14')})` }}>
        <TeamSeed team={teamA} seed={seedA}/>
        <TeamSeed team={teamB} seed={seedB}/>
      </div>
    </div>
  );
}

// Bracket "en vivo": muestra cómo quedarían los cruces HOY según la tabla de
// posiciones actual — no resultados jugados de playoffs (todavía no hay
// carga de partidos de postemporada), sino la proyección de semillas que se
// va actualizando sola a medida que cambia la tabla de la fase regular.
// Cuando el pool no entra justo en un cuadro de potencia de 2 (por ejemplo
// Copa de Bronce con 12+11 equipos por zona: sobran 7, y bracketSizeFor
// corta en 4), antes esos equipos de mas quedaban afuera del cuadro sin
// ningun aviso — como si no existieran. Se listan aparte para que no
// desaparezcan silenciosamente.
function EquiposFueraDeCuadro({ teams, accentColor }) {
  if (!teams.length) return null;
  return (
    <div style={{ marginTop: 16, fontFamily: "'Barlow Condensed'", fontSize: 12.5, color: 'var(--gray)' }}>
      <span style={{ color: accentColor ?? 'var(--gold)', fontWeight: 700 }}>
        También compiten por esta copa (a la espera de que se defina el cuadro):
      </span>{' '}
      {teams.map(t => t.name).join(' · ')}
    </div>
  );
}

function BracketProyectado({ pool, accentColor }) {
  const size = bracketSizeFor(pool.length);
  if (size === 0) return <BracketVacio accentColor={accentColor} />;

  const seeded = pool.slice(0, size);
  const sobrantes = pool.slice(size);

  if (size === 8) {
    const pairs = [[0,7],[1,6],[2,5],[3,4]];
    return (
      <>
      <div className="bracket-wrap">
        <div className="bracket">
          <div className="bracket-round">
            <div className="bracket-round-label">Cuartos</div>
            {pairs.map(([a, b]) => (
              <BracketMatch key={a} teamA={seeded[a]} teamB={seeded[b]} seedA={a + 1} seedB={b + 1}/>
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
      <EquiposFueraDeCuadro teams={sobrantes} accentColor={accentColor}/>
      </>
    );
  }

  if (size === 4) {
    const pairs = [[0,3],[1,2]];
    return (
      <>
      <div className="bracket-wrap">
        <div className="bracket">
          <div className="bracket-round">
            <div className="bracket-round-label">Semifinal</div>
            {pairs.map(([a, b]) => (
              <BracketMatch key={a} teamA={seeded[a]} teamB={seeded[b]} seedA={a + 1} seedB={b + 1}/>
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
      <EquiposFueraDeCuadro teams={sobrantes} accentColor={accentColor}/>
      </>
    );
  }

  // size === 2 — solo alcanza para una final directa
  return (
    <>
    <div className="bracket-wrap">
      <div className="bracket">
        <div className="bracket-round">
          <div className="bracket-round-label">Final</div>
          <BracketMatch teamA={seeded[0]} teamB={seeded[1]} seedA={1} seedB={2}/>
        </div>
      </div>
    </div>
    <EquiposFueraDeCuadro teams={sobrantes} accentColor={accentColor}/>
    </>
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
