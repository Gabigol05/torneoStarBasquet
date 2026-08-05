import { useEffect } from 'react';

// Agrega la clase 'in-view' a todos los elementos .reveal-on-scroll cuando
// entran al viewport.
//
// OJO: muchas secciones (Lideres, Encuestas, etc.) recien agregan sus
// elementos ".reveal-on-scroll" al DOM despues de que terminan de cargar
// datos de Supabase — no estan presentes en el primer render. Un solo
// querySelectorAll al montar (como antes) se los pierde para siempre y
// quedan con opacity:0 permanente si esa carga tarda un toque mas de lo
// normal (por eso a veces se ven y a veces no, segun la velocidad de red
// de cada visitante). Por eso ademas del escaneo inicial se usa un
// MutationObserver que vuelve a barrer el DOM cada vez que se agregan
// nodos nuevos, así cualquier tarjeta que aparezca despues tambien queda
// observada.
export function useScrollReveal() {
  useEffect(() => {
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

    const observeNew = () => {
      document.querySelectorAll('.reveal-on-scroll:not(.in-view)').forEach(el => observer.observe(el));
    };

    observeNew();

    const mutationObserver = new MutationObserver(observeNew);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);
}
