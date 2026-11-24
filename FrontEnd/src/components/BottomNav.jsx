import { useTournament } from '../context/TournamentContext';
import { useBarraOcultaAlBajar } from '../hooks/useBarraOcultaAlBajar';

function dispatchTab(tabKey) {
  window.dispatchEvent(new CustomEvent('star:tab', { detail: { tab: tabKey } }));
}

// Rapidez: antes se esperaban 300 ms antes de cambiar de pestaña. Ahora la
// pestaña cambia al instante y el desplazamiento arranca apenas se dibujó.
function irAlTorneo() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.getElementById('torneo-view')?.scrollIntoView({ behavior: 'smooth' });
  }));
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
  resultados: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/>
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
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
  const oculta = useBarraOcultaAlBajar();

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
        dispatchTab('tabla'); onTabChange?.('tabla');
        irAlTorneo();
      },
    },
    {
      key: 'resultados',
      label: 'Resultados',
      icon: Icons.resultados,
      onClick: () => {
        dispatchTab('resultados'); onTabChange?.('resultados');
        irAlTorneo();
      },
    },
    {
      key: 'fixture',
      label: 'Fixture',
      icon: Icons.fixture,
      onClick: () => {
        dispatchTab('fixture'); onTabChange?.('fixture');
        irAlTorneo();
      },
    },
    {
      key: 'equipos',
      label: 'Equipos',
      icon: Icons.equipos,
      dot: true,
      onClick: () => {
        dispatchTab('equipos'); onTabChange?.('equipos');
        irAlTorneo();
      },
    },
    {
      key: 'jugadores',
      label: mode === 'femenino' ? 'Jugadoras' : 'Jugadores',
      icon: Icons.jugadores,
      onClick: () => {
        dispatchTab('jugadores'); onTabChange?.('jugadores');
        irAlTorneo();
      },
    },
  ];

  const activo = items.findIndex(i => i.key === activeTab);

  // Barra tipo "isla" flotante (rediseño 23/11, igual que 351 Deportes): una
  // pastilla del color de la categoría se desliza hasta la sección activa, y
  // la barra se esconde al bajar y vuelve al subir para no tapar contenido.
  return (
    <nav className={`bottom-nav${oculta ? ' is-oculta' : ''}`} role="navigation" aria-label="Navegación principal"
      style={{ '--bnav-color': modeColor, '--bnav-n': items.length }}>
      <div className="bottom-nav-isla">
        <span aria-hidden="true" className="bottom-nav-brillo"/>
        <span aria-hidden="true" className={`bottom-nav-pastilla${activo < 0 ? ' is-off' : ''}`}
          style={{ transform: `translateX(${Math.max(activo, 0) * 100}%)` }}>
          <span/>
        </span>
        {items.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <button
              key={item.key}
              className={`bottom-nav-item${isActive ? ' active' : ''}`}
              onClick={item.onClick}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="bottom-nav-icon-wrap">
                {item.icon}
                {item.dot && !isActive && (
                  <span className="bottom-nav-dot" style={{ background: modeColor }} />
                )}
              </div>
              <span className="bottom-nav-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
