import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// ─── Share button ─────────────────────────────────────────────────────────────
function ShareButton({ player, pts, reb, ast }) {
  const handleShare = async () => {
    const text = `🏀 ${player.name} — ${player.team}\nPTS: ${pts} | REB: ${reb} | AST: ${ast}\nTorneo Star Básquet 2026`;
    if (navigator.share) {
      try { await navigator.share({ title: `${player.name} — Star Básquet`, text }); }
      catch (_) {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
        alert('¡Copiado al portapapeles!');
      } catch (_) {}
    }
  };
  return (
    <button className="pp-share-btn" onClick={handleShare} title="Compartir perfil">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
      Compartir
    </button>
  );
}

// ─── Barra de porcentaje ──────────────────────────────────────────────────────
function PctBar({ value, color = '#F0B429' }) {
  const pct = Math.min(Math.max(value ?? 0, 0), 100);
  return (
    <div style={{ background: '#1C2535', borderRadius: 4, height: 6, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }}/>
    </div>
  );
}

// ─── Card de stat ─────────────────────────────────────────────────────────────
function StatCard({ val, lbl, color = '#EEF2F8', sub }) {
  return (
    <div style={{ flex: 1, background: '#141C2A', border: '1px solid #1C2535', borderRadius: 8, padding: '10px 8px', textAlign: 'center', minWidth: 60 }}>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color, lineHeight: 1 }}>{val}</div>
      <div style={{ color: '#6B7A99', fontSize: 10, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{lbl}</div>
      {sub && <div style={{ color: '#4A566E', fontSize: 9, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

// ─── Fila de desglose de tiro ─────────────────────────────────────────────────
function TiroRow({ label, conv, fall, pct, color, promConv }) {
  const total   = (conv ?? 0) + (fall ?? 0);
  // ⚠️ FIX: si hay datos reales los usa, sino usa el pct almacenado
  const pctReal = total > 0 ? Math.round(((conv ?? 0) / total) * 100) : (pct ?? 0);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ color: '#8899BB', fontSize: 13 }}>{label}</span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#4A566E' }}>
            {conv ?? 0}/{total}
          </span>
          {(promConv ?? 0) > 0 && (
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#6B7A99' }}>
              {promConv}/pj
            </span>
          )}
          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color, minWidth: 44, textAlign: 'right' }}>
            {pctReal}%
          </span>
        </div>
      </div>
      <PctBar value={pctReal} color={color}/>
    </div>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────
export function PlayerProfileModal({ player, isOpen, onClose, statsPorPartido, partidos, fechas }) {
  if (!isOpen || !player) return null;

  // Stats promedios — con fallbacks seguros
  const pts      = player.pts_prom  ?? player.pts ?? 0;
  const reb      = player.reb_prom  ?? player.reb ?? 0;
  const ast      = player.ast_prom  ?? player.ast ?? 0;
  const rob      = player.rob_prom  ?? player.rob ?? 0;
  const tap      = player.tap_prom  ?? player.tap ?? 0;
  const per      = player.per_prom  ?? 0;
  const val      = player.val_prom  ?? 0;
  const pj       = player.pj        ?? 0;
  const mejorPts = player.mejor_pts ?? 0;

  // Porcentajes
  const pctSimp = player.pct_simples ?? player.tlp ?? 0;
  const pctDob  = player.pct_dobles  ?? player.fgp ?? 0;
  const pctTrip = player.pct_triples ?? player.tpp ?? 0;

  // Totales de tiros
  const scTotal = player.sc_total ?? 0;
  const sfTotal = player.sf_total ?? 0;
  const dcTotal = player.dc_total ?? 0;
  const dfTotal = player.df_total ?? 0;
  const tcTotal = player.tc_total ?? 0;
  const tfTotal = player.tf_total ?? 0;
  const scProm  = player.sc_prom  ?? 0;
  const dcProm  = player.dc_prom  ?? 0;
  const tcProm  = player.tc_prom  ?? 0;

  const hayStats = pj > 0;

  // ⚠️ FIX: historialGrafico con useMemo para no recalcular en cada render
  const historialGrafico = useMemo(() => {
    if (!statsPorPartido || !partidos || !fechas) return [];
    return partidos
      .filter(p =>
        p.estado === 'finalizado' &&
        (p.equipo_local_id === player.equipoId || p.equipo_visit_id === player.equipoId)
      )
      .sort((a, b) => (a.fecha_id ?? 0) - (b.fecha_id ?? 0))
      .map(p => {
        const st    = statsPorPartido?.[p.id]?.[player.id];
        const fecha = fechas.find(f => f.id === p.fecha_id);
        return {
          match: fecha ? `F${fecha.numero}` : `P${p.id}`,
          pts:   st?.pts ?? 0,
          reb:   (st?.rd ?? 0) + (st?.ro ?? 0),
          ast:   st?.as_ ?? 0,
          sc: st?.sc ?? 0, sf: st?.sf ?? 0,
          dc: st?.dc ?? 0, df: st?.df ?? 0,
          tc: st?.tc ?? 0, tf: st?.tf ?? 0,
          val: st?.val ?? 0,
        };
      })
      .filter(d => d.pts > 0 || d.reb > 0 || d.ast > 0);
  }, [statsPorPartido, partidos, fechas, player.id, player.equipoId]);

  const chartData = historialGrafico.length > 0
    ? historialGrafico
    : (hayStats ? [{ match: '–', pts, reb, ast }] : []);

  // ⚠️ FIX: mejor partido destacado con contexto (rival + fecha)
  const mejorPartido = useMemo(() => {
    if (!historialGrafico.length) return null;
    return historialGrafico.reduce((b, r) => (r.pts > (b?.pts ?? -1) ? r : b), null);
  }, [historialGrafico]);

  return (
    <div className="gc-overlay" onClick={onClose}>
      <div className="pp-modal" onClick={e => e.stopPropagation()}>

        {/* ── Card superior ── */}
        <div className="pp-card">
          <div className="pp-card-actions">
            <ShareButton player={player} pts={pts} reb={reb} ast={ast}/>
            <button className="gc-close-btn" onClick={onClose}>&times;</button>
          </div>

          {/* Avatar */}
          <div className="pp-avatar-container">
            <div className="pp-avatar-initials"
              style={{ borderColor: player.color ?? 'var(--fem2)', color: player.color ?? 'var(--fem2)' }}>
              {(player.name ?? '').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
            </div>
          </div>

          <div className="pp-name">{player.name}</div>
          <div className="pp-team" style={{ color: player.color ?? 'var(--fem2)' }}>{player.team}</div>

          {player.fechaNac && player.fechaNac !== '-' && (
            <div className="pp-dob">🎂 {player.fechaNac}</div>
          )}

          {/* Stats principales */}
          <div className="pp-stats-grid">
            {[
              { val: pts, lbl: 'PTS', color: '#F0B429' },
              { val: reb, lbl: 'REB', color: '#60A5FA' },
              { val: ast, lbl: 'AST', color: '#22D07A' },
              { val: rob, lbl: 'ROB', color: '#F97316' },
              { val: tap, lbl: 'TAP', color: '#A78BFA' },
              { val: per, lbl: 'PÉR', color: '#6B7A99' },
            ].map(s => (
              <div key={s.lbl} className="pp-stat-box">
                <div className="pp-stat-val" style={{ color: s.color }}>{s.val}</div>
                <div className="pp-stat-lbl">{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Cuerpo ── */}
        <div className="pp-body">
          {hayStats ? (
            <>
              {/* Resumen general */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <StatCard val={pj}       lbl="Partidos"       color="#EEF2F8"/>
                <StatCard val={mejorPts} lbl="Mejor partido"  color="#F0B429" sub={mejorPartido ? `vs ${mejorPartido.match}` : 'PTS'}/>
                <StatCard val={val}      lbl="VAL prom."      color={val >= 0 ? '#22D07A' : '#F04060'}/>
              </div>

              {/* ── DESGLOSE DE TIROS ── */}
              <div style={{ marginBottom: 24 }}>
                <div style={ST.sectionTitle}>🏀 Desglose de tiros</div>
                <div style={{ background: '#0E1420', border: '1px solid #1C2535', borderRadius: 12, padding: '16px' }}>
                  <TiroRow
                    label="Tiros Libres (TL)"
                    conv={scTotal} fall={sfTotal} pct={pctSimp}
                    color="#22D07A" promConv={scProm}
                  />
                  <TiroRow
                    label="Dobles (2P)"
                    conv={dcTotal} fall={dfTotal} pct={pctDob}
                    color="#F0B429" promConv={dcProm}
                  />
                  <TiroRow
                    label="Triples (3P)"
                    conv={tcTotal} fall={tfTotal} pct={pctTrip}
                    color="#60A5FA" promConv={tcProm}
                  />

                  {/* Totales */}
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #1C2535', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { lbl: 'TL', conv: scTotal, fall: sfTotal, color: '#22D07A' },
                      { lbl: '2P', conv: dcTotal, fall: dfTotal, color: '#F0B429' },
                      { lbl: '3P', conv: tcTotal, fall: tfTotal, color: '#60A5FA' },
                    ].map(t => (
                      <div key={t.lbl} style={{ flex: 1, minWidth: 80, textAlign: 'center', background: '#141C2A', borderRadius: 8, padding: '8px 6px' }}>
                        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: t.color, lineHeight: 1 }}>
                          {t.conv}<span style={{ color: '#4A566E', fontSize: 14 }}>/{(t.conv ?? 0) + (t.fall ?? 0)}</span>
                        </div>
                        <div style={{ fontSize: 10, color: '#6B7A99', letterSpacing: .5, marginTop: 2 }}>TOTAL {t.lbl}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Gráfico de puntos por fecha */}
              {chartData.length > 1 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={ST.sectionTitle}>📈 Puntos por fecha</div>
                  <div style={{ width: '100%', height: 160 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <XAxis dataKey="match" stroke="#6b7280" tick={{ fontFamily: 'Barlow Condensed', fontSize: 13 }}/>
                        <YAxis stroke="#6b7280" tick={{ fontFamily: 'Bebas Neue', fontSize: 15 }}/>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: 8, color: '#fff' }}
                          itemStyle={{ color: '#FACC15', fontFamily: 'Bebas Neue', fontSize: 18 }}
                        />
                        <Line type="monotone" dataKey="pts" stroke="#FACC15" strokeWidth={3}
                          dot={{ r: 4, fill: '#FACC15', stroke: '#08101a', strokeWidth: 2 }}
                          activeDot={{ r: 6 }} name="PTS"/>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Historial por fecha */}
              {historialGrafico.length > 0 && (
                <div>
                  <div style={ST.sectionTitle}>📋 Stats por fecha</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr>
                          {['Fecha', 'PTS', 'REB', 'AST', 'VAL', 'TL', '2P', '3P'].map(h => (
                            <th key={h} style={{ color: '#6B7A99', padding: '6px 8px', textAlign: 'center', fontSize: 10, borderBottom: '1px solid #1C2535', whiteSpace: 'nowrap' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {historialGrafico.map((r, i) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)' }}>
                            <td style={{ color: '#6B7A99', padding: '7px 8px', textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: 14 }}>{r.match}</td>
                            <td style={{ color: '#F0B429', padding: '7px 8px', textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: 17, fontWeight: 700 }}>{r.pts}</td>
                            <td style={{ color: '#EEF2F8', padding: '7px 8px', textAlign: 'center' }}>{r.reb}</td>
                            <td style={{ color: '#EEF2F8', padding: '7px 8px', textAlign: 'center' }}>{r.ast}</td>
                            {/* ⚠️ FIX: columna VAL agregada */}
                            <td style={{ color: r.val >= 0 ? '#22D07A' : '#F04060', padding: '7px 8px', textAlign: 'center' }}>{r.val}</td>
                            <td style={{ color: '#22D07A', padding: '7px 8px', textAlign: 'center', fontSize: 11 }}>{r.sc}/{r.sc + r.sf}</td>
                            <td style={{ color: '#F0B429', padding: '7px 8px', textAlign: 'center', fontSize: 11 }}>{r.dc}/{r.dc + r.df}</td>
                            <td style={{ color: '#60A5FA', padding: '7px 8px', textAlign: 'center', fontSize: 11 }}>{r.tc}/{r.tc + r.tf}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="pp-no-stats">
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <div className="pp-no-stats-title">Estadísticas pendientes</div>
              <div className="pp-no-stats-sub">Se actualizarán cuando comience el torneo</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ST = {
  sectionTitle: {
    fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, letterSpacing: 1,
    color: '#EEF2F8', marginBottom: 12, textTransform: 'uppercase',
  },
}; 