import { useEffect }        from "react";
import { Navbar }           from './Navbar.jsx';
import { MobileHeader }     from './MobileHeader.jsx';
import { Hero }             from './Hero.jsx';
import { SeasonKpis }       from './SeasonKpis.jsx';
import { TorneoView }       from './TorneoView.jsx';
import { LeadersSection }   from './LeadersSection.jsx';
import { PlayoffsBracket }  from './PlayoffsBracket.jsx';
import { Footer }           from './Footer.jsx';
import { BottomNav }        from './BottomNav.jsx';
import { ToastContainer, useToast, useResultadosToast } from './ToastSystem.jsx';
import { PullToRefreshIndicator } from '../hooks/usePullToRefresh.jsx';
import { useScrollReveal }  from '../hooks/useScrollReveal';
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

  useResultadosToast(equipos, addToast);
  useEffect(() => { duplicateTicker(); }, []);

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <PullToRefreshIndicator isPulling={isPulling} isRefreshing={isRefreshing} />

      {/* Desktop: navbar top completo */}
      <div className="desktop-only">
        <Navbar />
      </div>

      {/* Mobile: header compacto */}
      <div className="mobile-only">
        <MobileHeader />
      </div>

      <Hero />
      <SeasonKpis />
      <div className="full-rule"></div>
      <TorneoView />
      <div className="full-rule"></div>
      <LeadersSection />
      <div className="full-rule"></div>
      <PlayoffsBracket />
      <Footer />

      {/* Bottom nav solo en mobile */}
      <BottomNav />
    </>
  );
}
