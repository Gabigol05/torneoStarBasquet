// Google Analytics 4 (gtag.js), cargado solo si hay un Measurement ID
// configurado — si VITE_GA_MEASUREMENT_ID no está seteado, todas las
// funciones de acá no hacen nada (no rompe nada en local/preview sin el ID).
//
// Para activarlo: crear una propiedad GA4 en https://analytics.google.com,
// copiar el Measurement ID (formato G-XXXXXXXXXX) y agregarlo como
// VITE_GA_MEASUREMENT_ID en el .env local y en las variables de entorno
// del proyecto en Vercel (Settings → Environment Variables), luego redeploy.

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID ?? '';

export const gaEnabled = Boolean(GA_ID);

let loaded = false;

export function initAnalytics() {
  if (!gaEnabled || loaded || typeof window === 'undefined') return;
  loaded = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  gtag('js', new Date());
  // send_page_view: false porque el sitio es una SPA (react-router) — las
  // pageviews las mandamos a mano en cada cambio de ruta (ver App.jsx),
  // si no GA solo registraría la carga inicial y nada más.
  gtag('config', GA_ID, { send_page_view: false, anonymize_ip: true });
}

export function trackPageview(path) {
  if (!gaEnabled || typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', { page_path: path });
}

export function trackEvent(name, params = {}) {
  if (!gaEnabled || typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}
