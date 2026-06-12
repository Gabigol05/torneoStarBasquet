import { useState, useEffect } from 'react';
import { PlayerProfileModal } from './PlayerProfileModal';

// Últimos N resultados de un equipo
function getRacha(partidos, n = 5) {
  if (!partidos?.length) return [];
  return partidos.slice(-n).map(p => p.resultado);
}

// ── SKELETON para stats mientras cargan ──────────────────────
function StatSkeleton() {
  return (
    <span style={{
      display: 'inline-block',
      width: '28px', height: '20px',
      background: 'rgba(255,255,255,0.08)',
      borderRadius: '4px',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

export function TeamPageFem({ team, onBack, allTeams, isLoadingStats, statsPorPartido, partidos, fechas }) {
  const [activeTab, setActiveTab]     = useState('jugadoras');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  if (!team) return null;

  // Scroll lock — bloquear scroll del fondo al abrir la página
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Re-activar reveal-on-scroll cuando cambia el tab o el equipo
  useEffect(() => {
    const timer = setTimeout(() => {
      const els = document.querySelectorAll('.reveal-on-scroll:not(.in-view)');
      const observer = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); observer.unobserve(e.target); } });
      }, { threshold: 0.1 });
      els.forEach(el => observer.observe(el));
      return () => observer.disconnect();
    }, 50);
    return () => clearTimeout(timer);
  }, [activeTab, team.id]);

  const filteredJugadoras = team.jugadoras.filter(j =>
    j.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Posición en la tabla ordenada por victorias → diferencia
  const sortedTeams = [...allTeams].sort((a, b) => {
    const ptsA = a.pg * 2, ptsB = b.pg * 2;
    if (ptsB !== ptsA) return ptsB - ptsA;           // 1° PTS
    const difA = a.pf - a.pc, difB = b.pf - b.pc;
    if (difB !== difA) return difB - difA;           // 2° DIF (desempate principal)
    return b.pf - a.pf;                              // 3° PF (más puntos a favor)
  });
  const posicion = sortedTeams.findIndex(t => t.id === team.id) + 1;
  const pct      = team.pj > 0 ? (team.pg / team.pj).toFixed(3) : '.000';
  const dif      = team.pf - team.pc;

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

      <div className="team-page-overlay">
        <div className="team-page-container">

          {/* ── HEADER ── */}
          <div className="team-page-header" style={{ '--team-color': team.color }}>
            <button className="team-page-back" onClick={onBack}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Equipos
            </button>

            <div className="team-page-hero">
              <div className="team-page-logo-wrap"
                style={{ borderColor: team.color, boxShadow: `0 0 40px ${team.color}55` }}>
                <img src={team.logo} alt={team.name} className="team-page-logo-img" loading="lazy" decoding="async" onError={e => { e.target.style.display='none'; }} />
              </div>
              <div className="team-page-hero-info">
                <div className="team-page-name">{team.name}</div>
                <div className="team-page-record" style={{ color: team.color }}>
                  {team.pg}G — {team.pp}P
                </div>
                {/* Racha de forma */}
                {team.partidos?.length > 0 && (
                  <div style={{ display:'flex', gap:'4px', marginBottom:'8px' }}>
                    {getRacha(team.partidos).map((r, i) => (
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
                { key: 'jugadoras', label: '👥 Jugadoras' },
                { key: 'resultados', label: '📋 Resultados' },
                { key: 'proximos',   label: '📅 Próximos' },
                { key: 'tabla',      label: '📊 Posición' },
              ].map(tab => (
                <button
                  key={tab.key}
                  className={`team-page-tab ${activeTab === tab.key ? 'active' : ''}`}
                  style={activeTab === tab.key
                    ? { borderBottomColor: team.color, color: team.color }
                    : {}}
                  onClick={() => setActiveTab(tab.key)}
                >
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
                <input
                  type="text"
                  className="search-bar"
                  placeholder="Buscar jugadora..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ marginBottom: '20px' }}
                />
                <div className="tp-jugadoras-count">
                  {filteredJugadoras.length} jugadoras inscriptas
                </div>

                <div className="tp-jugadoras-grid">
                  {filteredJugadoras.map((j) => (
                    <div
                      key={j.id}
                      className={`tp-player-card reveal-on-scroll delay-${Math.min((filteredJugadoras.indexOf(j) % 5) + 1, 5)}`}
                      style={{ '--team-color': team.color }}
                      onClick={() => setSelectedPlayer({
                        id:       j.id,
                        name:     j.nombre,
                        team:     team.name,
                        fechaNac: j.fechaNac,
                        // stats — vienen del backend (o 0 si aún no hay)
                        pj:  j.pj,
                        pts: j.pts,
                        reb: j.reb,
                        ast: j.ast,
                        rob: j.rob,
                        tap: j.tap,
                        fgp: j.fgp,
                        tpp: j.tpp,
                        tlp: j.tlp,
                      })}
                    >
                      {/* Avatar */}
                      <div className="tp-player-avatar" style={{ borderColor: team.color }}>
                        <svg viewBox="0 0 24 24" fill="currentColor"
                          style={{ width: '28px', color: 'var(--gray)' }}>
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
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

                      {/* Stats mini — skeleton si isLoadingStats y todo en 0 */}
                      <div className="tp-player-stats-mini">
                        {[
                          { lbl: 'PTS', val: j.pts, accent: true },
                          { lbl: 'REB', val: j.reb },
                          { lbl: 'AST', val: j.ast },
                        ].map(({ lbl, val, accent }) => (
                          <div key={lbl} className="tp-stat-mini">
                            <span className="tp-stat-mini-val"
                              style={accent ? { color: team.color } : {}}>
                              {isLoadingStats && val === 0
                                ? <StatSkeleton />
                                : val}
                            </span>
                            <span className="tp-stat-mini-lbl">{lbl}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── RESULTADOS ── */}
            {activeTab === 'resultados' && (
              <div>
                <div className="tp-section-label">Últimos Partidos</div>
                {team.partidos.length === 0 ? (
                  <div className="tp-empty-state">
                    <div className="tp-empty-icon">🏀</div>
                    <div className="tp-empty-text">Aún no hay partidos jugados</div>
                    <div className="tp-empty-sub">
                      Los resultados aparecerán aquí cuando comience el torneo
                    </div>
                  </div>
                ) : (
                  <div className="tp-matches-list">
                    {team.partidos.map((p, idx) => (
                      <div
                        key={idx}
                        className={`tp-match-card ${p.resultado === 'G' ? 'win' : 'loss'}`}
                        style={{ '--team-color': team.color }}
                      >
                        <div className="tp-match-date">{p.fecha}</div>
                        <div className="tp-match-info">
                          <span className="tp-match-teams">{team.name} vs {p.rival}</span>
                          <span className="tp-match-score">{p.pf} – {p.pc}</span>
                          <span className={`tp-match-result ${p.resultado === 'G' ? 'win' : 'loss'}`}>
                            {p.resultado === 'G' ? 'GANÓ' : 'PERDIÓ'}
                          </span>
                        </div>
                      </div>
                    ))}
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
                    <div className="tp-empty-text">Fixture pendiente de publicación</div>
                    <div className="tp-empty-sub">
                      Los próximos partidos aparecerán aquí
                    </div>
                  </div>
                ) : (
                  <div className="tp-matches-list">
                    {team.proximos.map((p, idx) => (
                      <div key={idx} className="tp-match-card upcoming"
                        style={{ '--team-color': team.color }}>
                        <div className="tp-match-date">{p.fecha}</div>
                        <div className="tp-match-info">
                          <span className="tp-match-teams">{team.name} vs {p.rival}</span>
                          <span className="tp-match-lugar">{p.lugar ?? 'A confirmar'}</span>
                          <span className="tp-match-result upcoming">PRÓXIMO</span>
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
                        <th>PF</th><th>PC</th><th>DIF</th><th>%</th><th className="th-racha">Forma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTeams.map((t, idx) => {
                        const isMe  = t.id === team.id;
                        const tPct  = t.pj > 0 ? (t.pg / t.pj).toFixed(3) : '.000';
                        const tDif  = t.pf - t.pc;
                        return (
                          <tr key={t.id} className={isMe ? 'highlight-row' : ''}>
                            <td className="team-cell">
                              <span className={`pos-num ${idx < 3 ? 'top3' : ''}`}>{idx + 1}</span>
                              <img src={t.logo} alt={t.name}
                                style={{ width:'28px', height:'28px', borderRadius:'50%',
                                  objectFit:'cover', marginRight:'6px' }} />
                              <span className="team-name-txt"
                                style={isMe ? { color: team.color, fontWeight: 700 } : {}}>
                                {t.name}
                              </span>
                              {isMe && (
                                <span className="tp-you-badge" style={{ background: team.color }}>
                                  ▶ VOS
                                </span>
                              )}
                            </td>
                            <td>{t.pj}</td><td>{t.pg}</td><td>{t.pp}</td>
                            <td>{t.pf}</td><td>{t.pc}</td>
                            <td className={tDif >= 0 ? 'green' : 'red'}>
                              {tDif > 0 ? `+${tDif}` : tDif}
                            </td>
                            <td className="pct-td">{tPct}</td>
                            <td className="td-racha">
                              {getRacha(t.partidos).map((r, i) => (
                                <span key={i} className={`racha-pill ${r === 'G' ? 'racha-g' : 'racha-p'}`}>{r}</span>
                              ))}
                              {!t.partidos?.length && <span className="racha-nd">–</span>}
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
                          ? <StatSkeleton />
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
