import { useState, useEffect, useMemo } from 'react';
import { PlayerProfileModal } from './PlayerProfileModal';
import { GameCenterModal } from './GameCenterModal';

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

export function TeamPageFem({ team, onBack, allTeams, isLoadingStats, statsPorPartido, partidos, fechas, onSelectPlayer }) {
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
      const ptsA = a.pg * 2, ptsB = b.pg * 2;
      if (ptsB !== ptsA) return ptsB - ptsA;
      const difA = a.pf - a.pc, difB = b.pf - b.pc;
      if (difB !== difA) return difB - difA;
      return b.pf - a.pf;
    }),
    [allTeams]);

  const posicion = sortedTeams.findIndex(t => t.id === team.id) + 1;
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
      />

      <GameCenterModal
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        partidoId={selectedMatch}
        mode="femenino"
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
                {team.historial?.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                    {getRacha(team.historial).map((r, i) => (
                      <span key={i} className={`racha-pill ${r === 'G' ? 'racha-g' : 'racha-p'}`}>{r}</span>
                    ))}
                  </div>
                )}
                <div className="team-page-meta">
                  <span className="team-page-badge">♀ Torneo Femenino</span>
                  <span className="team-page-badge"
                    style={{ background: `${team.color}22`, borderColor: `${team.color}55`, color: team.color }}>
                    #{posicion} en la tabla
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
                { key: 'jugadoras',  label: '👥 Jugadoras'  },
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
                  placeholder="Buscar jugadora..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ marginBottom: '20px' }}/>
                <div className="tp-jugadoras-count">
                  {filteredJugadoras.length} jugadoras inscriptas
                </div>

                <div className="tp-jugadoras-grid">
                  {filteredJugadoras.map((j, idx) => (
                    <div key={j.id}
                      className={`tp-player-card reveal-on-scroll delay-${Math.min((idx % 5) + 1, 5)}`}
                      style={{ '--team-color': team.color }}
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

                      {/* Avatar con iniciales en lugar de SVG genérico */}
                      <div className="tp-player-avatar" style={{ borderColor: team.color, color: team.color, background: `${team.color}15` }}>
                        <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: '13px', fontWeight: 700 }}>
                          {j.nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                        </span>
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
                          {j.fechaNac ?? 'Sin datos'}
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
                <div className="tp-section-label">Historial de Partidos</div>
                {team.historial.length === 0 ? (
                  <div className="tp-empty-state">
                    <div className="tp-empty-icon">🏀</div>
                    <div className="tp-empty-text">Aún no hay partidos jugados</div>
                    <div className="tp-empty-sub">Los resultados aparecerán aquí cuando comience el torneo</div>
                  </div>
                ) : (
                  <div className="tp-matches-list">
                    {[...team.historial].reverse().map((h, idx) => {
                      const partidoFull = partidos?.find(p => p.id === h.partidoId);
                      const esLocal     = partidoFull?.equipo_local_id === team.id;
                      const fechaObj    = fechas?.find(f => f.id === h.fechaId);

                      // ⚠️ FIX: calcular pf/pc desde cuartos si son 0 y hay parciales
                      const pf = h.pf || (esLocal
                        ? ((partidoFull?.q1_local??0)+(partidoFull?.q2_local??0)+(partidoFull?.q3_local??0)+(partidoFull?.q4_local??0)+(partidoFull?.ot_local??0))
                        : ((partidoFull?.q1_visit??0)+(partidoFull?.q2_visit??0)+(partidoFull?.q3_visit??0)+(partidoFull?.q4_visit??0)+(partidoFull?.ot_visit??0)));
                      const pc = h.pc || (esLocal
                        ? ((partidoFull?.q1_visit??0)+(partidoFull?.q2_visit??0)+(partidoFull?.q3_visit??0)+(partidoFull?.q4_visit??0)+(partidoFull?.ot_visit??0))
                        : ((partidoFull?.q1_local??0)+(partidoFull?.q2_local??0)+(partidoFull?.q3_local??0)+(partidoFull?.q4_local??0)+(partidoFull?.ot_local??0)));

                      return (
                        <div key={idx}
                          className={`tp-match-card ${h.resultado === 'G' ? 'win' : 'loss'}`}
                          style={{ '--team-color': team.color, cursor: h.partidoId ? 'pointer' : 'default' }}
                          onClick={() => h.partidoId && setSelectedMatch(h.partidoId)}>
                          <div className="tp-match-header">
                            <span className="tp-match-date">
                              {fechaObj ? `Fecha ${fechaObj.numero}` : ''}
                            </span>
                            <span className={`tp-match-result ${h.resultado === 'G' ? 'win' : 'loss'}`}>
                              {h.resultado === 'G' ? 'GANÓ' : 'PERDIÓ'}
                            </span>
                          </div>
                          <div className="tp-match-info">
                            <span className="tp-match-teams">vs {h.rival}</span>
                            <span className="tp-match-score"
                              style={{ color: h.resultado === 'G' ? '#22D07A' : '#F04060' }}>
                              {pf} – {pc}
                            </span>
                          </div>
                          {/* Parciales */}
                          {partidoFull && (
                            <div className="tp-match-parciales">
                              {['q1', 'q2', 'q3', 'q4'].map(q => {
                                const mio   = esLocal ? partidoFull[`${q}_local`] : partidoFull[`${q}_visit`];
                                const rival = esLocal ? partidoFull[`${q}_visit`] : partidoFull[`${q}_local`];
                                const ganoQ = (mio ?? 0) > (rival ?? 0);
                                return (
                                  <div key={q} className="tp-parcial">
                                    <span className="tp-parcial-lbl">{q.toUpperCase()}</span>
                                    <span className="tp-parcial-val" style={{ color: ganoQ ? '#22D07A' : '#EEF2F8' }}>{mio ?? 0}</span>
                                    <span className="tp-parcial-sep">-</span>
                                    <span className="tp-parcial-val" style={{ color: !ganoQ ? '#22D07A' : '#6B7A99' }}>{rival ?? 0}</span>
                                  </div>
                                );
                              })}
                              {((esLocal ? partidoFull.ot_local : partidoFull.ot_visit) ?? 0) > 0 && (
                                <div className="tp-parcial">
                                  <span className="tp-parcial-lbl" style={{ color: '#F0B429' }}>OT</span>
                                  <span className="tp-parcial-val">{esLocal ? partidoFull.ot_local : partidoFull.ot_visit}</span>
                                  <span className="tp-parcial-sep">-</span>
                                  <span className="tp-parcial-val">{esLocal ? partidoFull.ot_visit : partidoFull.ot_local}</span>
                                </div>
                              )}
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
                    {team.proximos.map((p, idx) => (
                      <div key={idx} className="tp-match-card upcoming" style={{ '--team-color': team.color }}>
                        <div className="tp-match-header">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span className="tp-match-date">
                              {p.fechaDesc ?? (p.fechaNum ? `Fecha ${p.fechaNum}` : 'Próximo')}
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
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TABLA / POSICIÓN ── */}
            {activeTab === 'tabla' && (
              <div>
                <div className="tp-section-label">Posición en la Tabla</div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', paddingLeft: '20px' }}># Equipo</th>
                        <th>PJ</th><th>G</th><th>P</th>
                        <th>PF</th><th>PC</th><th>DIF</th><th>%</th>
                        <th className="th-racha">Forma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTeams.map((t, idx) => {
                        const isMe = t.id === team.id;
                        const tPct = t.pj > 0 ? (t.pg / t.pj).toFixed(3) : '.000';
                        const tDif = t.pf - t.pc;
                        return (
                          <tr key={t.id} className={isMe ? 'highlight-row' : ''}>
                            <td className="team-cell">
                              <span className={`pos-num ${idx < 3 ? 'top3' : ''}`}>{idx + 1}</span>
                              <img src={t.logo} alt={t.name}
                                style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', marginRight: '6px' }}
                                onError={e => { e.target.style.display = 'none'; }}/>
                              <span className="team-name-txt" style={isMe ? { color: team.color, fontWeight: 700 } : {}}>
                                {t.name}
                              </span>
                              {isMe && (
                                <span className="tp-you-badge" style={{ background: team.color }}>▶ VOS</span>
                              )}
                            </td>
                            <td>{t.pj}</td><td>{t.pg}</td><td>{t.pp}</td>
                            <td>{t.pf}</td><td>{t.pc}</td>
                            <td className={tDif >= 0 ? 'green' : 'red'}>{tDif > 0 ? `+${tDif}` : tDif}</td>
                            <td className="pct-td">{tPct}</td>
                            <td className="td-racha">
                              {/* ⚠️ FIX: usar historial, no partidos */}
                              {getRacha(t.historial).map((r, i) => (
                                <span key={i} className={`racha-pill ${r === 'G' ? 'racha-g' : 'racha-p'}`}>{r}</span>
                              ))}
                              {!t.historial?.length && <span className="racha-nd">–</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
                    { lbl: 'Jugadoras',        val: team.jugadoras.length },
                  ].map((s, i) => (
                    <div key={i} className="tp-team-stat-box">
                      <div className="tp-team-stat-val" style={{ color: team.color }}>
                        {isLoadingStats && typeof s.val === 'number' && s.val === 0
                          ? <StatSkeleton/>
                          : s.val}
                      </div>
                      <div className="tp-team-stat-lbl">{s.lbl}</div>
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

