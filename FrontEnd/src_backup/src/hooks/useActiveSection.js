import { useEffect, useState } from 'react';

// Detecta qué sección está visible en el viewport
// y devuelve el id de la sección activa
const SECTIONS = ['inicio', 'torneo-view', 'jugadores', 'equipos', 'bracket'];

export function useActiveSection() {
  const [active, setActive] = useState('inicio');

  useEffect(() => {
    const observers = [];

    SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        { threshold: 0.3, rootMargin: '-60px 0px -40% 0px' }
      );

      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach(o => o.disconnect());
  }, []);

  return active;
}
