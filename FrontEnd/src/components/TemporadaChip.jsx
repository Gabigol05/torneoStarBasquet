import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
// "cuál está en curso" hasta que se abría. Se pasó a un desplegable propio
// para recuperar esa señal — pero al vivir DENTRO del flujo normal de la
// página, cualquier contenedor padre con overflow:hidden (headers/wrappers
// con esquinas redondeadas o blur suelen tenerlo) recortaba la lista
// apenas se pasaba de un par de opciones (el bug que reportó Alvaro: se
// veía "cortado abajo", no aparecía la temporada vieja).
//
// Por eso el menú desplegado se pinta con un portal directo a <body> y se
// posiciona en base a las coordenadas reales del botón en pantalla
// (getBoundingClientRect) — así queda completamente afuera del flujo/
// recorte de sus contenedores padre, sin importar qué overflow tengan.
//
// Se auto-oculta si la categoría que se está mirando todavía tiene una
// sola temporada, para no meter un selector de más cuando no hace falta
// elegir nada.
export function TemporadaChip() {
  const { temporadas, temporadaSeleccionadaId, temporadaActivaId, setTemporadaSeleccionadaId, esTemporadaActiva } = useTemporada();
  const { mode } = useTournament();
  const [abierto, setAbierto] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const deLaCategoria = (temporadas ?? []).filter(t => t.categoria === mode);

  const actualizarPosicion = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    // Si no entra a la derecha, se alinea por el borde derecho del botón
    // en vez del izquierdo — para que no se corte contra el borde de la
    // pantalla en celulares angostos.
    const anchoEstimado = 240;
    const alinearDerecha = r.left + anchoEstimado > window.innerWidth - 8;
    setCoords({
      top: r.bottom + 6,
      left: alinearDerecha ? null : r.left,
      right: alinearDerecha ? (window.innerWidth - r.right) : null,
      minWidth: r.width,
    });
  };

  // Cerrar al tocar afuera o con Escape; reposicionar si hay scroll/resize
  // mientras está abierto (el portal ya no se mueve solo con el botón, al
  // vivir fuera del flujo normal).
  useEffect(() => {
    if (!abierto) return;
    actualizarPosicion();
    const onScrollOrResize = () => actualizarPosicion();
    const onClickFuera = e => {
      if (btnRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setAbierto(false);
    };
    const onEsc = e => { if (e.key === 'Escape') setAbierto(false); };
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    document.addEventListener('mousedown', onClickFuera);
    document.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
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

        <button
          ref={btnRef}
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

        {abierto && coords && createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed', top: coords.top,
              left: coords.left ?? 'auto', right: coords.right ?? 'auto',
              minWidth: coords.minWidth, maxWidth: 'calc(100vw - 16px)',
              zIndex: 9999, overflow: 'hidden',
              borderRadius: 12, border: '1px solid #1C2535', background: '#0E1420',
              boxShadow: '0 8px 24px rgba(0,0,0,.4)',
            }}
          >
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
          </div>,
          document.body
        )}
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
