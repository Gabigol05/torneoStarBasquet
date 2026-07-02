import { useEffect, useRef, useState, useCallback } from 'react';

const THRESHOLD = 72; // px para activar el refresh

export function usePullToRefresh(onRefresh) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(null);

  const handleTouchStart = useCallback((e) => {
    // Solo activar si estamos al tope de la página
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && window.scrollY === 0) {
      setIsPulling(dy > THRESHOLD);
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (isPulling && !isRefreshing) {
      setIsRefreshing(true);
      setIsPulling(false);
      try { await onRefresh?.(); } finally {
        setTimeout(() => setIsRefreshing(false), 600);
      }
    } else {
      setIsPulling(false);
    }
    startY.current = null;
  }, [isPulling, isRefreshing, onRefresh]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove',  handleTouchMove,  { passive: true });
    document.addEventListener('touchend',   handleTouchEnd);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove',  handleTouchMove);
      document.removeEventListener('touchend',   handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { isPulling, isRefreshing };
}

// Indicador visual de pull-to-refresh
export function PullToRefreshIndicator({ isPulling, isRefreshing }) {
  const show = isPulling || isRefreshing;
  return (
    <div className={`ptr-indicator ${show ? 'visible' : ''}`}>
      <div className="ptr-spinner" />
      {isRefreshing ? 'Actualizando estadísticas...' : 'Soltá para actualizar'}
    </div>
  );
}
