import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import Fuse from 'fuse.js';
import { supabase } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';

// ─── Índice fuzzy — indexamos nombre completo + apellido + variantes ──────────
const TODAS_JUGADORAS = equiposFemenino.flatMap(eq =>
  eq.jugadoras.map(j => {
    const partes = j.nombre.trim().split(/\s+/);
    return {
      id:       j.id,
      nombre:   j.nombre,
      equipoId: eq.id,
      equipo:   eq.nombre,
      // Apellido = último token (formato "Nombre Apellido" o "Apellido Nombre")
      apellido:   partes[partes.length - 1],
      primerNombre: partes[0],
    };
  })
);

// Dos índices: uno por apellido (más específico) y uno por nombre completo
const fuseApellido = new Fuse(TODAS_JUGADORAS, {
  keys: ['apellido','primerNombre'],
  threshold: 0.35,
  minMatchCharLength: 2,
});
const fuseNombre = new Fuse(TODAS_JUGADORAS, {
  keys: ['nombre'],
  threshold: 0.4,
  minMatchCharLength: 2,
});
const fuseEq = new Fuse(equiposFemenino, { keys: ['nombre'], threshold: 0.4 });

function resolverJugadora(nombreRaw, equipoHint) {
  if (!nombreRaw) return null;
  const clean = String(nombreRaw).trim();

  // 1. Buscar por apellido dentro del equipo correcto
  const byApellido = fuseApellido.search(clean);
  if (equipoHint) {
    const hint = equipoHint.toLowerCase().split(/\s+/)[0];
    const enEq  = byApellido.filter(r => r.item.equipo.toLowerCase().includes(hint));
    if (enEq.length > 0) return { ...enEq[0].item, matchScore: enEq[0].score, matchMethod: 'apellido+equipo' };
  }
  if (byApellido.length > 0) return { ...byApellido[0].item, matchScore: byApellido[0].score, matchMethod: 'apellido' };

  // 2. Fallback: nombre completo
  const byNombre = fuseNombre.search(clean);
  if (equipoHint) {
    const hint = equipoHint.toLowerCase().split(/\s+/)[0];
    const enEq  = byNombre.filter(r => r.item.equipo.toLowerCase().includes(hint));
    if (enEq.length > 0) return { ...enEq[0].item, matchScore: enEq[0].score, matchMethod: 'nombre+equipo' };
  }
  return byNombre.length > 0 ? { ...byNombre[0].item, matchScore: byNombre[0].score, matchMethod: 'nombre' } : null;
}

// ─── Índices exactos de columnas (mapeados del Excel real Torneo Live Basketball)
const C = {
  equipo:0, partido:3, numero:6, nombre:9,
  sc:17, sf:20, dc:23, df:25, tc:27, tf:29,
  as_:31, rd:33, ro:35, fp:36, ft:38, fa:40,
  rb:44, tp:46, pe:47, ca:51, pts:52, val:55,
};
// Marcador: los cuartos son ACUMULADOS — hay que convertir a parciales
const M = { equipo:2, q1:7, q2acum:11, q3acum:12, q4acum:13, ot:14, total:16 };
const P = { equipo:2, simples:7, dobles:15, triples:24 };
const n = v => (typeof v === 'number' ? v : 0);

// Convierte cuartos acumulados a parciales
function acumAParcial(q1, q2acum, q3acum, q4acum) {
  return {
    q1: q1,
    q2: q2acum - q1,
    q3: q3acum - q2acum,
    q4: q4acum - q3acum,
  };
}

// ─── Parser principal ─────────────────────────────────────────────────────────
function parsearExcel(wb) {
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:null });

  const res = {
    equipoLocal:null, equipoVisit:null,
    marcador:{ local:{q1:0,q2:0,q3:0,q4:0,ot:0,total:0}, visit:{q1:0,q2:0,q3:0,q4:0,ot:0,total:0} },
    pct:{ local:{simples:0,dobles:0,triples:0}, visit:{simples:0,dobles:0,triples:0} },
    jugadoras:[], errores:[], warnings:[],
  };

  let marcRow=-1, statsRow=-1, pctRow=-1;
  for (let i=0; i<rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    if (r[M.equipo]==='Equipo' && String(r[M.q1]??'').includes('1')) marcRow=i;
    if (r[C.equipo]==='Equipo' && r[C.partido]==='Partido')           statsRow=i;
    if (r[P.equipo]==='Equipo' && String(r[P.simples]??'').includes('%')) pctRow=i;
  }

  if (marcRow===-1) { res.errores.push('No se encontró la sección de marcador.'); return res; }
  if (statsRow===-1){ res.errores.push('No se encontró la sección de estadísticas.'); return res; }

  // ── Marcador: convertir acumulados a parciales ──
  const rL=rows[marcRow+1], rV=rows[marcRow+2];
  if (rL) {
    res.equipoLocal = String(rL[M.equipo]??'').trim();
    const par = acumAParcial(n(rL[M.q1]), n(rL[M.q2acum]), n(rL[M.q3acum]), n(rL[M.q4acum]));
    res.marcador.local = { ...par, ot:n(rL[M.ot]), total:n(rL[M.total]) };
  }
  if (rV) {
    res.equipoVisit = String(rV[M.equipo]??'').trim();
    const par = acumAParcial(n(rV[M.q1]), n(rV[M.q2acum]), n(rV[M.q3acum]), n(rV[M.q4acum]));
    res.marcador.visit = { ...par, ot:n(rV[M.ot]), total:n(rV[M.total]) };
  }

  if (!res.equipoLocal || !res.equipoVisit) {
    res.errores.push('No se pudieron leer los nombres de los equipos.'); return res;
  }

  // Validar que parciales suman = total
  const sumaL = res.marcador.local.q1 + res.marcador.local.q2 + res.marcador.local.q3 + res.marcador.local.q4 + res.marcador.local.ot;
  const sumaV = res.marcador.visit.q1 + res.marcador.visit.q2 + res.marcador.visit.q3 + res.marcador.visit.q4 + res.marcador.visit.ot;
  if (res.marcador.local.total > 0 && sumaL !== res.marcador.local.total)
    res.warnings.push(`⚠️ Parciales local suman ${sumaL} pero el total es ${res.marcador.local.total}`);
  if (res.marcador.visit.total > 0 && sumaV !== res.marcador.visit.total)
    res.warnings.push(`⚠️ Parciales visitante suman ${sumaV} pero el total es ${res.marcador.visit.total}`);

  // ── Stats jugadoras ──
  let equipoActual = res.equipoLocal;
  for (let i=statsRow+1; i<rows.length; i++) {
    const r = rows[i];
    if (!r || r.every(v => v===null || v==='')) continue;

    // Detectar cambio de equipo (col 0 tiene nombre del equipo)
    if (r[C.equipo] && typeof r[C.equipo]==='string' && r[C.equipo].trim()) {
      const eq = r[C.equipo].trim();
      if (eq==='Equipo') break; // llegamos a la sección de % tiro
      if (eq===res.equipoLocal || eq===res.equipoVisit) equipoActual=eq;
    }

    // Skip fila de totales: col numero y col nombre son vacíos o string vacío
    const numero = r[C.numero];
    const nombre = r[C.nombre];
    const numStr = String(numero??'').trim();
    const nomStr = String(nombre??'').trim();
    if (nomStr==='' || nomStr==='null') continue;
    if (typeof nombre !== 'string' && nombre !== null && typeof nombre !== 'string') continue;
    if (!nombre) continue;

    // Resolver jugadora con doble fuzzy
    const jugadora = resolverJugadora(nomStr, equipoActual);
    if (!jugadora) {
      res.warnings.push(`"${nomStr}" (${equipoActual}) → no encontrada en el plantel`);
    } else if ((jugadora.matchScore ?? 0) > 0.25) {
      res.warnings.push(`"${nomStr}" → identificada como "${jugadora.nombre}" (confianza media, verificar)`);
    }

    // Validar PTS: SC*1 + DC*2 + TC*3
    const scv=n(r[C.sc]), dcv=n(r[C.dc]), tcv=n(r[C.tc]);
    const ptsCal = scv + dcv*2 + tcv*3;
    const ptsXls = n(r[C.pts]);
    const ptsOk  = ptsXls===0 || ptsCal===ptsXls;
    if (!ptsOk) res.warnings.push(`"${nomStr}": PTS planilla (${ptsXls}) ≠ calculado (${ptsCal})`);

    res.jugadoras.push({
      nombreRaw: nomStr, equipoRaw: equipoActual, jugadora,
      numero:    typeof numero==='number' ? numero : (parseInt(numStr)||null),
      sc:scv, sf:n(r[C.sf]), dc:dcv, df:n(r[C.df]),
      tc:tcv, tf:n(r[C.tf]), as_:n(r[C.as_]),
      rd:n(r[C.rd]), ro:n(r[C.ro]),
      fp:n(r[C.fp]), ft:n(r[C.ft]), fa:n(r[C.fa]),
      rb:n(r[C.rb]), tp:n(r[C.tp]), pe:n(r[C.pe]), ca:n(r[C.ca]),
      pts:ptsXls, val:n(r[C.val]), ptsOk,
    });
  }

  // ── % tiro ──
  if (pctRow!==-1) {
    const pL=rows[pctRow+1], pV=rows[pctRow+2];
    if (pL) res.pct.local  = { simples:n(pL[P.simples]),dobles:n(pL[P.dobles]),triples:n(pL[P.triples]) };
    if (pV) res.pct.visit  = { simples:n(pV[P.simples]),dobles:n(pV[P.dobles]),triples:n(pV[P.triples]) };
  }

  if (res.jugadoras.length===0) res.errores.push('No se encontraron jugadoras. Verificá la estructura del archivo.');
  return res;
}

// ─── Recalcular promedios acumulados ──────────────────────────────────────────
async function recalcularPromedios(jugadoraIds) {
  for (const jugId of [...new Set(jugadoraIds)]) {
    const { data, error } = await supabase
      .from('stats_partido_femenino')
      .select('pts,rd,ro,as_,rb,tp,pe,val,sc,sf,dc,df,tc,tf')
      .eq('jugadora_id', jugId);
    if (error || !data?.length) continue;
    const k   = data.length;
    const sum = key => data.reduce((a,r)=>a+(r[key]??0),0);
    const avg = key => +(sum(key)/k).toFixed(1);
    const tsc=sum('sc'),tsf=sum('sf'),tdc=sum('dc'),tdf=sum('df'),ttc=sum('tc'),ttf=sum('tf');
    await supabase.from('estadisticas_femenino').upsert({
      jugadora_id:jugId, pj:k,
      pts_prom:avg('pts'),
      reb_prom:+((sum('rd')+sum('ro'))/k).toFixed(1),
      ast_prom:avg('as_'), rob_prom:avg('rb'), tap_prom:avg('tp'),
      per_prom:avg('pe'),  val_prom:avg('val'),
      pct_simples: tsc+tsf>0 ? +((tsc/(tsc+tsf))*100).toFixed(1) : 0,
      pct_dobles:  tdc+tdf>0 ? +((tdc/(tdc+tdf))*100).toFixed(1) : 0,
      pct_triples: ttc+ttf>0 ? +((ttc/(ttc+ttf))*100).toFixed(1) : 0,
      pts_total:sum('pts'), reb_total:sum('rd')+sum('ro'), ast_total:sum('as_'),
      mejor_pts:Math.max(...data.map(r=>r.pts??0)),
      updated_at:new Date().toISOString(),
    }, { onConflict:'jugadora_id' });
  }
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function ExcelUpload() {
  const [step,       setStep]       = useState('archivo');
  const [parsed,     setParsed]     = useState(null);
  const [fileName,   setFileName]   = useState('');
  const [jornada,    setJornada]    = useState('');
  const [lugar,      setLugar]      = useState('');
  const [log,        setLog]        = useState([]);
  const [duplicate,  setDuplicate]  = useState(null); // info del partido duplicado
  const fileRef = useRef();

  const reset = () => { setStep('archivo'); setParsed(null); setFileName(''); setLog([]); setDuplicate(null); };
  const addLog = msg => setLog(l => [...l, msg]);

  const handleFile = e => {
    const file = (e.dataTransfer?.files ?? e.target.files)[0];
    if (!file) return;
    setFileName(file.name);
    setDuplicate(null);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const wb = XLSX.read(ev.target.result, { type:'binary' });
        const result = parsearExcel(wb);
        setParsed(result);
        if (result.errores.length === 0) setStep('preview');
      } catch(err) {
        setParsed({ errores:[`Error al leer el archivo: ${err.message}`], warnings:[], jugadoras:[], marcador:null, pct:null });
      }
    };
    reader.readAsBinaryString(file);
  };

  // ── Verificar duplicado antes de publicar ──
  const checkDuplicate = async (eqLId, eqVId, fechaNum) => {
    const { data } = await supabase
      .from('partidos_femenino')
      .select('id, fecha_id, estado, puntos_local, puntos_visit, fechas_femenino(numero)')
      .or(`and(equipo_local_id.eq.${eqLId},equipo_visit_id.eq.${eqVId}),and(equipo_local_id.eq.${eqVId},equipo_visit_id.eq.${eqLId})`)
      .eq('fechas_femenino.numero', fechaNum);  // join check

    // También chequear por fecha_id directamente
    const { data: fechaData } = await supabase
      .from('fechas_femenino')
      .select('id')
      .eq('numero', fechaNum)
      .single();

    if (fechaData) {
      const { data: dupes } = await supabase
        .from('partidos_femenino')
        .select('id, puntos_local, puntos_visit, estado')
        .eq('fecha_id', fechaData.id)
        .or(`and(equipo_local_id.eq.${eqLId},equipo_visit_id.eq.${eqVId}),and(equipo_local_id.eq.${eqVId},equipo_visit_id.eq.${eqLId})`);

      if (dupes?.length > 0) return dupes[0];
    }
    return null;
  };

  const handlePublish = async (forceOverwrite = false) => {
    if (!parsed || !jornada) { alert('Ingresá el número de fecha'); return; }
    setStep('publicando');
    setLog([]);

    try {
      // 1. Resolver equipos
      const mL = fuseEq.search(parsed.equipoLocal);
      const mV = fuseEq.search(parsed.equipoVisit);
      if (!mL.length) throw new Error(`Equipo local no encontrado: "${parsed.equipoLocal}"`);
      if (!mV.length) throw new Error(`Equipo visitante no encontrado: "${parsed.equipoVisit}"`);
      const eqLId = mL[0].item.id;
      const eqVId = mV[0].item.id;

      addLog(`✅ Equipos: ${mL[0].item.nombre} vs ${mV[0].item.nombre}`);

      // 2. Verificar duplicado
      if (!forceOverwrite) {
        addLog('🔍 Verificando si el partido ya fue cargado...');
        const dupe = await checkDuplicate(eqLId, eqVId, Number(jornada));
        if (dupe) {
          setDuplicate(dupe);
          setStep('duplicado');
          return;
        }
        addLog('✅ Sin duplicados');
      } else {
        // Eliminar partido anterior si se está sobreescribiendo
        addLog('🗑️ Eliminando partido anterior...');
        const dupe = await checkDuplicate(eqLId, eqVId, Number(jornada));
        if (dupe) {
          await supabase.from('partidos_femenino').delete().eq('id', dupe.id);
          addLog(`✅ Partido anterior (ID ${dupe.id}) eliminado`);
        }
      }

      // 3. Upsert fecha
      addLog('📅 Creando/actualizando fecha...');
      const { data:fd, error:fErr } = await supabase
        .from('fechas_femenino')
        .upsert({ numero:Number(jornada), descripcion:`Fecha ${jornada}` }, { onConflict:'numero' })
        .select('id').single();
      if (fErr) throw new Error(`Fecha: ${fErr.message}`);
      addLog(`✅ Fecha ${jornada} (ID ${fd.id})`);

      // 4. Insertar partido
      addLog('🏀 Insertando partido...');
      const m=parsed.marcador, p=parsed.pct;
      const { data:pd, error:pErr } = await supabase
        .from('partidos_femenino')
        .insert({
          fecha_id:fd.id, equipo_local_id:eqLId, equipo_visit_id:eqVId,
          q1_local:m.local.q1, q2_local:m.local.q2, q3_local:m.local.q3,
          q4_local:m.local.q4, ot_local:m.local.ot,
          q1_visit:m.visit.q1, q2_visit:m.visit.q2, q3_visit:m.visit.q3,
          q4_visit:m.visit.q4, ot_visit:m.visit.ot,
          pct_simples_local:p.local.simples, pct_dobles_local:p.local.dobles, pct_triples_local:p.local.triples,
          pct_simples_visit:p.visit.simples, pct_dobles_visit:p.visit.dobles, pct_triples_visit:p.visit.triples,
          lugar:lugar||null, estado:'finalizado',
        })
        .select('id').single();
      if (pErr) throw new Error(`Partido: ${pErr.message}`);
      addLog(`✅ Partido ID ${pd.id} — ${m.local.total}-${m.visit.total}`);
      addLog(`   Parciales L: ${m.local.q1}-${m.local.q2}-${m.local.q3}-${m.local.q4}`);
      addLog(`   Parciales V: ${m.visit.q1}-${m.visit.q2}-${m.visit.q3}-${m.visit.q4}`);

      // 5. Stats jugadoras
      const jugOk   = parsed.jugadoras.filter(j=>j.jugadora);
      const jugSkip = parsed.jugadoras.filter(j=>!j.jugadora);
      addLog(`📊 Insertando stats de ${jugOk.length} jugadoras${jugSkip.length>0?` (${jugSkip.length} ignoradas)`:''}...`);

      if (jugOk.length > 0) {
        const statsRows = jugOk.map(j=>({
          partido_id:pd.id, jugadora_id:j.jugadora.id, equipo_id:j.jugadora.equipoId,
          numero:j.numero, sc:j.sc, sf:j.sf, dc:j.dc, df:j.df,
          tc:j.tc, tf:j.tf, as_:j.as_,
          rd:j.rd, ro:j.ro, fp:j.fp, ft:j.ft, fa:j.fa,
          rb:j.rb, tp:j.tp, pe:j.pe, ca:j.ca, pts:j.pts, val:j.val,
        }));
        const { error:sErr } = await supabase
          .from('stats_partido_femenino')
          .upsert(statsRows, { onConflict:'partido_id,jugadora_id' });
        if (sErr) throw new Error(`Stats: ${sErr.message}`);

        // MVP: jugadora con mayor VAL
        const mvp = statsRows.reduce((best,r) => !best||r.val>best.val ? r : best, null);
        if (mvp) {
          await supabase.from('partidos_femenino').update({ mvp_jugadora_id:mvp.jugadora_id }).eq('id',pd.id);
          const mvpNombre = jugOk.find(j=>j.jugadora?.id===mvp.jugadora_id)?.jugadora?.nombre??'';
          addLog(`⭐ MVP: ${mvpNombre} (VAL ${mvp.val})`);
        }

        addLog('🔄 Recalculando promedios acumulados...');
        await recalcularPromedios(statsRows.map(r=>r.jugadora_id));
        addLog('✅ Promedios actualizados');
      }

      // 6. Log de carga
      await supabase.from('upload_log').insert({
        fecha_id:fd.id, partido_id:pd.id, archivo_nombre:fileName,
        equipo_local:parsed.equipoLocal, equipo_visit:parsed.equipoVisit,
        jugadoras_ok:jugOk.length, jugadoras_skip:jugSkip.length,
        warnings:parsed.warnings,
      });

      addLog('🎉 ¡Todo listo! El sitio ya se actualizó automáticamente.');
      setStep('listo');
    } catch(err) {
      addLog(`❌ ERROR: ${err.message}`);
      console.error(err);
      setStep('preview');
    }
  };

  const localJugs = parsed?.jugadoras.filter(j=>j.equipoRaw===parsed?.equipoLocal) ?? [];
  const visitJugs = parsed?.jugadoras.filter(j=>j.equipoRaw===parsed?.equipoVisit) ?? [];

  return (
    <div>
      <h2 style={s.title}>📊 Cargar partido desde Excel</h2>

      {/* Stepper */}
      <div style={s.stepper}>
        {[['1','Archivo'],['2','Preview'],['3','Publicar'],['4','Listo']].map(([num,lbl],i)=>{
          const stepArr=['archivo','preview','publicando','listo'];
          const cur=stepArr.indexOf(step==='duplicado'?'publicando':step);
          const done=i<cur, active=i===cur;
          return (
            <div key={num} style={s.stepWrap}>
              <div style={{...s.stepDot,background:done?'#22D07A':active?'#F0B429':'#1C2535',color:done||active?'#080C12':'#4A566E'}}>
                {done?'✓':num}
              </div>
              <div style={{color:active?'#F0B429':done?'#22D07A':'#4A566E',fontSize:12}}>{lbl}</div>
              {i<3&&<div style={{...s.stepLine,background:done?'#22D07A':'#1C2535'}}/>}
            </div>
          );
        })}
      </div>

      {/* PASO 1: Archivo */}
      {step==='archivo' && (
        <>
          <div style={s.metaRow}>
            <div style={s.metaGroup}>
              <label style={s.label}>N° de Fecha *</label>
              <input type="number" min="1" value={jornada} onChange={e=>setJornada(e.target.value)} style={s.input} placeholder="1"/>
            </div>
            <div style={s.metaGroup}>
              <label style={s.label}>Lugar (opcional)</label>
              <input type="text" value={lugar} onChange={e=>setLugar(e.target.value)} style={s.input} placeholder="Club, cancha..."/>
            </div>
          </div>
          <div style={s.dropZone} onClick={()=>fileRef.current.click()}
            onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();handleFile(e);}}>
            <div style={{fontSize:48,marginBottom:8}}>📁</div>
            <p style={{color:'#EEF2F8',margin:0,fontSize:16}}>
              {fileName||'Arrastrá el Excel o hacé click para seleccionar'}
            </p>
            <p style={{color:'#4A566E',fontSize:12,marginTop:6}}>Planilla Torneo Live Basketball (.xlsx)</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{display:'none'}}/>
          </div>
          {parsed?.errores?.length>0&&(
            <div style={s.errBox}>
              {parsed.errores.map((e,i)=><p key={i} style={{margin:'4px 0'}}>❌ {e}</p>)}
            </div>
          )}
        </>
      )}

      {/* PASO 2: Preview */}
      {step==='preview' && parsed && (
        <>
          {/* Marcador */}
          <div style={s.marcadorCard}>
            {[{label:parsed.equipoLocal,m:parsed.marcador.local},{label:parsed.equipoVisit,m:parsed.marcador.visit}].map(({label,m},i)=>(
              <div key={i} style={s.marcSide}>
                <div style={s.marcNombre}>{label}</div>
                <div style={s.marcTotal}>{m.total}</div>
                <div style={s.parciales}>
                  {['q1','q2','q3','q4'].map(q=>(
                    <span key={q} style={s.parcial}>
                      <span style={{color:'#4A566E',fontSize:9}}>{q.toUpperCase()} </span>{m[q]}
                    </span>
                  ))}
                  {m.ot>0&&<span style={s.parcial}><span style={{color:'#4A566E',fontSize:9}}>OT </span>{m.ot}</span>}
                </div>
              </div>
            ))}
            <div style={s.vs}>VS</div>
          </div>

          {/* % tiro */}
          <div style={s.pctRow}>
            {[{l:'% TL',k:'simples',c:'#22D07A'},{l:'% 2P',k:'dobles',c:'#F0B429'},{l:'% 3P',k:'triples',c:'#60A5FA'}].map(t=>(
              <div key={t.k} style={s.pctCard}>
                <div style={{color:'#6B7A99',fontSize:11,marginBottom:4,textTransform:'uppercase',letterSpacing:.5}}>{t.l}</div>
                <div style={{display:'flex',gap:8,justifyContent:'center',alignItems:'center',fontFamily:"'Bebas Neue',sans-serif",fontSize:20}}>
                  <span style={{color:'#F0B429'}}>{parsed.pct.local[t.k]}%</span>
                  <span style={{color:'#4A566E',fontSize:10}}>vs</span>
                  <span style={{color:'#60A5FA'}}>{parsed.pct.visit[t.k]}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Warnings */}
          {parsed.warnings.length>0&&(
            <div style={s.warnBox}>
              <p style={{margin:'0 0 6px',fontWeight:600}}>⚠️ {parsed.warnings.length} advertencia(s)</p>
              {parsed.warnings.map((w,i)=><p key={i} style={{margin:'2px 0',fontSize:13}}>{w}</p>)}
            </div>
          )}

          {/* Resumen */}
          <div style={{display:'flex',gap:16,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
            <span style={{color:'#22D07A',fontWeight:600}}>✅ {parsed.jugadoras.filter(j=>j.jugadora).length} jugadoras OK</span>
            {parsed.jugadoras.filter(j=>!j.jugadora).length>0&&(
              <span style={{color:'#F04060'}}>❌ {parsed.jugadoras.filter(j=>!j.jugadora).length} sin resolver</span>
            )}
            {parsed.jugadoras.filter(j=>!j.ptsOk).length>0&&(
              <span style={{color:'#F0B429'}}>⚡ {parsed.jugadoras.filter(j=>!j.ptsOk).length} PTS inconsistente</span>
            )}
          </div>

          {/* Tablas */}
          {[{label:parsed.equipoLocal,jugs:localJugs},{label:parsed.equipoVisit,jugs:visitJugs}].map(({label,jugs})=>(
            <div key={label} style={{marginBottom:28}}>
              <div style={s.teamLabel}>{label} <span style={{color:'#4A566E',fontSize:13,fontFamily:'Barlow Condensed'}}>{jugs.length} jugadoras</span></div>
              <div style={{overflowX:'auto'}}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {['#','Nombre (plantel)','PTS','VAL','TL C/F','2P C/F','3P C/F','AS','RD','RO','ROB','TAP','PÉR','FP'].map(h=>(
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {jugs.map((j,i)=>(
                      <tr key={i} style={{background:i%2===0?'#0E1420':'#141C2A',opacity:j.jugadora?1:0.45}}>
                        <td style={s.td}>{j.numero??'–'}</td>
                        <td style={{...s.td,textAlign:'left',minWidth:160}}>
                          <div style={{color:j.jugadora?(j.ptsOk?'#EEF2F8':'#FCD34D'):'#F04060',fontWeight:600,fontSize:13}}>
                            {j.jugadora?j.jugadora.nombre:`❌ ${j.nombreRaw}`}
                          </div>
                          <div style={{color:'#4A566E',fontSize:11}}>{j.nombreRaw}</div>
                        </td>
                        <td style={{...s.td,color:'#F0B429',fontWeight:700}}>{j.pts}</td>
                        <td style={{...s.td,color:j.val>=0?'#22D07A':'#F04060'}}>{j.val}</td>
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

          <div style={{display:'flex',gap:12,marginTop:8}}>
            <button onClick={()=>handlePublish(false)} disabled={!jornada}
              style={{...s.btnPublish,opacity:jornada?1:0.5}}>
              🚀 PUBLICAR PARTIDO
            </button>
            <button onClick={reset} style={s.btnCancel}>← Volver</button>
          </div>
        </>
      )}

      {/* PASO DUPLICADO — aviso antes de sobreescribir */}
      {step==='duplicado' && duplicate && (
        <div style={s.dupeBox}>
          <div style={{fontSize:48,marginBottom:12}}>⚠️</div>
          <h3 style={{color:'#F0B429',margin:'0 0 12px',fontFamily:"'Bebas Neue',sans-serif",fontSize:24}}>
            PARTIDO YA CARGADO
          </h3>
          <p style={{color:'#EEF2F8',marginBottom:8}}>
            Ya existe un partido entre estos equipos en la Fecha {jornada}:
          </p>
          <div style={{background:'#141C2A',border:'1px solid #1C2535',borderRadius:8,padding:'12px 16px',marginBottom:24,textAlign:'center'}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:'#F0B429'}}>
              {duplicate.puntos_local} — {duplicate.puntos_visit}
            </div>
            <div style={{color:'#6B7A99',fontSize:12,marginTop:4}}>ID Partido: {duplicate.id} · Estado: {duplicate.estado}</div>
          </div>
          <p style={{color:'#F04060',fontSize:13,marginBottom:20}}>
            Si continuás, el partido anterior y todas sus estadísticas serán eliminados y reemplazados.
          </p>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            <button onClick={()=>handlePublish(true)} style={{...s.btnPublish,background:'linear-gradient(135deg,#F04060,#B91C1C)',maxWidth:240}}>
              🗑️ SOBREESCRIBIR
            </button>
            <button onClick={()=>setStep('preview')} style={s.btnCancel}>
              ← Volver al preview
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: Publicando */}
      {step==='publicando' && (
        <div style={s.logBox}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:'#F0B429',marginBottom:16,letterSpacing:1}}>
            Publicando partido...
          </div>
          {log.map((l,i)=>(
            <div key={i} style={{padding:'3px 0',fontSize:13,fontFamily:'Barlow Condensed',
              color:l.startsWith('❌')?'#F04060':l.startsWith('✅')||l.startsWith('🎉')||l.startsWith('⭐')?'#22D07A':l.startsWith('⚠️')?'#F0B429':'#EEF2F8'}}>
              {l}
            </div>
          ))}
          <div style={{marginTop:16,color:'#4A566E',fontSize:12}}>Por favor no cerrés esta ventana...</div>
        </div>
      )}

      {/* PASO 4: Listo */}
      {step==='listo' && parsed && (
        <div style={s.successBox}>
          <div style={{fontSize:56,marginBottom:12}}>🎉</div>
          <h3 style={{color:'#22D07A',margin:'0 0 8px',fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:1}}>
            ¡PARTIDO PUBLICADO!
          </h3>
          <p style={{color:'#EEF2F8',margin:'0 0 4px',fontSize:18}}>
            {parsed.equipoLocal} <strong style={{color:'#F0B429'}}>{parsed.marcador.local.total}</strong>
            {' — '}
            <strong style={{color:'#F0B429'}}>{parsed.marcador.visit.total}</strong> {parsed.equipoVisit}
          </p>
          <div style={{display:'flex',gap:8,justifyContent:'center',margin:'8px 0 4px',flexWrap:'wrap'}}>
            {['q1','q2','q3','q4'].map(q=>(
              <span key={q} style={{background:'#141C2A',padding:'2px 10px',borderRadius:4,fontSize:13,color:'#6B7A99',fontFamily:"'Barlow Condensed'"}}>
                {q.toUpperCase()} {parsed.marcador.local[q]}-{parsed.marcador.visit[q]}
              </span>
            ))}
          </div>
          <p style={{color:'#6B7A99',margin:'8px 0 24px',fontSize:13}}>
            {parsed.jugadoras.filter(j=>j.jugadora).length} jugadoras · promedios actualizados · sitio actualizado en tiempo real
          </p>
          {log.filter(l=>l.startsWith('⭐')).map((l,i)=>(
            <div key={i} style={{color:'#F0B429',fontSize:14,marginBottom:16}}>{l}</div>
          ))}
          <button onClick={reset} style={{...s.btnPublish,maxWidth:260}}>+ Cargar otro partido</button>
        </div>
      )}
    </div>
  );
}

const s = {
  title:     {color:'#F0B429',fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1,marginBottom:20},
  stepper:   {display:'flex',alignItems:'center',marginBottom:28,gap:0},
  stepWrap:  {display:'flex',alignItems:'center',gap:6,flex:1},
  stepDot:   {width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0},
  stepLine:  {flex:1,height:2,borderRadius:1},
  metaRow:   {display:'flex',gap:16,marginBottom:20,flexWrap:'wrap'},
  metaGroup: {display:'flex',flexDirection:'column',gap:6,flex:1,minWidth:140},
  label:     {color:'#6B7A99',fontSize:11,letterSpacing:.5,textTransform:'uppercase'},
  input:     {padding:'10px 12px',background:'#141C2A',border:'1px solid #1C2535',borderRadius:8,color:'#EEF2F8',fontSize:14,outline:'none'},
  dropZone:  {border:'2px dashed #1C2535',borderRadius:12,padding:'2.5rem 1rem',textAlign:'center',cursor:'pointer',marginBottom:20},
  errBox:    {background:'rgba(240,64,96,.1)',border:'1px solid rgba(240,64,96,.3)',borderRadius:8,padding:'12px 16px',marginBottom:16,color:'#F04060',fontSize:14},
  warnBox:   {background:'rgba(240,180,41,.08)',border:'1px solid rgba(240,180,41,.25)',borderRadius:8,padding:'12px 16px',marginBottom:16,color:'#F0B429',fontSize:14},
  marcadorCard:{background:'#0E1420',border:'1px solid #1C2535',borderRadius:12,padding:'1.5rem',display:'flex',alignItems:'center',justifyContent:'space-around',marginBottom:16,gap:16,flexWrap:'wrap'},
  marcSide:  {flex:1,textAlign:'center',minWidth:120},
  marcNombre:{fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:1,color:'#EEF2F8',marginBottom:4},
  marcTotal: {fontFamily:"'Bebas Neue',sans-serif",fontSize:60,color:'#F0B429',lineHeight:1},
  parciales: {display:'flex',gap:6,justifyContent:'center',marginTop:6,flexWrap:'wrap'},
  parcial:   {background:'#141C2A',padding:'3px 8px',borderRadius:4,fontSize:13,color:'#EEF2F8'},
  vs:        {fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:'#4A566E',letterSpacing:2},
  pctRow:    {display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'},
  pctCard:   {flex:1,minWidth:90,background:'#0E1420',border:'1px solid #1C2535',borderRadius:8,padding:'10px 12px',textAlign:'center'},
  teamLabel: {fontFamily:"'Bebas Neue',sans-serif",fontSize:19,letterSpacing:1,color:'#EEF2F8',marginBottom:10,paddingBottom:8,borderBottom:'1px solid #1C2535'},
  table:     {width:'100%',borderCollapse:'collapse',fontSize:13},
  th:        {background:'#141C2A',color:'#6B7A99',padding:'8px 10px',textAlign:'center',fontSize:11,whiteSpace:'nowrap'},
  td:        {padding:'7px 10px',textAlign:'center',color:'#EEF2F8',borderBottom:'1px solid #1C2535'},
  btnPublish:{flex:1,maxWidth:280,padding:'13px',background:'linear-gradient(135deg,#F0B429,#FF6B2B)',border:'none',borderRadius:10,color:'#080C12',fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:1,cursor:'pointer'},
  btnCancel: {padding:'10px 20px',background:'transparent',border:'1px solid #4A566E',borderRadius:8,color:'#6B7A99',cursor:'pointer',fontSize:14},
  logBox:    {background:'#0E1420',border:'1px solid #1C2535',borderRadius:12,padding:'1.5rem',minHeight:200},
  successBox:{textAlign:'center',padding:'3rem 1rem',background:'rgba(34,208,122,.05)',border:'1px solid rgba(34,208,122,.2)',borderRadius:12},
  dupeBox:   {textAlign:'center',padding:'2.5rem 1.5rem',background:'rgba(240,180,41,.05)',border:'1px solid rgba(240,180,41,.2)',borderRadius:12},
};
