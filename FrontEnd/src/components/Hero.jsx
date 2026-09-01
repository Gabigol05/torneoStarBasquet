import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CounterUp } from './CounterUp';
import { useTournament } from '../context/TournamentContext';
import { useTemporada } from '../context/TemporadaContext';
import logoTorneo from '../assets/logo_torneo.jpg';
import sponsorAustral from '../assets/sponsor_austral_bar.png';
import sponsorLening from '../assets/sponsor_lening.png';

const SPONSORS = [
  { id: 'austral', name: 'Austral Bar',              logo: sponsorAustral },
  { id: 'lening',  name: 'Lening Indumentaria Deportiva', logo: sponsorLening },
];

const MODE_COLORS = {
  masculino: { hex: 0x2f7de8 },
  femenino: { hex: 0xe8187a },
};

// "Edición" = cuántos torneos reales tiene encima cada categoría. Antes de
// que este panel existiera ya se habían jugado ediciones (sobre todo del
// masculino, que arrancó bastante antes) que nunca quedaron cargadas como
// filas de `temporadas` — por eso no alcanza con contar filas de la tabla:
// hay que sumarle un "arrastre" de las ediciones previas al software. Este
// offset es ese arrastre por categoría (arrastre + filas en `temporadas` =
// edición actual). Masculino: offset 5 porque cuando se cargó la primera
// fila de `temporadas` para masculino, ya era la 6ta edición real (5 previas
// + esa 1 fila = 6). Femenino: offset 0, porque su primera fila cargada acá
// FUE la 1ra edición real. Si alguno de los dos arrastres no es exacto,
// ajustar el número de acá.
const EDICION_OFFSET = { femenino: 0, masculino: 5 };

export function Hero({ equipos = [], partidos = [], fechas = [] }) {
  const { mode, toggleMode } = useTournament();
  const { temporadas } = useTemporada();

  // ⚠️ FIX: antes "Edicion" estaba hardcodeado en 1 (femenino) y 6
  // (masculino) para siempre — no se movía nunca, ni cuando se cerraba una
  // temporada y arrancaba la siguiente (ej: al crear "2026 - Clausura" para
  // femenino, que ya es la 2da edición). Ahora cuenta cuántas temporadas
  // tiene cargadas cada categoría (Apertura + Clausura suman ediciones
  // distintas) y le suma el arrastre de ediciones previas al software.
  const edicionFemenino  = EDICION_OFFSET.femenino  + temporadas.filter(t => t.categoria === 'femenino').length;
  const edicionMasculino = EDICION_OFFSET.masculino + temporadas.filter(t => t.categoria === 'masculino').length;

  const heroFemenino = useMemo(() => {
    const fechasJugadas = fechas.filter(f =>
      partidos.some(p => p.fecha_id === f.id && p.estado === 'finalizado')
    ).length;
    const jugadorasTotal = equipos.reduce((sum, eq) => sum + (eq.jugadoras?.length ?? 0), 0);

    return {
      // ⚠️ FIX: antes decía "En Curso" siempre, sin importar si ya se había
      // jugado o no un solo partido — al crear una temporada nueva (que
      // arranca en 0) seguía mostrando "En Curso" aunque todavía faltaran
      // semanas para el primer partido. Ahora usa el mismo criterio que ya
      // tenía el masculino: recién dice "En Curso" cuando hay al menos una
      // fecha jugada.
      badge: fechasJugadas > 0 ? 'Torneo Femenino - En Curso' : 'Torneo Femenino - Arranca Pronto',
      subtitle: 'Categoria Femenina - Cordoba - 2026',
      stats: [
        { end: edicionFemenino, label: 'Edicion' },
        { end: equipos.length || 10, label: 'Equipos' },
        { end: fechasJugadas, label: 'Fechas' },
        { end: jugadorasTotal || 200, label: 'Jugadoras' },
      ],
    };
  }, [equipos, partidos, fechas, edicionFemenino]);

  // Antes era un objeto fijo (HERO_MASCULINO) con "Proximamente" y "0 Fechas"
  // pegado con alfileres — se iba a quedar diciendo eso para siempre. Ahora
  // calcula todo en vivo, igual que el femenino, y el badge pasa solo de
  // "Arranca Pronto" a "En Curso" apenas se carga el primer partido finalizado.
  const heroMasculino = useMemo(() => {
    const fechasJugadas = fechas.filter(f =>
      partidos.some(p => p.fecha_id === f.id && p.estado === 'finalizado')
    ).length;
    const jugadoresTotal = equipos.reduce((sum, eq) => sum + (eq.jugadoras?.length ?? 0), 0);

    return {
      badge: fechasJugadas > 0 ? 'Torneo Masculino - En Curso' : 'Torneo Masculino - Arranca Pronto',
      subtitle: 'Categoria Masculina - Cordoba - 2026',
      stats: [
        { end: edicionMasculino, label: 'Edicion' },
        { end: equipos.length || 22, label: 'Equipos' },
        { end: fechasJugadas, label: 'Fechas' },
        { end: jugadoresTotal || 250, label: 'Jugadores', suffix: jugadoresTotal ? '' : '+' },
      ],
    };
  }, [equipos, partidos, fechas, edicionMasculino]);

  const data = mode === 'femenino' ? heroFemenino : heroMasculino;

  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !canvasRef.current || !rootRef.current) return undefined;

    let cancelled = false;
    import('../three/basketballScene').then(({ createBasketballScene }) => {
      if (cancelled || !canvasRef.current || !rootRef.current) return;
      sceneRef.current = createBasketballScene({
        canvas: canvasRef.current,
        container: rootRef.current,
        initialMode: mode,
        modeColors: MODE_COLORS,
      });
    }).catch(() => {
      // WebGL unsupported/blocked
    });

    return () => {
      cancelled = true;
      sceneRef.current?.destroy();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!rootRef.current) return undefined;
    let isIntersecting = false;

    const io = new IntersectionObserver(([entry]) => {
      isIntersecting = entry.isIntersecting;
      if (isIntersecting && document.visibilityState === 'visible') {
        sceneRef.current?.resume();
      } else {
        sceneRef.current?.pause();
      }
    }, { threshold: 0 });
    io.observe(rootRef.current);

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && isIntersecting) {
        sceneRef.current?.resume();
      } else if (document.visibilityState !== 'visible') {
        sceneRef.current?.pause();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const handleToggle = useCallback(() => {
    if (transitioning) return;
    const next = mode === 'masculino' ? 'femenino' : 'masculino';
    if (sceneRef.current) {
      setTransitioning(true);
      sceneRef.current.setMode(next, { onDone: () => setTransitioning(false) });
    }
    toggleMode();
  }, [mode, transitioning, toggleMode]);

  return (
    <section ref={rootRef} id="inicio" className={`hero hero-mode-${mode}`}>
      <div className="hero-bg-glow" />
      <div className="hero-bg-grid" />
      <div className="hero-ring hero-ring-outer" />
      <div className="hero-ring hero-ring-inner" />

      <canvas ref={canvasRef} className="hero-canvas" />

      <div className="hero-scrim" />
      <div className="hero-scrim-bottom" />

      <div className="hero-content">
        <div className="hero-top">
          <div className="hero-sponsor hero-sponsor-left">
            <img src={SPONSORS[0].logo} alt={SPONSORS[0].name} />
          </div>

          <div className="hero-top-center">
            <div className="hero-logo">
              <img src={logoTorneo} alt="Torneo Star Basquet" />
            </div>
            <span className="hero-liga-label">Torneo Oficial</span>
          </div>

          <div className="hero-sponsor hero-sponsor-right">
            <img src={SPONSORS[1].logo} alt={SPONSORS[1].name} />
          </div>
        </div>

        <div className="hero-center">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            {data.badge}
          </div>

          <h1 className="hero-title">
            <span className="hero-title-line">TORNEO</span>
            <span className="hero-title-line hero-title-accent">STAR BASQUET</span>
          </h1>

          <button
            type="button"
            className="hero-toggle"
            onClick={handleToggle}
            disabled={transitioning}
            aria-label={`Modo actual: ${mode}. Tocar para cambiar a ${mode === 'masculino' ? 'femenino' : 'masculino'}.`}
          >
            <span className="hero-toggle-slider" />
            <span className={`hero-toggle-opt${mode === 'masculino' ? ' is-active' : ''}`}>MASC</span>
            <span className={`hero-toggle-opt${mode === 'femenino' ? ' is-active' : ''}`}>FEM</span>
          </button>
        </div>

        <div className="hero-bottom">
          <div className="hero-stats" key={mode}>
            {data.stats.map((s, i) => (
              <div className="hero-stat" key={i}>
                <div className="hero-stat-num">
                  <CounterUp end={s.end} />
                  {s.suffix && <span className="hero-stat-suffix">{s.suffix}</span>}
                </div>
                <div className="hero-stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="hero-scroll-hint">
            <span>Desliza</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
