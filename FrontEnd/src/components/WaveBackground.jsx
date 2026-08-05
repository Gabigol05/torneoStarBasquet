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
            d="M0,0 Q50,-20 100,0 Q150,20 200,0 Q250,-20 300,0 Q350,20 400,0 Q450,-20 500,0 Q550,20 600,0 Q650,-20 700,0 Q750,20 800,0 Q850,-20 900,0 Q950,20 1000,0 Q1050,-20 1100,0 Q1150,20 1200,0 Q1250,-20 1300,0 Q1350,20 1400,0 Q1450,-20 1500,0 Q1550,20 1600,0"
          />
        </defs>
        <g transform="translate(0,45) scale(1,0.55)">
          <g className="wv" style={{ animationDuration: '24s', animationDelay: '-2s' }}>
            <use href="#wavebase" stroke="var(--color-primary, #1878E8)" strokeWidth="1.1" opacity="0.08" />
          </g>
        </g>
        <g transform="translate(0,80) scale(1,0.4)">
          <g className="wv" style={{ animationDuration: '19s', animationDelay: '-9s' }}>
            <use href="#wavebase" stroke="var(--color-primary, #1878E8)" strokeWidth="1.1" opacity="0.12" />
          </g>
        </g>
        <g transform="translate(0,120) scale(1,0.65)">
          <g className="wv" style={{ animationDuration: '15s', animationDelay: '-4s' }}>
            <use href="#wavebase" stroke="var(--color-primary, #1878E8)" strokeWidth="1.3" opacity="0.16" />
          </g>
        </g>
        <g transform="translate(0,160) scale(1,0.45)">
          <g className="wv" style={{ animationDuration: '12s', animationDelay: '-7s' }}>
            <use href="#wavebase" stroke="var(--color-accent, #4FA3FF)" strokeWidth="1.4" opacity="0.2" />
          </g>
        </g>
        <g transform="translate(0,200) scale(1,0.55)">
          <g className="wv" style={{ animationDuration: '9s', animationDelay: '-1s' }}>
            <use href="#wavebase" stroke="var(--color-accent, #4FA3FF)" strokeWidth="1.5" opacity="0.26" />
          </g>
        </g>
        <g transform="translate(0,235) scale(1,0.35)">
          <g className="wv" style={{ animationDuration: '6.5s', animationDelay: '-3s' }}>
            <use href="#wavebase" stroke="var(--color-accent, #4FA3FF)" strokeWidth="1.6" opacity="0.32" />
          </g>
        </g>
      </svg>
    </div>
  );
}
