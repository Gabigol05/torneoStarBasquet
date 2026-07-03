import { useEffect, useState } from "react";
import { Navbar }           from './Navbar.jsx';
import { MobileHeader }     from './MobileHeader.jsx';
import { Hero }             from './Hero.jsx';

import { TorneoView }       from './TorneoView.jsx';
import { LeadersSection }   from './LeadersSection.jsx';
import { PlayoffsBracket }  from './PlayoffsBracket.jsx';
import { Footer }           from './Footer.jsx';
import { BottomNav }        from './BottomNav.jsx';
import { ToastContainer, useToast, useResultadosToast } from './ToastSystem.jsx';
import { PullToRefreshIndicator } from '../hooks/usePullToRefresh.jsx';
import { useScrollReveal }  from '../hooks/useScrollReveal';
import { useFemeninoStats } from '../hooks/useFemeninoStats';
import { StatsContext }     from '../context/StatsContext';
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
  const [activeTab, setActiveTab] = useState('inicio');

  const {
    equipos, partidos, fechas, statsPorPartido,
    isLoading, error, refetch,
  } = useFemeninoStats();

  const { toasts, addToast, removeToast } = useToast();
  const { isPulling, isRefreshing } = usePullToRefresh(refetch);

  useResultadosToast(equipos, addToast);

  useEffect(() => {
    const handler = e => { if (e.detail?.tab) setActiveTab(e.detail.tab); };
    window.addEventListener('star:tab', handler);
    return () => window.removeEventListener('star:tab', handler);
  }, []);

  useEffect(() => { duplicateTicker(); }, []);

  return (
    <StatsContext.Provider value={{ equipos, partidos, fechas, statsPorPartido, isLoading }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <PullToRefreshIndicator isPulling={isPulling} isRefreshing={isRefreshing} />

      {/* Desktop */}
      <div className="desktop-only">
        <Navbar />
      </div>

      {/* Mobile */}
      <div className="mobile-only">
        <MobileHeader />
      </div>

      <Hero />

      <div className="full-rule"></div>
      <TorneoView />
      <div className="full-rule"></div>
      <LeadersSection equipos={equipos} isLoading={isLoading} />
      <div className="full-rule"></div>
      <PlayoffsBracket />
      <Footer />

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </StatsContext.Provider>
  );
}


