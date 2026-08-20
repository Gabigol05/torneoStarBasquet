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

// ── Cálculo de "extra" para los mini-gráficos (semana, día top, hoy) ──────────
const DIA_LABELS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function buildFechaMap(fechas) {
  const m = {};
  for (const f of (fechas ?? [])) m[f.id] = f;
  return m;
}
function fechaEfectiva(p, fechaMap) {
  return p.fecha_partido || fechaMap[p.fecha_id]?.fecha_dia || null;
}
function lunesDeSemana(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const dia = d.getDay();
  const diff = (dia === 0 ? -6 : 1) - dia;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
function buildExtra(partidosCat, fechaMap) {
  const conFecha = partidosCat.map(p => ({ ...p, effDate: fechaEfectiva(p, fechaMap) })).filter(p => p.effDate);
  const total = partidosCat.length;
  const jugados = partidosCat.filter(p => p.estado === 'finalizado').length;
  const pctTotal = total ? (jugados / total) * 100 : 0;

  const semanas = {};
  for (const p of conFecha) {
    const wk = lunesDeSemana(p.effDate);
    semanas[wk] = (semanas[wk] ?? 0) + 1;
  }
  const porSemana = Object.keys(semanas).sort().map(wk => ({ wk, count: semanas[wk] })).slice(-8);

  const porDia = new Array(7).fill(0);
  for (const p of conFecha) porDia[new Date(`${p.effDate}T00:00:00`).getDay()]++;
  const maxDia = Math.max(...porDia);
  const diaTop = maxDia > 0 ? DIA_LABELS[porDia.indexOf(maxDia)] : null;

  const hoy = new Date().toISOString().slice(0, 10);
  const jugadosHoy = conFecha.filter(p => p.effDate === hoy && p.estado === 'finalizado').length;

  const lunesActual = lunesDeSemana(hoy);
  const domingoActual = (() => {
    const d = new Date(`${lunesActual}T00:00:00`);
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  })();
  const quedanSemana = conFecha.filter(p => p.estado === 'pendiente' && p.effDate >= lunesActual && p.effDate <= domingoActual).length;

  return { pctTotal, porSemana, jugadosHoy, diaTop, quedanSemana };
}

// ── Sub-componentes ──────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, accent, onClick }) {
  const [hover, setHover] = useState(false);
  const clickable = !!onClick;
  return (
    <div onClick={onClick}
      onMouseEnter={() => clickable && setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? `linear-gradient(160deg,${accent}2E,#0B111C 65%)` : `linear-gradient(160deg,${accent}16,#0B111C 55%)`,
        border: `1px solid ${hover ? accent+'88' : accent+'40'}`, borderTop:`3px solid ${accent}`, borderRadius:14,
        padding:'15px 18px 16px', display:'flex', flexDirection:'column', gap:6, minWidth:0,
        cursor: clickable ? 'pointer' : 'default', transition:'background .15s, border-color .15s',
        boxShadow: hover ? `0 8px 22px ${accent}22` : 'none', position:'relative',
      }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:32, height:32, borderRadius:9, background:`${accent}33`, border:`1px solid ${accent}77`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
          {icon}
        </div>
        <div style={{ fontSize:11, color:accent, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, letterSpacing:.8, textTransform:'uppercase' }}>
          {label}
        </div>
        {clickable && (
          <span style={{ marginLeft:'auto', fontSize:13, color: hover ? accent : '#4A566E', transition:'color .15s' }}>→</span>
        )}
      </div>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, lineHeight:1, color:'#EEF2F8', letterSpacing:.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize:12, color:'#8899BB', fontFamily:"'Barlow Condensed',sans-serif", overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sub}</div>}
    </div>
  );
}

function ChartTooltip({ left, children }) {
  return (
    <div style={{
      position:'absolute', bottom:'calc(100% + 8px)', left, transform:'translateX(-50%)',
      background:'#0E1420', border:'1px solid #F0B42955', borderRadius:8, padding:'7px 11px',
      fontSize:11, whiteSpace:'nowrap', zIndex:5, boxShadow:'0 4px 16px rgba(0,0,0,.5)',
      fontFamily:"'Barlow Condensed',sans-serif", pointerEvents:'none',
    }}>
      {children}
    </div>
  );
}

function SegmentedTrack({ puntos }) {
  const [hover, setHover] = useState(null);
  if (!puntos.length) return <div style={{ color:'#4A566E', fontSize:13, padding:'20px 0' }}>Todavía no hay fechas cargadas.</div>;
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:14, fontSize:11, color:'#6B7A99', fontFamily:"'Barlow Condensed',sans-serif", marginBottom:12 }}>
        <span style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ width:9, height:9, borderRadius:3, background:'linear-gradient(135deg,#FFD166,#F0B429)', display:'inline-block' }}/>Jugados
        </span>
        <span style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ width:9, height:9, borderRadius:3, background:'#141C2A', border:'1px solid #2C3A52', display:'inline-block' }}/>Pendientes
        </span>
      </div>
      <div style={{ display:'flex', gap:4 }}>
        {puntos.map((p, i) => {
          const activo = hover === i;
          const pct = p.total ? (p.finalizados / p.total) * 100 : 0;
          return (
            <div key={p.id} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              style={{ flex:1, position:'relative', cursor:'pointer', minWidth:0 }}>
              {activo && (
                <ChartTooltip left="50%">
                  <div style={{ color:'#F0B429', fontWeight:700, marginBottom:2 }}>{p.label}</div>
                  <div style={{ color:'#8899BB' }}>{p.finalizados}/{p.total} jugados · {Math.round(pct)}%</div>
                </ChartTooltip>
              )}
              <div style={{
                height:34, background:'#141C2A', borderRadius:6, overflow:'hidden',
                border: activo ? '1px solid rgba(240,180,41,.55)' : '1px solid transparent',
                boxShadow: activo ? '0 0 14px rgba(240,180,41,.25)' : 'none',
                transition:'box-shadow .15s, border-color .15s',
              }}>
                <div style={{ height:'100%', width:`${pct}%`, background:'linear-gradient(135deg,#FFD166,#F0B429)', transition:'width .2s' }}/>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', gap:4, marginTop:6 }}>
        {puntos.map((p, i) => (
          <div key={p.id} style={{ flex:1, textAlign:'center', fontSize:9, color: hover===i ? '#F0B429' : '#2C3A52', fontFamily:"'Barlow Condensed',sans-serif" }}>
            {p.numero}
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ value, label, color }) {
  return (
    <div style={{ textAlign:'center' }}>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:19, color, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:110 }}>{value}</div>
      <div style={{ fontSize:9, color:'#4A566E', marginTop:2 }}>{label}</div>
    </div>
  );
}

function MiniMultiChart({ extra }) {
  if (!extra) return null;
  const { pctTotal, porSemana, jugadosHoy, diaTop, quedanSemana } = extra;
  const r = 24, C = 2 * Math.PI * r;
  const offset = C - (Math.min(100, pctTotal) / 100) * C;

  const W = 100, H = 42;
  const maxCount = Math.max(1, ...porSemana.map(s => s.count));
  const stepX = porSemana.length > 1 ? W / (porSemana.length - 1) : W;
  const pts = porSemana.map((s, i) => ({ x: porSemana.length > 1 ? i * stepX : W / 2, y: H - (s.count / maxCount) * H }));

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:18 }}>
      <div style={{ background:'#0B111C', border:'1px solid #1C2535', borderRadius:10, padding:'10px 8px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#141C2A" strokeWidth="7"/>
          <circle cx="32" cy="32" r={r} fill="none" stroke="url(#miniAvanceGrad)" strokeWidth="7" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={offset} transform="rotate(-90 32 32)"/>
          <defs><linearGradient id="miniAvanceGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFD166"/><stop offset="100%" stopColor="#F0B429"/></linearGradient></defs>
          <text x="32" y="37" textAnchor="middle" fill="#EEF2F8" fontFamily="'Bebas Neue',sans-serif" fontSize="16">{Math.round(pctTotal)}%</text>
        </svg>
        <div style={{ fontSize:9, color:'#4A566E', marginTop:4 }}>Avance total</div>
      </div>
      <div style={{ background:'#0B111C', border:'1px solid #1C2535', borderRadius:10, padding:'12px 10px' }}>
        <div style={{ fontSize:9, color:'#4A566E', marginBottom:6 }}>Partidos por semana</div>
        {porSemana.length > 1 ? (
          <svg width="100%" height="42" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            <polyline points={pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
          </svg>
        ) : (
          <div style={{ fontSize:10, color:'#2C3A52', textAlign:'center', padding:'12px 0' }}>Sin datos suficientes</div>
        )}
      </div>
      <div style={{ gridColumn:'1 / 3', background:'#0B111C', border:'1px solid #1C2535', borderRadius:10, padding:'12px 10px', display:'flex', alignItems:'center', justifyContent:'space-around', flexWrap:'wrap', gap:10 }}>
        <MiniStat value={jugadosHoy} label="jugados hoy" color="#22D07A"/>
        <MiniStat value={diaTop ?? '—'} label="día con más partidos" color="#F0B429"/>
        <MiniStat value={quedanSemana} label="quedan esta semana" color="#E8187A"/>
      </div>
    </div>
  );
}

function AvanceSection({ puntos, extra }) {
  return (
    <div>
      <SegmentedTrack puntos={puntos}/>
      <MiniMultiChart extra={extra}/>
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
export default function Dashboard({ irACargarPartido, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [categoriaLeaders, setCategoriaLeaders] = useState('femenino');
  const [categoriaFixture, setCategoriaFixture] = useState('femenino');
  const [expanded, setExpanded] = useState({});

  const [kpis, setKpis] = useState({ jugados:0, pendientes:0, proximo:null, encuesta:null });
  const [leaders, setLeaders] = useState({ femenino:{}, masculino:{} });
  const [fixture, setFixture] = useState({ femenino:[], masculino:[] });
  const [chart, setChart] = useState({ femenino:[], masculino:[] });
  const [extra, setExtra] = useState({ femenino:null, masculino:null });

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

        // ── Extra para mini-graficos (avance total, partidos/semana, dia top) ──
        setExtra({
          femenino: buildExtra(partidos.filter(p => p.categoria === 'femenino'), buildFechaMap(ff)),
          masculino: buildExtra(partidos.filter(p => p.categoria === 'masculino'), buildFechaMap(fm)),
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
        <KpiCard icon="🏀" label="Partidos jugados" value={kpis.jugados} sub={`${avancePct}% del fixture`} accent="#F0B429"
          onClick={onNavigate ? () => onNavigate('partidos') : undefined}/>
        <KpiCard icon="⏳" label="Pendientes" value={kpis.pendientes} sub="por jugarse" accent="#60A5FA"
          onClick={onNavigate ? () => onNavigate('partidos') : undefined}/>
        <KpiCard icon="📅" label="Próximo partido" value={proximoLabel ?? '—'}
          sub={kpis.proximo ? `${fmtFecha(kpis.proximo.fecha_partido)}${fmtHora(kpis.proximo.hora_inicio) ? ' · '+fmtHora(kpis.proximo.hora_inicio)+'hs' : ''}` : 'sin fecha cargada'}
          accent="#22D07A" onClick={onNavigate ? () => onNavigate('partidos') : undefined}/>
        <KpiCard icon="🗳️" label="Encuesta activa" value={kpis.encuesta ? `${kpis.encuesta.votos} votos` : 'ninguna'}
          sub={kpis.encuesta?.pregunta ?? '—'} accent="#E8187A" onClick={onNavigate ? () => onNavigate('encuestas') : undefined}/>
      </div>

      {/* Avance por fecha */}
      <div style={{ background:'linear-gradient(160deg,#101826,#0B111C)', border:'1px solid #1C2535', borderRadius:14, padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:.5, color:'#EEF2F8' }}>Avance del fixture</div>
          <CategoriaToggle categoria={categoriaLeaders} setCategoria={setCategoriaLeaders} />
        </div>
        <AvanceSection puntos={chart[categoriaLeaders]} extra={extra[categoriaLeaders]} />
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
                    {abierto ? '▲ Ver menos' : lista.length > 20 ? `▼ Ver top 20 (de ${lista.length})` : `▼ Ver todos (${lista.length})`}
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
                      background:`linear-gradient(115deg, ${p.local.color}22, #0E1420 45%, ${p.visit.color}22)`, border:'1px solid #1C2535',
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
