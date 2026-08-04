import { useEffect, useRef } from 'react';

// Permite scrollear una fila horizontal (chips de equipos, fechas, etc.) en
// desktop de dos formas, ya que el scrollbar está oculto por CSS y sin esto
// el usuario no tiene forma de descubrir/mover el contenido con el mouse:
//   1) Rueda del mouse (scroll vertical normal se traduce a scrollLeft).
//   2) Click + arrastrar (drag-to-scroll), como un carrusel.
// El touch/trackpad ya funciona solo, vía overflow-x:auto nativo.
export function useWheelHorizontal() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    // ── Rueda del mouse → scroll horizontal ──
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      if (el.scrollWidth <= el.clientWidth) return;
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };

    // ── Click + arrastrar → scroll horizontal ──
    let isDown = false;
    let dragged = false;
    let startX = 0;
    let startScroll = 0;

    const onMouseDown = (e) => {
      if (e.button !== 0) return; // solo click izquierdo
      if (el.scrollWidth <= el.clientWidth) return;
      isDown = true;
      dragged = false;
      startX = e.pageX;
      startScroll = el.scrollLeft;
      el.classList.add('is-dragging');
      // Clave: sin esto el navegador arranca su propio drag nativo (de texto
      // o del botón como "imagen fantasma") que compite con nuestro scroll
      // manual y hace que se sienta trabado/errático.
      e.preventDefault();
    };
    const onMouseMove = (e) => {
      if (!isDown) return;
      const delta = e.pageX - startX;
      if (Math.abs(delta) > 4) dragged = true;
      el.scrollLeft = startScroll - delta;
      e.preventDefault();
    };
    const endDrag = () => {
      isDown = false;
      el.classList.remove('is-dragging');
    };
    // Si hubo arrastre real, cancelamos el click siguiente para que no
    // dispare el filtro del chip que quedó bajo el cursor al soltar.
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

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', endDrag);
      el.removeEventListener('mouseleave', endDrag);
      el.removeEventListener('click', onClickCapture, true);
    };
  }, []);

  return ref;
}
