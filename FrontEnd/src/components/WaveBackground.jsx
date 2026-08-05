import { useEffect, useRef } from 'react';

// Fondo decorativo de lineas onduladas — una unica instancia fija detras de
// TODA la pagina (no una por seccion), montada una sola vez en PageHome.
// El costo no crece con el largo de la pagina: es "position: fixed" asi que
// nunca se re-mide ni repinta al hacer scroll, y lo unico que se anima es
// "transform" (compositor puro). El color sale de las variables de tema
// --color-primary/--color-accent, que ya cambian solas con la clase
// body.theme-masculino/theme-femenino — no hace falta re-renderizar nada
// de esto al cambiar de modo.
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
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return (
    <div className="wave-bg" ref={ref} aria-hidden="true">
      <div className="wave-bg-tint" />
      <svg viewBox="0 0 800 260" preserveAspectRatio="none" focusable="false">
        <defs>
          <path
            id="wavebase"
            fill="none"
            d="M0,0 Q50,-14 100,0 Q150,14 200,0 Q250,-14 300,0 Q350,14 400,0 Q450,-14 500,0 Q550,14 600,0 Q650,-14 700,0 Q750,14 800,0 Q850,-14 900,0 Q950,14 1000,0 Q1050,-14 1100,0 Q1150,14 1200,0 Q1250,-14 1300,0 Q1350,14 1400,0 Q1450,-14 1500,0 Q1550,14 1600,0"
          />
        </defs>
        <g transform="translate(0,30) scale(1,0.5)">
          <g className="wv" style={{ animationDuration: '20s', animationDelay: '-3s' }}>
            <use href="#wavebase" stroke="var(--color-primary, #1878E8)" strokeWidth="0.8" opacity="0.08" />
          </g>
        </g>
        <g transform="translate(0,120) scale(1,0.6)">
          <g className="wv" style={{ animationDuration: '14s', animationDelay: '-6s' }}>
            <use href="#wavebase" stroke="var(--color-primary, #1878E8)" strokeWidth="0.9" opacity="0.12" />
          </g>
        </g>
        <g transform="translate(0,213) scale(1,0.45)">
          <g className="wv" style={{ animationDuration: '10s', animationDelay: '-1s' }}>
            <use href="#wavebase" stroke="var(--color-accent, #4FA3FF)" strokeWidth="1" opacity="0.16" />
          </g>
        </g>
      </svg>
    </div>
  );
}
