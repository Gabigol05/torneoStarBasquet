import { useState, useRef, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Fuse from 'fuse.js';
import { supabase } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';
import { equiposMasculino } from '../data/masculinoData';
import { TABLAS } from './categoriaAdmin';

// ─── Normalización ────────────────────────────────────────────────────────────
const normStr = s => (s ?? '').toString().normalize('NFD').replace(/[̀-ͯ'`]/g,'').toLowerCase().trim();

// ─── Índice fuzzy de EQUIPOS (estático para ambas categorías) ─────────────────
const fuseEqFem  = new Fuse(equiposFemenino,  { keys: [{ name:'name', weight:1 }], threshold: 0.4 });
const fuseEqMasc = new Fuse(equiposMasculino, { keys: [{ name:'name', weight:1 }], threshold: 0.4 });

// ─── Alias de nombres de equipo ────────────────────────────────────────────────
// Algunos excels escriben el nombre del equipo distinto entre el bloque del
// marcador y el de stats (o distinto al nombre oficial), y como no son
// variaciones de tipeo (tilde/mayúscula/espacio) sino palabras totalmente
// distintas, el fuzzy matching no alcanza a asociarlos. "Ene Ene" en vez de
// "NN" es el caso conocido — se resuelve por equivalencia manual antes de
// intentar el fuzzy match.
const ALIAS_EQUIPOS_TEXTO = {
  'ene ene': 'nn',
};
const canonEquipo = texto => {
  const n = normStr(texto);
  return ALIAS_EQUIPOS_TEXTO[n] ?? n;
};
// Busca un equipo por texto: primero por igualdad exacta (tolerando el alias
// de arriba), y si no hay hit, recién ahí cae al fuzzy matching normal.
function buscarEquipo(texto, fuseEq, lista) {
  if (!texto) return null;
  const canon = canonEquipo(texto);
  const exacto = lista.find(e => normStr(e.name) === canon);
  if (exacto) return exacto;
  return fuseEq.search(texto)[0]?.item ?? null;
}

// ─── Índice fuzzy de JUGADORAS/ES — femenino es estático (roster fijo) ────────
const TODAS_JUGADORAS_FEM = equiposFemenino.flatMap(eq =>
  eq.jugadoras.filter(j => j && j.nombre).map(j => {
    const partes = j.nombre.trim().split(/\s+/);
    return {
      id: j.id, nombre: j.nombre, nombreNorm: normStr(j.nombre),
      equipoId: eq.id, equipo: eq.name, equipoNorm: normStr(eq.name),
      t0: normStr(partes[0] ?? ''), t1: normStr(partes[1] ?? ''),
      t2: normStr(partes[2] ?? ''), t3: normStr(partes[3] ?? ''),
    };
  })
);
const fuseJugadorasFem = new Fuse(TODAS_JUGADORAS_FEM, {
  keys: [
    { name:'t0', weight:0.35 }, { name:'t1', weight:0.35 },
    { name:'t2', weight:0.2  }, { name:'t3', weight:0.1  },
    { name:'nombreNorm', weight:0.4 },
  ],
  threshold: 0.38, minMatchCharLength: 2, includeScore: true,
});

// Masculino NO tiene roster estático — los jugadores se van creando a medida
// que se cargan los Excel. El índice fuzzy se arma dinámicamente desde la
// tabla jugadores_masculino (ver buildIndiceJugadoresMasc en el componente).
function buildFuseJugadores(lista) {
  return new Fuse(lista, {
    keys: [
      { name:'t0', weight:0.35 }, { name:'t1', weight:0.35 },
      { name:'t2', weight:0.2  }, { name:'t3', weight:0.1  },
      { name:'nombreNorm', weight:0.4 },
    ],
    threshold: 0.38, minMatchCharLength: 2, includeScore: true,
  });
}

// Arma la entrada de indice fuzzy para un jugador masculino recien creado o
// traido de la base, con el mismo formato en ambos lugares (fetch inicial
// y alta al publicar) para no duplicar la logica.
function formatJugadorMasc(j) {
  const partes = (j.nombre ?? '').trim().split(/\s+/);
  const equipoNombre = equiposMasculino.find(e => e.id === j.equipo_id)?.name ?? j.equipo_id;
  return {
    id: j.id, nombre: j.nombre, nombreNorm: normStr(j.nombre),
    equipoId: j.equipo_id, equipo: equipoNombre, equipoNorm: normStr(equipoNombre),
    t0: normStr(partes[0] ?? ''), t1: normStr(partes[1] ?? ''),
    t2: normStr(partes[2] ?? ''), t3: normStr(partes[3] ?? ''),
  };
}

// ─── Resolver jugadora: aliases → fuzzy → (masculino) nuevo jugador ──────────
const aliasesCache = { femenino: null, masculino: null };

async function cargarAliases(categoria, tablas) {
  if (aliasesCache[categoria]) return aliasesCache[categoria];
  const { data } = await supabase.from(tablas.aliases).select('*');
  aliasesCache[categoria] = data ?? [];
  return aliasesCache[categoria];
}

async function resolverJugadora(nombreRaw, equipoHint, numeroJugadora, ctx) {
  const { categoria, tablas, fuseEq, fuseJugadoras, todasJugadoras } = ctx;
  if (!nombreRaw) return { jugadora: null, method: 'empty', score: 1 };
  const clean    = normStr(String(nombreRaw));
  const aliases  = await cargarAliases(categoria, tablas);
  const eqMatch  = equipoHint ? buscarEquipo(equipoHint, fuseEq, ctx.equipos) : null;
  const equipoId = eqMatch?.id;

  // 1️⃣ Lookup exacto en tabla de aliases (prioridad máxima)
  const aliasExacto = aliases.find(a =>
    a.alias_norm === clean && (!equipoId || a.equipo_id === equipoId)
  );
  if (aliasExacto) {
    const jugId = aliasExacto[tablas.jugadorIdField];
    const jug = todasJugadoras.find(j => j.id === jugId);
    if (jug) return { jugadora: jug, method: 'alias', score: 0 };
  }

  // 2️⃣ Fuzzy matching con filtro de equipo
  const buscarConFiltro = (texto) => {
    const resultados = fuseJugadoras.search(texto);
    if (!equipoId) return resultados;
    return resultados.filter(r => r.item.equipoId === equipoId);
  };

  const candidatosNormal = buscarConFiltro(clean);
  const palabras = clean.split(' ').filter(Boolean);
  const cleanInvertido = palabras.length > 1 ? [...palabras].reverse().join(' ') : null;
  const candidatosInvertido = cleanInvertido ? buscarConFiltro(cleanInvertido) : [];

  const mejorNormal    = candidatosNormal[0];
  const mejorInvertido = candidatosInvertido[0];
  let candidatos = candidatosNormal;
  if (mejorInvertido && (!mejorNormal || (mejorInvertido.score ?? 1) < (mejorNormal.score ?? 1))) {
    candidatos = candidatosInvertido;
  }

  if (candidatos.length === 0) {
    // Masculino: si no existe todavía, se crea al publicar (no se descarta).
    if (categoria === 'masculino' && equipoId) {
      return { jugadora: null, method: 'nuevo', score: 0, nuevoEquipoId: equipoId };
    }
    return { jugadora: null, method: 'not_found', score: 1 };
  }

  // 3️⃣ Desambiguar por número de camiseta si hay empate (solo caso conocido femenino)
  const top    = candidatos[0];
  const second = candidatos[1];
  if (categoria === 'femenino' && second && Math.abs((top.score??1) - (second.score??1)) < 0.05 && numeroJugadora != null) {
    const NUMERO_MAP = { 'f_pilar': { 10: 'f_psc_01', 12: 'f_psc_03' } };
    const byNum = NUMERO_MAP[equipoId]?.[numeroJugadora];
    if (byNum) {
      const jug = todasJugadoras.find(j => j.id === byNum);
      if (jug) return { jugadora: jug, method: 'numero', score: 0.1 };
    }
  }

  return { jugadora: top.item, method: 'fuzzy', score: top.score ?? 0.5 };
}

// ─── Guardar alias nuevo si es un match fuzzy confirmado ─────────────────────
async function guardarAlias(alias, jugadoraId, equipoId, ctx) {
  const { categoria, tablas } = ctx;
  const aliasNorm = normStr(alias);
  await supabase.from(tablas.aliases).upsert({
    alias, alias_norm: aliasNorm, [tablas.jugadorIdField]: jugadoraId,
    equipo_id: equipoId, confirmado: true,
  }, { onConflict: 'alias_norm,equipo_id', ignoreDuplicates: true });
  aliasesCache[categoria] = null; // invalidar cache
}

// ─── Índices exactos de columnas ──────────────────────────────────────────────
const C = {
  equipo:0, partido:3, numero:6, nombre:9,
  sc:17, sf:20, dc:23, df:25, tc:27, tf:29,
  as_:31, rd:33, ro:35, fp:36, ft:38, fa:40,
  rb:44, tp:46, pe:47, ca:51, pts:52, val:55,
};
const M = { equipo:2, q1:7, q2acum:11, q3acum:12, q4acum:13, ot:14, total:16 };
const P = { equipo:2, simples:7, dobles:15, triples:24 };
const n = v => (typeof v === 'number' ? v : 0);

function acumAParcial(q1, q2acum, q3acum, q4acum) {
  return { q1, q2: q2acum-q1, q3: q3acum-q2acum, q4: q4acum-q3acum };
}

// ─── Parser principal ─────────────────────────────────────────────────────────
function parsearExcel(wb) {
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:null });

  const res = {
    equipoLocal:null, equipoVisit:null,
    marcador:{ local:{q1:0,q2:0,q3:0,q4:0,ot:0,total:0}, visit:{q1:0,q2:0,q3:0,q4:0,ot:0,total:0} },
    pct:{ local:{simples:0,dobles:0,triples:0}, visit:{simples:0,dobles:0,triples:0} },
    jugadorasBruto:[], errores:[], warnings:[],
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

  // Validar que las columnas esperadas tengan encabezado en esa fila.
  const headerRow = rows[statsRow];
  const camposEsperados = ['numero','nombre','sc','sf','dc','df','tc','tf','as_','rd','ro','fp','ft','fa','rb','tp','pe','ca','pts','val'];
  const columnasVacias = camposEsperados.filter(campo => {
    const idx = C[campo];
    const val = headerRow[idx];
    return val === null || val === undefined || String(val).trim() === '';
  });
  if (columnasVacias.length > 0) {
    res.errores.push(`El formato del Excel no coincide con el esperado (columnas sin encabezado: ${columnasVacias.join(', ')}). Revisa que no se haya modificado la estructura de la planilla antes de subirla.`);
    return res;
  }

  // Marcador (acumulados → parciales)
  const rL=rows[marcRow+1], rV=rows[marcRow+2];
  if (rL) {
    res.equipoLocal = String(rL[M.equipo]??'').trim();
    const par = acumAParcial(n(rL[M.q1]),n(rL[M.q2acum]),n(rL[M.q3acum]),n(rL[M.q4acum]));
    res.marcador.local = { ...par, ot:n(rL[M.ot]), total:n(rL[M.total]) };
  }
  if (rV) {
    res.equipoVisit = String(rV[M.equipo]??'').trim();
    const par = acumAParcial(n(rV[M.q1]),n(rV[M.q2acum]),n(rV[M.q3acum]),n(rV[M.q4acum]));
    res.marcador.visit = { ...par, ot:n(rV[M.ot]), total:n(rV[M.total]) };
  }
  if (!res.equipoLocal||!res.equipoVisit) { res.errores.push('No se leyeron los equipos.'); return res; }

  // Validar suma cuartos
  const sumaL = res.marcador.local.q1+res.marcador.local.q2+res.marcador.local.q3+res.marcador.local.q4+res.marcador.local.ot;
  const sumaV = res.marcador.visit.q1+res.marcador.visit.q2+res.marcador.visit.q3+res.marcador.visit.q4+res.marcador.visit.ot;
  if (res.marcador.local.total>0 && sumaL!==res.marcador.local.total)
    res.warnings.push(`⚠️ Cuartos local suman ${sumaL} ≠ total ${res.marcador.local.total}`);
  if (res.marcador.visit.total>0 && sumaV!==res.marcador.visit.total)
    res.warnings.push(`⚠️ Cuartos visitante suman ${sumaV} ≠ total ${res.marcador.visit.total}`);

  // Stats jugadoras (sin resolver aún — se resuelve async después)
  let equipoActual = res.equipoLocal;
  for (let i=statsRow+1; i<rows.length; i++) {
    const r = rows[i];
    if (!r || r.every(v => v===null||v==='')) continue;
    if (r[C.equipo] && typeof r[C.equipo]==='string' && r[C.equipo].trim()) {
      const eq = r[C.equipo].trim();
      if (eq==='Equipo') break;
      // Comparación tolerante (antes era === estricto): un espacio extra, una
      // tilde, mayúscula distinta, o un alias tipo "Ene Ene"/"NN" entre el
      // bloque del marcador y el bloque de stats hacía que nunca detecte el
      // cambio de equipo visitante, y todas sus jugadoras quedaban
      // etiquetadas con el equipo local — buscando (y a veces matcheando
      // mal) contra el roster equivocado.
      if (canonEquipo(eq)===canonEquipo(res.equipoLocal)||canonEquipo(eq)===canonEquipo(res.equipoVisit)) equipoActual=eq;
    }
    const nombre = r[C.nombre];
    const numero = r[C.numero];
    const nomStr = String(nombre??'').trim();
    if (!nomStr || nomStr==='null' || typeof nombre==='number') continue;

    const numParsed = typeof numero==='number' ? numero : (parseInt(String(numero??''))||null);
    const ptsCal   = n(r[C.sc])+n(r[C.dc])*2+n(r[C.tc])*3;
    const ptsXls   = n(r[C.pts]);

    res.jugadorasBruto.push({
      nombreRaw: nomStr, equipoRaw: equipoActual,
      numero: numParsed,
      sc:n(r[C.sc]), sf:n(r[C.sf]), dc:n(r[C.dc]), df:n(r[C.df]),
      tc:n(r[C.tc]), tf:n(r[C.tf]), as_:n(r[C.as_]),
      rd:n(r[C.rd]), ro:n(r[C.ro]),
      fp:n(r[C.fp]), ft:n(r[C.ft]), fa:n(r[C.fa]),
      rb:n(r[C.rb]), tp:n(r[C.tp]), pe:n(r[C.pe]), ca:n(r[C.ca]),
      pts:ptsXls, val:n(r[C.val]),
      ptsOk: ptsXls===0||ptsCal===ptsXls, ptsCal,
    });
  }

  // % tiro
  if (pctRow!==-1) {
    const pL=rows[pctRow+1], pV=rows[pctRow+2];
    if (pL) res.pct.local  = { simples:n(pL[P.simples]),dobles:n(pL[P.dobles]),triples:n(pL[P.triples]) };
    if (pV) res.pct.visit  = { simples:n(pV[P.simples]),dobles:n(pV[P.dobles]),triples:n(pV[P.triples]) };
  }

  if (res.jugadorasBruto.length===0) res.errores.push('No se encontraron jugadoras.');
  return res;
}

// ─── Resolver todas las jugadoras async ───────────────────────────────────────
async function resolverJugadoras(bruto, ctx) {
  const resolved = [];
  for (const j of bruto) {
    const r = await resolverJugadora(j.nombreRaw, j.equipoRaw, j.numero, ctx);
    resolved.push({ ...j, jugadora: r.jugadora, matchMethod: r.method, matchScore: r.score, nuevoEquipoId: r.nuevoEquipoId });
  }
  return resolved;
}

// ─── Recalcular promedios (fallback si el trigger no está activo) ─────────────
async function recalcularPromedios(jugadorIds, tablas) {
  const idField = tablas.jugadorIdField;
  for (const jugId of [...new Set(jugadorIds)]) {
    const { data } = await supabase
      .from(tablas.stats)
      .select('pts,rd,ro,as_,rb,tp,pe,val,sc,sf,dc,df,tc,tf')
      .eq(idField, jugId);
    if (!data?.length) continue;
    const k=data.length, sum=key=>data.reduce((a,r)=>a+(r[key]??0),0), avg=key=>+(sum(key)/k).toFixed(1);
    const tsc=sum('sc'),tsf=sum('sf'),tdc=sum('dc'),tdf=sum('df'),ttc=sum('tc'),ttf=sum('tf');
    await supabase.from(tablas.estadisticas).upsert({
      [idField]:jugId, pj:k,
      pts_prom:avg('pts'), reb_prom:+((sum('rd')+sum('ro'))/k).toFixed(1),
      ast_prom:avg('as_'), rob_prom:avg('rb'), tap_prom:avg('tp'),
      per_prom:avg('pe'), val_prom:avg('val'),
      pct_simples: tsc+tsf>0?+((tsc/(tsc+tsf))*100).toFixed(1):0,
      pct_dobles:  tdc+tdf>0?+((tdc/(tdc+tdf))*100).toFixed(1):0,
      pct_triples: ttc+ttf>0?+((ttc/(ttc+ttf))*100).toFixed(1):0,
      // ⚠️ FIX: antes solo se guardaba el %, nunca el detalle "convertidos/
      // intentados" — el modal de jugador mostraba 0/0 aunque el % diera
      // bien, porque leía estos campos y nunca se habían guardado.
      sc_total:tsc, sf_total:tsf, dc_total:tdc, df_total:tdf, tc_total:ttc, tf_total:ttf,
      pts_total:sum('pts'), reb_total:sum('rd')+sum('ro'), ast_total:sum('as_'),
      rob_total:sum('rb'), tap_total:sum('tp'), val_total:sum('val'), per_total:sum('pe'),
      mejor_pts:Math.max(...data.map(r=>r.pts??0)), updated_at:new Date().toISOString(),
    }, { onConflict:idField });
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ExcelUpload({ categoria: categoriaProp, setCategoria: setCategoriaProp } = {}) {
  const [categoriaLocal, setCategoriaLocal] = useState('femenino');
  const categoria    = categoriaProp ?? categoriaLocal;
  const setCategoria = setCategoriaProp ?? setCategoriaLocal;
  const tablas = TABLAS[categoria];
  const roster = categoria === 'masculino' ? equiposMasculino : equiposFemenino;
  const fuseEq = categoria === 'masculino' ? fuseEqMasc : fuseEqFem;

  // Índice de jugadores para fuzzy matching. Femenino: estático. Masculino: se
  // trae de la base cada vez que se cambia de categoría (crece con cada carga).
  const [jugadoresMasc, setJugadoresMasc] = useState([]);
  useEffect(() => {
    if (categoria !== 'masculino') return;
    (async () => {
      const { data } = await supabase.from(tablas.jugadores).select('*');
      setJugadoresMasc((data ?? []).map(formatJugadorMasc));
    })();
  }, [categoria]);

  const todasJugadoras  = categoria === 'masculino' ? jugadoresMasc : TODAS_JUGADORAS_FEM;
  const fuseJugadoras   = useMemo(() => categoria === 'masculino' ? buildFuseJugadores(jugadoresMasc) : fuseJugadorasFem, [categoria, jugadoresMasc]);
  const ctx = { categoria, tablas, fuseEq, fuseJugadoras, todasJugadoras, equipos: roster };

  const [step,      setStep]      = useState('archivo');
  const [parsed,    setParsed]    = useState(null);    // datos del parser (sin resolver)
  const [jugadoras, setJugadoras] = useState([]);      // jugadoras resueltas
  const [resolving, setResolving] = useState(false);
  const [fileName,  setFileName]  = useState('');
  const [jornada,   setJornada]   = useState('');
  const [lugar,     setLugar]     = useState('');
  // Fecha calendario de ESTE partido puntual — una jornada puede jugarse en
  // mas de un dia (ej: 8 partidos el sabado y 3 el domingo, todos "Fecha 1"),
  // asi que no alcanza con la fecha de la jornada. Opcional: si se deja vacio
  // el partido sigue mostrando la fecha de la jornada como antes.
  const [fechaPartido, setFechaPartido] = useState('');
  const [log,       setLog]       = useState([]);
  const [duplicate, setDuplicate] = useState(null);
  const fileRef = useRef();

  const reset = () => {
    setStep('archivo'); setParsed(null); setJugadoras([]);
    setFileName(''); setLog([]); setDuplicate(null);
  };

  useEffect(() => { reset(); }, [categoria]);

  const addLog = msg => setLog(l => [...l, msg]);

  const handleFile = async (e) => {
    const file = (e.dataTransfer?.files ?? e.target.files)[0];
    if (!file) return;
    reset();
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const wb     = XLSX.read(ev.target.result, { type:'binary' });
        const result = parsearExcel(wb);
        if (result.errores.length > 0) { setParsed(result); return; }

        setResolving(true);
        const resolved = await resolverJugadoras(result.jugadorasBruto, ctx);
        setParsed({ ...result, jugadoras: resolved });
        setJugadoras(resolved);
        setResolving(false);
        setStep('preview');
      } catch(err) {
        setParsed({ errores:[`Error al leer: ${err.message}`], warnings:[], jugadorasBruto:[], jugadoras:[] });
      }
    };
    reader.readAsBinaryString(file);
  };

  // ── Verificar duplicado ──
  const checkDuplicate = async (eqLId, eqVId, fechaNum) => {
    const { data: fechaData, error: fechaErr } = await supabase
      .from(tablas.fechas)
      .select('id')
      .eq('numero', Number(fechaNum))
      .maybeSingle();
    if (fechaErr) throw new Error(`ver fecha: ${fechaErr.message}`);
    if (!fechaData) return null;
    const { data: dupes, error: dupesErr } = await supabase
      .from(tablas.partidos)
      .select('id, puntos_local, puntos_visit, estado')
      .eq('fecha_id', fechaData.id)
      .or(`and(equipo_local_id.eq.${eqLId},equipo_visit_id.eq.${eqVId}),and(equipo_local_id.eq.${eqVId},equipo_visit_id.eq.${eqLId})`);
    if (dupesErr) throw new Error(`ver duplicados: ${dupesErr.message}`);
    return dupes?.length > 0 ? dupes[0] : null;
  };

  const handlePublish = async (forceOverwrite = false) => {
    if (!parsed || !jornada) { alert('Ingresá el número de fecha'); return; }
    setStep('publicando');
    setLog([]);
    try {
      // Resolver equipos (con alias tipo "Ene Ene" -> "NN" antes del fuzzy)
      const eqLocalItem = buscarEquipo(parsed.equipoLocal, fuseEq, roster);
      const eqVisitItem = buscarEquipo(parsed.equipoVisit, fuseEq, roster);
      if (!eqLocalItem) throw new Error(`Equipo local no encontrado: "${parsed.equipoLocal}"`);
      if (!eqVisitItem) throw new Error(`Equipo visitante no encontrado: "${parsed.equipoVisit}"`);
      const eqLId = eqLocalItem.id, eqVId = eqVisitItem.id;
      addLog(`✅ ${eqLocalItem.name} vs ${eqVisitItem.name}`);

      // Check duplicado
      if (!forceOverwrite) {
        addLog('🔍 Verificando duplicados...');
        const dupe = await checkDuplicate(eqLId, eqVId, Number(jornada));
        if (dupe) { setDuplicate(dupe); setStep('duplicado'); return; }
        addLog('✅ Sin duplicados');
      } else {
        const dupe = await checkDuplicate(eqLId, eqVId, Number(jornada));
        if (dupe) {
          await supabase.from(tablas.partidos).delete().eq('id', dupe.id);
          addLog(`🗑️ Partido anterior (ID ${dupe.id}) eliminado`);
        }
      }

      // Fecha
      addLog('📅 Creando fecha...');
      const { data:fd, error:fErr } = await supabase
        .from(tablas.fechas)
        .upsert({ numero:Number(jornada), descripcion:`Fecha ${jornada}` }, { onConflict:'numero' })
        .select('id').single();
      if (fErr) throw new Error(`Fecha: ${fErr.message}`);
      addLog(`✅ Fecha ${jornada} (ID ${fd.id})`);

      // Partido
      addLog('🏀 Insertando partido...');
      const m=parsed.marcador, p=parsed.pct;
      if (m.local.total === m.visit.total) {
        throw new Error(`El Excel da un empate ${m.local.total}-${m.visit.total} — el básquet no admite empates, revisá la planilla antes de publicar.`);
      }
      const { data:pd, error:pErr } = await supabase
        .from(tablas.partidos)
        .insert({
          fecha_id:fd.id, equipo_local_id:eqLId, equipo_visit_id:eqVId,
          q1_local:m.local.q1, q2_local:m.local.q2, q3_local:m.local.q3,
          q4_local:m.local.q4, ot_local:m.local.ot,
          q1_visit:m.visit.q1, q2_visit:m.visit.q2, q3_visit:m.visit.q3,
          q4_visit:m.visit.q4, ot_visit:m.visit.ot,
          pct_simples_local:p.local.simples, pct_dobles_local:p.local.dobles, pct_triples_local:p.local.triples,
          pct_simples_visit:p.visit.simples, pct_dobles_visit:p.visit.dobles, pct_triples_visit:p.visit.triples,
          lugar:lugar||null, fecha_partido:fechaPartido||null, estado:'finalizado',
        })
        .select('id').single();
      if (pErr) throw new Error(`Partido: ${pErr.message}`);
      addLog(`✅ Partido ID ${pd.id} — ${m.local.total}-${m.visit.total}`);
      addLog(`   Local:  Q1=${m.local.q1} Q2=${m.local.q2} Q3=${m.local.q3} Q4=${m.local.q4}`);
      addLog(`   Visita: Q1=${m.visit.q1} Q2=${m.visit.q2} Q3=${m.visit.q3} Q4=${m.visit.q4}`);

      // Masculino: crear en la base los jugadores nuevos (method === 'nuevo')
      // antes de insertar stats, para tener su id real.
      let jugadorasResueltas = jugadoras;
      const nuevos = jugadoras.filter(j => j.matchMethod === 'nuevo' && !j.jugadora);
      if (nuevos.length > 0) {
        addLog(`🆕 Creando ${nuevos.length} jugador(es) nuevo(s)...`);
        const creadosParaIndice = [];
        for (const nj of nuevos) {
          // OJO: el numero de camiseta NO va en el id — si un Excel lo trae
          // y otro no (o cambia de una fecha a otra), un id que dependiera
          // del numero generaba una fila NUEVA para la misma persona real,
          // partiendo sus estadisticas en dos jugadores distintos.
          const idGenerado = `${nj.nuevoEquipoId}_${normStr(nj.nombreRaw).replace(/\s+/g,'_')}`;
          const { data: creado, error: cErr } = await supabase
            .from(tablas.jugadores)
            .upsert({ id: idGenerado, equipo_id: nj.nuevoEquipoId, nombre: nj.nombreRaw, numero: nj.numero }, { onConflict:'id' })
            .select('*').single();
          if (cErr) throw new Error(`Creando jugador "${nj.nombreRaw}": ${cErr.message}`);
          jugadorasResueltas = jugadorasResueltas.map(j =>
            j === nj ? { ...j, jugadora: { id: creado.id, nombre: creado.nombre, equipoId: creado.equipo_id } } : j
          );
          creadosParaIndice.push(creado);
        }
        setJugadoras(jugadorasResueltas);
        // Sumar los recien creados al indice fuzzy en memoria — si no, cargar
        // dos partidos seguidos en la misma sesion (muy probable este fin de
        // semana) no los reconoce en la segunda carga y crea un duplicado.
        if (categoria === 'masculino' && creadosParaIndice.length > 0) {
          setJugadoresMasc(prev => [...prev, ...creadosParaIndice.map(formatJugadorMasc)]);
        }
      }

      // Stats
      const jugOk   = jugadorasResueltas.filter(j => j.jugadora);
      const jugSkip = jugadorasResueltas.filter(j => !j.jugadora);
      addLog(`📊 Insertando stats de ${jugOk.length} jugadoras${jugSkip.length>0?` (${jugSkip.length} no resueltas)`:''}...`);

      // Detectar colisiones: dos filas del Excel resueltas a la MISMA jugadora real.
      // Esto rompería el upsert (ON CONFLICT no puede afectar la misma fila 2 veces).
      const porJugadora = {};
      for (const j of jugOk) {
        if (!porJugadora[j.jugadora.id]) porJugadora[j.jugadora.id] = [];
        porJugadora[j.jugadora.id].push(j);
      }
      const colisiones = Object.values(porJugadora).filter(arr => arr.length > 1);
      if (colisiones.length > 0) {
        const detalle = colisiones.map(arr =>
          `"${arr[0].jugadora.nombre}" <- [${arr.map(x=>`"${x.nombreRaw}"`).join(', ')}]`
        ).join(' | ');
        throw new Error(`Nombres duplicados resueltos a la misma jugadora: ${detalle}. Corregi el Excel o revisa los aliases guardados antes de publicar.`);
      }
      if (jugOk.length > 0) {
        const statsRows = jugOk.map(j => ({
          partido_id:pd.id, [tablas.jugadorIdField]:j.jugadora.id, equipo_id:j.jugadora.equipoId,
          numero:j.numero, sc:j.sc, sf:j.sf, dc:j.dc, df:j.df,
          tc:j.tc, tf:j.tf, as_:j.as_,
          rd:j.rd, ro:j.ro, fp:j.fp, ft:j.ft, fa:j.fa,
          rb:j.rb, tp:j.tp, pe:j.pe, ca:j.ca, pts:j.pts, val:j.val,
        }));
        const { error:sErr } = await supabase
          .from(tablas.stats)
          .upsert(statsRows, { onConflict:`partido_id,${tablas.jugadorIdField}` });
        if (sErr) throw new Error(`Stats: ${sErr.message}`);

        // Guardar como alias confirmado cualquier match por fuzzy/numero que se
        // haya publicado — antes solo se guardaba si el puntaje daba mejor que
        // 0.35, así que un nombre que quedaba en "confianza media" (0.35-0.38)
        // pedía revisión cada semana para siempre, aunque el mismo match ya se
        // hubiera publicado bien antes. El propio acto de publicar (después de
        // ver la vista previa con el color de advertencia) YA es la confirmación
        // del admin — de acá en adelante ese nombre entra directo sin advertencia.
        const fuzzyMatches = jugOk.filter(j => j.matchMethod==='fuzzy' || j.matchMethod==='numero');
        for (const j of fuzzyMatches) {
          await guardarAlias(j.nombreRaw, j.jugadora.id, j.jugadora.equipoId, ctx);
        }
        if (fuzzyMatches.length>0) addLog(`💾 ${fuzzyMatches.length} aliases guardados para futuras cargas`);

        // MVP
        const mvp = statsRows.reduce((b,r) => !b||r.val>b.val?r:b, null);
        if (mvp) {
          await supabase.from(tablas.partidos).update({ [tablas.mvpField]: mvp[tablas.jugadorIdField] }).eq('id',pd.id);
          const mvpNombre = jugOk.find(j=>j.jugadora?.id===mvp[tablas.jugadorIdField])?.jugadora?.nombre??'';
          addLog(`⭐ MVP: ${mvpNombre} (VAL ${mvp.val})`);
        }

        addLog('🔄 Recalculando promedios...');
        await recalcularPromedios(statsRows.map(r=>r[tablas.jugadorIdField]), tablas);
        addLog('✅ Promedios actualizados');
      }

      // Log de carga
      await supabase.from(tablas.uploadLog).insert({
        fecha_id:fd.id, partido_id:pd.id, archivo_nombre:fileName,
        equipo_local:parsed.equipoLocal, equipo_visit:parsed.equipoVisit,
        jugadoras_ok:jugOk.length, jugadoras_skip:jugSkip.length,
        warnings:[...(parsed.warnings??[]), ...jugSkip.map(j=>`Sin resolver: "${j.nombreRaw}"`)],
      });

      addLog('🎉 ¡Publicado! El sitio ya está actualizado.');
      setStep('listo');
    } catch(err) {
      addLog(`❌ ERROR: ${err.message}`);
      setStep('preview');
    }
  };

  const localJugs = jugadoras.filter(j => j.equipoRaw === parsed?.equipoLocal);
  const visitJugs = jugadoras.filter(j => j.equipoRaw === parsed?.equipoVisit);
  const jugOkCount = jugadoras.filter(j => j.jugadora || j.matchMethod === 'nuevo').length;
  const jugNoCount = jugadoras.filter(j => !j.jugadora && j.matchMethod !== 'nuevo').length;
  const jugWarnCount = jugadoras.filter(j => j.jugadora && j.matchScore > 0.25).length;
  const jugNuevoCount = jugadoras.filter(j => j.matchMethod === 'nuevo').length;

  return (
    <div>
      {/* Stepper */}
      <div style={s.stepper}>
        {[['1','Archivo'],['2','Preview'],['3','Publicar'],['4','Listo']].map(([num,lbl],i)=>{
          const arr=['archivo','preview','publicando','listo'];
          const cur=arr.indexOf(step==='duplicado'?'publicando':step);
          const done=i<cur, active=i===cur;
          return (
            <div key={num} style={s.stepWrap}>
              <div style={{...s.stepDot,background:done?'#22D07A':active?'#F0B429':'#1C2535',color:done||active?'#080C12':'#4A566E'}}>
                {done?'✓':num}
              </div>
              <div style={{color:active?'#F0B429':done?'#22D07A':'#4A566E',fontSize:12,whiteSpace:'nowrap'}}>{lbl}</div>
              {i<3&&<div style={{...s.stepLine,background:done?'#22D07A':'#1C2535'}}/>}
            </div>
          );
        })}
      </div>

      {/* ── PASO 1: Archivo ── */}
      {step==='archivo' && (
        <>
          {categoria === 'masculino' && (
            <div style={s.warnBox}>
              Los jugadores que no existan todavía en la base se van a crear automáticamente al publicar.
            </div>
          )}
          <div style={s.metaRow}>
            <div style={s.metaGroup}>
              <label style={s.label}>N° DE FECHA *</label>
              <input type="number" min="1" value={jornada}
                onChange={e=>setJornada(e.target.value)} style={s.input} placeholder="1"/>
            </div>
            <div style={s.metaGroup}>
              <label style={s.label}>LUGAR (opcional)</label>
              <input type="text" value={lugar}
                onChange={e=>setLugar(e.target.value)} style={s.input} placeholder="Club, cancha..."/>
            </div>
            <div style={s.metaGroup}>
              <label style={s.label}>FECHA DE ESTE PARTIDO (opcional)</label>
              <input type="date" value={fechaPartido}
                onChange={e=>setFechaPartido(e.target.value)} style={s.input}/>
            </div>
          </div>
          <p style={{ color:'#4A566E', fontSize:11, margin:'-8px 0 12px' }}>
            Completala solo si esta fecha se juega en mas de un dia (ej: algunos partidos el sabado y otros el domingo). Si la dejás vacía, se usa la fecha general de la jornada.
          </p>
          <div style={s.dropZone} onClick={()=>fileRef.current.click()}
            onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();handleFile(e);}}>
            <div style={{fontSize:52,marginBottom:10}}>📁</div>
            <p style={{color:'#EEF2F8',margin:'0 0 4px',fontSize:17,fontWeight:600}}>
              {resolving ? 'Resolviendo jugadoras...' : fileName || 'Arrastrá el Excel o hacé click'}
            </p>
            <p style={{color:'#4A566E',fontSize:12,margin:0}}>
              Planilla Torneo Live Basketball (.xlsx)
            </p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{display:'none'}}/>
          </div>
          {parsed?.errores?.length>0 && (
            <div style={s.errBox}>
              {parsed.errores.map((e,i)=><p key={i} style={{margin:'4px 0'}}>❌ {e}</p>)}
            </div>
          )}
        </>
      )}

      {/* ── PASO 2: Preview ── */}
      {step==='preview' && parsed && (
        <>
          {log.some(l => l.startsWith('❌')) && (
            <div style={s.errBox}>
              <p style={{margin:'0 0 4px',fontWeight:700}}>El intento de publicar anterior fallo:</p>
              {log.filter(l => l.startsWith('❌')).map((l,i)=><p key={i} style={{margin:'4px 0'}}>{l}</p>)}
            </div>
          )}
          {/* Marcador */}
          <div style={s.marcadorCard}>
            {[{lbl:parsed.equipoLocal,m:parsed.marcador.local},{lbl:parsed.equipoVisit,m:parsed.marcador.visit}].map(({lbl,m},i)=>(
              <div key={i} style={s.marcSide}>
                <div style={s.marcNombre}>{lbl}</div>
                <div style={s.marcTotal}>{m.total}</div>
                <div style={s.parciales}>
                  {['q1','q2','q3','q4'].map(q=>(
                    <span key={q} style={s.parcial}>
                      <span style={{color:'#4A566E',fontSize:9}}>{q.toUpperCase()} </span>{m[q]}
                    </span>
                  ))}
                  {m.ot>0&&<span style={s.parcial}><span style={{color:'#F0B429',fontSize:9}}>OT </span>{m.ot}</span>}
                </div>
              </div>
            ))}
            <div style={s.vs}>–</div>
          </div>

          {/* % tiro */}
          <div style={s.pctRow}>
            {[{l:'% TL',k:'simples',c:'#22D07A'},{l:'% 2P',k:'dobles',c:'#F0B429'},{l:'% 3P',k:'triples',c:'#60A5FA'}].map(t=>(
              <div key={t.k} style={s.pctCard}>
                <div style={{color:'#6B7A99',fontSize:10,marginBottom:4,textTransform:'uppercase',letterSpacing:.5}}>{t.l}</div>
                <div style={{display:'flex',gap:8,justifyContent:'center',alignItems:'center',fontFamily:"'Bebas Neue',sans-serif",fontSize:20}}>
                  <span style={{color:'#F04060'}}>{parsed.pct.local[t.k]}%</span>
                  <span style={{color:'#4A566E',fontSize:10}}>vs</span>
                  <span style={{color:'#60A5FA'}}>{parsed.pct.visit[t.k]}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Warnings del parser */}
          {parsed.warnings.length>0 && (
            <div style={s.warnBox}>
              <p style={{margin:'0 0 6px',fontWeight:600}}>⚠️ {parsed.warnings.length} advertencia(s) del archivo</p>
              {parsed.warnings.map((w,i)=><p key={i} style={{margin:'2px 0',fontSize:12}}>{w}</p>)}
            </div>
          )}

          {/* Resumen de resolución */}
          <div style={s.resumenBar}>
            <div style={s.resumenItem}>
              <span style={s.resumenDot('#22D07A')}/>
              <span style={{color:'#22D07A',fontWeight:700}}>{jugOkCount} resueltas</span>
            </div>
            {jugNuevoCount>0 && (
              <div style={s.resumenItem}>
                <span style={s.resumenDot('#60A5FA')}/>
                <span style={{color:'#60A5FA'}}>{jugNuevoCount} jugador(es) nuevo(s)</span>
              </div>
            )}
            {jugWarnCount>0 && (
              <div style={s.resumenItem}>
                <span style={s.resumenDot('#F0B429')}/>
                <span style={{color:'#F0B429'}}>{jugWarnCount} confianza media</span>
              </div>
            )}
            {jugNoCount>0 && (
              <div style={s.resumenItem}>
                <span style={s.resumenDot('#F04060')}/>
                <span style={{color:'#F04060'}}>{jugNoCount} no resuelt{categoria==='masculino'?'os':'as'} (se ignoran)</span>
              </div>
            )}
          </div>

          {/* Tablas por equipo */}
          {[{label:parsed.equipoLocal,jugs:localJugs},{label:parsed.equipoVisit,jugs:visitJugs}].map(({label,jugs})=>(
            <div key={label} style={{marginBottom:28}}>
              <div style={s.teamLabel}>
                {label}
                <span style={{color:'#4A566E',fontSize:13,fontFamily:'Barlow Condensed',marginLeft:10}}>
                  {jugs.filter(j=>j.jugadora||j.matchMethod==='nuevo').length}/{jugs.length} jugadoras
                </span>
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      {['#','Nombre plantel (Excel)','PTS','VAL','TL C/F','2P C/F','3P C/F','AS','RD','RO','ROB','TAP','PÉR','FP'].map(h=>(
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {jugs.map((j,i)=>{
                      const esNuevo = j.matchMethod === 'nuevo';
                      const color = (!j.jugadora && !esNuevo) ? '#F04060' : esNuevo ? '#60A5FA' : j.matchScore>0.25 ? '#F0B429' : '#EEF2F8';
                      const methodBadge = esNuevo ? '🆕' : !j.jugadora ? '❌' : j.matchMethod==='alias' ? '🔗' : j.matchScore<0.15 ? '✅' : '~';
                      return (
                        <tr key={i} style={{background:i%2===0?'#0E1420':'#141C2A',opacity:(j.jugadora||esNuevo)?1:0.4}}>
                          <td style={s.td}>{j.numero??'–'}</td>
                          <td style={{...s.td,textAlign:'left',minWidth:180}}>
                            <div style={{color,fontWeight:600,fontSize:13}}>
                              {methodBadge} {j.jugadora ? j.jugadora.nombre : j.nombreRaw}
                            </div>
                            <div style={{color:'#4A566E',fontSize:10}}>
                              {j.nombreRaw}
                              {j.matchMethod && (j.jugadora || esNuevo) && (
                                <span style={{marginLeft:6,color: j.matchMethod==='alias'?'#22D07A':'#6B7A99'}}>
                                  [{j.matchMethod}]
                                </span>
                              )}
                            </div>
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
                      );
                    })}
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

      {/* ── DUPLICADO ── */}
      {step==='duplicado' && duplicate && (
        <div style={s.dupeBox}>
          <div style={{fontSize:48,marginBottom:12}}>⚠️</div>
          <h3 style={{color:'#F0B429',margin:'0 0 12px',fontFamily:"'Bebas Neue',sans-serif",fontSize:26}}>
            PARTIDO YA CARGADO
          </h3>
          <p style={{color:'#EEF2F8',marginBottom:8}}>
            Ya existe un partido entre estos equipos en la Fecha {jornada}:
          </p>
          <div style={{background:'#141C2A',border:'1px solid #1C2535',borderRadius:8,padding:'14px',marginBottom:20,textAlign:'center'}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,color:'#F0B429'}}>
              {duplicate.puntos_local} — {duplicate.puntos_visit}
            </div>
            <div style={{color:'#6B7A99',fontSize:11,marginTop:4}}>
              ID {duplicate.id} · {duplicate.estado}
            </div>
          </div>
          <p style={{color:'#F04060',fontSize:13,marginBottom:20}}>
            Si sobreescribís, se borran el partido anterior y todas sus estadísticas.
          </p>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            <button onClick={()=>handlePublish(true)}
              style={{...s.btnPublish,background:'linear-gradient(135deg,#F04060,#B91C1C)',maxWidth:220}}>
              🗑️ SOBREESCRIBIR
            </button>
            <button onClick={()=>setStep('preview')} style={s.btnCancel}>
              ← Volver al preview
            </button>
          </div>
        </div>
      )}

      {/* ── PUBLICANDO ── */}
      {step==='publicando' && (
        <div style={s.logBox}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:'#F0B429',marginBottom:16,letterSpacing:1}}>
            Publicando partido...
          </div>
          {log.map((l,i)=>(
            <div key={i} style={{padding:'3px 0',fontSize:13,fontFamily:'Barlow Condensed',letterSpacing:.3,
              color:l.startsWith('❌')?'#F04060':l.startsWith('✅')||l.startsWith('🎉')||l.startsWith('⭐')?'#22D07A':l.startsWith('⚠️')?'#F0B429':'#EEF2F8'}}>
              {l}
            </div>
          ))}
          <div style={{marginTop:16,color:'#4A566E',fontSize:12}}>
            No cerrés esta ventana...
          </div>
        </div>
      )}

      {/* ── LISTO ── */}
      {step==='listo' && parsed && (
        <div style={s.successBox}>
          <div style={{fontSize:60,marginBottom:12}}>🎉</div>
          <h3 style={{color:'#22D07A',margin:'0 0 8px',fontFamily:"'Bebas Neue',sans-serif",fontSize:30,letterSpacing:1}}>
            ¡PUBLICADO!
          </h3>
          <p style={{color:'#EEF2F8',fontSize:18,margin:'0 0 4px'}}>
            {parsed.equipoLocal} <strong style={{color:'#F0B429'}}>{parsed.marcador.local.total}</strong>
            {' — '}
            <strong style={{color:'#F0B429'}}>{parsed.marcador.visit.total}</strong> {parsed.equipoVisit}
          </p>
          <div style={{display:'flex',gap:6,justifyContent:'center',margin:'10px 0 4px',flexWrap:'wrap'}}>
            {['q1','q2','q3','q4'].map(q=>(
              <span key={q} style={{background:'#141C2A',padding:'2px 10px',borderRadius:4,fontSize:12,color:'#6B7A99',fontFamily:"'Barlow Condensed'"}}>
                {q.toUpperCase()} {parsed.marcador.local[q]}-{parsed.marcador.visit[q]}
              </span>
            ))}
          </div>
          <p style={{color:'#6B7A99',margin:'10px 0 4px',fontSize:13}}>
            {jugOkCount} jugadoras · promedios actualizados · sitio en tiempo real
          </p>
          {log.filter(l=>l.startsWith('⭐')).map((l,i)=>(
            <p key={i} style={{color:'#F0B429',fontSize:14,margin:'4px 0'}}>{l}</p>
          ))}
          <div style={{display:'flex',gap:12,justifyContent:'center',marginTop:20}}>
            <button onClick={reset} style={{...s.btnPublish,maxWidth:260}}>
              + Cargar otro partido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  stepper:    {display:'flex',alignItems:'center',marginBottom:28,gap:0},
  stepWrap:   {display:'flex',alignItems:'center',gap:6,flex:1},
  stepDot:    {width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0},
  stepLine:   {flex:1,height:2,borderRadius:1},
  metaRow:    {display:'flex',gap:16,marginBottom:20,flexWrap:'wrap'},
  metaGroup:  {display:'flex',flexDirection:'column',gap:6,flex:1,minWidth:140},
  label:      {fontSize:10,fontWeight:700,letterSpacing:2,color:'#4A566E'},
  input:      {padding:'11px 12px',background:'#141C2A',border:'1px solid #1C2535',borderRadius:8,color:'#EEF2F8',fontSize:14,outline:'none'},
  dropZone:   {border:'2px dashed #1C2535',borderRadius:14,padding:'2.5rem 1rem',textAlign:'center',cursor:'pointer',marginBottom:20,transition:'border-color .2s'},
  errBox:     {background:'rgba(240,64,96,.1)',border:'1px solid rgba(240,64,96,.3)',borderRadius:8,padding:'12px 16px',marginBottom:16,color:'#F04060',fontSize:14},
  warnBox:    {background:'rgba(240,180,41,.08)',border:'1px solid rgba(240,180,41,.25)',borderRadius:8,padding:'12px 16px',marginBottom:16,color:'#F0B429',fontSize:13},
  marcadorCard:{background:'#0E1420',border:'1px solid #1C2535',borderRadius:14,padding:'1.5rem',display:'flex',alignItems:'center',justifyContent:'space-around',marginBottom:16,gap:16,flexWrap:'wrap'},
  marcSide:   {flex:1,textAlign:'center',minWidth:120},
  marcNombre: {fontFamily:"'Bebas Neue',sans-serif",fontSize:17,letterSpacing:1,color:'#EEF2F8',marginBottom:4},
  marcTotal:  {fontFamily:"'Bebas Neue',sans-serif",fontSize:62,color:'#F0B429',lineHeight:1},
  parciales:  {display:'flex',gap:6,justifyContent:'center',marginTop:6,flexWrap:'wrap'},
  parcial:    {background:'#141C2A',padding:'3px 8px',borderRadius:4,fontSize:13,color:'#EEF2F8'},
  vs:         {fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:'#4A566E'},
  pctRow:     {display:'flex',gap:12,marginBottom:16,flexWrap:'wrap'},
  pctCard:    {flex:1,minWidth:90,background:'#0E1420',border:'1px solid #1C2535',borderRadius:8,padding:'10px 12px',textAlign:'center'},
  resumenBar: {display:'flex',gap:16,marginBottom:16,flexWrap:'wrap',alignItems:'center',padding:'10px 14px',background:'rgba(255,255,255,.03)',borderRadius:8,border:'1px solid #1C2535'},
  resumenItem:{display:'flex',alignItems:'center',gap:6},
  resumenDot: c=>({width:8,height:8,borderRadius:'50%',background:c,flexShrink:0}),
  teamLabel:  {fontFamily:"'Bebas Neue',sans-serif",fontSize:19,letterSpacing:1,color:'#EEF2F8',marginBottom:10,paddingBottom:8,borderBottom:'1px solid #1C2535'},
  table:      {width:'100%',borderCollapse:'collapse',fontSize:12},
  th:         {background:'#141C2A',color:'#6B7A99',padding:'8px 10px',textAlign:'center',fontSize:10,whiteSpace:'nowrap'},
  td:         {padding:'7px 8px',textAlign:'center',color:'#EEF2F8',borderBottom:'1px solid #1C2535'},
  btnPublish: {flex:1,maxWidth:280,padding:'13px',background:'linear-gradient(135deg,#F0B429,#FF6B2B)',border:'none',borderRadius:10,color:'#080C12',fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:1,cursor:'pointer'},
  btnCancel:  {padding:'10px 20px',background:'transparent',border:'1px solid #4A566E',borderRadius:8,color:'#6B7A99',cursor:'pointer',fontSize:14},
  logBox:     {background:'#0E1420',border:'1px solid #1C2535',borderRadius:12,padding:'1.5rem',minHeight:200},
  successBox: {textAlign:'center',padding:'3rem 1rem',background:'rgba(34,208,122,.05)',border:'1px solid rgba(34,208,122,.2)',borderRadius:14},
  dupeBox:    {textAlign:'center',padding:'2.5rem 1.5rem',background:'rgba(240,180,41,.05)',border:'1px solid rgba(240,180,41,.2)',borderRadius:14},
};
