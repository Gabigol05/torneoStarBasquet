import { useMemo, useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import { useEquiposDeTemporada } from '../hooks/useEquiposDeTemporada';
import { useStats } from '../context/StatsContext';
import { GameCenterModal } from './LazyModals';
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
// con el mismo corte que ya se usa para las bandas de color. Si los equipos
// que llegan tienen zona asignada (A/B) se arma por zona y se combinan,
// igual que la banda por zona que ya se muestra en la tabla de posiciones —
// masculino siempre la tiene, y femenino desde que también pasó a jugarse
// por zonas (temporada 2026). Si ningún equipo tiene zona (por ejemplo, una
// temporada archivada de femenino de antes de las zonas) se arma con la
// tabla general, como se hacía antes.
//
// El corte por zona NO es un número fijo de equipos: cada zona se parte en
// 3 grupos de ~1/3 de sus equipos (redondeando para arriba), así los pools
// quedan parejos entre sí sea cual sea el tamaño de la zona — con 2 equipos
// arriba de cada zona a Oro, los 2 siguientes a Plata y los últimos 2 a
// Bronce (zonas de 6, como femenino), o con 4/4/4 (zonas de 12, como
// masculino) — y los cuadros de playoff quedan alineados (mismo tamaño de
// cuadro en las 3 copas).
export function buildPools(equipos, mode) {
  const usaZonas = equipos.some(t => t.zona === 'A' || t.zona === 'B');
  if (usaZonas) {
    const zonaA = sortByStandings(equipos.filter(t => t.zona === 'A'));
    const zonaB = sortByStandings(equipos.filter(t => t.zona === 'B'));
    const gA = Math.ceil(zonaA.length / 3);
    const gB = Math.ceil(zonaB.length / 3);
    // posZona = puesto del equipo DENTRO de su zona (1°A, 2°B, ...) — lo usa
    // primeraRonda() para cruzar zonas y para rotular cada casillero.
    zonaA.forEach((t, i) => { zonaA[i] = { ...t, posZona: i + 1 }; });
    zonaB.forEach((t, i) => { zonaB[i] = { ...t, posZona: i + 1 }; });
    return {
      oro:    sortByStandings([...zonaA.slice(0, gA),      ...zonaB.slice(0, gB)]),
      plata:  sortByStandings([...zonaA.slice(gA, gA * 2), ...zonaB.slice(gB, gB * 2)]),
      bronce: sortByStandings([...zonaA.slice(gA * 2),     ...zonaB.slice(gB * 2)]),
    };
  }
  // Mismo corte dinámico de ~1/3 que la rama por zona de arriba — antes acá
  // quedaba un corte fijo 4/8 que, con una temporada archivada chica (pocos
  // equipos), dejaba la Copa de Bronce vacía (slice(8) de una lista de 7
  // equipos = nada). Con el corte dinámico, Bronce siempre se lleva su
  // tercio real, sea cual sea la cantidad de equipos de esa temporada.
  const ordenados = sortByStandings(equipos);
  const g = Math.ceil(ordenados.length / 3);
  return {
    oro:    ordenados.slice(0, g),
    plata:  ordenados.slice(g, g * 2),
    bronce: ordenados.slice(g * 2),
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

// Etiqueta de siembra de un equipo: "1°A" si viene de una zona, o el número
// de la tabla general si no hay zonas.
export function etiquetaSiembra(team, fallbackNum) {
  if (team?.zona && team?.posZona) return `${team.posZona}°${team.zona}`;
  return fallbackNum != null ? `${fallbackNum}°` : null;
}

// Cruces de la PRIMERA ronda de una copa (pedido de Alvaro).
//
// Con zonas, se cruzan las zonas: el 1° de una zona contra el último
// clasificado de la otra, el 2° contra el anteúltimo, etc. Con 4 por zona:
//   llave 1: 1°A vs 4°B      llave 3: 1°B vs 4°A
//   llave 2: 2°B vs 3°A      llave 4: 2°A vs 3°B
// Las semis NO salen de llaves vecinas: se vuelven a cruzar por tabla
// general entre los 4 ganadores (ver semisPorTablaGeneral más abajo).
// Con 2 por zona (semis directo): 1°A vs 2°B y 1°B vs 2°A. Con 1: 1°A vs 1°B.
// El local es siempre el mejor ubicado.
//
// Sin zonas (o si una zona no llega a completar su mitad del cuadro) se usa
// la siembra general de antes: 1 vs 8, 2 vs 7... sobre la tabla combinada.
//
// Devuelve { pares: [[local, visita]], seeds: [[etiqA, etiqB]], sobrantes }.
export function primeraRonda(pool, size) {
  const lista = pool ?? [];
  const k = size / 2;
  const zonaA = sortByStandings(lista.filter(t => t.zona === 'A'));
  const zonaB = sortByStandings(lista.filter(t => t.zona === 'B'));

  if (size >= 2 && zonaA.length >= k && zonaB.length >= k) {
    const A = zonaA.slice(0, k), B = zonaB.slice(0, k);
    // Para cada puesto i de la mitad superior: (i°A vs (k+1-i)°B) y (i°B vs
    // (k+1-i)°A), intercalados para que cada semi tenga un equipo de cada
    // mitad (ver comentario de arriba).
    let pares;
    if (k === 4)      pares = [[A[0], B[3]], [B[1], A[2]], [B[0], A[3]], [A[1], B[2]]];
    else if (k === 2) pares = [[A[0], B[1]], [B[0], A[1]]];
    else              pares = [[A[0], B[0]]];
    const usados = new Set(pares.flat().map(t => t.id));
    return {
      pares,
      seeds: pares.map(([a, b]) => [etiquetaSiembra(a), etiquetaSiembra(b)]),
      sobrantes: lista.filter(t => !usados.has(t.id)),
      cruzaZonas: true,
    };
  }

  const seeded = lista.slice(0, size);
  const idx = size === 8 ? [[0,7],[1,6],[2,5],[3,4]] : size === 4 ? [[0,3],[1,2]] : size === 2 ? [[0,1]] : [];
  return {
    pares: idx.map(([a, b]) => [seeded[a], seeded[b]]),
    seeds: idx.map(([a, b]) => [`${a + 1}°`, `${b + 1}°`]),
    sobrantes: lista.slice(size),
    cruzaZonas: false,
  };
}

// Semifinales cuando vienen de cuartos (regla del organizador del torneo):
// NO se cruzan los ganadores de llaves vecinas (llave 1 vs llave 2), sino que
// los 4 equipos que ganaron cuartos se ordenan por la TABLA GENERAL de la
// fase regular (las dos zonas juntas: PTS -> DIF -> PF) y se cruzan
//   Semi 1: 1° vs 4°      Semi 2: 2° vs 3°
// con el mejor ubicado de local. Hasta que no estén los 4 ganadores no se
// puede saber quién juega con quién -> devuelve null.
// La usan el cuadro público y el panel (PlayoffsAdmin) para generar las semis.
export function semisPorTablaGeneral(ganadores) {
  if (!ganadores || ganadores.length !== 4 || ganadores.some(g => !g)) return null;
  const o = sortByStandings(ganadores);
  return [[o[0], o[3]], [o[1], o[2]]];
}

// Aviso que se muestra debajo del título "Semifinal" cuando las semis salen
// de cuartos.
function NotaTablaGeneral() {
  return (
    <div style={{ marginTop: 6, fontSize: 'clamp(12px, 1.4vw, 14px)', letterSpacing: 1.5, color: 'var(--gold)' }}>
      Cruces por tabla general
    </div>
  );
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
          {seed != null ? <span style={{ opacity: .6, marginRight: 5 }}>{seed}</span> : null}{team.name}
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
  // En escritorio este padding baja el casillero para alinearlo con el
  // árbol horizontal (queda a la altura de la Final); ese corrimiento no
  // aplica en la lista vertical de mobile — se saca casi del todo ahí vía
  // --po-pt-campeon8/4 (ver @media 767px en torneo-star.css).
  const paddingTop = size === 8 ? 'var(--po-pt-campeon8, 48px)' : size === 4 ? 'var(--po-pt-campeon4, 20px)' : 0;

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

function BracketProyectado({ pool, accentColor, partidosCopa, equipoMap, equipos, jugadorasMap, fechas, onAbrirPartido, posGeneral }) {
  const size = bracketSizeFor(pool.length);
  if (size === 0) return <BracketVacio accentColor={accentColor} />;

  // Cruces de la primera ronda (con zonas: 1°A vs 4°B, 2°B vs 3°A, etc. —
  // ver primeraRonda) — mismo armado que usa el panel para generarlos.
  const ronda1 = primeraRonda(pool, size);
  const sobrantes = ronda1.sobrantes;
  const slotProps = { equipos, jugadorasMap, fechas, onAbrirPartido, accentColor };

  if (size === 8) {
    const pairs = ronda1.pares;
    // Ganadores de cuartos (real si el partido está cargado y finalizado,
    // null si todavía no) — alimentan el casillero de semifinal.
    const ganadoresCuartos = pairs.map((_, i) =>
      resolveWinner(buscarPartidoSlot(partidosCopa, 'cuartos', i + 1), equipoMap)
    );
    // Semis por tabla general entre los 4 ganadores (ver semisPorTablaGeneral):
    // mientras falte algún resultado de cuartos se muestran "Por definir".
    const semis = semisPorTablaGeneral(ganadoresCuartos);
    const etiqGral = t => (t && posGeneral?.[t.id] ? `${posGeneral[t.id]}° gral` : null);
    const semisSlots = [0, 1];
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
              <Slot key={i} {...slotProps} partidosCopa={partidosCopa} instancia="cuartos" llave={i + 1}
                fallbackA={a} fallbackB={b} seedA={ronda1.seeds[i][0]} seedB={ronda1.seeds[i][1]}/>
            ))}
          </div>
          <div className="bracket-round">
            <div className="bracket-round-label">Semifinal<NotaTablaGeneral/></div>
            {semisSlots.map(i => (
              <div key={i} style={{ marginTop: i === 0 ? 'var(--po-mt-semi1, 32px)' : 'var(--po-mt-semi2, 48px)' }}>
                <Slot {...slotProps} partidosCopa={partidosCopa} instancia="semifinal" llave={i + 1}
                  fallbackA={semis?.[i][0]} fallbackB={semis?.[i][1]}
                  seedA={etiqGral(semis?.[i][0])} seedB={etiqGral(semis?.[i][1])}/>
              </div>
            ))}
          </div>
          <div className="bracket-round">
            <div className="bracket-round-label">Final</div>
            <div style={{ marginTop: 'var(--po-mt-final8, 120px)' }}>
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
    const pairs = ronda1.pares;
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
              <Slot key={i} {...slotProps} partidosCopa={partidosCopa} instancia="semifinal" llave={i + 1}
                fallbackA={a} fallbackB={b} seedA={ronda1.seeds[i][0]} seedB={ronda1.seeds[i][1]}/>
            ))}
          </div>
          <div className="bracket-round">
            <div className="bracket-round-label">Final</div>
            <div style={{ marginTop: 'var(--po-mt-final4, 32px)' }}>
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
            fallbackA={ronda1.pares[0]?.[0]} fallbackB={ronda1.pares[0]?.[1]}
            seedA={ronda1.seeds[0]?.[0]} seedB={ronda1.seeds[0]?.[1]}/>
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
          <div className="bracket-round-label">Semifinal<NotaTablaGeneral/></div>
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

function CupBracket({ cup, pool, partidosPlayoff, equipoMap, equipos, jugadorasMap, fechas, onAbrirPartido, posGeneral }) {
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
        equipos={equipos} jugadorasMap={jugadorasMap} fechas={fechas} onAbrirPartido={onAbrirPartido}
        posGeneral={posGeneral}/>
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

  // Mismo criterio de "juega esta temporada" que TorneoView.jsx/Hero.jsx/
  // SeasonKpis.jsx: `zona` (A/B) es un dato GLOBAL en la base, no algo fijado
  // por temporada — sin este filtro, el cuadro de playoffs de una temporada
  // archivada terminaba armándose con equipos de la temporada actual (o al
  // revés), dando cruces y campeón mal armados (reporte de Alvaro sobre el
  // cuadro de Copa de Bronce). Se usa la participación real (pj/historial
  // dentro de ESA temporada) y la zona solo entra como fallback cuando la
  // temporada mirada es la ACTIVA ahora mismo.
  const { equiposDeTemporada, activaCategoria } = useEquiposDeTemporada(equipos, mode);

  // `zona` (A/B) es un valor GLOBAL/actual, no algo guardado por temporada —
  // para la temporada ACTIVA coincide con la realidad, pero para una
  // temporada archivada ya no significa nada (esos equipos pueden tener hoy
  // la zona de la temporada nueva, o ninguna). Por eso acá se le "saca" la
  // zona a los equipos antes de armar los pools cuando se está mirando una
  // temporada archivada — buildPools() cae solo en su modo sin zonas (tabla
  // general dividida en tercios), que es el método que ya se usaba antes de
  // que existieran las zonas, y que no depende de ningún dato mutable de hoy.
  const equiposParaPools = useMemo(
    () => activaCategoria ? equiposDeTemporada : equiposDeTemporada.map(t => ({ ...t, zona: null })),
    [equiposDeTemporada, activaCategoria]
  );

  const pools = useMemo(() => buildPools(equiposParaPools, mode), [equiposParaPools, mode]);
  // Puesto de cada equipo en la tabla general (las dos zonas juntas) — es el
  // que define los cruces de semifinal.
  const posGeneral = useMemo(
    () => Object.fromEntries(sortByStandings(equiposParaPools).map((t, i) => [t.id, i + 1])),
    [equiposParaPools]
  );
  const equipoMap = useMemo(() => Object.fromEntries(equiposDeTemporada.map(t => [t.id, t])), [equiposDeTemporada]);
  const jugadorasMap = useMemo(() => buildJugadorasMap(equiposDeTemporada), [equiposDeTemporada]);
  // Solo partidos de playoff (cargados desde el admin con "¿Es Playoff?"
  // tildado) — el resto de partidos de temporada regular no entra acá.
  const partidosPlayoff = useMemo(() => (partidos ?? []).filter(p => p.es_playoff), [partidos]);

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
        <h2 className="section-heading" style={{ marginBottom: 28 }}>Playoffs <span className="gold">2026</span></h2>

        {CUPS.map(cup => (
          <CupBracket key={cup.key} cup={cup} pool={pools[cup.key]} partidosPlayoff={partidosPlayoff} equipoMap={equipoMap}
            equipos={equiposDeTemporada} jugadorasMap={jugadorasMap} fechas={fechas} onAbrirPartido={setSelectedMatch}
            posGeneral={posGeneral}/>
        ))}
      </section>
    </>
  );
}
