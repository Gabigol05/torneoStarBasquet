import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TABLAS } from './categoriaAdmin';
import { equiposFemenino } from '../data/femeninoData';
import { equiposMasculino } from '../data/masculinoData';
import { useTemporada } from '../context/TemporadaContext';
import { useConfirm } from '../components/ConfirmModal.jsx';

export default function UploadHistory({ categoria: categoriaProp, setCategoria: setCategoriaProp } = {}) {
  const [categoriaLocal, setCategoriaLocal] = useState('femenino');
  const categoria    = categoriaProp ?? categoriaLocal;
  const setCategoria = setCategoriaProp ?? setCategoriaLocal;
  const tablas  = TABLAS[categoria];
  const roster  = categoria === 'masculino' ? equiposMasculino : equiposFemenino;
  const { confirm, ConfirmDialog } = useConfirm();

  // ⚠️ FIX (reporte Alvaro: "entro al historial estando en Clausura y me
  // sale toda la información de Apertura"). Esta pantalla no filtraba NADA
  // por temporada — traía las últimas 30 cargas de la tabla entera, mezclando
  // todos los torneos. Como partidos_femenino/masculino NO tienen
  // temporada_id propio (cuelga de fechas_femenino/masculino.temporada_id,
  // igual que en los hooks del sitio público), acá se resuelve buscando
  // primero las fechas de la temporada elegida y filtrando todo lo demás
  // (upload_log, partidos finalizados) contra esos fecha_id.
  const { temporadas, temporadaActivaId } = useTemporada();
  const temporadasCategoria = temporadas
    .filter(t => t.categoria === categoria)
    .sort((a, b) => (b.id) - (a.id));
  const [temporadaFiltroId, setTemporadaFiltroId] = useState(null);

  // Al cambiar de categoría (o la primera vez que se sabe cuál es la activa),
  // arranca mirando la ACTIVA de esa categoría — es "el torneo en curso",
  // que es lo que casi siempre se quiere ver acá. Si Alvaro elige a mano otra
  // temporada, esto no la pisa de vuelta mientras siga en la misma categoría.
  useEffect(() => {
    setTemporadaFiltroId(temporadaActivaId[categoria] ?? null);
  }, [categoria, temporadaActivaId[categoria]]);

  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [justDeleted, setJustDeleted] = useState(false);

  // Marcador/estado en vivo de cada partido logueado, y cuántas filas tiene
  // HOY stats_partido para ese partido (puede diferir de jugadoras_ok, que
  // quedó fijo en el momento de esa carga puntual, si después se borró/
  // fusionó algo).
  const [partidoPorId,     setPartidoPorId]     = useState({});
  const [statsCountPorId,  setStatsCountPorId]  = useState({});

  // Partidos "finalizado" de ESTA temporada que hoy no tienen ni una fila en
  // stats_partido — el síntoma exacto reportado (marcador bien, plantilla de
  // jugadoras vacía). Agarra cualquier partido en ese estado, tenga o no una
  // carga en el Historial (si el resultado se tipeó a mano desde Partidos,
  // nunca aparece en el Historial de Cargas porque esa pantalla no pasa por
  // acá — por eso esta lista se arma aparte, cruzando partidos × stats).
  const [sinStats,        setSinStats]        = useState([]);
  const [loadingSinStats, setLoadingSinStats] = useState(true);
  const [fechaPorId,      setFechaPorId]      = useState({});

  const load = async () => {
    if (temporadaFiltroId == null) { setLogs([]); setPartidoPorId({}); setStatsCountPorId({}); setLoading(false); return; }
    setLoading(true);

    const { data: fechasRows } = await supabase
      .from(tablas.fechas).select('id,numero').eq('temporada_id', temporadaFiltroId);
    const fechaIds = (fechasRows ?? []).map(f => f.id);
    setFechaPorId(prev => ({ ...prev, ...Object.fromEntries((fechasRows ?? []).map(f => [f.id, f.numero])) }));

    if (fechaIds.length === 0) { setLogs([]); setPartidoPorId({}); setStatsCountPorId({}); setLoading(false); return; }

    const { data, error } = await supabase
      .from(tablas.uploadLog)
      .select('*')
      .in('fecha_id', fechaIds)
      .order('cargado_en', { ascending: false })
      .limit(30);
    if (error) console.warn('[UploadHistory] uploadLog:', error.message);
    const logsCargados = data ?? [];
    setLogs(logsCargados);

    // Marcador + estado del partido de cada carga (para mostrar el resultado
    // en la tarjeta y detectar 0-0 raros).
    const partidoIds = [...new Set(logsCargados.map(l => l.partido_id).filter(Boolean))];
    if (partidoIds.length > 0) {
      const { data: partidosRows } = await supabase
        .from(tablas.partidos)
        .select('id,puntos_local,puntos_visit,estado')
        .in('id', partidoIds);
      setPartidoPorId(Object.fromEntries((partidosRows ?? []).map(p => [p.id, p])));

      const { data: statsRows } = await supabase
        .from(tablas.stats)
        .select('partido_id')
        .in('partido_id', partidoIds);
      const counts = {};
      for (const r of (statsRows ?? [])) counts[r.partido_id] = (counts[r.partido_id] ?? 0) + 1;
      setStatsCountPorId(counts);
    } else {
      setPartidoPorId({});
      setStatsCountPorId({});
    }
    setLoading(false);
  };

  const loadSinStats = async () => {
    if (temporadaFiltroId == null) { setSinStats([]); setLoadingSinStats(false); return; }
    setLoadingSinStats(true);
    const { data: fechasRows } = await supabase
      .from(tablas.fechas).select('id,numero').eq('temporada_id', temporadaFiltroId);
    const fechaIds = (fechasRows ?? []).map(f => f.id);
    setFechaPorId(prev => ({ ...prev, ...Object.fromEntries((fechasRows ?? []).map(f => [f.id, f.numero])) }));
    if (fechaIds.length === 0) { setSinStats([]); setLoadingSinStats(false); return; }

    const { data: partidosRows } = await supabase.from(tablas.partidos)
      .select('id,equipo_local_id,equipo_visit_id,puntos_local,puntos_visit,fecha_id')
      .eq('estado', 'finalizado')
      .in('fecha_id', fechaIds);

    // ⚠️ FIX: antes esto traía TODA la tabla de stats sin filtro
    // (`select('partido_id')` sobre stats_partido_* completa, de todas las
    // fechas y temporadas que existen desde que arrancó el torneo). Supabase
    // devuelve como mucho 1000 filas por consulta si no se pide explícito lo
    // contrario — con el volumen acumulado de varias fechas, esa tabla ya
    // tiene más de 1000 filas, así que la respuesta quedaba CORTADA. Un
    // partido recién resubido crea sus filas de stats de nuevo (ids nuevos,
    // al final de la tabla) y esas filas quedaban justo afuera del recorte,
    // así que el partido seguía apareciendo acá como "sin estadísticas"
    // aunque las stats estuvieran perfectamente guardadas — pasara lo que
    // pasara con "↻ Actualizar", porque el problema no era una vista vieja,
    // era que la consulta nunca llegaba a ver esas filas. Ahora se filtra
    // stats por los partido_id de esta temporada (siempre bien por debajo
    // de las 1000 filas), así no se corta nunca.
    const partidoIds = (partidosRows ?? []).map(p => p.id);
    let conStats = new Set();
    if (partidoIds.length > 0) {
      const { data: statsRows } = await supabase.from(tablas.stats)
        .select('partido_id')
        .in('partido_id', partidoIds);
      conStats = new Set((statsRows ?? []).map(r => r.partido_id));
    }
    setSinStats((partidosRows ?? []).filter(p => !conStats.has(p.id)));
    setLoadingSinStats(false);
  };

  useEffect(() => { load(); loadSinStats(); }, [categoria, temporadaFiltroId]);

  const handleDelete = async (id, partidoId) => {
    const ok = await confirm('¿Eliminar esta carga? Se borrarán las stats del partido asociado.');
    if (!ok) return;
    // Borrar el partido (cascade borra stats_partido)
    if (partidoId) await supabase.from(tablas.partidos).delete().eq('id', partidoId);
    await supabase.from(tablas.uploadLog).delete().eq('id', id);
    // ⚠️ FIX: borrar una carga no recalculaba los promedios agregados —
    // quedaban desactualizados hasta que alguien se acordara de ir a
    // "Recalcular Stats" a mano. Ahora se lo recordamos explícitamente.
    setJustDeleted(true);
    load();
    loadSinStats();
  };

  const numeroFecha = l => fechaPorId[l.fecha_id] ?? l.fecha_id ?? '?';
  const equipoPorId = id => roster.find(e => e.id === id);

  return (
    <div>
      <h2 style={s.title}>🗂️ Historial de cargas</h2>
      <p style={s.hint}>Cada partido subido queda registrado. Podés ver warnings y eliminar cargas erróneas.</p>

      {/* Selector de temporada — todo lo de abajo queda filtrado a esta
          temporada puntual, para no mezclar Apertura con Clausura (ni con
          ninguna otra) como pasaba antes. */}
      {temporadasCategoria.length > 0 && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
          {temporadasCategoria.map(t => {
            const esActiva = t.id === temporadaActivaId[categoria];
            const elegida  = t.id === temporadaFiltroId;
            return (
              <button key={t.id} onClick={() => setTemporadaFiltroId(t.id)} style={s.temporadaChip(elegida)}>
                {t.nombre}{esActiva ? ' (activa)' : ''}
              </button>
            );
          })}
        </div>
      )}

      <button onClick={() => { load(); loadSinStats(); }} style={s.btnRefresh}>↻ Actualizar</button>

      {justDeleted && (
        <div style={s.recalcWarn}>
          ⚠️ Borraste una carga — los promedios pueden haber quedado desactualizados.
          Andá a <b>Recalcular Stats</b> para dejarlos al día.
          <button onClick={() => setJustDeleted(false)} style={s.recalcWarnClose}>✕</button>
        </div>
      )}

      {/* ⚠️ Partidos finalizados sin ninguna fila en stats_partido — sea
          porque la carga de Excel dejó a todo el mundo "sin resolver", sea
          porque el resultado se tipeó a mano en Partidos (esa pantalla solo
          guarda el marcador, nunca estadísticas individuales) y nadie llegó
          a subir el Excel después. */}
      {!loadingSinStats && sinStats.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <h3 style={s.subtitle}>⚠️ Partidos finalizados sin estadísticas ({sinStats.length})</h3>
          <p style={s.hint}>
            Tienen marcador y quedaron como "Final", pero no hay ni una jugadora/jugador cargado en la tabla de stats —
            en el sitio se van a ver con el resultado bien pero sin planteles ni individuales.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {sinStats.map(p => {
              const eqL = equipoPorId(p.equipo_local_id);
              const eqV = equipoPorId(p.equipo_visit_id);
              return (
                <div key={p.id} style={s.cardAlert}>
                  <span style={s.badge}>Fecha {fechaPorId[p.fecha_id] ?? '?'}</span>
                  <span style={{ color:'#EEF2F8', fontWeight:600, fontSize:14, flex:1 }}>
                    {eqL?.name ?? p.equipo_local_id} <span style={{ color:'#6B7A99' }}>{p.puntos_local ?? 0} - {p.puntos_visit ?? 0}</span> {eqV?.name ?? p.equipo_visit_id}
                  </span>
                  <span style={s.chipSkip}>0 stats</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <h3 style={{ ...s.subtitle, marginTop: 22 }}>Últimas cargas</h3>

      {loading ? (
        <p style={{ color:'#6B7A99', padding:'2rem 0' }}>Cargando...</p>
      ) : logs.length === 0 ? (
        <div style={s.empty}>
          <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
          <p>Todavía no se cargó ningún partido en esta temporada.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:16 }}>
          {logs.map(l => {
            const partido    = l.partido_id ? partidoPorId[l.partido_id] : null;
            const statsHoy   = l.partido_id ? (statsCountPorId[l.partido_id] ?? 0) : null;
            const sinNadaHoy = statsHoy === 0;
            // Los "Sin resolver: ..." son el detalle más accionable de todos
            // los warnings (dicen EXACTAMENTE qué nombre no se pudo cargar) —
            // antes quedaban mezclados con el resto adentro de un <details>
            // colapsado por default y era fácil no verlos nunca.
            const warningsTodos = l.warnings ?? [];
            const sinResolver   = warningsTodos.filter(w => w.startsWith('Sin resolver:'));
            const otrosWarnings = warningsTodos.filter(w => !w.startsWith('Sin resolver:'));
            return (
              <div key={l.id} style={s.card}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4, flexWrap:'wrap' }}>
                    <span style={s.badge}>Fecha {numeroFecha(l)}</span>
                    <span style={{ color:'#EEF2F8', fontWeight:600, fontSize:15 }}>
                      {l.equipo_local} vs {l.equipo_visit}
                    </span>
                    {partido && (
                      <span style={s.marcador}>{partido.puntos_local} - {partido.puntos_visit}</span>
                    )}
                  </div>
                  <div style={{ color:'#6B7A99', fontSize:12, marginBottom:4 }}>
                    📁 {l.archivo_nombre} ·{' '}
                    ✅ {l.jugadoras_ok} jugadoras cargadas ·{' '}
                    {statsHoy !== null && (
                      <span style={{ color: sinNadaHoy ? '#F04060' : '#6B7A99' }}>
                        {statsHoy} en la base hoy
                      </span>
                    )}
                    {l.jugadoras_skip > 0 && <span style={{ color:'#F0B429' }}> · ⚠️ {l.jugadoras_skip} sin resolver</span>}
                  </div>
                  <div style={{ color:'#4A566E', fontSize:11 }}>
                    {new Date(l.cargado_en).toLocaleString('es-AR')}
                  </div>

                  {sinNadaHoy && (
                    <div style={s.bannerNoStats}>
                      ⚠️ Este partido no tiene ninguna estadística guardada en este momento.
                    </div>
                  )}

                  {sinResolver.length > 0 && (
                    <div style={s.sinResolverBox}>
                      <div style={{ color:'#F0B429', fontSize:12, fontWeight:700, marginBottom:4 }}>
                        Nombres que no se pudieron cargar ({sinResolver.length}):
                      </div>
                      {sinResolver.map((w,i) => (
                        <p key={i} style={{ color:'#F0B429', fontSize:12, margin:'2px 0' }}>{w.replace('Sin resolver: ', '')}</p>
                      ))}
                    </div>
                  )}

                  {otrosWarnings.length > 0 && (
                    <details style={{ marginTop:6 }}>
                      <summary style={{ color:'#8899AA', fontSize:12, cursor:'pointer' }}>
                        Ver {otrosWarnings.length} warning(s) más
                      </summary>
                      <div style={{ marginTop:4, paddingLeft:12 }}>
                        {otrosWarnings.map((w,i) => (
                          <p key={i} style={{ color:'#8899AA', fontSize:12, margin:'2px 0' }}>{w}</p>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
                <button onClick={() => handleDelete(l.id, l.partido_id)} style={s.btnDel} title="Eliminar carga">
                  🗑️
                </button>
              </div>
            );
          })}
        </div>
      )}
      {ConfirmDialog}
    </div>
  );
}

const s = {
  recalcWarn: {
    display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, padding: '10px 14px',
    borderRadius: 8, background: 'rgba(240,180,41,.08)', border: '1px solid rgba(240,180,41,.35)',
    color: '#F0B429', fontSize: 13, fontFamily: "'Barlow Condensed',sans-serif",
  },
  recalcWarnClose: {
    marginLeft: 'auto', background: 'transparent', border: 'none', color: '#F0B429',
    cursor: 'pointer', fontSize: 14, flexShrink: 0,
  },
  title:      { color:'#F0B429', fontFamily:"'Bebas Neue',sans-serif", fontSize:24, letterSpacing:1, marginBottom:8 },
  subtitle:   { color:'#EEF2F8', fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:.5, marginBottom:6 },
  hint:       { color:'#6B7A99', fontSize:13, marginBottom:16, lineHeight:1.6 },
  btnRefresh: { padding:'8px 16px', background:'transparent', border:'1px solid #1C2535', borderRadius:8, color:'#6B7A99', cursor:'pointer', fontSize:13, marginBottom:4 },
  temporadaChip: (activa) => ({
    padding:'6px 14px', borderRadius:100, cursor:'pointer', fontSize:12.5, fontWeight:700,
    fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:.5,
    border: activa ? '1px solid #F0B429' : '1px solid #1C2535',
    background: activa ? 'rgba(240,180,41,.14)' : 'transparent',
    color: activa ? '#F0B429' : '#6B7A99',
  }),
  empty:      { textAlign:'center', padding:'3rem', color:'#6B7A99' },
  card:       { background:'linear-gradient(160deg,#101826,#0B111C)', border:'1px solid #1C2535', borderRadius:10, padding:'14px 16px', display:'flex', gap:12, alignItems:'flex-start' },
  cardAlert:  { background:'linear-gradient(160deg,#1C1420,#0B111C)', border:'1px solid rgba(240,64,96,.35)', borderRadius:10, padding:'10px 14px', display:'flex', gap:10, alignItems:'center' },
  badge:      { background:'rgba(240,180,41,.15)', color:'#F0B429', padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:700, flexShrink:0 },
  marcador:   { background:'rgba(255,255,255,.06)', color:'#EEF2F8', padding:'2px 10px', borderRadius:100, fontSize:12, fontWeight:700, fontFamily:"'Bebas Neue',sans-serif" },
  chipSkip:   { background:'rgba(240,64,96,.15)', color:'#F04060', padding:'3px 10px', borderRadius:100, fontSize:11, fontWeight:700, flexShrink:0 },
  bannerNoStats: {
    marginTop:8, padding:'8px 12px', borderRadius:8, background:'rgba(240,64,96,.1)',
    border:'1px solid rgba(240,64,96,.35)', color:'#F04060', fontSize:12, fontWeight:600,
  },
  sinResolverBox: {
    marginTop:8, padding:'8px 12px', borderRadius:8, background:'rgba(240,180,41,.06)',
    border:'1px solid rgba(240,180,41,.25)',
  },
  btnDel:     { background:'transparent', border:'1px solid rgba(240,64,96,.3)', borderRadius:6, padding:'6px 10px', cursor:'pointer', fontSize:16, flexShrink:0 },
};
