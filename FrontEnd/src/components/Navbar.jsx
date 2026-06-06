import logo from '../assets/starBasquet.jpg';
import { useState } from 'react';
import { TournamentSelector } from './TournamentSelector';
import { GlobalSearch } from './GlobalSearch';
import { PlayerProfileModal } from './PlayerProfileModal';

export function Navbar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Cuando se selecciona un equipo desde el buscador, scroll a la sección
  const handleSelectTeam = (team) => {
    document.getElementById('torneo-view')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <PlayerProfileModal
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        player={selectedPlayer}
      />

      <nav>
        <a href="#" className="nav-brand">
          <img src={logo} alt="logo" className="logo-img" width="60" style={{ borderRadius: '50%' }} />
        </a>

        <ul className={`nav-links ${isMobileOpen ? 'mobile-open' : ''}`}>
          <li><a href="#inicio" className="active" onClick={() => setIsMobileOpen(false)}>Inicio</a></li>
          <li className="nav-item-selector"><TournamentSelector /></li>
          <li><a href="#jugadores" onClick={() => setIsMobileOpen(false)}>Jugadores</a></li>
          <li><a href="#equipos" onClick={() => setIsMobileOpen(false)}>Equipos</a></li>
          <li><a href="#bracket" onClick={() => setIsMobileOpen(false)}>Playoffs</a></li>
        </ul>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* BUSCADOR GLOBAL */}
          <GlobalSearch
            onSelectPlayer={setSelectedPlayer}
            onSelectTeam={handleSelectTeam}
          />

          <a href="https://www.youtube.com/@TorneoStarBasquet" target="_blank" className="live-badge" title="Mirar partido en vivo">
            <span className="live-dot"></span>
            <span className="live-text">Youtube</span>
          </a>

          <a href="https://www.instagram.com/torneostar.basquet/" target="_blank" className="nav-ig">
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            @torneostar.basquet
          </a>

          <button className="hamburger-btn" onClick={() => setIsMobileOpen(!isMobileOpen)}>☰</button>
        </div>
      </nav>
    </>
  );
}
