import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function UploadHistory() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('upload_log')
      .select('*')
      .order('cargado_en', { ascending: false })
      .limit(30);
    setLogs(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id, partidoId) => {
    if (!confirm('¿Eliminar esta carga? Se borrarán las stats del partido asociado.')) return;
    // Borrar el partido (cascade borra stats_partido)
    if (partidoId) await supabase.from('partidos_femenino').delete().eq('id', partidoId);
    await supabase.from('upload_log').delete().eq('id', id);
    load();
  };

  return (
    <div>
      <h2 style={s.title}>🗂️ Historial de cargas</h2>
      <p style={s.hint}>Cada partido subido queda registrado. Podés ver warnings y eliminar cargas erróneas.</p>

      <button onClick={load} style={s.btnRefresh}>↻ Actualizar</button>

      {loading ? (
        <p style={{ color:'#6B7A99', padding:'2rem 0' }}>Cargando...</p>
      ) : logs.length === 0 ? (
        <div style={s.empty}>
          <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
          <p>Todavía no se cargó ningún partido.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:16 }}>
          {logs.map(l => (
            <div key={l.id} style={s.card}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
                  <span style={s.badge}>Fecha {l.fecha_id ?? '?'}</span>
                  <span style={{ color:'#EEF2F8', fontWeight:600, fontSize:15 }}>
                    {l.equipo_local} vs {l.equipo_visit}
                  </span>
                </div>
                <div style={{ color:'#6B7A99', fontSize:12, marginBottom:4 }}>
                  📁 {l.archivo_nombre} · 
                  ✅ {l.jugadoras_ok} jugadoras · 
                  {l.jugadoras_skip > 0 && <span style={{ color:'#F0B429' }}> ⚠️ {l.jugadoras_skip} ignoradas</span>}
                </div>
                <div style={{ color:'#4A566E', fontSize:11 }}>
                  {new Date(l.cargado_en).toLocaleString('es-AR')}
                </div>
                {l.warnings?.length > 0 && (
                  <details style={{ marginTop:6 }}>
                    <summary style={{ color:'#F0B429', fontSize:12, cursor:'pointer' }}>
                      Ver {l.warnings.length} warning(s)
                    </summary>
                    <div style={{ marginTop:4, paddingLeft:12 }}>
                      {l.warnings.map((w,i) => (
                        <p key={i} style={{ color:'#F0B429', fontSize:12, margin:'2px 0' }}>{w}</p>
                      ))}
                    </div>
                  </details>
                )}
              </div>
              <button onClick={() => handleDelete(l.id, l.partido_id)} style={s.btnDel} title="Eliminar carga">
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  title:      { color:'#F0B429', fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:1, marginBottom:8 },
  hint:       { color:'#6B7A99', fontSize:13, marginBottom:16, lineHeight:1.6 },
  btnRefresh: { padding:'8px 16px', background:'transparent', border:'1px solid #1C2535', borderRadius:8, color:'#6B7A99', cursor:'pointer', fontSize:13, marginBottom:4 },
  empty:      { textAlign:'center', padding:'3rem', color:'#6B7A99' },
  card:       { background:'#0E1420', border:'1px solid #1C2535', borderRadius:10, padding:'14px 16px', display:'flex', gap:12, alignItems:'flex-start' },
  badge:      { background:'rgba(240,180,41,.15)', color:'#F0B429', padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:700 },
  btnDel:     { background:'transparent', border:'1px solid rgba(240,64,96,.3)', borderRadius:6, padding:'6px 10px', cursor:'pointer', fontSize:16, flexShrink:0 },
};
