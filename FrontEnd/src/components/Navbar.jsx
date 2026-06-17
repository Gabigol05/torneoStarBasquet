import logo from '../assets/logo_torneo.jpg';
import { useState, useCallback } from 'react';
import { TournamentSelector } from './TournamentSelector';
import { GlobalSearch } from './GlobalSearch';
import { useStats } from '../context/StatsContext';
import { PlayerProfileModal } from './PlayerProfileModal';
import { useTournament } from '../context/TournamentContext';
import { useActiveSection } from '../hooks/useActiveSection';

// Evento custom para que TorneoView escuche y cambie el tab activo
function dispatchTabChange(tabKey) {
  window.dispatchEvent(new CustomEvent('star:tab', { detail: { tab: tabKey } }));
}

export function Navbar() {
  const { equipos } = useStats();
  const { mode } = useTournament();
  const activeSection = useActiveSection();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const closeMobile = () => setIsMobileOpen(false);

  const handleEquiposClick = useCallback((e) => {
    e.preventDefault();
    closeMobile();
    // Scroll a torneo-view
    document.getElementById('torneo-view')?.scrollIntoView({ behavior: 'smooth' });
    // Disparar cambio de tab a "equipos" con pequeño delay para que sea visible
    setTimeout(() => dispatchTabChange('equipos'), 400);
  }, []);

  const handleJugadoresClick = useCallback((e) => {
    e.preventDefault();
    closeMobile();
    document.getElementById('torneo-view')?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => dispatchTabChange('jugadores'), 400);
  }, []);

  // Mapeo de sección activa → link del navbar
  const isActive = (href) => {
    if (href === '#inicio')    return activeSection === 'inicio';
    if (href === '#jugadores') return activeSection === 'jugadores' || activeSection === 'torneo-view';
    if (href === '#equipos')   return activeSection === 'equipos';
    if (href === '#bracket')   return activeSection === 'bracket';
    return false;
  };

  return (
    <>
      <PlayerProfileModal
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        player={selectedPlayer}
      />

      <nav className="navbar-sticky">
        <a href="#inicio" className="nav-brand" onClick={closeMobile}>
          <img src={logo} alt="logo" className="logo-img" width="60" style={{ borderRadius: '50%' }} />
        </a>

        <ul className={`nav-links ${isMobileOpen ? 'mobile-open' : ''}`}>
          <li>
            <a href="#inicio" className={isActive('#inicio') ? 'active' : ''} onClick={closeMobile}>
              Inicio
            </a>
          </li>
          <li className="nav-item-selector">
            <TournamentSelector />
          </li>
          <li>
            <a
              href="#jugadores"
              className={isActive('#jugadores') ? 'active' : ''}
              onClick={handleJugadoresClick}
            >
              Jugadores
            </a>
          </li>
          <li>
            <a
              href="#equipos"
              className={`nav-equipos-link ${isActive('#equipos') ? 'active' : ''} nav-mode-${mode}`}
              onClick={handleEquiposClick}
              title={`Ver equipos ${mode === 'femenino' ? 'femeninos' : 'masculinos'}`}
            >
              Equipos
              <span className={`nav-mode-dot nav-mode-dot-${mode}`} />
            </a>
          </li>
          <li>
            <a href="#bracket" className={isActive('#bracket') ? 'active' : ''} onClick={closeMobile}>
              Playoffs
            </a>
          </li>
        </ul>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <GlobalSearch
            equipos={equipos}
            onSelectPlayer={setSelectedPlayer}
            onSelectTeam={() => {
              document.getElementById('torneo-view')?.scrollIntoView({ behavior: 'smooth' });
              setTimeout(() => dispatchTabChange('equipos'), 400);
            }}
          />

          <a href="https://www.youtube.com/@TorneoStarBasquet" target="_blank" className="live-badge" title="Mirar en YouTube">
            {/* Ícono YouTube */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}>
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <span className="live-text">YouTube</span>
          </a>

          <a href="https://www.instagram.com/torneostar.basquet/" target="_blank" className="nav-ig" title="Instagram @torneostar.basquet">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style={{flexShrink:0}}>
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            <span>Instagram</span>
          </a>

          <button className="hamburger-btn" onClick={() => setIsMobileOpen(!isMobileOpen)}>☰</button>
        </div>
      </nav>
    </>
  );
}
