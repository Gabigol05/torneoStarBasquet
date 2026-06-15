import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useRealtimeStatus } from './useRealtimeStatus';
import ExcelUpload from './ExcelUpload';
import PartidosManager from './PartidosManager';
import StatsEditor from './StatsEditor';
import UploadHistory from './UploadHistory';
import RecalcularStats from './RecalcularStats';

const NAV = [
  { id:'excel',      icon:'📊', label:'Subir Partido'   },
  { id:'historial',  icon:'🗂️', label:'Historial'        },
  { id:'stats',      icon:'✏️',  label:'Editar Stats'     },
  { id:'partidos',   icon:'📅', label:'Partidos'          },
  { id:'recalcular', icon:'🔄', label:'Recalcular'        },
];

function RealtimeDot({ status }) {
  const map = {
    connected:  { color:'#22D07A', label:'Conectado' },
    connecting: { color:'#F0B429', label:'Conectando...' },
    error:      { color:'#F04060', label:'Sin conexión' },
  };
  const s = map[status] ?? map.connecting;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11,
      color:'#4A566E', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:.5 }}>
      <div style={{
        width:8, height:8, borderRadius:'50%', background:s.color, flexShrink:0,
        boxShadow: status==='connected' ? `0 0 6px ${s.color}` : 'none',
        animation: status==='connecting' ? 'pulse-vivo 1.5s infinite' : 'none',
      }}/>
      <span style={{ color:s.color }}>Realtime {s.label}</span>
    </div>
  );
}

function SidebarContent({ sec, setSec, logout, realtimeStatus }) {
  return (
    <>
      <div style={S.brand}>
        <span style={{ fontSize:26 }}>🏀</span>
        <div>
          <div style={S.brandTitle}>TORNEO STAR</div>
          <div style={S.brandSub}>Panel Admin</div>
        </div>
      </div>

      <nav style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
        {NAV.map(item => (
          <button key={item.id} onClick={() => setSec(item.id)}
            style={sec===item.id ? S.navActive : S.nav}>
            <span style={{ fontSize:17 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div style={{ borderTop:'1px solid #1C2535', paddingTop:12, marginTop:8, display:'flex', flexDirection:'column', gap:10 }}>
        <RealtimeDot status={realtimeStatus}/>
        <div style={{ fontSize:10, color:'#4A566E', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:.5 }}>
          TORNEO STAR BÁSQUET 2026
        </div>
        <button onClick={logout} style={S.logout}>🚪 Cerrar sesión</button>
      </div>
    </>
  );
}

export default function AdminPanel() {
  const { logout }         = useAuth();
  const [sec, setSec]      = useState('excel');
  const [open, setOpen]    = useState(false);
  const realtimeStatus     = useRealtimeStatus();

  return (
    <div style={S.shell}>
      {/* Sidebar desktop */}
      <aside data-admin-sidebar style={S.sidebar}>
        <SidebarContent sec={sec} setSec={setSec} logout={logout} realtimeStatus={realtimeStatus}/>
      </aside>

      {/* Mobile top bar */}
      <div data-admin-mobilebar style={S.mobileBar}>
        <button style={S.hamburger} onClick={() => setOpen(o => !o)}>☰</button>
        <span style={S.mobileLogo}>🏀 <span style={{ color:'#F0B429' }}>TORNEO STAR</span></span>
        <div style={{ marginLeft:'auto' }}>
          <RealtimeDot status={realtimeStatus}/>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div onClick={() => setOpen(false)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:299 }}/>
          <aside style={S.drawer}>
            <button style={{ ...S.hamburger, alignSelf:'flex-end', marginBottom:12 }}
              onClick={() => setOpen(false)}>✕</button>
            <SidebarContent sec={sec} setSec={s => { setSec(s); setOpen(false); }}
              logout={logout} realtimeStatus={realtimeStatus}/>
          </aside>
        </>
      )}

      {/* Main */}
      <main data-admin-main style={S.main}>
        <div style={S.content}>
          {sec === 'excel'      && <ExcelUpload />}
          {sec === 'historial'  && <UploadHistory />}
          {sec === 'stats'      && <StatsEditor />}
          {sec === 'partidos'   && <PartidosManager />}
          {sec === 'recalcular' && <RecalcularStats />}
        </div>
      </main>
    </div>
  );
}

const S = {
  shell:     { display:'flex', minHeight:'100vh', background:'#080C12', fontFamily:"'Barlow Condensed',sans-serif", color:'#EEF2F8' },
  sidebar:   { width:220, minWidth:220, background:'#0E1420', borderRight:'1px solid #1C2535', display:'flex', flexDirection:'column', padding:'1.5rem 1rem', gap:8, position:'fixed', top:0, left:0, bottom:0, zIndex:100, overflowY:'auto' },
  mobileBar: { display:'none', position:'fixed', top:0, left:0, right:0, zIndex:200, background:'#0E1420', borderBottom:'1px solid #1C2535', padding:'10px 16px', alignItems:'center', gap:12 },
  mobileLogo:{ fontFamily:"'Bebas Neue',sans-serif", fontSize:17, letterSpacing:1 },
  hamburger: { background:'transparent', border:'1px solid #1C2535', borderRadius:6, color:'#EEF2F8', fontSize:18, padding:'6px 10px', cursor:'pointer' },
  drawer:    { position:'fixed', top:0, left:0, bottom:0, width:240, background:'#0E1420', borderRight:'1px solid #1C2535', zIndex:300, padding:'1rem', display:'flex', flexDirection:'column', gap:8, overflowY:'auto' },
  brand:     { display:'flex', alignItems:'center', gap:10, paddingBottom:'1.25rem', borderBottom:'1px solid #1C2535', marginBottom:'1rem' },
  brandTitle:{ fontFamily:"'Bebas Neue',sans-serif", color:'#F0B429', fontSize:17, letterSpacing:1, lineHeight:1 },
  brandSub:  { color:'#4A566E', fontSize:11 },
  nav:       { display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 12px', background:'transparent', border:'none', borderRadius:8, color:'#6B7A99', cursor:'pointer', fontSize:15, textAlign:'left' },
  navActive: { display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 12px', background:'rgba(240,180,41,.1)', border:'none', borderRadius:8, color:'#F0B429', cursor:'pointer', fontSize:15, textAlign:'left', fontWeight:600 },
  logout:    { display:'flex', alignItems:'center', gap:8, width:'100%', padding:'9px 12px', background:'transparent', border:'1px solid rgba(240,64,96,.2)', borderRadius:8, color:'#F04060', cursor:'pointer', fontSize:14 },
  main:      { marginLeft:220, flex:1, minHeight:'100vh' },
  content:   { padding:'2rem', maxWidth:1100 },
};
