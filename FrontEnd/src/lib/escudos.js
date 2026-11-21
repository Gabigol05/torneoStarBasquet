// Escudo de cada equipo por id (femenino y masculino). Se usa como "foto"
// de jugadoras/jugadores mientras no haya fotos propias.
import { equiposFemenino } from '../data/femeninoData';
import { equiposMasculino } from '../data/masculinoData';

const LOGOS = Object.fromEntries(
  [...equiposFemenino, ...equiposMasculino].map(e => [e.id, e.logo])
);

export function logoDeEquipo(equipoId) {
  return (equipoId && LOGOS[equipoId]) || null;
}

export function iniciales(nombre) {
  return (nombre ?? '?').split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
}
