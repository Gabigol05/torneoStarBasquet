import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';

const STATS_COLS = [
  { key:'pj',          label:'PJ',   title:'Partidos jugados' },
  { key:'pts_prom',    label:'PTS',  title:'Puntos promedio' },
  { key:'reb_prom',    label:'REB',  title:'Rebotes promedio' },
  { key:'ast_prom',    label:'AST',  title:'Asistencias promedio' },
  { key:'rob_prom',    label:'ROB',  title:'Robos promedio' },
  { key:'tap_prom',    label:'TAP',  title:'Tapones promedio' },
  { key:'per_prom',    label:'PÉR',  title:'Pérdidas promedio' },
  { key:'val_prom',    label:'VAL',  title:'Valoración promedio' },
  { key:'pct_simples', label:'TL%',  title:'% Tiros libres' },
  { key:'pct_dobles',  label:'2P%',  title:'% Dobles' },
  { key:'pct_triples', label:'3P%',  title:'% Triples' },
  { key:'mejor_pts',   label:'MAX',  title:'Mejor partido (PTS)' },
];

export default function StatsEditor() {
  const [equipoId, setEquipoId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [statsMap, setStatsMap] = useState({});
  const [edited,   setEdited]   = useState({});
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');

  const equipo = equiposFemenino.find(e => e.id === equipoId);

  useEffect(() => {
    if (!equipoId) return;
    loadStats();
    setEdited({});
  }, [equipoId]);

  const loadStats = async () => {
    if (!equipo) return;
    const ids = equipo.jugadoras.map(j => j.id);
    const { data } = await supabase
      .from('estadisticas_femenino')
      .select('*')
      .in('jugadora_id', ids);
    const map = {};
    for (const row of data ?? []) map[row.jugadora_id] = row;
    setStatsMap(map);
  };

  const getValue = (jugId, col) => {
    if (edited[jugId]?.[col] !== undefined) return edited[jugId][col];
    return statsMap[jugId]?.[col] ?? 0;
  };

  const handleChange = (jugId, col, val) => {
    setEdited(prev => ({
      ...prev,
      [jugId]: { ...(prev[jugId] ?? {}), [col]: val },
    }));
  };

  const flash = (text, ok=true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(''), 3000);
  };

  const handleSave = async () => {
    if (Object.keys(edited).length === 0) { flash('Sin cambios para guardar', false); return; }
    setSaving(true);
    try {
      const upserts = Object.entries(edited).map(([jugId, changes]) => ({
        jugadora_id: jugId,
        ...(statsMap[jugId] ?? {}),
        ...changes,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from('estadisticas_femenino')
        .upsert(upserts, { onConflict:'jugadora_id' });
      if (error) throw error;
      flash(`✅ ${upserts.length} jugadora(s) actualizadas`);
      loadStats();
      setEdited({});
    } catch(err) {
      flash(`❌ Error: ${err.message}`, false);
    } finally {
      setSaving(false);
    }
  };

  // Filtrar jugadoras por búsqueda
  const jugadorasFiltradas = useMemo(() => {
    if (!equipo) return [];
    const q = busqueda.toLowerCase();
    return equipo.jugadoras.filter(j => !q || j.nombre.toLowerCase().includes(q));
  }, [equipo, busqueda]);

  const hasChanges = Object.keys(edited).length > 0;

  return (
    <div>
      <h2 style={S.title}>✏️ Editar estadísticas manualmente</h2>

      {/* Warning */}
      <div style={S.warning}>
        <span style={{ fontSize:18 }}>⚠️</span>
        <div>
          <div style={{ fontWeight:700, marginBottom:2 }}>Solo para correcciones urgentes</div>
          <div style={{ fontSize:12, color:'#F0B429', opacity:.8 }}>
            Para cargas normales usá la sección "Subir Partido" — estos cambios manuales
            no generan registro de auditoría y pueden sobreescribirse al recalcular promedios.
          </div>
        </div>
      </div>

      {/* Flash message */}
      {msg && (
        <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:16, fontSize:14,
          background: msg.ok ? 'rgba(34,208,122,.1)' : 'rgba(240,64,96,.1)',
          color: msg.ok ? '#22D07A' : '#F04060',
          border: `1px solid ${msg.ok ? 'rgba(34,208,122,.3)' : 'rgba(240,64,96,.3)'}` }}>
          {msg.text}
        </div>
      )}

      {/* Selectors */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <select value={equipoId} onChange={e => setEquipoId(e.target.value)}
          style={{ ...S.input, flex:'1', minWidth:160 }}>
          <option value="">— Seleccionar equipo —</option>
          {equiposFemenino.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>

        {equipo && (
          <input type="text" placeholder="Buscar jugadora..." value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ ...S.input, flex:'1', minWidth:160 }}/>
        )}
      </div>

      {/* Tabla */}
      {equipo && (
        <>
          <div style={{ overflowX:'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, textAlign:'left', minWidth:150 }}>Jugadora</th>
                  {STATS_COLS.map(c => (
                    <th key={c.key} style={S.th} title={c.title}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jugadorasFiltradas.map((j, i) => {
                  const isEdited = Boolean(edited[j.id]);
                  return (
                    <tr key={j.id} style={{
                      background: isEdited ? 'rgba(240,180,41,.06)' : i%2===0 ? '#0E1420':'#141C2A',
                      transition: 'background .2s',
                    }}>
                      <td style={{ ...S.td, textAlign:'left', color: isEdited ? '#F0B429':'#EEF2F8', fontWeight: isEdited ? 600:400 }}>
                        {j.nombre}
                        {isEdited && <span style={{ marginLeft:6, fontSize:9, color:'#F0B429' }}>● editado</span>}
                        {!statsMap[j.id] && <span style={{ marginLeft:6, fontSize:9, color:'#4A566E' }}>sin stats</span>}
                      </td>
                      {STATS_COLS.map(c => (
                        <td key={c.key} style={S.td}>
                          <input
                            type="number" step="0.1" min="0"
                            value={getValue(j.id, c.key)}
                            onChange={e => handleChange(j.id, c.key, e.target.value)}
                            style={S.cellInput}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {jugadorasFiltradas.length === 0 && busqueda && (
            <div style={{ textAlign:'center', padding:'2rem', color:'#6B7A99' }}>
              Sin resultados para "{busqueda}"
            </div>
          )}

          <div style={{ display:'flex', gap:12, marginTop:20, alignItems:'center' }}>
            <button onClick={handleSave} disabled={saving || !hasChanges} style={{
              ...S.btnSave, opacity: hasChanges && !saving ? 1 : 0.4
            }}>
              {saving ? 'Guardando...' : `💾 GUARDAR${hasChanges ? ` (${Object.keys(edited).length})` : ''}`}
            </button>
            {hasChanges && (
              <button onClick={() => setEdited({})} style={S.btnCancel}>
                Descartar cambios
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const S = {
  title:    { color:'#F0B429', fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:1, marginBottom:16 },
  warning:  { display:'flex', gap:12, alignItems:'flex-start', background:'rgba(240,180,41,.08)', border:'1px solid rgba(240,180,41,.25)', borderRadius:10, padding:'12px 16px', marginBottom:20, color:'#F0B429', fontSize:13 },
  input:    { padding:'10px 14px', background:'#141C2A', border:'1px solid #1C2535', borderRadius:8, color:'#EEF2F8', fontSize:14, outline:'none' },
  table:    { width:'100%', borderCollapse:'collapse', fontSize:13 },
  th:       { background:'#141C2A', color:'#6B7A99', padding:'8px 10px', textAlign:'center', fontSize:11, letterSpacing:.5, whiteSpace:'nowrap' },
  td:       { padding:'4px 6px', borderBottom:'1px solid #1C2535' },
  cellInput:{ width:56, padding:'5px 4px', background:'#080C12', border:'1px solid #1C2535', borderRadius:4, color:'#EEF2F8', fontSize:13, textAlign:'center', outline:'none' },
  btnSave:  { padding:'11px 28px', background:'linear-gradient(135deg,#F0B429,#FF6B2B)', border:'none', borderRadius:8, color:'#080C12', fontWeight:700, cursor:'pointer', fontSize:15, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:1 },
  btnCancel:{ padding:'10px 20px', background:'transparent', border:'1px solid #4A566E', borderRadius:8, color:'#6B7A99', cursor:'pointer', fontSize:14 },
};
