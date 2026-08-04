import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useRealtimeStatus } from './useRealtimeStatus';
import { useTournament } from '../context/TournamentContext';
import { CategoriaToggle } from './categoriaAdmin';
import ExcelUpload from './ExcelUpload';
import PartidosManager from './PartidosManager';
import StatsEditor from './StatsEditor';
import UploadHistory from './UploadHistory';
import RecalcularStats from './RecalcularStats';
import EncuestasManager from './EncuestasManager';
import logoTorneo from '../assets/logo_torneo.jpg';

const NAV = [
  { id:'excel',      icon:'📊', label:'Subir Partido',   desc:'Cargar planilla Excel'    },
  { id:'historial',  icon:'🗂️', label:'Historial',        desc:'Ver cargas anteriores'    },
  { id:'partidos',   icon:'📅', label:'Partidos',          desc:'Fixture y resultados'     },
  { id:'stats',      icon:'✏️',  label:'Editar Stats',     desc:'Corrección manual'        },
  { id:'recalcular', icon:'🔄', label:'Recalcular',        desc:'Reprocessar promedios'    },
  { id:'encuestas',  icon:'🗳️', label:'Encuestas',         desc:'Votaciones publicas'      },
];

// ── Indicador Realtime ────────────────────────────────────────────────────────
function RealtimeDot({ status, compact = false }) {
  const map = {
    connected:  { color:'#22D07A', label:'EN VIVO', glow:true },
    connecting: { color:'#F0B429', label:'CONECTANDO', glow:false },
    error:      { color:'#F04060', label:'OFFLINE',    glow:false },
  };
  const s = map[status] ?? map.connecting;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <div style={{
        width: compact ? 7 : 8,
        height: compact ? 7 : 8,
        borderRadius:'50%',
        background: s.color,
        flexShrink:0,
        boxShadow: s.glow ? `0 0 8px ${s.color}, 0 0 16px ${s.color}40` : 'none',
        animation: status==='connecting' ? 'pulse-rt 1.2s infinite' : 'none',
      }}/>
      {!compact && (
        <span style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:s.color, fontFamily:"'Barlow Condensed',sans-serif" }}>
          {s.label}
        </span>
      )}
    </div>
  );
}

// ── Header de sección ──────────────────────────────────────────────────────────
function SectionHeader({ nav, sec, categoria, setCategoria, showToggle }) {
  const item = nav.find(n => n.id === sec);
  if (!item) return null;
  return (
    <div style={{ marginBottom:28, paddingBottom:20, borderBottom:'1px solid #1C2535' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'rgba(240,180,41,.1)', border:'1px solid rgba(240,180,41,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
            {item.icon}
          </div>
          <div>
            <h2 style={{ margin:0, fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:1, color:'#EEF2F8' }}>
              {item.label}
            </h2>
            <p style={{ margin:0, fontSize:12, color:'#4A566E', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:.5 }}>
              {item.desc}
            </p>
          </div>
        </div>
        {showToggle && <CategoriaToggle categoria={categoria} setCategoria={setCategoria} />}
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ sec, setSec, logout, realtimeStatus, onClose }) {
  return (
    <div style={S.sidebarInner}>
      {/* Logo */}
      <div style={S.brand}>
        <div style={S.brandLogoWrap}>
          <img src={logoTorneo} alt="Torneo Star" style={S.brandLogo}/>
        </div>
        <div>
          <div style={S.brandTitle}>TORNEO STAR</div>
          <div style={S.brandSub}>Admin Panel</div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height:1, background:'linear-gradient(90deg,transparent,rgba(240,180,41,.25),transparent)', margin:'4px 0 16px' }}/>

      {/* Nav label */}
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:'#2C3A52', fontFamily:"'Barlow Condensed',sans-serif", marginBottom:8, paddingLeft:4 }}>
        NAVEGACIÓN
      </div>

      {/* Nav items */}
      <nav style={{ flex:1, display:'flex', flexDirection:'column', gap:2 }}>
        {NAV.map(item => {
          const active = sec === item.id;
          return (
            <button key={item.id} onClick={() => { setSec(item.id); onClose?.(); }}
              style={{
                display:'flex', alignItems:'center', gap:10,
                width:'100%', padding:'10px 12px',
                background: active ? 'linear-gradient(135deg,rgba(240,180,41,.15),rgba(255,107,43,.08))' : 'transparent',
                border: active ? '1px solid rgba(240,180,41,.25)' : '1px solid transparent',
                borderRadius:10, cursor:'pointer', textAlign:'left',
                transition:'all .15s',
              }}>
              <div style={{
                width:32, height:32, borderRadius:8, flexShrink:0,
                background: active ? 'rgba(240,180,41,.15)' : 'rgba(255,255,255,.04)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:15, transition:'background .15s',
              }}>
                {item.icon}
              </div>
              <div>
                <div style={{ fontSize:14, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, letterSpacing:.5, color: active ? '#F0B429' : '#8899BB' }}>
                  {item.label}
                </div>
                <div style={{ fontSize:10, color: active ? 'rgba(240,180,41,.6)' : '#2C3A52', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:.3 }}>
                  {item.desc}
                </div>
              </div>
              {active && <div style={{ marginLeft:'auto', width:3, height:20, background:'#F0B429', borderRadius:2 }}/>}
            </button>
          );
        })}
      </nav>

      {/* Footer sidebar */}
      <div style={{ borderTop:'1px solid #1C2535', paddingTop:14, marginTop:8, display:'flex', flexDirection:'column', gap:10 }}>
        {/* Status */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 10px', background:'rgba(255,255,255,.03)', borderRadius:8, border:'1px solid #1C2535' }}>
          <div style={{ fontSize:10, color:'#4A566E', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:.5 }}>SUPABASE REALTIME</div>
          <RealtimeDot status={realtimeStatus}/>
        </div>

        {/* Año */}
        <div style={{ fontSize:9, color:'#2C3A52', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1.5, textAlign:'center', textTransform:'uppercase' }}>
          Torneo Star Básquet · 2026
        </div>

        {/* Logout */}
        <button onClick={logout} style={S.logoutBtn}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

// ── Panel principal ───────────────────────────────────────────────────────────
const SECCIONES_CON_CATEGORIA = ['excel', 'historial', 'partidos', 'stats', 'recalcular'];

export default function AdminPanel() {
  const { logout }      = useAuth();
  const { mode }         = useTournament();
  const [sec, setSec]   = useState('excel');
  const [open, setOpen] = useState(false);
  const [categoria, setCategoria] = useState(mode ?? 'femenino');
  const rtStatus        = useRealtimeStatus();

  return (
    <div style={S.shell}>
      <style>{`
        @keyframes pulse-rt { 0%,100%{opacity:1}50%{opacity:.4} }
        @keyframes slideIn  { from{transform:translateX(-100%)}to{transform:translateX(0)} }
        @media(max-width:640px){
          [data-admin-sidebar]{display:none!important}
          [data-admin-mobilebar]{display:flex!important}
          [data-admin-main]{margin-left:0!important;padding-top:64px!important}
        }
        @media(min-width:641px){
          [data-admin-mobilebar]{display:none!important}
        }
      `}</style>

      {/* Sidebar desktop */}
      <aside data-admin-sidebar style={S.sidebar}>
        <Sidebar sec={sec} setSec={setSec} logout={logout} realtimeStatus={rtStatus}/>
      </aside>

      {/* Mobile top bar */}
      <div data-admin-mobilebar style={S.mobileBar}>
        <button style={S.hamburger} onClick={() => setOpen(o => !o)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src={logoTorneo} alt="" style={{ width:32, height:32, borderRadius:'50%', objectFit:'cover' }}/>
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:17, letterSpacing:1, color:'#EEF2F8' }}>
            TORNEO STAR <span style={{ color:'#F0B429' }}>ADMIN</span>
          </span>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
          <RealtimeDot status={rtStatus} compact/>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:299 }}/>
          <aside style={{ ...S.sidebar, animation:'slideIn .25s ease', display:'flex!important', zIndex:300 }}>
            <Sidebar sec={sec} setSec={setSec} logout={logout} realtimeStatus={rtStatus} onClose={() => setOpen(false)}/>
          </aside>
        </>
      )}

      {/* Main content */}
      <main data-admin-main style={S.main}>
        <div style={S.content}>
          <SectionHeader nav={NAV} sec={sec} categoria={categoria} setCategoria={setCategoria}
            showToggle={SECCIONES_CON_CATEGORIA.includes(sec)}/>
          {sec === 'excel'      && <ExcelUpload categoria={categoria} setCategoria={setCategoria} />}
          {sec === 'historial'  && <UploadHistory categoria={categoria} setCategoria={setCategoria} />}
          {sec === 'partidos'   && <PartidosManager categoria={categoria} setCategoria={setCategoria} />}
          {sec === 'stats'      && <StatsEditor categoria={categoria} setCategoria={setCategoria} />}
          {sec === 'recalcular' && <RecalcularStats categoria={categoria} setCategoria={setCategoria} />}
          {sec === 'encuestas'  && <EncuestasManager />}
        </div>
      </main>
    </div>
  );
}

const S = {
  shell:       { display:'flex', minHeight:'100vh', background:'#080C12', fontFamily:"'Barlow Condensed',sans-serif", color:'#EEF2F8' },
  sidebar:     { width:240, minWidth:240, background:'linear-gradient(180deg,#0C1220 0%,#080C12 100%)', borderRight:'1px solid #1C2535', position:'fixed', top:0, left:0, bottom:0, zIndex:100, overflowY:'auto' },
  sidebarInner:{ display:'flex', flexDirection:'column', height:'100%', padding:'1.25rem 1rem' },
  brand:       { display:'flex', alignItems:'center', gap:10, marginBottom:16 },
  brandLogoWrap:{ width:44, height:44, borderRadius:10, overflow:'hidden', border:'2px solid rgba(240,180,41,.3)', flexShrink:0 },
  brandLogo:   { width:'100%', height:'100%', objectFit:'cover' },
  brandTitle:  { fontFamily:"'Bebas Neue',sans-serif", color:'#F0B429', fontSize:16, letterSpacing:1.5, lineHeight:1 },
  brandSub:    { color:'#4A566E', fontSize:10, letterSpacing:1, textTransform:'uppercase' },
  mobileBar:   { display:'none', position:'fixed', top:0, left:0, right:0, zIndex:200, background:'#0C1220', borderBottom:'1px solid #1C2535', padding:'12px 16px', alignItems:'center', gap:12 },
  hamburger:   { background:'rgba(255,255,255,.05)', border:'1px solid #1C2535', borderRadius:8, color:'#EEF2F8', padding:'6px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' },
  logoutBtn:   { display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'10px', background:'rgba(240,64,96,.08)', border:'1px solid rgba(240,64,96,.2)', borderRadius:8, color:'#F04060', cursor:'pointer', fontSize:13, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:.5, transition:'background .15s' },
  main:        { marginLeft:240, flex:1, minHeight:'100vh', background:'#080C12' },
  content:     { padding:'2rem 2.5rem', maxWidth:1100 },
};
