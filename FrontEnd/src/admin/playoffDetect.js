// Detección de cruces de playoff para el panel de partidos.
//
// Por qué existe: los cuartos de final masculino 2026 (Fecha 12) se cargaron
// con "Cargar fixture de una fecha" sin tildar "¿Es Playoff?" en cada fila.
// Quedaron como partidos de temporada regular: sumaron PJ/G/P en la tabla y
// el cuadro de playoffs no los encontraba (busca por copa + instancia +
// llave). Con esto el panel reconoce solo un cruce de playoff, completa copa,
// instancia y llave, y avisa si hay partidos de playoff mal marcados.
//
// Usa EXACTAMENTE las mismas funciones que el cuadro público
// (PlayoffsBracket.jsx), así lo que se marca acá cae en el mismo casillero
// que el cuadro muestra.
import {
  buildPools, bracketSizeFor, primeraRonda, semisPorTablaGeneral, resolveWinner,
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

// Cruces de playoff que ya se pueden saber, sacando de la tabla las fechas
// de `excluidas`: la primera ronda de cada copa (por tabla) y las rondas
// siguientes cuando sus ganadores ya están cargados. Mientras queden partidos
// de fase regular sin jugar devuelve [], para no confundir un partido de
// temporada con un cruce.
function calcularCruces(partidos, excluidas, zonas) {
  const { equipos, pendientes } = tablaRegular(partidos, excluidas, zonas);
  if (pendientes > 0 || equipos.length < 2) return [];
  const eqMap = Object.fromEntries(equipos.map(t => [t.id, t]));
  const pools = buildPools(equipos);
  const out = [];
  const add = (copa, instancia, llave, a, b) => {
    if (a?.id && b?.id) out.push({ copa, instancia, llave, a: a.id, b: b.id });
  };

  for (const copa of COPAS) {
    const pool = pools[copa] ?? [];
    const size = bracketSizeFor(pool.length);
    if (size < 2) continue;
    const delaCopa = (partidos ?? []).filter(p => p.es_playoff && p.copa === copa);
    const slot = (inst, llave) => delaCopa.find(p => p.instancia === inst && Number(p.llave) === llave) ?? null;
    const { pares } = primeraRonda(pool, size);

    let semis = null;
    if (size === 8) {
      pares.forEach(([a, b], i) => add(copa, 'cuartos', i + 1, a, b));
      const ganadores = pares.map((_, i) => resolveWinner(slot('cuartos', i + 1), eqMap));
      semis = semisPorTablaGeneral(ganadores);
    } else if (size === 4) {
      semis = pares;
    } else {
      add(copa, 'final', 1, pares[0]?.[0], pares[0]?.[1]);
      continue;
    }
    if (!semis) continue;
    semis.forEach(([a, b], i) => add(copa, 'semifinal', i + 1, a, b));

    const partidosSemi = [slot('semifinal', 1), slot('semifinal', 2)];
    const ganadoresSemi = partidosSemi.map(p => resolveWinner(p, eqMap));
    if (ganadoresSemi.every(Boolean)) {
      add(copa, 'final', 1, ganadoresSemi[0], ganadoresSemi[1]);
      const perdedores = partidosSemi.map((p, i) => {
        const otro = p.equipo_local_id === ganadoresSemi[i].id ? p.equipo_visit_id : p.equipo_local_id;
        return eqMap[otro];
      });
      add(copa, 'tercer_puesto', 1, perdedores[0], perdedores[1]);
    }
  }
  return out;
}

// Cruce que corresponde a este par de equipos (en cualquier orden), o null.
export function buscarCruce(cruces, localId, visitId) {
  if (!localId || !visitId) return null;
  return (cruces ?? []).find(c =>
    (c.a === localId && c.b === visitId) || (c.a === visitId && c.b === localId)) ?? null;
}

export function labelCruce(c) {
  if (!c) return '';
  return `${LABEL_INSTANCIA[c.instancia] ?? c.instancia} · ${LABEL_COPA[c.copa] ?? c.copa} · Llave ${c.llave}`;
}

// Analiza la temporada y devuelve:
//  - cruces: los cruces de playoff esperados (ver calcularCruces).
//  - fechasPlayoff: ids de las fechas que son de playoff. Una fecha cuenta
//    como de playoff si su nombre lo dice ("Cuartos de Final",
//    "Semifinales"...), si ya tiene algún partido marcado como playoff, o si
//    es una de las últimas fechas y TODOS sus partidos coinciden con los
//    cruces que salen de la tabla de las fechas anteriores. Esto último cubre
//    una fecha de playoffs que se cargó como "Fecha 12" sin tildar nada: sin
//    sacarla, sus resultados cambiarían la tabla y con eso los cruces.
//  - malMarcados: partidos de esas fechas que siguen como temporada regular,
//    con el cruce que les corresponde (null si no se pudo saber cuál).
export function analizarPlayoffs(partidos, fechas, zonas) {
  const lista = partidos ?? [];
  const excluidas = new Set((fechas ?? []).filter(esFechaPlayoff).map(f => f.id));
  for (const p of lista) if (p.es_playoff && p.fecha_id != null) excluidas.add(p.fecha_id);

  const porFecha = {};
  for (const p of lista) if (p.fecha_id != null) (porFecha[p.fecha_id] ??= []).push(p);
  const recientes = [...(fechas ?? [])]
    .filter(f => porFecha[f.id]?.length)
    .sort((a, b) => (b.numero ?? 0) - (a.numero ?? 0));
  for (const f of recientes) {
    if (excluidas.has(f.id)) continue;
    const sinEsta = new Set([...excluidas, f.id]);
    const c = calcularCruces(lista, sinEsta, zonas);
    const todosCruces = c.length > 0 && porFecha[f.id].every(p =>
      p.es_playoff || buscarCruce(c, p.equipo_local_id, p.equipo_visit_id));
    if (!todosCruces) break;
    excluidas.add(f.id);
  }

  const cruces = calcularCruces(lista, excluidas, zonas);
  const malMarcados = lista
    .filter(p => !p.es_playoff && excluidas.has(p.fecha_id))
    .map(p => ({ partido: p, cruce: buscarCruce(cruces, p.equipo_local_id, p.equipo_visit_id) }));
  return { cruces, fechasPlayoff: excluidas, malMarcados };
}
