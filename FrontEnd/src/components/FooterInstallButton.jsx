import { useState, useCallback } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt.js';
import { IosInstallSteps } from './IosInstallSteps.jsx';
import { trackEvent } from '../lib/analytics.js';

// Respaldo permanente del InstallBanner: ese aviso aparece una sola vez y se
// puede cerrar, así que quien lo descarta (o entra desde un navegador que no
// dispara el aviso, como el de Instagram) se queda sin forma de encontrar la
// instalación después. Este botón vive siempre en el footer.
export function FooterInstallButton() {
  const { ios, standalone, canPromptNative, promptInstall } = useInstallPrompt();
  const [showSteps, setShowSteps] = useState(false);

  const handleClick = useCallback(async () => {
    if (ios) {
      setShowSteps(v => !v);
      if (!showSteps) trackEvent('install_footer_ios_steps');
      return;
    }
    if (canPromptNative) {
      await promptInstall('footer');
      return;
    }
    // Ni iOS ni evento nativo disponible (navegador sin soporte, o Chrome
    // que todavía no disparó beforeinstallprompt) — mismo toggle pero con
    // instrucciones genéricas en vez de trabarse sin hacer nada.
    setShowSteps(v => !v);
  }, [ios, canPromptNative, promptInstall, showSteps]);

  if (standalone) return null;

  return (
    <div>
      <button className="footer-install-btn" onClick={handleClick}>
        <span className="footer-install-btn-icon">
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M12 3v13m0 0-4-4m4 4 4-4M5 21h14"/>
          </svg>
        </span>
        Instalá la app
      </button>
      {showSteps && (
        <div className="footer-install-steps">
          {ios
            ? <IosInstallSteps />
            : <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 12, color: 'var(--gray)', lineHeight: 1.4 }}>
                Buscá "Instalar app" o "Agregar a pantalla de inicio" en el menú de tu navegador.
              </div>
          }
        </div>
      )}
    </div>
  );
}
