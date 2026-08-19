import { useState, useEffect, useCallback } from 'react';
import logoTorneo from '../assets/logo_torneo.jpg';
import { trackEvent } from '../lib/analytics.js';

const DISMISS_KEY = 'star_basquet_install_dismissed';
const DISMISS_DAYS = 14;
const SHOW_DELAY_MS = 5000;

function isStandalone() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true; // iOS Safari
  } catch {
    return false;
  }
}

function isIos() {
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) && !window.MSStream;
}

function wasDismissedRecently() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const days = (Date.now() - Number(raw)) / (1000 * 60 * 60 * 24);
    return days < DISMISS_DAYS;
  } catch {
    return false;
  }
}

function markDismissed() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
}

// Banner de "agregar a inicio" — la PWA (vite-plugin-pwa) ya está armada e
// instalable hace rato, pero no había ningún aviso que lo mostrara: nadie
// sabía que existía. En Android/Chrome usa el prompt nativo (beforeinstallprompt).
// En iOS Safari ese evento no existe (Apple no lo soporta), así que se muestran
// instrucciones manuales en su lugar.
export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);
  const ios = isIos();

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return;

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // Espera unos segundos antes de mostrarlo para no interrumpir la
    // primera carga — en iOS no hay evento que avisar, así que se muestra
    // directamente pasado el delay (siempre que no esté ya instalada).
    const timer = setTimeout(() => {
      if (ios || deferredPrompt) setVisible(true);
    }, SHOW_DELAY_MS);

    // Chrome/Android puede tardar en disparar el evento; si llega después
    // del timer inicial, igual mostramos el banner en cuanto esté listo.
    const lateCheck = setTimeout(() => {
      setDeferredPrompt(curr => { if (curr) setVisible(true); return curr; });
    }, SHOW_DELAY_MS + 500);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      clearTimeout(timer);
      clearTimeout(lateCheck);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    setShowIosSteps(false);
    markDismissed();
  }, []);

  const handleInstall = useCallback(async () => {
    if (ios) {
      setShowIosSteps(true);
      trackEvent('install_banner_ios_steps');
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    trackEvent('install_banner_choice', { outcome });
    setDeferredPrompt(null);
    setVisible(false);
    markDismissed();
  }, [deferredPrompt, ios]);

  if (!visible) return null;

  return (
    <div className="install-banner">
      <div className="install-banner-inner">
        <img src={logoTorneo} alt="" className="install-banner-logo" />
        <div className="install-banner-text">
          <div className="install-banner-title">Instalá Torneo Star</div>
          <div className="install-banner-sub">
            {showIosSteps
              ? <>Tocá <strong>Compartir</strong> <span aria-hidden="true">⬆️</span> y elegí <strong>&quot;Agregar a inicio&quot;</strong></>
              : 'Accedé más rápido, sin buscarlo en el navegador'}
          </div>
        </div>
        {!showIosSteps && (
          <button className="install-banner-btn" onClick={handleInstall}>Instalar</button>
        )}
        <button className="install-banner-close" onClick={dismiss} aria-label="Cerrar">✕</button>
      </div>
    </div>
  );
}
