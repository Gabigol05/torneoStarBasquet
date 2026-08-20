// Saludo personalizado del panel admin. Somos 4 con acceso (Gabriel, Alvaro,
// Facundo, Lautaro) y cada uno entra con su propio email/usuario de Supabase
// Auth — este archivo deriva "Hola, <Nombre>" a partir de la sesión real en
// vez de tener un nombre pisado a mano, para que no le diga "Alvaro" a Facu
// o a Lautaro (el dueño del torneo).
//
// Preferencia de nombre:
//   1) user_metadata.full_name / user_metadata.name, si el usuario lo tiene cargado
//   2) prefijo del email (ej: "lautaro.perez@..." -> "Lautaro")
//   3) fallback genérico

export function nombreDeUsuario(user) {
  if (!user) return null;
  const meta = user.user_metadata || {};
  const metaNombre = meta.full_name || meta.name;
  if (metaNombre) return String(metaNombre).trim().split(' ')[0];

  const prefix = (user.email || '').split('@')[0];
  if (!prefix) return null;
  // "lautaro.perez" / "lautaro_perez" / "lautaro123" -> "Lautaro"
  const limpio = prefix.split(/[._\d]+/).filter(Boolean)[0] || prefix;
  return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
}

export function saludoHorario(date = new Date()) {
  const h = date.getHours();
  if (h >= 6 && h < 13)  return 'Buen día';
  if (h >= 13 && h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export function saludoCompleto(user, date = new Date()) {
  const nombre = nombreDeUsuario(user);
  const saludo = saludoHorario(date);
  return nombre ? `${saludo}, ${nombre}` : saludo;
}
