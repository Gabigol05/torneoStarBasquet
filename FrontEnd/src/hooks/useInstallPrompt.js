import { useState, useEffect, useCallback } from 'react';
import { trackEvent } from '../lib/analytics.js';

export function isStandalone() {
  try {
    return window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true; // iOS Safari
  } catch {
    return false;
  }
}

export function isIos() {
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) && !window.MSStream;
}

// Hook compartido entre InstallBanner (aviso flotante, una sola vez) y el
// botón fijo del footer (siempre disponible como respaldo) — evita duplicar
// la detección de iOS/standalone y el manejo del evento beforeinstallprompt.
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [standalone] = useState(isStandalone);
  const [ios] = useState(isIos);

  useEffect(() => {
    if (standalone) return;
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, [standalone]);

  // Dispara el instalador nativo de Android/Chrome. En iOS no existe
  // equivalente — Apple no permite que ningún sitio dispare la instalación
  // por código, así que ahí el llamador debe mostrar los pasos manuales.
  const promptInstall = useCallback(async (source) => {
    if (!deferredPrompt) return null;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    trackEvent('install_prompt_choice', { outcome, source });
    setDeferredPrompt(null);
    return outcome;
  }, [deferredPrompt]);

  return { ios, standalone, canPromptNative: !!deferredPrompt, promptInstall };
}
