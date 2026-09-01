import { useEffect, useRef, useState } from 'react';
import { useTemporada } from '../context/TemporadaContext';
import { useTournament } from '../context/TournamentContext';

// Selector de temporada — un desplegable propio (chevron dibujado + puntito
// de estado) con las temporadas DE LA CATEGORÍA QUE SE ESTÁ MIRANDO
// (femenino/masculino, según el toggle de arriba de todo), arriba de todo
// el contenido (Posiciones, Resultados, Líderes, Jugadoras, Playoffs
// cambian todos juntos según cuál esté seleccionada). Femenino y masculino
// tienen temporadas independientes (ver TemporadaContext) — por eso este
// selector filtra por categoría en vez de mezclar las de las dos juntas.
//
// Historial de este componente: arrancó como una fila de chips (uno por
// temporada, todos desplegados a la vez) — con 2 se veía bien, pero con 5
// o 10 (con el tiempo, cada Apertura/Clausura suma una más) quedaba una
// fila larga y desordenada. Se pasó a un <select> nativo, compacto sin
// importar cuántas haya — pero un <select> no puede pintar un puntito de
// color adentro de cada <option>, así que se perdió la señal visual de
// "cuál está en curso" hasta que se abría. Esta versión vuelve a un
// desplegable propio (mismo tamaño compacto que el <select>) para
// recuperar esa señal: el puntito de estado ahora se ve siempre, sin
// tener que abrir nada.
//
// Se auto-oculta si la categoría que se está mirando todavía tiene una
// sola temporada, para no meter un selector de más cuando no hace falta
// elegir nada.
export function TemporadaChip() {
  const { temporadas, temporadaSeleccionadaId, temporadaActivaId, setTemporadaSeleccionadaId, esTemporadaActiva } = useTemporada();
  const { mode } = useTournament();
  const [abierto, setAbierto] = useState(false);
  const wrapRef = useRef(null);

  const deLaCategoria = (temporadas ?? []).filter(t => t.categoria === mode);

  // Cerrar al tocar afuera o con Escape.
  useEffect(() => {
    if (!abierto) return;
    const onClickFuera = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setAbierto(false);
    };
    const onEsc = e => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', onClickFuera);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickFuera);
      document.removeEventListener('keydown', onEsc);
    };
  }, [abierto]);

  // Si cambia de categoría (toggle femenino/masculino) con el desplegable
  // abierto, lo cerramos — evita que quede abierto mostrando temporadas
  // de la categoría anterior.
  useEffect(() => { setAbierto(false); }, [mode]);

  if (deLaCategoria.length <= 1) return null;

  // Más nueva primero — así la temporada en curso siempre está arriba de
  // todo en la lista, sin tener que scrollear.
  const ordenadas = [...deLaCategoria].sort((a, b) => b.id - a.id);
  const seleccionadaId = temporadaSeleccionadaId[mode];
  const seleccionada = ordenadas.find(t => t.id === seleccionadaId) ?? ordenadas[0];
  const enCurso = seleccionada?.id === temporadaActivaId[mode];

  const elegir = id => {
    setTemporadaSeleccionadaId(mode, id);
    setAbierto(false);
  };

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

        <div ref={wrapRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setAbierto(a => !a)}
            aria-expanded={abierto}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '7px 8px 7px 14px', borderRadius: 100, cursor: 'pointer',
              fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 12.5, letterSpacing: .5,
              border: '1px solid #F0B429', background: 'rgba(240,180,41,.14)', color: '#F0B429',
              boxShadow: abierto ? '0 0 14px rgba(240,180,41,.16)' : 'none',
              maxWidth: '60vw', outline: 'none',
            }}
          >
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {seleccionada?.nombre}
            </span>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: enCurso ? '#22D07A' : '#6B7A99',
              boxShadow: enCurso ? '0 0 6px #22D07A' : 'none',
            }} />
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F0B429" strokeWidth="3"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0, transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {abierto && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 20,
              minWidth: '100%', maxWidth: '70vw', overflow: 'hidden',
              borderRadius: 12, border: '1px solid #1C2535', background: '#0E1420',
              boxShadow: '0 8px 24px rgba(0,0,0,.4)',
            }}>
              {ordenadas.map(t => {
                const activa = t.id === temporadaActivaId[mode];
                const sel = t.id === seleccionadaId;
                return (
                  <div
                    key={t.id}
                    onClick={() => elegir(t.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      cursor: 'pointer', whiteSpace: 'nowrap',
                      fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 13,
                      background: sel ? 'rgba(240,180,41,.14)' : 'transparent',
                      color: sel ? '#F0B429' : '#EEF2F8',
                    }}
                  >
                    <span style={{ flex: 1 }}>{t.nombre}</span>
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, letterSpacing: .4, textTransform: 'uppercase',
                      color: activa ? '#22D07A' : '#6B7A99',
                    }}>
                      {activa ? '● en curso' : 'finalizada'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
