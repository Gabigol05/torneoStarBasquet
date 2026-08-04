import { useCallback, useRef } from 'react';

// Permite scrollear una fila horizontal (chips de equipos, fechas, etc.) en
// desktop de dos formas, ya que el scrollbar está oculto por CSS y sin esto
// el usuario no tiene forma de descubrir/mover el contenido con el mouse:
//   1) Rueda del mouse (scroll vertical normal se traduce a scrollLeft).
//   2) Click + arrastrar (drag-to-scroll), como un carrusel.
// El touch/trackpad ya funciona solo, vía overflow-x:auto nativo.
//
// Usa un "callback ref" (no useRef + useEffect) a propósito: la fila puede
// vivir dentro de una pestaña que no está montada al cargar la página (ej:
// "Jugadores"), así que un useEffect con [] como dependencias se ejecutaría
// una sola vez, ANTES de que el elemento exista, y nunca engancharía nada.
// El callback ref, en cambio, corre justo cuando React monta/desmonta el
// nodo real, sin importar cuándo pase eso.
export function useWheelHorizontal() {
  const cleanupRef = useRef(null);

  const setRef = useCallback((el) => {
    // Si había un elemento anterior (ej: la pestaña se desmontó), limpiamos.
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

    let isDown = false;
    let dragged = false;
    let startX = 0;
    let startScroll = 0;

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      if (el.scrollWidth <= el.clientWidth) return;
      isDown = true;
      dragged = false;
      startX = e.pageX;
      startScroll = el.scrollLeft;
      el.classList.add('is-dragging');
      // OJO: sin preventDefault() acá a propósito — eso también cancelaba el
      // click normal de los chips (filtrar por equipo). El "drag fantasma"
      // que esto buscaba evitar en realidad lo causa el <img> del logo (las
      // imágenes son arrastrables por defecto), y eso se resuelve en CSS con
      // -webkit-user-drag:none / pointer-events:none, no bloqueando el click.
    };
    const onMouseMove = (e) => {
      if (!isDown) return;
      const delta = e.pageX - startX;
      if (Math.abs(delta) > 4) dragged = true;
      if (!dragged) return;
      el.scrollLeft = startScroll - delta;
      e.preventDefault();
    };
    const endDrag = () => {
      isDown = false;
      el.classList.remove('is-dragging');
    };
    const onClickCapture = (e) => {
      if (dragged) {
        e.stopPropagation();
        e.preventDefault();
        dragged = false;
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', endDrag);
    el.addEventListener('mouseleave', endDrag);
    el.addEventListener('click', onClickCapture, true);

    cleanupRef.current = () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', endDrag);
      el.removeEventListener('mouseleave', endDrag);
      el.removeEventListener('click', onClickCapture, true);
    };
  }, []);

  return setRef;
}
