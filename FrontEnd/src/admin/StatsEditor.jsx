import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';

const STATS_COLS = [
  { key: 'pj',  label: 'PJ',   title: 'Partidos jugados' },
  { key: 'pts', label: 'PTS',  title: 'Puntos por partido' },
  { key: 'reb', label: 'REB',  title: 'Rebotes por partido' },
  { key: 'ast', label: 'AST',  title: 'Asistencias por partido' },
  { key: 'rob', label: 'ROB',  title: 'Robos por partido' },
  { key: 'tap', label: 'TAP',  title: 'Tapones por partido' },
  { key: 'fgp', label: 'FG%',  title: 'Porcentaje tiros de campo' },
  { key: 'tpp', label: '3P%',  title: 'Porcentaje triples' },
  { key: 'tlp', label: 'TL%',  title: 'Porcentaje tiros libres' },
];

export default function StatsEditor() {
  const [equipoId, setEquipoId]   = useState('');
  const [statsMap, setStatsMap]   = useState({});
  const [edited, setEdited]       = useState({});
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState('');

  const equipo = equiposFemenino.find(e => e.id === equipoId);

  useEffect(() => {
    if (!equipoId) return;
    loadStats();
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
    setEdited({});
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

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 3000); };

  const handleSave = async () => {
    if (Object.keys(edited).length === 0) { flash('Sin cambios'); return; }
    setSaving(true);

    const upserts = Object.entries(edited).map(([jugId, changes]) => {
      const base = statsMap[jugId] ?? {};
      const merged = { ...base, ...changes };
      return {
        jugadora_id: jugId,
        pj:  Number(merged.pj  ?? 0),
        pts: Number(merged.pts ?? 0),
        reb: Number(merged.reb ?? 0),
        ast: Number(merged.ast ?? 0),
        rob: Number(merged.rob ?? 0),
        tap: Number(merged.tap ?? 0),
        fgp: Number(merged.fgp ?? 0),
        tpp: Number(merged.tpp ?? 0),
        tlp: Number(merged.tlp ?? 0),
        updated_at: new Date().toISOString(),
      };
    });

    const { error } = await supabase
      .from('estadisticas_femenino')
      .upsert(upserts, { onConflict: 'jugadora_id' });

    if (error) flash(`❌ ${error.message}`);
    else { flash(`✅ Guardado (${upserts.length} jugadoras)`); loadStats(); }
    setSaving(false);
  };

  const hasChanges = Object.keys(edited).length > 0;

  return (
    <div>
      <h2 style={styles.sectionTitle}>✏️ Editar estadísticas manualmente</h2>
      <p style={styles.hint}>Seleccioná un equipo y editá los stats de cada jugadora directamente.</p>

      {/* Selector de equipo */}
      <select
        value={equipoId}
        onChange={e => setEquipoId(e.target.value)}
        style={{ ...styles.select, marginBottom: 24, maxWidth: 320 }}
      >
        <option value="">— Seleccionar equipo —</option>
        {equiposFemenino.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
      </select>

      {msg && <div style={styles.flashMsg}>{msg}</div>}

      {equipo && (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{...styles.th, textAlign:'left', minWidth:160}}>Jugadora</th>
                  {STATS_COLS.map(c => (
                    <th key={c.key} style={styles.th} title={c.title}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {equipo.jugadoras.map((j, i) => {
                  const isEdited = Boolean(edited[j.id]);
                  return (
                    <tr key={j.id} style={{ background: isEdited ? 'rgba(240,180,41,0.06)' : i % 2 === 0 ? '#0E1420' : '#141C2A' }}>
                      <td style={{...styles.td, textAlign:'left', color: isEdited ? '#F0B429' : '#EEF2F8', fontWeight: isEdited ? 600 : 400}}>
                        {j.nombre}
                        {isEdited && <span style={{ marginLeft: 6, fontSize: 10, color: '#F0B429' }}>●</span>}
                      </td>
                      {STATS_COLS.map(c => (
                        <td key={c.key} style={styles.td}>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={getValue(j.id, c.key)}
                            onChange={e => handleChange(j.id, c.key, e.target.value)}
                            style={styles.cellInput}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 20, alignItems: 'center' }}>
            <button onClick={handleSave} disabled={saving || !hasChanges} style={{
              ...styles.btnSave,
              opacity: hasChanges ? 1 : 0.5,
            }}>
              {saving ? 'Guardando...' : `💾 GUARDAR CAMBIOS${hasChanges ? ` (${Object.keys(edited).length})` : ''}`}
            </button>
            {hasChanges && (
              <button onClick={() => setEdited({})} style={styles.btnCancel}>Descartar</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  sectionTitle: { color: '#F0B429', fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: 1, marginBottom: 8 },
  hint:         { color: '#6B7A99', fontSize: 13, marginBottom: 20, lineHeight: 1.6 },
  flashMsg:     { padding: '10px 16px', background: '#141C2A', borderRadius: 8, color: '#EEF2F8', marginBottom: 16, fontSize: 14 },
  select:       { padding: '10px 14px', background: '#141C2A', border: '1px solid #1C2535', borderRadius: 8, color: '#EEF2F8', fontSize: 14, width: '100%', outline: 'none' },
  table:        { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:           { background: '#141C2A', color: '#6B7A99', padding: '8px 10px', textAlign: 'center', fontSize: 11, letterSpacing: 0.5, whiteSpace: 'nowrap' },
  td:           { padding: '4px 6px', borderBottom: '1px solid #1C2535' },
  cellInput:    {
    width: 56, padding: '5px 4px', background: '#080C12',
    border: '1px solid #1C2535', borderRadius: 4,
    color: '#EEF2F8', fontSize: 13, textAlign: 'center', outline: 'none',
  },
  btnSave:   { padding: '11px 28px', background: 'linear-gradient(135deg, #F0B429, #FF6B2B)', border: 'none', borderRadius: 8, color: '#080C12', fontWeight: 700, cursor: 'pointer', fontSize: 15, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 1 },
  btnCancel: { padding: '10px 20px', background: 'transparent', border: '1px solid #4A566E', borderRadius: 8, color: '#6B7A99', cursor: 'pointer', fontSize: 14 },
};
