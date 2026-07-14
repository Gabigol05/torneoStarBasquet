import { useCallback, useEffect, useState } from "react";
import { Navbar }           from './Navbar.jsx';
import { MobileHeader }     from './MobileHeader.jsx';
import { Hero }             from './Hero.jsx';
import { TorneoView }       from './TorneoView.jsx';
import { LeadersSection }   from './LeadersSection.jsx';
import { PlayoffsBracket }  from './PlayoffsBracket.jsx';
import { PlayerProfileModal } from './PlayerProfileModal.jsx';
import { Footer }           from './Footer.jsx';
import { BottomNav }        from './BottomNav.jsx';
import { ToastContainer, useToast, useResultadosToast } from './ToastSystem.jsx';
import { PullToRefreshIndicator } from '../hooks/usePullToRefresh.jsx';
import { useScrollReveal }  from '../hooks/useScrollReveal';
import { useFemeninoStats } from '../hooks/useFemeninoStats';
import { StatsContext }     from '../context/StatsContext';
import { FavoritoProvider } from '../hooks/useFavorito.jsx';
import { usePullToRefresh } from '../hooks/usePullToRefresh.jsx';

function duplicateTicker() {
  const t = document.getElementById("ticker");
  if (t && !t.dataset.duplicated) {
    t.innerHTML += t.innerHTML;
    t.dataset.duplicated = "1";
  }
}

// Arma el objeto de jugadora con el mismo formato que usan TorneoView/TeamPageFem
// al abrir el perfil, para que el link compartido abra el mismo modal completo.
function buildPlayerFromRoster(j, eq) {
  return {
    id: j.id, name: j.nombre, team: eq.name, equipoId: eq.id,
    color: eq.color, fechaNac: j.fechaNac,
    pj: j.pj ?? 0,
    pts_prom: j.pts_prom ?? j.pts ?? 0,
    reb_prom: j.reb_prom ?? j.reb ?? 0,
    ast_prom: j.ast_prom ?? j.ast ?? 0,
    rob_prom: j.rob_prom ?? j.rob ?? 0,
    tap_prom: j.tap_prom ?? j.tap ?? 0,
    per_prom: j.per_prom ?? 0,
    val_prom: j.val_prom ?? 0,
    pct_simples: j.pct_simples ?? j.tlp ?? 0,
    pct_dobles:  j.pct_dobles  ?? j.fgp ?? 0,
    pct_triples: j.pct_triples ?? j.tpp ?? 0,
    mejor_pts: j.mejor_pts ?? 0,
    pts_total: j.pts_total ?? 0,
    sc_total: j.sc_total ?? 0, sf_total: j.sf_total ?? 0,
    dc_total: j.dc_total ?? 0, df_total: j.df_total ?? 0,
    tc_total: j.tc_total ?? 0, tf_total: j.tf_total ?? 0,
    sc_prom:  j.sc_prom  ?? 0, dc_prom: j.dc_prom ?? 0,
    tc_prom:  j.tc_prom  ?? 0,
  };
}

export function PageHome() {
  useScrollReveal();
  const [activeTab, setActiveTab] = useState('inicio');
  const [deepLinkPlayer, setDeepLinkPlayer] = useState(null);
  const {
    equipos, partidos, fechas, statsPorPartido,
    isLoading, error, refetch,
  } = useFemeninoStats();
  const { toasts, addToast, removeToast } = useToast();
  useResultadosToast(equipos, addToast);

  // Chequea si hay una version nueva publicada (comparando el bundle actual
  // contra el que esta realmente sirviendo el servidor ahora mismo). Si
  // encuentra una version distinta, recarga y devuelve true. Se usa tanto al
  // entrar a la app como al deslizar para refrescar (clave para cuando la
  // app se abre desde el icono de "agregar a inicio", sin boton nativo).
  const checkForUpdate = useCallback(async () => {
    try {
      const res = await fetch('/', { cache: 'no-store' });
      const html = await res.text();
      const match = html.match(/<script[^>]+src="([^"]+\.js)"/);
      const latest = match?.[1];
      if (!latest) return false;

      const stored = localStorage.getItem('star_basquet_build');
      if (stored && stored !== latest) {
        localStorage.setItem('star_basquet_build', latest);
        window.location.reload();
        return true;
      } else if (!stored) {
        localStorage.setItem('star_basquet_build', latest);
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const handlePullRefresh = useCallback(async () => {
    const reloaded = await checkForUpdate();
    if (!reloaded) await refetch?.();
  }, [checkForUpdate, refetch]);

  const { isPulling, isRefreshing } = usePullToRefresh(handlePullRefresh);

  useEffect(() => {
    const handler = e => { if (e.detail?.tab) setActiveTab(e.detail.tab); };
    window.addEventListener('star:tab', handler);
    return () => window.removeEventListener('star:tab', handler);
  }, []);

  useEffect(() => { duplicateTicker(); }, []);

  useEffect(() => { checkForUpdate(); }, [checkForUpdate]);

  // Detecta ?jugadora=<id> en la URL (viene de un link compartido) y abre
  // el perfil correspondiente automaticamente al cargar la pagina.
  useEffect(() => {
    if (!equipos || equipos.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const jugId = params.get('jugadora');
    if (!jugId) return;

    for (const eq of equipos) {
      const j = eq.jugadoras?.find(x => x.id === jugId);
      if (j) {
        setDeepLinkPlayer(buildPlayerFromRoster(j, eq));
        break;
      }
    }
  }, [equipos]);

  const closeDeepLinkPlayer = () => {
    setDeepLinkPlayer(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('jugadora');
    window.history.replaceState({}, '', url.pathname + url.search);
  };

  return (
    <FavoritoProvider>
    <StatsContext.Provider value={{ equipos, partidos, fechas, statsPorPartido, isLoading }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <PullToRefreshIndicator isPulling={isPulling} isRefreshing={isRefreshing} />
      <PlayerProfileModal
        isOpen={!!deepLinkPlayer}
        onClose={closeDeepLinkPlayer}
        player={deepLinkPlayer}
        statsPorPartido={statsPorPartido}
        partidos={partidos}
        fechas={fechas}
      />
      {/* Desktop */}
      <div className="desktop-only">
        <Navbar />
      </div>
      {/* Mobile */}
      <div className="mobile-only">
        <MobileHeader />
      </div>
      <Hero equipos={equipos} partidos={partidos} fechas={fechas} />
      <div className="full-rule"></div>
      <TorneoView />
      <div className="full-rule"></div>
      <LeadersSection equipos={equipos} isLoading={isLoading} />
      <div className="full-rule"></div>
      <PlayoffsBracket />
      <Footer />
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </StatsContext.Provider>
    </FavoritoProvider>
  );
}
