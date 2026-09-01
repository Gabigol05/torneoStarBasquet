import { useTemporada } from '../context/TemporadaContext';
import { useTournament } from '../context/TournamentContext';

// Selector de temporada — un <select> compacto con las temporadas DE LA
// CATEGORÍA QUE SE ESTÁ MIRANDO (femenino/masculino, según el toggle de
// arriba de todo), arriba de todo el contenido (Posiciones, Resultados,
// Líderes, Jugadoras, Playoffs cambian todos juntos según cuál esté
// seleccionada). Femenino y masculino tienen temporadas independientes
// (ver TemporadaContext) — por eso este selector filtra por categoría en
// vez de mezclar las de las dos juntas.
//
// Antes esto era una fila de chips, uno por temporada, todos desplegados a
// la vez — con 2 temporadas se veía bien, pero con 5 o 10 (con el tiempo,
// cada Apertura/Clausura suma una más) iba a quedar una fila larga y
// desordenada. Un <select> nativo se mantiene compacto sin importar cuántas
// haya, y en mobile además abre el picker nativo del sistema en vez de un
// dropdown propio (menos código, más prolijo).
//
// Se auto-oculta si la categoría que se está mirando todavía tiene una
// sola temporada, para no meter un selector de más cuando no hace falta
// elegir nada.
export function TemporadaChip() {
  const { temporadas, temporadaSeleccionadaId, temporadaActivaId, setTemporadaSeleccionadaId, esTemporadaActiva } = useTemporada();
  const { mode } = useTournament();

  const deLaCategoria = (temporadas ?? []).filter(t => t.categoria === mode);
  if (deLaCategoria.length <= 1) return null;

  // Más nueva primero — así la temporada en curso siempre está arriba de
  // todo en el desplegable, sin tener que scrollear la lista.
  const ordenadas = [...deLaCategoria].sort((a, b) => b.id - a.id);
  const seleccionadaId = temporadaSeleccionadaId[mode];

  return (
    // No sticky acá a propósito: tanto Navbar (desktop) como MobileHeader
    // (mobile) ya son sticky con top:0 propio — si este selector también
    // fuera sticky con top:0, al scrollear terminaría empujado detrás del
    // header (mismo top, pero el header tiene z-index más alto) y
    // desaparecería de la vista en vez de quedar pegado debajo. Como fila
    // normal, se ve siempre apenas se entra a la página, justo debajo del
    // header.
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      padding: '10px 16px', background: 'rgba(8,16,26,.92)', backdropFilter: 'blur(8px)',
      borderBottom: '1px solid #1C2535',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: .5, color: '#4A566E',
          fontFamily: "'Barlow Condensed',sans-serif", textTransform: 'uppercase',
        }}>
          📅 Temporada
        </span>
        <select
          value={seleccionadaId ?? ''}
          onChange={e => setTemporadaSeleccionadaId(mode, Number(e.target.value))}
          style={{
            padding: '6px 12px', borderRadius: 100, cursor: 'pointer',
            fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12.5, letterSpacing: .5,
            border: '1px solid #F0B429', background: 'rgba(240,180,41,.14)', color: '#F0B429',
            outline: 'none', maxWidth: '60vw',
          }}
        >
          {ordenadas.map(t => (
            <option key={t.id} value={t.id} style={{ background: '#0E1420', color: '#EEF2F8' }}>
              {t.nombre}{t.id === temporadaActivaId[mode] ? ' · en curso' : ' · finalizada'}
            </option>
          ))}
        </select>
      </div>
      {!esTemporadaActiva(mode) && (
        <div style={{
          fontSize: 11, color: '#8899BB', fontFamily: "'Barlow Condensed',sans-serif",
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          📁 Estás viendo una temporada anterior — los datos no se mezclan con la actual.
        </div>
      )}
    </div>
  );
}
