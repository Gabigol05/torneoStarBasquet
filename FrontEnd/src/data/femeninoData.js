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

export const equiposFemenino = [
  { id: 'f_black_mamba',   name: 'Black Mamba',        logo: logoBlackMamba,   color: '#8b5cf6' },
  { id: 'f_pilar',         name: 'Pilar Sport Club',   logo: logoPilar,        color: '#ef4444' },
  { id: 'f_artigas',       name: 'Artigas BC',         logo: logoArtigas,      color: '#22c55e' },
  { id: 'f_triple_locura', name: 'Triple Locura',      logo: logoTripleLocura, color: '#ec4899' },
  { id: 'f_union',         name: 'Unión Alta Gracia',  logo: logoUnion,        color: '#06b6d4' },
  { id: 'f_ferrobre',      name: 'Ferrobre',           logo: logoFerrobre,     color: '#f59e0b' },
  { id: 'f_branca',        name: 'Branca',             logo: logoBranca,       color: '#ec4899' },
  { id: 'f_el_h',          name: 'El H',               logo: logoElH,          color: '#14b8a6' },
  { id: 'f_piratas',       name: 'Piratas',            logo: logoPiratas,      color: '#e5e7eb' },
  { id: 'f_qaramtas',      name: 'Qaramtas',           logo: logoQaramtas,     color: '#a855f7' },
];
