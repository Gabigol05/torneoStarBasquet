import { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useRealtimeStatus } from './useRealtimeStatus';
import { useTournament } from '../context/TournamentContext';
import { CategoriaToggle } from './categoriaAdmin';
import { saludoCompleto } from './greeting';
import Dashboard from './Dashboard';
import ExcelUpload from './ExcelUpload';
import PartidosManager from './PartidosManager';
import StatsEditor from './StatsEditor';
import UploadHistory from './UploadHistory';
import RecalcularStats from './RecalcularStats';
import EncuestasManager from './EncuestasManager';
import AliasesManager from './AliasesManager';
import MergeJugadores from './MergeJugadores';
import logoTorneo from '../assets/logo_torneo.jpg';

// ── Navegación ────────────────────────────────────────────────────────────────
const TABS = [
  { id:'dashboard', icon:'🏠', label:'Resumen',       desc:'Vista general del torneo' },
  { id:'partidos',  icon:'📅', label:'Partidos',       desc:'Fixture y resultados' },
  { id:'stats',     icon:'✏️', label:'Estadísticas',   desc:'Corrección manual' },
  { id:'historial', icon:'🗂️', label:'Historial',      desc:'Ver cargas anteriores' },
];
const TOOLS = [
  { id:'encuestas',  icon:'🗳️', label:'Encuestas',          desc:'Votaciones públicas' },
  { id:'alias',      icon:'🔗', label:'Alias',              desc:'Ver/borrar nombres vinculados' },
  { id:'fusionar',   icon:'🧬', label:'Fusionar jugadores', desc:'Unir duplicados del roster' },
  { id:'recalcular', icon:'🔄', label:'Recalcular',         desc:'Reprocesar promedios' },
];
const CARGAR = { id:'excel', icon:'📊', label:'Subir Partido', desc:'Cargar planilla Excel' };
const NAV_TODO = [CARGAR, ...TABS, ...TOOLS];
const SECCIONES_CON_CATEGORIA = ['excel', 'historial', 'partidos', 'stats', 'recalcular', 'alias', 'fusionar'];

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
function SectionHeader({ nav, sec }) {
  const item = nav.find(n => n.id === sec);
  if (!item) return null;
  return (
    <div style={{ marginBottom:24, paddingBottom:18, borderBottom:'1px solid #1C2535', display:'flex', alignItems:'center', gap:12 }}>
      <div style={{ width:40, height:40, borderRadius:11, background:'rgba(240,180,41,.1)', border:'1px solid rgba(240,180,41,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
        {item.icon}
      </div>
      <div>
        <h2 style={{ margin:0, fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:1, color:'#EEF2F8' }}>
          {item.label}
        </h2>
        <p style={{ margin:0, fontSize:12, color:'#4A566E', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:.5 }}>
          {item.desc}
        </p>
      </div>
    </div>
  );
}

// ── Botón de pestaña (desktop) ──────────────────────────────────────────────────
function NavButton({ item, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:7, padding:'9px 14px', borderRadius:9, cursor:'pointer',
      background: active ? 'linear-gradient(135deg,rgba(240,180,41,.15),rgba(255,107,43,.08))' : 'transparent',
      border: active ? '1px solid rgba(240,180,41,.25)' : '1px solid transparent',
      color: active ? '#F0B429' : '#8899BB',
      fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:14, letterSpacing:.4,
      transition:'all .15s', whiteSpace:'nowrap',
    }}>
      <span style={{ fontSize:14 }}>{item.icon}</span>{item.label}
    </button>
  );
}

// ── Dropdown Herramientas ────────────────────────────────────────────────────────
function ToolsDropdown({ sec, setSec }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const activo = TOOLS.some(t => t.id === sec);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display:'flex', alignItems:'center', gap:7, padding:'9px 14px', borderRadius:9, cursor:'pointer',
        background: activo ? 'linear-gradient(135deg,rgba(240,180,41,.15),rgba(255,107,43,.08))' : 'transparent',
        border: activo ? '1px solid rgba(240,180,41,.25)' : '1px solid transparent',
        color: activo ? '#F0B429' : '#8899BB',
        fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:14, letterSpacing:.4,
      }}>
        🛠️ Herramientas <span style={{ fontSize:9, transform: open ? 'rotate(180deg)' : 'none', transition:'transform .15s' }}>▼</span>
      </button>
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)', left:0, minWidth:220, zIndex:60,
          background:'#0E1420', border:'1px solid #1C2535', borderRadius:11, padding:6,
          boxShadow:'0 12px 32px rgba(0,0,0,.5)',
        }}>
          {TOOLS.map(t => {
            const active = sec === t.id;
            return (
              <button key={t.id} onClick={() => { setSec(t.id); setOpen(false); }} style={{
                display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 10px', borderRadius:8,
                background: active ? 'rgba(240,180,41,.1)' : 'transparent', border:'none', cursor:'pointer', textAlign:'left',
              }}>
                <span style={{ fontSize:15 }}>{t.icon}</span>
                <div>
                  <div style={{ fontSize:13, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, color: active ? '#F0B429' : '#CBD5E8' }}>{t.label}</div>
                  <div style={{ fontSize:10, color:'#4A566E', fontFamily:"'Barlow Condensed',sans-serif" }}>{t.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Drawer mobile (reemplaza el sidebar fijo anterior) ───────────────────────────
function MobileDrawer({ sec, setSec, logout, greeting, categoria, setCategoria, showToggle, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:299 }}/>
      <aside style={{
        position:'fixed', top:0, left:0, bottom:0, width:280, zIndex:300, overflowY:'auto',
        background:'linear-gradient(180deg,#0C1220 0%,#080C12 100%)', borderRight:'1px solid #1C2535',
        animation:'slideIn .22s ease', padding:'1.25rem 1rem', display:'flex', flexDirection:'column',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <div style={{ width:40, height:40, borderRadius:10, overflow:'hidden', border:'2px solid rgba(240,180,41,.3)', flexShrink:0 }}>
            <img src={logoTorneo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
          </div>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", color:'#F0B429', fontSize:15, letterSpacing:1.5, lineHeight:1 }}>TORNEO STAR</div>
            <div style={{ color:'#4A566E', fontSize:10, letterSpacing:1, textTransform:'uppercase' }}>Admin Panel</div>
          </div>
        </div>
        <div style={{ fontSize:13, color:'#CBD5E8', fontFamily:"'Barlow Condensed',sans-serif", marginBottom:14, paddingBottom:14, borderBottom:'1px solid #1C2535' }}>
          {greeting}
        </div>

        {showToggle && <div style={{ marginBottom:6 }}><CategoriaToggle categoria={categoria} setCategoria={setCategoria}/></div>}

        {sec !== 'excel' && (
          <button onClick={() => { setSec('excel'); onClose(); }} style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'11px',
            marginBottom:14, borderRadius:9, cursor:'pointer', border:'none',
            background:'linear-gradient(135deg,#F0B429,#FF6B2B)', color:'#0B0E14',
            fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:14, letterSpacing:.5,
          }}>
            + Cargar partido
          </button>
        )}

        <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:'#2C3A52', fontFamily:"'Barlow Condensed',sans-serif", marginBottom:6, paddingLeft:4 }}>NAVEGACIÓN</div>
        <nav style={{ display:'flex', flexDirection:'column', gap:2, marginBottom:14 }}>
          {TABS.map(item => (
            <DrawerItem key={item.id} item={item} active={sec === item.id} onClick={() => { setSec(item.id); onClose(); }}/>
          ))}
        </nav>

        <div style={{ fontSize:9, fontWeight:700, letterSpacing:2.5, color:'#2C3A52', fontFamily:"'Barlow Condensed',sans-serif", marginBottom:6, paddingLeft:4 }}>HERRAMIENTAS</div>
        <nav style={{ flex:1, display:'flex', flexDirection:'column', gap:2 }}>
          {TOOLS.map(item => (
            <DrawerItem key={item.id} item={item} active={sec === item.id} onClick={() => { setSec(item.id); onClose(); }}/>
          ))}
        </nav>

        <div style={{ borderTop:'1px solid #1C2535', paddingTop:14, marginTop:8 }}>
          <button onClick={logout} style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'10px',
            background:'rgba(240,64,96,.08)', border:'1px solid rgba(240,64,96,.2)', borderRadius:8, color:'#F04060',
            cursor:'pointer', fontSize:13, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:.5,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}

function DrawerItem({ item, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:10, width:'100%', padding:'10px 12px',
      background: active ? 'linear-gradient(135deg,rgba(240,180,41,.15),rgba(255,107,43,.08))' : 'transparent',
      border: active ? '1px solid rgba(240,180,41,.25)' : '1px solid transparent',
      borderRadius:10, cursor:'pointer', textAlign:'left',
    }}>
      <div style={{
        width:30, height:30, borderRadius:8, flexShrink:0,
        background: active ? 'rgba(240,180,41,.15)' : 'rgba(255,255,255,.04)',
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
      }}>{item.icon}</div>
      <div style={{ fontSize:13, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, letterSpacing:.4, color: active ? '#F0B429' : '#8899BB' }}>
        {item.label}
      </div>
      {active && <div style={{ marginLeft:'auto', width:3, height:16, background:'#F0B429', borderRadius:2 }}/>}
    </button>
  );
}

// ── Panel principal ───────────────────────────────────────────────────────────
export default function AdminPanel() {
  const { logout, user } = useAuth();
  const { mode }          = useTournament();
  const [sec, setSec]     = useState('dashboard');
  const [open, setOpen]   = useState(false);
  const [categoria, setCategoria] = useState(mode ?? 'femenino');
  const rtStatus          = useRealtimeStatus();
  const greeting          = saludoCompleto(user);
  const showToggle        = SECCIONES_CON_CATEGORIA.includes(sec);

  return (
    <div style={S.shell}>
      <style>{`
        @keyframes pulse-rt { 0%,100%{opacity:1}50%{opacity:.4} }
        @keyframes slideIn  { from{transform:translateX(-100%)}to{transform:translateX(0)} }
        @media(max-width:820px){
          [data-admin-topbar]{display:none!important}
          [data-admin-mobilebar]{display:flex!important}
          [data-admin-main]{padding-top:64px!important}
          [data-admin-content]{padding:1.1rem 1rem!important}
        }
        @media(max-width:420px){
          [data-admin-content]{padding:.9rem .75rem!important}
        }
        @media(min-width:821px){
          [data-admin-mobilebar]{display:none!important}
        }
      `}</style>

      {/* Top bar desktop */}
      <header data-admin-topbar style={S.topbar}>
        <div style={S.topbarRow}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:9, overflow:'hidden', border:'2px solid rgba(240,180,41,.3)', flexShrink:0 }}>
              <img src={logoTorneo} alt="Torneo Star" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            </div>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", color:'#F0B429', fontSize:15, letterSpacing:1.5, lineHeight:1 }}>TORNEO STAR</div>
              <div style={{ color:'#4A566E', fontSize:9, letterSpacing:1, textTransform:'uppercase' }}>Admin Panel</div>
            </div>
          </div>

          <div style={{ fontSize:14, color:'#CBD5E8', fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600 }}>
            {greeting}
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <RealtimeDot status={rtStatus}/>
            <button onClick={logout} style={S.logoutBtnSmall}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Salir
            </button>
          </div>
        </div>

        <nav style={S.navRow}>
          <div style={{ display:'flex', alignItems:'center', gap:4, flexWrap:'wrap' }}>
            {TABS.map(item => (
              <NavButton key={item.id} item={item} active={sec === item.id} onClick={() => setSec(item.id)}/>
            ))}
            <ToolsDropdown sec={sec} setSec={setSec}/>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
            {showToggle && <CategoriaToggle categoria={categoria} setCategoria={setCategoria}/>}
            {sec !== 'excel' && (
              <button onClick={() => setSec('excel')} style={S.cargarBtn}>+ Cargar partido</button>
            )}
          </div>
        </nav>
      </header>

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

      {/* Drawer mobile */}
      {open && (
        <MobileDrawer sec={sec} setSec={setSec} logout={logout} greeting={greeting}
          categoria={categoria} setCategoria={setCategoria} showToggle={showToggle}
          onClose={() => setOpen(false)}/>
      )}

      {/* Contenido */}
      <main data-admin-main style={S.main}>
        <div data-admin-content style={S.content}>
          <SectionHeader nav={NAV_TODO} sec={sec}/>
          {sec === 'dashboard'  && <Dashboard irACargarPartido={() => setSec('excel')} />}
          {sec === 'excel'      && <ExcelUpload categoria={categoria} setCategoria={setCategoria} />}
          {sec === 'historial'  && <UploadHistory categoria={categoria} setCategoria={setCategoria} />}
          {sec === 'partidos'   && <PartidosManager categoria={categoria} setCategoria={setCategoria} />}
          {sec === 'stats'      && <StatsEditor categoria={categoria} setCategoria={setCategoria} />}
          {sec === 'recalcular' && <RecalcularStats categoria={categoria} setCategoria={setCategoria} />}
          {sec === 'alias'      && <AliasesManager categoria={categoria} setCategoria={setCategoria} />}
          {sec === 'fusionar'   && <MergeJugadores categoria={categoria} setCategoria={setCategoria} />}
          {sec === 'encuestas'  && <EncuestasManager />}
        </div>
      </main>
    </div>
  );
}

const S = {
  shell:       { minHeight:'100vh', background:'#080C12', fontFamily:"'Barlow Condensed',sans-serif", color:'#EEF2F8' },
  topbar:      { position:'relative', zIndex:50, background:'linear-gradient(180deg,#0C1220 0%,#0A0F19 100%)', borderBottom:'1px solid #1C2535' },
  topbarRow:   { display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, padding:'12px 24px', flexWrap:'wrap' },
  navRow:      { display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, padding:'8px 20px 12px', flexWrap:'wrap', borderTop:'1px solid #131B29' },
  logoutBtnSmall: { display:'flex', alignItems:'center', gap:6, padding:'7px 12px', background:'rgba(240,64,96,.08)', border:'1px solid rgba(240,64,96,.2)', borderRadius:8, color:'#F04060', cursor:'pointer', fontSize:12, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:.5 },
  cargarBtn:   { padding:'9px 16px', borderRadius:9, cursor:'pointer', border:'none', background:'linear-gradient(135deg,#F0B429,#FF6B2B)', color:'#0B0E14', fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:13, letterSpacing:.5, whiteSpace:'nowrap' },
  mobileBar:   { display:'none', position:'fixed', top:0, left:0, right:0, zIndex:200, background:'#0C1220', borderBottom:'1px solid #1C2535', padding:'12px 16px', alignItems:'center', gap:12 },
  hamburger:   { background:'rgba(255,255,255,.05)', border:'1px solid #1C2535', borderRadius:8, color:'#EEF2F8', padding:'6px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' },
  main:        { flex:1, minHeight:'100vh', background:'#080C12' },
  content:     { padding:'2rem 2.5rem', maxWidth:1200, margin:'0 auto' },
};
