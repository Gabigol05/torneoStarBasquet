import { useState, useCallback, useEffect, useMemo } from 'react';

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skel({ w='100%', h=16, radius=6, mb=8 }) {
  return <div style={{ width:w, height:h, borderRadius:radius, marginBottom:mb,
    background:'linear-gradient(90deg,#1C2535 25%,#243048 50%,#1C2535 75%)',
    backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite' }}/>;
}
function TableSkeleton() {
  return (
    <div style={{ padding:'8px 0' }}>
      {Array.from({length:6}).map((_,i) => (
        <div key={i} style={{ display:'flex', gap:12, padding:'12px 16px', borderBottom:'1px solid #1C2535', alignItems:'center' }}>
          <Skel w={28} h={28} radius={14} mb={0}/>
          <Skel w={120} h={14} mb={0}/>
          <div style={{ flex:1 }}/>
          {[40,30,30,30,40,50].map((w,j)=><Skel key={j} w={w} h={14} mb={0}/>)}
        </div>
      ))}
    </div>
  );
}
function CardsSkeleton() {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:12 }}>
      {Array.from({length:8}).map((_,i)=>(
        <div key={i} style={{ background:'#0E1420', border:'1px solid #1C2535', borderRadius:12, padding:16 }}>
          <Skel w={60} h={60} radius={30} style={{ margin:'0 auto 12px' }}/>
          <Skel h={16} mb={6}/>
          <Skel w="60%" h={12} mb={0}/>
        </div>
      ))}
    </div>
  );
}
import { useTournament } from '../context/TournamentContext';
import { GameCenterModal } from './GameCenterModal';
import { PlayerProfileModal } from './PlayerProfileModal';
import { TeamPageFem } from './TeamPageFem';
import { FavoritoCard } from './FavoritoCard';
import { useStats } from '../context/StatsContext';
import { useSwipe } from '../hooks/useSwipe';
import { useFavorito } from '../hooks/useFavorito';

import logoMambas   from '../assets/logo_mambas.png';
import logoToros    from '../assets/logo_toros.png';
import logoSpartans from '../assets/logo_spartans.png';

const TABS = [
  { key: 'tabla',      label: '📊 Tabla'      },
  { key: 'resultados', label: '🏀 Resultados'  },
  { key: 'fixture',    label: '📅 Fixture'     },
  { key: 'jugadores',  label: '👤 Jugadoras'   },
  { key: 'equipos',    label: '🏟️ Equipos'     },
];

const TEAMS_MASC = [
  { id:'m1', name:'Black Mambas', logo:logoMambas,  record:'7-0', color:'#3b82f6', pg:7, pp:0 },
  { id:'m2', name:'Los Toros',    logo:logoToros,   record:'6-1', color:'#ef4444', pg:6, pp:1 },
  { id:'m3', name:'Spartans',     logo:logoSpartans,record:'5-2', color:'#b45309', pg:5, pp:2 },
];

const IG_URL = 'https://www.instagram.com/torneostar.basquet/';

function EmptyState({ icon, title, sub, showIG=true }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      <div className="empty-sub">{sub}</div>
      {showIG && (
        <a href={IG_URL} target="_blank" rel="noopener noreferrer" className="empty-ig-btn">
          Seguinos en Instagram
        </a>
      )}
    </div>
  );
}

// ── Tarjeta de resultado ────────────────────────────────────────────────────
function MatchResultCard({ partido, equiposFem, fechas, onClick }) {
  const localEq  = equiposFem.find(e => e.id === partido.equipo_local_id);
  const visitEq  = equiposFem.find(e => e.id === partido.equipo_visit_id);
  const fecha    = fechas.find(f => f.id === partido.fecha_id);
  const ganLocal = partido.puntos_local > partido.puntos_visit;
  const enVivo   = partido.estado === 'en_juego';

  if (!localEq || !visitEq) return null;

  return (
    <div className="result-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {/* Header */}
      <div className="rc-header">
        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          <span className="rc-fecha">{fecha ? `Fecha ${fecha.numero}` : 'Partido'}</span>
          {partido.hora_inicio && (
            <span style={{ fontSize:11, color:'#4A566E', fontFamily:"'Barlow Condensed',sans-serif" }}>
              🕐 {String(partido.hora_inicio).slice(0,5)}
            </span>
          )}
        </div>
        <span className={`rc-estado ${enVivo ? 'en-vivo' : 'finalizado'}`}>
          {enVivo ? '🔴 EN VIVO' : 'FINAL'}
        </span>
      </div>
      {/* Equipos + marcador */}
      <div className="rc-body">
        <div className={`rc-equipo ${ganLocal ? 'ganador' : ''}`}>
          <img src={localEq.logo} alt={localEq.name} className="rc-logo" loading="lazy"
            onError={e => { e.target.style.display='none'; }}/>
          <span className="rc-nombre">{localEq.name}</span>
          <span className="rc-pts" style={{ color: ganLocal ? localEq.color : '#6B7A99' }}>
            {partido.puntos_local ?? 0}
          </span>
        </div>
        <div className="rc-sep">–</div>
        <div className={`rc-equipo rc-equipo-visit ${!ganLocal ? 'ganador' : ''}`}>
          <span className="rc-pts" style={{ color: !ganLocal ? visitEq.color : '#6B7A99' }}>
            {partido.puntos_visit ?? 0}
          </span>
          <span className="rc-nombre">{visitEq.name}</span>
          <img src={visitEq.logo} alt={visitEq.name} className="rc-logo" loading="lazy"
            onError={e => { e.target.style.display='none'; }}/>
        </div>
      </div>
      {/* Parciales */}
      {partido.q1_local != null && (
        <div className="rc-parciales">
          {['q1','q2','q3','q4'].map(q => (
            <div key={q} className="rc-parcial">
              <span className="rc-parcial-lbl">{q.toUpperCase()}</span>
              <span className="rc-parcial-vals">
                <span style={{ color: localEq.color }}>{partido[`${q}_local`]??0}</span>
                <span className="rc-parcial-sep">-</span>
                <span style={{ color: visitEq.color }}>{partido[`${q}_visit`]??0}</span>
              </span>
            </div>
          ))}
          {partido.ot_local > 0 && (
            <div className="rc-parcial">
              <span className="rc-parcial-lbl">OT</span>
              <span className="rc-parcial-vals">
                <span style={{ color: localEq.color }}>{partido.ot_local}</span>
                <span className="rc-parcial-sep">-</span>
                <span style={{ color: visitEq.color }}>{partido.ot_visit}</span>
              </span>
            </div>
          )}
        </div>
      )}
      {/* MVP */}
      {partido.mvp_jugadora_id && (() => {
        const mvpEq  = equiposFem.find(e => e.jugadoras?.some(j => j.id === partido.mvp_jugadora_id));
        const mvpJug = mvpEq?.jugadoras?.find(j => j.id === partido.mvp_jugadora_id);
        if (!mvpJug) return null;
        return (
          <div className="rc-mvp">
            <span style={{ fontSize:16 }}>⭐</span>
            <div>
              <div className="rc-mvp-label">MVP del partido</div>
              <div className="rc-mvp-name">{mvpJug.nombre}</div>
            </div>
            <div className="rc-mvp-pts">{mvpEq?.name}</div>
          </div>
        );
      })()}

      {/* % tiro */}
      {partido.pct_dobles_local != null && (
        <div className="rc-pct-row">
          <span className="rc-pct-item">
            <span className="rc-pct-lbl">TL%</span>
            <span style={{ color: localEq.color }}>{partido.pct_simples_local}%</span>
            <span className="rc-pct-sep">·</span>
            <span style={{ color: visitEq.color }}>{partido.pct_simples_visit}%</span>
          </span>
          <span className="rc-pct-item">
            <span className="rc-pct-lbl">2P%</span>
            <span style={{ color: localEq.color }}>{partido.pct_dobles_local}%</span>
            <span className="rc-pct-sep">·</span>
            <span style={{ color: visitEq.color }}>{partido.pct_dobles_visit}%</span>
          </span>
          <span className="rc-pct-item">
            <span className="rc-pct-lbl">3P%</span>
            <span style={{ color: localEq.color }}>{partido.pct_triples_local}%</span>
            <span className="rc-pct-sep">·</span>
            <span style={{ color: visitEq.color }}>{partido.pct_triples_visit}%</span>
          </span>
        </div>
      )}
    </div>
  );
}

// ── Tarjeta de próximo partido ──────────────────────────────────────────────
function FixtureCard({ partido, equiposFem, fechas }) {
  const localEq = equiposFem.find(e => e.id === partido.equipo_local_id);
  const visitEq = equiposFem.find(e => e.id === partido.equipo_visit_id);
  const fecha   = fechas.find(f => f.id === partido.fecha_id);
  if (!localEq || !visitEq) return null;
  return (
    <div className="fixture-card">
      <div className="fc2-header">
        <span className="fc2-fecha">{fecha ? `Fecha ${fecha.numero}` : 'Próximo'}</span>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {partido.hora_inicio && (
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:'#F0B429', letterSpacing:.5 }}>
              🕐 {String(partido.hora_inicio).slice(0,5)}
            </span>
          )}
          {partido.lugar && <span className="fc2-lugar">📍 {partido.lugar}</span>}
        </div>
      </div>
      <div className="fc2-body">
        <div className="fc2-equipo">
          <img src={localEq.logo} alt={localEq.name} className="fc2-logo" loading="lazy"
            onError={e => { e.target.style.display='none'; }}/>
          <span className="fc2-nombre" style={{ color: localEq.color }}>{localEq.name}</span>
        </div>
        <div className="fc2-vs">VS</div>
        <div className="fc2-equipo fc2-equipo-right">
          <span className="fc2-nombre" style={{ color: visitEq.color }}>{visitEq.name}</span>
          <img src={visitEq.logo} alt={visitEq.name} className="fc2-logo" loading="lazy"
            onError={e => { e.target.style.display='none'; }}/>
        </div>
      </div>
    </div>
  );
}

export function TorneoView({ onSelectPlayer: extSelectPlayer, onSelectTeam: extSelectTeam }) {
  const { mode } = useTournament();
  const {
    equipos: equiposFemenino = [], isLoading: isLoadingStats = false, error: statsError = null,
    partidos = [], fechas = [], statsPorPartido = {},
  } = useStats();
  const { toggleFavorito, esFavorito } = useFavorito();

  const [activeTab,      setActiveTab]      = useState('tabla');
  const [selectedMatch,  setSelectedMatch]  = useState(null); // partido completo o solo ID
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [searchJugadoras,setSearchJugadoras]= useState('');
  const [filterEquipoId, setFilterEquipoId] = useState(null);
  const [tappedCard,     setTappedCard]     = useState(null);
  // Selector de fecha para resultados y fixture
  const [fechaSelId,     setFechaSelId]     = useState(null); // null = todos

  const selectedTeamFem = selectedTeamId
    ? equiposFemenino.find(e => e.id === selectedTeamId) ?? null
    : null;

  const tabKeys = TABS.map(t => t.key);
  const goNextTab = useCallback(() => {
    const i = tabKeys.indexOf(activeTab);
    if (i < tabKeys.length-1) setActiveTab(tabKeys[i+1]);
  }, [activeTab, tabKeys]);
  const goPrevTab = useCallback(() => {
    const i = tabKeys.indexOf(activeTab);
    if (i > 0) setActiveTab(tabKeys[i-1]);
  }, [activeTab, tabKeys]);
  const swipeHandlers = useSwipe({ onSwipeLeft: goNextTab, onSwipeRight: goPrevTab });

  useEffect(() => {
    const handler = e => {
      if (TABS.find(t => t.key === e.detail?.tab)) {
        setActiveTab(e.detail.tab); setSelectedTeamId(null);
      }
    };
    window.addEventListener('star:tab', handler);
    return () => window.removeEventListener('star:tab', handler);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      document.querySelectorAll('.reveal-on-scroll:not(.in-view)').forEach(el => el.classList.add('in-view'));
    }, 80);
    return () => clearTimeout(t);
  }, [activeTab]);

  const handleSelectPlayer = p => { setSelectedPlayer(p); extSelectPlayer?.(p); };
  const handleSelectTeam   = t => { setSelectedTeamId(t.id); extSelectTeam?.(t); };

  // Jugadoras filtradas
  const jugadorasFiltradas = useMemo(() => {
    const q = searchJugadoras.toLowerCase();
    return equiposFemenino.flatMap(team =>
      team.jugadoras
        .filter(j => {
          const matchSearch = !q || j.nombre.toLowerCase().includes(q);
          const matchEq     = !filterEquipoId || team.id === filterEquipoId;
          return matchSearch && matchEq;
        })
        .map(j => ({ ...j, equipo: team.name, equipoColor: team.color, equipoId: team.id, equipoLogo: team.logo }))
    );
  }, [equiposFemenino, searchJugadoras, filterEquipoId]);

  // Partidos filtrados por fecha seleccionada
  const partidosFinalizados = useMemo(() =>
    partidos
      .filter(p => p.estado === 'finalizado')
      .filter(p => !fechaSelId || p.fecha_id === fechaSelId)
      .sort((a,b) => (b.fecha_id??0) - (a.fecha_id??0)),
    [partidos, fechaSelId]);

  const partidosPendientes = useMemo(() =>
    partidos
      .filter(p => p.estado === 'pendiente')
      .filter(p => !fechaSelId || p.fecha_id === fechaSelId)
      .sort((a,b) => (a.fecha_id??0) - (b.fecha_id??0)),
    [partidos, fechaSelId]);

  const modeColor = mode === 'femenino' ? 'var(--fem2)' : 'var(--masc2, #3b82f6)';

  // Chips de fechas
  const FechaChips = ({ modo }) => {
    const relevant = modo === 'resultados' ? partidosFinalizados : partidosPendientes;
    if (fechas.length === 0) return null;
    return (
      <div className="fecha-chips" style={{ marginBottom:16 }}>
        <button
          className={`fecha-chip ${!fechaSelId ? 'active' : ''}`}
          onClick={() => setFechaSelId(null)}
          style={!fechaSelId ? { borderColor: modeColor, color: modeColor } : {}}
        >
          ACUM
        </button>
        {fechas.map(f => (
          <button
            key={f.id}
            className={`fecha-chip ${fechaSelId === f.id ? 'active' : ''}`}
            onClick={() => setFechaSelId(prev => prev === f.id ? null : f.id)}
            style={fechaSelId === f.id ? { borderColor: modeColor, color: modeColor } : {}}
          >
            F{f.numero}
          </button>
        ))}
      </div>
    );
  };

  if (selectedTeamFem && mode === 'femenino') {
    return (
      <TeamPageFem
        team={selectedTeamFem}
        onBack={() => setSelectedTeamId(null)}
        allTeams={equiposFemenino}
        isLoadingStats={isLoadingStats}
        statsPorPartido={statsPorPartido}
        partidos={partidos}
        fechas={fechas}
        onSelectPlayer={handleSelectPlayer}
      />
    );
  }

  return (
    <>
      <GameCenterModal
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        partidoId={selectedMatch}
        mode={mode}
      />
      <PlayerProfileModal
        isOpen={!!selectedPlayer} onClose={() => setSelectedPlayer(null)}
        player={selectedPlayer} statsPorPartido={statsPorPartido}
        partidos={partidos} fechas={fechas}
      />

      <div className="torneo-section" id="torneo-view">
        <div className="torneo-inner">

          {/* Header */}
          <div className="gender-header">
            <div>
              <div className="gender-pill">
                {mode === 'masculino' ? '♂ Categoría Masculina' : '♀ Categoría Femenina'}
              </div>
              <div className="gender-title" style={{ fontSize:'64px', lineHeight:1 }}>
                TORNEO<br/>{mode === 'masculino' ? 'MASCULINO' : 'FEMENINO'}
              </div>
            </div>
            <div style={{ textAlign:'right', paddingTop:'8px' }}>
              <div style={{ fontFamily:"'Barlow Condensed'", fontSize:'14px', fontWeight:'700', letterSpacing:'2px', color:'var(--gray)', textTransform:'uppercase' }}>
                Temporada Regular
              </div>
              <div style={{ fontFamily:"'Bebas Neue'", fontSize:'28px', letterSpacing:'2px', color:modeColor, marginTop:'4px' }}>
                {fechas.length > 0 ? `Fecha ${Math.max(...fechas.map(f=>f.numero))}` : 'Jornada 1'}
              </div>
            </div>
          </div>

          {mode === 'femenino' && <FavoritoCard onSelectTeam={handleSelectTeam}/>}

          {statsError && mode === 'femenino' && (
            <div className="stats-error-banner">
              ⚠️ Error al cargar estadísticas. Reintentando...
            </div>
          )}

          {/* Tabs */}
          <div className="tab-nav">
            {TABS.map(tab => (
              <button key={tab.key} type="button"
                className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                style={activeTab === tab.key ? { color:modeColor, borderBottomColor:modeColor } : {}}
                onClick={() => setActiveTab(tab.key)}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="tab-swipe-dots">
            {TABS.map(t => (
              <span key={t.key}
                className={`tab-dot ${activeTab === t.key ? 'active' : ''}`}
                style={activeTab === t.key ? { background:modeColor, transform:'scale(1.3)' } : {}}
                onClick={() => setActiveTab(t.key)}/>
            ))}
          </div>

          <div {...swipeHandlers} style={{ touchAction:'pan-y' }}>

            {/* ══ TABLA ══ */}
            {activeTab === 'tabla' && (
              <div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ textAlign:'left', paddingLeft:'20px' }}># Equipo</th>
                        <th>PJ</th><th>G</th><th>P</th>
                        <th>PF</th><th>PC</th><th>DIF</th><th>%</th>
                        <th style={{ color:modeColor }}>PTS</th>
                        <th className="th-racha">Forma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mode === 'femenino' ? (
                        [...equiposFemenino]
                          .sort((a,b) => {
                            const pA=a.pg*2, pB=b.pg*2;
                            if (pB!==pA) return pB-pA;
                            const dA=a.pf-a.pc, dB=b.pf-b.pc;
                            if (dB!==dA) return dB-dA;
                            return b.pf-a.pf;
                          })
                          .map((t,idx) => {
                            const pct = t.pj>0 ? (t.pg/t.pj).toFixed(3) : '.000';
                            const dif = t.pf-t.pc;
                            return (
                              <tr key={t.id} className="table-row-clickable" onClick={() => handleSelectTeam(t)}>
                                <td className="team-cell">
                                  <span className={`pos-num ${idx<3?'top3':''}`}>{idx+1}</span>
                                  <img src={t.logo} alt={t.name} loading="lazy" decoding="async"
                                    style={{ width:'26px',height:'26px',borderRadius:'50%',objectFit:'cover',marginRight:'8px' }}
                                    onError={e=>{e.target.style.display='none';}}/>
                                  <span className="team-name-txt">{t.name}</span>
                                  {esFavorito(t.id) && <span className="fav-star">⭐</span>}
                                </td>
                                <td>{t.pj}</td><td>{t.pg}</td><td>{t.pp}</td>
                                <td>{t.pf}</td><td>{t.pc}</td>
                                <td className={dif>=0?'green':'red'}>{dif>0?`+${dif}`:dif}</td>
                                <td className="pct-td">{pct}</td>
                                <td className="pts-td" style={{color:modeColor}}>{t.pg*2}</td>
                                <td className="td-racha">
                                  {t.historial?.slice(-5).map((h,i)=>(
                                    <span key={i} className={`racha-pill ${h.resultado==='G'?'racha-g':'racha-p'}`}>
                                      {h.resultado}
                                    </span>
                                  ))}
                                  {!t.historial?.length && <span className="racha-nd">–</span>}
                                </td>
                              </tr>
                            );
                          })
                      ) : (
                        TEAMS_MASC.map((t,idx) => (
                          <tr key={t.id}>
                            <td className="team-cell">
                              <span className={`pos-num ${idx<3?'top3':''}`}>{idx+1}</span>
                              <img src={t.logo} alt={t.name} loading="lazy" decoding="async"
                                style={{ width:'26px',height:'26px',borderRadius:'50%',objectFit:'cover',marginRight:'8px' }}/>
                              <span className="team-name-txt">{t.name}</span>
                            </td>
                            <td>{t.pg+t.pp}</td><td>{t.pg}</td><td>{t.pp}</td>
                            <td>–</td><td>–</td><td>–</td><td className="pct-td">–</td>
                            <td className="pts-td" style={{color:modeColor}}>{t.pg*2}</td>
                            <td className="td-racha"><span className="racha-nd">–</span></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  {mode === 'femenino' && (
                    <div className="tabla-leyenda">
                      <div className="tabla-leyenda-item">
                        <div className="tabla-leyenda-dot" style={{ background:'rgba(34,197,94,0.5)' }}/>
                        Clasifican a playoffs
                      </div>
                      <div style={{ marginLeft:'auto', fontSize:'11px', color:'var(--gray)' }}>
                        Desempate: PTS → DIF → PF
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══ RESULTADOS ══ */}
            {activeTab === 'resultados' && (
              <div>
                {mode === 'femenino' ? (
                  <>
                    <FechaChips modo="resultados"/>
                    {isLoadingStats ? (
                      <div style={{ padding:'8px 0' }}>
                        {Array.from({length:3}).map((_,i)=>(
                          <div key={i} style={{ background:'#0E1420', border:'1px solid #1C2535', borderRadius:14, padding:16, marginBottom:12 }}>
                            <Skel w={80} h={12} mb={12}/>
                            <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                              <Skel w={44} h={44} radius={22} mb={0}/>
                              <div style={{ flex:1 }}/>
                              <Skel w={60} h={40} mb={0}/>
                              <Skel w={24} h={28} mb={0}/>
                              <Skel w={60} h={40} mb={0}/>
                              <div style={{ flex:1 }}/>
                              <Skel w={44} h={44} radius={22} mb={0}/>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : partidosFinalizados.length === 0 ? (
                      <EmptyState icon="🏀" title="Sin resultados todavía"
                        sub="Los resultados aparecerán acá en cuanto se cargue el primer partido."/>
                    ) : (
                      <div className="results-grid">
                        {partidosFinalizados.map(p => (
                          <MatchResultCard key={p.id} partido={p}
                            equiposFem={equiposFemenino} fechas={fechas}
                            onClick={() => setSelectedMatch(p.id)}/>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyState icon="🏀" title="Resultados del torneo masculino"
                    sub="Próximamente disponibles."/>
                )}
              </div>
            )}

            {/* ══ FIXTURE ══ */}
            {activeTab === 'fixture' && (
              <div>
                {mode === 'femenino' ? (
                  <>
                    <FechaChips modo="fixture"/>
                    {isLoadingStats ? (
                      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                        {Array.from({length:3}).map((_,i)=>(
                          <div key={i} style={{ background:'#0E1420', border:'1px solid #1C2535', borderRadius:14, padding:16 }}>
                            <Skel w={80} h={12} mb={12}/>
                            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                              <Skel w={40} h={40} radius={20} mb={0}/>
                              <Skel w={90} h={16} mb={0}/>
                              <div style={{ flex:1 }}/>
                              <Skel w={40} h={20} mb={0}/>
                              <div style={{ flex:1 }}/>
                              <Skel w={90} h={16} mb={0}/>
                              <Skel w={40} h={40} radius={20} mb={0}/>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : partidosPendientes.length === 0 ? (
                      <EmptyState icon="📅" title="Fixture pendiente de publicación"
                        sub="Los próximos partidos se cargarán cuando se confirme el fixture oficial."/>
                    ) : (
                      <div className="fixture-grid">
                        {partidosPendientes.map(p => (
                          <FixtureCard key={p.id} partido={p}
                            equiposFem={equiposFemenino} fechas={fechas}/>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyState icon="📅" title="Fixture masculino"
                    sub="Se publicará próximamente."/>
                )}
              </div>
            )}

            {/* ══ JUGADORES ══ */}
            {activeTab === 'jugadores' && (
              <div>
                <input type="text" className="search-bar"
                  placeholder={mode==='femenino'?'Buscar jugadora...':'Buscar jugador...'}
                  value={searchJugadoras}
                  onChange={e => setSearchJugadoras(e.target.value)}
                  style={{ marginBottom:'12px' }}/>

                {mode === 'femenino' && (
                  <div className="filter-chips">
                    <button
                      className={`chip ${!filterEquipoId?'chip-active':''}`}
                      style={!filterEquipoId?{borderColor:modeColor,color:modeColor}:{}}
                      onClick={() => setFilterEquipoId(null)}>
                      Todos
                    </button>
                    {equiposFemenino.map(eq => (
                      <button key={eq.id}
                        className={`chip ${filterEquipoId===eq.id?'chip-active':''}`}
                        style={filterEquipoId===eq.id?{borderColor:eq.color,color:eq.color,background:`${eq.color}15`}:{}}
                        onClick={() => setFilterEquipoId(prev => prev===eq.id?null:eq.id)}>
                        <img src={eq.logo} alt="" loading="lazy" decoding="async"
                          style={{ width:'16px',height:'16px',borderRadius:'50%',objectFit:'cover' }}
                          onError={e=>{e.target.style.display='none';}}/>
                        {eq.name}
                      </button>
                    ))}
                  </div>
                )}

                <div className="jugadoras-count" style={{ marginBottom:'16px' }}>
                  {jugadorasFiltradas.length} {mode==='femenino'?'jugadoras':'jugadores'}
                </div>

                <div className="players-grid">
                  {mode === 'femenino' ? (
                    jugadorasFiltradas.length === 0 ? (
                      <div style={{ gridColumn:'1/-1' }}>
                        <EmptyState icon="🔍" title={`Sin resultados para "${searchJugadoras}"`}
                          sub="Probá con otro nombre o equipo" showIG={false}/>
                      </div>
                    ) : (
                      jugadorasFiltradas.map(j => (
                        <div className="player-item" key={j.id}
                          onClick={() => handleSelectPlayer({
                            ...j,
                            id: j.id, name: j.nombre, team: j.equipo,
                            fechaNac: j.fechaNac, equipoId: j.equipoId,
                          })}>
                          <div className="player-item-avatar"
                            style={{ background:`${j.equipoColor}22`, border:`1.5px solid ${j.equipoColor}55` }}>
                            <span style={{ fontFamily:"'Barlow Condensed'",fontSize:'14px',fontWeight:'700',color:j.equipoColor }}>
                              {j.nombre.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                          <div className="player-item-info">
                            <div className="player-item-name">{j.nombre}</div>
                            <div className="player-item-team">{j.equipo}</div>
                            {(j.pts_prom??0) > 0 && (
                              <div className="player-item-stats">
                                <span style={{ color:'#F0B429' }}>{j.pts_prom} PTS</span>
                                <span style={{ color:'#4A566E' }}> · </span>
                                <span>{j.reb_prom} REB</span>
                                <span style={{ color:'#4A566E' }}> · </span>
                                <span>{j.ast_prom} AST</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )
                  ) : (
                    [1,2,3,4,5,6].map(i => (
                      <div className="player-item" key={i}
                        onClick={() => handleSelectPlayer({ id:i,name:`Jugador ${i}`,team:'Black Mambas',pts:0,reb:0,ast:0 })}>
                        <div className="player-item-avatar">
                          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width:'20px',color:'var(--gray)' }}>
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          </svg>
                        </div>
                        <div className="player-item-info">
                          <div className="player-item-name">Jugador {i}</div>
                          <div className="player-item-team">Black Mambas</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ══ EQUIPOS ══ */}
            {activeTab === 'equipos' && (
              <div className="teams-grid">
                {mode === 'femenino' ? (
                  equiposFemenino.map(team => (
                    <div
                      className={`flip-card${tappedCard===team.id?' tapped':''}`}
                      key={team.id}
                      onClick={() => {
                        const isTouch = window.matchMedia('(hover: none)').matches;
                        if (isTouch && tappedCard !== team.id) setTappedCard(team.id);
                        else { setTappedCard(null); handleSelectTeam(team); }
                      }}
                      onMouseLeave={() => setTappedCard(null)}>
                      <button
                        className={`fc-fav-btn ${esFavorito(team.id)?'active':''}`}
                        onClick={e => { e.stopPropagation(); toggleFavorito(team.id); }}
                        title={esFavorito(team.id)?'Quitar favorito':'Marcar como favorito'}>
                        {esFavorito(team.id)?'⭐':'☆'}
                      </button>
                      <div className="flip-card-inner">
                        <div className="flip-card-front">
                          <div className="fc-logo-wrap" style={{ borderColor:team.color }}>
                            <img src={team.logo} alt={team.name} className="fc-logo-img" loading="lazy" decoding="async"
                              onError={e=>{e.target.style.background='var(--dark4)';}}/>
                          </div>
                          <h3 className="fc-name">{team.name}</h3>
                          <div className="fc-subtitle">{team.jugadoras.length} jugadoras</div>
                          {team.pj > 0 && (
                            <div style={{ marginTop:6, fontSize:13, color:team.color, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1 }}>
                              {team.pg}G — {team.pp}P
                            </div>
                          )}
                        </div>
                        <div className="flip-card-back">
                          <img src={team.logo} alt="bg" className="fc-back-logo" loading="lazy" decoding="async"/>
                          <div className="fc-record-label">RÉCORD ACTUAL</div>
                          <div className="fc-record-val" style={{ color:team.color }}>{team.pg} - {team.pp}</div>
                          <div className="fc-team-name">{team.name}</div>
                          <div style={{ marginTop:'12px', fontSize:'13px', fontFamily:"'Barlow Condensed'", color:'var(--gray)', letterSpacing:'1px' }}>
                            TAP PARA VER PLANTEL
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  TEAMS_MASC.map(team => (
                    <div className={`flip-card${tappedCard===team.id?' tapped':''}`} key={team.id}
                      onClick={() => {
                        const isTouch = window.matchMedia('(hover: none)').matches;
                        if (isTouch) setTappedCard(tappedCard===team.id?null:team.id);
                      }}
                      onMouseLeave={() => setTappedCard(null)}>
                      <div className="flip-card-inner">
                        <div className="flip-card-front">
                          <div className="fc-logo-wrap" style={{ borderColor:team.color }}>
                            <img src={team.logo} alt={team.name} className="fc-logo-img" loading="lazy" decoding="async"/>
                          </div>
                          <h3 className="fc-name">{team.name}</h3>
                          <div className="fc-subtitle">{team.pg}G - {team.pp}P</div>
                        </div>
                        <div className="flip-card-back">
                          <img src={team.logo} alt="bg" className="fc-back-logo" loading="lazy" decoding="async"/>
                          <div className="fc-record-label">RÉCORD ACTUAL</div>
                          <div className="fc-record-val" style={{ color:team.color }}>{team.record}</div>
                          <div className="fc-team-name">{team.name}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
