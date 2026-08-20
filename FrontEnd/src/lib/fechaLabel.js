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
