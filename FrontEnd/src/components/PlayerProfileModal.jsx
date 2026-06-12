import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function ShareButton({ player }) {
  const handleShare = async () => {
    const text = `🏀 ${player.name} — ${player.team}\nPTS: ${player.pts} | REB: ${player.reb} | AST: ${player.ast}\nTorneo Star Básquet 2026`;
    if (navigator.share) {
      try { await navigator.share({ title: `${player.name} — Star Básquet`, text }); }
      catch (_) {}
    } else {
      await navigator.clipboard.writeText(text);
      alert('¡Copiado al portapapeles!');
    }
  };
  return (
    <button className="pp-share-btn" onClick={handleShare} title="Compartir perfil">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
      Compartir
    </button>
  );
}

// Barra de porcentaje visual
function PctBar({ value, max = 100, color = '#F0B429' }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ background: '#1C2535', borderRadius: 4, height: 6, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
    </div>
  );
}

export function PlayerProfileModal({ player, isOpen, onClose, statsPorPartido, partidos, fechas }) {
  if (!isOpen || !player) return null;

  // Stats promedios
  const pts     = player.pts_prom     ?? player.pts ?? 0;
  const reb     = player.reb_prom     ?? player.reb ?? 0;
  const ast     = player.ast_prom     ?? player.ast ?? 0;
  const rob     = player.rob_prom     ?? player.rob ?? 0;
  const tap     = player.tap_prom     ?? player.tap ?? 0;
  const per     = player.per_prom     ?? 0;
  const val     = player.val_prom     ?? 0;
  const pj      = player.pj           ?? 0;
  const mejorPts = player.mejor_pts   ?? 0;

  // Porcentajes
  const pctSimp = player.pct_simples  ?? player.tlp ?? 0;
  const pctDob  = player.pct_dobles   ?? player.fgp ?? 0;
  const pctTrip = player.pct_triples  ?? player.tpp ?? 0;

  const hayStats = pj > 0;

  // Historial real por fecha para el gráfico
  const historialGrafico = (() => {
    if (!statsPorPartido || !partidos || !fechas) return [];
    return partidos
      .filter(p => p.estado === 'finalizado' &&
        (p.equipo_local_id === player.equipoId || p.equipo_visit_id === player.equipoId))
      .sort((a, b) => (a.fecha_id ?? 0) - (b.fecha_id ?? 0))
      .map(p => {
        const stats  = statsPorPartido?.[p.id]?.[player.id];
        const fecha  = fechas.find(f => f.id === p.fecha_id);
        return {
          match: fecha ? `F${fecha.numero}` : `P${p.id}`,
          pts:   stats?.pts ?? 0,
          reb:   (stats?.rd ?? 0) + (stats?.ro ?? 0),
          ast:   stats?.as_ ?? 0,
        };
      })
      .filter(d => d.pts > 0 || d.reb > 0 || d.ast > 0);
  })();

  const chartData = historialGrafico.length > 0 ? historialGrafico : (hayStats ? [{ match: 'F?', pts, reb, ast }] : []);

  return (
    <div className="gc-overlay" onClick={onClose}>
      <div className="pp-modal" onClick={e => e.stopPropagation()}>

        {/* Card superior */}
        <div className="pp-card">
          <div className="pp-card-actions">
            <ShareButton player={{ ...player, name: player.name, team: player.team, pts, reb, ast }} />
            <button className="gc-close-btn" onClick={onClose}>&times;</button>
          </div>

          <div className="pp-avatar-container">
            <div className="pp-avatar-initials">
              {player.name.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase()}
            </div>
          </div>

          <div className="pp-name">{player.name}</div>
          <div className="pp-team">{player.team}</div>

          {player.fechaNac && player.fechaNac !== '-' && (
            <div className="pp-dob">🎂 {player.fechaNac}</div>
          )}

          {/* Stats principales */}
          <div className="pp-stats-grid">
            {[
              { val: pts,  lbl: 'PTS' },
              { val: reb,  lbl: 'REB' },
              { val: ast,  lbl: 'AST' },
              { val: rob,  lbl: 'ROB' },
              { val: tap,  lbl: 'TAP' },
              { val: per,  lbl: 'PÉR' },
            ].map(s => (
              <div key={s.lbl} className="pp-stat-box">
                <div className="pp-stat-val">{s.val}</div>
                <div className="pp-stat-lbl">{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Cuerpo */}
        <div className="pp-body">
          {hayStats ? (
            <>
              {/* Partidos jugados + mejor partido */}
              <div style={{ display:'flex', gap:12, marginBottom:20 }}>
                <div style={cardStat}>
                  <div style={cardVal}>{pj}</div>
                  <div style={cardLbl}>Partidos</div>
                </div>
                <div style={cardStat}>
                  <div style={{ ...cardVal, color:'#F0B429' }}>{mejorPts}</div>
                  <div style={cardLbl}>Mejor partido (PTS)</div>
                </div>
                <div style={cardStat}>
                  <div style={{ ...cardVal, color: val >= 0 ? '#22D07A':'#F04060' }}>{val}</div>
                  <div style={cardLbl}>VAL promedio</div>
                </div>
              </div>

              {/* Porcentajes de tiro */}
              <div style={{ marginBottom:24 }}>
                <div style={sectionTitle}>Efectividad de tiro</div>
                {[
                  { lbl:'Simples (TL)', val:pctSimp, color:'#22D07A' },
                  { lbl:'Dobles',       val:pctDob,  color:'#F0B429' },
                  { lbl:'Triples',      val:pctTrip, color:'#60A5FA' },
                ].map(p => (
                  <div key={p.lbl} style={{ marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                      <span style={{ color:'#6B7A99', fontSize:13 }}>{p.lbl}</span>
                      <span style={{ color:p.color, fontFamily:"'Bebas Neue', sans-serif", fontSize:18 }}>{p.val}%</span>
                    </div>
                    <PctBar value={p.val} color={p.color} />
                  </div>
                ))}
              </div>

              {/* Gráfico evolución */}
              {chartData.length > 1 && (
                <>
                  <div style={sectionTitle}>Evolución de puntos por fecha</div>
                  <div style={{ width:'100%', height:180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top:5, right:5, left:-20, bottom:5 }}>
                        <XAxis dataKey="match" stroke="#6b7280" tick={{ fontFamily:'Barlow Condensed', fontSize:13 }} />
                        <YAxis stroke="#6b7280" tick={{ fontFamily:'Bebas Neue', fontSize:15 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor:'#111827', border:'none', borderRadius:8, color:'#fff' }}
                          itemStyle={{ color:'#FACC15', fontFamily:'Bebas Neue', fontSize:18 }}
                        />
                        <Line type="monotone" dataKey="pts" stroke="#FACC15" strokeWidth={3}
                          dot={{ r:4, fill:'#FACC15', stroke:'#08101a', strokeWidth:2 }}
                          activeDot={{ r:6 }} name="PTS"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              {/* Historial de partidos */}
              {historialGrafico.length > 0 && (
                <>
                  <div style={{ ...sectionTitle, marginTop:20 }}>Historial por fecha</div>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                    <thead>
                      <tr>
                        {['Fecha','PTS','REB','AST'].map(h => (
                          <th key={h} style={{ color:'#6B7A99', padding:'6px 8px', textAlign:'center', fontSize:11, borderBottom:'1px solid #1C2535' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {historialGrafico.map((r,i) => (
                        <tr key={i} style={{ background: i%2===0 ? 'transparent':'rgba(255,255,255,0.02)' }}>
                          <td style={{ color:'#6B7A99', padding:'6px 8px', textAlign:'center' }}>{r.match}</td>
                          <td style={{ color:'#F0B429', padding:'6px 8px', textAlign:'center', fontFamily:"'Bebas Neue',sans-serif", fontSize:17 }}>{r.pts}</td>
                          <td style={{ color:'#EEF2F8', padding:'6px 8px', textAlign:'center' }}>{r.reb}</td>
                          <td style={{ color:'#EEF2F8', padding:'6px 8px', textAlign:'center' }}>{r.ast}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </>
          ) : (
            <div className="pp-no-stats">
              <div style={{ fontSize:32, marginBottom:12 }}>📊</div>
              <div className="pp-no-stats-title">Estadísticas pendientes</div>
              <div className="pp-no-stats-sub">Se actualizarán automáticamente cuando comience el torneo</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

const cardStat    = { flex:1, background:'#141C2A', border:'1px solid #1C2535', borderRadius:8, padding:'10px 8px', textAlign:'center' };
const cardVal     = { fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color:'#EEF2F8', lineHeight:1 };
const cardLbl     = { color:'#6B7A99', fontSize:11, marginTop:3, textTransform:'uppercase', letterSpacing:0.5 };
const sectionTitle = { fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:1, color:'#EEF2F8', marginBottom:12, textTransform:'uppercase' };
