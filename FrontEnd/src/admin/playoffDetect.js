// Detección de cruces de playoff para el panel de partidos.
//
// Por qué existe: los cuartos de final masculino 2026 (Fecha 12) se cargaron
// con "Cargar fixture de una fecha" sin tildar "¿Es Playoff?" en cada fila.
// Quedaron como partidos de temporada regular: sumaron PJ/G/P en la tabla y
// el cuadro de playoffs no los encontraba (busca por copa + instancia +
// llave). Con esto el panel reconoce solo un cruce de playoff, completa copa,
// instancia y llave, y avisa si hay partidos de playoff mal marcados.
//
// La primera ronda de cada copa sale de la tabla, con EXACTAMENTE las mismas
// funciones que el cuadro público (PlayoffsBracket.jsx). Las rondas
// siguientes NO se arman acá: los cruces de semifinal los define el
// organizador del torneo a su criterio. Para esas rondas solo se reconoce un
// partido como cruce si los dos equipos ganaron la ronda anterior en la misma
// copa (o perdieron las semis, para el tercer puesto), y se le da la primera
// llave libre.
import {
  buildPools, bracketSizeFor, primeraRonda, resolveWinner,
} from '../components/PlayoffsBracket.jsx';

const COPAS = ['oro', 'plata', 'bronce'];

export const LABEL_COPA = { oro: 'Copa de Oro', plata: 'Copa de Plata', bronce: 'Copa de Bronce' };
export const LABEL_INSTANCIA = {
  cuartos: 'Cuartos', semifinal: 'Semifinal', final: 'Final', tercer_puesto: 'Tercer puesto',
};

// "Cuartos de Final", "SEMIFINALES", "Playoffs - Final", "3er puesto"...
const RE_PLAYOFF = /cuartos|semi|final|playoff|play-off|tercer|3er/i;

export function esTextoPlayoff(texto) {
  return !!texto && RE_PLAYOFF.test(texto);
}

export function esFechaPlayoff(fecha) {
  return esTextoPlayoff(fecha?.descripcion);
}

// Instancia que sugiere el nombre de la fecha. El orden importa: "Cuartos de
// Final" y "Semifinal" también contienen "final".
export function instanciaDesdeTexto(texto) {
  if (!texto) return null;
  if (/cuartos/i.test(texto)) return 'cuartos';
  if (/semi/i.test(texto)) return 'semifinal';
  if (/tercer|3er/i.test(texto)) return 'tercer_puesto';
  if (/final/i.test(texto)) return 'final';
  return null;
}

// Tabla de la fase regular, sin las fechas de `excluidas` (las de playoff).
function tablaRegular(partidos, excluidas, zonas) {
  const st = {};
  const fila = id => (st[id] ??= { id, zona: zonas?.[id] ?? null, pg: 0, pp: 0, pf: 0, pc: 0 });
  let pendientes = 0;
  for (const p of partidos ?? []) {
    if (p.es_playoff || excluidas.has(p.fecha_id)) continue;
    if (p.estado !== 'finalizado') { pendientes++; continue; }
    const pl = p.puntos_local ?? 0, pv = p.puntos_visit ?? 0;
    if (pl === pv) continue;
    const L = fila(p.equipo_local_id), V = fila(p.equipo_visit_id);
    L.pf += pl; L.pc += pv; V.pf += pv; V.pc += pl;
    if (pl > pv) { L.pg++; V.pp++; } else { V.pg++; L.pp++; }
  }
  return { equipos: Object.values(st), pendientes };
}

// Contexto de playoffs sin las fechas de `excluidas`: la primera ronda de
// cada copa (sale de la tabla) y quiénes ganaron/perdieron cada ronda ya
// jugada. null mientras queden partidos de fase regular sin jugar, para no
// confundir un partido de temporada con un cruce.
function armarContexto(partidos, excluidas, zonas) {
  const { equipos, pendientes } = tablaRegular(partidos, excluidas, zonas);
  if (pendientes > 0 || equipos.length < 2) return null;
  const eqMap = Object.fromEntries(equipos.map(t => [t.id, t]));
  const pools = buildPools(equipos);
  const primera = [];
  const copas = {};
  for (const copa of COPAS) {
    const pool = pools[copa] ?? [];
    const size = bracketSizeFor(pool.length);
    if (size < 2) continue;
    const instancia = size === 8 ? 'cuartos' : size === 4 ? 'semifinal' : 'final';
    primeraRonda(pool, size).pares.forEach(([a, b], i) => {
      if (a?.id && b?.id) primera.push({ copa, instancia, llave: i + 1, a: a.id, b: b.id });
    });
    const ganadores = { cuartos: new Set(), semifinal: new Set() };
    const perdedoresSemi = new Set();
    for (const p of partidos ?? []) {
      if (!p.es_playoff || p.copa !== copa || !ganadores[p.instancia]) continue;
      const g = resolveWinner(p, eqMap);
      if (!g) continue;
      ganadores[p.instancia].add(g.id);
      if (p.instancia === 'semifinal') {
        perdedoresSemi.add(g.id === p.equipo_local_id ? p.equipo_visit_id : p.equipo_local_id);
      }
    }
    copas[copa] = { size, ganadores, perdedoresSemi };
  }
  return { primera, copas };
}

const claveSlot = (copa, instancia, llave) => `${copa}|${instancia}|${llave}`;

// Cruce que corresponde a este par de equipos, o null. `ocupadas` = slots
// (copa|instancia|llave) ya usados por otros partidos, para dar la primera
// llave libre en semifinal.
function detectarEnContexto(ctx, localId, visitId, ocupadas) {
  if (!ctx || !localId || !visitId || localId === visitId) return null;
  const par = id => id === localId || id === visitId;
  const fija = ctx.primera.find(c => par(c.a) && par(c.b));
  if (fija) return fija;
  const ambos = set => set.has(localId) && set.has(visitId);
  // Primero las rondas más avanzadas: dos ganadores de semis también son
  // ganadores de cuartos, y para entonces las llaves de semis ya están usadas.
  for (const [copa, info] of Object.entries(ctx.copas)) {
    if (ambos(info.ganadores.semifinal)) return { copa, instancia: 'final', llave: 1, a: localId, b: visitId };
    if (ambos(info.perdedoresSemi)) return { copa, instancia: 'tercer_puesto', llave: 1, a: localId, b: visitId };
    if (info.size === 8 && ambos(info.ganadores.cuartos)) {
      const llave = [1, 2].find(l => !ocupadas.has(claveSlot(copa, 'semifinal', l)));
      if (llave) return { copa, instancia: 'semifinal', llave, a: localId, b: visitId };
    }
  }
  return null;
}

// Asigna cruce a cada partido de `lista`, en orden, ocupando las llaves a
// medida que las usa (dos semis de la misma copa → llave 1 y llave 2).
function asignar(ctx, lista, ocupadasBase) {
  const ocupadas = new Set(ocupadasBase);
  return lista.map(p => {
    const c = detectarEnContexto(ctx, p.equipo_local_id, p.equipo_visit_id, ocupadas);
    if (c) ocupadas.add(claveSlot(c.copa, c.instancia, c.llave));
    return c;
  });
}

export function labelCruce(c) {
  if (!c) return '';
  return `${LABEL_INSTANCIA[c.instancia] ?? c.instancia} · ${LABEL_COPA[c.copa] ?? c.copa} · Llave ${c.llave}`;
}

// Slots (copa|instancia|llave) de una lista de partidos/filas ya marcados
// como playoff. Sirve para no repetir llave al detectar otro cruce.
export function slotsOcupados(lista, excluirId = null) {
  return new Set((lista ?? [])
    .filter(p => p.es_playoff && p.copa && p.instancia && p.llave && p.id !== excluirId)
    .map(p => claveSlot(p.copa, p.instancia, Number(p.llave))));
}

// Analiza la temporada y devuelve:
//  - detectar(localId, visitId, ocupadasExtra?, excluirId?): el cruce de
//    playoff que corresponde a ese par de equipos, o null.
//  - fechasPlayoff: ids de las fechas que son de playoff. Una fecha cuenta
//    como de playoff si su nombre lo dice ("Cuartos de Final",
//    "Semifinales"...), si ya tiene algún partido marcado como playoff, o si
//    es una de las últimas fechas y TODOS sus partidos son cruces según las
//    fechas anteriores. Esto último cubre una fecha de playoffs que se cargó
//    como "Fecha 12" sin tildar nada: sin sacarla, sus resultados cambiarían
//    la tabla y con eso los cruces.
//  - malMarcados: partidos de esas fechas que siguen como temporada regular,
//    con el cruce que les corresponde (null si no se pudo saber cuál).
export function analizarPlayoffs(partidos, fechas, zonas) {
  const lista = partidos ?? [];
  const excluidas = new Set((fechas ?? []).filter(esFechaPlayoff).map(f => f.id));
  for (const p of lista) if (p.es_playoff && p.fecha_id != null) excluidas.add(p.fecha_id);
  const ocupadasDb = slotsOcupados(lista);

  const porFecha = {};
  for (const p of lista) if (p.fecha_id != null) (porFecha[p.fecha_id] ??= []).push(p);
  const recientes = [...(fechas ?? [])]
    .filter(f => porFecha[f.id]?.length)
    .sort((a, b) => (b.numero ?? 0) - (a.numero ?? 0));
  for (const f of recientes) {
    if (excluidas.has(f.id)) continue;
    const ctxSin = armarContexto(lista, new Set([...excluidas, f.id]), zonas);
    const sinMarcar = porFecha[f.id].filter(p => !p.es_playoff);
    if (!ctxSin || !asignar(ctxSin, sinMarcar, ocupadasDb).every(Boolean)) break;
    excluidas.add(f.id);
  }

  const ctx = armarContexto(lista, excluidas, zonas);
  const sinMarcar = lista
    .filter(p => !p.es_playoff && excluidas.has(p.fecha_id))
    .sort((a, b) => a.id - b.id);
  const asignados = asignar(ctx, sinMarcar, ocupadasDb);
  const malMarcados = sinMarcar.map((p, i) => ({ partido: p, cruce: asignados[i] }));

  const detectar = (localId, visitId, ocupadasExtra = null, excluirId = null) => {
    const ocupadas = excluirId != null ? slotsOcupados(lista, excluirId) : new Set(ocupadasDb);
    for (const k of ocupadasExtra ?? []) ocupadas.add(k);
    return detectarEnContexto(ctx, localId, visitId, ocupadas);
  };
  return { detectar, fechasPlayoff: excluidas, malMarcados };
}
