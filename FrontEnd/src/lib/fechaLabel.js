// Convierte una "fecha"/jornada (fila de fechas_femenino/fechas_masculino) en
// la etiqueta que se muestra en las cards de partido. Si el admin le puso una
// descripcion propia al cargar el fixture (ej: "SEMIFINALES", "Playoffs -
// Cuartos de Final", "Copa de Oro"), se muestra tal cual — sin esto se exigia
// que la descripcion contuviera literalmente la palabra "playoff" para
// distinguirse, y una fecha cargada como "SEMIFINALES" seguia mostrando
// "Fecha 10" en el sitio aunque el admin ya la hubiera nombrado bien.
// Si no le pusieron descripcion, cae al default "Fecha N".
export function labelFecha(fecha) {
  if (!fecha) return null;
  const desc = (fecha.descripcion ?? '').trim();
  return desc || `Fecha ${fecha.numero}`;
}

// ─── Playoffs ───────────────────────────────────────────────────────────────
// A diferencia de "fecha" (que es la jornada calendario), es_playoff, copa,
// instancia y llave viven en el PARTIDO — una misma jornada puede juntar
// cruces de más de una copa el mismo fin de semana (ej: semifinal de Copa
// de Oro y de Copa de Plata cargadas bajo la misma "Fecha 9").
export const COPA_LABEL = {
  oro:    'Copa de Oro',
  plata:  'Copa de Plata',
  bronce: 'Copa de Bronce',
};

export const INSTANCIA_LABEL = {
  cuartos:       'Cuartos de Final',
  semifinal:     'Semifinal',
  final:         'Final',
  tercer_puesto: 'Tercer Puesto',
};

// Versión corta de la instancia, para columnas angostas (ej: "Stats por fecha").
const INSTANCIA_CORTA = {
  cuartos:       'Cuartos',
  semifinal:     'Semifinal',
  final:         'Final',
  tercer_puesto: '3er Puesto',
};

export function esPartidoPlayoff(partido) {
  return !!partido?.es_playoff;
}

// Etiqueta larga y explícita — para el detalle del partido, el subtítulo del
// Game Center, y cualquier lugar con espacio de sobra.
// Ej: "Playoffs · Copa de Oro · Semifinal".
export function labelInstanciaPlayoff(partido) {
  if (!partido?.es_playoff) return null;
  const inst = INSTANCIA_LABEL[partido.instancia] ?? 'Playoffs';
  const copa = COPA_LABEL[partido.copa];
  return copa ? `Playoffs · ${copa} · ${inst}` : `Playoffs · ${inst}`;
}

// Etiqueta corta — para chips y columnas angostas (ej: "Stats por fecha" en
// el perfil de cada jugadora). Ej: "Semifinal Oro" en vez de "Fecha 11".
export function labelInstanciaCorta(partido) {
  if (!partido?.es_playoff) return null;
  const inst = INSTANCIA_CORTA[partido.instancia] ?? 'Playoffs';
  const copaLabel = { oro: 'Oro', plata: 'Plata', bronce: 'Bronce' }[partido?.copa];
  return copaLabel ? `${inst} ${copaLabel}` : inst;
}

// Etiqueta de un PARTIDO puntual (no de la fecha entera): si es de playoff
// usa copa+instancia, si no cae a la etiqueta de la fecha de siempre.
export function labelPartido(partido, fecha) {
  if (esPartidoPlayoff(partido)) return labelInstanciaPlayoff(partido);
  return labelFecha(fecha);
}

// Misma idea pero en versión corta (para tablas/chips angostos).
export function labelPartidoCorto(partido, fecha) {
  if (esPartidoPlayoff(partido)) return labelInstanciaCorta(partido);
  return fecha ? `F${fecha.numero}` : null;
}
