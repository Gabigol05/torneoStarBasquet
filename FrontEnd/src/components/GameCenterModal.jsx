import { useState, useEffect } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';
import { equiposMasculino } from '../data/masculinoData';

function Skeleton({ w = '100%', h = 16, radius = 4, style = {} }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'linear-gradient(90deg, #1C2535 25%, #243048 50%, #1C2535 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      ...style,
    }}/>
  );
}

function StatBar({ label, a, b, colorA, colorB }) {
  const total = (a ?? 0) + (b ?? 0);
  const pctA  = total > 0 ? ((a / total) * 100).toFixed(0) : 50;
  const pctB  = 100 - pctA;
  return (
    <div className="gc-stat-row">
      <span className="gc-stat-val-a" style={{ color: colorA }}>{a ?? '-'}</span>
      <div className="gc-stat-center">
        <div className="gc-stat-label">{label}</div>
        <div className="gc-stat-bar-track">
          <div className="gc-stat-bar-a" style={{ width: `${pctA}%`, background: colorA }}/>
          <div className="gc-stat-bar-b" style={{ width: `${pctB}%`, background: colorB }}/>
        </div>
      </div>
      <span className="gc-stat-val-b" style={{ color: colorB }}>{b ?? '-'}</span>
    </div>
  );
}

export function GameCenterModal({ isOpen, onClose, partidoId, mode }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab,     setTab]     = useState('resumen');

  const esMasc       = mode === 'masculino';
  const roster       = esMasc ? equiposMasculino : equiposFemenino;
  const tablaPartido = esMasc ? 'partidos_masculino' : 'partidos_femenino';
  const tablaStats   = esMasc ? 'stats_partido_masculino' : 'stats_partido_femenino';
  const idField      = esMasc ? 'jugador_id' : 'jugadora_id';

  useEffect(() => {
    if (!isOpen) return;
    setTab('resumen');
    setData(null);
    if (!isConfigured || !partidoId) return;

    let ignore = false;
    setLoading(true);
    // El roster femenino esta hardcodeado en femeninoData.js (trae "jugadoras"
    // adentro de cada equipo), pero el de masculino vive en la tabla
    // jugadores_masculino — equiposMasculino NO tiene ese campo. Sin esto,
    // el box score de masculino mostraba el ID interno del jugador en vez
    // del nombre (y el MVP nunca se resolvia).
    const queries = [
      supabase.from(tablaPartido).select('*').eq('id', partidoId).single(),
      supabase.from(tablaStats).select('*').eq('partido_id', partidoId),
    ];
    if (esMasc) queries.push(supabase.from('jugadores_masculino').select('id,nombre'));

    Promise.all(queries).then(([{ data: partido }, { data: stats }, jugadoresRes]) => {
      if (ignore) return;
      if (!partido) { setLoading(false); return; }

      const eqLocal = roster.find(e => e.id === partido.equipo_local_id);
      const eqVisit = roster.find(e => e.id === partido.equipo_visit_id);

      const nombrePorId = esMasc
        ? Object.fromEntries((jugadoresRes?.data ?? []).map(j => [j.id, j.nombre]))
        : null;

      const resolverNombre = (r) => {
        if (esMasc) return nombrePorId[r[idField]] ?? r[idField];
        const eq  = roster.find(e => e.id === r.equipo_id);
        const jug = eq?.jugadoras?.find(j => j.id === r[idField]);
        return jug?.nombre ?? r[idField];
      };

      const enrich = (rows, eqId) =>
        (rows ?? [])
          .filter(r => r.equipo_id === eqId)
          .map(r => ({ ...r, jugadora_id: r[idField], nombre: resolverNombre(r) }))
          .sort((a, b) => b.pts - a.pts);

      const statsLocal = enrich(stats, partido.equipo_local_id);
      const statsVisit = enrich(stats, partido.equipo_visit_id);

      // MVP: leido directamente desde mvp_jugadora_id/mvp_jugador_id (definido por
      // el organizador), NO recalculado por valoracion.
      let mvpRow = null, mvpNombre = null;
      const mvpJugId = partido.mvp_jugadora_id ?? partido.mvp_jugador_id;
      if (mvpJugId) {
        mvpRow = (stats ?? []).find(r => r[idField] === mvpJugId) ?? null;
        if (esMasc) {
          mvpNombre = nombrePorId[mvpJugId] ?? null;
        } else {
          const mvpEq = eqLocal?.jugadoras?.find(j => j.id === mvpJugId)
            ? eqLocal
            : (eqVisit?.jugadoras?.find(j => j.id === mvpJugId) ? eqVisit : null);
          mvpNombre = mvpEq?.jugadoras?.find(j => j.id === mvpJugId)?.nombre ?? null;
        }
      }

      setData({ partido, eqLocal, eqVisit, statsLocal, statsVisit, mvpRow, mvpNombre });
      setLoading(false);
    }).catch(() => { if (!ignore) setLoading(false); });

    return () => { ignore = true; };
  }, [isOpen, partidoId, mode]);

  if (!isOpen) return null;

  return (
    <div className="gc-overlay" onClick={onClose}
      style={{ backdropFilter: 'blur(6px)', background: 'rgba(3,5,10,.72)', animation: 'gcFadeIn .25s ease' }}>
      <div className="gc-modal" onClick={e => e.stopPropagation()}
        style={{ animation: 'gcPopIn .25s ease', boxShadow: '0 30px 90px rgba(0,0,0,.6)', border: '1px solid rgba(255,255,255,.1)', position: 'relative' }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, left: 16, zIndex: 10,
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#EEF2F8', cursor: 'pointer', padding: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>

        {loading && (
          <div style={{ padding: '2rem' }}>
            <Skeleton h={24} style={{ marginBottom: 20 }}/>
            <Skeleton h={80} radius={12} style={{ marginBottom: 16 }}/>
            <Skeleton h={16} style={{ marginBottom: 10 }}/>
            <Skeleton h={16} w="80%" style={{ marginBottom: 10 }}/>
            <Skeleton h={16} w="60%" />
          </div>
        )}

        {!loading && data && (
          <>
            <div className="gc-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{
                  fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 11, letterSpacing: 1.5,
                  color: '#7fe0a3', background: 'rgba(127,224,163,.12)', padding: '4px 12px', borderRadius: 100,
                  textTransform: 'uppercase',
                }}>
                  Final
                </span>
                <span style={{ color: 'var(--gray)', fontFamily: "'Barlow Condensed'", fontWeight: 600, letterSpacing: '2px', fontSize: '12px' }}>
                  {esMasc ? 'TORNEO MASCULINO' : 'TORNEO FEMENINO'}
                </span>
              </div>

              <div className="gc-score-board">
                <div className="gc-team">
                  <img src={data.eqLocal?.logo} alt={data.eqLocal?.name}
                    style={{ width:52, height:52, borderRadius:'50%', objectFit:'cover', marginBottom:8 }}
                    onError={e => { e.target.style.display='none'; }}/>
                  <div className="gc-team-name" style={{ color: data.eqLocal?.color }}>
                    {data.eqLocal?.name}
                  </div>
                </div>
                <div className="gc-final-score">
                  <span style={{ color: data.eqLocal?.color }}>{data.partido.puntos_local}</span>
                  <span style={{ color:'#4A566E', fontSize:28, margin:'0 8px' }}>-</span>
                  <span style={{ color: data.eqVisit?.color }}>{data.partido.puntos_visit}</span>
                </div>
                <div className="gc-team">
                  <img src={data.eqVisit?.logo} alt={data.eqVisit?.name}
                    style={{ width:52, height:52, borderRadius:'50%', objectFit:'cover', marginBottom:8 }}
                    onError={e => { e.target.style.display='none'; }}/>
                  <div className="gc-team-name" style={{ color: data.eqVisit?.color }}>
                    {data.eqVisit?.name}
                  </div>
                </div>
              </div>

              <div style={{ display:'flex', gap:8, justifyContent:'center', marginTop:16, flexWrap:'wrap' }}>
                {['q1','q2','q3','q4'].map(q => (
                  <div key={q} style={{ background:'#141C2A', borderRadius:8, padding:'6px 14px', textAlign:'center', minWidth:52 }}>
                    <div style={{ fontSize:9, color:'#4A566E', letterSpacing:1, fontFamily:"'Barlow Condensed'", textTransform:'uppercase' }}>{q.toUpperCase()}</div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16 }}>
                      <span style={{ color: data.eqLocal?.color }}>{data.partido[`${q}_local`] ?? 0}</span>
                      <span style={{ color:'#4A566E', margin:'0 4px' }}>-</span>
                      <span style={{ color: data.eqVisit?.color }}>{data.partido[`${q}_visit`] ?? 0}</span>
                    </div>
                  </div>
                ))}
                {(data.partido.ot_local ?? 0) > 0 && (
                  <div style={{ background:'#141C2A', borderRadius:8, padding:'6px 14px', textAlign:'center', minWidth:52 }}>
                    <div style={{ fontSize:9, color:'#F0B429', letterSpacing:1, fontFamily:"'Barlow Condensed'" }}>OT</div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16 }}>
                      <span style={{ color: data.eqLocal?.color }}>{data.partido.ot_local}</span>
                      <span style={{ color:'#4A566E', margin:'0 4px' }}>-</span>
                      <span style={{ color: data.eqVisit?.color }}>{data.partido.ot_visit}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {data.mvpNombre && (
              <div style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(240,180,41,.08)', border:'1px solid rgba(240,180,41,.28)', borderRadius:12, padding:'12px 16px', margin:'20px 0' }}>
                <span style={{ fontSize:20 }}>*</span>
                <div>
                  <div style={{ fontSize:10, color:'#F0B429', fontFamily:"'Barlow Condensed'", fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>MVP del Partido</div>
                  <div style={{ fontSize:15, color:'#EEF2F8', fontFamily:"'Barlow Condensed'", fontWeight:700 }}>{data.mvpNombre}</div>
                </div>
                <div style={{ marginLeft:'auto', fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:'#F0B429' }}>
                  VAL {data.mvpRow?.val ?? 0}
                </div>
              </div>
            )}

            <div style={{ display:'flex', gap:6, marginBottom:20, borderBottom: '1px solid rgba(255,255,255,.08)', paddingBottom: 2 }}>
              {[['resumen','Resumen'],['local', data.eqLocal?.name ?? 'Local'],['visit', data.eqVisit?.name ?? 'Visit']].map(([k,l]) => (
                <button key={k} onClick={() => setTab(k)}
                  style={{ flex:1, padding:'9px 4px', background:'transparent',
                    border:'none', borderBottom: tab===k ? '2px solid #F0B429' : '2px solid transparent',
                    color:tab===k?'#EEF2F8':'#6b7a99', cursor:'pointer', fontSize:12.5, fontWeight: 700,
                    fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:1, textTransform: 'uppercase' }}>
                  {l}
                </button>
              ))}
            </div>

            {tab === 'resumen' && (
              <div>
                <StatBar label="% TL"     a={data.partido.pct_simples_local} b={data.partido.pct_simples_visit} colorA={data.eqLocal?.color} colorB={data.eqVisit?.color}/>
                <StatBar label="% 2P"     a={data.partido.pct_dobles_local}  b={data.partido.pct_dobles_visit}  colorA={data.eqLocal?.color} colorB={data.eqVisit?.color}/>
                <StatBar label="% 3P"     a={data.partido.pct_triples_local} b={data.partido.pct_triples_visit} colorA={data.eqLocal?.color} colorB={data.eqVisit?.color}/>

                {(() => {
                  const sumL = (key) => data.statsLocal.reduce((a,r) => a+(r[key]??0), 0);
                  const sumV = (key) => data.statsVisit.reduce((a,r) => a+(r[key]??0), 0);
                  return (
                    <>
                      <StatBar label="Rebotes"    a={sumL('rd')+sumL('ro')} b={sumV('rd')+sumV('ro')} colorA={data.eqLocal?.color} colorB={data.eqVisit?.color}/>
                      <StatBar label="Asistencias" a={sumL('as_')} b={sumV('as_')} colorA={data.eqLocal?.color} colorB={data.eqVisit?.color}/>
                      <StatBar label="Robos"       a={sumL('rb')}  b={sumV('rb')}  colorA={data.eqLocal?.color} colorB={data.eqVisit?.color}/>
                      <StatBar label="Tapones"     a={sumL('tp')}  b={sumV('tp')}  colorA={data.eqLocal?.color} colorB={data.eqVisit?.color}/>
                      <StatBar label="Perdidas"    a={sumL('pe')}  b={sumV('pe')}  colorA={data.eqLocal?.color} colorB={data.eqVisit?.color}/>
                      <StatBar label="Faltas"      a={sumL('fp')}  b={sumV('fp')}  colorA={data.eqLocal?.color} colorB={data.eqVisit?.color}/>
                    </>
                  );
                })()}
              </div>
            )}

            {(tab === 'local' || tab === 'visit') && (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr>
                      {['#', esMasc ? 'Jugador' : 'Jugadora', 'PTS','VAL','TL','2P','3P','RD','RO','AS','ROB','TAP','PER','FP'].map(h => (
                        <th key={h} style={{ background:'#141C2A', color:'#6B7A99', padding:'6px 8px', textAlign:'center', fontSize:10, whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(tab === 'local' ? data.statsLocal : data.statsVisit).map((r, i) => {
                      const eq = tab === 'local' ? data.eqLocal : data.eqVisit;
                      return (
                        <tr key={r.jugadora_id} style={{ background: i%2===0 ? '#0E1420':'#141C2A' }}>
                          <td style={{ padding:'6px 8px', textAlign:'center', color:'#6B7A99' }}>{r.numero ?? '-'}</td>
                          <td style={{ padding:'6px 8px', textAlign:'left', color: eq?.color, fontWeight:600, minWidth:120, whiteSpace:'nowrap' }}>
                            {r.nombre.split(' ').slice(0,2).join(' ')}
                          </td>
                          <td style={{ padding:'6px 8px', textAlign:'center', color:'#F0B429', fontWeight:700, fontFamily:"'Bebas Neue',sans-serif", fontSize:16 }}>{r.pts}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', color: r.val >= 0 ? '#22D07A':'#F04060', fontFamily:"'Bebas Neue',sans-serif", fontSize:14 }}>{r.val}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.sc}/{r.sf}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.dc}/{r.df}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.tc}/{r.tf}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.rd}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.ro}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.as_}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.rb}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.tp}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.pe}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', color:'#EEF2F8' }}>{r.fp}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {!loading && !data && (
          <div style={{ padding:'3rem', textAlign:'center', color:'#6B7A99' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>-</div>
            <div>Estadisticas no disponibles para este partido</div>
          </div>
        )}
      </div>
    </div>
  );
}



