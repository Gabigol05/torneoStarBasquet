import { supabase } from './supabase';

// Recalcula los promedios/totales de temporada (estadisticas_*) de una lista
// de jugadores/as, a partir de sus filas de stats_partido_* de ESA temporada.
// Compartida por Subir Partido (ExcelUpload) y Partidos (al borrar un
// partido): el recálculo automático de la base solo actualiza algunas
// columnas (puntos, rebotes, asistencias...), y robos, tapones, valoración,
// pérdidas y tiros quedaban con el partido borrado sumado hasta que alguien
// apretara "Recalcular Stats".
//
// ⚠️ Si a alguien no le queda ningún partido en la temporada (p.ej. se borró
// el único que había jugado), ahora se lo deja en cero — antes se lo salteaba
// y quedaba con los números viejos en los líderes.
export async function recalcularPromedios(jugadorIds, tablas, temporadaId) {
  const idField = tablas.jugadorIdField;
  if (!temporadaId) return;
  const { data: fechasTemp, error: errFechas } = await supabase
    .from(tablas.fechas).select('id').eq('temporada_id', temporadaId);
  if (errFechas) throw new Error(`Recalculando (fechas de la temporada): ${errFechas.message}`);
  const fechaIds = (fechasTemp ?? []).map(f => f.id);
  let partidoIds = [];
  if (fechaIds.length) {
    const { data: partidosTemp, error: errPartidos } = await supabase
      .from(tablas.partidos).select('id').in('fecha_id', fechaIds);
    if (errPartidos) throw new Error(`Recalculando (partidos de la temporada): ${errPartidos.message}`);
    partidoIds = (partidosTemp ?? []).map(p => p.id);
  }

  for (const jugId of [...new Set(jugadorIds)]) {
    let data = [];
    if (partidoIds.length) {
      const { data: filas, error: errRead } = await supabase
        .from(tablas.stats)
        .select('pts,rd,ro,as_,rb,tp,pe,val,sc,sf,dc,df,tc,tf')
        .eq(idField, jugId)
        .in('partido_id', partidoIds);
      if (errRead) throw new Error(`Recalculando promedios de "${jugId}": ${errRead.message}`);
      data = filas ?? [];
    }
    const k = data.length;
    const sum = key => data.reduce((a, r) => a + (r[key] ?? 0), 0);
    const avg = key => (k ? +(sum(key) / k).toFixed(1) : 0);
    const tsc = sum('sc'), tsf = sum('sf'), tdc = sum('dc'), tdf = sum('df'), ttc = sum('tc'), ttf = sum('tf');
    const { error: errUpsert } = await supabase.from(tablas.estadisticas).upsert({
      [idField]: jugId, temporada_id: temporadaId, pj: k,
      pts_prom: avg('pts'), reb_prom: k ? +((sum('rd') + sum('ro')) / k).toFixed(1) : 0,
      ast_prom: avg('as_'), rob_prom: avg('rb'), tap_prom: avg('tp'),
      per_prom: avg('pe'), val_prom: avg('val'),
      pct_simples: tsc + tsf > 0 ? +((tsc / (tsc + tsf)) * 100).toFixed(1) : 0,
      pct_dobles:  tdc + tdf > 0 ? +((tdc / (tdc + tdf)) * 100).toFixed(1) : 0,
      pct_triples: ttc + ttf > 0 ? +((ttc / (ttc + ttf)) * 100).toFixed(1) : 0,
      sc_total: tsc, sf_total: tsf, dc_total: tdc, df_total: tdf, tc_total: ttc, tf_total: ttf,
      pts_total: sum('pts'), reb_total: sum('rd') + sum('ro'), ast_total: sum('as_'),
      rob_total: sum('rb'), tap_total: sum('tp'), val_total: sum('val'), per_total: sum('pe'),
      mejor_pts: k ? Math.max(...data.map(r => r.pts ?? 0)) : 0, updated_at: new Date().toISOString(),
    }, { onConflict: `${idField},temporada_id` });
    if (errUpsert) throw new Error(`Guardando promedios de "${jugId}": ${errUpsert.message}`);
  }
}
