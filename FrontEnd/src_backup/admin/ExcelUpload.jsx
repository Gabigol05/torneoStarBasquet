import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Fuse from 'fuse.js';
import { supabase } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';

// ─── Índice de equipos para fuzzy matching ────────────────────────────────────
const EQUIPOS_FLAT = equiposFemenino.map(e => ({
  id: e.id,
  nombre: e.name ?? e.nombre,
  jugadoras: e.jugadoras,
}));

const fuseEq = new Fuse(EQUIPOS_FLAT, {
  keys: ['nombre'],
  threshold: 0.4,
  includeScore: true,
});

// Cache de aliases (se carga una vez por sesión)
let aliasesCache = null;
async function getAliases() {
  if (aliasesCache) return aliasesCache;
  const { data } = await supabase.from('nombre_aliases').select('*');
  aliasesCache = data ?? [];
  return aliasesCache;
}

async function guardarAlias(nombreRaw, jugadoraId, equipoId) {
  await supabase.from('nombre_aliases').upsert(
    { nombre_raw: nombreRaw.toLowerCase().trim(), jugadora_id: jugadoraId, equipo_id: equipoId },
    { onConflict: 'nombre_raw' }
  );
  aliasesCache = null; // invalidar cache
}

// ─── Resolver jugadora por nombre ─────────────────────────────────────────────
async function resolverJugadora(nombreRaw, equipoRaw, numero) {
  const aliases = await getAliases();

  // 1. Buscar alias exacto
  const alias = aliases.find(a => a.nombre_raw === nombreRaw.toLowerCase().trim());
  if (alias) {
    const eq = EQUIPOS_FLAT.find(e => e.id === alias.equipo_id);
    const jug = eq?.jugadoras?.find(j => j.id === alias.jugadora_id);
    if (jug) return { jugadora: { ...jug, equipoId: eq.id }, method: 'alias', score: 0 };
  }

  // 2. Encontrar equipo
  const eqMatches = fuseEq.search(equipoRaw ?? '');
  const equipo = eqMatches[0]?.item;
  if (!equipo?.jugadoras?.length) return { jugadora: null, method: null, score: 1 };

  // 3. Fuzzy en el equipo encontrado
  const fuseJug = new Fuse(equipo.jugadoras, {
    keys: ['nombre'],
    threshold: 0.45,
    includeScore: true,
  });

  const partes = nombreRaw.trim().split(/\s+/);
  // Buscar por apellido (última palabra) primero, luego nombre completo
  let best = null;
  for (const parte of partes) {
    const res = fuseJug.search(parte);
    if (res[0] && (!best || res[0].score < best.score)) {
      best = res[0];
    }
  }
  const resCompleto = fuseJug.search(nombreRaw);
  if (resCompleto[0] && (!best || resCompleto[0].score < best.score)) {
    best = resCompleto[0];
  }

  if (!best || best.score > 0.45) return { jugadora: null, method: null, score: 1 };
  return {
    jugadora: { ...best.item, equipoId: equipo.id },
    method: 'fuzzy',
    score: best.score,
  };
}

// ─── Parser del Excel ─────────────────────────────────────────────────────────
const C = {
  nombre: 1, numero: 0,
  sc: 2, sf: 3, dc: 4, df: 5, tc: 6, tf: 7,
  as_: 8, rd: 9, ro: 10,
  fp: 11, ft: 12, fa: 13,
  rb: 14, tp: 15, pe: 16, ca: 17,
  pts: 18, val: 19,
};
const P = { simples: 2, dobles: 4, triples: 6 };

function n(v) {
  if (v === null || v === undefined || v === '') return 0;
  const parsed = Number(v);
  return isNaN(parsed) ? 0 : parsed;
}

function parsearExcel(wb) {
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows  = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  const res = {
    equipoLocal: '', equipoVisit: '',
    marcador: {
      local: { q1: 0, q2: 0, q3: 0, q4: 0, ot: 0, total: 0 },
      visit: { q1: 0, q2: 0, q3: 0, q4: 0, ot: 0, total: 0 },
    },
    pct: {
      local: { simples: 0, dobles: 0, triples: 0 },
      visit: { simples: 0, dobles: 0, triples: 0 },
    },
    jugadorasBruto: [],
    errores: [],
    warnings: [],
  };

  let equipoActual = '';
  let pctRow = -1;
  let scoreRows = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const cell0 = String(row[0] ?? '').trim();
    const cell1 = String(row[1] ?? '').trim();

    // Detectar nombre de equipo
    if (cell0 && !cell1 && row.slice(2).every(c => !c)) {
      if (!res.equipoLocal) { res.equipoLocal = cell0; equipoActual = cell0; continue; }
      if (!res.equipoVisit && cell0 !== res.equipoLocal) { res.equipoVisit = cell0; equipoActual = cell0; continue; }
    }

    // Detectar fila de parciales (Q1 Q2 Q3 Q4)
    const rowStr = row.map(c => String(c ?? '').toUpperCase()).join(',');
    if (rowStr.includes('Q1') && rowStr.includes('Q2') && rowStr.includes('Q3')) continue;

    // Detectar fila de marcador (números en posiciones de cuartos)
    if (equipoActual && row[1] != null && !isNaN(Number(row[1])) && !isNaN(Number(row[2]))) {
      const side = equipoActual === res.equipoLocal ? 'local' : 'visit';
      if (!scoreRows[side]) {
        const acum = [row[1],row[2],row[3],row[4]].map(Number);
        // Detectar si son acumulados o parciales
        const isAcum = acum[1] >= acum[0] && acum[2] >= acum[1] && acum[3] >= acum[2];
        if (isAcum) {
          res.marcador[side].q1 = acum[0];
          res.marcador[side].q2 = acum[1] - acum[0];
          res.marcador[side].q3 = acum[2] - acum[1];
          res.marcador[side].q4 = n(row[5]) - acum[2]; // row[5] podría ser total
          // Si hay OT
          if (row[5] && !isNaN(Number(row[5])) && Number(row[5]) > acum[3]) {
            res.marcador[side].q4 = acum[3] - acum[2];
            res.marcador[side].ot = Number(row[5]) - acum[3];
          }
        } else {
          res.marcador[side].q1 = acum[0];
          res.marcador[side].q2 = acum[1];
          res.marcador[side].q3 = acum[2];
          res.marcador[side].q4 = acum[3];
          res.marcador[side].ot = n(row[5]);
        }
        res.marcador[side].total = res.marcador[side].q1 + res.marcador[side].q2 + res.marcador[side].q3 + res.marcador[side].q4 + res.marcador[side].ot;
        scoreRows[side] = true;
      }
    }

    // Detectar fila de porcentajes
    if (rowStr.includes('TL') || rowStr.includes('SIMPLES') || rowStr.includes('%')) {
      pctRow = i;
      continue;
    }

    // Jugadoras
    const nombre = row[C.nombre];
    const numero = row[C.numero];
    const nomStr = String(nombre ?? '').trim();
    if (!nomStr || nomStr === 'null' || typeof nombre === 'number') continue;
    if (nomStr.toUpperCase().includes('JUGADORA') || nomStr.toUpperCase().includes('NOMBRE')) continue;

    const numParsed = typeof numero === 'number' ? numero : (parseInt(String(numero ?? '')) || null);
    const ptsCal   = n(row[C.sc]) + n(row[C.dc]) * 2 + n(row[C.tc]) * 3;
    const ptsXls   = n(row[C.pts]);

    if (ptsXls > 0 && ptsCal !== ptsXls) {
      res.warnings.push(`${nomStr}: PTS en planilla (${ptsXls}) ≠ PTS calculado (${ptsCal}). Se usa el calculado.`);
    }

    res.jugadorasBruto.push({
      nombreRaw: nomStr, equipoRaw: equipoActual,
      numero: numParsed,
      sc: n(row[C.sc]),  sf: n(row[C.sf]),
      dc: n(row[C.dc]),  df: n(row[C.df]),
      tc: n(row[C.tc]),  tf: n(row[C.tf]),
      as_: n(row[C.as_]),
      rd: n(row[C.rd]),  ro: n(row[C.ro]),
      fp: n(row[C.fp]),  ft: n(row[C.ft]), fa: n(row[C.fa]),
      rb: n(row[C.rb]),  tp: n(row[C.tp]), pe: n(row[C.pe]), ca: n(row[C.ca]),
      pts: ptsCal, // siempre usar el calculado
      val: n(row[C.val]),
    });
  }

  // Porcentajes
  if (pctRow !== -1) {
    const pL = rows[pctRow + 1], pV = rows[pctRow + 2];
    if (pL) res.pct.local = { simples: n(pL[P.simples]), dobles: n(pL[P.dobles]), triples: n(pL[P.triples]) };
    if (pV) res.pct.visit = { simples: n(pV[P.simples]), dobles: n(pV[P.dobles]), triples: n(pV[P.triples]) };
  }

  if (!res.equipoLocal) res.errores.push('No se detectó el equipo local.');
  if (!res.equipoVisit) res.errores.push('No se detectó el equipo visitante.');
  if (res.jugadorasBruto.length === 0) res.errores.push('No se encontraron jugadoras.');
  if (res.marcador.local.total === 0 && res.marcador.visit.total === 0) {
    res.warnings.push('No se detectaron parciales. El marcador quedará en 0-0.');
  }

  return res;
}

// ─── Recalcular promedios COMPLETO (incluye campos de tiros) ─────────────────
async function recalcularPromedios(jugadoraIds) {
  for (const jugId of [...new Set(jugadoraIds)]) {
    const { data } = await supabase
      .from('stats_partido_femenino')
      .select('pts,rd,ro,as_,rb,tp,pe,val,sc,sf,dc,df,tc,tf')
      .eq('jugadora_id', jugId);
    if (!data?.length) continue;

    const k   = data.length;
    const sum = key => data.reduce((a, r) => a + (r[key] ?? 0), 0);
    const avg = key => +(sum(key) / k).toFixed(1);
    const tsc = sum('sc'), tsf = sum('sf');
    const tdc = sum('dc'), tdf = sum('df');
    const ttc = sum('tc'), ttf = sum('tf');
    const trd = sum('rd'), tro = sum('ro');

    // Verificar si ya existe para hacer PATCH o INSERT
    const { data: existing } = await supabase
      .from('estadisticas_femenino')
      .select('id')
      .eq('jugadora_id', jugId)
      .maybeSingle();

    const payload = {
      jugadora_id:  jugId,
      pj:           k,
      pts_prom:     avg('pts'),
      reb_prom:     +((trd + tro) / k).toFixed(1),
      ast_prom:     avg('as_'),
      rob_prom:     avg('rb'),
      tap_prom:     avg('tp'),
      per_prom:     avg('pe'),
      val_prom:     avg('val'),
      pct_simples:  tsc + tsf > 0 ? +((tsc / (tsc + tsf)) * 100).toFixed(1) : 0,
      pct_dobles:   tdc + tdf > 0 ? +((tdc / (tdc + tdf)) * 100).toFixed(1) : 0,
      pct_triples:  ttc + ttf > 0 ? +((ttc / (ttc + ttf)) * 100).toFixed(1) : 0,
      pts_total:    sum('pts'),
      reb_total:    trd + tro,
      ast_total:    sum('as_'),
      mejor_pts:    Math.max(...data.map(r => r.pts ?? 0)),
      // ── Campos de tiros (CRÍTICO — faltaban en v1) ──
      sc_total: tsc, sf_total: tsf,
      dc_total: tdc, df_total: tdf,
      tc_total: ttc, tf_total: ttf,
      sc_prom:  +(tsc / k).toFixed(1),
      dc_prom:  +(tdc / k).toFixed(1),
      tc_prom:  +(ttc / k).toFixed(1),
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase.from('estadisticas_femenino').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('estadisticas_femenino').insert(payload);
    }
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ExcelUpload() {
  const [step,      setStep]      = useState('archivo');
  const [parsed,    setParsed]    = useState(null);
  const [jugadoras, setJugadoras] = useState([]);
  const [resolving, setResolving] = useState(false);
  const [fileName,  setFileName]  = useState('');
  const [jornada,   setJornada]   = useState('');
  const [lugar,     setLugar]     = useState('');
  const [mvpManual, setMvpManual] = useState(''); // MVP seleccionado manualmente
  const [log,       setLog]       = useState([]);
  const [duplicate, setDuplicate] = useState(null);
  const [dragging,  setDragging]  = useState(false);
  const fileRef = useRef();

  const reset = () => {
    setStep('archivo'); setParsed(null); setJugadoras([]);
    setFileName(''); setLog([]); setDuplicate(null);
    setMvpManual(''); aliasesCache = null;
  };

  const addLog = msg => setLog(l => [...l, msg]);

  const handleFile = async (file) => {
    if (!file) return;
    reset();
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const wb     = XLSX.read(ev.target.result, { type: 'binary' });
        const result = parsearExcel(wb);

        if (result.errores.length > 0) {
          setParsed(result);
          return;
        }

        setResolving(true);
        const resolved = [];
        for (const j of result.jugadorasBruto) {
          const { jugadora, method, score } = await resolverJugadora(j.nombreRaw, j.equipoRaw, j.numero);
          resolved.push({ ...j, jugadora, matchMethod: method, matchScore: score });
        }

        setParsed({ ...result, jugadoras: resolved });
        setJugadoras(resolved);
        setResolving(false);
        setStep('preview');
      } catch (err) {
        setParsed({ errores: [`Error al leer el archivo: ${err.message}`], warnings: [], jugadorasBruto: [], jugadoras: [] });
        setResolving(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const checkDuplicate = async (eqLId, eqVId, fechaNum) => {
    const { data: fechaData } = await supabase
      .from('fechas_femenino').select('id').eq('numero', Number(fechaNum)).maybeSingle();
    if (!fechaData) return null;
    const { data: dupes } = await supabase
      .from('partidos_femenino').select('id, puntos_local, puntos_visit, estado')
      .eq('fecha_id', fechaData.id)
      .or(`and(equipo_local_id.eq.${eqLId},equipo_visit_id.eq.${eqVId}),and(equipo_local_id.eq.${eqVId},equipo_visit_id.eq.${eqLId})`);
    return dupes?.length > 0 ? dupes[0] : null;
  };

  const handlePublish = async (forceOverwrite = false) => {
    if (!parsed || !jornada) { alert('Ingresá el número de fecha antes de publicar'); return; }
    setStep('publicando');
    setLog([]);

    try {
      // Resolver equipos
      const mL = fuseEq.search(parsed.equipoLocal);
      const mV = fuseEq.search(parsed.equipoVisit);
      if (!mL.length) throw new Error(`Equipo local no encontrado: "${parsed.equipoLocal}"`);
      if (!mV.length) throw new Error(`Equipo visitante no encontrado: "${parsed.equipoVisit}"`);
      const eqLId = mL[0].item.id, eqVId = mV[0].item.id;
      addLog(`✅ ${mL[0].item.nombre} vs ${mV[0].item.nombre}`);

      // Check duplicado
      if (!forceOverwrite) {
        addLog('🔍 Verificando duplicados...');
        const dupe = await checkDuplicate(eqLId, eqVId, jornada);
        if (dupe) { setDuplicate(dupe); setStep('duplicado'); return; }
        addLog('✅ Sin duplicados');
      } else {
        const dupe = await checkDuplicate(eqLId, eqVId, jornada);
        if (dupe) {
          await supabase.from('partidos_femenino').delete().eq('id', dupe.id);
          addLog(`🗑️ Partido anterior (ID ${dupe.id}) eliminado`);
        }
      }

      // ── Crear/obtener fecha ── (FIX: no usar upsert, buscar primero)
      addLog('📅 Creando/obteniendo fecha...');
      let fechaId;
      const { data: fechaExist } = await supabase
        .from('fechas_femenino').select('id').eq('numero', Number(jornada)).maybeSingle();

      if (fechaExist) {
        fechaId = fechaExist.id;
        addLog(`✅ Fecha ${jornada} existente (ID ${fechaId})`);
      } else {
        const { data: nuevaFecha, error: fErr } = await supabase
          .from('fechas_femenino')
          .insert({ numero: Number(jornada), descripcion: `Fecha ${jornada}` })
          .select('id').single();
        if (fErr) throw new Error(`Error creando fecha: ${fErr.message}`);
        fechaId = nuevaFecha.id;
        addLog(`✅ Fecha ${jornada} creada (ID ${fechaId})`);
      }

      // ── Insertar partido ──
      addLog('🏀 Insertando partido...');
      const m = parsed.marcador, p = parsed.pct;

      const { data: pd, error: pErr } = await supabase
        .from('partidos_femenino')
        .insert({
          fecha_id: fechaId,
          equipo_local_id: eqLId,
          equipo_visit_id: eqVId,
          q1_local: m.local.q1, q2_local: m.local.q2,
          q3_local: m.local.q3, q4_local: m.local.q4, ot_local: m.local.ot,
          q1_visit: m.visit.q1, q2_visit: m.visit.q2,
          q3_visit: m.visit.q3, q4_visit: m.visit.q4, ot_visit: m.visit.ot,
          puntos_local: m.local.total,
          puntos_visit: m.visit.total,
          pct_simples_local: p.local.simples, pct_dobles_local: p.local.dobles, pct_triples_local: p.local.triples,
          pct_simples_visit: p.visit.simples, pct_dobles_visit: p.visit.dobles, pct_triples_visit: p.visit.triples,
          lugar: lugar || null,
          estado: 'finalizado',
        })
        .select('id').single();

      if (pErr) throw new Error(`Error insertando partido: ${pErr.message}`);
      addLog(`✅ Partido ID ${pd.id} — ${m.local.total}-${m.visit.total}`);
      addLog(`   Local:  Q1=${m.local.q1} Q2=${m.local.q2} Q3=${m.local.q3} Q4=${m.local.q4}${m.local.ot > 0 ? ` OT=${m.local.ot}` : ''}`);
      addLog(`   Visita: Q1=${m.visit.q1} Q2=${m.visit.q2} Q3=${m.visit.q3} Q4=${m.visit.q4}${m.visit.ot > 0 ? ` OT=${m.visit.ot}` : ''}`);

      // ── Stats jugadoras ──
      const jugOk   = jugadoras.filter(j => j.jugadora);
      const jugSkip = jugadoras.filter(j => !j.jugadora);
      addLog(`📊 Insertando stats de ${jugOk.length} jugadoras${jugSkip.length > 0 ? ` (${jugSkip.length} no resueltas)` : ''}...`);

      if (jugSkip.length > 0) {
        jugSkip.forEach(j => addLog(`  ⚠️ Sin resolver: "${j.nombreRaw}"`));
      }

      if (jugOk.length > 0) {
        const statsRows = jugOk.map(j => ({
          partido_id: pd.id, jugadora_id: j.jugadora.id, equipo_id: j.jugadora.equipoId,
          numero: j.numero,
          sc: j.sc, sf: j.sf, dc: j.dc, df: j.df,
          tc: j.tc, tf: j.tf, as_: j.as_,
          rd: j.rd, ro: j.ro, fp: j.fp, ft: j.ft, fa: j.fa,
          rb: j.rb, tp: j.tp, pe: j.pe, ca: j.ca,
          pts: j.pts, val: j.val,
        }));

        const { error: sErr } = await supabase
          .from('stats_partido_femenino')
          .insert(statsRows);
        if (sErr) throw new Error(`Error insertando stats: ${sErr.message}`);
        addLog(`✅ ${jugOk.length} jugadoras insertadas`);

        // Guardar aliases de matches fuzzy
        const fuzzyMatches = jugOk.filter(j => j.matchMethod === 'fuzzy' && j.matchScore < 0.35);
        for (const j of fuzzyMatches) {
          await guardarAlias(j.nombreRaw, j.jugadora.id, j.jugadora.equipoId);
        }
        if (fuzzyMatches.length > 0) addLog(`💾 ${fuzzyMatches.length} alias(es) guardados`);

        // ── MVP ── (manual o automático por VAL)
        let mvpId = mvpManual || null;
        let mvpNombre = '';
        if (!mvpId) {
          const mvpRow = statsRows.reduce((b, r) => !b || r.val > b.val ? r : b, null);
          mvpId = mvpRow?.jugadora_id ?? null;
          mvpNombre = jugOk.find(j => j.jugadora?.id === mvpId)?.jugadora?.nombre ?? '';
        } else {
          mvpNombre = jugOk.find(j => j.jugadora?.id === mvpId)?.jugadora?.nombre ?? mvpId;
        }
        if (mvpId) {
          await supabase.from('partidos_femenino').update({ mvp_jugadora_id: mvpId }).eq('id', pd.id);
          addLog(`⭐ MVP: ${mvpNombre}${!mvpManual ? ' (auto por VAL)' : ''}`);
        }

        // ── Recalcular promedios ──
        addLog('🔄 Recalculando promedios...');
        await recalcularPromedios(statsRows.map(r => r.jugadora_id));
        addLog('✅ Promedios actualizados');
      }

      // ── Log de carga ──
      await supabase.from('upload_log').insert({
        fecha_id: fechaId, partido_id: pd.id, archivo_nombre: fileName,
        equipo_local: parsed.equipoLocal, equipo_visit: parsed.equipoVisit,
        jugadoras_ok: jugOk.length, jugadoras_skip: jugSkip.length,
        warnings: [
          ...(parsed.warnings ?? []),
          ...jugSkip.map(j => `Sin resolver: "${j.nombreRaw}"`),
        ],
      }).catch(() => {}); // No fallar si upload_log no existe

      addLog('🎉 ¡Publicado! El sitio ya está actualizado en tiempo real.');
      setStep('listo');
    } catch (err) {
      addLog(`❌ ERROR: ${err.message}`);
      setStep('preview');
    }
  };

  const jugOkCount   = jugadoras.filter(j => j.jugadora).length;
  const jugNoCount   = jugadoras.filter(j => !j.jugadora).length;
  const jugWarnCount = jugadoras.filter(j => j.jugadora && j.matchScore > 0.25).length;
  const localJugs    = jugadoras.filter(j => j.equipoRaw === parsed?.equipoLocal);
  const visitJugs    = jugadoras.filter(j => j.equipoRaw === parsed?.equipoVisit);

  // MVP calculado automáticamente para mostrar en preview
  const mvpAuto = jugadoras.length > 0
    ? jugadoras.filter(j => j.jugadora).reduce((b, r) => !b || r.val > b.val ? r : b, null)
    : null;

  return (
    <div>
      {/* Stepper */}
      <div style={s.stepper}>
        {[['1','Archivo'],['2','Preview'],['3','Publicar'],['4','Listo']].map(([num,lbl],i)=>{
          const arr = ['archivo','preview','publicando','listo'];
          const cur = arr.indexOf(step === 'duplicado' ? 'publicando' : step);
          const done = i < cur, active = i === cur;
          return (
            <div key={num} style={s.stepWrap}>
              <div style={{ ...s.stepDot, background: done?'#22D07A':active?'#F0B429':'#1C2535', color: done||active?'#080C12':'#4A566E' }}>
                {done ? '✓' : num}
              </div>
              <div style={{ color: active?'#F0B429':done?'#22D07A':'#4A566E', fontSize:12, whiteSpace:'nowrap' }}>{lbl}</div>
              {i < 3 && <div style={{ ...s.stepLine, background: done?'#22D07A':'#1C2535' }}/>}
            </div>
          );
        })}
      </div>

      {/* ── PASO 1: Archivo ── */}
      {step === 'archivo' && (
        <>
          <div style={s.metaRow}>
            <div style={s.metaGroup}>
              <label style={s.label}>N° DE FECHA *</label>
              <input type="number" min="1" value={jornada}
                onChange={e => setJornada(e.target.value)}
                style={s.input} placeholder="6" />
            </div>
            <div style={s.metaGroup}>
              <label style={s.label}>LUGAR (opcional)</label>
              <input type="text" value={lugar}
                onChange={e => setLugar(e.target.value)}
                style={s.input} placeholder="Club, cancha..." />
            </div>
          </div>

          {!jornada && (
            <div style={s.warnBox}>
              ⚠️ Ingresá el número de fecha antes de subir el archivo
            </div>
          )}

          <div
            style={{ ...s.dropZone, borderColor: dragging ? '#F0B429' : '#1C2535', background: dragging ? 'rgba(240,180,41,.05)' : 'transparent' }}
            onClick={() => fileRef.current.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            {resolving ? (
              <>
                <div style={{ fontSize: 40, marginBottom: 10 }}>⏳</div>
                <p style={{ color: '#F0B429', margin: '0 0 4px', fontSize: 16, fontWeight: 600 }}>
                  Resolviendo jugadoras...
                </p>
                <p style={{ color: '#4A566E', fontSize: 12, margin: 0 }}>Esto puede tardar unos segundos</p>
              </>
            ) : (
              <>
                <div style={{ fontSize: 52, marginBottom: 10 }}>📁</div>
                <p style={{ color: '#EEF2F8', margin: '0 0 4px', fontSize: 17, fontWeight: 600 }}>
                  {fileName || 'Arrastrá el Excel o hacé click aquí'}
                </p>
                <p style={{ color: '#4A566E', fontSize: 12, margin: 0 }}>
                  Planilla Torneo Live Basketball (.xlsx)
                </p>
              </>
            )}
            <input ref={fileRef} type="file" accept=".xlsx,.xls"
              onChange={e => handleFile(e.target.files[0])} style={{ display: 'none' }} />
          </div>

          {parsed?.errores?.length > 0 && (
            <div style={s.errBox}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>❌ Errores al leer el archivo:</div>
              {parsed.errores.map((e,i) => <p key={i} style={{ margin: '3px 0', fontSize: 13 }}>• {e}</p>)}
            </div>
          )}
        </>
      )}

      {/* ── PASO 2: Preview ── */}
      {step === 'preview' && parsed && (
        <>
          {/* Marcador */}
          <div style={s.marcadorCard}>
            {[
              { lbl: parsed.equipoLocal, m: parsed.marcador.local },
              { lbl: parsed.equipoVisit, m: parsed.marcador.visit },
            ].map(({ lbl, m }, i) => (
              <div key={i} style={s.marcSide}>
                <div style={s.marcNombre}>{lbl}</div>
                <div style={s.marcTotal}>{m.total}</div>
                <div style={s.parciales}>
                  {['q1','q2','q3','q4'].map(q => (
                    <span key={q} style={s.parcial}>
                      <span style={{ color: '#4A566E', fontSize: 9 }}>{q.toUpperCase()} </span>{m[q]}
                    </span>
                  ))}
                  {m.ot > 0 && (
                    <span style={{ ...s.parcial, background: 'rgba(240,180,41,.1)' }}>
                      <span style={{ color: '#F0B429', fontSize: 9 }}>OT </span>{m.ot}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div style={s.vs}>–</div>
          </div>

          {/* % tiro */}
          <div style={s.pctRow}>
            {[
              { l: '% TL', k: 'simples', c: '#22D07A' },
              { l: '% 2P', k: 'dobles',  c: '#F0B429' },
              { l: '% 3P', k: 'triples', c: '#60A5FA' },
            ].map(t => (
              <div key={t.k} style={s.pctCard}>
                <div style={{ color: '#6B7A99', fontSize: 10, marginBottom: 4, textTransform: 'uppercase', letterSpacing: .5 }}>{t.l}</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: 20 }}>
                  <span style={{ color: '#F04060' }}>{parsed.pct.local[t.k]}%</span>
                  <span style={{ color: '#4A566E', fontSize: 10 }}>vs</span>
                  <span style={{ color: '#60A5FA' }}>{parsed.pct.visit[t.k]}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Warnings */}
          {parsed.warnings.length > 0 && (
            <div style={s.warnBox}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠️ {parsed.warnings.length} advertencia(s)</div>
              {parsed.warnings.map((w,i) => <p key={i} style={{ margin: '2px 0', fontSize: 12 }}>{w}</p>)}
            </div>
          )}

          {/* Resumen resolución */}
          <div style={s.resumenBar}>
            <div style={s.resumenItem}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#22D07A', display:'inline-block' }}/>
              <span style={{ color:'#22D07A', fontWeight:700 }}>{jugOkCount} resueltas</span>
            </div>
            {jugWarnCount > 0 && (
              <div style={s.resumenItem}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:'#F0B429', display:'inline-block' }}/>
                <span style={{ color:'#F0B429' }}>{jugWarnCount} confianza media</span>
              </div>
            )}
            {jugNoCount > 0 && (
              <div style={s.resumenItem}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:'#F04060', display:'inline-block' }}/>
                <span style={{ color:'#F04060' }}>{jugNoCount} no resueltas (se ignoran)</span>
              </div>
            )}
          </div>

          {/* Selector de MVP manual */}
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>MVP DEL PARTIDO</label>
            <select value={mvpManual} onChange={e => setMvpManual(e.target.value)} style={s.input}>
              <option value="">Auto (mayor VAL: {mvpAuto?.jugadora?.nombre ?? '–'})</option>
              {jugadoras.filter(j => j.jugadora).map(j => (
                <option key={j.jugadora.id} value={j.jugadora.id}>
                  ⭐ {j.jugadora.nombre} (VAL {j.val})
                </option>
              ))}
            </select>
          </div>

          {/* Tablas por equipo */}
          {[
            { label: parsed.equipoLocal, jugs: localJugs },
            { label: parsed.equipoVisit, jugs: visitJugs },
          ].map(({ label, jugs }) => (
            <div key={label} style={{ marginBottom: 28 }}>
              <div style={s.teamLabel}>
                {label}
                <span style={{ color: '#4A566E', fontSize: 13, fontFamily: 'Barlow Condensed', marginLeft: 10 }}>
                  {jugs.filter(j=>j.jugadora).length}/{jugs.length} jugadoras
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {['#','Nombre','PTS','VAL','TL C/F','2P C/F','3P C/F','AS','REB','ROB','TAP','PÉR'].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {jugs.map((j, i) => {
                      const color = !j.jugadora ? '#F04060' : j.matchScore > 0.25 ? '#F0B429' : '#EEF2F8';
                      const badge = !j.jugadora ? '❌' : j.matchMethod === 'alias' ? '🔗' : j.matchScore < 0.15 ? '✅' : '~';
                      const isMvp = (mvpManual && j.jugadora?.id === mvpManual) || (!mvpManual && j.jugadora?.id === mvpAuto?.jugadora?.id);
                      return (
                        <tr key={i} style={{ background: i%2===0?'#0E1420':'#141C2A', opacity: j.jugadora?1:0.45 }}>
                          <td style={s.td}>{j.numero ?? '–'}</td>
                          <td style={{ ...s.td, textAlign:'left', minWidth:180 }}>
                            <div style={{ color, fontWeight:600, fontSize:13 }}>
                              {isMvp && <span style={{ color:'#F0B429', marginRight:4 }}>⭐</span>}
                              {badge} {j.jugadora ? j.jugadora.nombre : j.nombreRaw}
                            </div>
                            {j.jugadora && j.nombreRaw !== j.jugadora.nombre && (
                              <div style={{ color:'#4A566E', fontSize:10 }}>
                                planilla: "{j.nombreRaw}"
                                {j.matchMethod && <span style={{ marginLeft:4, color:'#2C3A52' }}>[{j.matchMethod}]</span>}
                              </div>
                            )}
                          </td>
                          <td style={{ ...s.td, color:'#F0B429', fontWeight:700 }}>{j.pts}</td>
                          <td style={{ ...s.td, color: j.val>=0?'#22D07A':'#F04060' }}>{j.val}</td>
                          <td style={s.td}>{j.sc}/{j.sc+j.sf}</td>
                          <td style={s.td}>{j.dc}/{j.dc+j.df}</td>
                          <td style={s.td}>{j.tc}/{j.tc+j.tf}</td>
                          <td style={s.td}>{j.as_}</td>
                          <td style={s.td}>{j.rd+j.ro}</td>
                          <td style={s.td}>{j.rb}</td>
                          <td style={s.td}>{j.tp}</td>
                          <td style={s.td}>{j.pe}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div style={{ display:'flex', gap:12, marginTop:8, flexWrap:'wrap' }}>
            <button onClick={() => handlePublish(false)} disabled={!jornada}
              style={{ ...s.btnPublish, opacity: jornada ? 1 : 0.5 }}>
              🚀 PUBLICAR PARTIDO
            </button>
            <button onClick={reset} style={s.btnCancel}>← Subir otro</button>
          </div>
        </>
      )}

      {/* ── DUPLICADO ── */}
      {step === 'duplicado' && duplicate && (
        <div style={s.dupeBox}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <h3 style={{ color:'#F0B429', margin:'0 0 12px', fontFamily:"'Bebas Neue',sans-serif", fontSize:26 }}>
            PARTIDO YA CARGADO
          </h3>
          <p style={{ color:'#EEF2F8', marginBottom:8 }}>
            Ya existe un partido de Fecha {jornada} entre estos equipos:
          </p>
          <div style={{ background:'#141C2A', border:'1px solid #1C2535', borderRadius:8, padding:'14px', marginBottom:20, textAlign:'center' }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, color:'#F0B429' }}>
              {duplicate.puntos_local} — {duplicate.puntos_visit}
            </div>
            <div style={{ color:'#6B7A99', fontSize:11, marginTop:4 }}>ID {duplicate.id} · {duplicate.estado}</div>
          </div>
          <p style={{ color:'#F04060', fontSize:13, marginBottom:20 }}>
            Si sobreescribís, el partido anterior y todas sus estadísticas se eliminarán permanentemente.
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => handlePublish(true)}
              style={{ ...s.btnPublish, background:'linear-gradient(135deg,#F04060,#B91C1C)', maxWidth:220 }}>
              🗑️ SOBREESCRIBIR
            </button>
            <button onClick={() => setStep('preview')} style={s.btnCancel}>← Volver al preview</button>
          </div>
        </div>
      )}

      {/* ── PUBLICANDO ── */}
      {step === 'publicando' && (
        <div style={s.logBox}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:'#F0B429', marginBottom:16, letterSpacing:1 }}>
            Publicando partido...
          </div>
          {log.map((l, i) => (
            <div key={i} style={{
              padding:'3px 0', fontSize:13, fontFamily:'Barlow Condensed', letterSpacing:.3,
              color: l.startsWith('❌') ? '#F04060'
                   : l.startsWith('✅')||l.startsWith('🎉')||l.startsWith('⭐') ? '#22D07A'
                   : l.startsWith('⚠️') ? '#F0B429' : '#EEF2F8',
            }}>
              {l}
            </div>
          ))}
          <div style={{ marginTop:16, display:'flex', alignItems:'center', gap:8, color:'#4A566E', fontSize:12 }}>
            <span style={s.spinner}/>
            No cerrés esta ventana...
          </div>
        </div>
      )}

      {/* ── LISTO ── */}
      {step === 'listo' && parsed && (
        <div style={s.successBox}>
          <div style={{ fontSize: 60, marginBottom: 12 }}>🎉</div>
          <h3 style={{ color:'#22D07A', margin:'0 0 8px', fontFamily:"'Bebas Neue',sans-serif", fontSize:30, letterSpacing:1 }}>
            ¡PUBLICADO!
          </h3>
          <p style={{ color:'#EEF2F8', fontSize:18, margin:'0 0 4px' }}>
            {parsed.equipoLocal}{' '}
            <strong style={{ color:'#F0B429' }}>{parsed.marcador.local.total}</strong>
            {' — '}
            <strong style={{ color:'#F0B429' }}>{parsed.marcador.visit.total}</strong>
            {' '}{parsed.equipoVisit}
          </p>
          <div style={{ display:'flex', gap:6, justifyContent:'center', margin:'10px 0 4px', flexWrap:'wrap' }}>
            {['q1','q2','q3','q4'].map(q => (
              <span key={q} style={{ background:'#141C2A', padding:'2px 10px', borderRadius:4, fontSize:12, color:'#6B7A99' }}>
                {q.toUpperCase()} {parsed.marcador.local[q]}-{parsed.marcador.visit[q]}
              </span>
            ))}
            {parsed.marcador.local.ot > 0 && (
              <span style={{ background:'rgba(240,180,41,.1)', padding:'2px 10px', borderRadius:4, fontSize:12, color:'#F0B429' }}>
                OT {parsed.marcador.local.ot}-{parsed.marcador.visit.ot}
              </span>
            )}
          </div>
          <p style={{ color:'#6B7A99', margin:'10px 0 4px', fontSize:13 }}>
            {jugOkCount} jugadoras · promedios actualizados · sitio en tiempo real
          </p>
          {log.filter(l => l.startsWith('⭐')).map((l, i) => (
            <p key={i} style={{ color:'#F0B429', fontSize:14, margin:'4px 0' }}>{l}</p>
          ))}
          <div style={{ display:'flex', gap:12, justifyContent:'center', marginTop:20 }}>
            <button onClick={reset} style={{ ...s.btnPublish, maxWidth:260 }}>
              + Cargar otro partido
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const s = {
  stepper:    { display:'flex', alignItems:'center', marginBottom:28, gap:0 },
  stepWrap:   { display:'flex', alignItems:'center', gap:6, flex:1 },
  stepDot:    { width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 },
  stepLine:   { flex:1, height:2, borderRadius:1 },
  metaRow:    { display:'flex', gap:16, marginBottom:20, flexWrap:'wrap' },
  metaGroup:  { display:'flex', flexDirection:'column', gap:6, flex:1, minWidth:140 },
  label:      { fontSize:10, fontWeight:700, letterSpacing:2, color:'#4A566E', display:'block', marginBottom:6 },
  input:      { padding:'11px 12px', background:'#141C2A', border:'1px solid #1C2535', borderRadius:8, color:'#EEF2F8', fontSize:14, outline:'none', width:'100%', boxSizing:'border-box' },
  dropZone:   { border:'2px dashed', borderRadius:14, padding:'2.5rem 1rem', textAlign:'center', cursor:'pointer', marginBottom:20, transition:'all .2s' },
  errBox:     { background:'rgba(240,64,96,.1)', border:'1px solid rgba(240,64,96,.3)', borderRadius:8, padding:'12px 16px', marginBottom:16, color:'#F04060', fontSize:14 },
  warnBox:    { background:'rgba(240,180,41,.08)', border:'1px solid rgba(240,180,41,.25)', borderRadius:8, padding:'12px 16px', marginBottom:16, color:'#F0B429', fontSize:13 },
  marcadorCard:{ background:'#0E1420', border:'1px solid #1C2535', borderRadius:14, padding:'1.5rem', display:'flex', alignItems:'center', justifyContent:'space-around', marginBottom:16, gap:16, flexWrap:'wrap' },
  marcSide:   { flex:1, textAlign:'center', minWidth:120 },
  marcNombre: { fontFamily:"'Bebas Neue',sans-serif", fontSize:17, letterSpacing:1, color:'#EEF2F8', marginBottom:4 },
  marcTotal:  { fontFamily:"'Bebas Neue',sans-serif", fontSize:62, color:'#F0B429', lineHeight:1 },
  parciales:  { display:'flex', gap:6, justifyContent:'center', marginTop:6, flexWrap:'wrap' },
  parcial:    { background:'#141C2A', padding:'3px 8px', borderRadius:4, fontSize:13, color:'#EEF2F8' },
  vs:         { fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:'#4A566E' },
  pctRow:     { display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' },
  pctCard:    { flex:1, minWidth:90, background:'#0E1420', border:'1px solid #1C2535', borderRadius:8, padding:'10px 12px', textAlign:'center' },
  resumenBar: { display:'flex', gap:16, marginBottom:16, flexWrap:'wrap', alignItems:'center', padding:'10px 14px', background:'rgba(255,255,255,.03)', borderRadius:8, border:'1px solid #1C2535' },
  resumenItem:{ display:'flex', alignItems:'center', gap:6 },
  teamLabel:  { fontFamily:"'Bebas Neue',sans-serif", fontSize:19, letterSpacing:1, color:'#EEF2F8', marginBottom:10, paddingBottom:8, borderBottom:'1px solid #1C2535' },
  table:      { width:'100%', borderCollapse:'collapse', fontSize:12 },
  th:         { background:'#141C2A', color:'#6B7A99', padding:'8px 10px', textAlign:'center', fontSize:10, whiteSpace:'nowrap' },
  td:         { padding:'7px 8px', textAlign:'center', color:'#EEF2F8', borderBottom:'1px solid #1C2535' },
  btnPublish: { flex:1, maxWidth:280, padding:'13px', background:'linear-gradient(135deg,#F0B429,#FF6B2B)', border:'none', borderRadius:10, color:'#080C12', fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:1, cursor:'pointer' },
  btnCancel:  { padding:'10px 20px', background:'transparent', border:'1px solid #4A566E', borderRadius:8, color:'#6B7A99', cursor:'pointer', fontSize:14 },
  logBox:     { background:'#0E1420', border:'1px solid #1C2535', borderRadius:12, padding:'1.5rem', minHeight:200 },
  successBox: { textAlign:'center', padding:'3rem 1rem', background:'rgba(34,208,122,.05)', border:'1px solid rgba(34,208,122,.2)', borderRadius:14 },
  dupeBox:    { textAlign:'center', padding:'2.5rem 1.5rem', background:'rgba(240,180,41,.05)', border:'1px solid rgba(240,180,41,.2)', borderRadius:14 },
  spinner:    { display:'inline-block', width:12, height:12, border:'2px solid rgba(255,255,255,.2)', borderTopColor:'#F0B429', borderRadius:'50%', animation:'spin .8s linear infinite' },
};