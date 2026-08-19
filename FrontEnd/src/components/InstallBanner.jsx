import { useState, useEffect, useCallback } from 'react';
import logoTorneo from '../assets/logo_torneo.jpg';
import { trackEvent } from '../lib/analytics.js';
import { useInstallPrompt } from '../hooks/useInstallPrompt.js';
import { IosInstallSteps } from './IosInstallSteps.jsx';

const SHOW_DELAY_MS = 5000;

// Aviso de "agregar a inicio" — la PWA (vite-plugin-pwa) ya está armada e
// instalable hace rato, pero no había ningún aviso que lo mostrara: nadie
// sabía que existía. Antes, cerrarlo con la cruz lo apagaba 14 días (vía
// localStorage); ahora cerrarlo solo lo oculta en esa visita — vuelve a
// aparecer la próxima vez que entren, y así hasta que "standalone" detecte
// que ya lo instalaron. El botón fijo del footer sigue como acceso rápido
// para quien lo cierra pero quiere instalarlo al toque después.
export function InstallBanner() {
  const { ios, standalone, canPromptNative, promptInstall } = useInstallPrompt();
  const [visible, setVisible] = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);

  useEffect(() => {
    if (standalone) return;
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
  }, []);

  const handleInstall = useCallback(async () => {
    if (ios) {
      setShowIosSteps(true);
      trackEvent('install_banner_ios_steps');
      return;
    }
    const outcome = await promptInstall('banner');
    if (outcome === 'accepted') setVisible(false);
    // Si eligió "cancelar" en el prompt nativo, se deja visible — puede
    // haber sido sin querer, y de última vuelve a aparecer solo en la
    // próxima visita de todos modos.
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
