// Detecta swipe horizontal y llama onSwipeLeft / onSwipeRight
// threshold: minimo px para considerar swipe (default 60)
import { useRef, useCallback } from 'react';

export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 60 } = {}) {
  const startX = useRef(null);
  const startY = useRef(null);
  const ignorar = useRef(false);

  const onTouchStart = useCallback((e) => {
    // Si el toque empieza dentro de un elemento que ya maneja su propio
    // scroll horizontal (chips de filtro, tablas con overflow-x, etc.),
    // no interceptamos el gesto para no chocar con ese scroll nativo.
    ignorar.current = !!e.target.closest('.filter-chips, .fecha-chips, [data-no-swipe]');
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (startX.current === null || ignorar.current) {
      startX.current = null;
      startY.current = null;
      return;
    }
    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = e.changedTouches[0].clientY - startY.current;
    // Si el movimiento vertical es mayor que el horizontal, no es swipe de tabs
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (dx < -threshold) onSwipeLeft?.();
    if (dx >  threshold) onSwipeRight?.();
    startX.current = null;
    startY.current = null;
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return { onTouchStart, onTouchEnd };
}
