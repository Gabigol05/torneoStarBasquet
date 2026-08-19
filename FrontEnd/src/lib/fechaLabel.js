// Convierte una "fecha"/jornada (fila de fechas_femenino/fechas_masculino) en
// la etiqueta que se muestra en las cards de partido. Por default es
// "Fecha N" (temporada regular), pero si el admin cargó la jornada con una
// descripcion que menciona "playoff" (ej: "Playoffs Femenino - Semifinal",
// puesto a mano en el panel al armar el fixture de esa ronda), se muestra
// "Playoffs · Semifinal" en su lugar — sin esto, un partido de playoff
// aparecia igual que cualquier otro ("Fecha 10") y no se distinguia.
export function labelFecha(fecha) {
  if (!fecha) return null;
  const desc = (fecha.descripcion ?? '').trim();
  if (desc && /playoff/i.test(desc)) {
    const resto = desc.replace(/^playoffs?\s*(femenino|masculino)?\s*[-–—:]*\s*/i, '').trim();
    return resto ? `Playoffs · ${resto}` : 'Playoffs';
  }
  return `Fecha ${fecha.numero}`;
}
