import { useTemporada } from '../context/TemporadaContext';

// Selector global de temporada — un chip por cada temporada cargada, arriba
// de todo el contenido (Posiciones, Resultados, Líderes, Jugadoras,
// Playoffs cambian todos juntos según cuál esté seleccionada). Se auto-oculta
// si todavía hay una sola temporada, para no meter un chip de más cuando
// no hace falta elegir nada.
export function TemporadaChip() {
  const { temporadas, temporadaSeleccionadaId, temporadaActivaId, setTemporadaSeleccionadaId, esTemporadaActiva } = useTemporada();

  if (!temporadas || temporadas.length <= 1) return null;

  // Más nueva primero — así la temporada en curso siempre está a la vista
  // sin tener que scrollear la lista de chips.
  const ordenadas = [...temporadas].sort((a, b) => b.id - a.id);

  return (
    // No sticky acá a propósito: tanto Navbar (desktop) como MobileHeader
    // (mobile) ya son sticky con top:0 propio — si este chip también fuera
    // sticky con top:0, al scrollear terminaría empujado detrás del header
    // (mismo top, pero el header tiene z-index más alto) y desaparecería de
    // la vista en vez de quedar pegado debajo. Como fila normal, se ve
    // siempre apenas se entra a la página, justo debajo del header.
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      padding: '10px 16px', background: 'rgba(8,16,26,.92)', backdropFilter: 'blur(8px)',
      borderBottom: '1px solid #1C2535',
    }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {ordenadas.map(t => {
          const selected = t.id === temporadaSeleccionadaId;
          const activa   = t.id === temporadaActivaId;
          return (
            <button
              key={t.id}
              onClick={() => setTemporadaSeleccionadaId(t.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 100, cursor: 'pointer',
                fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12.5, letterSpacing: .5,
                textTransform: 'uppercase',
                border: selected ? '1px solid #F0B429' : '1px solid #1C2535',
                background: selected ? 'rgba(240,180,41,.14)' : 'transparent',
                color: selected ? '#F0B429' : '#8899BB',
                transition: 'all .15s',
              }}
            >
              {t.nombre}
              {activa && (
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: selected ? '#F0B429' : '#22D07A',
                  boxShadow: `0 0 6px ${selected ? '#F0B429' : '#22D07A'}`,
                }} title="Temporada en curso" />
              )}
            </button>
          );
        })}
      </div>
      {!esTemporadaActiva && (
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
