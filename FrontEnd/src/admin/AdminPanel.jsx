import { useState } from 'react';
import { useAuth } from './AuthContext';
import ExcelUpload from './ExcelUpload';
import PartidosManager from './PartidosManager';
import StatsEditor from './StatsEditor';

const NAV_ITEMS = [
  { id: 'excel',    icon: '📊', label: 'Subir Excel' },
  { id: 'stats',    icon: '✏️',  label: 'Editar Stats' },
  { id: 'partidos', icon: '📅', label: 'Partidos' },
];

export default function AdminPanel() {
  const { logout } = useAuth();
  const [section, setSection] = useState('excel');

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={{ fontSize: 28 }}>🏀</div>
          <div>
            <div style={styles.brandTitle}>TORNEO STAR</div>
            <div style={styles.brandSub}>Admin</div>
          </div>
        </div>

        <nav style={{ flex: 1 }}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              style={section === item.id ? styles.navItemActive : styles.navItem}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button onClick={logout} style={styles.logoutBtn}>
          🚪 Cerrar sesión
        </button>
      </aside>

      {/* Main content */}
      <main style={styles.main}>
        <div style={styles.content}>
          {section === 'excel'    && <ExcelUpload />}
          {section === 'stats'    && <StatsEditor />}
          {section === 'partidos' && <PartidosManager />}
        </div>
      </main>
    </div>
  );
}

const styles = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    background: '#080C12',
    fontFamily: "'Barlow Condensed', sans-serif",
    color: '#EEF2F8',
  },
  sidebar: {
    width: 220,
    background: '#0E1420',
    borderRight: '1px solid #1C2535',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem 1rem',
    gap: 8,
    position: 'fixed',
    top: 0, left: 0, bottom: 0,
  },
  sidebarHeader: {
    display: 'flex', alignItems: 'center', gap: 10,
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #1C2535',
    marginBottom: '1rem',
  },
  brandTitle: {
    fontFamily: "'Bebas Neue', sans-serif",
    color: '#F0B429', fontSize: 18, letterSpacing: 1, lineHeight: 1,
  },
  brandSub: { color: '#4A566E', fontSize: 12 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '10px 12px',
    background: 'transparent', border: 'none', borderRadius: 8,
    color: '#6B7A99', cursor: 'pointer', fontSize: 15, textAlign: 'left',
    transition: 'all 0.15s',
  },
  navItemActive: {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '10px 12px',
    background: 'rgba(240,180,41,0.1)', border: 'none', borderRadius: 8,
    color: '#F0B429', cursor: 'pointer', fontSize: 15, textAlign: 'left',
    fontWeight: 600,
  },
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%', padding: '10px 12px',
    background: 'transparent', border: '1px solid rgba(240,64,96,0.2)', borderRadius: 8,
    color: '#F04060', cursor: 'pointer', fontSize: 14, textAlign: 'left',
    marginTop: 'auto',
  },
  main: { marginLeft: 220, flex: 1 },
  content: { padding: '2rem', maxWidth: 1100 },
};
