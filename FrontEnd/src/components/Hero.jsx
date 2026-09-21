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
  const { temporadas, esTemporadaActiva, temporadaSeleccionada } = useTemporada();

  // ⚠️ FIX (reporte Alvaro: viendo "Temporada 2026 - Apertura" archivada
  // decía "Edición 2", cuando esa fue la 1ra edición y Clausura es la 2da):
  // antes esto contaba CUÁNTAS temporadas hay en total para la categoría,
  // sin importar cuál se está mirando — con 2 temporadas cargadas, Apertura
  // Y Clausura mostraban "2" por igual. Ahora se calcula la POSICIÓN de la
  // temporada elegida dentro del historial de esa categoría (ordenado por
  // fecha de creación): la primera que se jugó es la edición 1, la
  // siguiente la 2, etc. — cada temporada archivada conserva el número que
  // le corresponde a ella, no el total actual.
  const edicionPara = (categoria) => {
    const propias = temporadas
      .filter(t => t.categoria === categoria)
      .sort((a, b) => new Date(a.creada_en ?? 0) - new Date(b.creada_en ?? 0) || a.id - b.id);
    const sel = temporadaSeleccionada(categoria);
    const idx = sel ? propias.findIndex(t => t.id === sel.id) : -1;
    return EDICION_OFFSET[categoria] + (idx >= 0 ? idx + 1 : propias.length);
  };
  const edicionFemenino  = edicionPara('femenino');
  const edicionMasculino = edicionPara('masculino');

  // El contador "Equipos" (y "Jugadoras/Jugadores", que suma por equipo) debe
  // contar solo los planteles que juegan la temporada que se está mirando.
  // ⚠️ FIX (reporte Alvaro: viendo la temporada archivada "Apertura" de
  // femenino aparecían los equipos NUEVOS de Clausura con 0 partidos, y a la
  // vez faltaban equipos viejos que sí jugaron Apertura): la zona (A/B) de
  // un equipo es un dato GLOBAL en la base, no algo que quede fijado por
  // temporada — así que usarla sola para decidir "quién juega esta
  // temporada" solo tiene sentido para la temporada ACTIVA ahora mismo (los
  // equipos recién armados, con 0 partidos todavía, deben poder mostrarse
  // igual). Para cualquier otra temporada (archivada) el dato que sí es
  // confiable es si el equipo tiene partidos/historial dentro de ESA
  // temporada (`equipos` ya viene filtrado por temporada desde el hook) —
  // eso es lo único que dice de verdad "este equipo jugó esta temporada".
  const activaCategoria = esTemporadaActiva(mode);
  const jugoEstaTemporada = e => (e.pj > 0) || (e.historial && e.historial.length > 0);
  const equiposActivos = equipos.filter(e =>
    jugoEstaTemporada(e) || (activaCategoria && (e.zona === 'A' || e.zona === 'B'))
  );

  const heroFemenino = useMemo(() => {
    const fechasJugadas = fechas.filter(f =>
      partidos.some(p => p.fecha_id === f.id && p.estado === 'finalizado')
    ).length;
    const jugadorasTotal = equiposActivos.reduce((sum, eq) => sum + (eq.jugadoras?.length ?? 0), 0);

    // ⚠️ FIX: antes decía "En Curso" siempre, sin importar si ya se había
    // jugado o no un solo partido, y sin importar si la temporada que se
    // está mirando (chip de arriba) ya terminó. Ahora hay 3 estados: si la
    // temporada que se está mirando NO es la activa (una archivada, ej.
    // "Temporada 2026 - Apertura" ya jugada entera) dice "Finalizado" — sin
    // importar que en su momento haya tenido fechas jugadas. Si es la
    // activa, usa el mismo criterio que ya tenía el masculino: "En Curso"
    // recién cuando hay al menos una fecha jugada, si no "Arranca Pronto".
    const finalizada = !esTemporadaActiva('femenino');
    const badge = finalizada
      ? 'Torneo Femenino - Finalizado'
      : (fechasJugadas > 0 ? 'Torneo Femenino - En Curso' : 'Torneo Femenino - Arranca Pronto');

    return {
      badge,
      subtitle: 'Categoria Femenina - Cordoba - 2026',
      stats: [
        { end: edicionFemenino, label: 'Edicion' },
        { end: equiposActivos.length || 10, label: 'Equipos' },
        { end: fechasJugadas, label: 'Fechas' },
        { end: jugadorasTotal || 200, label: 'Jugadoras' },
      ],
    };
  }, [equiposActivos, partidos, fechas, edicionFemenino, esTemporadaActiva]);

  // Antes era un objeto fijo (HERO_MASCULINO) con "Proximamente" y "0 Fechas"
  // pegado con alfileres — se iba a quedar diciendo eso para siempre. Ahora
  // calcula todo en vivo, igual que el femenino, y el badge pasa solo de
  // "Arranca Pronto" a "En Curso" apenas se carga el primer partido finalizado.
  const heroMasculino = useMemo(() => {
    const fechasJugadas = fechas.filter(f =>
      partidos.some(p => p.fecha_id === f.id && p.estado === 'finalizado')
    ).length;
    const jugadoresTotal = equiposActivos.reduce((sum, eq) => sum + (eq.jugadoras?.length ?? 0), 0);

    // Mismo criterio de 3 estados que el femenino (ver más arriba): si la
    // temporada que se está mirando ya no es la activa, "Finalizado" —
    // sin importar cuántas fechas se hayan jugado en su momento.
    const finalizada = !esTemporadaActiva('masculino');
    const badge = finalizada
      ? 'Torneo Masculino - Finalizado'
      : (fechasJugadas > 0 ? 'Torneo Masculino - En Curso' : 'Torneo Masculino - Arranca Pronto');

    return {
      badge,
      subtitle: 'Categoria Masculina - Cordoba - 2026',
      stats: [
        { end: edicionMasculino, label: 'Edicion' },
        { end: equiposActivos.length || 22, label: 'Equipos' },
        { end: fechasJugadas, label: 'Fechas' },
        { end: jugadoresTotal || 250, label: 'Jugadores', suffix: jugadoresTotal ? '' : '+' },
      ],
    };
  }, [equiposActivos, partidos, fechas, edicionMasculino, esTemporadaActiva]);

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
