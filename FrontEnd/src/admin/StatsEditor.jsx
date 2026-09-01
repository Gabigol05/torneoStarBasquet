import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';
import { equiposMasculino } from '../data/masculinoData';
import { TABLAS } from './categoriaAdmin';
import { useConfirm } from '../components/ConfirmModal.jsx';
import { useTemporada } from '../context/TemporadaContext';

const ROSTER = { femenino: equiposFemenino, masculino: equiposMasculino };

// ─── Columnas de stats con categorías ────────────────────────────────────────
// `totalKey`: campo con el acumulado real de la temporada (ya lo calcula el
// trigger de la base junto con el promedio — no es una cuenta aproximada).
// `madeKey`/`missKey`: para los porcentajes de tiro, en vez de un "total"
// suelto se muestra el desglose convertidos/intentados, igual que en el
// perfil público del jugador (PlayerProfileModal) — así el admin ve de un
// vistazo si un % raro sale de pocos intentos o de muchos.
const GRUPOS = [
  {
    label: 'General',
    cols: [
      { key:'pj',       label:'PJ',  title:'Partidos jugados', step:1, integer:true },
    ]
  },
  {
    label: 'Anotación',
    color: '#F0B429',
    cols: [
      { key:'pts_prom',    label:'PTS',  title:'Puntos por partido', totalKey:'pts_total', totalLabel:'Acumulado' },
      { key:'pct_simples', label:'TL%',  title:'% Tiros libres', madeKey:'sc_total', missKey:'sf_total' },
      { key:'pct_dobles',  label:'2P%',  title:'% Dobles',       madeKey:'dc_total', missKey:'df_total' },
      { key:'pct_triples', label:'3P%',  title:'% Triples',      madeKey:'tc_total', missKey:'tf_total' },
      { key:'mejor_pts',   label:'MAX',  title:'Mejor partido en PTS', integer:true },
    ]
  },
  {
    label: 'Juego',
    color: '#60A5FA',
    cols: [
      { key:'reb_prom', label:'REB', title:'Rebotes por partido', totalKey:'reb_total', totalLabel:'Acumulado' },
      { key:'ast_prom', label:'AST', title:'Asistencias por partido', totalKey:'ast_total', totalLabel:'Acumulado' },
      { key:'rob_prom', label:'ROB', title:'Robos por partido', totalKey:'rob_total', totalLabel:'Acumulado' },
      { key:'tap_prom', label:'TAP', title:'Tapones por partido', totalKey:'tap_total', totalLabel:'Acumulado' },
      { key:'per_prom', label:'PÉR', title:'Pérdidas por partido', totalKey:'per_total', totalLabel:'Acumulado' },
    ]
  },
  {
    label: 'Valoración',
    color: '#22D07A',
    cols: [
      { key:'val_prom', label:'VAL', title:'Valoración promedio', totalKey:'val_total', totalLabel:'Acumulado' },
    ]
  },
];

// ─── Bloque de una stat (label + valor grande + dato secundario) ─────────────
// `mostrar` decide qué número queda como PRINCIPAL: 'acum' pone el acumulado
// real de la temporada grande y el promedio abajo (chico, pero siempre
// editable ahí mismo); 'prom' hace lo de siempre — el promedio grande y
// editable, con el acumulado como dato de referencia abajo. Los porcentajes
// de tiro (TL%/2P%/3P%) no tienen un "acumulado" propio — siempre muestran
// el % arriba y el desglose convertidos/intentados abajo, sin importar el modo.
function StatBlock({ col, stats, editado, mostrar, jugId, onEdit, groupColor, width = 72 }) {
  const promVal = editado?.[col.key] !== undefined ? editado[col.key] : (stats?.[col.key] ?? 0);
  const editedAqui = editado?.[col.key] !== undefined;
  const total = col.totalKey ? stats?.[col.totalKey] : undefined;
  const hasTotal = total !== undefined && total !== null;
  const showAcum = mostrar === 'acum' && hasTotal;
  const made = col.madeKey ? stats?.[col.madeKey] : undefined;
  const miss = col.madeKey ? stats?.[col.missKey] : undefined;
  const hasMade = made !== undefined && made !== null;

  const bigColor = editedAqui ? '#F0B429' : (groupColor ?? '#EEF2F8');
  const borderColor = editedAqui ? 'rgba(240,180,41,.5)' : (groupColor ? `${groupColor}35` : '#1C2535');

  const inputProps = {
    type: 'number', step: col.integer ? 1 : 0.1, min: '0', value: promVal,
    onChange: e => onEdit(jugId, col.key, e.target.value),
    onClick: e => e.stopPropagation(),
  };

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
        <label style={{ fontSize:12, color:'#8899BB', flex:1 }} title={col.title}>{col.title}</label>
        {showAcum ? (
          <span style={{ width, textAlign:'center', fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:bigColor }}>{total}</span>
        ) : (
          <input {...inputProps} style={{
            width, padding:'6px 8px', background:'#141C2A', border:`1px solid ${borderColor}`,
            borderRadius:6, color:bigColor, fontSize:14, textAlign:'center', outline:'none',
            fontFamily:"'Bebas Neue',sans-serif",
          }}/>
        )}
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:5, marginTop:3 }}>
        {showAcum ? (
          <>
            <span style={{ fontSize:9.5, color:'#4A566E' }}>Prom.:</span>
            <input {...inputProps} style={{
              width:44, padding:'2px 4px', background:'#141C2A',
              border:`1px solid ${editedAqui ? 'rgba(240,180,41,.5)' : '#1C2535'}`,
              borderRadius:4, color: editedAqui ? '#F0B429' : '#8899BB', fontSize:11,
              textAlign:'center', outline:'none', fontFamily:"'Bebas Neue',sans-serif",
            }}/>
          </>
        ) : hasTotal ? (
          <span style={{ fontSize:9.5, color:'#4A566E' }}>Acumulado: {total}</span>
        ) : hasMade ? (
          <span style={{ fontSize:9.5, color:'#4A566E' }}>{made}/{(made ?? 0) + (miss ?? 0)} convertidos</span>
        ) : null}
      </div>
    </div>
  );
}

// ─── Componente de stats de una jugadora (fila expandible) ────────────────────
function JugadoraRow({ jugadora, equipo, stats, editado, onEdit, idx, mostrar }) {
  const [expanded, setExpanded] = useState(false);
  const hayStats = stats !== undefined;
  const tieneEdits = Boolean(editado);

  const val = (key) => {
    if (editado?.[key] !== undefined) return editado[key];
    return stats?.[key] ?? 0;
  };

  // Para el resumen de la fila colapsada: si el modo es "acumulado" y la
  // columna tiene un total real cargado, se muestra ese; si no, cae al
  // promedio de siempre (nunca se queda en blanco).
  const valResumen = (key, totalKey) => {
    if (mostrar === 'acum') {
      const t = stats?.[totalKey];
      if (t !== undefined && t !== null) return t;
    }
    return val(key);
  };

  const getBg = () => {
    if (tieneEdits) return `linear-gradient(90deg, ${equipo.color}22, rgba(240,180,41,.06) 60%)`;
    return idx % 2 === 0 ? `linear-gradient(90deg, ${equipo.color}18, #0E1420 60%)` : `linear-gradient(90deg, ${equipo.color}14, #141C2A 60%)`;
  };

  return (
    <>
      {/* Fila principal */}
      <tr style={{ background: getBg(), cursor:'pointer' }} onClick={() => setExpanded(e => !e)}>
        <td style={{ padding:'10px 12px 10px 9px', minWidth:200, position:'sticky', left:0, zIndex:1, background:getBg(), borderLeft:`3px solid ${equipo.color}`, boxShadow:'2px 0 4px rgba(0,0,0,.3)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {/* Avatar */}
            <div style={{
              width:32, height:32, borderRadius:'50%', flexShrink:0,
              background:`${equipo.color}20`, color:equipo.color,
              border:`1.5px solid ${equipo.color}40`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:11, fontWeight:700,
            }}>
              {jugadora.nombre.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ color: tieneEdits?'#F0B429':'#EEF2F8', fontWeight:600, fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {jugadora.nombre}
                {tieneEdits && <span style={{ marginLeft:6, fontSize:9, color:'#F0B429', verticalAlign:'middle' }}>● editado</span>}
              </div>
              {hayStats ? (
                <span style={{
                  display:'inline-flex', alignItems:'baseline', gap:3, marginTop:2,
                  background:'rgba(240,180,41,.12)', border:'1px solid rgba(240,180,41,.3)',
                  borderRadius:5, padding:'1px 6px',
                }}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:13, color:'#F0B429', lineHeight:1.3 }}>{val('pj')}</span>
                  <span style={{ fontSize:9, color:'#F0B429', letterSpacing:.5 }}>PJ</span>
                </span>
              ) : (
                <div style={{ fontSize:10, color:'#4A566E', marginTop:2 }}>Sin estadísticas</div>
              )}
            </div>
          </div>
        </td>
        {/* Stats resumidas */}
        <td style={{ padding:'10px 8px', textAlign:'center', color:'#F0B429', fontFamily:"'Bebas Neue',sans-serif", fontSize:18 }}>{valResumen('pts_prom','pts_total')}</td>
        <td style={{ padding:'10px 8px', textAlign:'center', color:'#60A5FA', fontFamily:"'Bebas Neue',sans-serif", fontSize:18 }}>{valResumen('reb_prom','reb_total')}</td>
        <td style={{ padding:'10px 8px', textAlign:'center', color:'#22D07A', fontFamily:"'Bebas Neue',sans-serif", fontSize:18 }}>{valResumen('ast_prom','ast_total')}</td>
        <td style={{ padding:'10px 8px', textAlign:'center', color:'#6B7A99', fontFamily:"'Bebas Neue',sans-serif", fontSize:18 }}>{valResumen('val_prom','val_total')}</td>
        <td style={{ padding:'10px 8px', textAlign:'center', color:'#4A566E', fontSize:12 }}>
          {expanded ? '▲' : '▼'}
        </td>
      </tr>

      {/* Fila expandida — edición completa */}
      {expanded && (
        <tr style={{ background:'rgba(240,180,41,.03)' }}>
          <td colSpan={6} style={{ padding:'16px 12px', borderBottom:'2px solid rgba(240,180,41,.15)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:16 }}>
              {GRUPOS.map(grupo => {
                const gc = grupo.color ?? '#8899BB';
                return (
                <div key={grupo.label} style={{ padding:1, borderRadius:13, background:`linear-gradient(160deg, ${gc}45, #1C2535 65%)` }}>
                <div style={{
                  background:`linear-gradient(160deg, ${gc}12, #0B111C 60%)`, borderRadius:12, padding:'12px 14px', height:'100%', boxSizing:'border-box',
                }}>
                  <div style={{
                    fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase',
                    color: gc, marginBottom:10,
                    display:'flex', alignItems:'center', gap:6,
                  }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:gc, flexShrink:0, boxShadow:`0 0 6px ${gc}` }}/>
                    {grupo.label}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }} onClick={e => e.stopPropagation()}>
                    {grupo.cols.map(col => (
                      <StatBlock
                        key={col.key}
                        col={col}
                        stats={stats}
                        editado={editado}
                        mostrar={mostrar}
                        jugId={jugadora.id}
                        onEdit={onEdit}
                        groupColor={gc}
                      />
                    ))}
                  </div>
                </div>
                </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function StatsEditor({ categoria: categoriaProp, setCategoria: setCategoriaProp } = {}) {
  const [categoriaLocal, setCategoriaLocal] = useState('femenino');
  const categoria    = categoriaProp ?? categoriaLocal;
  const setCategoria = setCategoriaProp ?? setCategoriaLocal;
  const tablas = TABLAS[categoria];
  const roster = ROSTER[categoria];
  const { confirm, ConfirmDialog } = useConfirm();
  // estadisticas_X ahora tiene clave compuesta (jugador_id, temporada_id) —
  // sin este filtro, un/a jugador/a con stats de más de una temporada traía
  // varias filas y esta pantalla se quedaba con una al azar (ver
  // add_temporadas.sql). Todo acá corrige la temporada ACTIVA únicamente —
  // la de la categoría elegida (femenino y masculino tienen cada una la
  // suya, ver TemporadaContext).
  const { temporadaActivaId: temporadaActivaIdPorCategoria } = useTemporada();
  const temporadaActivaId = temporadaActivaIdPorCategoria[categoria];

  const [equipoId,  setEquipoId]  = useState('');
  const [busqueda,  setBusqueda]  = useState('');
  const [statsMap,  setStatsMap]  = useState({});
  const [edited,    setEdited]    = useState({});
  const [saving,    setSaving]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [msg,       setMsg]       = useState(null);
  // En celular arranca en modo Cards (mas comodo que una tabla ancha con scroll
  // horizontal); en desktop arranca en Tabla como antes.
  const [viewMode,  setViewMode]  = useState(() =>
    (typeof window !== 'undefined' && window.innerWidth <= 640) ? 'cards' : 'tabla'
  ); // 'tabla' | 'cards'
  // Qué número se muestra grande: el acumulado real de la temporada (por
  // defecto — así se ve de un vistazo cuánto lleva jugado cada jugadora) o el
  // promedio por partido, con el otro siempre visible como dato secundario.
  const [mostrar,   setMostrar]   = useState('acum'); // 'acum' | 'prom'
  // Ninguna de las dos categorías tiene roster estático — jugadores_masculino
  // y jugadoras_femenino viven las dos en la base, así que el plantel de cada
  // equipo se trae siempre en vivo.
  const [rosterDb, setRosterDb] = useState([]);

  const equipoBase = roster.find(e => e.id === equipoId);
  const equipo = equipoBase ? { ...equipoBase, jugadoras: rosterDb } : null;

  useEffect(() => {
    setEquipoId(''); setStatsMap({}); setEdited({}); setBusqueda(''); setRosterDb([]);
  }, [categoria]);

  useEffect(() => {
    if (!equipoId || !temporadaActivaId) return;
    setEdited({});
    (async () => {
      const { data, error } = await supabase.from(tablas.jugadores).select('*').eq('equipo_id', equipoId);
      if (error) { flash(`❌ No se pudo traer el plantel: ${error.message}`, false); setRosterDb([]); return; }
      const jugadoras = (data ?? []).map(j => ({ id: j.id, nombre: j.nombre, fechaNac: j.fecha_nac, numero: j.numero }));
      setRosterDb(jugadoras);
      await loadStats(jugadoras);
    })();
  }, [equipoId, temporadaActivaId]);

  const loadStats = async (jugadorasOverride) => {
    if (!equipoBase || !temporadaActivaId) return;
    setLoading(true);
    const jugadoras = jugadorasOverride ?? rosterDb;
    const ids = jugadoras.map(j => j.id);
    if (ids.length === 0) { setStatsMap({}); setLoading(false); return; }
    const { data, error } = await supabase
      .from(tablas.estadisticas)
      .select('*')
      .in(tablas.jugadorIdField, ids)
      .eq('temporada_id', temporadaActivaId);
    if (error) {
      // Antes esto quedaba en silencio total (ni siquiera un console.log) —
      // la tabla se veía "sin estadísticas" para todo el equipo, igual que
      // si de verdad nadie tuviera stats cargadas todavía.
      flash(`❌ No se pudieron traer las estadísticas: ${error.message}`, false);
    } else {
      const map = {};
      for (const row of data ?? []) map[row[tablas.jugadorIdField]] = row;
      setStatsMap(map);
    }
    setLoading(false);
  };

  const handleEdit = (jugId, col, val) => {
    setEdited(prev => ({
      ...prev,
      [jugId]: { ...(prev[jugId] ?? {}), [col]: val },
    }));
  };

  const flash = (text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3500);
  };

  const handleSave = async () => {
    const keys = Object.keys(edited);
    if (keys.length === 0) { flash('Sin cambios para guardar', false); return; }
    setSaving(true);
    try {
      const upserts = keys.map(jugId => ({
        [tablas.jugadorIdField]: jugId,
        ...(statsMap[jugId] ?? {}),
        ...edited[jugId],
        temporada_id: temporadaActivaId,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from(tablas.estadisticas)
        .upsert(upserts, { onConflict: `${tablas.jugadorIdField},temporada_id` });
      if (error) throw error;
      flash(`✅ ${upserts.length} jugadora(s) guardadas`);
      await loadStats();
      setEdited({});
    } catch(err) {
      flash(`❌ ${err.message}`, false);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (jugId) => {
    if (!(await confirm('¿Borrar las estadísticas de esta jugadora en la temporada actual? (No toca temporadas anteriores)'))) return;
    const { error } = await supabase.from(tablas.estadisticas).delete()
      .eq(tablas.jugadorIdField, jugId).eq('temporada_id', temporadaActivaId);
    if (error) { flash(`❌ No se pudo resetear: ${error.message}`, false); return; }
    await loadStats();
    flash('✅ Stats reseteadas');
  };

  const jugadorasFiltradas = useMemo(() => {
    if (!equipo) return [];
    const q = busqueda.toLowerCase();
    return equipo.jugadoras.filter(j => !q || j.nombre.toLowerCase().includes(q));
  }, [equipo, busqueda]);

  const hasChanges  = Object.keys(edited).length > 0;
  const editedCount = Object.keys(edited).length;
  const conStats    = equipo ? equipo.jugadoras.filter(j => statsMap[j.id]).length : 0;
  const sinStats    = equipo ? equipo.jugadoras.length - conStats : 0;

  return (
    <div>
      {ConfirmDialog}
      {/* Warning */}
      <div style={S.warning}>
        <span>⚠️</span>
        <div>
          <strong>Solo para correcciones</strong> — Para cargas normales usá "Subir Partido".
          Estos cambios pueden sobreescribirse al recalcular promedios.
        </div>
      </div>

      {/* Flash */}
      {msg && (
        <div style={{
          padding:'11px 16px', borderRadius:8, marginBottom:16, fontSize:14,
          background: msg.ok ? 'rgba(34,208,122,.1)' : 'rgba(240,64,96,.1)',
          color: msg.ok ? '#22D07A' : '#F04060',
          border:`1px solid ${msg.ok ? 'rgba(34,208,122,.3)' : 'rgba(240,64,96,.3)'}`,
          display:'flex', alignItems:'center', gap:8,
        }}>
          {msg.text}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap', alignItems:'flex-end' }}>
        <div style={{ flex:1, minWidth:180 }}>
          <label style={S.label}>EQUIPO</label>
          <select value={equipoId} onChange={e => setEquipoId(e.target.value)} style={S.select}>
            <option value="">— Seleccionar equipo —</option>
            {roster.map(e => (
              <option key={e.id} value={e.id}>{e.name ?? e.nombre}</option>
            ))}
          </select>
        </div>

        {equipo && (
          <div style={{ flex:1, minWidth:160 }}>
            <label style={S.label}>{categoria === 'femenino' ? 'BUSCAR JUGADORA' : 'BUSCAR JUGADOR'}</label>
            <input
              type="text" placeholder="Nombre..." value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={S.input}
            />
          </div>
        )}

        {equipo && (
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={() => setMostrar('acum')}
              title="Mostrar el acumulado de la temporada como número principal"
              style={{ ...S.viewBtn, ...(mostrar==='acum'?S.viewBtnActive:{}) }}>
              Σ Acumulado
            </button>
            <button onClick={() => setMostrar('prom')}
              title="Mostrar el promedio por partido como número principal"
              style={{ ...S.viewBtn, ...(mostrar==='prom'?S.viewBtnActive:{}) }}>
              ø Promedio
            </button>
          </div>
        )}

        {equipo && (
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={() => setViewMode('tabla')}
              style={{ ...S.viewBtn, ...(viewMode==='tabla'?S.viewBtnActive:{}) }}>
              ☰ Tabla
            </button>
            <button onClick={() => setViewMode('cards')}
              style={{ ...S.viewBtn, ...(viewMode==='cards'?S.viewBtnActive:{}) }}>
              ⊞ Cards
            </button>
          </div>
        )}
      </div>

      {/* Stats del equipo seleccionado */}
      {equipo && !loading && (
        <div style={{ ...S.equipoHeader, background:`linear-gradient(115deg, ${equipo.color}2A, #0E1420 55%)`, borderColor:`${equipo.color}55` }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <img src={equipo.logo} alt={equipo.name} style={{ width:48, height:48, borderRadius:'50%', objectFit:'cover', border:`2px solid ${equipo.color}40` }}
              onError={e=>{e.target.style.display='none';}}/>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:1, color:equipo.color }}>
                {equipo.name}
              </div>
              <div style={{ fontSize:12, color:'#6B7A99' }}>
                {equipo.jugadoras.length} jugadoras ·
                <span style={{ color:'#22D07A' }}> {conStats} con stats</span>
                {sinStats > 0 && <span style={{ color:'#4A566E' }}> · {sinStats} sin stats</span>}
              </div>
            </div>
          </div>
          {hasChanges && (
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ fontSize:13, color:'#F0B429' }}>
                {editedCount} jugadora(s) con cambios
              </span>
              <button onClick={() => setEdited({})} style={S.btnSec}>Descartar</button>
              <button onClick={handleSave} disabled={saving} style={S.btnPrimary}>
                {saving ? 'Guardando...' : `💾 GUARDAR (${editedCount})`}
              </button>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div style={{ padding:'2rem', textAlign:'center', color:'#6B7A99' }}>
          Cargando estadísticas...
        </div>
      )}

      {/* ── VISTA TABLA ── */}
      {equipo && !loading && viewMode === 'tabla' && (
        <div style={{ overflowX:'auto', marginBottom:20 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr>
                <th style={{ ...S.th, textAlign:'left', minWidth:200, position:'sticky', left:0, zIndex:2, boxShadow:'2px 0 4px rgba(0,0,0,.3)' }}>Jugadora</th>
                <th style={{ ...S.th, color:'#F0B429' }}>PTS</th>
                <th style={{ ...S.th, color:'#60A5FA' }}>REB</th>
                <th style={{ ...S.th, color:'#22D07A' }}>AST</th>
                <th style={{ ...S.th }}>VAL</th>
                <th style={{ ...S.th, width:32 }}></th>
              </tr>
            </thead>
            <tbody>
              {jugadorasFiltradas.map((j, i) => (
                <JugadoraRow
                  key={j.id}
                  idx={i}
                  jugadora={j}
                  equipo={equipo}
                  stats={statsMap[j.id]}
                  editado={edited[j.id]}
                  onEdit={handleEdit}
                  mostrar={mostrar}
                />
              ))}
            </tbody>
          </table>
          {jugadorasFiltradas.length === 0 && busqueda && (
            <div style={{ textAlign:'center', padding:'2rem', color:'#6B7A99' }}>
              Sin resultados para "{busqueda}"
            </div>
          )}
        </div>
      )}

      {/* ── VISTA CARDS ── */}
      {equipo && !loading && viewMode === 'cards' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:14, marginBottom:20 }}>
          {jugadorasFiltradas.map((j) => {
            const st = statsMap[j.id];
            const ed = edited[j.id];
            const val = (key) => ed?.[key] !== undefined ? ed[key] : (st?.[key] ?? 0);
            const hasEdit = Boolean(ed);
            return (
              <div key={j.id} style={{
                padding:1, borderRadius:13,
                background: hasEdit ? 'linear-gradient(160deg,#F0B429,#1C2535 70%)' : `linear-gradient(160deg,${equipo.color}70,#1C2535 70%)`,
              }}>
              <div style={{
                background: hasEdit ? `linear-gradient(160deg,${equipo.color}22,rgba(240,180,41,.08) 55%,#0B111C)` : `linear-gradient(160deg,${equipo.color}1E,#0B111C 60%)`,
                borderRadius:12, padding:'16px', height:'100%', boxSizing:'border-box',
              }}>
                {/* Header */}
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                  <div style={{ width:40, height:40, borderRadius:'50%', background:`${equipo.color}20`, color:equipo.color, border:`1.5px solid ${equipo.color}50`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, flexShrink:0 }}>
                    {j.nombre.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ color: hasEdit?'#F0B429':'#EEF2F8', fontWeight:600, fontSize:14, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {j.nombre}
                      {hasEdit && <span style={{ marginLeft:6, fontSize:9, color:'#F0B429' }}>● editado</span>}
                    </div>
                    {st ? (
                      <span style={{
                        display:'inline-flex', alignItems:'baseline', gap:3, marginTop:3,
                        background:'rgba(240,180,41,.12)', border:'1px solid rgba(240,180,41,.3)',
                        borderRadius:5, padding:'1px 6px',
                      }}>
                        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:'#F0B429', lineHeight:1.3 }}>{val('pj')}</span>
                        <span style={{ fontSize:9, color:'#F0B429', letterSpacing:.5 }}>PARTIDOS JUGADOS</span>
                      </span>
                    ) : (
                      <div style={{ fontSize:11, color:'#4A566E', marginTop:3 }}>Sin estadísticas aún</div>
                    )}
                  </div>
                  {st && (
                    <button onClick={() => handleReset(j.id)}
                      title="Resetear stats"
                      style={{ background:'transparent', border:'1px solid rgba(240,64,96,.2)', borderRadius:6, color:'#F04060', cursor:'pointer', padding:'4px 8px', fontSize:11, flexShrink:0 }}>
                      ✕
                    </button>
                  )}
                </div>

                {/* Stats agrupadas por categoría, con acumulado/desglose real */}
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {GRUPOS.filter(g => g.color).map(grupo => (
                    <div key={grupo.label}>
                      <div style={{
                        fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:'uppercase',
                        color: grupo.color, marginBottom:6, display:'flex', alignItems:'center', gap:5,
                      }}>
                        <div style={{ width:5, height:5, borderRadius:'50%', background:grupo.color, flexShrink:0 }}/>
                        {grupo.label}
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8 }}>
                        {grupo.cols.map(col => (
                          <StatBlock
                            key={col.key}
                            col={col}
                            stats={st}
                            editado={ed}
                            mostrar={mostrar}
                            jugId={j.id}
                            onEdit={handleEdit}
                            groupColor={grupo.color}
                            width="100%"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Botón guardar fijo abajo si hay cambios */}
      {hasChanges && (
        <div style={S.stickyBar}>
          <span style={{ color:'#F0B429', fontSize:14 }}>
            {editedCount} jugadora(s) con cambios sin guardar
          </span>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setEdited({})} style={S.btnSec}>Descartar</button>
            <button onClick={handleSave} disabled={saving} style={S.btnPrimary}>
              {saving ? 'Guardando...' : `💾 GUARDAR CAMBIOS`}
            </button>
          </div>
        </div>
      )}

      {!equipo && (
        <div style={S.emptyState}>
          <div style={{ fontSize:48, marginBottom:12 }}>📊</div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:'#EEF2F8', marginBottom:8 }}>
            Seleccioná un equipo
          </div>
          <div style={{ color:'#4A566E', fontSize:14 }}>
            Elegí el equipo del selector de arriba para ver y editar las estadísticas de cada jugadora.
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  label:       { fontSize:10, fontWeight:700, letterSpacing:2, color:'#4A566E', display:'block', marginBottom:6 },
  input:       { width:'100%', padding:'10px 12px', background:'#141C2A', border:'1px solid #1C2535', borderRadius:8, color:'#EEF2F8', fontSize:14, outline:'none', boxSizing:'border-box' },
  select:      { width:'100%', padding:'10px 12px', background:'#141C2A', border:'1px solid #1C2535', borderRadius:8, color:'#EEF2F8', fontSize:14, outline:'none', boxSizing:'border-box' },
  th:          { background:'#141C2A', color:'#6B7A99', padding:'10px 12px', textAlign:'center', fontSize:11, letterSpacing:.5, whiteSpace:'nowrap', position:'sticky', top:0 },
  warning:     { display:'flex', gap:10, alignItems:'flex-start', background:'rgba(240,180,41,.06)', border:'1px solid rgba(240,180,41,.2)', borderRadius:10, padding:'11px 14px', marginBottom:20, color:'#F0B429', fontSize:13 },
  equipoHeader:{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'linear-gradient(160deg,#101826,#0B111C)', border:'1px solid #1C2535', borderRadius:12, padding:'14px 16px', marginBottom:16, flexWrap:'wrap', gap:12 },
  viewBtn:     { padding:'8px 14px', background:'transparent', border:'1px solid #1C2535', borderRadius:7, color:'#6B7A99', cursor:'pointer', fontSize:13 },
  viewBtnActive:{ background:'#1C2535', border:'1px solid #F0B429', color:'#F0B429' },
  btnPrimary:  { padding:'9px 20px', background:'linear-gradient(135deg,#F0B429,#FF6B2B)', border:'none', borderRadius:8, color:'#080C12', fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, cursor:'pointer', fontWeight:700 },
  btnSec:      { padding:'9px 16px', background:'transparent', border:'1px solid #4A566E', borderRadius:8, color:'#6B7A99', cursor:'pointer', fontSize:13 },
  stickyBar:   { position:'sticky', bottom:16, background:'linear-gradient(160deg,#141F30,#0B111C)', border:'1px solid rgba(240,180,41,.3)', borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, boxShadow:'0 8px 32px rgba(0,0,0,.5)', zIndex:50 },
  emptyState:  { textAlign:'center', padding:'4rem 2rem', color:'#6B7A99' },
};
