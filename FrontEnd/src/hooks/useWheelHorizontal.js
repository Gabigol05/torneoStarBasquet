import { useEffect, useRef } from 'react';

// Permite scrollear una fila horizontal (chips de equipos, fechas, etc.) con
// la rueda del mouse en desktop. Sin esto, el usuario solo puede moverla con
// touch/trackpad o arrastrando el scrollbar (que además está oculto por CSS),
// y en la practica no descubre que hay mas contenido a la derecha.
export function useWheelHorizontal() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const onWheel = (e) => {
      // Solo interceptamos si el gesto es mayormente vertical (rueda de mouse
      // normal) y el contenedor realmente tiene mas contenido para mostrar.
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      if (el.scrollWidth <= el.clientWidth) return;
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return ref;
}
