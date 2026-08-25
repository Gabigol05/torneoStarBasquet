import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { TABLAS } from './categoriaAdmin';
import { useConfirm } from '../components/ConfirmModal.jsx';

// ⚠️ FIX (importante, misma clase de bug que se arregló en StatsEditor.jsx y
// en ExcelUpload.jsx esta sesión): desde que existen temporadas,
// `estadisticas_*` tiene clave compuesta (jugador_id, temporada_id) y esa
// columna es NOT NULL — pero esta función seguía juntando TODOS los
// stats_partido de cada jugador/a sin filtrar por temporada (mezclando
// promedios de temporadas distintas en una sola fila) y haciendo upsert con
// `onConflict: idField` (una sola columna, ya no coincide con ninguna
// constraint real). En la práctica esto significa que el botón "Recalcular
// Stats" fallaba SIEMPRE, para cada jugador/a, desde que se migró a
// temporadas — el log mostraba "❌ fallaron" en todos los casos sin explicar
// por qué. Ahora se recalcula por separado cada combinación (jugador,
// temporada) que tenga partidos cargados, con la clave y el onConflict
// correctos.
export async function recalcularTodos(onLog, tablas, categoria = 'femenino') {
  const jug = categoria === 'masculino' ? 'jugadores' : 'jugadoras';
  const idField = tablas.jugadorIdField;

  // Paginado: no confiar en el límite default de 1000 filas de Supabase.
  const paginar = async (tabla, columnas) => {
    let filas = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await supabase.from(tabla).select(columnas).range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      if (!data?.length) break;
      filas = filas.concat(data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    return filas;
  };

  // stats_partido no tiene temporada_id directo — se llega vía
  // partido -> fecha -> temporada. Se arma ese mapeo primero.
  onLog('📅 Mapeando partidos a temporadas...');
  const fechas = await paginar(tablas.fechas, 'id,temporada_id');
  const fechaTemporada = new Map(fechas.map(f => [f.id, f.temporada_id]));
  const partidos = await paginar(tablas.partidos, 'id,fecha_id');
  const partidoTemporada = new Map(partidos.map(p => [p.id, fechaTemporada.get(p.fecha_id) ?? null]));

  onLog(`📋 Obteniendo stats de ${jug}...`);
  const statsRows = await paginar(
    tablas.stats,
    `${idField},partido_id,pts,rd,ro,as_,rb,tp,pe,val,sc,sf,dc,df,tc,tf`,
  );

  // Agrupar por (jugador, temporada) — nunca promediar temporadas distintas juntas.
  const grupos = new Map();
  let sinTemporada = 0;
  for (const r of statsRows) {
    const temporadaId = partidoTemporada.get(r.partido_id);
    if (temporadaId == null) { sinTemporada++; continue; }
    const key = `${r[idField]}::${temporadaId}`;
    if (!grupos.has(key)) grupos.set(key, { jugId: r[idField], temporadaId, filas: [] });
    grupos.get(key).filas.push(r);
  }
  if (sinTemporada > 0) {
    onLog(`⚠️ ${sinTemporada} fila(s) de stats de un partido sin fecha/temporada resoluble — se ignoraron.`);
  }
  onLog(`🔢 ${grupos.size} combinación(es) ${jug}+temporada a recalcular`);

  let ok = 0;
  let fallidas = [];
  for (const { jugId, temporadaId, filas } of grupos.values()) {
    const k   = filas.length;
    const sum = key => filas.reduce((a, r) => a + (r[key] ?? 0), 0);
    const avg = key => +(sum(key) / k).toFixed(1);
    const tsc = sum('sc'), tsf = sum('sf');
    const tdc = sum('dc'), tdf = sum('df');
    const ttc = sum('tc'), ttf = sum('tf');

    const { error: errUpsert } = await supabase.from(tablas.estadisticas).upsert({
      [idField]:    jugId,
      temporada_id: temporadaId,
      pj:           k,
      pts_prom:     avg('pts'),
      reb_prom:     +((sum('rd') + sum('ro')) / k).toFixed(1),
      ast_prom:     avg('as_'),
      rob_prom:     avg('rb'),
      tap_prom:     avg('tp'),
      per_prom:     avg('pe'),
      val_prom:     avg('val'),
      pct_simples:  tsc + tsf > 0 ? +((tsc / (tsc + tsf)) * 100).toFixed(1) : 0,
      pct_dobles:   tdc + tdf > 0 ? +((tdc / (tdc + tdf)) * 100).toFixed(1) : 0,
      pct_triples:  ttc + ttf > 0 ? +((ttc / (ttc + ttf)) * 100).toFixed(1) : 0,
      sc_total: tsc, sf_total: tsf, dc_total: tdc, df_total: tdf, tc_total: ttc, tf_total: ttf,
      pts_total:    sum('pts'),
      reb_total:    sum('rd') + sum('ro'),
      ast_total:    sum('as_'),
      rob_total:    sum('rb'),
      tap_total:    sum('tp'),
      val_total:    sum('val'),
      per_total:    sum('pe'),
      mejor_pts:    Math.max(...filas.map(r => r.pts ?? 0)),
      updated_at:   new Date().toISOString(),
    }, { onConflict: `${idField},temporada_id` });

    if (errUpsert) {
      onLog(`❌ ${jugId} (temporada ${temporadaId}): error guardando — ${errUpsert.message}`);
      fallidas.push(`${jugId}/${temporadaId}`);
      continue;
    }

    ok++;
  }

  onLog(`✅ ${ok} combinación(es) ${jug}+temporada recalculadas`);
  if (fallidas.length > 0) {
    onLog(`⚠️ ${fallidas.length} fallaron: ${fallidas.join(', ')}`);
    onLog('Volvé a correr el recálculo — si vuelven a fallar las mismas, avisá al desarrollador.');
  } else {
    onLog('🎉 ¡Listo! El sitio ya refleja los promedios y acumulados actualizados, temporada por temporada.');
  }
}

export default function RecalcularStats({ categoria: categoriaProp, setCategoria: setCategoriaProp } = {}) {
  const [categoriaLocal, setCategoriaLocal] = useState('femenino');
  const categoria    = categoriaProp ?? categoriaLocal;
  const setCategoria = setCategoriaProp ?? setCategoriaLocal;
  const tablas = TABLAS[categoria];

  const [running, setRunning] = useState(false);
  const [log,     setLog]     = useState([]);
  const [done,    setDone]    = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  const addLog = msg => setLog(l => [...l, msg]);

  const handleRun = async () => {
    if (!(await confirm('¿Recalcular todos los promedios? Esto puede tardar unos segundos.'))) return;
    setRunning(true);
    setLog([]);
    setDone(false);
    try {
      await recalcularTodos(addLog, tablas, categoria);
      setDone(true);
    } catch (err) {
      addLog(`❌ Error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      {ConfirmDialog}
      <h2 style={S.title}>🔄 Recalcular todos los promedios y acumulados</h2>
      <p style={S.hint}>
        Recorre {categoria === 'masculino' ? 'todos los jugadores' : 'todas las jugadoras'} con partidos cargados y recalcula sus promedios
        y totales acumulados desde cero usando los datos de <code>{tablas.stats}</code>.
        Usá esto si hubo una corrección manual en Supabase o si sospechás que
        los promedios quedaron desactualizados.
      </p>

      <div style={S.warning}>
        <span>⚠️</span>
        <span>Esta operación sobreescribe todos los promedios actuales. No se puede deshacer.</span>
      </div>

      <button onClick={handleRun} disabled={running} style={{ ...S.btn, opacity: running ? 0.5 : 1 }}>
        {running ? '⏳ Recalculando...' : '🔄 INICIAR RECÁLCULO COMPLETO'}
      </button>

      {log.length > 0 && (
        <div style={S.logBox}>
          {log.map((l, i) => (
            <div key={i} style={{
              padding: '3px 0', fontSize: 13, fontFamily: 'Barlow Condensed',
              color: l.startsWith('❌') ? '#F04060' :
                     l.startsWith('✅') || l.startsWith('🎉') ? '#22D07A' : '#EEF2F8',
            }}>
              {l}
            </div>
          ))}
        </div>
      )}

      {done && (
        <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(34,208,122,.08)',
          border: '1px solid rgba(34,208,122,.2)', borderRadius: 8, color: '#22D07A', fontSize: 14 }}>
          ✅ Recálculo completado. El sitio ya está actualizado.
        </div>
      )}
    </div>
  );
}

const S = {
  title:  { color:'#F0B429', fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:1, marginBottom:12 },
  hint:   { color:'#6B7A99', fontSize:13, lineHeight:1.6, marginBottom:16 },
  warning:{ display:'flex', gap:10, background:'rgba(240,64,96,.08)', border:'1px solid rgba(240,64,96,.2)',
            borderRadius:8, padding:'10px 14px', color:'#F04060', fontSize:13, marginBottom:20 },
  btn:    { padding:'13px 32px', background:'linear-gradient(135deg,#F0B429,#FF6B2B)', border:'none',
            borderRadius:10, color:'#080C12', fontFamily:"'Bebas Neue',sans-serif", fontSize:20,
            letterSpacing:1, cursor:'pointer' },
  logBox: { marginTop:20, background:'linear-gradient(160deg,#101826,#0B111C)', border:'1px solid #1C2535', borderRadius:10,
            padding:'1rem', minHeight:100 },
};
