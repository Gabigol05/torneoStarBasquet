import { useRef, useCallback } from 'react';

// Detecta swipe horizontal y llama onSwipeLeft / onSwipeRight
// threshold: mínimo px para considerar swipe (default 60)
export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 60 } = {}) {
  const startX = useRef(null);
  const startY = useRef(null);

  const onTouchStart = useCallback((e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (startX.current === null) return;
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
