import { useCallback, useEffect, useRef, useState } from 'react';
import { CounterUp } from './CounterUp';
import { useTournament } from '../context/TournamentContext';
import logoTorneo from '../assets/logo_torneo.jpg';

const MODE_COLORS = {
  masculino: { hex: 0x2f7de8 },
  femenino: { hex: 0xe8187a },
};

const HERO_DATA = {
  masculino: {
    badge: 'Torneo Masculino - En Curso',
    subtitle: 'Categoria Masculina - Cordoba - 2026',
    stats: [
      { end: 1,   label: 'Torneo' },
      { end: 8,   label: 'Equipos' },
      { end: 7,   label: 'Fechas' },
      { end: 120, label: 'Jugadores', suffix: '+' },
      { end: 28,  label: 'Partidos' },
    ],
  },
  femenino: {
    badge: 'Torneo Femenino - En Curso',
    subtitle: 'Categoria Femenina - Cordoba - 2026',
    stats: [
      { end: 1,   label: 'Torneo' },
      { end: 10,  label: 'Equipos' },
      { end: 7,   label: 'Fechas' },
      { end: 180, label: 'Jugadoras', suffix: '+' },
      { end: 34,  label: 'Partidos' },
    ],
  },
};

export function Hero() {
  const { mode, toggleMode } = useTournament();
  const data = HERO_DATA[mode];

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
          <div className="hero-logo">
            <img src={logoTorneo} alt="Torneo Star Basquet" />
          </div>
          <span className="hero-liga-label">Liga Oficial - Cordoba 2026</span>
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

          <p className="hero-subtitle">{data.subtitle}</p>

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
