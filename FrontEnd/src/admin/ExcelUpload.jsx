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
    // Apellido = último token (formato "Nombre Apellido" o "Apellido" solo)
    apellido: j.nombre.split(' ').slice(-1)[0],
  }))
);

const fuse = new Fuse(TODAS_JUGADORAS, {
  keys: ['nombre', 'apellido'],
  threshold: 0.4,
  minMatchCharLength: 2,
});

function resolverJugadora(nombreRaw, equipoHint) {
  if (!nombreRaw) return null;
  const clean = String(nombreRaw).trim();
  const resultados = fuse.search(clean);

  // Intentar primero dentro del equipo correcto
  if (equipoHint) {
    const hint = equipoHint.toLowerCase().split(' ')[0];
    const enEquipo = resultados.filter(r =>
      r.item.equipo.toLowerCase().includes(hint)
    );
    if (enEquipo.length > 0) return enEquipo[0].item;
  }
  return resultados.length > 0 ? resultados[0].item : null;
}

// ─── Índices exactos de columnas (mapeados del Excel real) ────────────────────
const C = {
  // Jugadoras (fila 16 = headers)
  equipo: 0, partido: 3, numero: 6, nombre: 9,
  sc: 17, sf: 20, dc: 23, df: 25, tc: 27, tf: 29,
  as_: 31, rd: 33, ro: 35, fp: 36, ft: 38, fa: 40,
  rb: 44, tp: 46, pe: 47, ca: 51, pts: 52, val: 55,
};
const M = { equipo: 2, q1: 7, q2: 11, q3: 12, q4: 13, ot: 14, total: 16 };
const P = { equipo: 2, simples: 7, dobles: 15, triples: 24 };

function num(v) { return typeof v === 'number' ? v : 0; }

// ─── Parser principal ─────────────────────────────────────────────────────────
function parsearExcel(wb) {
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  const res = {
    equipoLocal: null, equipoVisit: null,
    marcador: {
      local: { q1:0, q2:0, q3:0, q4:0, ot:0, total:0 },
      visit: { q1:0, q2:0, q3:0, q4:0, ot:0, total:0 },
    },
    pct: {
      local: { simples:0, dobles:0, triples:0 },
      visit: { simples:0, dobles:0, triples:0 },
    },
    jugadoras: [],
    errores: [],
    warnings: [],
  };

  // ── 1. Marcador (buscar fila con 'Equipo' en col 2 y '1º' en col 7) ──
  let marcadorHeaderRow = -1;
  let statsHeaderRow    = -1;
  let pctHeaderRow      = -1;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;

    // Fila marcador header: col2='Equipo', col7 contiene '1'
    if (r[M.equipo] === 'Equipo' && String(r[M.q1] ?? '').includes('1')) {
      marcadorHeaderRow = i;
    }
    // Fila stats header: col0='Equipo', col3='Partido'
    if (r[C.equipo] === 'Equipo' && r[C.partido] === 'Partido') {
      statsHeaderRow = i;
    }
    // Fila % tiro header: col2='Equipo', col7 contiene '%'
    if (r[P.equipo] === 'Equipo' && String(r[P.simples] ?? '').includes('%')) {
      pctHeaderRow = i;
    }
  }

  if (marcadorHeaderRow === -1) {
    res.errores.push('No se encontró la sección de marcador. Verificá que el archivo sea la planilla correcta.');
    return res;
  }
  if (statsHeaderRow === -1) {
    res.errores.push('No se encontró la sección de estadísticas. Verificá la estructura del archivo.');
    return res;
  }

  // ── 2. Leer marcador ──
  const rLocal = rows[marcadorHeaderRow + 1];
  const rVisit = rows[marcadorHeaderRow + 2];

  if (rLocal) {
    res.equipoLocal = String(rLocal[M.equipo] ?? '').trim();
    res.marcador.local = {
      q1: num(rLocal[M.q1]), q2: num(rLocal[M.q2]),
      q3: num(rLocal[M.q3]), q4: num(rLocal[M.q4]),
      ot: num(rLocal[M.ot]), total: num(rLocal[M.total]),
    };
  }
  if (rVisit) {
    res.equipoVisit = String(rVisit[M.equipo] ?? '').trim();
    res.marcador.visit = {
      q1: num(rVisit[M.q1]), q2: num(rVisit[M.q2]),
      q3: num(rVisit[M.q3]), q4: num(rVisit[M.q4]),
      ot: num(rVisit[M.ot]), total: num(rVisit[M.total]),
    };
  }

  if (!res.equipoLocal || !res.equipoVisit) {
    res.errores.push('No se pudieron leer los equipos del marcador.');
    return res;
  }

  // ── 3. Leer stats jugadoras ──
  let equipoActual = res.equipoLocal;

  for (let i = statsHeaderRow + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;

    // Fila vacía total → fin de datos
    if (r.every(v => v === null)) continue;

    // Detectar cambio de equipo: col 0 tiene texto de equipo
    if (r[C.equipo] && typeof r[C.equipo] === 'string' && r[C.equipo].trim()) {
      const eq = r[C.equipo].trim();
      // Si es header de % tiro, terminar
      if (eq === 'Equipo') break;
      if (eq === res.equipoLocal || eq === res.equipoVisit) {
        equipoActual = eq;
      }
    }

    // Fila de TOTALES: col numero = '' o null y col nombre = '' o null → skip
    const nombre = r[C.nombre];
    const numero = r[C.numero];
    if (nombre === null || nombre === '' || String(nombre).trim() === '') continue;
    if (typeof nombre !== 'string') continue;

    // Resolver jugadora con fuzzy matching
    const jugadora = resolverJugadora(nombre, equipoActual);
    if (!jugadora) {
      res.warnings.push(`"${nombre}" (${equipoActual}) → no encontrada en el plantel, se ignorará`);
    }

    res.jugadoras.push({
      nombreRaw:  String(nombre).trim(),
      equipoRaw:  equipoActual,
      jugadora,
      numero:     typeof numero === 'number' ? numero : null,
      sc:  num(r[C.sc]),  sf:  num(r[C.sf]),
      dc:  num(r[C.dc]),  df:  num(r[C.df]),
      tc:  num(r[C.tc]),  tf:  num(r[C.tf]),
      as_: num(r[C.as_]),
      rd:  num(r[C.rd]),  ro:  num(r[C.ro]),
      fp:  num(r[C.fp]),  ft:  num(r[C.ft]),  fa: num(r[C.fa]),
      rb:  num(r[C.rb]),  tp:  num(r[C.tp]),  pe: num(r[C.pe]),
      ca:  num(r[C.ca]),
      pts: num(r[C.pts]),
      val: num(r[C.val]),
    });
  }

  // ── 4. Leer % tiro ──
  if (pctHeaderRow !== -1) {
    const pLocal = rows[pctHeaderRow + 1];
    const pVisit = rows[pctHeaderRow + 2];
    if (pLocal) res.pct.local = { simples: num(pLocal[P.simples]), dobles: num(pLocal[P.dobles]), triples: num(pLocal[P.triples]) };
    if (pVisit) res.pct.visit = { simples: num(pVisit[P.simples]), dobles: num(pVisit[P.dobles]), triples: num(pVisit[P.triples]) };
  }

  if (res.jugadoras.length === 0) {
    res.errores.push('No se encontraron jugadoras. Verificá la estructura del archivo.');
  }

  return res;
}

// ─── Recalcular promedios acumulados ──────────────────────────────────────────
async function recalcularPromedios(jugadoraIds) {
  const ids = [...new Set(jugadoraIds)];
  for (const jugId of ids) {
    const { data: allStats, error } = await supabase
      .from('stats_partido_femenino')
      .select('pts,rd,ro,as_,rb,tp,pe,val,sc,sf,dc,df,tc,tf')
      .eq('jugadora_id', jugId);

    if (error || !allStats?.length) continue;
    const n = allStats.length;

    const sum = (key) => allStats.reduce((a, r) => a + (r[key] ?? 0), 0);
    const avg = (key) => +(sum(key) / n).toFixed(1);

    const totalSC = sum('sc'), totalSF = sum('sf');
    const totalDC = sum('dc'), totalDF = sum('df');
    const totalTC = sum('tc'), totalTF = sum('tf');

    const pctSimp  = totalSC + totalSF > 0 ? +((totalSC / (totalSC + totalSF)) * 100).toFixed(1) : 0;
    const pctDob   = totalDC + totalDF > 0 ? +((totalDC / (totalDC + totalDF)) * 100).toFixed(1) : 0;
    const pctTrip  = totalTC + totalTF > 0 ? +((totalTC / (totalTC + totalTF)) * 100).toFixed(1) : 0;
    const mejorPts = Math.max(...allStats.map(r => r.pts ?? 0));

    await supabase.from('estadisticas_femenino').upsert({
      jugadora_id: jugId,
      pj:          n,
      pts_prom:    avg('pts'),
      reb_prom:    +((sum('rd') + sum('ro')) / n).toFixed(1),
      ast_prom:    avg('as_'),
      rob_prom:    avg('rb'),
      tap_prom:    avg('tp'),
      per_prom:    avg('pe'),
      val_prom:    avg('val'),
      pct_simples: pctSimp,
      pct_dobles:  pctDob,
      pct_triples: pctTrip,
      pts_total:   sum('pts'),
      reb_total:   sum('rd') + sum('ro'),
      ast_total:   sum('as_'),
      mejor_pts:   mejorPts,
      updated_at:  new Date().toISOString(),
    }, { onConflict: 'jugadora_id' });
  }
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
    const file = (e.dataTransfer?.files ?? e.target.files)[0];
    if (!file) return;
    reset();
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb  = XLSX.read(ev.target.result, { type: 'binary' });
        setParsed(parsearExcel(wb));
      } catch (err) {
        setParsed({ errores: [`Error al leer el archivo: ${err.message}`], warnings: [], jugadoras: [], marcador: null, pct: null });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handlePublish = async () => {
    if (!parsed || !jornada) { alert('Ingresá el número de fecha antes de publicar'); return; }
    setLoading(true);
    try {
      // 1. Upsert fecha
      const { data: fechaData, error: fErr } = await supabase
        .from('fechas_femenino')
        .upsert({ numero: Number(jornada), descripcion: `Fecha ${jornada}` }, { onConflict: 'numero' })
        .select('id').single();
      if (fErr) throw fErr;

      // 2. Resolver IDs de equipos (fuzzy sobre nombre)
      const fuseEq = new Fuse(equiposFemenino, { keys: ['nombre'], threshold: 0.4 });
      const eqLocalMatch = fuseEq.search(parsed.equipoLocal);
      const eqVisitMatch = fuseEq.search(parsed.equipoVisit);
      if (!eqLocalMatch.length || !eqVisitMatch.length)
        throw new Error(`Equipos no encontrados: "${parsed.equipoLocal}" / "${parsed.equipoVisit}"`);

      const eqLocalId = eqLocalMatch[0].item.id;
      const eqVisitId = eqVisitMatch[0].item.id;
      const m = parsed.marcador;
      const p = parsed.pct;

      // 3. Insertar partido
      const { data: partidoData, error: pErr } = await supabase
        .from('partidos_femenino')
        .insert({
          fecha_id:        fechaData.id,
          equipo_local_id: eqLocalId,
          equipo_visit_id: eqVisitId,
          q1_local: m.local.q1, q2_local: m.local.q2,
          q3_local: m.local.q3, q4_local: m.local.q4, ot_local: m.local.ot,
          q1_visit: m.visit.q1, q2_visit: m.visit.q2,
          q3_visit: m.visit.q3, q4_visit: m.visit.q4, ot_visit: m.visit.ot,
          pct_simples_local: p.local.simples, pct_dobles_local: p.local.dobles, pct_triples_local: p.local.triples,
          pct_simples_visit: p.visit.simples, pct_dobles_visit: p.visit.dobles, pct_triples_visit: p.visit.triples,
          lugar:  lugar || null,
          estado: 'finalizado',
        })
        .select('id').single();
      if (pErr) throw pErr;

      // 4. Insertar stats de jugadoras (solo las que resolvieron)
      const statsRows = parsed.jugadoras
        .filter(j => j.jugadora)
        .map(j => ({
          partido_id:  partidoData.id,
          jugadora_id: j.jugadora.id,
          equipo_id:   j.jugadora.equipoId,
          numero: j.numero,
          sc: j.sc, sf: j.sf, dc: j.dc, df: j.df,
          tc: j.tc, tf: j.tf, as_: j.as_,
          rd: j.rd, ro: j.ro,
          fp: j.fp, ft: j.ft, fa: j.fa,
          rb: j.rb, tp: j.tp, pe: j.pe, ca: j.ca,
          pts: j.pts, val: j.val,
        }));

      if (statsRows.length > 0) {
        const { error: sErr } = await supabase
          .from('stats_partido_femenino')
          .upsert(statsRows, { onConflict: 'partido_id,jugadora_id' });
        if (sErr) throw sErr;
      }

      // 5. Recalcular promedios
      await recalcularPromedios(statsRows.map(r => r.jugadora_id));

      setPublished(true);
    } catch (err) {
      alert(`Error al publicar: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const localJugs = parsed?.jugadoras.filter(j => j.equipoRaw === parsed?.equipoLocal) ?? [];
  const visitJugs = parsed?.jugadoras.filter(j => j.equipoRaw === parsed?.equipoVisit) ?? [];

  return (
    <div>
      <h2 style={s.title}>📊 Cargar partido desde Excel</h2>
      <p style={s.hint}>
        Subí la planilla "Torneo Live Basketball". El sistema detecta automáticamente
        equipos, marcador por cuartos, % de tiro y estadísticas de cada jugadora.
      </p>

      {/* Meta */}
      <div style={s.metaRow}>
        <div style={s.metaGroup}>
          <label style={s.label}>N° de Fecha *</label>
          <input type="number" min="1" value={jornada}
            onChange={e => setJornada(e.target.value)}
            style={s.input} placeholder="1" />
        </div>
        <div style={s.metaGroup}>
          <label style={s.label}>Lugar (opcional)</label>
          <input type="text" value={lugar}
            onChange={e => setLugar(e.target.value)}
            style={s.input} placeholder="Club, cancha..." />
        </div>
      </div>

      {/* Drop zone */}
      {!published && (
        <div style={s.dropZone}
          onClick={() => fileRef.current.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFile(e); }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📁</div>
          <p style={{ color: '#EEF2F8', margin: 0 }}>
            {fileName || 'Arrastrá el Excel o hacé click para seleccionar'}
          </p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls"
            onChange={handleFile} style={{ display: 'none' }} />
        </div>
      )}

      {/* Errores */}
      {parsed?.errores?.length > 0 && (
        <div style={s.errBox}>
          {parsed.errores.map((e, i) => <p key={i} style={{ margin: '4px 0' }}>❌ {e}</p>)}
        </div>
      )}

      {/* Preview */}
      {parsed && parsed.errores.length === 0 && !published && (
        <>
          {/* Marcador */}
          <div style={s.marcadorCard}>
            {[
              { eq: parsed.equipoLocal, m: parsed.marcador.local },
              { eq: parsed.equipoVisit, m: parsed.marcador.visit },
            ].map(({ eq, m }, side) => (
              <div key={side} style={s.marcadorSide}>
                <div style={s.marcadorNombre}>{eq}</div>
                <div style={s.marcadorTotal}>{m.total}</div>
                <div style={s.parciales}>
                  {['q1','q2','q3','q4'].map(q => (
                    <span key={q} style={s.parcial}>{m[q]}</span>
                  ))}
                  {m.ot > 0 && <span style={s.parcial}>OT:{m.ot}</span>}
                </div>
              </div>
            ))}
            <div style={s.vs}>VS</div>
          </div>

          {/* % Tiro */}
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
              <p style={{ margin:'0 0 6px', fontWeight:600 }}>
                ⚠️ {parsed.warnings.length} jugadora(s) no encontradas — se ignorarán
              </p>
              {parsed.warnings.map((w,i) => <p key={i} style={{ margin:'2px 0', fontSize:13 }}>{w}</p>)}
            </div>
          )}

          {/* Resumen */}
          <div style={s.resumenRow}>
            <span style={{ color:'#22D07A', fontWeight:600 }}>
              ✅ {parsed.jugadoras.filter(j=>j.jugadora).length} jugadoras listas
            </span>
            {parsed.jugadoras.filter(j=>!j.jugadora).length > 0 && (
              <span style={{ color:'#F0B429', fontSize:13 }}>
                · {parsed.jugadoras.filter(j=>!j.jugadora).length} sin resolver
              </span>
            )}
          </div>

          {/* Tablas por equipo */}
          {[
            { label: parsed.equipoLocal, jugs: localJugs },
            { label: parsed.equipoVisit, jugs: visitJugs },
          ].map(({ label, jugs }) => (
            <div key={label} style={{ marginBottom: 28 }}>
              <div style={s.teamLabel}>{label}</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {['#','Nombre','PTS','VAL','SC/SF','DC/DF','TC/TF','AS','RD','RO','ROB','TAP','PÉR','FP'].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {jugs.map((j, i) => (
                      <tr key={i} style={{
                        background: i%2===0 ? '#0E1420':'#141C2A',
                        opacity: j.jugadora ? 1 : 0.4,
                      }}>
                        <td style={s.td}>{j.numero ?? '–'}</td>
                        <td style={{...s.td, textAlign:'left', color: j.jugadora ? '#EEF2F8':'#F04060', minWidth:130}}>
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
                        <td style={s.td}>{j.fp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div style={{ display:'flex', gap:12, marginTop:4 }}>
            <button onClick={handlePublish} disabled={loading || !jornada} style={{
              ...s.btnPublish, opacity: (!loading && jornada) ? 1 : 0.5
            }}>
              {loading ? 'Publicando...' : '🚀 PUBLICAR PARTIDO'}
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
            {parsed.equipoLocal} <strong style={{ color:'#F0B429' }}>{parsed.marcador.local.total}</strong>
            {' — '}
            <strong style={{ color:'#F0B429' }}>{parsed.marcador.visit.total}</strong> {parsed.equipoVisit}
          </p>
          <p style={{ color:'#6B7A99', margin:'0 0 20px', fontSize:13 }}>
            {parsed.jugadoras.filter(j=>j.jugadora).length} jugadoras · promedios actualizados · el sitio ya refleja los cambios
          </p>
          <button onClick={reset} style={s.btnCancel}>Cargar otro partido</button>
        </div>
      )}
    </div>
  );
}

const s = {
  title:    { color:'#F0B429', fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:1, marginBottom:8 },
  hint:     { color:'#6B7A99', fontSize:13, marginBottom:20, lineHeight:1.6 },
  metaRow:  { display:'flex', gap:16, marginBottom:20, flexWrap:'wrap' },
  metaGroup:{ display:'flex', flexDirection:'column', gap:6, flex:1, minWidth:140 },
  label:    { color:'#6B7A99', fontSize:11, letterSpacing:0.5, textTransform:'uppercase' },
  input:    { padding:'10px 12px', background:'#141C2A', border:'1px solid #1C2535', borderRadius:8, color:'#EEF2F8', fontSize:14, outline:'none' },
  dropZone: { border:'2px dashed #1C2535', borderRadius:12, padding:'2rem 1rem', textAlign:'center', cursor:'pointer', marginBottom:20 },
  errBox:   { background:'rgba(240,64,96,0.1)', border:'1px solid rgba(240,64,96,0.3)', borderRadius:8, padding:'12px 16px', marginBottom:16, color:'#F04060', fontSize:14 },
  warnBox:  { background:'rgba(240,180,41,0.08)', border:'1px solid rgba(240,180,41,0.25)', borderRadius:8, padding:'12px 16px', marginBottom:16, color:'#F0B429', fontSize:14 },
  marcadorCard: { background:'#0E1420', border:'1px solid #1C2535', borderRadius:12, padding:'1.5rem', display:'flex', alignItems:'center', justifyContent:'space-around', marginBottom:16, gap:16, flexWrap:'wrap' },
  marcadorSide: { flex:1, textAlign:'center', minWidth:120 },
  marcadorNombre: { fontFamily:"'Bebas Neue',sans-serif", fontSize:17, letterSpacing:1, color:'#EEF2F8', marginBottom:4 },
  marcadorTotal:  { fontFamily:"'Bebas Neue',sans-serif", fontSize:56, color:'#F0B429', lineHeight:1 },
  parciales: { display:'flex', gap:6, justifyContent:'center', marginTop:6, flexWrap:'wrap' },
  parcial:   { background:'#141C2A', padding:'2px 8px', borderRadius:4, fontSize:12, color:'#6B7A99' },
  vs:        { fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:'#4A566E', letterSpacing:2 },
  pctRow:    { display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' },
  pctCard:   { flex:1, minWidth:90, background:'#0E1420', border:'1px solid #1C2535', borderRadius:8, padding:'10px 12px', textAlign:'center' },
  pctLabel:  { color:'#6B7A99', fontSize:11, marginBottom:4, textTransform:'uppercase', letterSpacing:0.5 },
  pctVals:   { display:'flex', gap:8, justifyContent:'center', alignItems:'center', fontFamily:"'Bebas Neue',sans-serif", fontSize:18 },
  resumenRow:{ display:'flex', gap:12, alignItems:'center', marginBottom:16 },
  teamLabel: { fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:1, color:'#EEF2F8', marginBottom:10, paddingBottom:8, borderBottom:'1px solid #1C2535' },
  table:     { width:'100%', borderCollapse:'collapse', fontSize:13 },
  th:        { background:'#141C2A', color:'#6B7A99', padding:'8px 10px', textAlign:'center', fontSize:11, whiteSpace:'nowrap' },
  td:        { padding:'7px 10px', textAlign:'center', color:'#EEF2F8', borderBottom:'1px solid #1C2535' },
  btnPublish:{ flex:1, padding:'13px', background:'linear-gradient(135deg,#F0B429,#FF6B2B)', border:'none', borderRadius:10, color:'#080C12', fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:1, cursor:'pointer' },
  btnCancel: { padding:'10px 20px', background:'transparent', border:'1px solid #4A566E', borderRadius:8, color:'#6B7A99', cursor:'pointer', fontSize:14 },
  successBox:{ textAlign:'center', padding:'3rem 1rem', background:'rgba(34,208,122,0.05)', border:'1px solid rgba(34,208,122,0.2)', borderRadius:12 },
};
