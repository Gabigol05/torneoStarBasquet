import { useState, useRef, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Fuse from 'fuse.js';
import { supabase } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';
import { equiposMasculino } from '../data/masculinoData';
import { TABLAS } from './categoriaAdmin';
import { COPA_LABEL, INSTANCIA_LABEL } from '../lib/fechaLabel';
import { useTemporada } from '../context/TemporadaContext';
import { recalcularPromedios } from '../lib/recalcularPromedios';

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
  // "La Reserva V.A" es como el excel de este partido escribió a Villa
  // Azalais (reporte de Alvaro, 25/08) — mismo criterio que "Ene Ene"/"NN"
  // arriba: no es un typo, es un nombre totalmente distinto al oficial.
  'la reserva v.a': 'villa azalais',
  'la reserva va':  'villa azalais',
};
const canonEquipo = texto => {
  const n = normStr(texto);
  return ALIAS_EQUIPOS_TEXTO[n] ?? n;
};
// Busca un equipo por texto: primero por los alias cargados desde el panel
// (Herramientas → Alias de Equipos, `equipoAliasMap`: texto normalizado ->
// id de equipo), después por igualdad exacta tolerando los alias
// hardcodeados de arriba, y si no hay hit, recién ahí cae al fuzzy matching.
function buscarEquipo(texto, fuseEq, lista, equipoAliasMap = {}) {
  if (!texto) return null;
  const aliasId = equipoAliasMap[normStr(texto)];
  if (aliasId) {
    const porAlias = lista.find(e => e.id === aliasId);
    if (porAlias) return porAlias;
  }
  const canon = canonEquipo(texto);
  const exacto = lista.find(e => normStr(e.name) === canon);
  if (exacto) return exacto;
  return fuseEq.search(texto)[0]?.item ?? null;
}

// ─── Índice fuzzy de JUGADORAS/ES — ambas categorías vienen de la base ────────
// Femenino usaba un roster fijo (data/femeninoData.js): si alguien se
// agregaba directo en la base y no también en ese archivo (pasó más de una
// vez), el buscador de nombres del Excel no la reconocía. Ahora el índice se
// arma en vivo desde jugadoras_femenino, igual que ya se hacía con
// jugadores_masculino, así el buscador siempre tiene el plantel real.
function buildFuseJugadores(lista) {
  return new Fuse(lista, {
    // Antes t0/t1 (nombre/apellido por separado) pesaban casi lo mismo que
    // el nombre completo (0.35+0.35 vs 0.4) — así, dos hermanos que comparten
    // el apellido podían empatar casi en punteria con la persona real porque
    // el apellido solo ya explicaba gran parte del score. Ahora "nombreNorm"
    // (nombre y apellido juntos) es la señal dominante — quien coincide en
    // el nombre completo gana con claridad; los tokens sueltos quedan como
    // ayuda menor (reordenar "Apellido Nombre", tolerar una tilde/typo), no
    // como algo que por sí solo pueda ganarle a una coincidencia completa.
    keys: [
      { name:'nombreNorm', weight:0.7 },
      { name:'t0', weight:0.15 }, { name:'t1', weight:0.15 },
      { name:'t2', weight:0.05 }, { name:'t3', weight:0.05 },
    ],
    threshold: 0.38, minMatchCharLength: 2, includeScore: true,
  });
}

// Arma la entrada de indice fuzzy para un jugador/a recien creado/a o
// traido/a de la base, con el mismo formato en ambos lugares (fetch inicial
// y alta al publicar) para no duplicar la logica. `equipos` es el roster de
// equipos de la categoria (equiposMasculino o equiposFemenino) — solo se usa
// para resolver el nombre del equipo a mostrar en el listado de resolucion.
function formatJugador(j, equipos) {
  const partes = (j.nombre ?? '').trim().split(/\s+/);
  const equipoNombre = equipos.find(e => e.id === j.equipo_id)?.name ?? j.equipo_id;
  return {
    id: j.id, nombre: j.nombre, nombreNorm: normStr(j.nombre),
    equipoId: j.equipo_id, equipo: equipoNombre, equipoNorm: normStr(equipoNombre),
    // Numero de camiseta — clave para desambiguar compañeros de equipo con
    // nombres parecidos (ver resolverJugadora), ya que a diferencia del
    // nombre es un dato inequívoco fila a fila.
    numero: j.numero ?? null,
    t0: normStr(partes[0] ?? ''), t1: normStr(partes[1] ?? ''),
    t2: normStr(partes[2] ?? ''), t3: normStr(partes[3] ?? ''),
  };
}
// Alias con el nombre viejo — lo siguen llamando así en algunos lugares de
// más abajo del archivo.
const formatJugadorMasc = j => formatJugador(j, equiposMasculino);
const formatJugadoraFem = j => formatJugador(j, equiposFemenino);

// ─── Resolver jugadora: aliases → fuzzy → nuevo jugador ──────────────────────
const aliasesCache = { femenino: null, masculino: null };

// Trae TODAS las filas (en bloques de 1000 — Supabase no devuelve más de
// 1000 por consulta). Los alias y el plantel ya rondan las 500 filas por
// categoría y siguen creciendo: sin paginar, pasado ese límite se perdían
// en silencio y aparecían jugadores/as duplicados/as.
async function traerTodo(tabla) {
  let desde = 0, out = [];
  for (;;) {
    const { data, error } = await supabase.from(tabla).select('*').order('id', { ascending: true }).range(desde, desde + 999);
    if (error) return { data: null, error };
    out = out.concat(data ?? []);
    if ((data ?? []).length < 1000) return { data: out, error: null };
    desde += 1000;
  }
}

async function cargarAliases(categoria, tablas) {
  if (aliasesCache[categoria]) return aliasesCache[categoria];
  const { data, error } = await traerTodo(tablas.aliases);
  if (error) {
    // No cachear un fallo — si se cachea un [] acá, el resto de la sesión
    // queda "sin aliases" sin ninguna pista de que en realidad la consulta
    // falló (antes esto se ignoraba en silencio).
    console.warn(`[cargarAliases] ${categoria}:`, error.message);
    return [];
  }
  aliasesCache[categoria] = data ?? [];
  return aliasesCache[categoria];
}

async function resolverJugadora(nombreRaw, equipoHint, numeroJugadora, ctx) {
  const { categoria, tablas, fuseEq, fuseJugadoras, todasJugadoras } = ctx;
  if (!nombreRaw) return { jugadora: null, method: 'empty', score: 1 };
  const clean    = normStr(String(nombreRaw));
  const aliases  = await cargarAliases(categoria, tablas);
  const eqMatch  = equipoHint ? buscarEquipo(equipoHint, fuseEq, ctx.equipos, ctx.equipoAliasMap) : null;
  const equipoId = eqMatch?.id;

  // 1️⃣ Lookup exacto en tabla de aliases (prioridad máxima)
  const aliasExacto = aliases.find(a =>
    a.alias_norm === clean && (!equipoId || a.equipo_id === equipoId)
  );
  if (aliasExacto) {
    const jugId = aliasExacto[tablas.jugadorIdField];
    const jug = todasJugadoras.find(j => j.id === jugId);
    if (jug) return { jugadora: jug, method: 'alias', score: 0, equipoId: jug.equipoId };
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

  // Unificar candidatos del orden normal e invertido (mismo/a jugador/a puede
  // aparecer en los dos) quedándonos con el mejor score de cada uno.
  const porId = new Map();
  for (const r of [...candidatosNormal, ...candidatosInvertido]) {
    const prev = porId.get(r.item.id);
    if (!prev || (r.score ?? 1) < (prev.score ?? 1)) porId.set(r.item.id, r);
  }
  const candidatos = [...porId.values()].sort((a,b) => (a.score??1)-(b.score??1));

  if (candidatos.length === 0) {
    // Si no existe todavía en el plantel, se crea al publicar (no se
    // descarta) — antes esto era solo para masculino; femenino se trataba
    // como plantel cerrado, así que un nombre no reconocido quedaba en
    // "not_found" sin poder cargarse. Ahora las dos categorías se comportan
    // igual: si hay error de tipeo o duplicado, Alvaro lo corrige a mano
    // desde el selector manual de esta misma pantalla (o desde Fusionar
    // jugadores / Plantel después).
    if (equipoId) {
      return { jugadora: null, method: 'nuevo', score: 0, nuevoEquipoId: equipoId, equipoId };
    }
    return { jugadora: null, method: 'not_found', score: 1, equipoId };
  }

  const top    = candidatos[0];
  const second = candidatos[1];

  // 3️⃣ Desambiguar compañeros de equipo con nombres parecidos (típicamente
  // hermanos: mismo apellido, distinto nombre — ej "Peleteiro"). Antes esto
  // era un caso hardcodeado (NUMERO_MAP) para un solo equipo de femenino;
  // ahora es genérico para las dos categorías y cualquier equipo. Se detecta
  // comparando si el candidato top y el segundo comparten algún token de
  // nombre (nombre o apellido) — en ese caso el score de Fuse suele estar
  // dominado por esa parte compartida y NO alcanza para confiar ciegamente
  // en el primero.
  const tokensTop = [top.item.t0, top.item.t1, top.item.t2, top.item.t3].filter(Boolean);
  const compartenToken = !!second && tokensTop.some(tok =>
    [second.item.t0, second.item.t1, second.item.t2, second.item.t3].includes(tok)
  );

  if (compartenToken) {
    // 3a) Número de camiseta: dato inequívoco fila a fila, se prueba primero.
    if (numeroJugadora != null) {
      const porNumero = candidatos.filter(c => c.item.numero != null && Number(c.item.numero) === Number(numeroJugadora));
      if (porNumero.length === 1) {
        return { jugadora: porNumero[0].item, method: 'numero', score: 0.1, equipoId, wasAmbiguous: true };
      }
    }
    // 3b) Si no hay número (o no alcanza a desambiguar), solo se confía en el
    // top si la diferencia de score contra el segundo es decisiva. Si no,
    // mejor preguntar que adivinar y terminar mezclando a dos personas
    // distintas — se marca "ambiguo" para resolver a mano en el preview.
    const gap = (second.score ?? 1) - (top.score ?? 0);
    if (gap < 0.2) {
      return {
        jugadora: null, method: 'ambiguo', score: top.score ?? 0.5, equipoId, wasAmbiguous: true,
        candidatosAmbiguos: candidatos.slice(0, 4).map(c => ({ id: c.item.id, nombre: c.item.nombre, numero: c.item.numero })),
      };
    }
  }

  return { jugadora: top.item, method: 'fuzzy', score: top.score ?? 0.5, equipoId, wasAmbiguous: compartenToken };
}

// ─── Guardar alias nuevo si es un match fuzzy confirmado ─────────────────────
// Devuelve el error (o null) en vez de tragárselo — antes un fallo acá era
// invisible: el partido se publicaba igual, pero el alias nunca quedaba
// guardado y el mismo nombre volvía a pedir revisión cada semana sin ninguna
// pista de por qué "no aprendía".
// `sobrescribir`: para una reasignación MANUAL (✏️). Antes siempre se usaba
// ignoreDuplicates, así que si un alias viejo apuntaba a la persona
// equivocada, corregirlo a mano no se guardaba nunca y el error volvía a
// pasar en la carga siguiente.
async function guardarAlias(alias, jugadoraId, equipoId, ctx, sobrescribir = false) {
  const { categoria, tablas } = ctx;
  const aliasNorm = normStr(alias);
  const { error } = await supabase.from(tablas.aliases).upsert({
    alias, alias_norm: aliasNorm, [tablas.jugadorIdField]: jugadoraId,
    equipo_id: equipoId, confirmado: true,
  }, { onConflict: 'alias_norm,equipo_id', ignoreDuplicates: !sobrescribir });
  if (error) return error;
  aliasesCache[categoria] = null; // invalidar cache
  return null;
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
  //
  // ⚠️ FIX BUG OT (reporte de Alvaro: partido con tiempo extra publicado
  // como 111-110 en vez de 61-60). La columna "OT" del Excel sigue la MISMA
  // convención acumulada que 1º/2º/3º/4º (ej: 4º=50, OT=60 → se jugaron 10
  // puntos de tiempo extra), pero acá se guardaba tal cual venía — un valor
  // todavía acumulado, no el parcial del período extra. La tabla en Supabase
  // NO guarda puntos_local/puntos_visit directo: un trigger (fn_sync_partido,
  // ver create_tables.sql/create_tables_masculino.sql) los recalcula siempre
  // como q1+q2+q3+q4+ot. Con "ot" todavía acumulado, el trigger sumaba de
  // vuelta los puntos de los 4 cuartos que ya estaban adentro de ese
  // acumulado (50 + 60 = 110 en vez de 60) — de ahí el resultado inflado.
  // Se convierte "ot" a parcial igual que q2/q3/q4 (acumulado de OT menos el
  // acumulado del 4º cuarto), y así queda bien para CUALQUIER partido con
  // tiempo extra de acá en adelante. Partidos sin OT no cambian: la celda
  // OT viene vacía/0 → parcial 0, igual que antes.
  const rL=rows[marcRow+1], rV=rows[marcRow+2];
  if (rL) {
    res.equipoLocal = String(rL[M.equipo]??'').trim();
    const q1=n(rL[M.q1]), q2acum=n(rL[M.q2acum]), q3acum=n(rL[M.q3acum]), q4acum=n(rL[M.q4acum]), otAcum=n(rL[M.ot]);
    const par = acumAParcial(q1, q2acum, q3acum, q4acum);
    const ot = otAcum>0 ? otAcum-q4acum : 0;
    res.marcador.local = { ...par, ot, total:n(rL[M.total]) };
  }
  if (rV) {
    res.equipoVisit = String(rV[M.equipo]??'').trim();
    const q1=n(rV[M.q1]), q2acum=n(rV[M.q2acum]), q3acum=n(rV[M.q3acum]), q4acum=n(rV[M.q4acum]), otAcum=n(rV[M.ot]);
    const par = acumAParcial(q1, q2acum, q3acum, q4acum);
    const ot = otAcum>0 ? otAcum-q4acum : 0;
    res.marcador.visit = { ...par, ot, total:n(rV[M.total]) };
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
  // _rowId: id estable por fila del Excel, independiente del orden en que se
  // termine mostrando (se filtra por equipo para la tabla del preview). Sin
  // esto, reasignar manualmente una jugadora en el preview (ver ✏️ más abajo)
  // podía terminar editando la fila equivocada.
  let rowIdSeq = 0;
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
      // ⚠️ FIX (revisión general): antes solo se cambiaba de equipo si el
      // texto coincidía con el del marcador — si la planilla escribía el
      // equipo con un apodo en el bloque de stats (cargado en Alias de
      // Equipos), los/las visitantes quedaban como del equipo local y se
      // creaban como jugadores/as nuevos/as del equipo equivocado. Ahora el
      // nombre que aparece en la columna Equipo SIEMPRE marca el comienzo del
      // bloque de ese equipo; qué equipo es se resuelve después con los alias
      // del panel (buscarEquipo), igual que el marcador.
      equipoActual = eq;
    }
    const nombre = r[C.nombre];
    const numero = r[C.numero];
    const nomStr = String(nombre??'').trim();
    if (!nomStr || nomStr==='null' || typeof nombre==='number') continue;

    const numParsed = typeof numero==='number' ? numero : (parseInt(String(numero??''))||null);
    const ptsCal   = n(r[C.sc])+n(r[C.dc])*2+n(r[C.tc])*3;
    const ptsXls   = n(r[C.pts]);

    res.jugadorasBruto.push({
      _rowId: rowIdSeq++,
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
    resolved.push({
      ...j, jugadora: r.jugadora, matchMethod: r.method, matchScore: r.score, nuevoEquipoId: r.nuevoEquipoId,
      equipoIdResuelto: r.equipoId, candidatosAmbiguos: r.candidatosAmbiguos, wasAmbiguous: r.wasAmbiguous,
    });
  }
  return resolved;
}

// ─── Recalcular promedios (fallback si el trigger no está activo) ─────────────
// ⚠️ FIX (importante): desde que existen temporadas, `estadisticas_*` tiene
// clave compuesta (jugador_id, temporada_id) — pero esta función seguía
// haciendo upsert con `onConflict: idField` (una sola columna) y sin mandar
// `temporada_id` en absoluto, que además es NOT NULL. Postgres rechaza ese
// upsert siempre (ni el conflict target coincide con la constraint real, ni
// se puede insertar sin temporada_id) — y como el resultado nunca se leía
// (ni `error` ni `data` se destructuraban), fallaba en silencio: el log
// mostraba igual "✅ Promedios actualizados" y "🎉 ¡Publicado!" aunque el
// promedio de la jugadora NO se hubiera guardado. Además traía TODOS los
// partidos de la jugadora sin filtrar por temporada, así que si algo
// llegaba a guardar, mezclaba temporadas distintas en el mismo promedio.
// Ahora: se filtra por la temporada activa (vía partido -> fecha ->
// temporada, que es como se relacionan esas tablas), se manda temporada_id,
// se usa el onConflict compuesto real, y un error acá corta la publicación
// en vez de mentir que salió bien.
// (recalcularPromedios ahora vive en lib/recalcularPromedios.js — la usa
// también Partidos al borrar un partido.)

// ─── UI: logo de equipo con fallback a iniciales (mismo criterio que
// TeamAvatar en Dashboard.jsx — si el equipo no tiene logo cargado, o la
// imagen no llega a bajar, nunca se queda vacío) ──────────────────────────────
function LogoDot({ nombre, logo, color = '#4A566E', size = 32, radius = '50%' }) {
  const iniciales = (nombre || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0, position: 'relative', overflow: 'hidden',
      background: `${color}33`, border: `1.5px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.37, fontWeight: 700, color: '#EEF2F8', fontFamily: "'Barlow Condensed',sans-serif",
    }}>
      {iniciales}
      {logo && (
        <img src={logo} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.target.style.display = 'none'; }} />
      )}
    </div>
  );
}

// ─── UI: iconos inline (sin librería) ─────────────────────────────────────────
const svgProps = size => ({ viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', width: size, height: size });
function IcoCalendar({ size = 14 }) { return <svg {...svgProps(size)}><rect x="3" y="4" width="18" height="18" rx="3" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>; }
function IcoPin({ size = 14 }) { return <svg {...svgProps(size)}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z" /><circle cx="12" cy="10" r="3" /></svg>; }
function IcoTrophy({ size = 17 }) { return <svg {...svgProps(size)}><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0V4z" /><path d="M17 5h3a2 2 0 01-2 4M7 5H4a2 2 0 002 4" /></svg>; }
function IcoUpload({ size = 32 }) { return <svg {...svgProps(size)}><path d="M12 15V3M7 8l5-5 5 5" /><path d="M3 15v4a2 2 0 002 2h14a2 2 0 002-2v-4" /></svg>; }
function IcoHistory({ size = 13 }) { return <svg {...svgProps(size)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>; }
function IcoPlus({ size = 18 }) { return <svg {...svgProps(size)} strokeWidth={2.4}><path d="M12 5v14M5 12h14" /></svg>; }
function IcoStar({ size = 18 }) { return <svg {...svgProps(size)} strokeWidth={2.4}><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" /></svg>; }

// ─── UI: estilos que necesitan hover/focus-within/animaciones (imposibles con
// solo `style` inline en React) — mismo criterio que el <style> de AdminPanel.jsx.
const XLU_CSS = `
.xlu-meta{ transition:border-color .18s, background .18s; }
.xlu-meta:hover{ border-color:#24304A; background:#0E1524; }
.xlu-meta:focus-within{ border-color:rgba(240,180,41,.55); box-shadow:0 0 0 3px rgba(240,180,41,.12); }
.xlu-meta input::placeholder{ color:#4A566E; font-weight:500; }
.xlu-meta input::-webkit-calendar-picker-indicator{ filter:invert(.6); cursor:pointer; }
.xlu-switch i{ position:absolute; top:2px; left:2px; width:18px; height:18px; border-radius:50%; background:#4A566E; transition:.2s; display:block; }
.xlu-po.on .xlu-switch{ background:linear-gradient(135deg,#F0B429,#FF6B2B); border-color:transparent; }
.xlu-po.on .xlu-switch i{ left:20px; background:#241900; }
.xlu-drop{ transition:transform .2s, box-shadow .2s; }
.xlu-drop:hover{ transform:translateY(-2px); box-shadow:0 20px 50px -25px rgba(240,180,41,.35); }
.xlu-drop.drag{
  background:linear-gradient(rgba(240,180,41,.10),rgba(240,180,41,.10)) padding-box,
    linear-gradient(120deg,#F0B429,#FFD166,#F0B429) border-box !important;
  box-shadow:0 0 0 6px rgba(240,180,41,.10), 0 24px 60px -28px rgba(240,180,41,.55); transform:scale(1.01);
}
.xlu-drop-ic{ animation:xluFloat 3.2s ease-in-out infinite; }
.xlu-drop.drag .xlu-drop-ic{ background:linear-gradient(135deg,#F0B429,#FF6B2B) !important; border-color:transparent !important; animation:none; }
.xlu-drop.drag .xlu-drop-ic svg{ stroke:#241900 !important; }
.xlu-drop.drag h3{ color:#F0B429 !important; }
@keyframes xluFloat{ 0%,100%{ transform:translateY(0);} 50%{ transform:translateY(-6px);} }
.xlu-spin{ animation:xluSpin .8s linear infinite; }
@keyframes xluSpin{ to{ transform:rotate(360deg); } }
.xlu-progress i{ animation:xluPulseW 1.4s ease-in-out infinite; }
@keyframes xluPulseW{ 0%,100%{ width:35%;} 50%{ width:75%; } }
.xlu-rec-row{ transition:border-color .15s, background .15s; }
.xlu-rec-row:hover{ border-color:#24304A; background:#121A28; }
.xlu-table tbody tr:hover{ background:#141F30 !important; }
.xlu-table tbody tr:hover .xlu-edit{ opacity:1; }
.xlu-edit{ opacity:0; transition:opacity .15s, background .15s, color .15s; }
.xlu-edit:hover{ background:#141C2A; color:#F0B429 !important; }
.xlu-btn-publish{ transition:transform .15s; }
.xlu-btn-publish:hover{ transform:translateY(-1px); }
.xlu-btn-cancel{ transition:border-color .15s, color .15s; }
.xlu-btn-cancel:hover{ border-color:#4A566E; color:#EEF2F8; }
`;

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ExcelUpload({ categoria: categoriaProp, setCategoria: setCategoriaProp } = {}) {
  const [categoriaLocal, setCategoriaLocal] = useState('femenino');
  const categoria    = categoriaProp ?? categoriaLocal;
  const setCategoria = setCategoriaProp ?? setCategoriaLocal;
  const tablas = TABLAS[categoria];
  const roster = categoria === 'masculino' ? equiposMasculino : equiposFemenino;
  const fuseEq = categoria === 'masculino' ? fuseEqMasc : fuseEqFem;
  // Todo lo que se publica desde acá cae en la temporada ACTIVA — de la
  // categoría que está elegida en este momento (femenino y masculino tienen
  // cada una la suya, ver TemporadaContext).
  const { temporadaActivaId: temporadaActivaIdPorCategoria } = useTemporada();
  const temporadaActivaId = temporadaActivaIdPorCategoria[categoria];

  // Índice de jugadores/as para fuzzy matching — se trae de la base cada vez
  // que se cambia de categoría, para las dos categorías por igual (antes
  // femenino usaba un roster fijo en el código, que se podía desactualizar
  // si alguien se agregaba directo en la base).
  const [jugadoresMasc, setJugadoresMasc] = useState([]);
  const [jugadorasFem,  setJugadorasFem]  = useState([]);
  // ⚠️ FIX: antes esta consulta no revisaba `error` — si fallaba (ej: corte
  // momentáneo de conexión), el índice de jugadoras/es quedaba VACÍO en
  // silencio, y cada nombre del Excel aparecía como "no encontrado" sin
  // ninguna pista de que la causa real era que no se pudo traer el plantel.
  const [errorPlantel, setErrorPlantel] = useState('');
  // Hasta que el plantel no esté cargado no se deja soltar un Excel: con el
  // índice vacío, cada fila se tomaba como jugador/a NUEVO/A y se creaban
  // duplicados de todo el equipo.
  const [plantelListo, setPlantelListo] = useState(false);
  useEffect(() => {
    // Al entrar a esta pantalla se descarta la caché de alias (pudieron
    // cambiar en Alias / Fusionar jugadores mientras tanto).
    aliasesCache[categoria] = null;
    (async () => {
      setErrorPlantel('');
      setPlantelListo(false);
      const { data, error } = await traerTodo(tablas.jugadores);
      if (error) {
        setErrorPlantel(`No se pudo traer el plantel de ${categoria}: ${error.message} — el buscador de nombres del Excel va a fallar hasta que esto se resuelva. Recargá la página o probá de nuevo en un momento.`);
        return;
      }
      if (categoria === 'masculino') setJugadoresMasc(data.map(formatJugadorMasc));
      else setJugadorasFem(data.map(formatJugadoraFem));
      setPlantelListo(true);
    })();
  }, [categoria, tablas.jugadores]);

  // Alias de EQUIPO cargados desde el panel (Herramientas → Alias de
  // Equipos) — ej: "La Reserva V.A" -> Villa Azalais. Se suman a los alias
  // hardcodeados en ALIAS_EQUIPOS_TEXTO (que quedan para casos históricos
  // conocidos tipo "Ene Ene"/"NN"), pero estos los puede cargar Alvaro solo,
  // sin depender de un cambio de código cada vez que aparece un apodo nuevo.
  const [equipoAliasMap, setEquipoAliasMap] = useState({});
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from(tablas.equipoAliases).select('alias,equipo_id');
      if (error) { console.warn('[ExcelUpload] equipo_aliases:', error.message); setEquipoAliasMap({}); return; }
      setEquipoAliasMap(Object.fromEntries((data ?? []).map(r => [normStr(r.alias), r.equipo_id])));
    })();
  }, [categoria, tablas.equipoAliases]);

  const todasJugadoras  = categoria === 'masculino' ? jugadoresMasc : jugadorasFem;
  const fuseJugadoras   = useMemo(() => buildFuseJugadores(todasJugadoras), [todasJugadoras]);
  const ctx = { categoria, tablas, fuseEq, fuseJugadoras, todasJugadoras, equipos: roster, equipoAliasMap };

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
  // Playoffs — mismas claves que PartidosManager.jsx, PlayoffsBracket.jsx y
  // add_playoffs.sql. Este es el flujo que se usa para cargar los partidos
  // realmente jugados (con planilla de stats), así que es el lugar más
  // importante para poder tildar "Es Playoff" al publicar.
  const [esPlayoff, setEsPlayoff] = useState(false);
  const [copaPO,    setCopaPO]    = useState('');
  const [instanciaPO, setInstanciaPO] = useState('');
  const [llavePO,   setLlavePO]   = useState('');
  // Otros partidos YA cargados con esta misma Copa+Instancia (ej: la otra
  // semifinal de Copa de Oro) — se busca apenas se elige Copa+Instancia, para
  // poder avisar si la Llave que se va a usar ya está ocupada. Sin este
  // aviso era muy fácil cargar dos semifinales con la misma Llave (o sin
  // Llave): las dos quedan cargadas en la base, pero el cuadro público solo
  // puede mostrar una por número de llave — la otra desaparece del cuadro
  // sin ningún error, y la Final nunca se termina de armar porque le falta
  // el segundo ganador.
  const [crucesPO, setCrucesPO] = useState([]);
  useEffect(() => {
    let cancelado = false;
    if (!esPlayoff || !copaPO || !instanciaPO || !temporadaActivaId) { setCrucesPO([]); return; }
    (async () => {
      const { data: fechasT } = await supabase.from(tablas.fechas).select('id').eq('temporada_id', temporadaActivaId);
      const ids = (fechasT ?? []).map(f => f.id);
      if (ids.length === 0) { if (!cancelado) setCrucesPO([]); return; }
      const { data } = await supabase.from(tablas.partidos).select('id,equipo_local_id,equipo_visit_id,llave')
        .in('fecha_id', ids).eq('es_playoff', true).eq('copa', copaPO).eq('instancia', instanciaPO);
      if (!cancelado) setCrucesPO(data ?? []);
    })();
    return () => { cancelado = true; };
  }, [esPlayoff, copaPO, instanciaPO, temporadaActivaId, tablas]);
  const [log,       setLog]       = useState([]);
  const [duplicate, setDuplicate] = useState(null);
  // Partido pendiente encontrado (ver buscarPendiente) al que se le puede
  // "adjuntar" este resultado en vez de crear uno nuevo — ver paso 'adjuntar'.
  const [pendienteEncontrado, setPendienteEncontrado] = useState(null);
  // _rowId de la fila que se está reasignando a mano en el preview (ver ✏️).
  const [editando,  setEditando]  = useState(null);
  // Solo visual — resalta el dropzone mientras se arrastra un archivo encima.
  const [dragOver,  setDragOver]  = useState(false);
  const fileRef = useRef();

  // Plantel de un equipo puntual, para el selector manual del preview.
  const rosterEquipo = (equipoId) =>
    todasJugadoras.filter(j => j.equipoId === equipoId).sort((a,b) => a.nombre.localeCompare(b.nombre));

  // Reasignar a mano una fila del Excel: a un/a jugador/a puntual del plantel,
  // o a "crear jugador/a nuevo/a" (las dos categorías). Es el escape hatch para cuando el
  // matching automático no puede (o no debe) adivinar solo — típicamente dos
  // compañeros de equipo con nombres parecidos (hermanos, ej. "Peleteiro").
  const aplicarManual = (rowId, valor) => {
    setJugadoras(prev => prev.map(j => {
      if (j._rowId !== rowId) return j;
      if (valor === '__nuevo__') {
        return { ...j, jugadora:null, matchMethod:'nuevo', matchScore:0, nuevoEquipoId:j.equipoIdResuelto, candidatosAmbiguos:null };
      }
      const elegido = todasJugadoras.find(t => t.id === valor);
      if (!elegido) return j;
      return {
        ...j, jugadora:{ id:elegido.id, nombre:elegido.nombre, equipoId:elegido.equipoId },
        matchMethod:'manual', matchScore:0, nuevoEquipoId:null, candidatosAmbiguos:null,
      };
    }));
    setEditando(null);
  };

  const reset = () => {
    setStep('archivo'); setParsed(null); setJugadoras([]);
    setFileName(''); setLog([]); setDuplicate(null); setEditando(null);
    setEsPlayoff(false); setCopaPO(''); setInstanciaPO(''); setLlavePO('');
    setPendienteEncontrado(null);
    cargarRecientes();
  };

  // BUG REAL (encontrado por reporte de Alvaro, fecha 10 semifinal publicada
  // como Temporada Regular pese a haber tildado "¿Es Playoff?"): handleFile
  // llamaba a reset() a secas apenas se soltaba el Excel. reset() borra
  // esPlayoff/copaPO/instanciaPO/llavePO — pero esos campos se llenan A
  // PROPÓSITO antes de soltar el archivo (están arriba del dropzone, mismo
  // paso 1). Resultado: tildabas "Es Playoff", completabas Copa/Instancia/
  // Llave, soltabas el Excel, y para cuando llegabas al preview esos cuatro
  // campos ya habían vuelto a quedar vacíos — sin forma de volver a
  // tildarlos, porque esa sección solo existe en el paso 1. El partido se
  // publicaba igual, pero como Temporada Regular en vez de Playoffs.
  // "N° de fecha", "Lugar" y "Fecha de este partido" nunca tuvieron este
  // problema porque reset() nunca los tocó — este reset para archivo nuevo
  // sigue el mismo criterio: limpia lo que es de la carga anterior (parsed,
  // jugadoras, log...) y respeta lo que el admin ya configuró a propósito.
  const resetParaNuevoArchivo = () => {
    setStep('archivo'); setParsed(null); setJugadoras([]);
    setFileName(''); setLog([]); setDuplicate(null); setEditando(null);
    setPendienteEncontrado(null);
    cargarRecientes();
  };

  useEffect(() => { reset(); }, [categoria]);

  // ── Últimas cargas (contexto rápido antes de subir una nueva) ────────────────
  const [recientes, setRecientes] = useState([]);
  const cargarRecientes = async () => {
    const { data, error } = await supabase
      .from(tablas.uploadLog)
      .select(`*, ${tablas.fechas}(numero)`)
      .order('cargado_en', { ascending: false })
      .limit(4);
    if (error) {
      const { data: plain } = await supabase.from(tablas.uploadLog).select('*').order('cargado_en', { ascending: false }).limit(4);
      setRecientes(plain ?? []);
    } else {
      setRecientes(data ?? []);
    }
  };

  const tiempoRelativo = (iso) => {
    if (!iso) return '';
    const diffMs = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return 'recién';
    if (min < 60) return `hace ${min} min`;
    const hs = Math.floor(min / 60);
    if (hs < 24) return `hace ${hs}hs`;
    return `hace ${Math.floor(hs / 24)}d`;
  };

  const addLog = msg => setLog(l => [...l, msg]);

  const handleFile = async (e) => {
    const file = (e.dataTransfer?.files ?? e.target.files)[0];
    if (!file) return;
    if (!plantelListo) {
      setParsed({ errores:[errorPlantel || 'Todavía se está cargando el plantel — esperá un segundo y volvé a soltar el Excel.'], warnings:[], jugadorasBruto:[], jugadoras:[] });
      return;
    }
    resetParaNuevoArchivo();
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
  // OJO: esta búsqueda de fecha tiene que filtrar por temporada activa igual
  // que la de más abajo (donde se crea/reusa la fecha al publicar) — si no,
  // en cuanto exista más de una temporada con el mismo número de fecha (ej:
  // "Fecha 10" de la temporada 2026 Y "Fecha 10" de una temporada anterior),
  // .maybeSingle() encuentra dos filas y tira error al verificar duplicados.
  const checkDuplicate = async (eqLId, eqVId, fechaNum) => {
    const { data: fechaData, error: fechaErr } = await supabase
      .from(tablas.fechas)
      .select('id')
      .eq('numero', Number(fechaNum))
      .eq('temporada_id', temporadaActivaId)
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

  // Busca un partido PENDIENTE (ya programado, sin resultado) para estos dos
  // equipos en la temporada activa, sin importar en qué fecha esté — es lo
  // que permite "adjuntar" el resultado del Excel al partido que ya estaba
  // agendado (por ejemplo uno generado por Playoffs, con su Copa/Instancia/
  // Llave ya puestas) en vez de crear uno nuevo a ciegas por el número de
  // fecha tipeado, que es lo que terminaba pisando la marca de Playoffs
  // (mismo bug de fondo que el de la fecha 10/semifinal).
  const buscarPendiente = async (eqLId, eqVId) => {
    const { data: fechasT, error: fErr } = await supabase
      .from(tablas.fechas).select('id,numero,descripcion').eq('temporada_id', temporadaActivaId);
    if (fErr) throw new Error(`ver fechas: ${fErr.message}`);
    const fechaMap = Object.fromEntries((fechasT ?? []).map(f => [f.id, f]));
    const ids = Object.keys(fechaMap).map(Number);
    if (ids.length === 0) return null;
    const { data, error } = await supabase
      .from(tablas.partidos)
      .select('id, fecha_id, estado, es_playoff, copa, instancia, llave, equipo_local_id, equipo_visit_id')
      .in('fecha_id', ids)
      .eq('estado', 'pendiente')
      .or(`and(equipo_local_id.eq.${eqLId},equipo_visit_id.eq.${eqVId}),and(equipo_local_id.eq.${eqVId},equipo_visit_id.eq.${eqLId})`);
    if (error) throw new Error(`buscar partido pendiente: ${error.message}`);
    if (!data?.length) return null;
    return { ...data[0], fecha: fechaMap[data[0].fecha_id] };
  };

  // ⚠️ REESCRITO (revisión general — "todo o nada"). Antes se iban escribiendo
  // cosas en la base a medida que se avanzaba (fecha → partido con el
  // resultado → jugadores nuevos → stats) y recién en el medio se validaban
  // cosas como los nombres duplicados. Si algo fallaba a mitad de camino, el
  // partido quedaba publicado con resultado pero SIN estadísticas (lo que pasó
  // con Rejunte vs Dead Cow), y al reintentar se podía duplicar o perder la
  // marca de playoff. Además "Sobreescribir" BORRABA el partido viejo antes de
  // crear el nuevo, así que un error en el medio lo perdía del todo.
  // Ahora:
  //   1) se valida TODO antes de escribir nada (equipos, empate, nombres
  //      repetidos, incluidos los jugadores/as nuevos/as);
  //   2) cada escritura guarda cómo deshacerse; si cualquier paso hasta las
  //      estadísticas falla, se deshace todo y la base queda como estaba;
  //   3) "Sobreescribir" actualiza el MISMO partido (no lo borra): conserva su
  //      id, su historial y sus marcas de playoff;
  //   4) un jugador/a "nuevo/a" cuyo id ya existía no se pisa (antes le
  //      cambiaba nombre/número a una persona existente).
  // Lo que viene DESPUÉS de guardar las estadísticas (alias, MVP, promedios,
  // historial) ya no deshace nada: si falla, avisa y el partido queda bien.
  const handlePublish = async (forceOverwrite = false, attachPartido = null, skipPendienteCheck = false) => {
    if (!parsed || !jornada) { alert('Ingresá el número de fecha'); return; }
    setStep('publicando');
    setLog([]);
    const deshacer = [];
    let pd, fd, jugOk, jugSkip, statsRows, idsPrevios = [], creados = [], jugadorasResueltas = jugadoras;
    try {
      // Resolver equipos (alias del panel -> alias hardcodeados tipo "Ene
      // Ene"->"NN" -> fuzzy, en ese orden — ver buscarEquipo)
      const eqLocalItem = buscarEquipo(parsed.equipoLocal, fuseEq, roster, equipoAliasMap);
      const eqVisitItem = buscarEquipo(parsed.equipoVisit, fuseEq, roster, equipoAliasMap);
      if (!eqLocalItem) throw new Error(`Equipo local no encontrado: "${parsed.equipoLocal}" — si el Excel lo escribe distinto al nombre oficial, agregalo como alias en Herramientas → Alias de Equipos.`);
      if (!eqVisitItem) throw new Error(`Equipo visitante no encontrado: "${parsed.equipoVisit}" — si el Excel lo escribe distinto al nombre oficial, agregalo como alias en Herramientas → Alias de Equipos.`);
      const eqLId = eqLocalItem.id, eqVId = eqVisitItem.id;
      addLog(`✅ ${eqLocalItem.name} vs ${eqVisitItem.name}`);

      // ¿Hay un partido pendiente ya agendado para estos dos equipos? Si es
      // así, se le pregunta al admin si quiere publicar el resultado ahí
      // (conservando fecha/Copa/Instancia/Llave) en vez de crear uno nuevo.
      if (!attachPartido && !skipPendienteCheck && !forceOverwrite) {
        addLog('🔍 Buscando partido pendiente para estos equipos...');
        const pendiente = await buscarPendiente(eqLId, eqVId);
        if (pendiente) { setPendienteEncontrado(pendiente); setStep('adjuntar'); return; }
        addLog('✅ Ningún partido pendiente coincide — se va a crear uno nuevo');
      }

      // ── 1. Validaciones (nada se escribió todavía) ─────────────────────
      // BUG REAL (reporte de Alvaro, dos partidos seguidos con el ganador
      // invertido pese a que "las estadísticas están bien"): el Excel arma
      // "local"/"visit" según el ORDEN de las filas del marcador — que no
      // tiene por qué coincidir con cómo quedó agendado el partido. Si estamos
      // ADJUNTANDO a uno ya agendado, se alinea el marcador a ese orden.
      const invertido = !!attachPartido && attachPartido.equipo_local_id === eqVId && attachPartido.equipo_visit_id === eqLId;
      const m = invertido ? { local: parsed.marcador.visit, visit: parsed.marcador.local } : parsed.marcador;
      const p = invertido ? { local: parsed.pct.visit, visit: parsed.pct.local } : parsed.pct;
      if (invertido) addLog('↔️ El Excel traía los equipos en el orden inverso al ya agendado — se acomoda el marcador antes de guardar.');
      if (m.local.total === m.visit.total) {
        throw new Error(`El Excel da un empate ${m.local.total}-${m.visit.total} — el básquet no admite empates, revisá la planilla antes de publicar.`);
      }

      // Id definitivo de cada fila (incluidos los/las nuevos/as, cuyo id se
      // arma igual que al crearlos). Dos filas con el mismo id = la misma
      // persona cargada dos veces en la planilla → se frena ANTES de escribir.
      // OJO: el número de camiseta NO va en el id — si un Excel lo trae y otro
      // no, se partían las estadísticas de una misma persona en dos.
      const idNuevo = nj => `${nj.nuevoEquipoId}_${normStr(nj.nombreRaw).replace(/\s+/g, '_')}`;
      const idFila = j => j.jugadora?.id ?? (j.matchMethod === 'nuevo' && j.nuevoEquipoId ? idNuevo(j) : null);
      const porId = {};
      for (const j of jugadoras) {
        const id = idFila(j);
        if (!id) continue;
        (porId[id] ??= []).push(j);
      }
      const colisiones = Object.entries(porId).filter(([, arr]) => arr.length > 1);
      if (colisiones.length > 0) {
        const detalle = colisiones.map(([, arr]) =>
          `"${arr[0].jugadora?.nombre ?? arr[0].nombreRaw}" <- [${arr.map(x => `"${x.nombreRaw}"`).join(', ')}]`
        ).join(' | ');
        throw new Error(`Hay una misma persona cargada dos veces en la planilla: ${detalle}. Usá el ✏️ en esas filas para reasignarlas (o sacá la fila repetida del Excel) antes de publicar. No se guardó nada.`);
      }

      // ── 2. Partido destino: adjuntar / sobreescribir / nuevo ───────────
      let objetivo = attachPartido ?? null;
      if (!attachPartido) {
        addLog('🔍 Verificando duplicados...');
        const dupe = await checkDuplicate(eqLId, eqVId, Number(jornada));
        if (dupe && !forceOverwrite) { setDuplicate(dupe); setStep('duplicado'); return; }
        if (dupe) {
          objetivo = dupe;
          addLog(`♻️ Se va a sobreescribir el partido existente (ID ${dupe.id}) — se actualiza en el lugar, no se borra.`);
        } else {
          addLog('✅ Sin duplicados');
        }
      }

      let antes = null, statsAntes = [];
      if (objetivo) {
        // Foto de cómo está ahora, para poder volver atrás si algo falla.
        const { data: filaAntes, error: aErr } = await supabase.from(tablas.partidos).select('*').eq('id', objetivo.id).single();
        if (aErr) throw new Error(`Leyendo el partido ${objetivo.id}: ${aErr.message}`);
        const { data: sAntes, error: sAErr } = await supabase.from(tablas.stats).select('*').eq('partido_id', objetivo.id);
        if (sAErr) throw new Error(`Leyendo las stats del partido ${objetivo.id}: ${sAErr.message}`);
        antes = filaAntes; statsAntes = sAntes ?? [];
        idsPrevios = statsAntes.map(r => r[tablas.jugadorIdField]);
        fd = attachPartido?.fecha ?? { id: antes.fecha_id };
        if (attachPartido) addLog(`📎 Publicando en el partido pendiente ya agendado (ID ${attachPartido.id})...`);
      } else {
        // Fecha — si ya existe en la temporada activa no se toca su
        // descripción (ej: "Playoffs - Semifinal" puesta a mano); el número de
        // fecha se reinicia en cada temporada, por eso se busca solo en la activa.
        addLog('📅 Buscando la fecha...');
        const { data: fechaExistente, error: feErr } = await supabase
          .from(tablas.fechas).select('id')
          .eq('numero', Number(jornada))
          .eq('temporada_id', temporadaActivaId)
          .maybeSingle();
        if (feErr) throw new Error(`Fecha: ${feErr.message}`);
        if (fechaExistente) {
          fd = fechaExistente;
        } else {
          const { data: fdNueva, error: fErr } = await supabase
            .from(tablas.fechas)
            .insert({ numero: Number(jornada), descripcion: `Fecha ${jornada}`, temporada_id: temporadaActivaId })
            .select('id').single();
          if (fErr) throw new Error(`Fecha: ${fErr.message}`);
          fd = fdNueva;
          deshacer.push(async () => { await supabase.from(tablas.fechas).delete().eq('id', fdNueva.id); });
        }
        addLog(`✅ Fecha ${jornada} (ID ${fd.id})`);
      }

      // Al adjuntar a un partido agendado, o al sobreescribir uno de playoff
      // sin haber tildado "Es Playoff" en esta carga, NO se tocan es_playoff/
      // copa/instancia/llave — así publicar nunca borra una marca de Playoffs.
      const tocarPlayoff = !attachPartido && !(antes?.es_playoff && !esPlayoff);
      const camposResultado = {
        q1_local:m.local.q1, q2_local:m.local.q2, q3_local:m.local.q3,
        q4_local:m.local.q4, ot_local:m.local.ot,
        q1_visit:m.visit.q1, q2_visit:m.visit.q2, q3_visit:m.visit.q3,
        q4_visit:m.visit.q4, ot_visit:m.visit.ot,
        pct_simples_local:p.local.simples, pct_dobles_local:p.local.dobles, pct_triples_local:p.local.triples,
        pct_simples_visit:p.visit.simples, pct_dobles_visit:p.visit.dobles, pct_triples_visit:p.visit.triples,
        lugar:lugar||antes?.lugar||null, fecha_partido:fechaPartido||antes?.fecha_partido||null, estado:'finalizado',
        ...(tocarPlayoff ? {
          es_playoff: esPlayoff,
          copa:       esPlayoff ? (copaPO || null) : null,
          instancia:  esPlayoff ? (instanciaPO || null) : null,
          llave:      esPlayoff && llavePO ? Number(llavePO) : null,
        } : {}),
      };

      addLog(objetivo ? '🏀 Actualizando partido...' : '🏀 Insertando partido...');
      if (objetivo) {
        const { data, error } = await supabase.from(tablas.partidos)
          .update(camposResultado).eq('id', objetivo.id).select('id').single();
        if (error) throw new Error(`Partido: ${error.message}`);
        pd = data;
        const fotoAntes = antes, statsFoto = statsAntes;
        deshacer.push(async () => {
          await supabase.from(tablas.stats).delete().eq('partido_id', fotoAntes.id);
          const restaurar = {};
          for (const k of [...Object.keys(camposResultado), tablas.mvpField]) restaurar[k] = fotoAntes[k] ?? null;
          const { error: rErr } = await supabase.from(tablas.partidos).update(restaurar).eq('id', fotoAntes.id);
          if (rErr) throw rErr;
          if (statsFoto.length) {
            const { error: sErr } = await supabase.from(tablas.stats).insert(statsFoto.map(({ id: _id, ...r }) => r));
            if (sErr) throw sErr;
          }
        });
        // Stats viejas afuera (las de esta planilla las reemplazan; si alguien
        // estaba en la carga anterior y no en esta, no debe quedar).
        if (statsAntes.length) {
          const { error: dErr } = await supabase.from(tablas.stats).delete().eq('partido_id', objetivo.id);
          if (dErr) throw new Error(`Borrando las stats anteriores: ${dErr.message}`);
        }
      } else {
        const { data, error } = await supabase.from(tablas.partidos)
          .insert({ fecha_id:fd.id, equipo_local_id:eqLId, equipo_visit_id:eqVId, ...camposResultado })
          .select('id').single();
        if (error) throw new Error(`Partido: ${error.message}`);
        pd = data;
        deshacer.push(async () => { await supabase.from(tablas.partidos).delete().eq('id', data.id); });
      }
      addLog(`✅ Partido ID ${pd.id} — ${m.local.total}-${m.visit.total}`);
      addLog(`   Local:  Q1=${m.local.q1} Q2=${m.local.q2} Q3=${m.local.q3} Q4=${m.local.q4}`);
      addLog(`   Visita: Q1=${m.visit.q1} Q2=${m.visit.q2} Q3=${m.visit.q3} Q4=${m.visit.q4}`);

      // ── 3. Jugadores/as nuevos/as ───────────────────────────────────────
      const nuevos = jugadoras.filter(j => j.matchMethod === 'nuevo' && !j.jugadora && j.nuevoEquipoId);
      if (nuevos.length > 0) {
        const ids = nuevos.map(idNuevo);
        const { data: yaExisten, error: yeErr } = await supabase.from(tablas.jugadores).select('*').in('id', ids);
        if (yeErr) throw new Error(`Buscando jugadores/as nuevos/as: ${yeErr.message}`);
        const existentes = Object.fromEntries((yaExisten ?? []).map(r => [r.id, r]));
        const aCrear = nuevos.filter(nj => !existentes[idNuevo(nj)]);
        if (aCrear.length) {
          addLog(`🆕 Creando ${aCrear.length} jugador(es) nuevo(s)...`);
          const { data: ins, error: cErr } = await supabase.from(tablas.jugadores)
            .insert(aCrear.map(nj => ({ id: idNuevo(nj), equipo_id: nj.nuevoEquipoId, nombre: nj.nombreRaw, numero: nj.numero })))
            .select('*');
          if (cErr) throw new Error(`Creando jugadores/as nuevos/as: ${cErr.message}`);
          creados = ins ?? [];
          const idsCreados = creados.map(c => c.id);
          deshacer.push(async () => { await supabase.from(tablas.jugadores).delete().in('id', idsCreados); });
        }
        if (aCrear.length < nuevos.length) addLog(`ℹ️ ${nuevos.length - aCrear.length} "nuevo/a" ya existía en el plantel — se usa el registro existente sin modificarlo.`);
        const porIdBase = { ...existentes, ...Object.fromEntries(creados.map(c => [c.id, c])) };
        jugadorasResueltas = jugadoras.map(j => {
          if (!nuevos.includes(j)) return j;
          const r = porIdBase[idNuevo(j)];
          return r ? { ...j, jugadora: { id: r.id, nombre: r.nombre, equipoId: r.equipo_id } } : j;
        });
      }

      // ── 4. Estadísticas ─────────────────────────────────────────────────
      jugOk   = jugadorasResueltas.filter(j => j.jugadora);
      jugSkip = jugadorasResueltas.filter(j => !j.jugadora);
      addLog(`📊 Insertando stats de ${jugOk.length} jugadoras${jugSkip.length > 0 ? ` (${jugSkip.length} no resueltas)` : ''}...`);
      statsRows = jugOk.map(j => ({
        partido_id:pd.id, [tablas.jugadorIdField]:j.jugadora.id, equipo_id:j.jugadora.equipoId,
        numero:j.numero, sc:j.sc, sf:j.sf, dc:j.dc, df:j.df,
        tc:j.tc, tf:j.tf, as_:j.as_,
        rd:j.rd, ro:j.ro, fp:j.fp, ft:j.ft, fa:j.fa,
        rb:j.rb, tp:j.tp, pe:j.pe, ca:j.ca, pts:j.pts, val:j.val,
      }));
      if (statsRows.length > 0) {
        const { error: sErr } = await supabase
          .from(tablas.stats)
          .upsert(statsRows, { onConflict:`partido_id,${tablas.jugadorIdField}` });
        if (sErr) throw new Error(`Stats: ${sErr.message}`);
      }
    } catch (err) {
      if (deshacer.length) {
        addLog('↩️ Deshaciendo lo que se alcanzó a guardar de esta carga...');
        for (const paso of [...deshacer].reverse()) {
          try { await paso(); } catch (e) { addLog(`⚠️ No se pudo deshacer un paso: ${e.message ?? e} — revisá el partido en Partidos.`); }
        }
        addLog('↩️ Listo: la base quedó como estaba antes de intentar publicar.');
      }
      addLog(`❌ ERROR: ${err.message}`);
      setStep('preview');
      return;
    }

    // Recién ahora (las stats ya quedaron guardadas) se actualiza la pantalla
    // y el índice de nombres en memoria con los/las recién creados/as — si se
    // hiciera antes y la carga se deshiciera, el índice quedaba apuntando a
    // personas que ya no existen y el reintento fallaba.
    setJugadoras(jugadorasResueltas);
    if (creados.length > 0) {
      if (categoria === 'masculino') setJugadoresMasc(prev => [...prev, ...creados.map(formatJugadorMasc)]);
      else setJugadorasFem(prev => [...prev, ...creados.map(formatJugadoraFem)]);
    }

    // ── 5. Después de guardar (no deshace: si falla, avisa) ─────────────
    try {
      if (statsRows.length > 0) {
        // Guardar como alias confirmado cada match por fuzzy/número/manual que
        // se publicó — el propio acto de publicar es la confirmación del admin.
        // No se guarda alias para un nombre de UNA sola palabra que pasó por el
        // desambiguador (ej. "Peleteiro" solo): es ambiguo por naturaleza.
        const fuzzyMatches = jugOk.filter(j => {
          const esCandidato = j.matchMethod==='fuzzy' || j.matchMethod==='numero' || j.matchMethod==='manual';
          if (!esCandidato) return false;
          const unaSolaPalabra = normStr(j.nombreRaw).split(' ').filter(Boolean).length <= 1;
          return !(j.wasAmbiguous && unaSolaPalabra);
        });
        let aliasesFallidos = 0;
        for (const j of fuzzyMatches) {
          // Una reasignación MANUAL tiene que poder corregir un alias viejo
          // equivocado (antes se ignoraba y el error se repetía cada semana).
          const errAlias = await guardarAlias(j.nombreRaw, j.jugadora.id, j.jugadora.equipoId, ctx, j.matchMethod === 'manual');
          if (errAlias) aliasesFallidos++;
        }
        if (fuzzyMatches.length - aliasesFallidos > 0) addLog(`💾 ${fuzzyMatches.length - aliasesFallidos} aliases guardados para futuras cargas`);
        if (aliasesFallidos > 0) addLog(`⚠️ ${aliasesFallidos} alias no se pudo guardar — esos nombres van a volver a pedir revisión la próxima carga.`);

        // MVP
        const mvp = statsRows.reduce((b,r) => !b||r.val>b.val?r:b, null);
        if (mvp) {
          const { error: mvpErr } = await supabase.from(tablas.partidos).update({ [tablas.mvpField]: mvp[tablas.jugadorIdField] }).eq('id',pd.id);
          const mvpNombre = jugOk.find(j=>j.jugadora?.id===mvp[tablas.jugadorIdField])?.jugadora?.nombre??'';
          if (mvpErr) addLog(`⚠️ No se pudo guardar el MVP (${mvpNombre}): ${mvpErr.message}`);
          else addLog(`⭐ MVP: ${mvpNombre} (VAL ${mvp.val})`);
        }
      }

      // Promedios: los de esta planilla y, si se sobreescribió, también los
      // de quienes estaban en la carga anterior y ya no.
      const idsRecalc = [...new Set([...(statsRows ?? []).map(r => r[tablas.jugadorIdField]), ...idsPrevios])];
      if (idsRecalc.length) {
        addLog('🔄 Recalculando promedios...');
        try {
          await recalcularPromedios(idsRecalc, tablas, temporadaActivaId);
          addLog('✅ Promedios actualizados');
        } catch (e) {
          addLog(`⚠️ El partido quedó publicado, pero no se pudieron recalcular los promedios (${e.message}). Andá a "Recalcular Stats" para dejarlos al día.`);
        }
      }

      // Log de carga — solo el registro de "Historial de cargas".
      const { error: logErr } = await supabase.from(tablas.uploadLog).insert({
        fecha_id:fd.id, partido_id:pd.id, archivo_nombre:fileName,
        equipo_local:parsed.equipoLocal, equipo_visit:parsed.equipoVisit,
        jugadoras_ok:jugOk.length, jugadoras_skip:jugSkip.length,
        warnings:[...(parsed.warnings??[]), ...jugSkip.map(j=>`Sin resolver: "${j.nombreRaw}"`)],
      });
      if (logErr) addLog(`⚠️ El partido se publicó bien, pero no quedó registrado en "Historial de cargas": ${logErr.message}`);
      else addLog('📁 Carga registrada en Historial');
    } catch (err) {
      addLog(`⚠️ El partido quedó publicado, pero falló un paso final: ${err.message}`);
    }

    addLog('🎉 ¡Publicado! El sitio ya está actualizado.');
    setStep('listo');
  };

  // ⚠️ FIX: antes cada tabla del preview mostraba solo las filas cuyo texto
  // de equipo coincidía EXACTO con el del marcador — una fila con el equipo
  // escrito distinto (tilde, mayúscula, apodo) no aparecía en ninguna tabla,
  // pero se publicaba igual (y si estaba "ambigua" bloqueaba el botón sin
  // forma de arreglarla). Ahora se agrupa por el equipo YA RESUELTO, y lo que
  // no encaje en ninguno de los dos va a la tabla del local con su texto a la
  // vista, para que nada quede escondido.
  const idLocalPrev = parsed ? buscarEquipo(parsed.equipoLocal, fuseEq, roster, equipoAliasMap)?.id : null;
  const idVisitPrev = parsed ? buscarEquipo(parsed.equipoVisit, fuseEq, roster, equipoAliasMap)?.id : null;
  const equipoDeFila = j => j.equipoIdResuelto ?? (j.equipoRaw === parsed?.equipoVisit ? idVisitPrev : idLocalPrev);
  const visitJugs = jugadoras.filter(j => idVisitPrev && equipoDeFila(j) === idVisitPrev);
  const localJugs = jugadoras.filter(j => !visitJugs.includes(j));
  const jugOkCount = jugadoras.filter(j => j.jugadora || j.matchMethod === 'nuevo').length;
  const jugAmbiguoCount = jugadoras.filter(j => j.matchMethod === 'ambiguo').length;
  const jugNoCount = jugadoras.filter(j => !j.jugadora && j.matchMethod !== 'nuevo' && j.matchMethod !== 'ambiguo').length;
  const jugWarnCount = jugadoras.filter(j => j.jugadora && j.matchScore > 0.25).length;
  const jugNuevoCount = jugadoras.filter(j => j.matchMethod === 'nuevo').length;

  // Equipos resueltos (con logo/color) para mostrar en el marcador y en la
  // tarjeta de confirmación del paso 2 — mismo `buscarEquipo` que ya se usa
  // para publicar, así que si el nombre del Excel tiene un alias cargado va
  // a encontrar el logo igual.
  const eqLocalDisp = parsed ? buscarEquipo(parsed.equipoLocal, fuseEq, roster, equipoAliasMap) : null;
  const eqVisitDisp = parsed ? buscarEquipo(parsed.equipoVisit, fuseEq, roster, equipoAliasMap) : null;

  return (
    <div className="xlu">
      <style>{XLU_CSS}</style>
      {/* Stepper */}
      <div style={s.stepper}>
        {[['1','Archivo'],['2','Preview'],['3','Publicar'],['4','Listo']].map(([num,lbl],i)=>{
          const arr=['archivo','preview','publicando','listo'];
          const cur=arr.indexOf((step==='duplicado'||step==='adjuntar')?'publicando':step);
          const done=i<cur, active=i===cur;
          return (
            <div key={num} style={s.stepWrap}>
              <div style={{
                ...s.stepDot,
                background: done ? '#22D07A' : active ? 'linear-gradient(135deg,#F0B429,#FFD166)' : '#141C2A',
                color: done||active ? '#080C12' : '#4A566E',
                border: !done && !active ? '1px solid #24304A' : 'none',
                boxShadow: active ? '0 0 0 5px rgba(240,180,41,.16), 0 6px 18px -4px rgba(240,180,41,.6)' : 'none',
              }}>
                {done?'✓':num}
              </div>
              <div style={{color:active?'#F0B429':done?'#22D07A':'#4A566E',fontSize:12,fontWeight:active?700:400,whiteSpace:'nowrap'}}>{lbl}</div>
              {i<3&&<div style={{...s.stepLine,background:done?'#22D07A':'#1C2535',overflow:'hidden'}}/>}
            </div>
          );
        })}
      </div>

      {errorPlantel && (
        <div style={{...s.errBox, display:'flex', alignItems:'center', gap:10}}>
          <span style={{fontSize:20}}>🚫</span>
          <span>{errorPlantel}</span>
        </div>
      )}

      {/* ── PASO 1: Archivo ── */}
      {step==='archivo' && (
        <>
          {categoria === 'masculino' && (
            <div style={s.warnBox}>
              Los jugadores que no existan todavía en la base se van a crear automáticamente al publicar.
            </div>
          )}
          <div style={s.metaRow}>
            <div className="xlu-meta" style={s.metaCard}>
              <div style={s.metaTop}><IcoCalendar/><label style={s.label}>N° de fecha <b style={{color:'#F0B429'}}>*</b></label></div>
              <input type="number" min="1" value={jornada}
                onChange={e=>setJornada(e.target.value)} style={s.metaInput} placeholder="1"/>
            </div>
            <div className="xlu-meta" style={s.metaCard}>
              <div style={s.metaTop}><IcoPin/><label style={s.label}>Lugar (opcional)</label></div>
              <input type="text" value={lugar}
                onChange={e=>setLugar(e.target.value)} style={s.metaInput} placeholder="Club, cancha..."/>
            </div>
            <div className="xlu-meta" style={s.metaCard}>
              <div style={s.metaTop}><IcoCalendar/><label style={s.label}>Fecha del partido (opcional)</label></div>
              <input type="date" value={fechaPartido}
                onChange={e=>setFechaPartido(e.target.value)} style={s.metaInput}/>
            </div>
          </div>
          <p style={{ color:'#4A566E', fontSize:11, margin:'-8px 0 12px' }}>
            Completala solo si esta fecha se juega en mas de un dia (ej: algunos partidos el sabado y otros el domingo). Si la dejás vacía, se usa la fecha general de la jornada.
          </p>

          {/* Playoffs — si se tilda, este partido NO cuenta para la tabla de
              posiciones (solo temporada regular) y aparece en el cuadro de
              playoffs y en el chip "Playoffs" de Resultados en vez de
              mezclarse con la fecha regular. Este es el flujo que se usa
              para cargar partidos ya jugados con planilla de stats, así que
              es el lugar más importante para marcarlo bien. */}
          <div className={`xlu-po${esPlayoff?' on':''}`} style={s.poCard(esPlayoff)}>
            <div style={s.poHead} onClick={() => {
              const next = !esPlayoff;
              setEsPlayoff(next);
              if (!next) { setCopaPO(''); setInstanciaPO(''); setLlavePO(''); }
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={s.poIcon(esPlayoff)}><IcoTrophy size={17}/></div>
                <div>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, fontSize:15, color: esPlayoff ? '#F0B429' : '#8899BB' }}>¿Es Playoff?</div>
                  <div style={{ fontSize:11.5, color:'#4A566E' }}>No cuenta para la tabla de posiciones</div>
                </div>
              </div>
              <div className="xlu-switch" style={s.switchBase}><i/></div>
            </div>
            {esPlayoff && (
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', padding:'0 16px 16px' }} onClick={e=>e.stopPropagation()}>
                <select value={copaPO} onChange={e=>setCopaPO(e.target.value)} style={{ ...s.input, flex:'0 0 150px' }}>
                  <option value="">Copa —</option>
                  <option value="oro">Copa de Oro</option>
                  <option value="plata">Copa de Plata</option>
                  <option value="bronce">Copa de Bronce</option>
                </select>
                <select value={instanciaPO} onChange={e=>setInstanciaPO(e.target.value)} style={{ ...s.input, flex:'0 0 170px' }}>
                  <option value="">Instancia —</option>
                  <option value="cuartos">Cuartos de Final</option>
                  <option value="semifinal">Semifinal</option>
                  <option value="final">Final</option>
                  <option value="tercer_puesto">Tercer Puesto</option>
                </select>
                <input type="number" min="1" placeholder="Llave (1, 2...)" value={llavePO}
                  onChange={e=>setLlavePO(e.target.value)}
                  title="Posición del cruce dentro de esa copa+instancia — ej: Cuartos tiene 4 cruces (llave 1 a 4), Semifinal tiene 2 (llave 1 y 2), Final y Tercer Puesto tienen 1."
                  style={{ ...s.input, flex:'0 0 130px', borderColor: llavePO && crucesPO.some(c=>Number(c.llave)===Number(llavePO)) ? '#F04060' : undefined }}/>
              </div>
            )}
            {esPlayoff && copaPO && instanciaPO && crucesPO.length > 0 && (
              <div style={{ padding:'0 16px 16px', fontSize:11.5, lineHeight:1.6 }}>
                <div style={{ color:'#8899BB' }}>Ya cargados con esta Copa + Instancia:</div>
                {crucesPO.map(c => {
                  const choca = llavePO && Number(c.llave) === Number(llavePO);
                  return (
                    <div key={c.id} style={{ color: choca ? '#F04060' : '#6B7A99' }}>
                      Llave {c.llave ?? '—'}: {roster.find(e=>e.id===c.equipo_local_id)?.name ?? c.equipo_local_id} vs {roster.find(e=>e.id===c.equipo_visit_id)?.name ?? c.equipo_visit_id}
                    </div>
                  );
                })}
                {llavePO && crucesPO.some(c=>Number(c.llave)===Number(llavePO)) && (
                  <div style={{ color:'#F04060', fontWeight:700, marginTop:2 }}>
                    ⚠️ Ya hay otro cruce con la Llave {llavePO} — usá un número distinto o el cuadro público no va a poder mostrar los dos.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={`xlu-drop${dragOver?' drag':''}`} style={s.dropZone(dragOver)}
            onClick={()=>fileRef.current.click()}
            onDragEnter={e=>{e.preventDefault(); setDragOver(true);}}
            onDragOver={e=>e.preventDefault()}
            onDragLeave={e=>{e.preventDefault(); setDragOver(false);}}
            onDrop={e=>{e.preventDefault(); setDragOver(false); handleFile(e);}}>
            {resolving ? (
              <>
                <div className="xlu-spin" style={s.spinner}/>
                <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:.5,color:'#F0B429',margin:'0 0 6px'}}>Resolviendo jugadoras…</h3>
                <p style={{color:'#4A566E',fontSize:12.5,margin:0}}>Cruzando nombres del Excel con el plantel</p>
                <div style={s.progressTrack} className="xlu-progress"><i style={s.progressFill}/></div>
              </>
            ) : (
              <>
                <div className="xlu-drop-ic" style={s.dropIcon(dragOver)}><IcoUpload size={30}/></div>
                <h3 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:.5,color:'#EEF2F8',margin:'0 0 6px'}}>
                  {dragOver ? 'Soltá para cargar' : (fileName || 'Arrastrá el Excel acá')}
                </h3>
                <p style={{color:'#4A566E',fontSize:12.5,margin:0}}>
                  {dragOver ? '' : 'o hacé click para elegirlo · Planilla Torneo Live Basketball (.xlsx)'}
                </p>
                {!dragOver && (
                  <div style={s.dropCta}><IcoPlus size={14}/> Elegir archivo</div>
                )}
              </>
            )}
            <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{display:'none'}}/>
          </div>
          {parsed?.errores?.length>0 && (
            <div style={s.errBox}>
              {parsed.errores.map((e,i)=><p key={i} style={{margin:'4px 0'}}>❌ {e}</p>)}
            </div>
          )}

          {recientes.length > 0 && (
            <div style={s.recientesBox}>
              <div style={s.recientesTitle}><IcoHistory size={13}/> Últimas cargas</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {recientes.map(r => {
                  const numFecha = r[tablas.fechas]?.numero ?? r.fecha_id ?? '?';
                  const conProblema = (r.jugadoras_skip ?? 0) > 0;
                  const eqL = buscarEquipo(r.equipo_local, fuseEq, roster, equipoAliasMap);
                  const eqV = buscarEquipo(r.equipo_visit, fuseEq, roster, equipoAliasMap);
                  return (
                    <div key={r.id} className="xlu-rec-row" style={s.recienteRow}>
                      <div style={{ width:4, alignSelf:'stretch', borderRadius:3, flexShrink:0, background: conProblema ? '#F0B429' : '#22D07A' }}/>
                      <div style={{ display:'flex', flexShrink:0 }}>
                        <LogoDot nombre={eqL?.name ?? r.equipo_local} logo={eqL?.logo} color={eqL?.color} size={26}/>
                        <div style={{ marginLeft:-9 }}>
                          <LogoDot nombre={eqV?.name ?? r.equipo_visit} logo={eqV?.logo} color={eqV?.color} size={26}/>
                        </div>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#EEF2F8', fontSize:13.5, fontWeight:600 }}>
                          {r.equipo_local} vs {r.equipo_visit}
                        </div>
                        <div style={{ color:'#4A566E', fontSize:11 }}>Fecha {numFecha}</div>
                      </div>
                      <div style={{
                        flexShrink:0, fontSize:11.5, fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                        padding:'4px 10px', borderRadius:20,
                        background: conProblema ? 'rgba(240,180,41,.12)' : 'rgba(34,208,122,.12)',
                        color: conProblema ? '#F0B429' : '#22D07A',
                      }}>
                        {r.jugadoras_ok ?? 0}✓{conProblema ? ` ${r.jugadoras_skip}⚠️` : ''}
                      </div>
                      <div style={{ color:'#4A566E', fontSize:11, flexShrink:0, width:56, textAlign:'right' }}>{tiempoRelativo(r.cargado_en)}</div>
                    </div>
                  );
                })}
              </div>
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
              {log.filter(l => l.startsWith('❌') || l.startsWith('↩️') || l.startsWith('⚠️ No se pudo deshacer')).map((l,i)=><p key={i} style={{margin:'4px 0'}}>{l}</p>)}
            </div>
          )}
          {/* Marcador */}
          <div style={s.marcadorCard}>
            {[{lbl:parsed.equipoLocal,m:parsed.marcador.local,eq:eqLocalDisp},{lbl:parsed.equipoVisit,m:parsed.marcador.visit,eq:eqVisitDisp}].map(({lbl,m,eq},i)=>(
              <div key={i} style={s.marcSide}>
                <div style={{ marginBottom:8 }}>
                  <LogoDot nombre={eq?.name ?? lbl} logo={eq?.logo} color={eq?.color} size={56} radius={16}/>
                </div>
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
            {[{l:'% TL',k:'simples'},{l:'% 2P',k:'dobles'},{l:'% 3P',k:'triples'}].map(t=>{
              const vL = parsed.pct.local[t.k], vV = parsed.pct.visit[t.k];
              const suma = vL + vV || 1;
              return (
                <div key={t.k} style={s.pctCard}>
                  <div style={{color:'#6B7A99',fontSize:10,marginBottom:8,textTransform:'uppercase',letterSpacing:1}}>{t.l}</div>
                  <div style={{display:'flex',justifyContent:'space-between',fontFamily:"'Bebas Neue',sans-serif",fontSize:19,marginBottom:7}}>
                    <span style={{color:'#F04060'}}>{vL}%</span>
                    <span style={{color:'#60A5FA'}}>{vV}%</span>
                  </div>
                  <div style={s.pctBar}>
                    <i style={{display:'block',height:'100%',width:`${(vL/suma)*100}%`,background:'#F04060'}}/>
                    <i style={{display:'block',height:'100%',width:`${(vV/suma)*100}%`,background:'#60A5FA'}}/>
                  </div>
                </div>
              );
            })}
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
            <span style={s.chip('#22D07A')}><i style={s.chipDot('#22D07A')}/>{jugOkCount} resueltas</span>
            {jugNuevoCount>0 && (
              <span style={s.chip('#60A5FA')}><i style={s.chipDot('#60A5FA')}/>{jugNuevoCount} jugador(es) nuevo(s)</span>
            )}
            {jugWarnCount>0 && (
              <span style={s.chip('#F0B429')}><i style={s.chipDot('#F0B429')}/>{jugWarnCount} confianza media</span>
            )}
            {jugAmbiguoCount>0 && (
              <span style={s.chip('#C084FC')}><i style={s.chipDot('#C084FC')}/>🤔 {jugAmbiguoCount} para resolver a mano (bloquea publicar)</span>
            )}
            {jugNoCount>0 && (
              <span style={s.chip('#F04060')}><i style={s.chipDot('#F04060')}/>{jugNoCount} no resuelt{categoria==='masculino'?'os':'as'} (se ignoran)</span>
            )}
          </div>

          {/* Tablas por equipo */}
          {[{label:parsed.equipoLocal,jugs:localJugs,eq:eqLocalDisp},{label:parsed.equipoVisit,jugs:visitJugs,eq:eqVisitDisp}].map(({label,jugs,eq})=>(
            <div key={label} style={{marginBottom:28}}>
              <div style={s.teamHead}>
                <LogoDot nombre={eq?.name ?? label} logo={eq?.logo} color={eq?.color} size={34} radius={10}/>
                <div style={s.teamHeadName}>{label}</div>
                <span style={s.teamHeadRatio}>
                  {jugs.filter(j=>j.jugadora||j.matchMethod==='nuevo').length}/{jugs.length} jugadoras
                </span>
              </div>
              <div className="scrollbar-accent" style={{overflowX:'auto',borderRadius:14,border:'1px solid #1C2535'}}>
                <table style={s.table} className="xlu-table">
                  <thead>
                    <tr>
                      {['#','Nombre plantel (Excel)','PTS','VAL','TL C/F','2P C/F','3P C/F','AS','RD','RO','ROB','TAP','PÉR','FP'].map((h,hi)=>(
                        <th key={h} style={hi===0 ? {...s.th,position:'sticky',left:0,zIndex:2} : hi===1 ? {...s.th,position:'sticky',left:36,zIndex:2,boxShadow:'2px 0 4px rgba(0,0,0,.3)'} : s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {jugs.map((j,i)=>{
                      const esNuevo   = j.matchMethod === 'nuevo';
                      const esManual  = j.matchMethod === 'manual';
                      const esAmbiguo = j.matchMethod === 'ambiguo';
                      const color = esAmbiguo ? '#C084FC'
                        : (!j.jugadora && !esNuevo) ? '#F04060'
                        : esNuevo ? '#60A5FA' : esManual ? '#22D07A'
                        : j.matchScore>0.25 ? '#F0B429' : '#EEF2F8';
                      const methodBadge = esAmbiguo ? '🤔' : esNuevo ? '🆕' : esManual ? '✋'
                        : !j.jugadora ? '❌' : j.matchMethod==='alias' ? '🔗' : j.matchScore<0.15 ? '✅' : '~';
                      const pill = esAmbiguo ? { txt:'🤔 ambiguo', bg:'rgba(192,132,252,.16)', c:'#C084FC' }
                        : esNuevo ? { txt:'🆕 nuevo', bg:'rgba(96,165,250,.14)', c:'#60A5FA' }
                        : esManual ? { txt:'✋ manual', bg:'rgba(34,208,122,.14)', c:'#22D07A' }
                        : !j.jugadora ? { txt:'❌', bg:'rgba(240,64,96,.14)', c:'#F04060' }
                        : j.matchMethod==='alias' ? { txt:'🔗 alias', bg:'rgba(34,208,122,.14)', c:'#22D07A' }
                        : j.matchScore<0.15 ? { txt:'✅', bg:'rgba(238,242,248,.08)', c:'#EEF2F8' }
                        : { txt:'~ media', bg:'rgba(240,180,41,.14)', c:'#F0B429' };
                      const rowBg = i%2===0?'#0E1420':'#141C2A';
                      return (
                        <tr key={j._rowId} style={{background:rowBg,opacity:(j.jugadora||esNuevo)?1:0.4}}>
                          <td style={{...s.td,position:'sticky',left:0,zIndex:1,background:rowBg}}>{j.numero??'–'}</td>
                          <td style={{...s.td,textAlign:'left',minWidth:200,position:'sticky',left:36,zIndex:1,background:rowBg,boxShadow:'2px 0 4px rgba(0,0,0,.3)'}}>
                            {editando === j._rowId ? (
                              <select autoFocus defaultValue=""
                                onChange={e => e.target.value && aplicarManual(j._rowId, e.target.value)}
                                onBlur={() => setEditando(null)}
                                style={{...s.input,padding:'4px 6px',fontSize:12,width:'100%'}}>
                                <option value="" disabled>Elegir jugador...</option>
                                {rosterEquipo(j.equipoIdResuelto).map(cand => (
                                  <option key={cand.id} value={cand.id}>
                                    {cand.nombre}{cand.numero!=null?` (#${cand.numero})`:''}
                                  </option>
                                ))}
                                <option value="__nuevo__">🆕 Crear jugador/a nuevo/a: "{j.nombreRaw}"</option>
                              </select>
                            ) : (
                              <div style={{display:'flex',alignItems:'flex-start',gap:4}}>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                                    <span style={{display:'inline-flex',alignItems:'center',fontSize:9.5,fontWeight:700,padding:'2px 7px',borderRadius:20,background:pill.bg,color:pill.c,fontFamily:"'Barlow Condensed',sans-serif",flexShrink:0}}>
                                      {pill.txt}
                                    </span>
                                    <span style={{color,fontWeight:600,fontSize:13}}>
                                      {j.jugadora ? j.jugadora.nombre : j.nombreRaw}
                                    </span>
                                  </div>
                                  <div style={{color:'#4A566E',fontSize:10,marginTop:2}}>
                                    {j.nombreRaw}
                                  </div>
                                  {esAmbiguo && j.candidatosAmbiguos?.length > 0 && (
                                    <div style={{color:'#C084FC',fontSize:10,marginTop:2}}>
                                      ¿{j.candidatosAmbiguos.map(c=>c.nombre).join(' o ')}? Elegí con el ✏️
                                    </div>
                                  )}
                                </div>
                                <button className="xlu-edit" onClick={()=>setEditando(j._rowId)} title="Elegir jugador/a manualmente"
                                  style={{background:'transparent',border:'none',borderRadius:7,color:esAmbiguo?'#C084FC':'#4A566E',cursor:'pointer',fontSize:12,padding:'3px 4px',flexShrink:0,opacity:esAmbiguo?1:undefined}}>
                                  ✏️
                                </button>
                              </div>
                            )}
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

          {/* Resumen final antes de publicar — la idea es que de un vistazo,
              sin tener que releer el formulario de arriba, quede clarísimo
              QUÉ se está por subir: qué partido, qué fecha, y sobre todo si
              cuenta como temporada regular o como playoff (y de qué copa e
              instancia) — para evitar que se publique un cruce de semifinal
              como si fuera un partido regular por error. */}
          <div style={{
            background: esPlayoff ? 'linear-gradient(160deg,rgba(240,180,41,.10),#0B111C)' : 'linear-gradient(160deg,#101826,#0B111C)',
            border: esPlayoff ? '1px solid rgba(240,180,41,.35)' : '1px solid #1C2535',
            borderRadius: 12, padding: '16px 18px', marginTop: 20, marginBottom: 4,
          }}>
            <div style={{color:'#6B7A99',fontSize:11,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>
              Antes de publicar, revisá
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,flexWrap:'wrap'}}>
              <LogoDot nombre={eqLocalDisp?.name ?? parsed.equipoLocal} logo={eqLocalDisp?.logo} color={eqLocalDisp?.color} size={30} radius={9}/>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:19,color:'#EEF2F8'}}>{parsed.equipoLocal}</span>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:14,color:'#4A566E'}}>vs</span>
              <LogoDot nombre={eqVisitDisp?.name ?? parsed.equipoVisit} logo={eqVisitDisp?.logo} color={eqVisitDisp?.color} size={30} radius={9}/>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:19,color:'#EEF2F8'}}>{parsed.equipoVisit}</span>
            </div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
              <span style={{fontSize:13,color:'#8899BB'}}>
                Fecha {jornada || '—'}
              </span>
              {esPlayoff ? (
                <span style={{
                  display:'inline-flex',alignItems:'center',gap:6,
                  background:'rgba(240,180,41,.15)',border:'1px solid rgba(240,180,41,.4)',
                  color:'#F0B429',fontWeight:700,fontSize:13,borderRadius:20,padding:'4px 12px',
                }}>
                  🏆 PLAYOFFS
                  {copaPO && ` · ${COPA_LABEL[copaPO] ?? copaPO}`}
                  {instanciaPO && ` · ${INSTANCIA_LABEL[instanciaPO] ?? instanciaPO}`}
                  {llavePO && ` (Llave ${llavePO})`}
                </span>
              ) : (
                <span style={{
                  display:'inline-flex',alignItems:'center',gap:6,
                  background:'rgba(96,165,250,.12)',border:'1px solid rgba(96,165,250,.3)',
                  color:'#60A5FA',fontWeight:600,fontSize:13,borderRadius:20,padding:'4px 12px',
                }}>
                  📅 Temporada Regular
                </span>
              )}
            </div>
            {esPlayoff && (!copaPO || !instanciaPO) && (
              <div style={{marginTop:10,color:'#F04060',fontSize:12,fontWeight:600}}>
                ⚠️ Falta elegir {!copaPO && 'la Copa'}{!copaPO && !instanciaPO && ' y '}{!instanciaPO && 'la Instancia'} arriba en "¿Es Playoff?" — sin eso no va a aparecer bien identificado en el cuadro ni en los filtros.
              </div>
            )}
          </div>

          {jugAmbiguoCount>0 && (
            <div style={{...s.warnBox,background:'rgba(192,132,252,.08)',border:'1px solid rgba(192,132,252,.3)',color:'#C084FC',marginTop:12,marginBottom:0}}>
              🤔 Hay {jugAmbiguoCount} jugador(es) con nombre ambiguo (compañeros de equipo con nombres parecidos). Elegí quién es cada uno con el ✏️ en la tabla antes de publicar.
            </div>
          )}
          <div style={{display:'flex',gap:12,marginTop:12,flexWrap:'wrap'}}>
            <button className="xlu-btn-publish" onClick={()=>handlePublish(false)} disabled={!jornada || jugAmbiguoCount>0}
              style={{...s.btnPublish,opacity:(jornada && jugAmbiguoCount===0)?1:0.5}}>
              <IcoStar size={17}/> PUBLICAR PARTIDO
            </button>
            <button className="xlu-btn-cancel" onClick={reset} style={s.btnCancel}>← Volver</button>
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
            Si sobreescribís, se actualiza ese mismo partido con el resultado y las estadísticas de esta planilla (se reemplazan las anteriores). Si algo falla, queda como estaba.
          </p>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            <button className="xlu-btn-publish" onClick={()=>handlePublish(true)}
              style={{...s.btnPublish,background:'linear-gradient(135deg,#F04060,#B91C1C)',maxWidth:220}}>
              ♻️ SOBREESCRIBIR
            </button>
            <button className="xlu-btn-cancel" onClick={()=>setStep('preview')} style={s.btnCancel}>
              ← Volver al preview
            </button>
          </div>
        </div>
      )}

      {/* ── ADJUNTAR A PARTIDO PENDIENTE ── */}
      {step==='adjuntar' && pendienteEncontrado && (
        <div style={s.dupeBox}>
          <div style={{fontSize:48,marginBottom:12}}>📎</div>
          <h3 style={{color:'#F0B429',margin:'0 0 12px',fontFamily:"'Bebas Neue',sans-serif",fontSize:26}}>
            YA HAY UN PARTIDO AGENDADO
          </h3>
          <p style={{color:'#EEF2F8',marginBottom:8}}>
            Estos dos equipos ya tienen un partido <strong>pendiente</strong> cargado
            {pendienteEncontrado.fecha?.descripcion ? <> en <strong>{pendienteEncontrado.fecha.descripcion}</strong></> : (pendienteEncontrado.fecha?.numero ? <> en <strong>Fecha {pendienteEncontrado.fecha.numero}</strong></> : null)}.
          </p>
          <div style={{background:'#141C2A',border:'1px solid #1C2535',borderRadius:8,padding:'14px',marginBottom:16,textAlign:'left',fontSize:13,color:'#8899BB',lineHeight:1.7}}>
            <div>ID del partido: <span style={{color:'#EEF2F8'}}>{pendienteEncontrado.id}</span></div>
            {pendienteEncontrado.es_playoff && (
              <div style={{color:'#F0B429',fontWeight:700}}>
                🏆 PLAYOFFS
                {pendienteEncontrado.copa && ` · ${COPA_LABEL[pendienteEncontrado.copa] ?? pendienteEncontrado.copa}`}
                {pendienteEncontrado.instancia && ` · ${INSTANCIA_LABEL[pendienteEncontrado.instancia] ?? pendienteEncontrado.instancia}`}
                {pendienteEncontrado.llave && ` (Llave ${pendienteEncontrado.llave})`}
              </div>
            )}
          </div>
          <p style={{color:'#8899BB', fontSize:13, marginBottom:20}}>
            Lo más seguro es publicar el resultado de este Excel <strong>ahí mismo</strong> — así se conserva
            la Fecha/Copa/Instancia/Llave que ya tenía cargadas ese partido. Si en cambio esto es un
            partido distinto (una casualidad de que sean los mismos dos equipos), podés crear uno nuevo
            en la Fecha {jornada} tipeada arriba.
          </p>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            <button className="xlu-btn-publish" onClick={()=>handlePublish(false, pendienteEncontrado)} style={{...s.btnPublish,maxWidth:280}}>
              📎 SÍ, PUBLICAR EN ESE PARTIDO
            </button>
            <button className="xlu-btn-cancel" onClick={()=>handlePublish(false, null, true)} style={s.btnCancel}>
              ➕ No, crear uno nuevo en Fecha {jornada}
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
            <button className="xlu-btn-publish" onClick={reset} style={{...s.btnPublish,maxWidth:260}}>
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
  stepWrap:   {display:'flex',alignItems:'center',gap:9,flex:1},
  stepDot:    {width:32,height:32,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,flexShrink:0,transition:'.25s'},
  stepLine:   {flex:1,height:2,borderRadius:2,margin:'0 4px'},
  metaRow:    {display:'flex',gap:14,marginBottom:20,flexWrap:'wrap'},
  metaCard:   {flex:1,minWidth:180,background:'#0B111C',border:'1px solid #1C2535',borderRadius:14,padding:'12px 14px 13px'},
  metaTop:    {display:'flex',alignItems:'center',gap:7,marginBottom:8,color:'#4A566E'},
  label:      {fontSize:10,fontWeight:700,letterSpacing:1.6,color:'#4A566E',textTransform:'uppercase'},
  metaInput:  {width:'100%',background:'transparent',border:'none',outline:'none',color:'#EEF2F8',fontSize:16,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600,padding:0},
  input:      {padding:'9px 11px',background:'#101826',border:'1px solid #24304A',borderRadius:9,color:'#EEF2F8',fontSize:13.5,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600,outline:'none'},
  poCard:     on=>({borderRadius:14,marginBottom:22,border:on?'1px solid rgba(240,180,41,.4)':'1px solid #1C2535',background:on?'linear-gradient(160deg,rgba(240,180,41,.07),#0B111C 70%)':'#0B111C',overflow:'hidden',transition:'.2s'}),
  poHead:     {display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',cursor:'pointer'},
  poIcon:     on=>({width:34,height:34,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'.2s',background:on?'linear-gradient(135deg,#F0B429,#FF6B2B)':'#141C2A',color:on?'#241900':'#4A566E'}),
  switchBase: {width:42,height:24,borderRadius:20,background:'#141C2A',border:'1px solid #24304A',position:'relative',flexShrink:0},
  dropZone:   drag=>({position:'relative',borderRadius:20,padding:'44px 20px',textAlign:'center',cursor:'pointer',marginBottom:20,overflow:'hidden',
                background: drag
                  ? 'linear-gradient(rgba(240,180,41,.10),rgba(240,180,41,.10)) padding-box, linear-gradient(120deg,#F0B429,#FFD166,#F0B429) border-box'
                  : 'linear-gradient(#0B111C,#0B111C) padding-box, linear-gradient(120deg,rgba(240,180,41,.55),rgba(255,107,43,.35),rgba(240,180,41,.55)) border-box',
                border:'2px dashed transparent'}),
  dropIcon:   drag=>({width:72,height:72,margin:'0 auto 14px',borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',
                background: drag ? 'linear-gradient(135deg,#F0B429,#FF6B2B)' : 'linear-gradient(150deg,#141C2A,#101826)',
                border: drag ? 'none' : '1px solid #24304A', color: drag ? '#241900' : '#F0B429'}),
  spinner:    {width:40,height:40,borderRadius:'50%',border:'3px solid #24304A',borderTopColor:'#F0B429',margin:'0 auto 14px'},
  progressTrack:{maxWidth:240,height:5,margin:'14px auto 0',borderRadius:4,background:'#141C2A',overflow:'hidden'},
  progressFill:{display:'block',height:'100%',width:'40%',borderRadius:4,background:'linear-gradient(90deg,#F0B429,#FFD166)'},
  dropCta:    {display:'inline-flex',alignItems:'center',gap:7,marginTop:16,padding:'9px 20px',borderRadius:30,background:'#141C2A',border:'1px solid #24304A',color:'#8899BB',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600,fontSize:13},
  errBox:     {background:'rgba(240,64,96,.1)',border:'1px solid rgba(240,64,96,.3)',borderRadius:8,padding:'12px 16px',marginBottom:16,color:'#F04060',fontSize:14},
  warnBox:    {background:'rgba(240,180,41,.08)',border:'1px solid rgba(240,180,41,.25)',borderRadius:8,padding:'12px 16px',marginBottom:16,color:'#F0B429',fontSize:13},
  recientesBox:{background:'linear-gradient(160deg,#101826,#0B111C)',border:'1px solid #1C2535',borderRadius:16,padding:'16px 16px 8px'},
  recientesTitle:{display:'flex',alignItems:'center',gap:8,fontSize:10.5,fontWeight:700,letterSpacing:2,color:'#4A566E',marginBottom:10,textTransform:'uppercase'},
  recienteRow:{display:'flex',alignItems:'center',gap:12,padding:'10px',borderRadius:11,marginBottom:8,background:'#101826',border:'1px solid transparent'},
  marcadorCard:{background:'linear-gradient(160deg,#101826,#0B111C)',border:'1px solid #1C2535',borderRadius:18,padding:'1.4rem',display:'flex',alignItems:'center',justifyContent:'space-around',marginBottom:16,gap:16,flexWrap:'wrap'},
  marcSide:   {flex:1,textAlign:'center',minWidth:130,display:'flex',flexDirection:'column',alignItems:'center'},
  marcNombre: {fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:1,color:'#EEF2F8',marginBottom:4},
  marcTotal:  {fontFamily:"'Bebas Neue',sans-serif",fontSize:56,color:'#F0B429',lineHeight:1},
  parciales:  {display:'flex',gap:6,justifyContent:'center',marginTop:6,flexWrap:'wrap'},
  parcial:    {background:'#141C2A',padding:'3px 8px',borderRadius:4,fontSize:13,color:'#EEF2F8'},
  vs:         {fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:'#4A566E'},
  pctRow:     {display:'flex',gap:12,marginBottom:16,flexWrap:'wrap'},
  pctCard:    {flex:1,minWidth:130,background:'linear-gradient(160deg,#101826,#0B111C)',border:'1px solid #1C2535',borderRadius:14,padding:'12px 14px'},
  pctBar:     {height:6,borderRadius:4,background:'#141C2A',overflow:'hidden',display:'flex'},
  resumenBar: {display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',alignItems:'center',padding:'13px 16px',background:'linear-gradient(160deg,#101826,#0B111C)',borderRadius:14,border:'1px solid #1C2535'},
  chip:       c=>({display:'inline-flex',alignItems:'center',gap:6,fontSize:12.5,fontWeight:700,padding:'5px 12px',borderRadius:20,fontFamily:"'Barlow Condensed',sans-serif",background:`${c}1F`,color:c}),
  chipDot:    c=>({width:7,height:7,borderRadius:'50%',background:c,flexShrink:0}),
  teamHead:   {display:'flex',alignItems:'center',gap:10,marginBottom:12},
  teamHeadName:{fontFamily:"'Bebas Neue',sans-serif",fontSize:19,letterSpacing:1,color:'#EEF2F8'},
  teamHeadRatio:{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12.5,color:'#4A566E',background:'#141C2A',padding:'3px 10px',borderRadius:20},
  table:      {width:'100%',borderCollapse:'collapse',fontSize:12},
  th:         {background:'#141C2A',color:'#6B7A99',padding:'8px 10px',textAlign:'center',fontSize:10,whiteSpace:'nowrap'},
  td:         {padding:'7px 8px',textAlign:'center',color:'#EEF2F8',borderBottom:'1px solid #1C2535'},
  btnPublish: {flex:1,maxWidth:280,padding:'14px',background:'linear-gradient(135deg,#F0B429,#FF6B2B)',border:'none',borderRadius:12,color:'#080C12',fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:1,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:9,boxShadow:'0 14px 34px -14px rgba(240,180,41,.55)'},
  btnCancel:  {padding:'11px 22px',background:'transparent',border:'1px solid #24304A',borderRadius:12,color:'#8899BB',cursor:'pointer',fontSize:13.5,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600},
  logBox:     {background:'linear-gradient(160deg,#101826,#0B111C)',border:'1px solid #1C2535',borderRadius:12,padding:'1.5rem',minHeight:200},
  successBox: {textAlign:'center',padding:'3rem 1rem',background:'linear-gradient(160deg,rgba(34,208,122,.08),#0B111C)',border:'1px solid rgba(34,208,122,.2)',borderRadius:14},
  dupeBox:    {textAlign:'center',padding:'2.5rem 1.5rem',background:'linear-gradient(160deg,rgba(240,180,41,.08),#0B111C)',border:'1px solid rgba(240,180,41,.2)',borderRadius:14},
};
