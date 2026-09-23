import { useMemo } from 'react';
import { useTemporada } from '../context/TemporadaContext';

// Un equipo "jugó" la temporada que se está mirando si tiene participación
// real en ella — partidos jugados o historial cargado (estos datos YA vienen
// scopeados a la temporada elegida, porque salen de los hooks de stats que
// filtran por `temporada_id` antes de llegar acá).
export function jugoEstaTemporada(equipo) {
  return (equipo.pj > 0) || (equipo.historial && equipo.historial.length > 0);
}

// `equipos_femenino`/`equipos_masculino.zona` (A/B) es un dato GLOBAL y
// ACTUAL en la base — no queda fijado por temporada. Por eso solo sirve como
// resguardo (para que un equipo recién armado, con 0 partidos todavía, no
// desaparezca de la vista) cuando la temporada que se está mirando es la
// ACTIVA ahora mismo. Para cualquier temporada ARCHIVADA la zona actual no
// dice nada de esa temporada vieja, así que ahí solo cuenta la
// participación real.
//
// ⚠️ Esta lógica estaba duplicada a mano en Hero.jsx, SeasonKpis.jsx,
// TorneoView.jsx y PlayoffsBracket.jsx — y faltaba por completo en el
// buscador global, que por eso mezclaba equipos entre temporadas. De acá en
// más vive en un solo lugar: cualquier ajuste futuro al criterio solo hay
// que hacerlo acá.
export function useEquiposDeTemporada(equipos, categoria) {
  const { esTemporadaActiva } = useTemporada();
  const activaCategoria = esTemporadaActiva(categoria);
  const equiposDeTemporada = useMemo(() => (equipos ?? []).filter(e =>
    jugoEstaTemporada(e) || (activaCategoria && (e.zona === 'A' || e.zona === 'B'))
  ), [equipos, activaCategoria]);
  return { equiposDeTemporada, activaCategoria };
}
