import { useMemo, useState } from 'react';
import { useTournament } from '../context/TournamentContext';
import { useEquiposDeTemporada } from '../hooks/useEquiposDeTemporada';
import { useStats } from '../context/StatsContext';
import { GameCenterModal } from './LazyModals';
import { buildJugadorasMap } from './TorneoView.jsx';
import { logoDeEquipo } from '../lib/escudos';

const CUPS = [
  { key: 'oro',    label: 'Copa de Oro',    color: '#F0B429' },
  { key: 'plata',  label: 'Copa de Plata',  color: '#C7D1DD' },
  { key: 'bronce', label: 'Copa de Bronce', color: '#CD7F32' },
];

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
// Las semis NO salen de llaves vecinas ni de una regla fija: los cruces de
// semifinal los arma el organizador del torneo a su criterio y se cargan
// desde el panel (Playoffs). Hasta entonces el cuadro las muestra "Por definir".
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

// Equipos de la copa que no entran en el cuadro (pool que no es potencia
// de 2): se listan aparte para que no desaparezcan.
function EquiposFueraDeCuadro({ teams, accentColor }) {
  if (!teams?.length) return null;
  return (
    <div className="pf-fuera">
      <span style={{ color: accentColor ?? 'var(--gold)' }}>También compiten por esta copa (a la espera de que se defina el cuadro):</span>{' '}
      {teams.map(t => t.name).join(' · ')}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Vista v3 (pedido de Alvaro): una copa por vez con selector, próximo
// partido arriba, y todos los cruces con la MISMA tarjeta compacta —
// antes un partido jugado usaba la tarjeta grande de Resultados y uno sin
// jugar la chica del cuadro, y el cuadro quedaba desparejo.
// ═══════════════════════════════════════════════════════════════════════

const DIAS_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const INSTANCIA_NOMBRE = { cuartos: 'Cuartos', semifinal: 'Semifinal', final: 'Gran final', tercer_puesto: 'Tercer puesto' };
const RONDA_NOMBRE = { cuartos: 'Cuartos', semifinal: 'Semifinales', final: 'Final' };
const RONDA_CORTA = { cuartos: 'Cuartos', semifinal: 'Semis', final: 'Final' };

function diaDe(partido, fechas) {
  const iso = partido?.fecha_partido ?? (fechas ?? []).find(f => f.id === partido?.fecha_id)?.fecha_dia ?? null;
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return { d, txt: `${DIAS_CORTO[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
    corto: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` };
}
const horaDe = p => (p?.hora_inicio ? String(p.hora_inicio).slice(0, 5) : null);

function Escudo({ team, size = 30 }) {
  const src = team?.logo || logoDeEquipo(team?.id);
  if (!team) return <span className="pf-ph" style={{ width: size, height: size }} aria-hidden="true"/>;
  return (
    <span className="pf-esc" style={{ width: size, height: size, borderColor: team.color ?? '#5A6B85' }}>
      {src ? <img src={src} alt="" loading="lazy" decoding="async" onError={e => { e.target.style.visibility = 'hidden'; }}/> : null}
    </span>
  );
}

function FilaEquipo({ team, seed, puntos, estado }) {
  if (!team) {
    return (
      <div className="pf-t pf-t--tbd">
        <Escudo team={null}/>
        <span className="pf-n">Por definir</span>
        <span/>
        <span className="pf-p"/>
      </div>
    );
  }
  return (
    <div className={`pf-t${estado ? ` pf-t--${estado}` : ''}`}>
      <Escudo team={team}/>
      <span className="pf-n">{team.name}</span>
      {seed ? <span className="pf-sd">{seed}</span> : <span/>}
      <span className="pf-p">{puntos ?? ''}</span>
    </div>
  );
}

// Tarjeta compacta de un cruce: real (partido cargado) o proyectado.
function Cruce({ partido, teamA, teamB, seedMap, titulo, esFinal, esProximo, equipoMap, jugadorasMap, fechas, onAbrirPartido }) {
  const real = !!partido;
  const a = real ? (equipoMap[partido.equipo_local_id] ?? teamA) : teamA;
  const b = real ? (equipoMap[partido.equipo_visit_id] ?? teamB) : teamB;
  const jugado = real && partido.estado === 'finalizado';
  const enVivo = real && partido.estado === 'en_juego';
  const conPuntos = jugado || enVivo;
  const pa = conPuntos ? (partido.puntos_local ?? 0) : null;
  const pb = conPuntos ? (partido.puntos_visit ?? 0) : null;
  let ea = null, eb = null;
  if (jugado && pa !== pb) { ea = pa > pb ? 'win' : 'lose'; eb = pa > pb ? 'lose' : 'win'; }

  const dia = real ? diaDe(partido, fechas) : null;
  const hora = real ? horaDe(partido) : null;
  let st;
  if (jugado) st = { c: 'fin', t: 'Final' };
  else if (enVivo) st = { c: 'vivo', t: '● En vivo' };
  else if (real && (dia || hora)) st = { c: 'prox', t: [dia?.txt, hora].filter(Boolean).join(' · ') };
  else if (real) st = { c: 'td', t: 'Sin fecha' };
  else st = { c: 'td', t: 'A definir' };

  const cabecera = jugado && dia ? `${titulo} · ${dia.corto}` : titulo;
  const mvpId = partido?.mvp_jugadora_id ?? partido?.mvp_jugador_id;
  const mvp = mvpId ? jugadorasMap[mvpId] : null;
  const abrir = real ? () => onAbrirPartido?.(partido.id) : null;

  return (
    <div
      className={`pf-m${esFinal ? ' pf-m--final' : ''}${esProximo ? ' pf-m--prox' : ''}${abrir ? ' pf-m--click' : ''}`}
      role={abrir ? 'button' : undefined}
      tabIndex={abrir ? 0 : undefined}
      onClick={abrir ?? undefined}
      onKeyDown={abrir ? (e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } }) : undefined}
    >
      <div className="pf-h">
        <span>{esFinal ? '🏆 ' : ''}{cabecera}</span>
        <span className={`pf-st pf-st--${st.c}`}>{st.t}</span>
      </div>
      <FilaEquipo team={a} seed={a ? seedMap[a.id] : null} puntos={pa} estado={ea}/>
      <FilaEquipo team={b} seed={b ? seedMap[b.id] : null} puntos={pb} estado={eb}/>
      {real && (
        <div className="pf-f">
          {jugado || enVivo
            ? <span>{mvp ? <>MVP <b>{mvp.nombre}</b></> : ''}</span>
            : <span>📍 {partido.lugar || 'A confirmar'}</span>}
          <span className="pf-ver">{jugado ? 'Ver partido →' : 'Detalle →'}</span>
        </div>
      )}
    </div>
  );
}

// Arma la estructura de una copa: rondas con sus cruces (reales o
// proyectados), estado de cada ronda, equipos que siguen en carrera y campeón.
function armarCopa(cup, pool, partidosCopa, equipoMap) {
  const size = bracketSizeFor(pool.length);
  if (size === 0) return { size, rondas: [], vivos: [], campeon: null, partidoFinal: null, sobrantes: [], seedMap: {} };
  const r1 = primeraRonda(pool, size);
  const seedMap = {};
  r1.pares.forEach(([a, b], i) => {
    if (a) seedMap[a.id] = r1.seeds[i][0];
    if (b) seedMap[b.id] = r1.seeds[i][1];
  });

  const slot = (instancia, llave, fa = null, fb = null) => ({
    instancia, llave, partido: buscarPartidoSlot(partidosCopa, instancia, llave), fa, fb,
  });
  const ganadorDe = (instancia, llave) => resolveWinner(buscarPartidoSlot(partidosCopa, instancia, llave), equipoMap);

  const rondas = [];
  if (size === 8) {
    rondas.push({ key: 'cuartos', slots: r1.pares.map(([a, b], i) => slot('cuartos', i + 1, a, b)) });
    rondas.push({ key: 'semifinal', nota: 'Cruces a definir por la organización', slots: [slot('semifinal', 1), slot('semifinal', 2)] });
    rondas.push({ key: 'final', slots: [slot('final', 1, ganadorDe('semifinal', 1), ganadorDe('semifinal', 2))] });
  } else if (size === 4) {
    rondas.push({ key: 'semifinal', slots: r1.pares.map(([a, b], i) => slot('semifinal', i + 1, a, b)) });
    rondas.push({ key: 'final', slots: [slot('final', 1, ganadorDe('semifinal', 1), ganadorDe('semifinal', 2))] });
  } else {
    const [a, b] = r1.pares[0] ?? [];
    rondas.push({ key: 'final', slots: [slot('final', 1, a, b)] });
  }
  for (const r of rondas) {
    r.jugados = r.slots.filter(s => s.partido?.estado === 'finalizado').length;
    r.total = r.slots.length;
    r.completa = r.jugados === r.total;
  }
  const actual = rondas.find(r => !r.completa) ?? rondas[rondas.length - 1];
  for (const r of rondas) r.estado = r.completa ? 'ok' : (r === actual ? 'now' : 'next');

  const partidoFinal = buscarPartidoSlot(partidosCopa, 'final', 1);
  const campeon = resolveWinner(partidoFinal, equipoMap);
  // Siguen en carrera: los del cuadro que todavía no perdieron un cruce.
  const enCuadro = r1.pares.flat().filter(Boolean);
  const perdedores = new Set();
  for (const p of partidosCopa) {
    if (p.estado !== 'finalizado' || p.instancia === 'tercer_puesto') continue;
    const g = resolveWinner(p, equipoMap);
    if (!g) continue;
    perdedores.add(g.id === p.equipo_local_id ? p.equipo_visit_id : p.equipo_local_id);
  }
  const vivos = enCuadro.filter(t => !perdedores.has(t.id));

  return { size, rondas, actual, vivos, campeon, partidoFinal, sobrantes: r1.sobrantes, seedMap };
}

function CajaCampeon({ cup, info }) {
  const { campeon, partidoFinal, vivos } = info;
  if (campeon) {
    const pl = partidoFinal?.puntos_local ?? 0, pv = partidoFinal?.puntos_visit ?? 0;
    return (
      <div className="pf-camp pf-camp--ok">
        <span className="pf-camp-tag">🏆 Campeón</span>
        <Escudo team={campeon} size={86}/>
        <b className="pf-camp-nom">{campeon.name}</b>
        <span className="pf-camp-sub">{cup.label} 2026 · {Math.max(pl, pv)}-{Math.min(pl, pv)} en la final</span>
      </div>
    );
  }
  return (
    <div className="pf-camp">
      <div className="pf-camp-cup" aria-hidden="true">🏆</div>
      <b className="pf-camp-tit">Campeón</b>
      <span className="pf-camp-sub">{cup.label} 2026</span>
      {vivos.length > 0 && (
        <>
          <div className="pf-camp-vivos">
            {vivos.map(t => <Escudo key={t.id} team={t} size={34}/>)}
          </div>
          <span className="pf-camp-sub pf-camp-q">
            {vivos.length === 1 ? 'Queda 1 en carrera' : `Quedan ${vivos.length} en carrera`}
          </span>
        </>
      )}
    </div>
  );
}

function textoEstadoCopa(info) {
  if (info.size === 0) return 'Sin equipos';
  if (info.campeon) return 'Finalizada';
  const r = info.actual;
  const nombre = RONDA_NOMBRE[r.key];
  if (r.jugados === 0) return r.slots.some(s => s.partido) ? `${nombre} programadas` : `${nombre} por jugar`;
  return `${nombre} en juego`;
}

function textoTabCopa(info, proximoDeCopa, fechas) {
  if (info.size === 0) return 'Sin equipos';
  if (info.campeon) return `Campeón: ${info.campeon.name}`;
  const corto = RONDA_CORTA[info.actual.key];
  const dia = proximoDeCopa ? diaDe(proximoDeCopa, fechas) : null;
  if (dia) return `${corto} · ${dia.txt}`;
  return info.actual.jugados === 0 ? `${corto} · por jugar` : `${corto} · en juego`;
}

const HINT = {
  cuartos: 'Los ganadores pasan a las semifinales',
  semifinal: 'El ganador de cada semi pasa a la Gran final',
};

function PanelCopa({ cup, info, partidosCopa, proximoId, equipoMap, jugadorasMap, fechas, onAbrirPartido }) {
  const [rondaSel, setRondaSel] = useState(null);
  if (info.size === 0) {
    return (
      <div className="pf-panel">
        <div className="pf-copa"><b>{cup.label}</b><i/></div>
        <p className="pf-vacio">Todavía no hay equipos para armar este cuadro.</p>
      </div>
    );
  }
  const sel = rondaSel ?? info.actual.key;
  const tercer = buscarPartidoSlot(partidosCopa, 'tercer_puesto', 1);
  const cruceProps = { seedMap: info.seedMap, equipoMap, jugadorasMap, fechas, onAbrirPartido };
  const titulo = (r, s) => (r.key === 'final' ? 'Gran final' : r.slots.length > 1 ? `${INSTANCIA_NOMBRE[r.key]} ${s.llave}` : INSTANCIA_NOMBRE[r.key]);

  return (
    <div className="pf-panel">
      <div className="pf-copa">
        <b>{cup.label}</b><i/>
        <em>{textoEstadoCopa(info)}</em>
      </div>

      {/* Avance de la copa (en celular sirve además para elegir la ronda) */}
      <div className="pf-prog" role="tablist">
        {info.rondas.map(r => (
          <button key={r.key} type="button" role="tab" aria-selected={sel === r.key}
            className={`pf-prog-b pf-prog-b--${r.estado}${sel === r.key ? ' is-sel' : ''}`}
            onClick={() => setRondaSel(r.key)}>
            <span className="pf-prog-n">{r.estado === 'ok' ? '✓ ' : r.estado === 'now' ? '● ' : ''}{RONDA_NOMBRE[r.key]}</span>
            <small>{r.key === 'final' && !r.jugados ? '—' : `${r.jugados}/${r.total}`}</small>
          </button>
        ))}
      </div>

      <div className={`pf-br pf-br--${info.rondas.length}`}>
        {info.rondas.map((r, ri) => (
          <div key={r.key} className={`pf-col${sel === r.key ? ' is-sel' : ''}${ri === info.rondas.length - 1 ? ' pf-col--ult' : ''}`}>
            <h4 className="pf-col-h">
              <span>{RONDA_NOMBRE[r.key] === 'Semifinales' ? 'Semifinal' : RONDA_NOMBRE[r.key]}
                {r.nota && <span className="pf-nota">{r.nota}</span>}</span>
              {r.key !== 'final' && <small>{r.jugados}/{r.total}{r.key === 'cuartos' ? ' jugados' : ''}</small>}
            </h4>
            <div className="pf-slots">
              {r.slots.map(s => (
                <Cruce key={`${s.instancia}-${s.llave}`} {...cruceProps}
                  partido={s.partido} teamA={s.fa} teamB={s.fb}
                  titulo={titulo(r, s)} esFinal={r.key === 'final'}
                  esProximo={!!s.partido && s.partido.id === proximoId}/>
              ))}
            </div>
            {HINT[r.key] && <div className="pf-hint">{HINT[r.key]}</div>}
            {r.key === 'final' && (
              <div className="pf-camp-mob"><CajaCampeon cup={cup} info={info}/></div>
            )}
          </div>
        ))}
        <div className="pf-col pf-col--camp">
          <h4 className="pf-col-h"><span>&nbsp;</span></h4>
          <div className="pf-slots"><CajaCampeon cup={cup} info={info}/></div>
        </div>
      </div>

      {tercer && (
        <div className="pf-tercer">
          <div className="pf-tercer-h">🥉 Tercer puesto</div>
          <Cruce {...cruceProps} partido={tercer} titulo="Tercer puesto" esProximo={tercer.id === proximoId}/>
        </div>
      )}
      <EquiposFueraDeCuadro teams={info.sobrantes} accentColor={cup.color}/>
    </div>
  );
}

export function PlayoffsBracket() {
  const { mode } = useTournament();
  const { equipos, partidos, fechas } = useStats();
  // Click en un cruce abre el mismo Game Center que "Resultados".
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [copaSel, setCopaSel] = useState(null);

  // Mismo criterio de "juega esta temporada" que TorneoView/Hero (ver
  // useEquiposDeTemporada): la zona es un dato global, así que en una
  // temporada archivada se arma sin zonas (tabla general en tercios).
  const { equiposDeTemporada, activaCategoria } = useEquiposDeTemporada(equipos, mode);
  const equiposParaPools = useMemo(
    () => activaCategoria ? equiposDeTemporada : equiposDeTemporada.map(t => ({ ...t, zona: null })),
    [equiposDeTemporada, activaCategoria]
  );
  const pools = useMemo(() => buildPools(equiposParaPools, mode), [equiposParaPools, mode]);
  const equipoMap = useMemo(() => Object.fromEntries(equiposDeTemporada.map(t => [t.id, t])), [equiposDeTemporada]);
  const jugadorasMap = useMemo(() => buildJugadorasMap(equiposDeTemporada), [equiposDeTemporada]);
  const partidosPlayoff = useMemo(() => (partidos ?? []).filter(p => p.es_playoff), [partidos]);

  const copas = useMemo(() => CUPS.map(cup => {
    const partidosCopa = partidosPlayoff.filter(p => p.copa === cup.key);
    return { cup, partidosCopa, info: armarCopa(cup, pools[cup.key] ?? [], partidosCopa, equipoMap) };
  }), [pools, partidosPlayoff, equipoMap]);

  // Próximo partido de playoffs: uno en vivo, o el pendiente más cercano.
  const ordenProx = p => {
    const iso = p.fecha_partido ?? (fechas ?? []).find(f => f.id === p.fecha_id)?.fecha_dia ?? '9999-12-31';
    return `${String(iso).slice(0, 10)} ${horaDe(p) ?? '99:99'}`;
  };
  const proximo = useMemo(() => {
    const vivo = partidosPlayoff.find(p => p.estado === 'en_juego');
    if (vivo) return vivo;
    return [...partidosPlayoff].filter(p => p.estado === 'pendiente')
      .sort((a, b) => ordenProx(a).localeCompare(ordenProx(b)))[0] ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partidosPlayoff, fechas]);
  const proximoPorCopa = useMemo(() => Object.fromEntries(CUPS.map(c => [c.key,
    [...partidosPlayoff].filter(p => p.copa === c.key && (p.estado === 'pendiente' || p.estado === 'en_juego'))
      .sort((a, b) => ordenProx(a).localeCompare(ordenProx(b)))[0] ?? null])),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [partidosPlayoff, fechas]);

  // Copa que se abre al entrar: la del próximo partido; si no, la primera
  // que todavía no terminó; si no, Oro.
  const copaInicial = proximo?.copa
    ?? copas.find(c => c.info.size > 0 && !c.info.campeon)?.cup.key
    ?? 'oro';
  const actual = copas.find(c => c.cup.key === (copaSel ?? copaInicial)) ?? copas[0];

  return (
    <>
      <GameCenterModal
        key={selectedMatch ?? 'none'}
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        partidoId={selectedMatch}
        mode={mode}
      />
      <section className="page-section pf" id="bracket">
        <div className="pf-top">
          <div>
            <p className="section-eyebrow" style={{ color: 'var(--gold)' }}>Postemporada</p>
            <h2 className="section-heading" style={{ marginBottom: 0 }}>Playoffs <span className="gold">2026</span></h2>
          </div>
        </div>

        <div className="pf-cups" role="tablist">
          {copas.map(({ cup, info }) => (
            <button key={cup.key} type="button" role="tab" aria-selected={actual.cup.key === cup.key}
              className={`pf-cup${actual.cup.key === cup.key ? ' is-on' : ''}`}
              style={{ '--k': cup.color }}
              onClick={() => setCopaSel(cup.key)}>
              <span className="pf-cup-ic" aria-hidden="true">{cup.key === 'oro' ? '🥇' : cup.key === 'plata' ? '🥈' : '🥉'}</span>
              <span className="pf-cup-tx">
                <b><span className="pf-cup-pre">Copa de </span>{cup.label.replace('Copa de ', '')}</b>
                <small>{textoTabCopa(info, proximoPorCopa[cup.key], fechas)}</small>
              </span>
              <span className="pf-cup-dots" aria-hidden="true">
                {info.rondas.map(r => <i key={r.key} className={r.estado}/>)}
              </span>
            </button>
          ))}
        </div>

        <div style={{ '--c': actual.cup.color }}>
          <PanelCopa key={actual.cup.key} cup={actual.cup} info={actual.info} partidosCopa={actual.partidosCopa}
            proximoId={proximo?.id} equipoMap={equipoMap} jugadorasMap={jugadorasMap} fechas={fechas}
            onAbrirPartido={setSelectedMatch}/>
        </div>
      </section>
    </>
  );
}
