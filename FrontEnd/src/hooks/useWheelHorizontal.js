import { useCallback, useRef } from 'react';

// Permite scrollear una fila horizontal (chips de equipos, fechas, etc.) en
// desktop con la rueda del mouse y con click+arrastrar, ya que el scrollbar
// está oculto por CSS. El touch/trackpad ya funciona solo via overflow-x:auto
// nativo del navegador.
//
// Usa un "callback ref" (no useRef + useEffect) a propósito: la fila puede
// vivir dentro de una pestaña que no está montada al cargar la página (ej:
// "Jugadores"), así que un useEffect con [] como dependencias se ejecutaría
// una sola vez, ANTES de que el elemento exista, y nunca engancharía nada.
export function useWheelHorizontal() {
  const cleanupRef = useRef(null);

  const setRef = useCallback((el) => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    if (!el) return;

    const onWheel = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      if (el.scrollWidth <= el.clientWidth) return;
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };

    // Drag-to-scroll simple. A propósito NO intenta cancelar el click
    // posterior: en trackpads un "click" normal casi siempre genera algunos
    // px de movimiento (por la presión del dedo), y cancelar el click en
    // base a eso terminaba bloqueando los clicks reales. El peor caso de no
    // cancelarlo es que un arrastre que termina justo sobre otro chip
    // también lo tilde — un caso raro y menor, mucho mejor que romper el
    // click normal.
    let isDown = false;
    let startX = 0;
    let startScroll = 0;

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      if (el.scrollWidth <= el.clientWidth) return;
      isDown = true;
      startX = e.pageX;
      startScroll = el.scrollLeft;
      el.classList.add('is-dragging');
    };
    const onMouseMove = (e) => {
      if (!isDown) return;
      const delta = e.pageX - startX;
      if (Math.abs(delta) < 3) return; // ignora micro-movimiento (trackpad tap)
      el.scrollLeft = startScroll - delta;
    };
    const endDrag = () => {
      isDown = false;
      el.classList.remove('is-dragging');
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', endDrag);
    el.addEventListener('mouseleave', endDrag);

    cleanupRef.current = () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', endDrag);
      el.removeEventListener('mouseleave', endDrag);
    };
  }, []);

  return setRef;
}
