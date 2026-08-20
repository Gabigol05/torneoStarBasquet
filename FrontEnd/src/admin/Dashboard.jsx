import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TABLAS, CategoriaToggle } from './categoriaAdmin';
import { equiposFemenino } from '../data/femeninoData';
import { equiposMasculino } from '../data/masculinoData';
import { labelFecha } from '../lib/fechaLabel';

// ── Config ──────────────────────────────────────────────────────────────────
const STAT_COLS = [
  { key:'pts_prom', label:'PTS', title:'Puntos por partido',     color:'#F0B429' },
  { key:'reb_prom', label:'REB', title:'Rebotes por partido',    color:'#60A5FA' },
  { key:'ast_prom', label:'AST', title:'Asistencias por partido',color:'#22D07A' },
  { key:'rob_prom', label:'ROB', title:'Robos por partido',      color:'#E8187A' },
  { key:'tap_prom', label:'TAP', title:'Tapones por partido',    color:'#A78BFA' },
];
const TOP_N_DEFAULT = 5;

function equipoInfo(categoria, id) {
  const lista = categoria === 'femenino' ? equiposFemenino : equiposMasculino;
  const eq = lista.find(e => e.id === id);
  if (!eq) return { nombre: 'Equipo', color: '#4A566E', logo: null };
  return { nombre: eq.name ?? eq.nombre, color: eq.color, logo: eq.logo };
}

function buildJugadorMapFemenino() {
  const map = {};
  for (const eq of equiposFemenino) {
    for (const j of (eq.jugadoras ?? [])) {
      map[j.id] = { nombre: j.nombre, equipoId: eq.id };
    }
  }
  return map;
}

function fmtFecha(iso) {
  if (!iso) return null;
  try {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString('es-AR', { day:'2-digit', month:'short' });
  } catch { return iso; }
}

function fmtHora(hora) {
  if (!hora) return null;
  return hora.slice(0, 5);
}

// ── Sub-componentes ──────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, accent }) {
  return (
    <div style={{
      background:'linear-gradient(160deg,#101826,#0B111C)', border:'1px solid #1C2535', borderRadius:14,
      padding:'16px 18px', display:'flex', flexDirection:'column', gap:6, minWidth:0,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:30, height:30, borderRadius:9, background:`${accent}1A`, border:`1px solid ${accent}33`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>
          {icon}
        </div>
        <div style={{ fontSize:11, color:'#6B7A99', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:.8, textTransform:'uppercase' }}>
          {label}
        </div>
      </div>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, lineHeight:1, color:'#EEF2F8', letterSpacing:.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize:12, color:'#4A566E', fontFamily:"'Barlow Condensed',sans-serif" }}>{sub}</div>}
    </div>
  );
}

function AvanceChart({ puntos }) {
  const [hover, setHover] = useState(null);
  if (!puntos.length) return <div style={{ color:'#4A566E', fontSize:13, padding:'20px 0' }}>Todavía no hay fechas cargadas.</div>;
  const max = Math.max(1, ...puntos.map(p => p.total));
  const w = 100 / puntos.length;
  return (
    <div style={{ position:'relative' }}>
      <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:120, padding:'0 2px' }}>
        {puntos.map((p, i) => {
          const hTot  = max ? (p.total / max) * 100 : 0;
          const activo = hover === i;
          return (
            <div key={p.id} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              style={{ flex:`0 0 ${w}%`, maxWidth:w+'%', height:'100%', display:'flex', alignItems:'flex-end', position:'relative', cursor:'pointer' }}>
              <div style={{ width:'100%', height:`${hTot}%`, background:'rgba(255,255,255,.05)', borderRadius:'4px 4px 0 0', position:'relative', overflow:'hidden', border: activo ? '1px solid rgba(240,180,41,.4)' : '1px solid transparent' }}>
                <div style={{ position:'absolute', bottom:0, left:0, right:0, height:`${p.total ? (p.finalizados/p.total)*100 : 0}%`, background: activo ? 'linear-gradient(180deg,#FFD166,#F0B429)' : 'linear-gradient(180deg,#F0B429AA,#F0B42966)', transition:'background .15s' }}/>
              </div>
              {activo && (
                <div style={{
                  position:'absolute', bottom:'calc(100% + 8px)', left:'50%', transform:'translateX(-50%)',
                  background:'#0E1420', border:'1px solid #F0B42955', borderRadius:8, padding:'6px 10px',
                  fontSize:11, whiteSpace:'nowrap', zIndex:5, boxShadow:'0 4px 16px rgba(0,0,0,.5)',
                  fontFamily:"'Barlow Condensed',sans-serif",
                }}>
                  <div style={{ color:'#F0B429', fontWeight:700, marginBottom:2 }}>{p.label}</div>
                  <div style={{ color:'#8899BB' }}>{p.finalizados}/{p.total} jugados</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', gap:4, padding:'6px 2px 0', marginTop:2, borderTop:'1px solid #1C2535' }}>
        {puntos.map((p, i) => (
          <div key={p.id} style={{ flex:`0 0 ${w}%`, maxWidth:w+'%', textAlign:'center', fontSize:9, color: hover===i ? '#F0B429' : '#2C3A52', fontFamily:"'Barlow Condensed',sans-serif", overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {p.numero}
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderRow({ rank, nombre, equipo, value, unit }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 4px' }}>
      <div style={{
        width:20, height:20, borderRadius:6, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:10, fontWeight:700, fontFamily:"'Barlow Condensed',sans-serif",
        background: rank===1 ? 'rgba(240,180,41,.18)' : 'rgba(255,255,255,.04)',
        color: rank===1 ? '#F0B429' : '#6B7A99',
      }}>{rank}</div>
      {equipo.logo && <img src={equipo.logo} alt="" width={18} height={18} style={{ borderRadius:'50%', objectFit:'cover', border:`1px solid ${equipo.color}55`, flexShrink:0 }} onError={e=>{e.currentTarget.style.display='none';}}/>}
      <div style={{ flex:1, minWidth:0, fontSize:13, color:'#CBD5E8', fontFamily:"'Barlow Condensed',sans-serif", overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {nombre}
      </div>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:'#EEF2F8', flexShrink:0 }}>{value}<span style={{ fontSize:9, color:'#4A566E', marginLeft:2 }}>{unit}</span></div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard({ irACargarPartido }) {
  const [loading, setLoading] = useState(true);
  const [categoriaLeaders, setCategoriaLeaders] = useState('femenino');
  const [categoriaFixture, setCategoriaFixture] = useState('femenino');
  const [expanded, setExpanded] = useState({});

  const [kpis, setKpis] = useState({ jugados:0, pendientes:0, proximo:null, encuesta:null });
  const [leaders, setLeaders] = useState({ femenino:{}, masculino:{} });
  const [fixture, setFixture] = useState({ femenino:[], masculino:[] });
  const [chart, setChart] = useState({ femenino:[], masculino:[] });

  useEffect(() => {
    let cancelado = false;
    (async () => {
      setLoading(true);
      try {
        const [
          { data: pf }, { data: pm },
          { data: ff }, { data: fm },
          { data: sf }, { data: sm },
          { data: jm },
          { data: encAct },
        ] = await Promise.all([
          supabase.from(TABLAS.femenino.partidos).select('*'),
          supabase.from(TABLAS.masculino.partidos).select('*'),
          supabase.from(TABLAS.femenino.fechas).select('*').order('numero', { ascending:true }),
          supabase.from(TABLAS.masculino.fechas).select('*').order('numero', { ascending:true }),
          supabase.from(TABLAS.femenino.estadisticas).select('*'),
          supabase.from(TABLAS.masculino.estadisticas).select('*'),
          supabase.from(TABLAS.masculino.jugadores).select('id,nombre,equipo_id'),
          supabase.from('encuestas').select('*').eq('activa', true).order('creado_en', { ascending:false }).limit(1),
        ]);
        if (cancelado) return;

        const partidos = [
          ...(pf ?? []).map(p => ({ ...p, categoria:'femenino' })),
          ...(pm ?? []).map(p => ({ ...p, categoria:'masculino' })),
        ];
        const jugados    = partidos.filter(p => p.estado === 'finalizado').length;
        const pendientes = partidos.filter(p => p.estado === 'pendiente').length;

        const hoy = new Date().toISOString().slice(0, 10);
        const proximos = partidos
          .filter(p => p.estado === 'pendiente' && p.fecha_partido && p.fecha_partido >= hoy)
          .sort((a, b) => (a.fecha_partido + (a.hora_inicio ?? '')).localeCompare(b.fecha_partido + (b.hora_inicio ?? '')));
        const proximo = proximos[0] ?? null;

        let encuesta = null;
        if (encAct?.[0]) {
          const { data: res } = await supabase.from('v_encuesta_resultados').select('votos').eq('encuesta_id', encAct[0].id);
          const totalVotos = (res ?? []).reduce((s, r) => s + Number(r.votos || 0), 0);
          encuesta = { pregunta: encAct[0].pregunta, votos: totalVotos };
        }

        setKpis({ jugados, pendientes, proximo, encuesta });

        // ── Leaders ──
        const jugadorMapFem = buildJugadorMapFemenino();
        const jugadorMapMasc = {};
        for (const j of (jm ?? [])) jugadorMapMasc[j.id] = { nombre: j.nombre, equipoId: j.equipo_id };

        const buildLeaders = (statsRows, jugadorMap, categoria) => {
          const out = {};
          for (const col of STAT_COLS) {
            const filas = (statsRows ?? [])
              .filter(r => Number(r.pj || 0) > 0 && r[col.key] != null)
              .map(r => {
                const jugId = r[TABLAS[categoria].jugadorIdField];
                const info = jugadorMap[jugId];
                if (!info) return null;
                const eq = equipoInfo(categoria, info.equipoId);
                return { id: jugId, nombre: info.nombre, equipo: eq, value: Number(r[col.key]).toFixed(1) };
              })
              .filter(Boolean)
              .sort((a, b) => Number(b.value) - Number(a.value));
            out[col.key] = filas;
          }
          return out;
        };

        setLeaders({
          femenino: buildLeaders(sf, jugadorMapFem, 'femenino'),
          masculino: buildLeaders(sm, jugadorMapMasc, 'masculino'),
        });

        // ── Fixture completo agrupado por fecha ──
        const buildFixture = (fechas, partidosCat, categoria) => {
          return (fechas ?? []).map(f => ({
            id: f.id, numero: f.numero, label: labelFecha(f),
            partidos: partidosCat.filter(p => p.fecha_id === f.id).map(p => ({
              ...p,
              local: equipoInfo(categoria, p.equipo_local_id),
              visit: equipoInfo(categoria, p.equipo_visit_id),
            })),
          })).filter(f => f.partidos.length > 0);
        };
        setFixture({
          femenino: buildFixture(ff, partidos.filter(p => p.categoria === 'femenino'), 'femenino'),
          masculino: buildFixture(fm, partidos.filter(p => p.categoria === 'masculino'), 'masculino'),
        });

        // ── Chart de avance por fecha ──
        const buildChart = (fechas, partidosCat) => (fechas ?? []).map(f => {
          const deLaFecha = partidosCat.filter(p => p.fecha_id === f.id);
          return { id: f.id, numero: f.numero, label: labelFecha(f), total: deLaFecha.length, finalizados: deLaFecha.filter(p => p.estado === 'finalizado').length };
        }).filter(p => p.total > 0);
        setChart({
          femenino: buildChart(ff, partidos.filter(p => p.categoria === 'femenino')),
          masculino: buildChart(fm, partidos.filter(p => p.categoria === 'masculino')),
        });
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => { cancelado = true; };
  }, []);

  const totalPartidos = kpis.jugados + kpis.pendientes;
  const avancePct = totalPartidos ? Math.round((kpis.jugados / totalPartidos) * 100) : 0;

  const proximoLabel = useMemo(() => {
    if (!kpis.proximo) return null;
    const p = kpis.proximo;
    const eqL = equipoInfo(p.categoria, p.equipo_local_id);
    const eqV = equipoInfo(p.categoria, p.equipo_visit_id);
    return `${eqL.nombre} vs ${eqV.nombre}`;
  }, [kpis.proximo]);

  if (loading) {
    return <div style={{ padding:'40px 0', textAlign:'center', color:'#4A566E', fontFamily:"'Barlow Condensed',sans-serif" }}>Cargando resumen…</div>;
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12 }}>
        <KpiCard icon="🏀" label="Partidos jugados" value={kpis.jugados} sub={`${avancePct}% del fixture`} accent="#F0B429"/>
        <KpiCard icon="⏳" label="Pendientes" value={kpis.pendientes} sub="por jugarse" accent="#60A5FA"/>
        <KpiCard icon="📅" label="Próximo partido" value={proximoLabel ?? '—'}
          sub={kpis.proximo ? `${fmtFecha(kpis.proximo.fecha_partido)}${fmtHora(kpis.proximo.hora_inicio) ? ' · '+fmtHora(kpis.proximo.hora_inicio)+'hs' : ''}` : 'sin fecha cargada'}
          accent="#22D07A"/>
        <KpiCard icon="🗳️" label="Encuesta activa" value={kpis.encuesta ? `${kpis.encuesta.votos} votos` : 'ninguna'}
          sub={kpis.encuesta?.pregunta ?? '—'} accent="#E8187A"/>
      </div>

      {/* Avance por fecha */}
      <div style={{ background:'linear-gradient(160deg,#101826,#0B111C)', border:'1px solid #1C2535', borderRadius:14, padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:.5, color:'#EEF2F8' }}>Avance del fixture por fecha</div>
          <CategoriaToggle categoria={categoriaLeaders} setCategoria={setCategoriaLeaders} />
        </div>
        <AvanceChart puntos={chart[categoriaLeaders]} />
      </div>

      {/* Lideres */}
      <div style={{ background:'linear-gradient(160deg,#101826,#0B111C)', border:'1px solid #1C2535', borderRadius:14, padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:.5, color:'#EEF2F8' }}>
            Líderes {categoriaLeaders === 'femenino' ? 'femenino' : 'masculino'}
          </div>
          <CategoriaToggle categoria={categoriaLeaders} setCategoria={setCategoriaLeaders} />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:16 }}>
          {STAT_COLS.map(col => {
            const key = `${categoriaLeaders}-${col.key}`;
            const lista = leaders[categoriaLeaders][col.key] ?? [];
            const abierto = !!expanded[key];
            const visibles = abierto ? lista.slice(0, 20) : lista.slice(0, TOP_N_DEFAULT);
            return (
              <div key={col.key}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:col.color }}/>
                  <div style={{ fontSize:12, fontWeight:700, letterSpacing:1, color:col.color, fontFamily:"'Barlow Condensed',sans-serif" }} title={col.title}>{col.label}</div>
                </div>
                {visibles.length === 0
                  ? <div style={{ fontSize:12, color:'#2C3A52', padding:'6px 4px' }}>Sin datos aún</div>
                  : visibles.map((l, i) => <LeaderRow key={l.id} rank={i+1} nombre={l.nombre} equipo={l.equipo} value={l.value} unit={col.label}/>)}
                {lista.length > TOP_N_DEFAULT && (
                  <button onClick={() => setExpanded(e => ({ ...e, [key]: !abierto }))}
                    style={{ marginTop:4, background:'none', border:'none', color:'#4A566E', fontSize:11, cursor:'pointer', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:.5, padding:'4px' }}>
                    {abierto ? '▲ Ver menos' : `▼ Ver todos (${lista.length})`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fixture completo */}
      <div style={{ background:'linear-gradient(160deg,#101826,#0B111C)', border:'1px solid #1C2535', borderRadius:14, padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:.5, color:'#EEF2F8' }}>Fixture completo</div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <CategoriaToggle categoria={categoriaFixture} setCategoria={setCategoriaFixture} />
            {irACargarPartido && (
              <button onClick={irACargarPartido} style={{
                display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, cursor:'pointer',
                background:'linear-gradient(135deg,#F0B429,#FF6B2B)', border:'none', color:'#0B0E14',
                fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:13, letterSpacing:.5,
              }}>
                + Cargar partido
              </button>
            )}
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:18, maxHeight:520, overflowY:'auto', paddingRight:4 }}>
          {fixture[categoriaFixture].length === 0 && (
            <div style={{ color:'#2C3A52', fontSize:13, textAlign:'center', padding:'20px 0' }}>Todavía no hay fechas cargadas.</div>
          )}
          {fixture[categoriaFixture].map(f => (
            <div key={f.id}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:'#F0B429', fontFamily:"'Barlow Condensed',sans-serif", marginBottom:8, textTransform:'uppercase' }}>
                {f.label}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {f.partidos.map(p => {
                  const jugado = p.estado === 'finalizado';
                  return (
                    <div key={p.id} style={{
                      display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:9,
                      background:'rgba(255,255,255,.02)', border:'1px solid #1C2535',
                    }}>
                      <div style={{ flex:1, minWidth:0, display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#CBD5E8', fontFamily:"'Barlow Condensed',sans-serif", overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {p.local.logo && <img src={p.local.logo} alt="" width={16} height={16} style={{ borderRadius:'50%', objectFit:'cover', flexShrink:0 }} onError={e=>{e.currentTarget.style.display='none';}}/>}
                        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.local.nombre}</span>
                        <span style={{ color:'#2C3A52', flexShrink:0 }}>vs</span>
                        {p.visit.logo && <img src={p.visit.logo} alt="" width={16} height={16} style={{ borderRadius:'50%', objectFit:'cover', flexShrink:0 }} onError={e=>{e.currentTarget.style.display='none';}}/>}
                        <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.visit.nombre}</span>
                      </div>
                      {jugado ? (
                        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:'#F0B429', flexShrink:0 }}>
                          {(Number(p.q1_local||0)+Number(p.q2_local||0)+Number(p.q3_local||0)+Number(p.q4_local||0)+Number(p.ot_local||0))}
                          {' - '}
                          {(Number(p.q1_visit||0)+Number(p.q2_visit||0)+Number(p.q3_visit||0)+Number(p.q4_visit||0)+Number(p.ot_visit||0))}
                        </div>
                      ) : (
                        <div style={{ fontSize:11, color:'#4A566E', fontFamily:"'Barlow Condensed',sans-serif", flexShrink:0, textAlign:'right' }}>
                          {fmtFecha(p.fecha_partido) ?? 'sin fecha'}{fmtHora(p.hora_inicio) ? ` · ${fmtHora(p.hora_inicio)}hs` : ''}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
