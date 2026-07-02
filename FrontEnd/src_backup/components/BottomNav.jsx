import { useTournament } from '../context/TournamentContext';

function dispatchTab(tabKey) {
  window.dispatchEvent(new CustomEvent('star:tab', { detail: { tab: tabKey } }));
}

const Icons = {
  inicio: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  tabla: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="3" y1="9"  x2="21" y2="9"/>
      <line x1="3" y1="15" x2="21" y2="15"/>
      <line x1="9" y1="9"  x2="9"  y2="21"/>
    </svg>
  ),
  equipos: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M4.93 4.93c4.08 4.08 10.06 4.08 14.14 0"/>
      <path d="M4.93 19.07c4.08-4.08 10.06-4.08 14.14 0"/>
      <line x1="12" y1="2"  x2="12" y2="22"/>
      <line x1="2"  y1="12" x2="22" y2="12"/>
    </svg>
  ),
  jugadores: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  fixture: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8"  y1="2" x2="8"  y2="6"/>
      <line x1="3"  y1="10" x2="21" y2="10"/>
    </svg>
  ),
};

export function BottomNav({ activeTab, onTabChange }) {
  const { mode } = useTournament();
  const modeColor = mode === 'femenino' ? 'var(--fem2)' : '#3b82f6';

  const items = [
    {
      key: 'inicio',
      label: 'Inicio',
      icon: Icons.inicio,
      onClick: () => {
        document.getElementById('inicio')?.scrollIntoView({ behavior: 'smooth' });
        onTabChange?.('inicio');
      },
    },
    {
      key: 'tabla',
      label: 'Tabla',
      icon: Icons.tabla,
      onClick: () => {
        document.getElementById('torneo-view')?.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => { dispatchTab('tabla'); onTabChange?.('tabla'); }, 300);
      },
    },
    {
      key: 'equipos',
      label: 'Equipos',
      icon: Icons.equipos,
      dot: true,
      onClick: () => {
        document.getElementById('torneo-view')?.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => { dispatchTab('equipos'); onTabChange?.('equipos'); }, 300);
      },
    },
    {
      key: 'jugadores',
      label: mode === 'femenino' ? 'Jugadoras' : 'Jugadores',
      icon: Icons.jugadores,
      onClick: () => {
        document.getElementById('torneo-view')?.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => { dispatchTab('jugadores'); onTabChange?.('jugadores'); }, 300);
      },
    },
    {
      key: 'fixture',
      label: 'Fixture',
      icon: Icons.fixture,
      onClick: () => {
        document.getElementById('torneo-view')?.scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => { dispatchTab('fixture'); onTabChange?.('fixture'); }, 300);
      },
    },
  ];

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Navegación principal">
      {items.map((item) => {
        const isActive = activeTab === item.key;
        return (
          <button
            key={item.key}
            className={`bottom-nav-item${isActive ? ' active' : ''}`}
            onClick={item.onClick}
            aria-label={item.label}
            style={isActive ? { '--bnav-color': modeColor } : {}}
          >
            <div className="bottom-nav-icon-wrap">
              {item.icon}
              {item.dot && (
                <span className="bottom-nav-dot" style={{ background: modeColor }} />
              )}
            </div>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
