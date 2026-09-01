import { useMemo, useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import { useStats } from '../context/StatsContext';
import { GameCenterModal } from './GameCenterModal';
import { MatchResultCard, FixtureCard, buildJugadorasMap } from './TorneoView.jsx';

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
// Exportada (junto con buildPools/bracketSizeFor/resolveWinner más abajo)
// para que PlayoffsAdmin.jsx (panel "Cerrar Temporada Regular") pueda armar
// los cruces de playoff con EXACTAMENTE el mismo criterio de siembra que usa
// este cuadro para proyectar — si se desalinearan, el botón "Generar" podría
// crear un cruce que el cuadro después no sepa dónde mostrar.
export function sortByStandings(equipos) {
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
export function buildPools(equipos, mode) {
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
export function bracketSizeFor(n) {
  if (n >= 8) return 8;
  if (n >= 4) return 4;
  if (n >= 2) return 2;
  return 0;
}

// Devuelve el equipo GANADOR de un partido real de playoff ya finalizado, o
// null si todavía no se jugó / no se cargó. Es la pieza clave del auto-avance:
// en cuanto este partido se marca "finalizado", el ganador queda disponible
// para completar solo el casillero de la ronda siguiente.
export function resolveWinner(partido, equipoMap) {
  if (!partido || partido.estado !== 'finalizado') return null;
  const pl = partido.puntos_local ?? 0, pv = partido.puntos_visit ?? 0;
  if (pl === pv) return null; // no debería pasar (el básquet no admite empates), pero por las dudas
  const ganadorId = pl > pv ? partido.equipo_local_id : partido.equipo_visit_id;
  return equipoMap[ganadorId] ?? null;
}

function buscarPartidoSlot(partidosCopa, instancia, llave) {
  return partidosCopa.find(p => p.instancia === instancia && p.llave === llave) ?? null;
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
          {seed != null ? `${seed}. ` : ''}{team.name}
        </span>
      </span>
    </div>
  );
}

// Wrapper de un cruce con equipos reales pero SIN resultado todavía: o bien
// la proyección por semilla (fase regular sin jugar aún el cruce), o el
// casillero de la ronda siguiente ya completado con el/la ganador/a real de
// la ronda anterior (auto-avance) mientras ese partido no se cargó todavía.
// Degradado con los colores de ambos equipos — mismo lenguaje que
// fixture/resultado/votaciones. Los cruces que siguen "TBD" en ambos lados
// usan el .bracket-match plano.
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

// Bracket "en vivo": arranca proyectando los cruces según la posición actual
// en la tabla de posiciones (cuando todavía no hay ningún resultado real de
// esa ronda), y en cuanto se carga un partido de playoff real para un
// casillero, lo reemplaza por el resultado real — con el ganador resaltado y
// completando automáticamente el casillero de la ronda siguiente, sin
// esperar a que ese próximo partido se cree.
// Cuando el pool no entra justo en un cuadro de potencia de 2 (por ejemplo
// Copa de Bronce con 12+11 equipos por zona: sobran 7, y bracketSizeFor
// corta en 4), esos equipos de más se listan aparte para que no desaparezcan
// silenciosamente.
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

// Slot de una ronda: real si ya hay partido cargado para esa copa+instancia+
// llave, si no la proyección (semilla o auto-avance con el ganador previo).
// Un cruce real usa la MISMA tarjeta que "Resultados"/"Fixture" de temporada
// regular — MatchResultCard si ya se jugó (o está en vivo), FixtureCard si
// todavía está pendiente — en vez de una versión compacta aparte, para que
// un partido de playoff se vea (colores, parciales, MVP) y se pueda abrir
// (stats de partido y jugadoras) exactamente igual que cualquier otro.
function Slot({ partidosCopa, instancia, llave, accentColor, fallbackA, fallbackB, seedA, seedB, equipos, jugadorasMap, fechas, onAbrirPartido }) {
  const real = buscarPartidoSlot(partidosCopa, instancia, llave);
  if (real) {
    if (real.estado === 'pendiente') {
      return <FixtureCard partido={real} equiposFem={equipos} fechas={fechas}/>;
    }
    return (
      <MatchResultCard partido={real} equiposFem={equipos} jugadorasMap={jugadorasMap} fechas={fechas}
        onClick={() => onAbrirPartido?.(real.id)}/>
    );
  }
  return <BracketMatch teamA={fallbackA} teamB={fallbackB} seedA={seedA} seedB={seedB}/>;
}

// ── MEJORA (pedido de Alvaro): el campeón es el logro más importante del
// cuadro y antes era un ícono chico (40-48px) con el nombre en letra
// chica, exactamente igual de discreto que cualquier otro casillero del
// bracket — se perdía. Ahora es una tarjeta propia (solo cuando ya hay
// campeón definido — mientras está "Por definir" se deja igual de
// discreto que antes, para no decorar de más algo que todavía no pasó):
// más aire, el logo bien grande con doble anillo dorado + resplandor, una
// etiqueta "🏆 CAMPEÓN" arriba, el nombre en letra grande y el marcador de
// la final abajo — de un vistazo se nota cuál es el cajón importante.
function CampeonBox({ partidoFinal, equipoMap, accentColor, size }) {
  const ganador = resolveWinner(partidoFinal, equipoMap);
  const colorCss = accentColor ?? 'var(--gold)';
  const colorHex = accentColor ?? '#F0B429';
  const iconSize = size === 8 ? 92 : size === 4 ? 80 : 68;
  const paddingTop = size === 8 ? 48 : 20;

  const pl = partidoFinal?.puntos_local ?? 0;
  const pv = partidoFinal?.puntos_visit ?? 0;
  const marcador = ganador && partidoFinal ? `${Math.max(pl, pv)} - ${Math.min(pl, pv)}` : null;

  const contenido = (
    <div style={{ textAlign: 'center' }}>
      {ganador && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px',
          borderRadius: 100, border: `1px solid ${hexA(colorHex, '55')}`, background: hexA(colorHex, '1a'),
          fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 11,
          letterSpacing: 2, textTransform: 'uppercase', color: colorCss, marginBottom: 16,
        }}>
          🏆 Campeón
        </div>
      )}
      {ganador?.logo ? (
        <img src={ganador.logo} alt="" decoding="async"
          style={{ width: iconSize, height: iconSize, borderRadius: '50%', objectFit: 'cover',
            border: `3px solid ${colorCss}`,
            boxShadow: `0 0 26px ${hexA(colorHex, '80')}, 0 0 0 6px ${hexA(colorHex, '14')}` }}
          onError={e => { e.target.style.display = 'none'; }}/>
      ) : (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={colorCss} opacity={ganador ? 1 : .3}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      )}
      <div style={{
        fontFamily: "'Bebas Neue'", fontSize: size === 8 ? 27 : 20, letterSpacing: 2,
        marginTop: 14, color: colorCss, opacity: ganador ? 1 : .4, lineHeight: 1.05,
      }}>
        {ganador ? ganador.name : 'Por definir'}
      </div>
      {marcador && (
        <div style={{
          marginTop: 6, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700,
          fontSize: 13, letterSpacing: 1, color: '#8899BB',
        }}>
          {marcador} en la Final
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', paddingTop }}>
      {ganador ? (
        <div style={{
          position: 'relative', padding: '26px 24px 22px', borderRadius: 20,
          border: `1px solid ${hexA(colorHex, '4d')}`,
          background: `radial-gradient(ellipse 170px 130px at 50% 0%, ${hexA(colorHex, '26')}, transparent 70%), rgba(8,16,26,.5)`,
          boxShadow: `0 0 36px ${hexA(colorHex, '20')}`,
        }}>
          {contenido}
        </div>
      ) : contenido}
    </div>
  );
}

function BracketProyectado({ pool, accentColor, partidosCopa, equipoMap, equipos, jugadorasMap, fechas, onAbrirPartido }) {
  const size = bracketSizeFor(pool.length);
  if (size === 0) return <BracketVacio accentColor={accentColor} />;

  const seeded = pool.slice(0, size);
  const sobrantes = pool.slice(size);
  const slotProps = { equipos, jugadorasMap, fechas, onAbrirPartido, accentColor };

  if (size === 8) {
    const pairs = [[0,7],[1,6],[2,5],[3,4]];
    // Ganadores de cuartos (real si el partido está cargado y finalizado,
    // null si todavía no) — alimentan el casillero de semifinal.
    const ganadoresCuartos = pairs.map((_, i) =>
      resolveWinner(buscarPartidoSlot(partidosCopa, 'cuartos', i + 1), equipoMap)
    );
    const semisSlots = [[0,1],[2,3]];
    const ganadoresSemis = semisSlots.map((_, i) =>
      resolveWinner(buscarPartidoSlot(partidosCopa, 'semifinal', i + 1), equipoMap)
    );
    const partidoFinal = buscarPartidoSlot(partidosCopa, 'final', 1);

    return (
      <>
      <div className="bracket-wrap">
        <div className="bracket">
          <div className="bracket-round">
            <div className="bracket-round-label">Cuartos</div>
            {pairs.map(([a, b], i) => (
              <Slot key={a} {...slotProps} partidosCopa={partidosCopa} instancia="cuartos" llave={i + 1}
                fallbackA={seeded[a]} fallbackB={seeded[b]} seedA={a + 1} seedB={b + 1}/>
            ))}
          </div>
          <div className="bracket-round">
            <div className="bracket-round-label">Semifinal</div>
            <div style={{ marginTop: 32 }}>
              <Slot {...slotProps} partidosCopa={partidosCopa} instancia="semifinal" llave={1}
                fallbackA={ganadoresCuartos[0]} fallbackB={ganadoresCuartos[1]}/>
            </div>
            <div style={{ marginTop: 48 }}>
              <Slot {...slotProps} partidosCopa={partidosCopa} instancia="semifinal" llave={2}
                fallbackA={ganadoresCuartos[2]} fallbackB={ganadoresCuartos[3]}/>
            </div>
          </div>
          <div className="bracket-round">
            <div className="bracket-round-label">Final</div>
            <div style={{ marginTop: 120 }}>
              <Slot {...slotProps} partidosCopa={partidosCopa} instancia="final" llave={1}
                fallbackA={ganadoresSemis[0]} fallbackB={ganadoresSemis[1]}/>
            </div>
          </div>
          <div className="bracket-round">
            <div className="bracket-round-label">Campeon</div>
            <CampeonBox partidoFinal={partidoFinal} equipoMap={equipoMap} accentColor={accentColor} size={8}/>
          </div>
        </div>
      </div>
      <EquiposFueraDeCuadro teams={sobrantes} accentColor={accentColor}/>
      </>
    );
  }

  if (size === 4) {
    const pairs = [[0,3],[1,2]];
    const ganadoresSemis = pairs.map((_, i) =>
      resolveWinner(buscarPartidoSlot(partidosCopa, 'semifinal', i + 1), equipoMap)
    );
    const partidoFinal = buscarPartidoSlot(partidosCopa, 'final', 1);

    return (
      <>
      <div className="bracket-wrap">
        <div className="bracket">
          <div className="bracket-round">
            <div className="bracket-round-label">Semifinal</div>
            {pairs.map(([a, b], i) => (
              <Slot key={a} {...slotProps} partidosCopa={partidosCopa} instancia="semifinal" llave={i + 1}
                fallbackA={seeded[a]} fallbackB={seeded[b]} seedA={a + 1} seedB={b + 1}/>
            ))}
          </div>
          <div className="bracket-round">
            <div className="bracket-round-label">Final</div>
            <div style={{ marginTop: 32 }}>
              <Slot {...slotProps} partidosCopa={partidosCopa} instancia="final" llave={1}
                fallbackA={ganadoresSemis[0]} fallbackB={ganadoresSemis[1]}/>
            </div>
          </div>
          <div className="bracket-round">
            <div className="bracket-round-label">Campeon</div>
            <CampeonBox partidoFinal={partidoFinal} equipoMap={equipoMap} accentColor={accentColor} size={4}/>
          </div>
        </div>
      </div>
      <EquiposFueraDeCuadro teams={sobrantes} accentColor={accentColor}/>
      </>
    );
  }

  // size === 2 — solo alcanza para una final directa
  const partidoFinal = buscarPartidoSlot(partidosCopa, 'final', 1);
  return (
    <>
    <div className="bracket-wrap">
      <div className="bracket">
        <div className="bracket-round">
          <div className="bracket-round-label">Final</div>
          <Slot {...slotProps} partidosCopa={partidosCopa} instancia="final" llave={1}
            fallbackA={seeded[0]} fallbackB={seeded[1]} seedA={1} seedB={2}/>
        </div>
        <div className="bracket-round">
          <div className="bracket-round-label">Campeon</div>
          <CampeonBox partidoFinal={partidoFinal} equipoMap={equipoMap} accentColor={accentColor} size={2}/>
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

// Cruces de "Tercer Puesto" — solo se muestran si ya se cargó ese partido
// (no se proyecta, porque no hay forma de saber de antemano quién pierde
// cada semifinal).
function TercerPuesto({ partido, equipos, jugadorasMap, fechas, onAbrirPartido, accentColor }) {
  if (!partido) return null;
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#8a96ad', marginBottom: 8 }}>
        Tercer Puesto
      </div>
      <div style={{ maxWidth: 320 }}>
        {partido.estado === 'pendiente'
          ? <FixtureCard partido={partido} equiposFem={equipos} fechas={fechas}/>
          : <MatchResultCard partido={partido} equiposFem={equipos} jugadorasMap={jugadorasMap} fechas={fechas}
              onClick={() => onAbrirPartido?.(partido.id)}/>}
      </div>
    </div>
  );
}

function CupBracket({ cup, pool, partidosPlayoff, equipoMap, equipos, jugadorasMap, fechas, onAbrirPartido }) {
  const partidosCopa = useMemo(
    () => partidosPlayoff.filter(p => p.copa === cup.key),
    [partidosPlayoff, cup.key]
  );
  const tercerPuesto = buscarPartidoSlot(partidosCopa, 'tercer_puesto', 1);

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
      <BracketProyectado pool={pool} accentColor={cup.color} partidosCopa={partidosCopa} equipoMap={equipoMap}
        equipos={equipos} jugadorasMap={jugadorasMap} fechas={fechas} onAbrirPartido={onAbrirPartido}/>
      <TercerPuesto partido={tercerPuesto} equipos={equipos} jugadorasMap={jugadorasMap} fechas={fechas}
        onAbrirPartido={onAbrirPartido} accentColor={cup.color}/>
    </div>
  );
}

export function PlayoffsBracket() {
  const { mode } = useTournament();
  const { equipos, partidos, fechas } = useStats();
  // Click en un resultado o próximo cruce de playoff abre el mismo Game
  // Center (marcador, parciales, box score por jugadora/jugador) que se abre
  // desde "Resultados" — mismo patrón que ya usa TorneoView.jsx.
  const [selectedMatch, setSelectedMatch] = useState(null);

  const pools = useMemo(() => buildPools(equipos ?? [], mode), [equipos, mode]);
  const equipoMap = useMemo(() => Object.fromEntries((equipos ?? []).map(t => [t.id, t])), [equipos]);
  const jugadorasMap = useMemo(() => buildJugadorasMap(equipos ?? []), [equipos]);
  // Solo partidos de playoff (cargados desde el admin con "¿Es Playoff?"
  // tildado) — el resto de partidos de temporada regular no entra acá.
  const partidosPlayoff = useMemo(() => (partidos ?? []).filter(p => p.es_playoff), [partidos]);
  const hayResultadosReales = partidosPlayoff.length > 0;

  return (
    <>
      <GameCenterModal
        key={selectedMatch ?? 'none'}
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        partidoId={selectedMatch}
        mode={mode}
      />
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
          {hayResultadosReales
            ? 'Los cruces con resultado ya cargado muestran el marcador real y quién avanza — tocalos para ver el partido completo. El resto sigue proyectado por la posición actual en la tabla, y se completa solo apenas se carga cada partido.'
            : 'Cruces proyectados según la posición actual en la tabla — se actualizan solos a medida que se cargan resultados de playoffs.'}
        </div>

        {CUPS.map(cup => (
          <CupBracket key={cup.key} cup={cup} pool={pools[cup.key]} partidosPlayoff={partidosPlayoff} equipoMap={equipoMap}
            equipos={equipos} jugadorasMap={jugadorasMap} fechas={fechas} onAbrirPartido={setSelectedMatch}/>
        ))}
      </section>
    </>
  );
}
