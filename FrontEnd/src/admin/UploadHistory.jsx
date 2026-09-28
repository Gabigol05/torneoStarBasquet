import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TABLAS } from './categoriaAdmin';
import { equiposFemenino } from '../data/femeninoData';
import { equiposMasculino } from '../data/masculinoData';
import { useConfirm } from '../components/ConfirmModal.jsx';

export default function UploadHistory({ categoria: categoriaProp, setCategoria: setCategoriaProp } = {}) {
  const [categoriaLocal, setCategoriaLocal] = useState('femenino');
  const categoria    = categoriaProp ?? categoriaLocal;
  const setCategoria = setCategoriaProp ?? setCategoriaLocal;
  const tablas  = TABLAS[categoria];
  const roster  = categoria === 'masculino' ? equiposMasculino : equiposFemenino;
  const { confirm, ConfirmDialog } = useConfirm();

  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [justDeleted, setJustDeleted] = useState(false);

  // ⚠️ Antes esta pantalla solo mostraba equipos/archivo/cantidad de
  // jugadoras — no el marcador ni si esas estadísticas siguen realmente en
  // la base HOY (podían haberse borrado después con Fusionar Jugadores u
  // otra carga). Ahora se cruza cada carga contra el partido y contra
  // stats_partido en vivo, para que "¿este partido tiene stats o no?" se
  // vea de un vistazo sin tener que entrar a cada uno.
  const [partidoPorId,     setPartidoPorId]     = useState({});
  const [statsCountPorId,  setStatsCountPorId]  = useState({});

  // ⚠️ NUEVO: partidos marcados "finalizado" que HOY no tienen ni una fila
  // en stats_partido — el síntoma exacto reportado (marcador bien, tabla de
  // jugadoras vacía). Esto agarra CUALQUIER partido en ese estado, tenga o
  // no una carga en el Historial (si se cargó el resultado a mano desde
  // Partidos, por ejemplo, nunca aparece en el Historial de Cargas porque
  // esa pantalla no pasa por acá — por eso esta lista se arma aparte,
  // cruzando directo partidos × stats_partido).
  const [sinStats,        setSinStats]        = useState([]);
  const [loadingSinStats, setLoadingSinStats] = useState(true);
  const [fechaPorId,      setFechaPorId]      = useState({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(tablas.uploadLog)
      .select(`*, ${tablas.fechas}(numero)`)
      .order('cargado_en', { ascending: false })
      .limit(30);
    let logsCargados = [];
    if (error) {
      // Fallback por si el embed falla (relación no detectada): traer sin join.
      const { data: plain } = await supabase
        .from(tablas.uploadLog)
        .select('*')
        .order('cargado_en', { ascending: false })
        .limit(30);
      logsCargados = plain ?? [];
    } else {
      logsCargados = data ?? [];
    }
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

      // Cantidad de filas que TIENE HOY stats_partido para esos partidos —
      // puede diferir de jugadoras_ok (que quedó fijo en el momento de esa
      // carga puntual) si después se borró/fusionó algo.
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
    setLoadingSinStats(true);
    const [{ data: fechasRows }, { data: partidosRows }, { data: statsRows }] = await Promise.all([
      supabase.from(tablas.fechas).select('id,numero'),
      supabase.from(tablas.partidos)
        .select('id,equipo_local_id,equipo_visit_id,puntos_local,puntos_visit,fecha_id')
        .eq('estado', 'finalizado'),
      supabase.from(tablas.stats).select('partido_id'),
    ]);
    setFechaPorId(Object.fromEntries((fechasRows ?? []).map(f => [f.id, f.numero])));
    const conStats = new Set((statsRows ?? []).map(r => r.partido_id));
    setSinStats((partidosRows ?? []).filter(p => !conStats.has(p.id)));
    setLoadingSinStats(false);
  };

  useEffect(() => { load(); loadSinStats(); }, [categoria]);

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

  const numeroFecha = l => l[tablas.fechas]?.numero ?? l.fecha_id ?? '?';
  const equipoPorId = id => roster.find(e => e.id === id);

  return (
    <div>
      <h2 style={s.title}>🗂️ Historial de cargas</h2>
      <p style={s.hint}>Cada partido subido queda registrado. Podés ver warnings y eliminar cargas erróneas.</p>

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
          <p>Todavía no se cargó ningún partido.</p>
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
