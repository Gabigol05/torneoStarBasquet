import { useEffect } from 'react';

// Agrega la clase 'in-view' a todos los elementos .reveal-on-scroll
// cuando entran al viewport. Se llama una vez al montar el layout.
export function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal-on-scroll');
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target); // solo una vez
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}
