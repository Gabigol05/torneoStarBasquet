import { useState, useEffect, useMemo } from 'react';
import { PlayerProfileModal, GameCenterModal } from './LazyModals';
import { labelFecha, labelPartido, esPartidoPlayoff } from '../lib/fechaLabel';
import { EscudoJugador } from './EscudoJugador.jsx';
import { TablaZona, ordenarTabla, tablaFechaAnterior } from './TablaPosiciones.jsx';
import { edadDesde } from '../lib/edad';

// Alpha en hex de 2 digitos, concatenado directo al color (igual que en las
// tarjetas de fixture/resultado/lider/bracket) — evita color-mix()/variables
// CSS con alpha dinamico, que no anda bien en navegadores viejos de celulares.
const hexA = (hex, alpha) => `${hex}${alpha}`;

// Últimos N resultados de un equipo
function getRacha(historial, n = 5) {
  if (!historial?.length) return [];
  return historial.slice(-n).map(p => p.resultado);
}

// ── SKELETON ────────────────────────────────────────────────────────────────
function StatSkeleton() {
  return (
    <span style={{
      display: 'inline-block', width: '28px', height: '20px',
      background: 'rgba(255,255,255,0.08)', borderRadius: '4px',
      animation: 'pulse 1.5s ease-in-out infinite',
    }}/>
  );
}

export function TeamPageFem({ team, onBack, allTeams, isLoadingStats, statsPorPartido, partidos, fechas, onSelectPlayer, mode = 'femenino', usaZonas = false }) {
  const esFem = mode === 'femenino';
  const [activeTab,      setActiveTab]      = useState('jugadoras');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [selectedMatch,  setSelectedMatch]  = useState(null);

  if (!team) return null;

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Reveal-on-scroll al cambiar tab
  useEffect(() => {
    const timer = setTimeout(() => {
      const els = document.querySelectorAll('.reveal-on-scroll:not(.in-view)');
      const observer = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) { e.target.classList.add('in-view'); observer.unobserve(e.target); }
        });
      }, { threshold: 0.1 });
      els.forEach(el => observer.observe(el));
      return () => observer.disconnect();
    }, 50);
    return () => clearTimeout(timer);
  }, [activeTab, team.id]);

  const filteredJugadoras = useMemo(() =>
    team.jugadoras.filter(j => j.nombre.toLowerCase().includes(searchQuery.toLowerCase())),
    [team.jugadoras, searchQuery]);

  // ⚠️ FIX: useMemo para no re-sortear en cada render
  const sortedTeams = useMemo(() =>
    [...allTeams].sort((a, b) => {
      const ptsA = a.pg * 2 + a.pp, ptsB = b.pg * 2 + b.pp;
      if (ptsB !== ptsA) return ptsB - ptsA;
      const difA = a.pf - a.pc, difB = b.pf - b.pc;
      if (difB !== difA) return difB - difA;
      return b.pf - a.pf;
    }),
    [allTeams]);

  const posicion = sortedTeams.findIndex(t => t.id === team.id) + 1;
  // Tabla de la ZONA del equipo (si la temporada se juega por zonas), que es
  // la que define la clasificación — la general mezclaba las dos zonas.
  const zonaEquipo = usaZonas && team.zona ? team.zona : null;
  const tablaEquipo = useMemo(
    () => ordenarTabla(zonaEquipo ? allTeams.filter(t => t.zona === zonaEquipo) : allTeams),
    [allTeams, zonaEquipo]);
  const posicionZona = tablaEquipo.findIndex(t => t.id === team.id) + 1;
  const tablaAnterior = useMemo(() => tablaFechaAnterior(partidos, fechas), [partidos, fechas]);
  const pct      = team.pj > 0 ? (team.pg / team.pj).toFixed(3) : '.000';
  const dif      = team.pf - team.pc;

  // ⚠️ FIX: handler que también propaga al padre si existe
  const handleSelectPlayer = (playerData) => {
    setSelectedPlayer(playerData);
    onSelectPlayer?.(playerData);
  };

  return (
    <>
      <PlayerProfileModal
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        player={selectedPlayer}
        statsPorPartido={statsPorPartido}
        partidos={partidos}
        fechas={fechas}
        mode={mode}
      />

      <GameCenterModal
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        partidoId={selectedMatch}
        mode={mode}
      />

      <div className="team-page-overlay">
        <div className="team-page-container">

          {/* ── HEADER ── */}
          <div className="team-page-header" style={{ '--team-color': team.color }}>
            <button className="team-page-back" onClick={onBack}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              Equipos
            </button>

            <div className="team-page-hero">
              <div className="team-page-logo-wrap"
                style={{ borderColor: team.color, boxShadow: `0 0 40px ${team.color}55` }}>
                <img src={team.logo} alt={team.name} className="team-page-logo-img"
                  loading="lazy" decoding="async"
                  onError={e => { e.target.style.display = 'none'; }}/>
              </div>
              <div className="team-page-hero-info">
                <div className="team-page-name">{team.name}</div>
                <div className="team-page-record" style={{ color: team.color }}>
                  {team.pg}G — {team.pp}P
                </div>
                {/* Racha: últimos 5 partidos, del más viejo (izquierda) al más
                    reciente (derecha). Al pasar el mouse muestra el rival y el
                    marcador. */}
                {team.historial?.length > 0 && (() => {
                  const ultimos = team.historial.slice(-5);
                  return (
                    <div className="team-forma">
                      <span className="team-forma-label">Últimos {ultimos.length}</span>
                      <div className="team-forma-pills">
                        {ultimos.map((p, i) => (
                          <span key={i}
                            className={`team-forma-pill ${p.resultado === 'G' ? 'is-g' : 'is-p'}`}
                            title={`${p.resultado === 'G' ? 'Ganó' : 'Perdió'} ${p.pf}-${p.pc} vs ${p.rival}`}>
                            {p.resultado}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}
                <div className="team-page-meta">
                  <span className="team-page-badge">
                    <span className="team-page-badge-dot" style={{ background: esFem ? 'var(--fem2)' : 'var(--masc2, #3b82f6)' }}/>
                    {esFem ? 'Torneo Femenino' : 'Torneo Masculino'}
                  </span>
                  <span className="team-page-badge team-page-badge--pos"
                    style={{ background: `${team.color}1f`, borderColor: `${team.color}80`, color: team.color, boxShadow: `0 0 16px -6px ${team.color}` }}>
                    {posicionZona === 1 ? '🏆 ' : ''}{posicionZona}° {zonaEquipo ? `Zona ${zonaEquipo}` : 'en la tabla'}
                  </span>
                  {isLoadingStats && (
                    <span className="team-page-badge" style={{ color: 'var(--gray)' }}>
                      ↻ Actualizando stats...
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* TABS */}
            <div className="team-page-tabs">
              {[
                { key: 'jugadoras',  label: esFem ? '👥 Jugadoras' : '👥 Jugadores'  },
                { key: 'resultados', label: '📋 Resultados' },
                { key: 'proximos',   label: '📅 Próximos'   },
                { key: 'tabla',      label: '📊 Posición'   },
              ].map(tab => (
                <button key={tab.key}
                  className={`team-page-tab ${activeTab === tab.key ? 'active' : ''}`}
                  style={activeTab === tab.key ? { borderBottomColor: team.color, color: team.color } : {}}
                  onClick={() => setActiveTab(tab.key)}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── BODY ── */}
          <div className="team-page-body">

            {/* ── JUGADORAS ── */}
            {activeTab === 'jugadoras' && (
              <div>
                <input type="text" className="search-bar"
                  placeholder={esFem ? 'Buscar jugadora...' : 'Buscar jugador...'}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ marginBottom: '20px' }}/>
                <div className="tp-jugadoras-count">
                  {filteredJugadoras.length} {esFem ? 'jugadoras inscriptas' : 'jugadores inscriptos'}
                </div>

                <div className="tp-jugadoras-grid">
                  {filteredJugadoras.map((j, idx) => (
                    <div key={j.id}
                      className={`tp-player-card reveal-on-scroll delay-${Math.min((idx % 5) + 1, 5)}`}
                      style={{ '--team-color': team.color, background: `linear-gradient(160deg, ${hexA(team.color, '60')}, #1C2535 60%)` }}
                      onClick={() => handleSelectPlayer({
                        id:          j.id,
                        name:        j.nombre,
                        team:        team.name,
                        equipoId:    team.id,
                        fechaNac:    j.fechaNac,
                        color:       team.color,
                        pj:          j.pj          ?? 0,
                        pts_prom:    j.pts_prom     ?? j.pts ?? 0,
                        reb_prom:    j.reb_prom     ?? j.reb ?? 0,
                        ast_prom:    j.ast_prom     ?? j.ast ?? 0,
                        rob_prom:    j.rob_prom     ?? j.rob ?? 0,
                        tap_prom:    j.tap_prom     ?? j.tap ?? 0,
                        per_prom:    j.per_prom     ?? 0,
                        val_prom:    j.val_prom     ?? 0,
                        pct_simples: j.pct_simples  ?? j.tlp ?? 0,
                        pct_dobles:  j.pct_dobles   ?? j.fgp ?? 0,
                        pct_triples: j.pct_triples  ?? j.tpp ?? 0,
                        mejor_pts:   j.mejor_pts    ?? 0,
                        pts_total:   j.pts_total    ?? 0,
                        reb_total:   j.reb_total    ?? 0,
                        ast_total:   j.ast_total    ?? 0,
                        rob_total:   j.rob_total    ?? 0,
                        tap_total:   j.tap_total    ?? 0,
                        val_total:   j.val_total    ?? 0,
                        per_total:   j.per_total    ?? 0,
                        pts: j.pts_prom ?? j.pts ?? 0,
                        reb: j.reb_prom ?? j.reb ?? 0,
                        ast: j.ast_prom ?? j.ast ?? 0,
                        rob: j.rob_prom ?? j.rob ?? 0,
                        tap: j.tap_prom ?? j.tap ?? 0,
                        sc_total: j.sc_total ?? 0, sf_total: j.sf_total ?? 0,
                        dc_total: j.dc_total ?? 0, df_total: j.df_total ?? 0,
                        tc_total: j.tc_total ?? 0, tf_total: j.tf_total ?? 0,
                        sc_prom:  j.sc_prom  ?? 0, dc_prom: j.dc_prom ?? 0,
                        tc_prom:  j.tc_prom  ?? 0,
                      })}>
                      <div className="tp-player-card-inner" style={{ background: `linear-gradient(160deg, ${hexA(team.color, '12')}, #0B111C 55%)` }}>

                      {/* Avatar: escudo del equipo hasta que haya fotos */}
                      <div className="tp-player-avatar" style={{ borderColor: team.color, color: team.color, background: `${team.color}15`, boxShadow: `0 0 12px ${hexA(team.color, '59')}` }}>
                        <EscudoJugador logo={team.logo} equipoId={team.id} nombre={j.nombre} color={team.color}/>
                      </div>

                      {/* Info */}
                      <div className="tp-player-info">
                        <div className="tp-player-name">{j.nombre}</div>
                        <div className="tp-player-dob">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8"  y1="2" x2="8"  y2="6"/>
                            <line x1="3"  y1="10" x2="21" y2="10"/>
                          </svg>
                          {/* ⚠️ Privacidad: edad en vez de la fecha de
                              nacimiento completa (ver lib/edad.js) */}
                          {edadDesde(j.fechaNac) != null ? `${edadDesde(j.fechaNac)} años` : 'Sin datos'}
                        </div>
                      </div>

                      {/* Stats mini */}
                      <div className="tp-player-stats-mini">
                        {[
                          { lbl: 'PTS', val: j.pts, accent: true },
                          { lbl: 'REB', val: j.reb },
                          { lbl: 'AST', val: j.ast },
                        ].map(({ lbl, val, accent }) => (
                          <div key={lbl} className="tp-stat-mini">
                            <span className="tp-stat-mini-val" style={accent ? { color: team.color } : {}}>
                              {isLoadingStats && (val ?? 0) === 0 ? <StatSkeleton/> : (val ?? 0)}
                            </span>
                            <span className="tp-stat-mini-lbl">{lbl}</span>
                          </div>
                        ))}
                      </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ⚠️ FIX: empty state si no hay resultados de búsqueda */}
                {filteredJugadoras.length === 0 && searchQuery && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7A99' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                    <div>Sin resultados para "{searchQuery}"</div>
                  </div>
                )}
              </div>
            )}

            {/* ── RESULTADOS ── */}
            {activeTab === 'resultados' && (
              <div>
                <div className="tp-section-label">Historial de partidos</div>
                {team.historial.length === 0 ? (
                  <div className="tp-empty-state">
                    <div className="tp-empty-icon">🏀</div>
                    <div className="tp-empty-text">Aún no hay partidos jugados</div>
                    <div className="tp-empty-sub">Los resultados aparecerán aquí cuando comience el torneo</div>
                  </div>
                ) : (
                  <div className="hx">
                    {/* Historial (rediseño 23/11): franja verde/roja según el
                        resultado, escudo del rival, marcador grande, cuartos
                        con quién ganó cada uno, día y goleador si hay stats. */}
                    <div className="hx-resumen">
                      <span>{team.historial.length} {team.historial.length === 1 ? 'partido' : 'partidos'}</span>
                      <span className="hx-g">{team.historial.filter(h => h.resultado === 'G').length} G</span>
                      <span className="hx-p">{team.historial.filter(h => h.resultado !== 'G').length} P</span>
                    </div>
                    {[...team.historial].reverse().map((h, idx) => {
                      const partidoFull = partidos?.find(p => p.id === h.partidoId);
                      const esLocal     = partidoFull?.equipo_local_id === team.id;
                      const fechaObj    = fechas?.find(f => f.id === h.fechaId);
                      const rivalId     = partidoFull ? (esLocal ? partidoFull.equipo_visit_id : partidoFull.equipo_local_id) : null;
                      const rivalTeam   = allTeams?.find(t => t.id === rivalId) ?? allTeams?.find(t => t.name === h.rival);
                      const cRival      = rivalTeam?.color ?? '#5A6B85';
                      const playoff     = esPartidoPlayoff(partidoFull);
                      const gano        = h.resultado === 'G';
                      const suma = lado => ['q1','q2','q3','q4','ot'].reduce((a, q) => a + (partidoFull?.[`${q}_${lado}`] ?? 0), 0);
                      // pf/pc desde los cuartos si vinieron en 0 y hay parciales
                      const pf = h.pf || suma(esLocal ? 'local' : 'visit');
                      const pc = h.pc || suma(esLocal ? 'visit' : 'local');
                      const dia = partidoFull?.fecha_partido ?? fechaObj?.fecha_dia ?? null;
                      const diaTxt = dia ? (() => {
                        const d = new Date(`${dia}T12:00:00`);
                        return `${['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.getDay()]} ${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
                      })() : null;
                      const cuartos = partidoFull ? ['q1','q2','q3','q4','ot']
                        .map(q => [q, esLocal ? partidoFull[`${q}_local`] : partidoFull[`${q}_visit`], esLocal ? partidoFull[`${q}_visit`] : partidoFull[`${q}_local`]])
                        .filter(([q, a, b]) => q !== 'ot' || (a ?? 0) > 0 || (b ?? 0) > 0) : [];
                      // Goleador del equipo en ese partido (solo si las stats del partido están cargadas)
                      const statsP = statsPorPartido?.[h.partidoId];
                      let goleador = null;
                      if (statsP) {
                        for (const j of team.jugadoras ?? []) {
                          const st = statsP[j.id];
                          if (st && (st.pts ?? 0) > (goleador?.pts ?? 0)) goleador = { nombre: j.nombre, pts: st.pts };
                        }
                      }
                      return (
                        <div key={idx} role={h.partidoId ? 'button' : undefined} tabIndex={h.partidoId ? 0 : undefined}
                          className={`hx-card ${gano ? 'is-g' : 'is-p'}${playoff ? ' is-playoff' : ''}${h.partidoId ? ' is-link' : ''}`}
                          style={{ backgroundImage: `linear-gradient(100deg, ${hexA(cRival, '1c')}, transparent 55%)` }}
                          onClick={() => h.partidoId && setSelectedMatch(h.partidoId)}
                          onKeyDown={e => { if (h.partidoId && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setSelectedMatch(h.partidoId); } }}>
                          <div className="hx-top">
                            <span className={`hx-fecha${playoff ? ' is-playoff' : ''}`}>
                              {playoff ? '🏆 ' : ''}
                              {partidoFull ? (labelPartido(partidoFull, fechaObj) ?? '') : (fechaObj ? labelFecha(fechaObj) : '')}
                            </span>
                            {diaTxt && <span className="hx-dia">{diaTxt}</span>}
                          </div>
                          <div className="hx-main">
                            <span className="hx-rival">
                              <span className="hx-escudo" style={{ borderColor: cRival }}>
                                {rivalTeam?.logo && <img src={rivalTeam.logo} alt="" loading="lazy" decoding="async"
                                  onError={e => { e.target.style.visibility = 'hidden'; }}/>}
                              </span>
                              <span className="hx-rival-txt"><small>{partidoFull && !esLocal ? '@' : 'vs'}</small>{h.rival}</span>
                            </span>
                            <span className="hx-marcador">
                              <b className={gano ? 'is-g' : 'is-p'}>{pf}</b><i>-</i><b>{pc}</b>
                            </span>
                            <span className={`hx-res ${gano ? 'is-g' : 'is-p'}`} title={gano ? 'Ganó' : 'Perdió'}>{gano ? 'G' : 'P'}</span>
                          </div>
                          {(cuartos.length > 0 || goleador) && (
                            <div className="hx-cuartos">
                              {cuartos.map(([q, a, b]) => (
                                <span key={q} className={`hx-q ${(a ?? 0) > (b ?? 0) ? 'is-g' : (a ?? 0) < (b ?? 0) ? 'is-p' : ''}`}>
                                  <small>{q.toUpperCase()}</small>{a ?? 0}<i>-</i>{b ?? 0}
                                </span>
                              ))}
                              {goleador && <span className="hx-gol">⭐ Goleador: {goleador.nombre} ({goleador.pts})</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── PRÓXIMOS ── */}
            {activeTab === 'proximos' && (
              <div>
                <div className="tp-section-label">Próximos Partidos</div>
                {team.proximos.length === 0 ? (
                  <div className="tp-empty-state">
                    <div className="tp-empty-icon">📅</div>
                    <div className="tp-empty-text">Fixture pendiente</div>
                    <div className="tp-empty-sub">Los próximos partidos aparecerán aquí cuando se cargue el fixture</div>
                  </div>
                ) : (
                  <div className="tp-matches-list">
                    {team.proximos.map((p, idx) => {
                      const rivalTeam = allTeams?.find(t => t.name === p.rival);
                      const cRival    = rivalTeam?.color ?? '#5A6B85';
                      return (
                        <div key={idx} className="tp-match-card upcoming"
                          style={{ background: `linear-gradient(115deg, ${hexA(team.color, '55')}, #1C2535 45%, ${hexA(cRival, '55')})` }}>
                          <div className="tp-match-card-inner" style={{ background: `linear-gradient(135deg, ${hexA(team.color, '14')}, #0B111C 45%, ${hexA(cRival, '14')})` }}>
                          <div className="tp-match-header">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span className="tp-match-date" style={p.esPlayoff ? { color: '#F0B429' } : {}}>
                                {p.esPlayoff ? '🏆 ' : ''}
                                {p.esPlayoff
                                  ? (labelPartido({ es_playoff:true, copa:p.copa, instancia:p.instancia }) ?? 'Próximo')
                                  : ((p.fechaNum || p.fechaDesc)
                                      ? labelFecha({ numero: p.fechaNum, descripcion: p.fechaDesc })
                                      : 'Próximo')}
                              </span>
                              {p.hora && (
                                <span style={{ fontSize: 12, color: '#F0B429', fontFamily: "'Bebas Neue',sans-serif", letterSpacing: .5 }}>
                                  🕐 {p.hora}
                                </span>
                              )}
                            </div>
                            <span className="tp-match-result upcoming">PRÓXIMO</span>
                          </div>
                          <div className="tp-match-info">
                            <span className="tp-match-teams">vs {p.rival}</span>
                            {p.lugar && <span className="tp-match-lugar">📍 {p.lugar}</span>}
                          </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── TABLA / POSICIÓN ── */}
            {activeTab === 'tabla' && (
              <div>
                <div className="tp-section-label">Posición en la tabla</div>
                <div className="tp-tabla-equipo">
                  <TablaZona
                    titulo={zonaEquipo ? `Zona ${zonaEquipo}` : 'Tabla general'}
                    lista={tablaEquipo}
                    anterior={tablaAnterior}
                    modeColor={esFem ? 'var(--fem2)' : 'var(--masc2, #3b82f6)'}
                    destacadoId={team.id}
                    vacio="Sin equipos en esta temporada"/>
                </div>

                {/* Stats del equipo en cards */}
                <div className="tp-team-stats-grid">
                  {[
                    { lbl: 'Partidos Jugados', val: team.pj },
                    { lbl: 'Victorias',        val: team.pg },
                    { lbl: 'Derrotas',         val: team.pp },
                    { lbl: 'Pts Favor',        val: team.pf },
                    { lbl: 'Pts Contra',       val: team.pc },
                    { lbl: 'Diferencia',       val: dif > 0 ? `+${dif}` : dif },
                    { lbl: 'Efectividad',      val: pct },
                    { lbl: esFem ? 'Jugadoras' : 'Jugadores', val: team.jugadoras.length },
                  ].map((s, i) => (
                    <div key={i} className="tp-team-stat-box" style={{ background: `linear-gradient(160deg, ${hexA(team.color, '60')}, #1C2535 60%)` }}>
                      <div className="tp-team-stat-box-inner" style={{ background: `linear-gradient(160deg, ${hexA(team.color, '12')}, #0B111C 55%)` }}>
                        <div className="tp-team-stat-val" style={{ color: team.color }}>
                          {isLoadingStats && typeof s.val === 'number' && s.val === 0
                            ? <StatSkeleton/>
                            : s.val}
                        </div>
                        <div className="tp-team-stat-lbl">{s.lbl}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}