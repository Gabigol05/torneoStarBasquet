import { useEffect, useState } from 'react';

// Oculta la barra inferior al bajar y la muestra al subir (como las apps y
// como en 351 Deportes). Arriba de todo (primeros 120px) siempre se ve.
export function useBarraOcultaAlBajar(umbral = 8) {
  const [oculta, setOculta] = useState(false);
  useEffect(() => {
    let ultimo = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - ultimo) < umbral) return;
      setOculta(y > ultimo && y > 120);
      ultimo = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [umbral]);
  return oculta;
}
