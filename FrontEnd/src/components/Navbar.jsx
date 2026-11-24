import logo from '../assets/logo_torneo.jpg';
import { useState, useCallback, useEffect } from 'react';
import { GlobalSearch } from './GlobalSearch';
import { useStats } from '../context/StatsContext';
import { PlayerProfileModal } from './LazyModals';
import { useTournament } from '../context/TournamentContext';
import { useActiveSection } from '../hooks/useActiveSection';
import { useEquiposDeTemporada } from '../hooks/useEquiposDeTemporada';

// Mismos íconos que las pestañas de la vista del torneo.
const ICONOS = {
  inicio: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  tabla: <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></>,
  resultados: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></>,
  fixture: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  equipos: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
  jugadores: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></>,
};

function dispatchTabChange(tabKey) {
  window.dispatchEvent(new CustomEvent('star:tab', { detail: { tab: tabKey } }));
}

// Menú de escritorio (rediseño 24/11): Inicio · Tabla · Resultados | TSB |
// Fixture · Equipos · Jugadores. Las secciones del torneo bajan a la vista
// del torneo y abren su pestaña. TSB queda siempre al centro de la pantalla
// y debajo dice la categoría que se está mirando.
export function Navbar() {
  const { equipos = [], partidos = [], fechas = [], statsPorPartido = {} } = useStats();
  const { mode } = useTournament();
  const activeSection = useActiveSection();
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  // Pestaña abierta en la vista del torneo (la avisa TorneoView).
  const [tabActual, setTabActual] = useState('tabla');
  // ⚠️ FIX: el buscador global recibía `equipos` sin filtrar por temporada —
  // buscando mientras se mira una temporada archivada, podía devolver un
  // equipo que solo juega en la otra temporada (y su plantel actual, no el
  // de esa temporada vieja). Mismo criterio que ya usan la tabla de
  // posiciones y los KPIs (ver useEquiposDeTemporada).
  const { equiposDeTemporada } = useEquiposDeTemporada(equipos, mode);

  useEffect(() => {
    const onTab = e => { if (e.detail?.tab) setTabActual(e.detail.tab); };
    window.addEventListener('star:tab-actual', onTab);
    window.addEventListener('star:tab', onTab);
    return () => {
      window.removeEventListener('star:tab-actual', onTab);
      window.removeEventListener('star:tab', onTab);
    };
  }, []);

  const irATab = useCallback((tab) => (e) => {
    e.preventDefault();
    document.getElementById('torneo-view')?.scrollIntoView({ behavior: 'smooth' });
    setTabActual(tab);
    setTimeout(() => dispatchTabChange(tab), 400);
  }, []);

  const enTorneo = ['torneo-view', 'jugadores', 'equipos'].includes(activeSection);
  const activo = activeSection === 'inicio' ? 'inicio' : enTorneo ? tabActual : null;

  const izq = [
    { key: 'inicio',     label: 'Inicio',     href: '#inicio' },
    { key: 'tabla',      label: 'Tabla',      href: '#torneo-view' },
    { key: 'resultados', label: 'Resultados', href: '#torneo-view' },
  ];
  const der = [
    { key: 'fixture',   label: 'Fixture',   href: '#torneo-view' },
    { key: 'equipos',   label: 'Equipos',   href: '#torneo-view' },
    { key: 'jugadores', label: mode === 'femenino' ? 'Jugadoras' : 'Jugadores', href: '#torneo-view' },
  ];
  const boton = it => (
    <a key={it.key} href={it.href}
      className={`nv3-b${activo === it.key ? ' is-on' : ''}`}
      aria-current={activo === it.key ? 'page' : undefined}
      onClick={it.key === 'inicio' ? undefined : irATab(it.key)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ICONOS[it.key]}
      </svg>
      {it.label}
    </a>
  );

  return (
    <>
      <PlayerProfileModal
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        player={selectedPlayer}
        statsPorPartido={statsPorPartido}
        partidos={partidos}
        fechas={fechas}
        mode={mode}
      />

      <nav className={`navbar-sticky nv3 nv3--${mode}`} aria-label="Secciones">
        <a href="#inicio" className="nv3-logo" title="Inicio">
          <img src={logo} alt="Torneo Star Básquet" width="54" height="54" />
        </a>

        <div className="nv3-lado nv3-lado--izq"><div className="nv3-grupo">{izq.map(boton)}</div></div>

        <a href="#inicio" className="nv3-tsb" aria-label="Torneo Star Básquet">
          <b>TSB</b>
          <small>{mode === 'femenino' ? 'Femenino' : 'Masculino'}</small>
        </a>

        <div className="nv3-lado nv3-lado--der"><div className="nv3-grupo">{der.map(boton)}</div></div>

        <div className="nv3-acciones">
          <GlobalSearch
            compacto
            equipos={equiposDeTemporada}
            onSelectPlayer={setSelectedPlayer}
            onSelectTeam={() => {
              document.getElementById('torneo-view')?.scrollIntoView({ behavior: 'smooth' });
              setTimeout(() => dispatchTabChange('equipos'), 400);
            }}
          />

          <a href="https://www.youtube.com/@TorneoStarBasquet" target="_blank" rel="noopener noreferrer" className="nv3-ic nv3-ic--yt" title="Mirar en YouTube" aria-label="YouTube">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </a>
          <a href="https://www.instagram.com/torneostar.basquet/" target="_blank" rel="noopener noreferrer" className="nv3-ic nv3-ic--ig" title="Instagram @torneostar.basquet" aria-label="Instagram">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
            </svg>
          </a>
        </div>
      </nav>
    </>
  );
}
