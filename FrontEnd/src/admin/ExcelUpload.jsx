import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import Fuse from 'fuse.js';
import { supabase } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';

// ─── Índice de jugadoras para fuzzy matching ──────────────────────────────────
const TODAS_JUGADORAS = equiposFemenino.flatMap(eq =>
  eq.jugadoras.map(j => ({
    id:       j.id,
    nombre:   j.nombre,
    equipoId: eq.id,
    equipo:   eq.nombre,
    // apellido como primer token para matching por apellido solo
    apellido: j.nombre.split(' ')[0],
  }))
);

const fuse = new Fuse(TODAS_JUGADORAS, {
  keys:      ['nombre', 'apellido'],
  threshold: 0.4,   // 0=exacto, 1=todo. 0.4 tolera errores menores
  minMatchCharLength: 2,
});

function resolverJugadora(nombreRaw, equipoNombre) {
  if (!nombreRaw) return null;
  const clean = String(nombreRaw).trim();

  // 1. Buscar por apellido dentro del equipo correcto primero
  const resultados = fuse.search(clean);
  const enEquipo   = resultados.filter(r => r.item.equipo.toLowerCase().includes(equipoNombre.toLowerCase().split(' ')[0].toLowerCase()));

  if (enEquipo.length > 0) return enEquipo[0].item;
  if (resultados.length > 0) return resultados[0].item;
  return null;
}

// ─── Parser del Excel ─────────────────────────────────────────────────────────
// Formato: Pilar vs Triple Locura
// Fila 12-14: marcador por cuartos
// Fila 16: headers de stats
// Fila 17+: jugadoras (Equipo en col A solo en primera fila de cada equipo)
// Fila 41-43: % de tiro por equipo

function parsearExcel(wb) {
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  const resultado = {
    equipoLocal: null, equipoVisit: null,
    marcador: {
      local: { q1:0,q2:0,q3:0,q4:0,ot:0,total:0 },
      visit: { q1:0,q2:0,q3:0,q4:0,ot:0,total:0 },
    },
    pct: { local:{simples:0,dobles:0,triples:0}, visit:{simples:0,dobles:0,triples:0} },
    jugadoras: [],
    errores: [],
    warnings: [],
  };

  // ── Marcador (filas 12-14, índice 11-13) ──
  let headerRow = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i]?.[0] === 'Equipo' && rows[i]?.[1] === 'Partido') { headerRow = i; break; }
  }

  // Buscar fila de marcador (tiene 'Equipo' y '1º')
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    if (r[0] === 'Equipo' && String(r[1] ?? '').includes('1')) {
      // Fila i+1 = local, i+2 = visit
      const local = rows[i+1];
      const visit = rows[i+2];
      if (local) {
        resultado.equipoLocal = String(local[0]).trim();
        resultado.marcador.local = { q1: local[1]??0, q2: local[2]??0, q3: local[3]??0, q4: local[4]??0, ot: local[5]??0, total: local[6]??0 };
      }
      if (visit) {
        resultado.equipoVisit = String(visit[0]).trim();
        resultado.marcador.visit = { q1: visit[1]??0, q2: visit[2]??0, q3: visit[3]??0, q4: visit[4]??0, ot: visit[5]??0, total: visit[6]??0 };
      }
      break;
    }
  }

  if (!resultado.equipoLocal || !resultado.equipoVisit) {
    resultado.errores.push('No se encontraron los equipos en el archivo');
    return resultado;
  }

  // ── Stats jugadoras ──
  // Headers: Equipo,Partido,Nº,Nombre,SC,SF,DC,DF,TC,TF,AS,RD,RO,FP,FT,FA,RB,TP,PE,CA,PTS,VAL
  let equipoActual = resultado.equipoLocal;

  if (headerRow === -1) {
    resultado.errores.push('No se encontró la fila de headers de estadísticas');
    return resultado;
  }

  for (let i = headerRow + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every(v => v === null)) continue;

    // Detectar cambio de equipo
    if (r[0] && typeof r[0] === 'string' && r[0].trim()) {
      const posibleEquipo = r[0].trim();
      if (posibleEquipo !== resultado.equipoLocal && posibleEquipo !== resultado.equipoVisit) break; // fin
      equipoActual = posibleEquipo;
    }

    // Fila de totales (Nº vacío, o nombre vacío)
    const numero = r[2];
    const nombre = r[3];
    if (!nombre || typeof nombre !== 'string') continue;
    if (String(nombre).trim() === '') continue;

    // Resolver jugadora por fuzzy matching
    const jugadora = resolverJugadora(nombre, equipoActual);
    if (!jugadora) {
      resultado.warnings.push(`"${nombre}" (${equipoActual}) → no encontrada en el plantel`);
    }

    resultado.jugadoras.push({
      nombreRaw:  String(nombre).trim(),
      equipoRaw:  equipoActual,
      jugadora,   // puede ser null si no se encontró
      numero:     typeof numero === 'number' ? numero : null,
      sc:  r[4]  ?? 0,
      sf:  r[5]  ?? 0,
      dc:  r[6]  ?? 0,
      df:  r[7]  ?? 0,
      tc:  r[8]  ?? 0,
      tf:  r[9]  ?? 0,
      as_: r[10] ?? 0,
      rd:  r[11] ?? 0,
      ro:  r[12] ?? 0,
      fp:  r[13] ?? 0,
      ft:  r[14] ?? 0,
      fa:  r[15] ?? 0,
      rb:  r[16] ?? 0,
      tp:  r[17] ?? 0,
      pe:  r[18] ?? 0,
      ca:  r[19] ?? 0,
      pts: r[20] ?? 0,
      val: r[21] ?? 0,
    });
  }

  // ── % tiro por equipo ──
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    if (r[0] === 'Equipo' && String(r[1] ?? '').includes('%')) {
      const local = rows[i+1];
      const visit = rows[i+2];
      if (local) resultado.pct.local = { simples: local[1]??0, dobles: local[2]??0, triples: local[3]??0 };
      if (visit) resultado.pct.visit = { simples: visit[1]??0, dobles: visit[2]??0, triples: visit[3]??0 };
      break;
    }
  }

  return resultado;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function ExcelUpload() {
  const [parsed,    setParsed]    = useState(null);
  const [fileName,  setFileName]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [published, setPublished] = useState(false);
  const [jornada,   setJornada]   = useState('');
  const [lugar,     setLugar]     = useState('');
  const fileRef = useRef();

  const reset = () => { setParsed(null); setFileName(''); setPublished(false); };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    reset();
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb     = XLSX.read(ev.target.result, { type: 'binary' });
      const result = parsearExcel(wb);
      setParsed(result);
    };
    reader.readAsBinaryString(file);
  };

  const handlePublish = async () => {
    if (!parsed || !jornada) { alert('Ingresá el número de fecha antes de publicar'); return; }
    setLoading(true);

    try {
      // 1. Upsert fecha/jornada
      const { data: fechaData, error: fechaErr } = await supabase
        .from('fechas_femenino')
        .upsert({ numero: Number(jornada), descripcion: `Fecha ${jornada}` }, { onConflict: 'numero' })
        .select('id').single();
      if (fechaErr) throw fechaErr;
      const fechaId = fechaData.id;

      // 2. Resolver IDs de equipos
      const eqLocalId = equiposFemenino.find(e =>
        e.nombre.toLowerCase().includes(parsed.equipoLocal.toLowerCase().split(' ')[0].toLowerCase())
      )?.id;
      const eqVisitId = equiposFemenino.find(e =>
        e.nombre.toLowerCase().includes(parsed.equipoVisit.toLowerCase().split(' ')[0].toLowerCase())
      )?.id;

      if (!eqLocalId || !eqVisitId) throw new Error(`No se encontraron los equipos: ${parsed.equipoLocal} / ${parsed.equipoVisit}`);

      const m = parsed.marcador;
      const p = parsed.pct;

      // 3. Insertar partido
      const { data: partidoData, error: partidoErr } = await supabase
        .from('partidos_femenino')
        .insert({
          fecha_id:        fechaId,
          equipo_local_id: eqLocalId,
          equipo_visit_id: eqVisitId,
          q1_local: m.local.q1, q2_local: m.local.q2, q3_local: m.local.q3, q4_local: m.local.q4, ot_local: m.local.ot,
          q1_visit: m.visit.q1, q2_visit: m.visit.q2, q3_visit: m.visit.q3, q4_visit: m.visit.q4, ot_visit: m.visit.ot,
          pct_simples_local: p.local.simples, pct_dobles_local: p.local.dobles, pct_triples_local: p.local.triples,
          pct_simples_visit: p.visit.simples, pct_dobles_visit: p.visit.dobles, pct_triples_visit: p.visit.triples,
          lugar:  lugar || null,
          estado: 'finalizado',
        })
        .select('id').single();
      if (partidoErr) throw partidoErr;
      const partidoId = partidoData.id;

      // 4. Insertar stats de jugadoras
      const statsRows = parsed.jugadoras
        .filter(j => j.jugadora)
        .map(j => ({
          partido_id:  partidoId,
          jugadora_id: j.jugadora.id,
          equipo_id:   j.jugadora.equipoId,
          numero:      j.numero,
          sc: j.sc,  sf: j.sf,  dc: j.dc,  df: j.df,
          tc: j.tc,  tf: j.tf,  as_: j.as_,
          rd: j.rd,  ro: j.ro,
          fp: j.fp,  ft: j.ft,  fa: j.fa,
          rb: j.rb,  tp: j.tp,  pe: j.pe,
          ca: j.ca,  pts: j.pts, val: j.val,
        }));

      const { error: statsErr } = await supabase
        .from('stats_partido_femenino')
        .upsert(statsRows, { onConflict: 'partido_id,jugadora_id' });
      if (statsErr) throw statsErr;

      // 5. Recalcular promedios acumulados
      await recalcularPromedios(statsRows.map(r => r.jugadora_id));

      setPublished(true);
    } catch (err) {
      alert(`Error al publicar: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const recalcularPromedios = async (jugadoraIds) => {
    // Para cada jugadora, traemos todas sus stats y calculamos promedios
    for (const jugId of [...new Set(jugadoraIds)]) {
      const { data: allStats } = await supabase
        .from('stats_partido_femenino')
        .select('pts,rd,ro,as_,rb,tp,pe,val,sc,sf,dc,df,tc,tf')
        .eq('jugadora_id', jugId);

      if (!allStats?.length) continue;
      const n = allStats.length;

      const sum = (key) => allStats.reduce((a, r) => a + (r[key] ?? 0), 0);
      const avg = (key) => +(sum(key) / n).toFixed(1);

      // Porcentajes
      const pctSimp = sum('sc') + sum('sf') > 0 ? +((sum('sc') / (sum('sc') + sum('sf'))) * 100).toFixed(1) : 0;
      const pctDob  = sum('dc') + sum('df') > 0 ? +((sum('dc') / (sum('dc') + sum('df'))) * 100).toFixed(1) : 0;
      const pctTrip = sum('tc') + sum('tf') > 0 ? +((sum('tc') / (sum('tc') + sum('tf'))) * 100).toFixed(1) : 0;

      // Mejor partido
      const mejorPts = Math.max(...allStats.map(r => r.pts ?? 0));

      await supabase.from('estadisticas_femenino').upsert({
        jugadora_id:  jugId,
        pj:           n,
        pts_prom:     avg('pts'),
        reb_prom:     +((sum('rd') + sum('ro')) / n).toFixed(1),
        ast_prom:     avg('as_'),
        rob_prom:     avg('rb'),
        tap_prom:     avg('tp'),
        per_prom:     avg('pe'),
        val_prom:     avg('val'),
        pct_simples:  pctSimp,
        pct_dobles:   pctDob,
        pct_triples:  pctTrip,
        pts_total:    sum('pts'),
        reb_total:    sum('rd') + sum('ro'),
        ast_total:    sum('as_'),
        mejor_pts:    mejorPts,
        updated_at:   new Date().toISOString(),
      }, { onConflict: 'jugadora_id' });
    }
  };

  const localJugs  = parsed?.jugadoras.filter(j => j.equipoRaw === parsed.equipoLocal) ?? [];
  const visitJugs  = parsed?.jugadoras.filter(j => j.equipoRaw === parsed.equipoVisit) ?? [];
  const sinResolv  = parsed?.jugadoras.filter(j => !j.jugadora) ?? [];

  return (
    <div>
      <h2 style={s.title}>📊 Cargar partido desde Excel</h2>
      <p style={s.hint}>
        Subí la planilla de estadísticas del partido. El sistema detecta automáticamente
        los equipos, el marcador, los parciales y las stats de cada jugadora.
      </p>

      {/* Meta del partido */}
      <div style={s.metaRow}>
        <div style={s.metaGroup}>
          <label style={s.label}>N° de Fecha *</label>
          <input type="number" min="1" value={jornada} onChange={e => setJornada(e.target.value)}
            style={s.input} placeholder="1" />
        </div>
        <div style={s.metaGroup}>
          <label style={s.label}>Lugar (opcional)</label>
          <input type="text" value={lugar} onChange={e => setLugar(e.target.value)}
            style={s.input} placeholder="Club, cancha..." />
        </div>
      </div>

      {/* Drop zone */}
      {!published && (
        <div style={s.dropZone} onClick={() => fileRef.current.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); fileRef.current.files = e.dataTransfer.files; handleFile({ target: e.dataTransfer }); }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📁</div>
          <p style={{ color: '#EEF2F8', margin: 0 }}>{fileName || 'Arrastrá el Excel o hacé click para seleccionar'}</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display:'none' }} />
        </div>
      )}

      {/* Errores */}
      {parsed?.errores?.length > 0 && (
        <div style={s.errBox}>
          {parsed.errores.map((e,i) => <p key={i} style={{ margin:'4px 0' }}>❌ {e}</p>)}
        </div>
      )}

      {/* Preview del partido */}
      {parsed && parsed.errores.length === 0 && !published && (
        <>
          {/* Marcador */}
          <div style={s.marcadorCard}>
            <div style={s.marcadorEquipo}>
              <div style={s.marcadorNombre}>{parsed.equipoLocal}</div>
              <div style={s.marcadorTotal}>{parsed.marcador.local.total}</div>
              <div style={s.marcadorParciales}>
                {[1,2,3,4].map(q => (
                  <span key={q} style={s.parcial}>{parsed.marcador.local[`q${q}`]}</span>
                ))}
                {parsed.marcador.local.ot > 0 && <span style={s.parcial}>OT:{parsed.marcador.local.ot}</span>}
              </div>
            </div>
            <div style={s.marcadorVs}>VS</div>
            <div style={s.marcadorEquipo}>
              <div style={s.marcadorNombre}>{parsed.equipoVisit}</div>
              <div style={s.marcadorTotal}>{parsed.marcador.visit.total}</div>
              <div style={s.marcadorParciales}>
                {[1,2,3,4].map(q => (
                  <span key={q} style={s.parcial}>{parsed.marcador.visit[`q${q}`]}</span>
                ))}
                {parsed.marcador.visit.ot > 0 && <span style={s.parcial}>OT:{parsed.marcador.visit.ot}</span>}
              </div>
            </div>
          </div>

          {/* % de tiro */}
          <div style={s.pctRow}>
            {['simples','dobles','triples'].map(t => (
              <div key={t} style={s.pctCard}>
                <div style={s.pctLabel}>% {t.charAt(0).toUpperCase()+t.slice(1)}</div>
                <div style={s.pctVals}>
                  <span style={{ color:'#F0B429' }}>{parsed.pct.local[t]}%</span>
                  <span style={{ color:'#4A566E', fontSize:11 }}>vs</span>
                  <span style={{ color:'#60A5FA' }}>{parsed.pct.visit[t]}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Warnings */}
          {parsed.warnings.length > 0 && (
            <div style={s.warnBox}>
              <p style={{ margin:'0 0 6px', fontWeight:600 }}>⚠️ {parsed.warnings.length} jugadora(s) no encontradas — se ignorarán</p>
              {parsed.warnings.map((w,i) => <p key={i} style={{ margin:'2px 0', fontSize:13 }}>{w}</p>)}
            </div>
          )}

          {/* Tabla stats */}
          {[
            { equipo: parsed.equipoLocal, jugs: localJugs },
            { equipo: parsed.equipoVisit, jugs: visitJugs },
          ].map(({ equipo, jugs }) => (
            <div key={equipo} style={{ marginBottom: 32 }}>
              <div style={s.teamHeader}>{equipo} — {jugs.length} jugadoras</div>
              <div style={{ overflowX:'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {['#','Jugadora','PTS','VAL','SC/SF','DC/DF','TC/TF','AS','RD','RO','ROB','TAP','PÉR'].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {jugs.map((j,i) => (
                      <tr key={i} style={{ background: i%2===0 ? '#0E1420':'#141C2A', opacity: j.jugadora ? 1 : 0.45 }}>
                        <td style={s.td}>{j.numero ?? '-'}</td>
                        <td style={{...s.td, textAlign:'left', color: j.jugadora ? '#EEF2F8':'#F04060'}}>
                          {j.jugadora ? j.jugadora.nombre : `⚠️ ${j.nombreRaw}`}
                        </td>
                        <td style={{...s.td, color:'#F0B429', fontWeight:700}}>{j.pts}</td>
                        <td style={{...s.td, color: j.val >= 0 ? '#22D07A':'#F04060'}}>{j.val}</td>
                        <td style={s.td}>{j.sc}/{j.sf}</td>
                        <td style={s.td}>{j.dc}/{j.df}</td>
                        <td style={s.td}>{j.tc}/{j.tf}</td>
                        <td style={s.td}>{j.as_}</td>
                        <td style={s.td}>{j.rd}</td>
                        <td style={s.td}>{j.ro}</td>
                        <td style={s.td}>{j.rb}</td>
                        <td style={s.td}>{j.tp}</td>
                        <td style={s.td}>{j.pe}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {sinResolv.length > 0 && (
            <p style={{ color:'#6B7A99', fontSize:13 }}>
              {sinResolv.length} jugadora(s) sin resolver serán ignoradas al publicar.
            </p>
          )}

          <div style={{ display:'flex', gap:12, marginTop:8 }}>
            <button onClick={handlePublish} disabled={loading || !jornada} style={{
              ...s.btnPublish, opacity: jornada ? 1 : 0.5
            }}>
              {loading ? 'Publicando...' : `🚀 PUBLICAR PARTIDO`}
            </button>
            <button onClick={reset} style={s.btnCancel}>Cancelar</button>
          </div>
        </>
      )}

      {/* Éxito */}
      {published && (
        <div style={s.successBox}>
          <div style={{ fontSize:48, marginBottom:12 }}>🎉</div>
          <h3 style={{ color:'#22D07A', margin:'0 0 8px' }}>¡Partido publicado!</h3>
          <p style={{ color:'#6B7A99', margin:'0 0 4px' }}>
            {parsed.equipoLocal} {parsed.marcador.local.total} — {parsed.marcador.visit.total} {parsed.equipoVisit}
          </p>
          <p style={{ color:'#6B7A99', margin:'0 0 20px', fontSize:13 }}>
            Stats de {parsed.jugadoras.filter(j=>j.jugadora).length} jugadoras guardadas y promedios actualizados.
          </p>
          <button onClick={reset} style={s.btnCancel}>Cargar otro partido</button>
        </div>
      )}
    </div>
  );
}

const s = {
  title:    { color:'#F0B429', fontFamily:"'Bebas Neue', sans-serif", fontSize:24, letterSpacing:1, marginBottom:8 },
  hint:     { color:'#6B7A99', fontSize:13, marginBottom:20, lineHeight:1.6 },
  metaRow:  { display:'flex', gap:16, marginBottom:20, flexWrap:'wrap' },
  metaGroup:{ display:'flex', flexDirection:'column', gap:6, flex:1, minWidth:140 },
  label:    { color:'#6B7A99', fontSize:11, letterSpacing:0.5, textTransform:'uppercase' },
  input:    { padding:'10px 12px', background:'#141C2A', border:'1px solid #1C2535', borderRadius:8, color:'#EEF2F8', fontSize:14, outline:'none' },
  dropZone: { border:'2px dashed #1C2535', borderRadius:12, padding:'2rem 1rem', textAlign:'center', cursor:'pointer', marginBottom:20 },
  errBox:   { background:'rgba(240,64,96,0.1)', border:'1px solid rgba(240,64,96,0.3)', borderRadius:8, padding:'12px 16px', marginBottom:16, color:'#F04060', fontSize:14 },
  warnBox:  { background:'rgba(240,180,41,0.08)', border:'1px solid rgba(240,180,41,0.25)', borderRadius:8, padding:'12px 16px', marginBottom:20, color:'#F0B429', fontSize:14 },
  marcadorCard: { background:'#0E1420', border:'1px solid #1C2535', borderRadius:12, padding:'1.5rem', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, gap:16 },
  marcadorEquipo: { flex:1, textAlign:'center' },
  marcadorNombre: { fontFamily:"'Bebas Neue', sans-serif", fontSize:18, letterSpacing:1, color:'#EEF2F8', marginBottom:4 },
  marcadorTotal:  { fontFamily:"'Bebas Neue', sans-serif", fontSize:52, color:'#F0B429', lineHeight:1 },
  marcadorParciales: { display:'flex', gap:6, justifyContent:'center', marginTop:6 },
  parcial:  { background:'#141C2A', padding:'2px 6px', borderRadius:4, fontSize:12, color:'#6B7A99' },
  marcadorVs: { fontFamily:"'Bebas Neue', sans-serif", fontSize:22, color:'#4A566E', letterSpacing:2 },
  pctRow:   { display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' },
  pctCard:  { flex:1, minWidth:100, background:'#0E1420', border:'1px solid #1C2535', borderRadius:8, padding:'10px 12px', textAlign:'center' },
  pctLabel: { color:'#6B7A99', fontSize:11, marginBottom:4, textTransform:'uppercase', letterSpacing:0.5 },
  pctVals:  { display:'flex', gap:8, justifyContent:'center', alignItems:'center', fontFamily:"'Bebas Neue', sans-serif", fontSize:18 },
  teamHeader: { fontFamily:"'Bebas Neue', sans-serif", fontSize:18, letterSpacing:1, color:'#EEF2F8', marginBottom:10, padding:'8px 0', borderBottom:'1px solid #1C2535' },
  table:    { width:'100%', borderCollapse:'collapse', fontSize:13, marginBottom:8 },
  th:       { background:'#141C2A', color:'#6B7A99', padding:'8px 10px', textAlign:'center', fontSize:11, letterSpacing:0.5, whiteSpace:'nowrap' },
  td:       { padding:'7px 10px', textAlign:'center', color:'#EEF2F8', borderBottom:'1px solid #1C2535' },
  btnPublish: { flex:1, padding:'13px', background:'linear-gradient(135deg,#F0B429,#FF6B2B)', border:'none', borderRadius:10, color:'#080C12', fontFamily:"'Bebas Neue', sans-serif", fontSize:20, letterSpacing:1, cursor:'pointer' },
  btnCancel:  { padding:'10px 20px', background:'transparent', border:'1px solid #4A566E', borderRadius:8, color:'#6B7A99', cursor:'pointer', fontSize:14 },
  successBox: { textAlign:'center', padding:'3rem 1rem', background:'rgba(34,208,122,0.05)', border:'1px solid rgba(34,208,122,0.2)', borderRadius:12 },
};
