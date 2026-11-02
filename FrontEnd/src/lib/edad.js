// Calcula la edad en años a partir de una fecha de nacimiento "YYYY-MM-DD".
// ⚠️ Privacidad (auditoría de seguridad): las vistas PÚBLICAS del sitio
// (perfil de jugador/a, ficha de equipo) mostraban la fecha de nacimiento
// COMPLETA de cada jugador/a a cualquier visitante — tratándose de un
// torneo amateur que probablemente incluye categorías juveniles, no
// corresponde exponer eso sin necesidad. Estas vistas ahora usan esta
// función para mostrar solo la edad en años. El panel de admin
// (PlantelManager/StatsEditor) sigue mostrando y editando la fecha
// completa, que ahí sí hace falta para cargar categorías por edad.
export function edadDesde(fechaNacStr) {
  if (fechaNacStr == null || fechaNacStr === '') return null;
  // La vista pública (v_jugadoras_publico / v_jugadores_publico) ya manda la
  // edad calculada en el servidor, para no exponer la fecha completa.
  if (typeof fechaNacStr === 'number') return (fechaNacStr >= 0 && fechaNacStr < 120) ? fechaNacStr : null;
  // ⚠️ FIX: new Date('YYYY-MM-DD') se interpreta como medianoche UTC, que
  // en Argentina (UTC-3) es el día ANTERIOR — la edad cambiaba un día antes
  // del cumpleaños. Se arma la fecha en hora local a partir de sus partes.
  const m = String(fechaNacStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const nac = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(fechaNacStr);
  if (Number.isNaN(nac.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const noCumplioAun = (hoy.getMonth() < nac.getMonth()) ||
    (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate());
  if (noCumplioAun) edad--;
  return (edad >= 0 && edad < 120) ? edad : null;
}
