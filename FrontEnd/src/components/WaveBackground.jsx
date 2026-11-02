import { useEffect, useRef } from 'react';

// Fondo decorativo de lineas onduladas — una unica instancia fija detras de
// TODA la pagina (no una por seccion), montada una sola vez en PageHome.
// El color sale de las variables de tema --color-primary/--color-accent,
// que ya cambian solas con la clase body.theme-masculino/theme-femenino.
//
// ⚡ Rendimiento (revisión general): antes se animaba el "transform" de
// grupos <g> DENTRO del SVG. Eso el navegador no lo puede mandar a la placa
// de video: tenía que volver a dibujar el SVG entero en cada cuadro, todo
// el tiempo, en toda la página (en celulares se notaba en el scroll y en la
// batería). Ahora cada onda es su propia capa HTML que se desliza con
// transform (lo mueve la placa de video sin redibujar nada). Se ve igual:
// mismas posiciones, grosores y velocidades.
const PATH =
  'M0,0 Q50,-14 100,0 Q150,14 200,0 Q250,-14 300,0 Q350,14 400,0 Q450,-14 500,0 Q550,14 600,0 Q650,-14 700,0 Q750,14 800,0 Q850,-14 900,0 Q950,14 1000,0 Q1050,-14 1100,0 Q1150,14 1200,0';

// top/height en % de la pantalla (equivalen a las posiciones del SVG viejo
// de 800x260: translate(0,y) scale(1,s)).
const ONDAS = [
  { top: '8.4615%',  height: '6.1538%', dur: '20s', delay: '-3s', color: 'var(--color-primary, #1878E8)', w: 0.8, op: 0.08 },
  { top: '42.4615%', height: '7.3846%', dur: '14s', delay: '-6s', color: 'var(--color-primary, #1878E8)', w: 0.9, op: 0.12 },
  { top: '79.1538%', height: '5.5385%', dur: '10s', delay: '-1s', color: 'var(--color-accent, #4FA3FF)',  w: 1,   op: 0.16 },
];

export function WaveBackground() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Pausar la animacion cuando la pestaña no esta visible ahorra CPU/
    // bateria — nadie ve el fondo si no esta mirando la app en ese momento.
    const onVisibility = () => {
      el.classList.toggle('is-paused', document.hidden);
    };
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return (
    <div className="wave-bg" ref={ref} aria-hidden="true">
      <div className="wave-bg-tint" />
      {ONDAS.map((o, i) => (
        <div
          key={i}
          className="wv"
          style={{ top: o.top, height: o.height, animationDuration: o.dur, animationDelay: o.delay }}
        >
          <svg viewBox="0 -16 1000 32" preserveAspectRatio="none" focusable="false">
            <path d={PATH} fill="none" stroke={o.color} strokeWidth={o.w} opacity={o.op} />
          </svg>
        </div>
      ))}
    </div>
  );
}
