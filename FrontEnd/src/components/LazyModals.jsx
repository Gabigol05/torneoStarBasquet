import { lazy, Suspense, useEffect, useState } from 'react';

// ⚡ Rendimiento (revisión general): la ficha de jugador/a, el Game Center y
// la página de equipo venían dentro del archivo principal de la web, así que
// todo visitante los descargaba y procesaba ANTES de ver la portada, aunque
// nunca abriera ninguno. Ahora se piden aparte:
//   • en cuanto la página terminó de cargar y el celular está libre (así el
//     primer toque abre igual de rápido que antes), o
//   • en el momento en que alguien abre uno, si todavía no había llegado.
// Desde afuera se usan exactamente igual que antes (mismas props).
const cargarPerfil  = () => import('./PlayerProfileModal');
const cargarGame    = () => import('./GameCenterModal');
const cargarEquipo  = () => import('./TeamPageFem');

const PerfilLazy = lazy(() => cargarPerfil().then(m => ({ default: m.PlayerProfileModal })));
const GameLazy   = lazy(() => cargarGame().then(m => ({ default: m.GameCenterModal })));
const EquipoLazy = lazy(() => cargarEquipo().then(m => ({ default: m.TeamPageFem })));

// Precarga en segundo plano, una sola vez, cuando el navegador está libre.
let precargado = false;
function precargarCuandoLibre() {
  if (precargado || typeof window === 'undefined') return;
  precargado = true;
  const ir = () => { cargarPerfil().catch(() => {}); cargarGame().catch(() => {}); cargarEquipo().catch(() => {}); };
  const despues = () => (window.requestIdleCallback
    ? window.requestIdleCallback(ir, { timeout: 6000 })
    : setTimeout(ir, 2500));
  if (document.readyState === 'complete') despues();
  else window.addEventListener('load', despues, { once: true });
}

// Monta el modal recién la primera vez que se abre y lo deja montado después
// (así se conservan su caché interna y su animación de cierre).
function useAbiertoAlgunaVez(isOpen) {
  const [usado, setUsado] = useState(!!isOpen);
  useEffect(() => { precargarCuandoLibre(); }, []);
  useEffect(() => { if (isOpen) setUsado(true); }, [isOpen]);
  return usado || !!isOpen;
}

export function PlayerProfileModal(props) {
  const montar = useAbiertoAlgunaVez(props.isOpen);
  if (!montar) return null;
  return <Suspense fallback={null}><PerfilLazy {...props} /></Suspense>;
}

export function GameCenterModal(props) {
  const montar = useAbiertoAlgunaVez(props.isOpen);
  if (!montar) return null;
  return <Suspense fallback={null}><GameLazy {...props} /></Suspense>;
}

// La página de equipo se muestra en lugar de la vista del torneo: mientras
// llega (solo si se toca antes de la precarga) se ve el esqueleto de carga.
export function TeamPageFem(props) {
  useEffect(() => { precargarCuandoLibre(); }, []);
  return (
    <Suspense fallback={<div className="team-page-overlay"><div className="team-page-container" style={{ minHeight: '60vh' }} /></div>}>
      <EquipoLazy {...props} />
    </Suspense>
  );
}
