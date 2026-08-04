import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { CategoriaToggle, TABLAS } from './categoriaAdmin';

async function recalcularTodos(onLog, tablas) {
  onLog('📋 Obteniendo lista de jugadoras con stats...');

  const idField = tablas.jugadorIdField;

  // Paginado: no confiar en el límite default de 1000 filas de Supabase
  let statsRows = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from(tablas.stats)
      .select(idField)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    statsRows = statsRows.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const ids = [...new Set(statsRows.map(r => r[idField]))];
  onLog(`🔢 ${ids.length} jugadoras con partidos cargados`);

  let ok = 0;
  let fallidas = [];
  for (const jugId of ids) {
    const { data: allStats, error: errFetch } = await supabase
      .from(tablas.stats)
      .select('pts,rd,ro,as_,rb,tp,pe,val,sc,sf,dc,df,tc,tf')
      .eq(idField, jugId);

    if (errFetch) {
      onLog(`❌ ${jugId}: error leyendo stats — ${errFetch.message}`);
      fallidas.push(jugId);
      continue;
    }
    if (!allStats?.length) continue;

    const k   = allStats.length;
    const sum = key => allStats.reduce((a, r) => a + (r[key] ?? 0), 0);
    const avg = key => +(sum(key) / k).toFixed(1);
    const tsc = sum('sc'), tsf = sum('sf');
    const tdc = sum('dc'), tdf = sum('df');
    const ttc = sum('tc'), ttf = sum('tf');

    const { error: errUpsert } = await supabase.from(tablas.estadisticas).upsert({
      [idField]:    jugId,
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
      pts_total:    sum('pts'),
      reb_total:    sum('rd') + sum('ro'),
      ast_total:    sum('as_'),
      rob_total:    sum('rb'),
      tap_total:    sum('tp'),
      val_total:    sum('val'),
      per_total:    sum('pe'),
      mejor_pts:    Math.max(...allStats.map(r => r.pts ?? 0)),
      updated_at:   new Date().toISOString(),
    }, { onConflict: idField });

    if (errUpsert) {
      onLog(`❌ ${jugId}: error guardando — ${errUpsert.message}`);
      fallidas.push(jugId);
      continue;
    }

    ok++;
  }

  onLog(`✅ ${ok} jugadoras recalculadas`);
  if (fallidas.length > 0) {
    onLog(`⚠️ ${fallidas.length} jugadoras fallaron: ${fallidas.join(', ')}`);
    onLog('Volvé a correr el recálculo — si vuelven a fallar las mismas, avisá al desarrollador.');
  } else {
    onLog('🎉 ¡Listo! El sitio ya refleja los promedios y acumulados actualizados.');
  }
}

export default function RecalcularStats() {
  const [categoria, setCategoria] = useState('femenino');
  const tablas = TABLAS[categoria];

  const [running, setRunning] = useState(false);
  const [log,     setLog]     = useState([]);
  const [done,    setDone]    = useState(false);

  const addLog = msg => setLog(l => [...l, msg]);

  const handleRun = async () => {
    if (!confirm('¿Recalcular todos los promedios? Esto puede tardar unos segundos.')) return;
    setRunning(true);
    setLog([]);
    setDone(false);
    try {
      await recalcularTodos(addLog, tablas);
      setDone(true);
    } catch (err) {
      addLog(`❌ Error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <CategoriaToggle categoria={categoria} setCategoria={setCategoria} />

      <h2 style={S.title}>🔄 Recalcular todos los promedios y acumulados</h2>
      <p style={S.hint}>
        Recorre todas las jugadoras con partidos cargados y recalcula sus promedios
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
  btn:    { padding:'13px 32px', background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', border:'none',
            borderRadius:10, color:'#fff', fontFamily:"'Bebas Neue',sans-serif", fontSize:20,
            letterSpacing:1, cursor:'pointer' },
  logBox: { marginTop:20, background:'#0E1420', border:'1px solid #1C2535', borderRadius:10,
            padding:'1rem', minHeight:100 },
};
