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
  if (!fechaNacStr) return null;
  const nac = new Date(fechaNacStr);
  if (Number.isNaN(nac.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nac.getFullYear();
  const noCumplioAun = (hoy.getMonth() < nac.getMonth()) ||
    (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate());
  if (noCumplioAun) edad--;
  return (edad >= 0 && edad < 120) ? edad : null;
}
