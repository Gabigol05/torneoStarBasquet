import { useState, useEffect, useCallback } from 'react';
import logoTorneo from '../assets/logo_torneo.jpg';
import { trackEvent } from '../lib/analytics.js';
import { useInstallPrompt } from '../hooks/useInstallPrompt.js';
import { IosInstallSteps } from './IosInstallSteps.jsx';

const DISMISS_KEY = 'star_basquet_install_dismissed';
const DISMISS_DAYS = 14;
const SHOW_DELAY_MS = 5000;

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

// Aviso de "agregar a inicio" — la PWA (vite-plugin-pwa) ya está armada e
// instalable hace rato, pero no había ningún aviso que lo mostrara: nadie
// sabía que existía. Aparece una sola vez (con cooldown de 14 días si lo
// cierran); el botón fijo del footer queda como respaldo permanente para
// quien lo cerró o entra en un navegador donde este aviso no se muestra.
export function InstallBanner() {
  const { ios, standalone, canPromptNative, promptInstall } = useInstallPrompt();
  const [visible, setVisible] = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);

  useEffect(() => {
    if (standalone || wasDismissedRecently()) return;
    // Espera unos segundos antes de mostrarlo para no interrumpir la
    // primera carga. Si a los 5s todavía no hay ni evento nativo ni es iOS
    // (el "canPromptNative" del render de abajo lo filtra), no pasa nada:
    // en cuanto beforeinstallprompt llegue más tarde, el componente se
    // vuelve a renderizar y aparece solo.
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [standalone]);

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
    const outcome = await promptInstall('banner');
    if (outcome) { setVisible(false); markDismissed(); }
  }, [ios, promptInstall]);

  // Si a esta altura no hay ni evento nativo ni es iOS, no hay nada que
  // ofrecer (navegador sin soporte, o ya viene de una instalación previa).
  if (!visible || (!ios && !canPromptNative)) return null;

  return (
    <div className="install-banner">
      <div className="install-banner-inner">
        <img src={logoTorneo} alt="" className="install-banner-logo" />
        <div className="install-banner-text">
          <div className="install-banner-title">Instalá Torneo Star</div>
          {showIosSteps
            ? <IosInstallSteps className="install-banner-ios-steps" />
            : <div className="install-banner-sub">Accedé más rápido, sin buscarlo en el navegador</div>}
        </div>
        {!showIosSteps && (
          <button className="install-banner-btn" onClick={handleInstall}>Instalar</button>
        )}
        <button className="install-banner-close" onClick={dismiss} aria-label="Cerrar">✕</button>
      </div>
    </div>
  );
}
