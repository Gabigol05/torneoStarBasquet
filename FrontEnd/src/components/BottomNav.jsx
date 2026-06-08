import { useTournament } from '../context/TournamentContext';
import { useActiveSection } from '../hooks/useActiveSection';

function dispatchTabChange(tabKey) {
  window.dispatchEvent(new CustomEvent('star:tab', { detail: { tab: tabKey } }));
}

export function BottomNav() {
  const { mode } = useTournament();
  const activeSection = useActiveSection();

  const scrollAndTab = (sectionId, tabKey) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    if (tabKey) setTimeout(() => dispatchTabChange(tabKey), 400);
  };

  const items = [
    {
      label: 'Inicio',
      icon: '🏠',
      active: activeSection === 'inicio',
      onClick: () => document.getElementById('inicio')?.scrollIntoView({ behavior: 'smooth' }),
    },
    {
      label: 'Tabla',
      icon: '📊',
      active: activeSection === 'torneo-view',
      onClick: () => scrollAndTab('torneo-view', 'tabla'),
    },
    {
      label: 'Equipos',
      icon: '🏀',
      active: false,
      dot: mode,
      onClick: () => scrollAndTab('torneo-view', 'equipos'),
    },
    {
      label: 'Jugadoras',
      icon: '👤',
      active: false,
      onClick: () => scrollAndTab('torneo-view', 'jugadores'),
    },
    {
      label: 'Líderes',
      icon: '🏆',
      active: activeSection === 'jugadores',
      onClick: () => document.getElementById('jugadores')?.scrollIntoView({ behavior: 'smooth' }),
    },
  ];

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Navegación principal">
      {items.map((item, i) => (
        <button
          key={i}
          className={`bottom-nav-item ${item.active ? 'active' : ''}`}
          onClick={item.onClick}
          aria-label={item.label}
        >
          <div className="bottom-nav-item-wrap">
            <span className="bottom-nav-icon">{item.icon}</span>
            {item.dot && (
              <span
                className="bottom-nav-dot"
                style={{ background: item.dot === 'femenino' ? 'var(--fem2)' : 'var(--masc2)' }}
              />
            )}
          </div>
          <span className="bottom-nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
