import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TABLAS } from './categoriaAdmin';
import { useConfirm } from '../components/ConfirmModal.jsx';
import { recalcularTodos } from './RecalcularStats';

export default function MergeJugadores({ categoria: categoriaProp, setCategoria: setCategoriaProp } = {}) {
  const [categoriaLocal, setCategoriaLocal] = useState('masculino');
  const categoria    = categoriaProp ?? categoriaLocal;
  const setCategoria = setCategoriaProp ?? setCategoriaLocal;
  const tablas = TABLAS[categoria];
  const idField = tablas.jugadorIdField;

  const [equipos, setEquipos]       = useState([]);
  const [equipoId, setEquipoId]     = useState('');
  const [jugadores, setJugadores]   = useState([]);
  const [keeperId, setKeeperId]     = useState('');
  const [dupId, setDupId]           = useState('');
  const [loadingJug, setLoadingJug] = useState(false);
  const [error, setError]           = useState('');

  const [analizando, setAnalizando] = useState(false);
  const [analisis, setAnalisis]     = useState(null); // { keeperPartidos, dupPartidos, overlap }

  const [fusionando, setFusionando] = useState(false);
  const [log, setLog]               = useState([]);
  const [done, setDone]             = useState(false);
  const { confirm, ConfirmDialog }  = useConfirm();

  // Reset al cambiar de categoría
  useEffect(() => {
    setEquipoId(''); setJugadores([]); setKeeperId(''); setDupId('');
    setAnalisis(null); setLog([]); setDone(false); setError('');
  }, [categoria]);

  // Cargar equipos de la categoría
  useEffect(() => {
    let cancelado = false;
    supabase.from(tablas.equipos).select('id,nombre').order('nombre').then(({ data, error: err }) => {
      if (cancelado) return;
      if (err) setError(err.message);
      else setEquipos(data ?? []);
    });
    return () => { cancelado = true; };
  }, [categoria, tablas.equipos]);

  // Cargar roster del equipo elegido
  useEffect(() => {
    if (!equipoId) { setJugadores([]); return; }
    let cancelado = false;
    setLoadingJug(true);
    setKeeperId(''); setDupId(''); setAnalisis(null); setLog([]); setDone(false);
    supabase.from(tablas.jugadores).select('id,nombre,numero').eq('equipo_id', equipoId).order('nombre')
      .then(({ data, error: err }) => {
        if (cancelado) return;
        if (err) setError(err.message);
        else setJugadores(data ?? []);
        setLoadingJug(false);
      });
    return () => { cancelado = true; };
  }, [equipoId, tablas.jugadores]);

  const addLog = msg => setLog(l => [...l, msg]);

  const handleAnalizar = async () => {
    setError('');
    setAnalisis(null);
    setAnalizando(true);
    try {
      const [keeperRes, dupRes] = await Promise.all([
        supabase.from(tablas.stats).select('partido_id').eq(idField, keeperId),
        supabase.from(tablas.stats).select('partido_id').eq(idField, dupId),
      ]);
      if (keeperRes.error) throw keeperRes.error;
      if (dupRes.error) throw dupRes.error;
      const keeperSet = new Set((keeperRes.data ?? []).map(r => r.partido_id));
      const dupPartidos = (dupRes.data ?? []).map(r => r.partido_id);
      const overlap = dupPartidos.filter(pid => keeperSet.has(pid));
      setAnalisis({
        keeperCount: keeperSet.size,
        dupCount: dupPartidos.length,
        overlap,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalizando(false);
    }
  };

  const keeperJug = jugadores.find(j => j.id === keeperId);
  const dupJug    = jugadores.find(j => j.id === dupId);

  const handleFusionar = async () => {
    if (!analisis || analisis.overlap.length > 0) return;
    const ok = await confirm(
      `¿Fusionar "${dupJug?.nombre}" dentro de "${keeperJug?.nombre}"? Se reasignan ${analisis.dupCount} partido(s), se borra "${dupJug?.nombre}" del roster y se recalculan los promedios. Esta acción no se puede deshacer.`,
      { danger: true, confirmLabel: 'Fusionar y eliminar duplicado' }
    );
    if (!ok) return;

    setFusionando(true);
    setLog([]);
    setDone(false);
    try {
      addLog(`🔀 Reasignando ${analisis.dupCount} partido(s) de "${dupJug?.nombre}" a "${keeperJug?.nombre}"...`);
      const { error: errStats } = await supabase.from(tablas.stats).update({ [idField]: keeperId }).eq(idField, dupId);
      if (errStats) throw errStats;

      addLog('🏅 Reasignando referencias de MVP si las hubiera...');
      const { error: errMvp } = await supabase.from(tablas.partidos).update({ [tablas.mvpField]: keeperId }).eq(tablas.mvpField, dupId);
      if (errMvp) throw errMvp;

      addLog('🔗 Reasignando alias de nombre vinculados al duplicado...');
      const { error: errAlias } = await supabase.from(tablas.aliases).update({ [idField]: keeperId }).eq(idField, dupId);
      if (errAlias) throw errAlias;

      addLog('🧹 Borrando estadísticas acumuladas del duplicado...');
      const { error: errEstDel } = await supabase.from(tablas.estadisticas).delete().eq(idField, dupId);
      if (errEstDel) throw errEstDel;

      addLog(`🗑️ Borrando "${dupJug?.nombre}" del roster...`);
      const { error: errJugDel } = await supabase.from(tablas.jugadores).delete().eq('id', dupId);
      if (errJugDel) throw errJugDel;

      addLog('🔄 Recalculando promedios y acumulados de todo el torneo...');
      await recalcularTodos(addLog, tablas);

      addLog(`🎉 Listo — "${dupJug?.nombre}" quedó fusionado dentro de "${keeperJug?.nombre}".`);
      setDone(true);
      // refrescar roster local
      setJugadores(prev => prev.filter(j => j.id !== dupId));
      setDupId(''); setAnalisis(null);
    } catch (err) {
      addLog(`❌ Error: ${err.message}`);
      setError(err.message);
    } finally {
      setFusionando(false);
    }
  };

  return (
    <div>
      {ConfirmDialog}
      <h2 style={S.title}>🧬 Fusionar jugadores duplicados</h2>
      <p style={S.hint}>
        Usá esto cuando el mismo jugador/a quedó cargado dos veces con IDs distintos
        (típicamente porque un Excel escribió el nombre distinto y no matcheó con nadie,
        creando un jugador nuevo). Elegí a cuál te quedás ("mantener") y cuál se
        fusiona y desaparece ("duplicado"): sus partidos, MVPs y alias pasan al que
        se mantiene, y los promedios se recalculan solos.
      </p>
      {categoria === 'femenino' && (
        <div style={S.warning}>
          <span>⚠️</span>
          <span>El roster femenino es fijo (no se crean jugadoras nuevas desde el Excel), así que esto rara vez hace falta acá — es más común en masculino.</span>
        </div>
      )}

      {error && <div style={{ ...S.msg, color: '#F04060' }}>❌ {error}</div>}

      <div style={S.row}>
        <label style={S.label}>Equipo</label>
        <select value={equipoId} onChange={e => setEquipoId(e.target.value)} style={S.select}>
          <option value="">Elegí un equipo...</option>
          {equipos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
      </div>

      {equipoId && (
        loadingJug ? (
          <div style={S.msg}>Cargando jugadores...</div>
        ) : jugadores.length < 2 ? (
          <div style={S.msg}>Este equipo tiene menos de 2 jugadores cargados — nada para fusionar.</div>
        ) : (
          <>
            <div style={S.row}>
              <label style={S.label}>Mantener (queda con este nombre)</label>
              <select value={keeperId} onChange={e => { setKeeperId(e.target.value); setAnalisis(null); setDone(false); }} style={S.select}>
                <option value="">Elegí...</option>
                {jugadores.filter(j => j.id !== dupId).map(j => (
                  <option key={j.id} value={j.id}>{j.nombre}{j.numero != null ? ` (#${j.numero})` : ''}</option>
                ))}
              </select>
            </div>

            <div style={S.row}>
              <label style={S.label}>Duplicado (se fusiona y se borra)</label>
              <select value={dupId} onChange={e => { setDupId(e.target.value); setAnalisis(null); setDone(false); }} style={S.select}>
                <option value="">Elegí...</option>
                {jugadores.filter(j => j.id !== keeperId).map(j => (
                  <option key={j.id} value={j.id}>{j.nombre}{j.numero != null ? ` (#${j.numero})` : ''}</option>
                ))}
              </select>
            </div>

            {keeperId && dupId && (
              <button onClick={handleAnalizar} disabled={analizando} style={{ ...S.btnSecondary, opacity: analizando ? 0.5 : 1 }}>
                {analizando ? '⏳ Analizando...' : '🔍 Analizar antes de fusionar'}
              </button>
            )}

            {analisis && (
              <div style={S.analisisBox}>
                <div>👤 {keeperJug?.nombre}: {analisis.keeperCount} partido(s) cargado(s)</div>
                <div>👤 {dupJug?.nombre}: {analisis.dupCount} partido(s) cargado(s)</div>
                {analisis.overlap.length > 0 ? (
                  <div style={{ marginTop: 10, color: '#F04060' }}>
                    ⚠️ Hay {analisis.overlap.length} partido(s) cargado(s) para AMBOS jugadores
                    (ids de partido: {analisis.overlap.join(', ')}). No se puede fusionar
                    automáticamente porque no sabemos cuál de las dos cargas es la correcta.
                    Revisá esos partidos en "Editar Stats" o "Partidos", corregí/borrá la carga
                    duplicada a mano, y volvé a analizar.
                  </div>
                ) : (
                  <div style={{ marginTop: 10, color: '#22D07A' }}>
                    ✅ Sin conflictos — se pueden fusionar sin pisar ningún partido.
                  </div>
                )}
              </div>
            )}

            {analisis && analisis.overlap.length === 0 && (
              <button onClick={handleFusionar} disabled={fusionando} style={{ ...S.btnDanger, opacity: fusionando ? 0.5 : 1 }}>
                {fusionando ? '⏳ Fusionando...' : `🔀 Fusionar "${dupJug?.nombre}" dentro de "${keeperJug?.nombre}"`}
              </button>
            )}
          </>
        )
      )}

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
          ✅ Fusión completada. El sitio ya refleja el roster y los promedios actualizados.
        </div>
      )}
    </div>
  );
}

const S = {
  title:   { color: '#F0B429', fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, letterSpacing: 1, marginBottom: 12 },
  hint:    { color: '#6B7A99', fontSize: 13, lineHeight: 1.6, marginBottom: 16, maxWidth: 720 },
  warning: { display: 'flex', gap: 10, background: 'rgba(240,180,41,.08)', border: '1px solid rgba(240,180,41,.2)',
             borderRadius: 8, padding: '10px 14px', color: '#F0B429', fontSize: 13, marginBottom: 20, maxWidth: 720 },
  msg:     { color: '#8899BB', fontSize: 14, padding: '0.5rem 0' },
  row:     { marginBottom: 16, maxWidth: 420 },
  label:   { display: 'block', fontSize: 12, color: '#6B7A99', fontFamily: "'Barlow Condensed',sans-serif",
             letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  select:  { width: '100%', padding: '10px 12px', background: '#0E1420', border: '1px solid #1C2535',
             borderRadius: 8, color: '#EEF2F8', fontSize: 14, fontFamily: "'Barlow Condensed',sans-serif" },
  btnSecondary: { padding: '10px 22px', background: 'rgba(24,120,232,.1)', border: '1px solid rgba(24,120,232,.3)',
             borderRadius: 8, color: '#4FA3FF', fontFamily: "'Bebas Neue',sans-serif", fontSize: 16,
             letterSpacing: 1, cursor: 'pointer', marginBottom: 16 },
  btnDanger: { padding: '13px 32px', background: 'linear-gradient(135deg,#F04060,#B8203E)', border: 'none',
             borderRadius: 10, color: '#fff', fontFamily: "'Bebas Neue',sans-serif", fontSize: 18,
             letterSpacing: 1, cursor: 'pointer', marginTop: 4 },
  analisisBox: { background: '#0E1420', border: '1px solid #1C2535', borderRadius: 10, padding: '14px 16px',
             fontSize: 13, color: '#EEF2F8', lineHeight: 1.7, marginBottom: 16, maxWidth: 720 },
  logBox:  { marginTop: 20, background: '#0E1420', border: '1px solid #1C2535', borderRadius: 10,
             padding: '1rem', minHeight: 60 },
};
