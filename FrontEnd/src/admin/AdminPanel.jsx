import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { useAuth } from './AuthContext';
import { useRealtimeStatus } from './useRealtimeStatus';
import { useTournament } from '../context/TournamentContext';
import { CategoriaToggle } from './categoriaAdmin';
import { saludoCompleto } from './greeting';
import ResumenV2 from './ResumenV2';
import PartidosManager from './PartidosManager';
import StatsEditor from './StatsEditor';
import UploadHistory from './UploadHistory';
import RecalcularStats from './RecalcularStats';
import EncuestasManager from './EncuestasManager';
import AliasesManager from './AliasesManager';
import EquipoAliasesManager from './EquipoAliasesManager';
import MergeJugadores from './MergeJugadores';
import TemporadasManager from './TemporadasManager';
import PlantelManager from './PlantelManager';
import PlayoffsAdmin from './PlayoffsAdmin';
import AdminSearch from './AdminSearch';
import logoTorneo from '../assets/logo_torneo.jpg';
import './admin-theme.css';

// Carga diferida: trae xlsx + fuse.js, que solo hacen falta el día que se
// abre esta sección. Antes se importaba fijo arriba, así que ese peso se
// descargaba en CUALQUIER sesión de admin, aunque nunca se tocara Excel.
const ExcelUpload = lazy(() => import('./ExcelUpload'));


// Íconos de línea (mismo trazo que la web) en vez de emoji.
const ICONOS = {
  dashboard: <><path d="M3 13h8V3H3zM13 21h8v-8h-8zM13 3v6h8V3zM3 21h8v-4H3z"/></>,
  partidos: <><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></>,
  playoffs: <><path d="M7 3h10v4a5 5 0 01-10 0zM5 5H3v2a4 4 0 004 4M19 5h2v2a4 4 0 01-4 4M9 21h6M12 12v9"/></>,
  stats: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  historial: <><path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.4M3 4v4h4M12 7v5l3 2"/></>,
  herramientas: <><path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/></>,
  temporadas: <><circle cx="12" cy="8" r="5"/><path d="M8.5 12.5L7 22l5-3 5 3-1.5-9.5"/></>,
  plantel: <><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0M16 4.5a3.5 3.5 0 010 7M18 14a5 5 0 014 6"/></>,
  encuestas: <><path d="M4 20V12M10 20V6M16 20v-9M22 20H2"/><path d="M14 4l2-2 2 2"/></>,
  alias: <><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/></>,
  'equipo-alias': <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12h6"/></>,
  fusionar: <><path d="M6 3v6a6 6 0 006 6h0a6 6 0 016 6M18 3v6a6 6 0 01-3 5.2"/><circle cx="6" cy="3" r="1"/><circle cx="18" cy="3" r="1"/></>,
  recalcular: <><path d="M21 12a9 9 0 11-3-6.7L21 8M21 3v5h-5"/></>,
  excel: <><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></>,
  mas: <><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></>,
};
function Icono({ id }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{ICONOS[id] ?? ICONOS.dashboard}</svg>;
}

// ── Navegación ────────────────────────────────────────────────────────────────
const TABS = [
  { id:'dashboard', icon:'🏀', label:'Resumen',       desc:'Vista general del torneo' },
  { id:'partidos',  icon:'📅', label:'Partidos',       desc:'Fixture y resultados' },
  { id:'playoffs',  icon:'🥇', label:'Playoffs',       desc:'Armar y corregir los cruces de playoff' },
  { id:'stats',     icon:'📊', label:'Estadísticas',   desc:'Corrección manual' },
  { id:'historial', icon:'🗂️', label:'Historial',      desc:'Ver cargas anteriores' },
];
const TOOLS = [
  { id:'temporadas', icon:'🏆', label:'Temporadas',         desc:'Ver y crear temporada/torneo' },
  { id:'plantel',    icon:'👥', label:'Plantel',            desc:'Altas, bajas y cambios de equipo' },
  { id:'encuestas',  icon:'🗳️', label:'Encuestas',          desc:'Votaciones públicas' },
  { id:'alias',      icon:'🔗', label:'Alias',              desc:'Ver/borrar nombres vinculados' },
  { id:'equipo-alias', icon:'🛡️', label:'Alias de Equipos', desc:'Nombres de equipo distintos al oficial (ej: apodos del Excel)' },
  { id:'fusionar',   icon:'🧬', label:'Fusionar jugadores', desc:'Unir duplicados del roster' },
  { id:'recalcular', icon:'🔄', label:'Recalcular',         desc:'Reprocesar promedios' },
];
const CARGAR = { id:'excel', icon:'📤', label:'Subir Partido', desc:'Cargar planilla Excel' };

// Mismo degradado dorado que usa el título del Hero en el sitio público
// (.hero-title-accent) — para que el logo del admin se sienta parte de la
// misma marca en vez de un dorado plano distinto.
const GOLD_TEXT = {
  background: 'linear-gradient(100deg, #F0B429 0%, #FF6B2B 52%, #FFD166 100%)',
  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
};
// El sitio público tiene una regla global `nav { position:sticky; height:clamp(56px,8vh,68px); ... }`
// pensada para SU navbar. Como acá usamos <nav> sin clase para agrupar los
// botones del drawer, esa regla se filtraba y le clavaba un techo de ~68px
// a la lista completa (4 botones ≈ 216px), haciendo que los botones de más
// se superpongan visualmente con lo que viene después. Este reset anula
// todo lo que esa regla global toca.
const NAV_RESET = {
  display:'flex', flexDirection:'column', gap:2, marginBottom:16,
  height:'auto', minHeight:0, maxHeight:'none', position:'static', top:'auto', zIndex:'auto',
  background:'transparent', backdropFilter:'none', WebkitBackdropFilter:'none', borderBottom:'none',
  boxSizing:'border-box',
};
const NAV_TODO = [CARGAR, ...TABS, ...TOOLS];
// 'dashboard' se agregó acá — antes el Resumen tenía sus propios toggles
// sueltos adentro de cada tarjeta (ver Dashboard.jsx) en vez de usar este de
// arriba como el resto de las secciones. 'temporadas' queda afuera a
// propósito (una temporada es global, no es "de femenino" ni "de
// masculino"); 'encuestas' también, porque hoy EncuestasManager no separa
// por categoría.
const SECCIONES_CON_CATEGORIA = ['dashboard', 'excel', 'historial', 'partidos', 'stats', 'recalcular', 'alias', 'equipo-alias', 'fusionar', 'plantel', 'playoffs'];

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
    <div className="adm-sh">
      <span className="ic"><Icono id={item.id}/></span>
      <div>
        <h2>{item.label}</h2>
        <p>{item.desc}</p>
      </div>
    </div>
  );
}

// ── Botón de pestaña (desktop) ──────────────────────────────────────────────────
function NavButton({ item, active, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`adm-tab${active ? ' is-on' : ''}`} title={item.label}>
      <Icono id={item.id}/><span>{item.label}</span>
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
    <div ref={ref} className="adm-tools">
      <button type="button" onClick={() => setOpen(o => !o)} className={`adm-tab${activo ? ' is-on' : ''}`} title="Herramientas">
        <Icono id="herramientas"/><span>Herramientas</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 12, height: 12, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && (
        <div className="adm-tools-menu">
          {TOOLS.map(t => (
            <button type="button" key={t.id} onClick={() => { setSec(t.id); setOpen(false); }}
              className={`adm-tools-item${sec === t.id ? ' is-on' : ''}`}>
              <span className="ic"><Icono id={t.id}/></span>
              <span><b>{t.label}</b><small>{t.desc}</small></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Drawer mobile (reemplaza el sidebar fijo anterior) ───────────────────────────
function MobileDrawer({ sec, setSec, logout, greeting, categoria, setCategoria, showToggle, onClose, setFoco }) {
  // Al elegir un resultado del buscador dentro del drawer, además de navegar
  // hay que cerrar el drawer — si no, el resultado navega "detrás" del menú.
  const setSecYCerrar = (id) => { setSec(id); onClose(); };
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(5,8,14,.78)', zIndex:299, animation:'drawerFade .15s ease' }}/>
      <aside style={{
        position:'fixed', top:0, left:0, bottom:0, width:'min(300px, 84vw)', maxWidth:300,
        height:'100dvh', maxHeight:'100vh', zIndex:300, boxSizing:'border-box',
        background:'#0B111C', borderRight:'1px solid #1C2535',
        boxShadow:'8px 0 32px rgba(0,0,0,.45)', animation:'drawerFade .15s ease',
        display:'grid', gridTemplateRows:'auto 1fr auto', overflow:'hidden', isolation:'isolate',
      }}>
        {/* Header fijo: marca + saludo + acciones rapidas */}
        <div style={{ padding:'1.1rem 1rem .9rem', borderBottom:'1px solid #1C2535' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
            <div style={{ width:46, height:46, borderRadius:11, overflow:'hidden', border:'2px solid rgba(240,180,41,.45)', boxShadow:'0 0 14px rgba(240,180,41,.2)', flexShrink:0 }}>
              <img src={logoTorneo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            </div>
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", ...GOLD_TEXT, fontSize:18, letterSpacing:1.5, lineHeight:1 }}>TORNEO STAR</div>
              <div style={{ color:'#4A566E', fontSize:9.5, letterSpacing:1, textTransform:'uppercase', marginTop:2 }}>Admin Panel</div>
            </div>
            <button onClick={onClose} aria-label="Cerrar menú" style={{
              width:32, height:32, borderRadius:8, flexShrink:0, cursor:'pointer',
              background:'rgba(255,255,255,.04)', border:'1px solid #1C2535', color:'#8899BB',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div style={{ fontSize:13, color:'#CBD5E8', fontFamily:"'Barlow Condensed',sans-serif" }}>
            {greeting}
          </div>

          <div style={{ marginTop:10 }}>
            <AdminSearch setSec={setSecYCerrar} setCategoria={setCategoria} setFoco={setFoco}/>
          </div>

          {showToggle && <div style={{ marginTop:10 }}><CategoriaToggle categoria={categoria} setCategoria={setCategoria}/></div>}

          {sec !== 'excel' && (
            <button onClick={() => { setSec('excel'); onClose(); }} style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:'11px',
              marginTop:12, borderRadius:9, cursor:'pointer', border:'none',
              background:'linear-gradient(135deg,#F0B429,#FF6B2B)', color:'#0B0E14',
              fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:14, letterSpacing:.5,
            }}>
              + Cargar partido
            </button>
          )}
        </div>

        {/* Nav scrollable: unica zona con overflow, no puede pisar al header ni al footer */}
        <div className="scrollbar-accent" style={{ overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'.9rem 1rem', minHeight:0 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:2.5, color:'#6B7A99', fontFamily:"'Barlow Condensed',sans-serif", marginBottom:6, paddingLeft:4 }}>NAVEGACIÓN</div>
          <nav style={NAV_RESET}>
            {TABS.map(item => (
              <DrawerItem key={item.id} item={item} active={sec === item.id} onClick={() => { setSec(item.id); onClose(); }}/>
            ))}
          </nav>

          <div style={{ fontSize:10, fontWeight:700, letterSpacing:2.5, color:'#6B7A99', fontFamily:"'Barlow Condensed',sans-serif", marginBottom:6, paddingLeft:4 }}>HERRAMIENTAS</div>
          <nav style={{ ...NAV_RESET, marginBottom:0 }}>
            {TOOLS.map(item => (
              <DrawerItem key={item.id} item={item} active={sec === item.id} onClick={() => { setSec(item.id); onClose(); }}/>
            ))}
          </nav>
        </div>

        {/* Footer fijo: siempre visible, nunca se lo tapa el contenido scrolleable */}
        <div style={{ padding:'.9rem 1rem calc(.9rem + env(safe-area-inset-bottom))', borderTop:'1px solid #1C2535' }}>
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
      background: active ? 'rgba(59,130,246,.14)' : 'transparent',
      border: active ? '1px solid rgba(96,165,250,.3)' : '1px solid transparent',
      borderRadius:10, cursor:'pointer', textAlign:'left',
    }}>
      <div style={{
        width:30, height:30, borderRadius:8, flexShrink:0,
        background: active ? 'rgba(59,130,246,.18)' : 'rgba(255,255,255,.04)',
        display:'flex', alignItems:'center', justifyContent:'center', color: active ? '#7FB2FF' : '#8899BB',
      }}><span className="adm-drawer-ic"><Icono id={item.id}/></span></div>
      <div style={{ fontSize:15, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, letterSpacing:.4, color: active ? '#7FB2FF' : '#AEB8CB' }}>
        {item.label}
      </div>
      {active && <div style={{ marginLeft:'auto', width:3, height:16, background:'#3b82f6', borderRadius:2 }}/>}
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
  // Adónde saltar dentro de la sección de destino cuando se elige un
  // resultado del buscador rápido — ej: { equipoId, ts } para Plantel,
  // { fechaId, ts } para Partidos. `ts` cambia siempre para que el efecto
  // del componente hijo dispare aunque se busque lo mismo dos veces seguidas.
  const [foco, setFoco]   = useState(null);
  const rtStatus          = useRealtimeStatus();
  const greeting          = saludoCompleto(user);
  const showToggle        = SECCIONES_CON_CATEGORIA.includes(sec);

  return (
    <div style={S.shell} data-admin-shell>
      <style>{`
        @keyframes pulse-rt { 0%,100%{opacity:1}50%{opacity:.4} }
        @keyframes drawerFade { from{opacity:0} to{opacity:1} }
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
        /* El panel quedaba clavado en 1200px de ancho incluso en un monitor
           de escritorio grande — ahí es donde termina sobrando un montón de
           espacio vacío a los costados por más que las tarjetas de adentro
           se agranden (ver torneo-star.css). Esto libera ese ancho a partir
           de pantallas grandes; el celular no se toca (sigue con el mismo
           padding/ancho de siempre). */
        @media(min-width:1300px){
          [data-admin-content]{max-width:1650px!important}
        }
        @media(min-width:1700px){
          [data-admin-content]{max-width:min(1950px,94vw)!important}
        }
      `}</style>

      {/* Top bar desktop */}
      <header data-admin-topbar className="adm-top">
        <div className="adm-row">
          <div className="adm-brand">
            <img src={logoTorneo} alt="Torneo Star"/>
            <div><b>Torneo Star</b><small>Panel admin</small></div>
          </div>
          <nav className="adm-nav">
            {TABS.map(item => (
              <NavButton key={item.id} item={item} active={sec === item.id} onClick={() => setSec(item.id)}/>
            ))}
            <ToolsDropdown sec={sec} setSec={setSec}/>
          </nav>
          <span className="adm-sp"/>
          <div className="adm-search">
            <AdminSearch setSec={setSec} setCategoria={setCategoria} setFoco={setFoco}/>
          </div>
          {showToggle && <CategoriaToggle categoria={categoria} setCategoria={setCategoria}/>}
          <RealtimeDot status={rtStatus}/>
          {sec !== 'excel' && (
            <button type="button" onClick={() => setSec('excel')} className="adm-cta" title="Subir la planilla Excel de un partido">
              <span className="adm-cta-ic"><svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg></span>
              <span className="adm-cta-tx"><b>Cargar partido</b><small>Subir planilla Excel</small></span>
            </button>
          )}
          <button type="button" onClick={logout} className="adm-salir" title="Cerrar sesión">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Salir
          </button>
        </div>
      </header>

      {/* Mobile top bar */}
      <div data-admin-mobilebar style={S.mobileBar}>
        <button style={S.hamburger} onClick={() => setOpen(o => !o)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src={logoTorneo} alt="" style={{ width:40, height:40, borderRadius:11, objectFit:'cover', border:'2px solid rgba(240,180,41,.4)' }}/>
          <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:19, letterSpacing:1 }}>
            <span style={GOLD_TEXT}>TORNEO STAR</span> <span style={{ color:'#EEF2F8' }}>ADMIN</span>
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
          setFoco={setFoco} onClose={() => setOpen(false)}/>
      )}

      {/* Celular: barra de abajo */}
      <div className="adm-bnav" role="navigation" aria-label="Secciones">
        {[['dashboard', 'Resumen'], ['partidos', 'Partidos']].map(([id, l]) => (
          <button key={id} type="button" className={sec === id ? 'is-on' : ''} onClick={() => setSec(id)}><Icono id={id}/>{l}</button>
        ))}
        <button type="button" className="cta" onClick={() => setSec('excel')}><Icono id="excel"/>Cargar</button>
        <button type="button" className={sec === 'playoffs' ? 'is-on' : ''} onClick={() => setSec('playoffs')}><Icono id="playoffs"/>Playoffs</button>
        <button type="button" className={!['dashboard', 'partidos', 'playoffs', 'excel'].includes(sec) ? 'is-on' : ''} onClick={() => setOpen(true)}><Icono id="mas"/>Más</button>
      </div>

      {/* Contenido */}
      <main data-admin-main style={S.main}>
        <div data-admin-content style={S.content}>
          {sec !== 'dashboard' && <SectionHeader nav={NAV_TODO} sec={sec}/>}
          {sec === 'dashboard'  && <ResumenV2 irACargarPartido={() => setSec('excel')} onNavigate={setSec} categoria={categoria} greeting={greeting} />}
          {sec === 'excel'      && (
            <Suspense fallback={<div style={{ padding:'2rem', textAlign:'center', color:'#8899BB', fontFamily:"'Barlow Condensed',sans-serif" }}>Cargando…</div>}>
              <ExcelUpload categoria={categoria} setCategoria={setCategoria} />
            </Suspense>
          )}
          {sec === 'historial'  && <UploadHistory categoria={categoria} setCategoria={setCategoria} />}
          {sec === 'partidos'   && <PartidosManager categoria={categoria} setCategoria={setCategoria} foco={foco} />}
          {sec === 'stats'      && <StatsEditor categoria={categoria} setCategoria={setCategoria} />}
          {sec === 'recalcular' && <RecalcularStats categoria={categoria} setCategoria={setCategoria} />}
          {sec === 'alias'      && <AliasesManager categoria={categoria} setCategoria={setCategoria} />}
          {sec === 'equipo-alias' && <EquipoAliasesManager categoria={categoria} setCategoria={setCategoria} />}
          {sec === 'fusionar'   && <MergeJugadores categoria={categoria} setCategoria={setCategoria} />}
          {sec === 'encuestas'  && <EncuestasManager />}
          {sec === 'temporadas' && <TemporadasManager onNavigate={setSec} />}
          {sec === 'plantel'    && <PlantelManager categoria={categoria} setCategoria={setCategoria} foco={foco} />}
          {sec === 'playoffs'   && <PlayoffsAdmin categoria={categoria} setCategoria={setCategoria} />}
        </div>
      </main>
    </div>
  );
}

const S = {
  shell:       { minHeight:'100vh', background:'#080C12', fontFamily:"'Barlow Condensed',sans-serif", color:'#EEF2F8' },
  topbar:      { position:'relative', zIndex:50, background:'linear-gradient(180deg,#0C1220 0%,#0A0F19 100%)', borderBottom:'1px solid #1C2535' },
  topbarRow:   { display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, padding:'12px 24px', flexWrap:'wrap' },
  // height/position/background/backdropFilter/borderBottom explícitos porque el
  // sitio público tiene `nav { position:sticky; height:clamp(56px,8vh,68px); ... }`
  // global que si no se pisa, le clava un techo de altura a este <nav> también.
  navRow:      { display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, padding:'8px 20px 12px', flexWrap:'wrap',
                 borderTop:'1px solid #131B29', borderBottom:'none', height:'auto', minHeight:0, maxHeight:'none',
                 position:'static', top:'auto', zIndex:'auto', background:'transparent', backdropFilter:'none', WebkitBackdropFilter:'none' },
  logoutBtnSmall: { display:'flex', alignItems:'center', gap:6, padding:'7px 12px', background:'rgba(240,64,96,.08)', border:'1px solid rgba(240,64,96,.2)', borderRadius:8, color:'#F04060', cursor:'pointer', fontSize:12, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:.5 },
  cargarBtn:   { padding:'9px 16px', borderRadius:9, cursor:'pointer', border:'none', background:'linear-gradient(135deg,#F0B429,#FF6B2B)', color:'#0B0E14', fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:13, letterSpacing:.5, whiteSpace:'nowrap' },
  mobileBar:   { display:'none', position:'fixed', top:0, left:0, right:0, zIndex:200, background:'#0C1220', borderBottom:'1px solid #1C2535', padding:'12px 16px', alignItems:'center', gap:12 },
  hamburger:   { background:'rgba(255,255,255,.05)', border:'1px solid #1C2535', borderRadius:8, color:'#EEF2F8', padding:'6px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' },
  main:        { flex:1, minHeight:'100vh', background:'#080C12' },
  content:     { padding:'2rem 2.5rem', maxWidth:1200, margin:'0 auto' },
};
