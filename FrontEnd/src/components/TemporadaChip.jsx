import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTemporada } from '../context/TemporadaContext';
import { useTournament } from '../context/TournamentContext';

// Selector de temporada — la temporada es el encabezado de la barra (no un
// botón dorado suelto): rótulo chico arriba, nombre en Barlow Condensed
// grande abajo, y el estado de esa temporada al costado derecho.
//
// Decisiones visuales (cambio de set/2026):
//  - Se sacaron los emojis (📅 / 📁). El estado se comunica con el punto de
//    color + texto, que es lo que ya usaba el menú desplegado.
//  - El dorado #F0B429 dejó de pintar un chip relleno. Ahora significa una
//    sola cosa: "estás mirando una temporada archivada" (nombre + regla
//    lateral + aviso). En la temporada en curso la barra es neutra y el
//    verde #22D07A lleva la señal de "en vivo".
//  - Tipografía más grande (20/17px el nombre contra los 12.5px del chip
//    viejo) porque el selector se usa seguido y era lo más chico de la
//    pantalla.
//
// ⚠️ REDISEÑO (reporte Alvaro, con vista previa aprobada antes de tocar
// código): la barra era un rectángulo plano y sin bordes, siempre del mismo
// gris oscuro sea cual sea el torneo — "queda de otro color y forma de lo
// que es el torneo". El resto del sitio (fixture, resultado, líderes,
// cuadro de playoffs) usa SIEMPRE la misma receta de card: un borde de 1px
// con un degradé del color de la categoría, y adentro un degradé mucho más
// sutil del mismo color sobre el fondo oscuro — ver hexA/cardBg/innerBg en
// LeadersSection.jsx o PlayoffsBracket.jsx. Ahora la barra de temporada usa
// esa misma receta: rosa/azul (según `mode`) mientras se mira la temporada
// en curso, y dorado — la misma señal de "archivada" que ya tenía el resto
// de la barra — en cuanto se mira una vieja. De paso pasa a ser una card
// separada del borde de la pantalla (como cualquier otra card del sitio) en
// vez de una franja pegada de punta a punta.
//
// El menú desplegado sigue pintándose con un portal a <body> posicionado
// por getBoundingClientRect: cualquier contenedor padre con overflow:hidden
// lo recortaba (bug reportado por Alvaro: "se veía cortado abajo").
//
// Se auto-oculta si la categoría que se está mirando todavía tiene una
// sola temporada.
const ORO   = '#F0B429';
const VERDE = '#22D07A';
const LINEA = '#1C2535';
const MUTED = '#6B7A99';
const COND  = "'Barlow Condensed',sans-serif";
const FEM   = '#E8187A';
const FEM2  = '#FF4FA3';
const MASC  = '#1878E8';
const MASC2 = '#4FA3FF';

// Alpha en hex de 2 dígitos, igual que en el resto del sitio (fixture,
// resultado, líderes, playoffs) — evita color-mix()/variables CSS con
// alpha dinámico, que no anda bien en navegadores viejos de celulares.
const hexA = (hex, alpha) => `${hex}${alpha}`;

function useEsMobile() {
  const [esMobile, setEsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const on = e => setEsMobile(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return esMobile;
}

export function TemporadaChip() {
  const { temporadas, temporadaSeleccionadaId, temporadaActivaId, setTemporadaSeleccionadaId, esTemporadaActiva } = useTemporada();
  const { mode } = useTournament();
  const [abierto, setAbierto] = useState(false);
  const [coords, setCoords] = useState(null);
  const [hoverNombre, setHoverNombre] = useState(false);
  const esMobile = useEsMobile();
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const deLaCategoria = (temporadas ?? []).filter(t => t.categoria === mode);

  const actualizarPosicion = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const anchoEstimado = 280;
    const alinearDerecha = r.left + anchoEstimado > window.innerWidth - 8;
    setCoords({
      top: r.bottom + 8,
      left: alinearDerecha ? null : r.left,
      right: alinearDerecha ? (window.innerWidth - r.right) : null,
      minWidth: Math.max(r.width, 240),
    });
  };

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

  useEffect(() => { setAbierto(false); }, [mode]);

  if (deLaCategoria.length <= 1) return null;

  const ordenadas = [...deLaCategoria].sort((a, b) => b.id - a.id);
  const seleccionadaId = temporadaSeleccionadaId[mode];
  const seleccionada = ordenadas.find(t => t.id === seleccionadaId) ?? ordenadas[0];
  const enCurso = esTemporadaActiva(mode);

  const elegir = id => {
    setTemporadaSeleccionadaId(mode, id);
    setAbierto(false);
  };

  const acento = enCurso ? VERDE : ORO;

  // Color de la CARD (borde + fondo): el de la categoría mientras se mira
  // la temporada en curso, dorado en cuanto es una archivada — misma
  // convención que ya usa el resto de la barra a la derecha.
  const modeAccent  = mode === 'femenino' ? FEM  : MASC;
  const modeAccent2 = mode === 'femenino' ? FEM2 : MASC2;
  const cardAccent  = enCurso ? modeAccent  : ORO;
  const cardAccent2 = enCurso ? modeAccent2 : ORO;

  return (
    // No sticky a propósito: Navbar (desktop) y MobileHeader (mobile) ya son
    // sticky con top:0 — si esta barra también lo fuera, quedaría empujada
    // detrás del header al scrollear.
    <div style={{
      margin: esMobile ? '12px 16px 0' : '16px var(--container-padding) 0',
      padding: 1,
      borderRadius: 16,
      background: `linear-gradient(100deg, ${hexA(cardAccent, '66')}, ${LINEA} 60%)`,
      boxShadow: '0 10px 28px rgba(0,0,0,.35)',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: esMobile ? 'column' : 'row',
        alignItems: esMobile ? 'stretch' : 'center',
        justifyContent: 'space-between',
        gap: esMobile ? 10 : 20,
        padding: esMobile ? '12px 16px 14px' : '14px 24px',
        borderRadius: 15,
        background: `linear-gradient(100deg, ${hexA(cardAccent, '14')}, #0B111C 60%)`,
      }}>
        {/* Izquierda — la temporada como encabezado */}
        <div style={{ display: 'flex', alignItems: 'stretch', gap: esMobile ? 12 : 14, minWidth: 0 }}>
          <span aria-hidden style={{ width: 3, borderRadius: 2, background: cardAccent2, flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <span style={{
              fontFamily: COND, fontWeight: 700, fontSize: 10.5, letterSpacing: 1.6,
              textTransform: 'uppercase', color: MUTED, lineHeight: 1,
            }}>
              Temporada
            </span>
            <button
              ref={btnRef}
              type="button"
              onClick={() => setAbierto(a => !a)}
              onMouseEnter={() => setHoverNombre(true)}
              onMouseLeave={() => setHoverNombre(false)}
              aria-expanded={abierto}
              aria-haspopup="listbox"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: 0, margin: 0, border: 0, background: 'none', cursor: 'pointer',
                outline: 'none', minWidth: 0, minHeight: 44, alignSelf: 'flex-start',
                fontFamily: COND, fontWeight: 700, letterSpacing: .3,
                fontSize: esMobile ? 19 : 21, lineHeight: 1.1,
                color: enCurso ? (hoverNombre ? ORO : '#EEF2F8') : ORO,
                transition: 'color .15s',
              }}
            >
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {seleccionada?.nombre}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                background: hexA(cardAccent, '29'),
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={cardAccent2} strokeWidth="3"
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </span>
            </button>
          </div>
        </div>

        {/* Derecha — estado de la temporada que se está mirando */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: esMobile ? '9px 11px' : 0,
          borderRadius: esMobile ? 8 : 0,
          background: esMobile ? (enCurso ? 'rgba(255,255,255,.04)' : 'rgba(240,180,41,.09)') : 'transparent',
          flexShrink: 0,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: acento,
            boxShadow: enCurso ? `0 0 6px ${VERDE}` : 'none',
          }} />
          <span style={{
            fontFamily: COND, fontWeight: 700, fontSize: 11, letterSpacing: 1.2,
            textTransform: 'uppercase', color: acento, whiteSpace: 'nowrap',
          }}>
            {enCurso ? 'En curso' : 'Temporada anterior'}
          </span>
          <span aria-hidden style={{ width: 1, height: 13, background: LINEA, flexShrink: 0 }} />
          <span style={{
            fontFamily: COND, fontWeight: 500, fontSize: 13, lineHeight: 1.25,
            color: enCurso ? MUTED : '#B9A06A',
          }}>
            {enCurso ? 'Resultados y tabla en vivo' : 'Los datos no se mezclan con la actual'}
          </span>
        </div>

        {abierto && coords && createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: 'fixed', top: coords.top,
              left: coords.left ?? 'auto', right: coords.right ?? 'auto',
              minWidth: coords.minWidth, maxWidth: 'calc(100vw - 16px)',
              zIndex: 9999, overflow: 'hidden', padding: 5,
              borderRadius: 12, border: `1px solid ${LINEA}`, background: '#0E1420',
              boxShadow: '0 18px 40px rgba(0,0,0,.55)',
            }}
          >
            {ordenadas.map(t => {
              const activa = t.id === temporadaActivaId[mode];
              const sel = t.id === (seleccionada?.id ?? seleccionadaId);
              return (
                <div
                  key={t.id}
                  role="option"
                  aria-selected={sel}
                  onClick={() => elegir(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px',
                    minHeight: 44, borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap',
                    background: sel ? 'rgba(240,180,41,.12)' : 'transparent',
                  }}
                >
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: sel ? ORO : 'transparent',
                  }} />
                  <span style={{
                    flex: 1, fontFamily: COND, fontWeight: 700, fontSize: 15.5,
                    color: sel ? ORO : '#EEF2F8',
                  }}>
                    {t.nombre}
                  </span>
                  <span style={{
                    fontFamily: COND, fontSize: 11, fontWeight: 700, letterSpacing: .8,
                    textTransform: 'uppercase', color: activa ? VERDE : MUTED,
                  }}>
                    {activa ? 'En curso' : 'Finalizada'}
                  </span>
                </div>
              );
            })}
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
