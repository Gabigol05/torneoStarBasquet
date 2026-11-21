// ============================================================
// DATOS ESTÁTICOS — TORNEO FEMENINO
// Solo identidad de equipo: nombre, logo, color.
// El plantel (jugadoras) YA NO vive acá — se migró a la tabla
// jugadoras_femenino en la base de datos, a la par de masculino,
// para poder versionarlo por temporada y para que el buscador de
// nombres del Excel siempre tenga el roster real y al día (antes,
// una jugadora agregada solo en la base y no en este archivo podía
// quedar sin reconocer al cargar un partido).
// Las estadísticas (pts, reb, ast, pj, etc.) también vienen del
// backend a través de useFemeninoStats.js — NO las pongas acá.
// La ZONA (A/B) de cada equipo NO vive acá — viene de la columna
// equipos_femenino.zona (ver add_zonas_femenino.sql), igual que ya
// funciona en masculino — así se puede reasignar sin deploy.
//
// Black Mamba, Pilar Sport Club y Ferrobre no juegan la temporada
// 2026 con zonas (no aparecen en ninguna Zona A/B) — se dejan acá
// para no romper el historial de temporadas archivadas donde sí
// jugaron (nombre/logo/color siguen haciendo falta para esas fechas
// viejas), pero no se les asigna zona: no van a aparecer en la tabla
// de posiciones de la temporada actual, y si hace falta se pueden
// borrar de acá más adelante sin afectar temporadas ya jugadas.
// ============================================================

import logoBlackMamba   from '../assets/logo_black_mamba_fem.jpeg';
import logoPilar        from '../assets/logo_pilar.jpeg';
import logoArtigas      from '../assets/logo_artigas.jpeg';
import logoTripleLocura from '../assets/logo_triple_locura.jpeg';
import logoUnion        from '../assets/logo_union.jpeg';
import logoFerrobre     from '../assets/logo_ferrobre.jpeg';
import logoBranca       from '../assets/logo_branca.jpeg';
import logoElH          from '../assets/logo_el_h.jpeg';
import logoPiratas      from '../assets/logo_piratas.jpeg';
import logoQaramtas     from '../assets/logo_qaramtas.jpeg';
import logoPiquete      from '../assets/logo_f_piquete.png';
import logoCuervas      from '../assets/logo_f_cuervas.png';
import logoNoVayase     from '../assets/logo_f_no_vayase.png';
import logoSacaleJugo   from '../assets/logo_f_sacale_jugo.png';
import logoClubPesca    from '../assets/logo_f_club_pesca.png';

// Colores de cada equipo tomados de su logo (revisión 21/11: varios no
// coincidían — p. ej. Branca estaba en rosa con un escudo dorado, Cuervas en
// gris con un logo bordó, No Vayase en amarillo con un logo verde).
export const equiposFemenino = [
  // ── Zona A ──
  { id: 'f_piquete',       name: 'Piquete',            logo: logoPiquete,      color: '#e8492a' },
  { id: 'f_artigas',       name: 'Artigas BC',         logo: logoArtigas,      color: '#22a447' },
  { id: 'f_piratas',       name: 'Piratas',            logo: logoPiratas,      color: '#e5e7eb' },
  { id: 'f_triple_locura', name: 'Triple Locura',      logo: logoTripleLocura, color: '#f472b6' },
  { id: 'f_union',         name: 'Unión Alta Gracia',  logo: logoUnion,        color: '#2dd4bf' },
  { id: 'f_branca',        name: 'Branca',             logo: logoBranca,       color: '#d4af5a' },

  // ── Zona B ──
  { id: 'f_qaramtas',      name: 'Qaramtas',           logo: logoQaramtas,     color: '#3db894' },
  { id: 'f_cuervas',       name: 'Cuervas',            logo: logoCuervas,      color: '#c0284f' },
  { id: 'f_no_vayase',     name: 'No Vayase',          logo: logoNoVayase,     color: '#6cc04a' },
  { id: 'f_el_h',          name: 'El H',               logo: logoElH,          color: '#f2b830' },
  { id: 'f_sacale_jugo',   name: 'Sácale el Jugo a la Naranja', logo: logoSacaleJugo, color: '#f7882f' },
  { id: 'f_club_pesca',    name: 'Club Pesca',         logo: logoClubPesca,    color: '#1f9d63' },

  // ── No juegan la temporada 2026 (ver comentario arriba) ──
  { id: 'f_black_mamba',   name: 'Black Mamba',        logo: logoBlackMamba,   color: '#a855f7' },
  { id: 'f_pilar',         name: 'Pilar Sport Club',   logo: logoPilar,        color: '#ef4444' },
  { id: 'f_ferrobre',      name: 'Ferrobre',           logo: logoFerrobre,     color: '#f59e0b' },
];
