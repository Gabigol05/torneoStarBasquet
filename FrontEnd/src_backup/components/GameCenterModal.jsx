import { useState, useEffect } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';

// ─── Mapa de jugadoras para lookup O(1) ──────────────────────────────────────
const JUGADORAS_MAP = {};
for (const eq of equiposFemenino) {
  for (const j of eq.jugadoras) {
    JUGADORAS_MAP[j.id] = { ...j, equipoId: eq.id, equipoNombre: eq.name, equipoColor: eq.color };
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ w = '100%', h = 16, radius = 4, style = {} }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'linear-gradient(90deg,#1C2535 25%,#243048 50%,#1C2535 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      ...style,
    }}/>
  );
}

// ─── Barra comparativa ────────────────────────────────────────────────────────
function StatBar({ label, a, b, colorA, colorB }) {
  const va    = a ?? 0;
  const vb    = b ?? 0;
  const total = va + vb;
  const pctA  = total > 0 ? Math.round((va / total) * 100) : 50;
  const pctB  = 100 - pctA;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:colorA, minWidth:36, textAlign:'right' }}>
        {va}
      </span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:10, color:'#6B7A99', textAlign:'center', marginBottom:4, letterSpacing:.5 }}>
          {label}
        </div>
        <div style={{ height:6, borderRadius:3, display:'flex', overflow:'hidden', background:'#141C2A' }}>
          <div style={{ width:`${pctA}%`, background:colorA, transition:'width .6s ease' }}/>
          <div style={{ width:`${pctB}%`, background:colorB, transition:'width .6s ease' }}/>
        </div>
      </div>
      <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:colorB, minWidth:36 }}>
        {vb}
      </span>
    </div>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────
export function GameCenterModal({ isOpen, onClose, partidoId, mode }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab,     setTab]     = useState('resumen');

  useEffect(() => {
    if (!isOpen) return;
    setTab('resumen');
    setData(null);
    if (!isConfigured || !partidoId || mode !== 'femenino') return;

    setLoading(true);

    Promise.all([
      supabase.from('partidos_femenino').select('*').eq('id', partidoId).single(),
      supabase.from('stats_partido_femenino').select('*').eq('partido_id', partidoId),
    ]).then(([{ data: partido, error: e1 }, { data: stats, error: e2 }]) => {
      if (e1 || !partido) { setLoading(false); return; }

      const eqLocal = equiposFemenino.find(e => e.id === partido.equipo_local_id);
      const eqVisit = equiposFemenino.find(e => e.id === partido.equipo_visit_id);

      // ── FIX: calcular puntos desde cuartos si puntos_local/visit son null ──
      const ptsLocal = partido.puntos_local ?? (
        (partido.q1_local??0) + (partido.q2_local??0) +
        (partido.q3_local??0) + (partido.q4_local??0) + (partido.ot_local??0)
      );
      const ptsVisit = partido.puntos_visit ?? (
        (partido.q1_visit??0) + (partido.q2_visit??0) +
        (partido.q3_visit??0) + (partido.q4_visit??0) + (partido.ot_visit??0)
      );

      // ── Enriquecer stats con nombre ──
      const enrich = (eqId) =>
        (stats ?? [])
          .filter(r => r.equipo_id === eqId)
          .map(r => {
            // Buscar primero en mapa local, luego en BD por id
            const jugData = JUGADORAS_MAP[r.jugadora_id];
            return {
              ...r,
              nombre: jugData?.nombre ?? r.jugadora_id,
            };
          })
          .sort((a, b) => (b.pts ?? 0) - (a.pts ?? 0));

      const statsLocal = enrich(partido.equipo_local_id);
      const statsVisit = enrich(partido.equipo_visit_id);

      // ── FIX: usar mvp_jugadora_id de la BD (no recalcular por VAL) ──
      let mvpNombre = null;
      let mvpRow    = null;
      if (partido.mvp_jugadora_id) {
        const jugData = JUGADORAS_MAP[partido.mvp_jugadora_id];
        mvpNombre = jugData?.nombre ?? null;
        mvpRow    = (stats ?? []).find(r => r.jugadora_id === partido.mvp_jugadora_id) ?? null;
      } else {
        // Fallback: mayor VAL si no hay MVP registrado
        const todasStats = stats ?? [];
        mvpRow = todasStats.length > 0
          ? todasStats.reduce((best, r) => (r.val ?? 0) > (best?.val ?? -999) ? r : best, null)
          : null;
        if (mvpRow) {
          const jugData = JUGADORAS_MAP[mvpRow.jugadora_id];
          mvpNombre = jugData?.nombre ?? null;
        }
      }

      setData({
        partido: { ...partido, puntos_local: ptsLocal, puntos_visit: ptsVisit },
        eqLocal, eqVisit,
        statsLocal, statsVisit,
        mvpRow, mvpNombre,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [isOpen, partidoId, mode]);

  if (!isOpen) return null;

  return (
    <div className="gc-overlay" onClick={onClose}>
      <div className="gc-modal" onClick={e => e.stopPropagation()}>
        <button className="gc-close-btn" onClick={onClose}>&times;</button>

        {/* Cargando */}
        {loading && (
          <div style={{ padding:'2rem' }}>
            <Skeleton h={24} style={{ marginBottom:20 }}/>
            <Skeleton h={80} radius={12} style={{ marginBottom:16 }}/>
            <Skeleton h={16} style={{ marginBottom:10 }}/>
            <Skeleton h={16} w="80%" style={{ marginBottom:10 }}/>
            <Skeleton h={16} w="60%"/>
          </div>
        )}

        {/* Datos */}
        {!loading && data && (
          <>
            {/* Header */}
            <div className="gc-header">
              <div style={{ textAlign:'center', color:'var(--gray)', fontFamily:"'Barlow Condensed'", fontWeight:600, letterSpacing:'2px', fontSize:'11px', marginBottom:'10px' }}>
                FINALIZADO · TORNEO FEMENINO
              </div>

              {/* Marcador */}
              <div className="gc-score-board">
                <div className="gc-team">
                  <img src={data.eqLocal?.logo} alt={data.eqLocal?.name}
                    style={{ width:52, height:52, borderRadius:'50%', objectFit:'cover', marginBottom:8 }}
                    onError={e => { e.target.style.display='none'; }}/>
                  <div className="gc-team-name" style={{ color:data.eqLocal?.color }}>
                    {data.eqLocal?.name}
                  </div>
                </div>

                <div className="gc-final-score">
                  <span style={{ color:data.eqLocal?.color }}>{data.partido.puntos_local}</span>
                  <span style={{ color:'#4A566E', fontSize:28, margin:'0 8px' }}>—</span>
                  <span style={{ color:data.eqVisit?.color }}>{data.partido.puntos_visit}</span>
                </div>

                <div className="gc-team">
                  <img src={data.eqVisit?.logo} alt={data.eqVisit?.name}
                    style={{ width:52, height:52, borderRadius:'50%', objectFit:'cover', marginBottom:8 }}
                    onError={e => { e.target.style.display='none'; }}/>
                  <div className="gc-team-name" style={{ color:data.eqVisit?.color }}>
                    {data.eqVisit?.name}
                  </div>
                </div>
              </div>

              {/* Parciales */}
              <div style={{ display:'flex', gap:6, justifyContent:'center', marginTop:12, flexWrap:'wrap' }}>
                {['q1','q2','q3','q4'].map(q => (
                  <div key={q} style={{ background:'#141C2A', borderRadius:6, padding:'4px 12px', textAlign:'center', minWidth:50 }}>
                    <div style={{ fontSize:9, color:'#4A566E', letterSpacing:1, fontFamily:"'Barlow Condensed'", textTransform:'uppercase' }}>
                      {q.toUpperCase()}
                    </div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16 }}>
                      <span style={{ color:data.eqLocal?.color }}>{data.partido[`${q}_local`] ?? 0}</span>
                      <span style={{ color:'#4A566E', margin:'0 3px' }}>-</span>
                      <span style={{ color:data.eqVisit?.color }}>{data.partido[`${q}_visit`] ?? 0}</span>
                    </div>
                  </div>
                ))}
                {((data.partido.ot_local ?? 0) > 0 || (data.partido.ot_visit ?? 0) > 0) && (
                  <div style={{ background:'rgba(240,180,41,.1)', borderRadius:6, padding:'4px 12px', textAlign:'center', minWidth:50, border:'1px solid rgba(240,180,41,.2)' }}>
                    <div style={{ fontSize:9, color:'#F0B429', letterSpacing:1, fontFamily:"'Barlow Condensed'" }}>OT</div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16 }}>
                      <span style={{ color:data.eqLocal?.color }}>{data.partido.ot_local ?? 0}</span>
                      <span style={{ color:'#4A566E', margin:'0 3px' }}>-</span>
                      <span style={{ color:data.eqVisit?.color }}>{data.partido.ot_visit ?? 0}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* MVP */}
            {data.mvpNombre && (
              <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(240,180,41,.08)', border:'1px solid rgba(240,180,41,.2)', borderRadius:8, padding:'10px 14px', margin:'0 0 16px' }}>
                <span style={{ fontSize:20 }}>⭐</span>
                <div>
                  <div style={{ fontSize:10, color:'#F0B429', fontFamily:"'Barlow Condensed'", fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>
                    MVP del Partido
                  </div>
                  <div style={{ fontSize:15, color:'#EEF2F8', fontFamily:"'Barlow Condensed'", fontWeight:700 }}>
                    {data.mvpNombre}
                  </div>
                </div>
                {data.mvpRow && (
                  <div style={{ marginLeft:'auto', textAlign:'right' }}>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:'#F0B429', lineHeight:1 }}>
                      {data.mvpRow.pts ?? 0} PTS
                    </div>
                    <div style={{ fontSize:11, color:'#6B7A99' }}>
                      VAL {data.mvpRow.val ?? 0}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tabs */}
            <div style={{ display:'flex', gap:4, marginBottom:16 }}>
              {[
                ['resumen', '📊 Resumen'],
                ['local',   data.eqLocal?.name ?? 'Local'],
                ['visit',   data.eqVisit?.name ?? 'Visit'],
              ].map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)}
                  style={{
                    flex:1, padding:'8px 4px',
                    background: tab===k ? '#1C2535' : 'transparent',
                    border: `1px solid ${tab===k ? '#F0B429' : '#1C2535'}`,
                    borderRadius:8, color: tab===k ? '#F0B429' : '#6B7A99',
                    cursor:'pointer', fontSize:12,
                    fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:.5,
                  }}>
                  {l}
                </button>
              ))}
            </div>

            {/* Tab Resumen */}
            {tab === 'resumen' && (
              <div>
                <StatBar label="% TL"
                  a={data.partido.pct_simples_local} b={data.partido.pct_simples_visit}
                  colorA={data.eqLocal?.color} colorB={data.eqVisit?.color}/>
                <StatBar label="% 2P"
                  a={data.partido.pct_dobles_local}  b={data.partido.pct_dobles_visit}
                  colorA={data.eqLocal?.color} colorB={data.eqVisit?.color}/>
                <StatBar label="% 3P"
                  a={data.partido.pct_triples_local} b={data.partido.pct_triples_visit}
                  colorA={data.eqLocal?.color} colorB={data.eqVisit?.color}/>

                {(() => {
                  const sumL = key => data.statsLocal.reduce((a,r) => a+(r[key]??0), 0);
                  const sumV = key => data.statsVisit.reduce((a,r) => a+(r[key]??0), 0);
                  return (
                    <>
                      <StatBar label="Rebotes"     a={sumL('rd')+sumL('ro')} b={sumV('rd')+sumV('ro')} colorA={data.eqLocal?.color} colorB={data.eqVisit?.color}/>
                      <StatBar label="Asistencias" a={sumL('as_')} b={sumV('as_')} colorA={data.eqLocal?.color} colorB={data.eqVisit?.color}/>
                      <StatBar label="Robos"       a={sumL('rb')}  b={sumV('rb')}  colorA={data.eqLocal?.color} colorB={data.eqVisit?.color}/>
                      <StatBar label="Tapones"     a={sumL('tp')}  b={sumV('tp')}  colorA={data.eqLocal?.color} colorB={data.eqVisit?.color}/>
                      <StatBar label="Pérdidas"    a={sumL('pe')}  b={sumV('pe')}  colorA={data.eqLocal?.color} colorB={data.eqVisit?.color}/>
                      <StatBar label="Faltas"      a={sumL('fp')}  b={sumV('fp')}  colorA={data.eqLocal?.color} colorB={data.eqVisit?.color}/>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Tab stats equipo */}
            {(tab === 'local' || tab === 'visit') && (() => {
              const rows = tab === 'local' ? data.statsLocal : data.statsVisit;
              const eq   = tab === 'local' ? data.eqLocal    : data.eqVisit;
              return (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead>
                      <tr>
                        {['#','Jugadora','PTS','VAL','TL','2P','3P','RD','RO','AS','ROB','TAP','PÉR','FP'].map(h => (
                          <th key={h} style={{ background:'#141C2A', color:'#6B7A99', padding:'7px 8px', textAlign:'center', fontSize:10, whiteSpace:'nowrap', position:'sticky', top:0 }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={14} style={{ padding:'2rem', textAlign:'center', color:'#4A566E' }}>
                            Sin estadísticas para este equipo
                          </td>
                        </tr>
                      ) : rows.map((r, i) => {
                        const isMvp = r.jugadora_id === data.partido.mvp_jugadora_id;
                        return (
                          <tr key={r.jugadora_id} style={{ background: i%2===0?'#0E1420':'#141C2A' }}>
                            <td style={{ padding:'7px 8px', textAlign:'center', color:'#6B7A99' }}>{r.numero ?? '–'}</td>
                            <td style={{ padding:'7px 8px', textAlign:'left', color:eq?.color, fontWeight:600, minWidth:130, whiteSpace:'nowrap' }}>
                              {isMvp && <span style={{ marginRight:4 }}>⭐</span>}
                              {r.nombre.split(' ').slice(0,2).join(' ')}
                            </td>
                            <td style={{ padding:'7px 8px', textAlign:'center', color:'#F0B429', fontWeight:700, fontFamily:"'Bebas Neue',sans-serif", fontSize:16 }}>{r.pts ?? 0}</td>
                            <td style={{ padding:'7px 8px', textAlign:'center', color:(r.val??0)>=0?'#22D07A':'#F04060', fontFamily:"'Bebas Neue',sans-serif", fontSize:14 }}>{r.val ?? 0}</td>
                            <td style={{ padding:'7px 8px', textAlign:'center', color:'#22D07A' }}>{r.sc}/{(r.sc??0)+(r.sf??0)}</td>
                            <td style={{ padding:'7px 8px', textAlign:'center', color:'#F0B429' }}>{r.dc}/{(r.dc??0)+(r.df??0)}</td>
                            <td style={{ padding:'7px 8px', textAlign:'center', color:'#60A5FA' }}>{r.tc}/{(r.tc??0)+(r.tf??0)}</td>
                            <td style={{ padding:'7px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.rd ?? 0}</td>
                            <td style={{ padding:'7px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.ro ?? 0}</td>
                            <td style={{ padding:'7px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.as_ ?? 0}</td>
                            <td style={{ padding:'7px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.rb ?? 0}</td>
                            <td style={{ padding:'7px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.tp ?? 0}</td>
                            <td style={{ padding:'7px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.pe ?? 0}</td>
                            <td style={{ padding:'7px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.fp ?? 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </>
        )}

        {/* Sin datos */}
        {!loading && !data && (
          <div style={{ padding:'3rem', textAlign:'center', color:'#6B7A99' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📊</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:'#EEF2F8', marginBottom:8 }}>
              Estadísticas no disponibles
            </div>
            <div style={{ fontSize:13 }}>Este partido aún no tiene datos cargados</div>
          </div>
        )}
      </div>
    </div>
  );
}