import { useEffect }       from "react";
import { Navbar }          from './Navbar.jsx';
import { Hero }            from './Hero.jsx';
import { SeasonKpis }      from './SeasonKpis.jsx';
import { TorneoView }      from './TorneoView.jsx';
import { LeadersSection }  from './LeadersSection.jsx';
import { PlayoffsBracket } from './PlayoffsBracket.jsx';
import { Footer }          from './Footer.jsx';
import { BottomNav }       from './BottomNav.jsx';
import { ToastContainer, useToast, useResultadosToast } from './ToastSystem.jsx';
import { PullToRefreshIndicator } from '../hooks/usePullToRefresh.jsx';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useFemeninoStats } from '../hooks/useFemeninoStats';
import { usePullToRefresh } from '../hooks/usePullToRefresh.jsx';

function duplicateTicker() {
  const t = document.getElementById("ticker");
  if (t && !t.dataset.duplicated) {
    t.innerHTML += t.innerHTML;
    t.dataset.duplicated = "1";
  }
}

export function PageHome() {
  useScrollReveal();

  const { equipos, refetch } = useFemeninoStats();
  const { toasts, addToast, removeToast } = useToast();
  const { isPulling, isRefreshing } = usePullToRefresh(refetch);

  // Detectar nuevos resultados y mostrar toast
  useResultadosToast(equipos, addToast);

  useEffect(() => { duplicateTicker(); }, []);

  return (
    <>
      {/* Toasts — encima de todo */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Pull to refresh indicator */}
      <PullToRefreshIndicator isPulling={isPulling} isRefreshing={isRefreshing} />

      <Navbar />
      <Hero />
      <SeasonKpis />
      <div className="full-rule"></div>
      <TorneoView />
      <div className="full-rule"></div>
      <LeadersSection />
      <div className="full-rule"></div>
      <PlayoffsBracket />
      <Footer />

      {/* Navbar bottom — solo visible en mobile via CSS */}
      <BottomNav />
    </>
  );
}
