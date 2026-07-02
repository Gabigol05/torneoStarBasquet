import { useState } from 'react';
import { supabase } from '../lib/supabase';

// ─── Función de recálculo completo ────────────────────────────────────────────
async function recalcularTodos(onLog) {
  onLog('📋 Obteniendo lista de jugadoras con stats...');

  const { data: statsRows, error } = await supabase
    .from('stats_partido_femenino')
    .select('jugadora_id');

  if (error) throw new Error(error.message);

  const ids = [...new Set((statsRows ?? []).map(r => r.jugadora_id))];
  onLog(`🔢 ${ids.length} jugadoras con partidos cargados`);

  let ok = 0, errores = 0;

  for (const jugId of ids) {
    try {
      const { data: allStats, error: fetchErr } = await supabase
        .from('stats_partido_femenino')
        .select('pts,rd,ro,as_,rb,tp,pe,val,sc,sf,dc,df,tc,tf')
        .eq('jugadora_id', jugId);

      if (fetchErr) throw new Error(fetchErr.message);
      if (!allStats?.length) continue;

      const k   = allStats.length;
      const sum = key => allStats.reduce((a, r) => a + (r[key] ?? 0), 0);
      const avg = key => +(sum(key) / k).toFixed(1);

      const tsc = sum('sc'), tsf = sum('sf');
      const tdc = sum('dc'), tdf = sum('df');
      const ttc = sum('tc'), ttf = sum('tf');
      const trd = sum('rd'), tro = sum('ro');

      const { error: upsertErr } = await supabase
        .from('estadisticas_femenino')
        .upsert({
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
          mejor_pts:    Math.max(...allStats.map(r => r.pts ?? 0)),
          // ── Campos de tiros (críticos — faltaban en v1) ──
          sc_total: tsc, sf_total: tsf,
          dc_total: tdc, df_total: tdf,
          tc_total: ttc, tf_total: ttf,
          sc_prom:  +(tsc / k).toFixed(1),
          dc_prom:  +(tdc / k).toFixed(1),
          tc_prom:  +(ttc / k).toFixed(1),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'jugadora_id' });

      if (upsertErr) throw new Error(upsertErr.message);
      ok++;
    } catch (err) {
      onLog(`⚠️ ${jugId}: ${err.message}`);
      errores++;
    }
  }

  onLog(`✅ ${ok} jugadoras recalculadas${errores > 0 ? ` · ⚠️ ${errores} con error` : ''}`);
  onLog('🎉 ¡Listo! El sitio ya refleja los promedios actualizados.');
}

export default function RecalcularStats() {
  const [running, setRunning] = useState(false);
  const [log,     setLog]     = useState([]);
  const [done,    setDone]    = useState(false);
  const [progress, setProgress] = useState(null); // { done, total }

  const addLog = msg => setLog(l => [...l, msg]);

  const handleRun = async () => {
    if (!confirm('¿Recalcular todos los promedios?\n\nEsto sobreescribe todos los promedios actuales con los datos reales de cada partido.\nNo se puede deshacer.')) return;
    setRunning(true);
    setLog([]);
    setDone(false);
    setProgress(null);
    try {
      await recalcularTodos(addLog);
      setDone(true);
    } catch (err) {
      addLog(`❌ Error crítico: ${err.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      {/* Info */}
      <div style={S.infoCard}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🔄</div>
        <h3 style={S.infoTitle}>¿Cuándo usar esto?</h3>
        <ul style={S.infoList}>
          <li>Después de corregir stats directamente en Supabase</li>
          <li>Si sospechás que los promedios quedaron desactualizados</li>
          <li>Después de eliminar o editar un partido manualmente</li>
          <li>Como verificación final antes de una fecha importante</li>
        </ul>
        <div style={S.warning}>
          <span>⚠️</span>
          <span>Esta operación <strong>sobreescribe todos los promedios</strong> actuales recalculándolos desde cero. Para cargas normales usá "Subir Partido".</span>
        </div>
      </div>

      <button
        onClick={handleRun}
        disabled={running}
        style={{ ...S.btn, opacity: running ? 0.6 : 1, cursor: running ? 'not-allowed' : 'pointer' }}
      >
        {running ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
            <span style={S.spinner} />
            RECALCULANDO...
          </span>
        ) : '🔄 INICIAR RECÁLCULO COMPLETO'}
      </button>

      {/* Log en tiempo real */}
      {log.length > 0 && (
        <div style={S.logBox}>
          <div style={{ fontSize: 11, color: '#4A566E', fontFamily: 'Barlow Condensed', letterSpacing: 1, marginBottom: 10, fontWeight: 700 }}>
            LOG DE EJECUCIÓN
          </div>
          {log.map((l, i) => (
            <div key={i} style={{
              padding: '4px 0',
              fontSize: 13,
              fontFamily: 'Barlow Condensed',
              letterSpacing: 0.3,
              borderBottom: i < log.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
              color: l.startsWith('❌') ? '#F04060'
                   : l.startsWith('✅') || l.startsWith('🎉') ? '#22D07A'
                   : l.startsWith('⚠️') ? '#F0B429'
                   : '#EEF2F8',
            }}>
              {l}
            </div>
          ))}
          {running && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, color: '#4A566E', fontSize: 12 }}>
              <span style={S.spinner} />
              Procesando...
            </div>
          )}
        </div>
      )}

      {/* Éxito */}
      {done && (
        <div style={S.successBox}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <div style={{ color: '#22D07A', fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 1, marginBottom: 4 }}>
            RECÁLCULO COMPLETADO
          </div>
          <div style={{ color: '#6B7A99', fontSize: 13 }}>
            El sitio ya muestra los promedios actualizados en tiempo real.
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  infoCard: {
    background: '#0E1420',
    border: '1px solid #1C2535',
    borderRadius: 12,
    padding: '1.5rem',
    marginBottom: 20,
  },
  infoTitle: {
    color: '#EEF2F8',
    fontFamily: "'Bebas Neue',sans-serif",
    fontSize: 18,
    letterSpacing: 1,
    margin: '0 0 10px',
  },
  infoList: {
    color: '#6B7A99',
    fontSize: 13,
    lineHeight: 2,
    paddingLeft: 20,
    margin: '0 0 16px',
  },
  warning: {
    display: 'flex', gap: 10, alignItems: 'flex-start',
    background: 'rgba(240,64,96,.08)', border: '1px solid rgba(240,64,96,.2)',
    borderRadius: 8, padding: '10px 14px', color: '#F04060', fontSize: 13,
  },
  btn: {
    width: '100%', padding: '15px',
    background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
    border: 'none', borderRadius: 10,
    color: '#fff', fontFamily: "'Bebas Neue',sans-serif",
    fontSize: 20, letterSpacing: 1,
    marginBottom: 20,
    boxShadow: '0 4px 20px rgba(59,130,246,.3)',
  },
  spinner: {
    display: 'inline-block', width: 16, height: 16,
    border: '2px solid rgba(255,255,255,.3)',
    borderTopColor: '#fff', borderRadius: '50%',
    animation: 'spin .8s linear infinite',
  },
  logBox: {
    background: '#0E1420', border: '1px solid #1C2535',
    borderRadius: 10, padding: '1rem',
    minHeight: 120, marginBottom: 16,
  },
  successBox: {
    textAlign: 'center', padding: '2rem',
    background: 'rgba(34,208,122,.05)',
    border: '1px solid rgba(34,208,122,.2)',
    borderRadius: 12,
  },
};