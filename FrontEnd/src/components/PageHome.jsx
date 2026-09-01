import { useCallback, useEffect, useMemo, useState } from "react";
import { Navbar }           from './Navbar.jsx';
import { MobileHeader }     from './MobileHeader.jsx';
import { TemporadaChip }    from './TemporadaChip.jsx';
import { WaveBackground }   from './WaveBackground.jsx';
import { Hero }             from './Hero.jsx';
import { TorneoView }       from './TorneoView.jsx';
import { LeadersSection }   from './LeadersSection.jsx';
import { EncuestasSection } from './EncuestasSection.jsx';
import { PlayoffsBracket }  from './PlayoffsBracket.jsx';
import { PlayerProfileModal } from './PlayerProfileModal.jsx';
import { GameCenterModal }  from './GameCenterModal.jsx';
import { Footer }           from './Footer.jsx';
import { BottomNav }        from './BottomNav.jsx';
import { InstallBanner }    from './InstallBanner.jsx';
import { ToastContainer, useToast, useResultadosToast } from './ToastSystem.jsx';
import { PullToRefreshIndicator } from '../hooks/usePullToRefresh.jsx';
import { useScrollReveal }  from '../hooks/useScrollReveal';
import { useFemeninoStats }  from '../hooks/useFemeninoStats';
import { useMasculinoStats } from '../hooks/useMasculinoStats';
import { useTournament }     from '../context/TournamentContext';
import { useTemporada }      from '../context/TemporadaContext';
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
    reb_total: j.reb_total ?? 0,
    ast_total: j.ast_total ?? 0,
    rob_total: j.rob_total ?? 0,
    tap_total: j.tap_total ?? 0,
    val_total: j.val_total ?? 0,
    per_total: j.per_total ?? 0,
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
  const [deepLinkPartido, setDeepLinkPartido] = useState(null);
  const { mode, setMode } = useTournament();
  // Qué temporada está mirando el visitante EN CADA categoría (arranca en
  // la activa de esa categoría — ver TemporadaContext — y el chip de arriba
  // de todo la deja cambiar a una vieja). Femenino y masculino tienen
  // temporada independiente, así que esto es un objeto {femenino,masculino}
  // — cada hook de stats usa solo la de su propia categoría. Antes esto no
  // se pasaba a los hooks de stats, así que el sitio público traía TODAS
  // las temporadas mezcladas sin importar el chip.
  const { temporadaSeleccionadaId } = useTemporada();
  // Antes los dos hooks pedían datos y abrían su canal de Realtime siempre,
  // aunque solo se ve un modo a la vez — cada visitante hacía el doble de
  // queries/websockets de lo necesario. Ahora solo el hook del modo activo
  // hace fetch/subscribe; el otro se activa recién si el usuario cambia de modo.
  const statsFem  = useFemeninoStats(mode !== 'masculino', temporadaSeleccionadaId.femenino);
  const statsMasc = useMasculinoStats(mode === 'masculino', temporadaSeleccionadaId.masculino);
  const {
    equipos, partidos, fechas, statsPorPartido,
    isLoading, error, refetch,
  } = mode === 'masculino' ? statsMasc : statsFem;
  const { toasts, addToast, removeToast } = useToast();
  // `equipos` ya refleja el modo activo (línea de arriba), antes esto se
  // limitaba a femenino y el masculino nunca mostraba el aviso de "nuevo resultado".
  // Se le pasa además QUÉ temporada se está mirando (mode + su id
  // seleccionado) — así, si el visitante cambia de temporada con el chip,
  // el hook lo toma como una foto nueva en vez de comparar contra la
  // temporada anterior y disparar un toast de "nuevo resultado" por cada
  // partido viejo que aparece de golpe (bug reportado por Alvaro).
  useResultadosToast(equipos, addToast, isLoading, `${mode}:${temporadaSeleccionadaId[mode]}`);

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

  // Detecta ?partido=<id>&modo=<masculino|femenino> en la URL (link de un
  // partido compartido) y abre el GameCenterModal correspondiente. A
  // diferencia del deep link de jugadora, GameCenterModal trae sus propios
  // datos por partidoId — no depende de que "equipos" ya haya cargado.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const partidoParam = params.get('partido');
    if (!partidoParam) return;

    const modoParam = params.get('modo');
    if ((modoParam === 'masculino' || modoParam === 'femenino') && modoParam !== mode) {
      setMode(modoParam);
    }
    setDeepLinkPartido(partidoParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeDeepLinkPartido = () => {
    setDeepLinkPartido(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('partido');
    url.searchParams.delete('modo');
    window.history.replaceState({}, '', url.pathname + url.search);
  };

  // Este contexto lo consumen TorneoView, PlayoffsBracket, LeadersSection y
  // varios más — sin memoizar, cada render de PageHome (hay varios: toasts,
  // pull-to-refresh, deep links) arma un objeto nuevo y hace que todos esos
  // componentes se vuelvan a renderizar aunque los datos no hayan cambiado.
  const statsContextValue = useMemo(
    () => ({ equipos, partidos, fechas, statsPorPartido, isLoading }),
    [equipos, partidos, fechas, statsPorPartido, isLoading]
  );

  return (
    <FavoritoProvider>
    <StatsContext.Provider value={statsContextValue}>
      <WaveBackground />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <PullToRefreshIndicator isPulling={isPulling} isRefreshing={isRefreshing} />
      <InstallBanner />
      <PlayerProfileModal
        isOpen={!!deepLinkPlayer}
        onClose={closeDeepLinkPlayer}
        player={deepLinkPlayer}
        statsPorPartido={statsPorPartido}
        partidos={partidos}
        fechas={fechas}
        addToast={addToast}
      />
      <GameCenterModal
        isOpen={!!deepLinkPartido}
        onClose={closeDeepLinkPartido}
        partidoId={deepLinkPartido}
        mode={mode}
      />
      {/* Desktop */}
      <div className="desktop-only">
        <Navbar />
      </div>
      {/* Mobile */}
      <div className="mobile-only">
        <MobileHeader onRefresh={handlePullRefresh} />
      </div>
      {/* Se auto-oculta sola mientras exista una sola temporada cargada —
          no hace falta envolverla en una condición acá. */}
      <TemporadaChip />
      <Hero equipos={equipos} partidos={partidos} fechas={fechas} />
      <div className="full-rule"></div>
      <TorneoView />
      <div className="full-rule"></div>
      <LeadersSection equipos={equipos} isLoading={isLoading} />
      <div className="full-rule"></div>
      <EncuestasSection addToast={addToast} />
      <div className="full-rule"></div>
      <PlayoffsBracket />
      <Footer />
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </StatsContext.Provider>
    </FavoritoProvider>
  );
}