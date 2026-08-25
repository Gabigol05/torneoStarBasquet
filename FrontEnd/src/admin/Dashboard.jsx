import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TABLAS } from './categoriaAdmin';
import { equiposFemenino } from '../data/femeninoData';
import { equiposMasculino } from '../data/masculinoData';
import { labelFecha, esPartidoPlayoff, labelInstanciaCorta } from '../lib/fechaLabel';
import { useTemporada } from '../context/TemporadaContext';

// ── Íconos ──────────────────────────────────────────────────────────────────
// Set de íconos de líneas (mismo trazo/tamaño) en vez de emoji sueltos —
// un emoji por tarjeta nunca termina de leerse "prolijo" porque cada uno
// tiene su propio estilo y grosor. Los mismos íconos se usan en KpiCard,
// en Alertas y en el podio de Líderes para que todo el panel comparta un
// solo lenguaje visual.
function Ic({ children, size = 14, color = 'currentColor', sw = 1.9 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{children}</svg>
  );
}
const IconBall      = p => <Ic {...p}><path d="M3 12h18M12 3v18M5.6 5.6c3 3 3 9.8 0 12.8M18.4 5.6c-3 3-3 9.8 0 12.8"/><circle cx="12" cy="12" r="9"/></Ic>;
const IconClock     = p => <Ic {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></Ic>;
const IconTrend     = p => <Ic {...p}><path d="M4 8h6l3 4 3-4h4"/><path d="M17 6.5 21 8l-1.5 4"/></Ic>;
const IconCalendar  = p => <Ic {...p}><rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></Ic>;
const IconPoll      = p => <Ic {...p}><path d="M4 10.5 12 4l8 6.5"/><path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9"/><path d="M12 12v5M9.5 14.5h5"/></Ic>;
const IconAlert     = p => <Ic {...p}><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></Ic>;
const IconTrophy    = p => <Ic {...p}><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 5.5H4a1 1 0 0 0-1 1V8a3 3 0 0 0 3 3M17 5.5h3a1 1 0 0 1 1 1V8a3 3 0 0 1-3 3M12 14v3.5M9 20.5h6M9.5 17.5h5l.6 3H8.9Z"/></Ic>;

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

// El plantel femenino ya no vive embebido en equiposFemenino (ver
// femeninoData.js) — ahora se arma igual que el masculino, a partir de las
// filas de jugadoras_femenino/jugadores_masculino que se traen de la base.
// Antes esta función leía el campo estático `eq.jugadoras`, que ya no existe
// desde que el plantel femenino se migró a la base — eso dejaba "Líderes
// femenino" siempre vacío (ningún nombre resolvía). Una sola función genérica
// para las dos categorías, en vez de mantener dos casi-iguales.
function buildJugadorMap(rows, idField) {
  const map = {};
  for (const r of (rows ?? [])) map[r[idField]] = { nombre: r.nombre, equipoId: r.equipo_id };
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
function domingoDeSemana(lunesStr) {
  const d = new Date(`${lunesStr}T00:00:00`);
  d.setDate(d.getDate() + 6);
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

  // "Ritmo esta semana" (Resumen): cuántos partidos hay cargados con fecha
  // esta semana vs. la semana pasada — mismo mapa `semanas` de arriba, solo
  // hay que mirar las dos claves puntuales en vez de las últimas 8.
  const lunesAnteriorD = new Date(`${lunesActual}T00:00:00`);
  lunesAnteriorD.setDate(lunesAnteriorD.getDate() - 7);
  const lunesAnterior = lunesAnteriorD.toISOString().slice(0, 10);
  const semanaActualCount = semanas[lunesActual] ?? 0;
  const semanaAnteriorCount = semanas[lunesAnterior] ?? 0;

  // Mapa de actividad (Lun–Dom × últimas N semanas) para el "punch card" del
  // panel. A propósito NO asume que solo se juega sábado/domingo — el
  // fixture puede tener partidos entre semana (recuperatorios, adelantos,
  // etc.), así que se calculan los 7 días de cada semana por igual. Se
  // incluyen semanas SIN ningún partido (en vez de solo las que tienen
  // datos, como `porSemana`) para que la grilla sea regular y una semana
  // libre se lea como "libre", no como un hueco raro.
  const NUM_SEMANAS_PUNCH = 6;
  const matrizActividad = Array.from({ length: NUM_SEMANAS_PUNCH }, (_, i) => {
    const lunesD = new Date(`${lunesActual}T00:00:00`);
    lunesD.setDate(lunesD.getDate() - (NUM_SEMANAS_PUNCH - 1 - i) * 7);
    const lunes = lunesD.toISOString().slice(0, 10);
    const dias = Array.from({ length: 7 }, (_, di) => {
      const d = new Date(`${lunes}T00:00:00`);
      d.setDate(d.getDate() + di);
      const iso = d.toISOString().slice(0, 10);
      const deEseDia = conFecha.filter(p => p.effDate === iso);
      return {
        iso, numero: d.getDate(),
        total: deEseDia.length,
        jugados: deEseDia.filter(p => p.estado === 'finalizado').length,
      };
    });
    return { lunes, dias };
  });

  return { pctTotal, jugados, total, porSemana, jugadosHoy, diaTop, quedanSemana, semanaActualCount, semanaAnteriorCount, matrizActividad };
}

function fmtSemana(wk) {
  try {
    const d = new Date(`${wk}T00:00:00`);
    return d.toLocaleDateString('es-AR', { day:'2-digit', month:'short' });
  } catch { return wk; }
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

function fmtDiaLargo(iso) {
  try {
    const d = new Date(`${iso}T00:00:00`);
    const txt = d.toLocaleDateString('es-AR', { weekday:'long', day:'2-digit', month:'short' });
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  } catch { return iso; }
}

// "Mapa de actividad": Lun–Dom × últimas N semanas, un círculo por día — el
// tamaño y color muestran cuántos partidos hubo y si ya se jugaron. A
// diferencia de la versión anterior (pensada solo para sábado/domingo), acá
// los 7 días están siempre presentes: si algún fin de semana se carga un
// partido entre semana (recuperatorio, adelanto, etc.) el mapa lo muestra
// bien en su columna en vez de quedar afuera o verse raro.
const DIA_PUNCH = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
function PunchCard({ matriz }) {
  const [hover, setHover] = useState(null);
  if (!matriz || matriz.length === 0) return null;
  const maxTotal = Math.max(1, ...matriz.flatMap(s => s.dias.map(d => d.total)));
  const activo = hover ? matriz[hover.wi]?.dias[hover.di] : null;

  return (
    <div style={{ background:'#0B111C', border:'1px solid #1C2535', borderRadius:10, padding:'12px 10px 10px' }}>
      <div style={{ fontSize:9, color:'#4A566E', marginBottom:8, textTransform:'uppercase', letterSpacing:.5 }}>
        Mapa de actividad · últimas {matriz.length} semanas
      </div>
      <div style={{ overflowX:'auto' }}>
        <div style={{ minWidth:340 }}>
          <div style={{ display:'grid', gridTemplateColumns:'44px repeat(7,1fr)', gap:3, marginBottom:3 }}>
            <div/>
            {DIA_PUNCH.map(d => (
              <div key={d} style={{ textAlign:'center', fontSize:8.5, color:'#4A566E', fontFamily:"'Barlow Condensed',sans-serif" }}>{d}</div>
            ))}
          </div>
          {matriz.map((semana, wi) => (
            <div key={semana.lunes} style={{ display:'grid', gridTemplateColumns:'44px repeat(7,1fr)', gap:3, marginBottom:3, alignItems:'center' }}>
              <div style={{ fontSize:8.5, color:'#4A566E', fontFamily:"'Barlow Condensed',sans-serif" }}>{fmtSemana(semana.lunes)}</div>
              {semana.dias.map((d, di) => {
                const esActivo = hover && hover.wi === wi && hover.di === di;
                const frac = d.total / maxTotal;
                const r = d.total === 0 ? 3 : 5 + frac * 8;
                const pctJugado = d.total ? d.jugados / d.total : 0;
                const color = d.total === 0 ? 'transparent'
                  : pctJugado === 1 ? '#F0B429'
                  : pctJugado === 0 ? '#60A5FA'
                  : '#8FB9E8';
                return (
                  <div key={d.iso} onMouseEnter={() => setHover({ wi, di })} onMouseLeave={() => setHover(null)}
                    style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', height:22, cursor:'pointer' }}>
                    <div style={{
                      width:r * 2, height:r * 2, borderRadius:'50%', background:color,
                      border: d.total === 0 ? '1px solid #1C2535' : 'none',
                      boxShadow: esActivo ? `0 0 0 2px ${d.total === 0 ? '#2C3A52' : color}66` : 'none',
                      transition:'box-shadow .15s',
                    }}/>
                    {esActivo && (
                      <ChartTooltip left="50%">
                        <div style={{ color:'#F0B429', fontWeight:700, marginBottom:2 }}>{fmtDiaLargo(d.iso)}</div>
                        <div style={{ color:'#8899BB' }}>{d.total === 0 ? 'Sin partidos' : `${d.jugados}/${d.total} jugados`}</div>
                      </ChartTooltip>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', gap:12, marginTop:8, fontSize:9, color:'#6B7A99', fontFamily:"'Barlow Condensed',sans-serif", flexWrap:'wrap' }}>
        <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:8, height:8, borderRadius:'50%', background:'#F0B429', display:'inline-block' }}/>jugados</span>
        <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:8, height:8, borderRadius:'50%', background:'#60A5FA', display:'inline-block' }}/>pendientes</span>
        <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:8, height:8, borderRadius:'50%', border:'1px solid #1C2535', display:'inline-block' }}/>sin partidos</span>
        <span style={{ marginLeft:'auto', color:'#4A566E' }}>tamaño = cantidad de partidos ese día</span>
      </div>
    </div>
  );
}

function MiniMultiChart({ extra }) {
  if (!extra) return null;
  const { pctTotal, jugados, total, jugadosHoy, diaTop, quedanSemana, matrizActividad } = extra;
  const r = 24, C = 2 * Math.PI * r;
  const offset = C - (Math.min(100, pctTotal) / 100) * C;

  return (
    <div style={{ marginTop:18 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
        <div style={{ background:'#0B111C', border:'1px solid #1C2535', borderRadius:10, padding:'10px 8px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r={r} fill="none" stroke="#141C2A" strokeWidth="7"/>
            <circle cx="32" cy="32" r={r} fill="none" stroke="url(#miniAvanceGrad)" strokeWidth="7" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={offset} transform="rotate(-90 32 32)"/>
            <defs><linearGradient id="miniAvanceGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFD166"/><stop offset="100%" stopColor="#F0B429"/></linearGradient></defs>
            <text x="32" y="37" textAnchor="middle" fill="#EEF2F8" fontFamily="'Bebas Neue',sans-serif" fontSize="16">{Math.round(pctTotal)}%</text>
          </svg>
          <div style={{ fontSize:9, color:'#4A566E', marginTop:4 }}>Avance total</div>
          <div style={{ fontSize:9, color:'#6B7A99', marginTop:1 }}>{jugados}/{total} partidos</div>
        </div>
        <div style={{ background:'#0B111C', border:'1px solid #1C2535', borderRadius:10, padding:'10px 8px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'space-around', gap:6 }}>
          <MiniStat value={jugadosHoy} label="jugados hoy" color="#22D07A"/>
          <MiniStat value={diaTop ?? '—'} label="día con más partidos" color="#F0B429"/>
          <MiniStat value={quedanSemana} label="quedan esta semana" color="#E8187A"/>
        </div>
      </div>
      <PunchCard matriz={matrizActividad}/>
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


function iniciales(nombre) {
  return (nombre || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

// "Esta semana" ahora es una mini-calendario Lun–Dom (en vez de un banner de
// dos números) — de un vistazo se ve QUÉ día tiene partidos programados o
// jugados, no solo el total de la semana entera.
const DIA_CORTA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
function EstaSemanaCard({ resumen, onNavigate }) {
  if (!resumen) return null;
  const { dias = [], jugados, pendientes, lider } = resumen;
  return (
    <div style={{ background:'#0B111C', border:'1px solid #1C2535', borderRadius:12, padding:'14px 14px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
        <IconCalendar size={13} color="#F0B429"/>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:'#F0B429', fontFamily:"'Barlow Condensed',sans-serif", textTransform:'uppercase' }}>Esta semana</div>
      </div>
      <div style={{ display:'flex', gap:5, marginBottom:10 }}>
        {dias.map((d, i) => {
          const finde = i >= 5;
          return (
            <div key={d.iso} title={`${d.programados} partido${d.programados===1?'':'s'}`} style={{
              flex:1, aspectRatio:'1', borderRadius:7, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              background: d.esHoy ? 'rgba(240,180,41,.16)' : finde ? 'rgba(96,165,250,.10)' : '#141C2A',
              border: d.esHoy ? '1.5px solid #F0B429' : finde ? '1px solid rgba(96,165,250,.35)' : '1px solid #1C2535',
            }}>
              <div style={{ fontSize:8, color: d.esHoy ? '#F0B429' : '#4A566E', fontFamily:"'Barlow Condensed',sans-serif" }}>{DIA_CORTA[i]}</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color: d.esHoy ? '#F0B429' : '#CBD5E8' }}>{d.numero}</div>
              {d.programados > 0 && (
                <div style={{ width:4, height:4, borderRadius:'50%', background: d.jugados===d.programados ? '#22D07A' : '#60A5FA', marginTop:1 }}/>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', gap:12, fontSize:10, color:'#6B7A99', marginBottom:10 }}>
        <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:6, height:6, borderRadius:'50%', background:'#22D07A', display:'inline-block' }}/>jugado</span>
        <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:6, height:6, borderRadius:'50%', background:'#60A5FA', display:'inline-block' }}/>programado</span>
      </div>
      <div style={{ borderTop:'1px solid #1C2535', paddingTop:10, fontSize:12, color:'#8899BB' }}>
        <button onClick={onNavigate ? () => onNavigate('partidos') : undefined} style={{ background:'none', border:'none', padding:0, cursor: onNavigate ? 'pointer' : 'default', color:'inherit', textAlign:'left', font:'inherit' }}>
          <span style={{ color:'#22D07A', fontWeight:700 }}>{jugados}</span> jugado{jugados===1?'':'s'} · <span style={{ color:'#60A5FA', fontWeight:700 }}>{pendientes}</span> pendiente{pendientes===1?'':'s'}
        </button>
        {lider && (
          <div style={{ marginTop:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            🔥 Lidera {lider.categoria === 'femenino' ? '♀' : '♂'} <span style={{ color:'#F0B429' }}>{lider.nombre}</span> con {lider.pts} pts
          </div>
        )}
      </div>
    </div>
  );
}

// Alertas: solo lo calculable con certeza a partir de los datos ya traídos
// (ver buildAlertas más arriba en el fetch) — nunca alertas especulativas.
function AlertasCard({ alertas, onNavigate }) {
  return (
    <div style={{ background:'#0B111C', border:'1px solid #1C2535', borderRadius:12, padding:'14px 14px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
        <IconAlert size={13} color="#E8187A"/>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:'#E8187A', fontFamily:"'Barlow Condensed',sans-serif", textTransform:'uppercase' }}>Alertas</div>
      </div>
      {alertas.length === 0 ? (
        <div style={{ fontSize:12, color:'#4A566E', display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ color:'#22D07A' }}>✓</span> Todo en orden
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {alertas.map(a => (
            <button key={a.id} onClick={onNavigate ? () => onNavigate('partidos') : undefined} style={{
              display:'flex', alignItems:'flex-start', gap:8, textAlign:'left', background:'rgba(232,24,122,.06)',
              border:'1px solid rgba(232,24,122,.25)', borderRadius:8, padding:'8px 10px', cursor: onNavigate ? 'pointer' : 'default',
              fontSize:11.5, color:'#CBD5E8', lineHeight:1.4, fontFamily:"'Barlow Condensed',sans-serif",
            }}>
              <span style={{ color:'#E8187A', flexShrink:0 }}>●</span>{a.texto}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// "Próximo partido" como mini match-card (dos círculos con iniciales + VS) en
// vez de una línea de texto — se lee de un vistazo, no hay que "parsear" el
// nombre de dos equipos concatenados adentro de un KpiCard genérico.
function ProximoCard({ proximo, onClick }) {
  const clickable = !!onClick;
  if (!proximo) {
    return (
      <div onClick={onClick} style={{
        background:'linear-gradient(160deg,#22D07A16,#0B111C 55%)', border:'1px solid #22D07A40', borderTop:'3px solid #22D07A',
        borderRadius:14, padding:'15px 18px 16px', display:'flex', flexDirection:'column', gap:6, cursor: clickable ? 'pointer' : 'default', minWidth:0,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:'#22D07A33', border:'1px solid #22D07A77', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><IconCalendar size={15} color="#22D07A"/></div>
          <div style={{ fontSize:11, color:'#22D07A', fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, letterSpacing:.8, textTransform:'uppercase' }}>Próximo partido</div>
        </div>
        <div style={{ fontSize:13, color:'#4A566E', fontFamily:"'Barlow Condensed',sans-serif" }}>Sin fecha cargada</div>
      </div>
    );
  }
  const eqL = equipoInfo(proximo.categoria, proximo.equipo_local_id);
  const eqV = equipoInfo(proximo.categoria, proximo.equipo_visit_id);
  const fecha = fmtFecha(proximo.fecha_partido);
  const hora = fmtHora(proximo.hora_inicio);
  return (
    <div onClick={onClick} style={{
      background:'linear-gradient(160deg,#22D07A16,#0B111C 55%)', border:'1px solid #22D07A40', borderTop:'3px solid #22D07A',
      borderRadius:14, padding:'13px 16px 14px', display:'flex', flexDirection:'column', gap:8, cursor: clickable ? 'pointer' : 'default', minWidth:0,
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#22D07A', fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, letterSpacing:.8, textTransform:'uppercase' }}>
          <IconCalendar size={13} color="#22D07A"/>Próximo
        </div>
        {fecha && (
          <span style={{ fontSize:10, color:'#8899BB', background:'#141C2A', border:'1px solid #1C2535', borderRadius:100, padding:'2px 8px', flexShrink:0 }}>
            {fecha}{hora ? ` · ${hora}hs` : ''}
          </span>
        )}
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, minWidth:0, flex:1 }}>
          <div style={{ width:30, height:30, borderRadius:'50%', background:`${eqL.color}33`, border:`1.5px solid ${eqL.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#EEF2F8', fontFamily:"'Barlow Condensed',sans-serif" }}>{iniciales(eqL.nombre)}</div>
          <div style={{ fontSize:10.5, color:'#CBD5E8', textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%' }}>{eqL.nombre}</div>
        </div>
        <div style={{ fontSize:10, color:'#4A566E', fontFamily:"'Barlow Condensed',sans-serif", flexShrink:0 }}>VS</div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, minWidth:0, flex:1 }}>
          <div style={{ width:30, height:30, borderRadius:'50%', background:`${eqV.color}33`, border:`1.5px solid ${eqV.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#EEF2F8', fontFamily:"'Barlow Condensed',sans-serif" }}>{iniciales(eqV.nombre)}</div>
          <div style={{ fontSize:10.5, color:'#CBD5E8', textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%' }}>{eqV.nombre}</div>
        </div>
      </div>
    </div>
  );
}

// "Ritmo esta semana": partidos con fecha cargada esta semana vs. la semana
// pasada — una tendencia real (▲/▼), no solo un número suelto.
function RitmoCard({ actual, anterior, onClick }) {
  const diff = actual - anterior;
  const clickable = !!onClick;
  return (
    <div onClick={onClick} style={{
      background:'linear-gradient(160deg,#A78BFA16,#0B111C 55%)', border:'1px solid #A78BFA40', borderTop:'3px solid #A78BFA',
      borderRadius:14, padding:'15px 18px 16px', display:'flex', flexDirection:'column', gap:6, cursor: clickable ? 'pointer' : 'default', minWidth:0,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:32, height:32, borderRadius:9, background:'#A78BFA33', border:'1px solid #A78BFA77', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><IconTrend size={15} color="#A78BFA"/></div>
        <div style={{ fontSize:11, color:'#A78BFA', fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, letterSpacing:.8, textTransform:'uppercase' }}>Ritmo esta semana</div>
      </div>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, lineHeight:1, color:'#EEF2F8', letterSpacing:.5 }}>{actual}</div>
      <div style={{ fontSize:12, color: diff > 0 ? '#22D07A' : diff < 0 ? '#E8187A' : '#8899BB', fontFamily:"'Barlow Condensed',sans-serif" }}>
        {diff === 0 ? 'igual que la semana pasada' : `${diff > 0 ? '▲' : '▼'} ${Math.abs(diff)} vs. semana pasada (${anterior})`}
      </div>
    </div>
  );
}

// Podio de Líderes: top 3 en tarjetas, con acumulado siempre visible al lado
// del promedio — esto es lo que resuelve la confusión original (alguien con
// igual o menor promedio pero más partidos jugados puede tener más puntos
// TOTALES, que es como ordena la página pública).
const PODIO_ESTILO = [
  { medalla:'🥇', color:'#F0B429', bg:'rgba(240,180,41,.10)', border:'rgba(240,180,41,.4)' },
  { medalla:'🥈', color:'#C7CDD8', bg:'rgba(199,205,216,.08)', border:'rgba(199,205,216,.3)' },
  { medalla:'🥉', color:'#D08A50', bg:'rgba(208,138,80,.08)', border:'rgba(208,138,80,.3)' },
];
function PodioCard({ leader, rank, unit, sortBy }) {
  const st = PODIO_ESTILO[rank - 1];
  // El número grande y la etiqueta cambian según el toggle Promedio/Acumulado
  // — antes esto quedaba fijo en promedio (y el pie decía siempre "pts",
  // aunque el stat activo fuera rebotes/asistencias/etc.), así que en
  // Acumulado se seguía mostrando el promedio sin que se notara.
  const principal = sortBy === 'total' ? leader.total : leader.value;
  const secundario = sortBy === 'total' ? leader.value : leader.total;
  return (
    <div style={{
      background: st.bg, border:`1px solid ${st.border}`, borderTop:`3px solid ${st.color}`, borderRadius:12,
      padding:'14px 14px 12px', display:'flex', flexDirection:'column', alignItems:'center', gap:6, minWidth:0,
    }}>
      <div style={{ fontSize:18 }}>{st.medalla}</div>
      {leader.equipo.logo
        ? <img src={leader.equipo.logo} alt="" width={36} height={36} style={{ borderRadius:'50%', objectFit:'cover', border:`1.5px solid ${st.color}` }} onError={e=>{e.currentTarget.style.display='none';}}/>
        : <div style={{ width:36, height:36, borderRadius:'50%', background:`${leader.equipo.color}44`, border:`1.5px solid ${st.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#EEF2F8' }}>{iniciales(leader.nombre)}</div>}
      <div style={{ fontSize:12.5, color:'#EEF2F8', textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%', fontFamily:"'Barlow Condensed',sans-serif" }}>{leader.nombre}</div>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color: st.color, lineHeight:1 }}>
        {principal}<span style={{ fontSize:11, marginLeft:3, color:'#8899BB' }}>{unit}</span>
      </div>
      <div style={{ fontSize:10, color:'#6B7A99', fontFamily:"'Barlow Condensed',sans-serif" }}>{sortBy === 'total' ? 'ACUM' : 'PROM'} · {leader.pj} PJ</div>
      <div style={{ fontSize:9.5, color:'#4A566E', fontFamily:"'Barlow Condensed',sans-serif" }}>
        {sortBy === 'total' ? `${secundario} ${unit} de prom.` : `${secundario} ${unit} totales`}
      </div>
    </div>
  );
}
function LeaderTableRow({ leader, rank, sortBy }) {
  return (
    <div className="dash-table-row">
      <div style={{ color:'#4A566E' }}>{rank}</div>
      <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0, color:'#CBD5E8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {leader.equipo.logo && <img src={leader.equipo.logo} alt="" width={16} height={16} style={{ borderRadius:'50%', objectFit:'cover', flexShrink:0 }} onError={e=>{e.currentTarget.style.display='none';}}/>}
        {leader.nombre}
      </div>
      <div style={{ color:'#6B7A99', textAlign:'right' }}>{leader.pj}</div>
      <div className={sortBy === 'total' ? '' : 'dash-col-secondary'} style={{ color: sortBy === 'total' ? '#F0B429' : '#8899BB', fontWeight: sortBy === 'total' ? 700 : 400, textAlign:'right' }}>{leader.total}</div>
      <div className={sortBy === 'prom' ? '' : 'dash-col-secondary'} style={{ color: sortBy === 'prom' ? '#F0B429' : '#EEF2F8', textAlign:'right', fontFamily:"'Bebas Neue',sans-serif", fontSize:14 }}>{leader.value}</div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
// El selector femenino/masculino ahora es UNO SOLO, compartido con el resto
// del panel (lo maneja AdminPanel y se recibe acá por prop, igual que en
// StatsEditor/PartidosManager/etc.) — antes Resumen tenía TRES toggles
// sueltos y parcialmente redundantes (uno para "Avance", otro para
// "Líderes" — que en realidad ya compartían el mismo estado — y otro más
// para "Fixture completo"), lo que hacía fácil terminar mirando datos de
// una categoría en una tarjeta y de la otra en la de al lado sin darse
// cuenta. Con un solo selector arriba de todo, las tres secciones siempre
// muestran la misma categoría entre sí.
export default function Dashboard({ irACargarPartido, onNavigate, categoria: categoriaProp, setCategoria: setCategoriaProp }) {
  const [loading, setLoading] = useState(true);
  const [categoriaLocal, setCategoriaLocal] = useState('femenino');
  const categoria    = categoriaProp ?? categoriaLocal;
  const setCategoria = setCategoriaProp ?? setCategoriaLocal;
  const [expanded, setExpanded] = useState({});

  const [kpis, setKpis] = useState({ jugados:0, pendientes:0, proximo:null, encuesta:null });
  const [leaders, setLeaders] = useState({ femenino:{}, masculino:{} });
  const [fixture, setFixture] = useState({ femenino:[], masculino:[] });
  const [chart, setChart] = useState({ femenino:[], masculino:[] });
  const [extra, setExtra] = useState({ femenino:null, masculino:null });
  // Resumen semanal — "esta semana: N jugados, M pendientes, líder en puntos".
  // Se arma con los mismos datos ya scopeados a la temporada activa, más una
  // consulta chica extra a stats_partido para sacar quién más anotó en los
  // partidos finalizados de esta semana puntual.
  const [resumenSemanal, setResumenSemanal] = useState(null);
  // Alertas calculadas de datos reales (nunca especulativas) y estado de la
  // sección Líderes rediseñada: una categoría de stat a la vez (antes eran 5
  // columnas juntas) + un toggle para ordenar por promedio o por acumulado.
  const [alertas, setAlertas] = useState([]);
  const [statTab, setStatTab] = useState('pts_prom');
  const [sortBy, setSortBy] = useState('prom');
  // Filtro de fecha para "Fixture completo" — antes se listaban TODAS las
  // fechas juntas en una sola lista con scroll largo; con esto se puede
  // mirar una fecha puntual y evitar el scroll innecesario.
  const [fechaFiltro, setFechaFiltro] = useState('todas');
  // Los ids de fecha son propios de cada categoría — al cambiar de categoría
  // (o de temporada) se vuelve a "Todas" en vez de quedar apuntando a un id
  // que ya no corresponde a nada visible.
  useEffect(() => { setFechaFiltro('todas'); }, [categoria]);
  const { temporadaActivaId, temporadas, loading: temporadaLoading } = useTemporada();
  const temporadaActiva = temporadas.find(t => t.id === temporadaActivaId);
  // Qué temporada está mirando el resumen — arranca en la activa, pero el
  // dueño puede elegir ver el resumen de una temporada archivada sin que eso
  // mezcle nada (todo el fetch de abajo se re-scopea a esta, no a la activa).
  // Si por algún motivo no hay ninguna marcada como activa, cae en la más
  // reciente en vez de bloquear todo el resumen.
  const [temporadaVerId, setTemporadaVerId] = useState(null);
  // Si alguna de las consultas de este resumen falla (RLS, red, lo que sea),
  // se muestra acá en vez de dejar todo en cero sin explicación.
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    if (temporadaVerId != null) return;
    if (temporadaActivaId != null) { setTemporadaVerId(temporadaActivaId); return; }
    if (temporadas.length > 0) {
      const masReciente = [...temporadas].sort((a, b) => b.id - a.id)[0];
      setTemporadaVerId(masReciente.id);
    }
  }, [temporadaActivaId, temporadas, temporadaVerId]);

  useEffect(() => {
    // Todavía no se resolvió qué temporada mirar — esperar antes de pedir
    // datos, para no traer "todo" sin filtro por un instante y mezclar
    // temporadas en la primera pintada.
    if (!temporadaVerId) return;
    let cancelado = false;
    (async () => {
      setLoading(true);
      setFetchError(null);
      try {
        // 1. Fechas de la temporada ACTIVA únicamente — todo lo demás se
        // filtra a partir de estos ids, porque partidos_X no tiene
        // temporada_id propio (solo lo tiene fechas_X).
        const [{ data: ff, error: ffErr }, { data: fm, error: fmErr }] = await Promise.all([
          supabase.from(TABLAS.femenino.fechas).select('*').eq('temporada_id', temporadaVerId).order('numero', { ascending:true }),
          supabase.from(TABLAS.masculino.fechas).select('*').eq('temporada_id', temporadaVerId).order('numero', { ascending:true }),
        ]);
        if (cancelado) return;
        // Acá antes se ignoraba `error` por completo — si cualquiera de las
        // ~15 consultas de este resumen fallaba (ej: falta de permiso RLS,
        // como pasó hoy con "temporadas"), el resumen entero se quedaba
        // "quieto" mostrando ceros en todo, sin ninguna pista de que en
        // realidad no se pudo traer nada.
        if (ffErr || fmErr) throw new Error((ffErr ?? fmErr).message);
        const fechaIdsFem = (ff ?? []).map(f => f.id);
        const fechaIdsMasc = (fm ?? []).map(f => f.id);

        const [
          { data: pf, error: pfErr }, { data: pm, error: pmErr },
          { data: sf, error: sfErr }, { data: sm, error: smErr },
          { data: jf, error: jfErr }, { data: jm, error: jmErr },
          { data: encAct },
        ] = await Promise.all([
          fechaIdsFem.length  ? supabase.from(TABLAS.femenino.partidos).select('*').in('fecha_id', fechaIdsFem)   : Promise.resolve({ data: [] }),
          fechaIdsMasc.length ? supabase.from(TABLAS.masculino.partidos).select('*').in('fecha_id', fechaIdsMasc) : Promise.resolve({ data: [] }),
          supabase.from(TABLAS.femenino.estadisticas).select('*').eq('temporada_id', temporadaVerId),
          supabase.from(TABLAS.masculino.estadisticas).select('*').eq('temporada_id', temporadaVerId),
          supabase.from(TABLAS.femenino.jugadores).select('id,nombre,equipo_id'),
          supabase.from(TABLAS.masculino.jugadores).select('id,nombre,equipo_id'),
          supabase.from('encuestas').select('*').eq('activa', true).order('creado_en', { ascending:false }).limit(1),
        ]);
        if (cancelado) return;
        const primerError = pfErr ?? pmErr ?? sfErr ?? smErr ?? jfErr ?? jmErr;
        if (primerError) throw new Error(primerError.message);

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
        const jugadorMapFem = buildJugadorMap(jf, 'id');
        const jugadorMapMasc = buildJugadorMap(jm, 'id');

        // ── Resumen semanal (lunes a domingo de HOY) ──
        const fechaMapFem  = buildFechaMap(ff);
        const fechaMapMasc = buildFechaMap(fm);
        const lunesActual = lunesDeSemana(hoy);
        const domingoActual = domingoDeSemana(lunesActual);
        const enEstaSemana = p => {
          const fm2 = p.categoria === 'femenino' ? fechaMapFem : fechaMapMasc;
          const eff = fechaEfectiva(p, fm2);
          return eff && eff >= lunesActual && eff <= domingoActual;
        };
        const partidosSemana = partidos.filter(enEstaSemana);
        const jugadosSemana = partidosSemana.filter(p => p.estado === 'finalizado');
        const pendientesSemana = partidosSemana.filter(p => p.estado !== 'finalizado').length;
        const idsSemanaFem  = jugadosSemana.filter(p => p.categoria === 'femenino').map(p => p.id);
        const idsSemanaMasc = jugadosSemana.filter(p => p.categoria === 'masculino').map(p => p.id);

        let liderSemana = null;
        if (idsSemanaFem.length || idsSemanaMasc.length) {
          const [{ data: stFemSemana }, { data: stMascSemana }] = await Promise.all([
            idsSemanaFem.length  ? supabase.from(TABLAS.femenino.stats).select('jugadora_id,pts').in('partido_id', idsSemanaFem)   : Promise.resolve({ data: [] }),
            idsSemanaMasc.length ? supabase.from(TABLAS.masculino.stats).select('jugador_id,pts').in('partido_id', idsSemanaMasc) : Promise.resolve({ data: [] }),
          ]);
          const sumarPts = (rows, idField) => {
            const acc = {};
            for (const r of (rows ?? [])) acc[r[idField]] = (acc[r[idField]] ?? 0) + Number(r.pts || 0);
            return acc;
          };
          const candidatos = [
            ...Object.entries(sumarPts(stFemSemana, 'jugadora_id')).map(([id, pts]) => {
              const info = jugadorMapFem[id]; if (!info) return null;
              return { id, pts, categoria:'femenino', nombre: info.nombre, equipo: equipoInfo('femenino', info.equipoId) };
            }),
            ...Object.entries(sumarPts(stMascSemana, 'jugador_id')).map(([id, pts]) => {
              const info = jugadorMapMasc[id]; if (!info) return null;
              return { id, pts, categoria:'masculino', nombre: info.nombre, equipo: equipoInfo('masculino', info.equipoId) };
            }),
          ].filter(Boolean).sort((a, b) => b.pts - a.pts);
          liderSemana = candidatos[0] ?? null;
        }
        // Desglose día por día (Lun–Dom) de esta semana puntual, para la
        // mini-calendario del panel — cuántos partidos hay programados y
        // cuántos ya se jugaron en cada día exacto.
        const diasSemana = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(`${lunesActual}T00:00:00`);
          d.setDate(d.getDate() + i);
          const iso = d.toISOString().slice(0, 10);
          const deEseDia = partidosSemana.filter(p => {
            const fm2 = p.categoria === 'femenino' ? fechaMapFem : fechaMapMasc;
            return fechaEfectiva(p, fm2) === iso;
          });
          return {
            iso, numero: d.getDate(), esHoy: iso === hoy,
            programados: deEseDia.length,
            jugados: deEseDia.filter(p => p.estado === 'finalizado').length,
          };
        });

        if (!cancelado) {
          setResumenSemanal({
            jugados: jugadosSemana.length,
            pendientes: pendientesSemana,
            lider: liderSemana,
            lunes: lunesActual, domingo: domingoActual,
            dias: diasSemana,
          });
        }

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
                // pj + total (acumulado) además del promedio: la página pública
                // ordena por total acumulado, no por promedio, así que el panel
                // necesita mostrar ambos para que se entienda por qué alguien
                // puede aparecer primero ahí aunque acá tenga menor promedio.
                const totalKey = col.key.replace('_prom', '_total');
                return {
                  id: jugId, nombre: info.nombre, equipo: eq,
                  value: Number(r[col.key]).toFixed(1),
                  pj: Number(r.pj || 0),
                  total: Number(r[totalKey] ?? 0),
                };
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
        const chartFem = buildChart(ff, partidos.filter(p => p.categoria === 'femenino'));
        const chartMasc = buildChart(fm, partidos.filter(p => p.categoria === 'masculino'));
        setChart({ femenino: chartFem, masculino: chartMasc });

        // ── Extra para mini-graficos (avance total, partidos/semana, dia top) ──
        setExtra({
          femenino: buildExtra(partidos.filter(p => p.categoria === 'femenino'), buildFechaMap(ff)),
          masculino: buildExtra(partidos.filter(p => p.categoria === 'masculino'), buildFechaMap(fm)),
        });

        // ── Alertas: solo lo que se puede calcular con certeza a partir de
        // los datos ya traídos (nada especulativo) — pendientes viejos sin
        // cargar y fechas cargadas "a medias" (algunos resultados sí, otros
        // no todavía). ──
        const diezDiasAtras = new Date();
        diezDiasAtras.setDate(diezDiasAtras.getDate() - 10);
        const diezDiasAtrasStr = diezDiasAtras.toISOString().slice(0, 10);
        const pendientesViejos = partidos.filter(p => p.estado === 'pendiente' && p.fecha_partido && p.fecha_partido < diezDiasAtrasStr);
        const fechasIncompletas = [
          ...chartFem.map(f => ({ ...f, categoria:'femenino' })),
          ...chartMasc.map(f => ({ ...f, categoria:'masculino' })),
        ].filter(f => f.finalizados > 0 && f.finalizados < f.total);

        const nuevasAlertas = [];
        if (pendientesViejos.length > 0) {
          nuevasAlertas.push({
            id: 'pendientes-viejos', tipo: 'warning',
            texto: `${pendientesViejos.length} partido${pendientesViejos.length === 1 ? '' : 's'} pendiente${pendientesViejos.length === 1 ? '' : 's'} con fecha de hace más de 10 días sin resultado cargado`,
            categoria: null,
          });
        }
        if (fechasIncompletas.length > 0) {
          nuevasAlertas.push({
            id: 'fechas-incompletas', tipo: 'info',
            texto: `${fechasIncompletas.length} fecha${fechasIncompletas.length === 1 ? '' : 's'} con partidos cargados a medias (algunos resultados sí, otros todavía no)`,
            categoria: null,
          });
        }
        if (!cancelado) setAlertas(nuevasAlertas);
      } catch (err) {
        if (!cancelado) setFetchError(err.message);
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => { cancelado = true; };
  }, [temporadaVerId]);

  const totalPartidos = kpis.jugados + kpis.pendientes;
  const avancePct = totalPartidos ? Math.round((kpis.jugados / totalPartidos) * 100) : 0;

  if (temporadaLoading || (loading && temporadaVerId)) {
    return <div style={{ padding:'40px 0', textAlign:'center', color:'#4A566E', fontFamily:"'Barlow Condensed',sans-serif" }}>Cargando resumen…</div>;
  }
  if (temporadas.length === 0) {
    return <div style={{ padding:'40px 0', textAlign:'center', color:'#4A566E', fontFamily:"'Barlow Condensed',sans-serif" }}>Todavía no hay ninguna temporada creada — creá una desde "Temporadas" en Herramientas.</div>;
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {fetchError && (
        <div style={{
          padding:'12px 16px', borderRadius:10, background:'rgba(240,64,96,.08)',
          border:'1px solid rgba(240,64,96,.3)', color:'#F04060', fontSize:13, lineHeight:1.5,
        }}>
          ⚠️ No se pudo traer parte de la información del resumen: {fetchError}
          <br/>Los números de abajo pueden estar incompletos — refrescá la página o avisá si sigue pasando.
        </div>
      )}
      {/* Selector de temporada — el resumen se puede mirar por temporada
          separada (la en curso u otra archivada), así nunca se mezclan
          números de una con otra. */}
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <span style={{ fontSize:12, color:'#4A566E', display:'flex', alignItems:'center', gap:6 }}><IconTrophy size={13} color="#4A566E"/>Viendo resumen de:</span>
        <select
          value={temporadaVerId ?? ''}
          onChange={e => setTemporadaVerId(Number(e.target.value))}
          style={{
            padding:'7px 12px', borderRadius:9, border:'1px solid #1C2535', background:'#0E1420',
            color:'#EEF2F8', fontSize:13, fontFamily:"'Barlow Condensed',sans-serif", outline:'none', cursor:'pointer',
          }}>
          {[...temporadas].sort((a, b) => b.id - a.id).map(t => (
            <option key={t.id} value={t.id}>
              {t.nombre}{t.id === temporadaActivaId ? ' · en curso' : ' · archivada'}
            </option>
          ))}
        </select>
        {temporadaVerId != null && temporadaVerId !== temporadaActivaId && (
          <span style={{
            fontSize:10.5, fontWeight:700, letterSpacing:.5, color:'#8899BB',
            background:'rgba(136,153,187,.1)', border:'1px solid #1C2535',
            padding:'4px 10px', borderRadius:100, textTransform:'uppercase',
          }}>
            📁 Archivada — solo consulta
          </span>
        )}
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12 }}>
        <KpiCard icon={<IconBall size={16} color="#F0B429"/>} label="Partidos jugados" value={kpis.jugados} sub={`${avancePct}% del fixture`} accent="#F0B429"
          onClick={onNavigate ? () => onNavigate('partidos') : undefined}/>
        <KpiCard icon={<IconClock size={16} color="#60A5FA"/>} label="Pendientes" value={kpis.pendientes} sub="por jugarse" accent="#60A5FA"
          onClick={onNavigate ? () => onNavigate('partidos') : undefined}/>
        <ProximoCard proximo={kpis.proximo} onClick={onNavigate ? () => onNavigate('partidos') : undefined}/>
        <RitmoCard actual={extra[categoria]?.semanaActualCount ?? 0} anterior={extra[categoria]?.semanaAnteriorCount ?? 0}
          onClick={onNavigate ? () => onNavigate('partidos') : undefined}/>
        <KpiCard icon={<IconPoll size={16} color="#E8187A"/>} label="Encuesta activa" value={kpis.encuesta ? `${kpis.encuesta.votos} votos` : 'ninguna'}
          sub={kpis.encuesta?.pregunta ?? '—'} accent="#E8187A" onClick={onNavigate ? () => onNavigate('encuestas') : undefined}/>
      </div>

      {/* Avance por fecha + columna lateral (Alertas / Esta semana) */}
      <div className="dash-side-grid">
        <div style={{ background:'linear-gradient(160deg,#101826,#0B111C)', border:'1px solid #1C2535', borderRadius:14, padding:'18px 20px', minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:.5, color:'#EEF2F8' }}>Avance del fixture</div>
          </div>
          <AvanceSection puntos={chart[categoria]} extra={extra[categoria]} />
        </div>
        <div className="dash-side-col">
          <AlertasCard alertas={alertas} onNavigate={onNavigate}/>
          <EstaSemanaCard resumen={resumenSemanal} onNavigate={onNavigate}/>
        </div>
      </div>

      {/* Lideres — una categoría de stat a la vez (tabs) en vez de 5 columnas
          juntas, con podio + tabla y un toggle promedio/acumulado: así se ve
          de un vistazo por qué alguien puede ir primero en la página pública
          (que ordena por acumulado) aunque acá tenga menor promedio. */}
      <div style={{ background:'linear-gradient(160deg,#101826,#0B111C)', border:'1px solid #1C2535', borderRadius:14, padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:.5, color:'#EEF2F8' }}>
            Líderes {categoria === 'femenino' ? 'femenino' : 'masculino'}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {['prom','total'].map(s => (
              <button key={s} onClick={() => setSortBy(s)} style={{
                padding:'5px 12px', borderRadius:100, fontSize:10.5, fontWeight:700, letterSpacing:.5, textTransform:'uppercase',
                cursor:'pointer', fontFamily:"'Barlow Condensed',sans-serif",
                background: sortBy===s ? 'rgba(240,180,41,.18)' : 'transparent',
                border: sortBy===s ? '1px solid rgba(240,180,41,.5)' : '1px solid #1C2535',
                color: sortBy===s ? '#F0B429' : '#6B7A99',
              }}>{s === 'prom' ? 'Promedio' : 'Acumulado'}</button>
            ))}
          </div>
        </div>

        <div className="dash-tabs-scroll">
          {STAT_COLS.map(col => (
            <button key={col.key} onClick={() => setStatTab(col.key)} style={{
              flexShrink:0, padding:'7px 14px', borderRadius:9, fontSize:12, fontWeight:700, letterSpacing:.5, whiteSpace:'nowrap',
              cursor:'pointer', fontFamily:"'Barlow Condensed',sans-serif",
              background: statTab===col.key ? `${col.color}22` : '#0B111C',
              border: statTab===col.key ? `1px solid ${col.color}88` : '1px solid #1C2535',
              color: statTab===col.key ? col.color : '#6B7A99',
            }} title={col.title}>{col.label}</button>
          ))}
        </div>

        {(() => {
          const lista = leaders[categoria][statTab] ?? [];
          const col = STAT_COLS.find(c => c.key === statTab);
          if (lista.length === 0) return <div style={{ fontSize:13, color:'#2C3A52', padding:'12px 4px' }}>Sin datos aún</div>;
          const ordenada = [...lista].sort((a, b) => sortBy === 'prom' ? Number(b.value) - Number(a.value) : b.total - a.total);
          const expKey = `lideres-${statTab}-${sortBy}`;
          const abierto = !!expanded[expKey];
          const podio = ordenada.slice(0, 3);
          const resto = ordenada.slice(3, abierto ? 20 : TOP_N_DEFAULT + 3);
          return (
            <div>
              <div className="dash-podio-grid">
                {podio.map((l, i) => <PodioCard key={l.id} leader={l} rank={i + 1} unit={col.label} sortBy={sortBy}/>)}
              </div>
              {ordenada.length > 3 && (
                <>
                  <div style={{ fontSize:10.5, color:'#4A566E', letterSpacing:.5, textTransform:'uppercase', marginBottom:2, fontFamily:"'Barlow Condensed',sans-serif" }}>Resto del ranking</div>
                  <div className="dash-table-row" style={{ borderBottom:'1px solid #1C2535', paddingBottom:6 }}>
                    <div/>
                    <div/>
                    <div style={{ color:'#4A566E', fontSize:9.5, textAlign:'right', textTransform:'uppercase' }}>PJ</div>
                    <div className={sortBy === 'total' ? '' : 'dash-col-secondary'} style={{ color: sortBy === 'total' ? '#F0B429' : '#4A566E', fontSize:9.5, textAlign:'right', textTransform:'uppercase' }}>Acum.</div>
                    <div className={sortBy === 'prom' ? '' : 'dash-col-secondary'} style={{ color: sortBy === 'prom' ? '#F0B429' : '#4A566E', fontSize:9.5, textAlign:'right', textTransform:'uppercase' }}>Prom.</div>
                  </div>
                  {resto.map((l, i) => <LeaderTableRow key={l.id} leader={l} rank={i + 4} sortBy={sortBy}/>)}
                  {ordenada.length > TOP_N_DEFAULT + 3 && (
                    <button onClick={() => setExpanded(e => ({ ...e, [expKey]: !abierto }))}
                      style={{ marginTop:8, background:'none', border:'none', color:'#4A566E', fontSize:11, cursor:'pointer', fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:.5, padding:'4px' }}>
                      {abierto ? '▲ Ver menos' : `▼ Ver más (${ordenada.length - (TOP_N_DEFAULT + 3)} más)`}
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })()}
      </div>

      {/* Fixture completo */}
      <div style={{ background:'linear-gradient(160deg,#101826,#0B111C)', border:'1px solid #1C2535', borderRadius:14, padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:.5, color:'#EEF2F8' }}>Fixture completo</div>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            {fixture[categoria].length > 0 && (
              <select value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)} style={{
                padding:'7px 12px', borderRadius:8, border:'1px solid #1C2535', background:'#0E1420',
                color:'#EEF2F8', fontSize:12.5, fontFamily:"'Barlow Condensed',sans-serif", outline:'none', cursor:'pointer',
              }}>
                <option value="todas">Todas las fechas</option>
                {fixture[categoria].map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            )}
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
        {(() => {
          const fechasAMostrar = fechaFiltro === 'todas'
            ? fixture[categoria]
            : fixture[categoria].filter(f => String(f.id) === String(fechaFiltro));
          const conScroll = fechaFiltro === 'todas';
          return (
        <div style={{ display:'flex', flexDirection:'column', gap:18, maxHeight: conScroll ? 520 : 'none', overflowY: conScroll ? 'auto' : 'visible', paddingRight:4 }}>
          {fechasAMostrar.length === 0 && (
            <div style={{ color:'#2C3A52', fontSize:13, textAlign:'center', padding:'20px 0' }}>
              {fixture[categoria].length === 0 ? 'Todavía no hay fechas cargadas.' : 'Esa fecha no tiene partidos cargados.'}
            </div>
          )}
          {fechasAMostrar.map(f => (
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
                        {esPartidoPlayoff(p) && (
                          <span style={{ fontSize:9, fontWeight:700, letterSpacing:.5, padding:'1px 6px', borderRadius:4, background:'rgba(240,180,41,.15)', color:'#F0B429', border:'1px solid rgba(240,180,41,.35)', flexShrink:0 }}>
                            🏆 {labelInstanciaCorta(p)}
                          </span>
                        )}
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
          );
        })()}
      </div>
    </div>
  );
}
