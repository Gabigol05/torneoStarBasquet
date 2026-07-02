import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';

const EQUIPOS = equiposFemenino.map(e => ({ id: e.id, nombre: e.name ?? e.nombre, logo: e.logo, color: e.color }));

const EMPTY_PARTIDO = {
  equipo_local_id: '', equipo_visit_id: '',
  fecha_id: '', hora_inicio: '', lugar: '', estado: 'pendiente',
  q1_local:'', q2_local:'', q3_local:'', q4_local:'', ot_local:'',
  q1_visit:'', q2_visit:'', q3_visit:'', q4_visit:'', ot_visit:'',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const n = v => Number(v) || 0;

function calcPuntos(form, side) {
  return n(form[`q1_${side}`]) + n(form[`q2_${side}`]) + n(form[`q3_${side}`]) + n(form[`q4_${side}`]) + n(form[`ot_${side}`]);
}

function LogoEq({ id, size = 28 }) {
  const eq = EQUIPOS.find(e => e.id === id);
  if (!eq?.logo) return <div style={{ width: size, height: size, borderRadius: '50%', background: '#1C2535' }}/>;
  return (
    <img src={eq.logo} alt={eq.nombre}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      onError={e => { e.target.style.display = 'none'; }}
    />
  );
}

function EstadoBadge({ estado }) {
  const map = {
    pendiente:  { label: 'PENDIENTE',  bg: 'rgba(107,122,153,.15)', color: '#6B7A99' },
    en_juego:   { label: '🔴 EN VIVO', bg: 'rgba(240,64,96,.15)',   color: '#F04060' },
    finalizado: { label: 'FINAL',      bg: 'rgba(34,208,122,.12)',  color: '#22D07A' },
  };
  const s = map[estado] ?? map.pendiente;
  return (
    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 1, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ── Formulario de un partido ──────────────────────────────────────────────────
function PartidoForm({ form, setForm, fechas, onSave, onCancel, loading, editId }) {
  const ptsLocal = calcPuntos(form, 'local');
  const ptsVisit = calcPuntos(form, 'visit');

  const field = (key, label, placeholder = '') => (
    <div style={F.group}>
      <label style={F.label}>{label}</label>
      <input
        value={form[key] ?? ''}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        placeholder={placeholder}
        style={F.input}
      />
    </div>
  );

  const qInput = (key, color = '#EEF2F8') => (
    <input
      type="number" min="0"
      value={form[key] ?? ''}
      onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
      style={{ ...F.qInput, borderColor: form[key] ? 'rgba(240,180,41,.4)' : '#1C2535', color }}
    />
  );

  return (
    <div style={F.card}>
      <div style={{ marginBottom: 16, fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 1, color: '#F0B429' }}>
        {editId ? '✏️ EDITAR PARTIDO' : '➕ NUEVO PARTIDO'}
      </div>

      {/* Equipos */}
      <div style={F.row}>
        <div style={F.group}>
          <label style={F.label}>EQUIPO LOCAL *</label>
          <select value={form.equipo_local_id} onChange={e => setForm(p => ({ ...p, equipo_local_id: e.target.value }))} style={F.input}>
            <option value="">— Seleccionar —</option>
            {EQUIPOS.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>
        <div style={F.group}>
          <label style={F.label}>EQUIPO VISITANTE *</label>
          <select value={form.equipo_visit_id} onChange={e => setForm(p => ({ ...p, equipo_visit_id: e.target.value }))} style={F.input}>
            <option value="">— Seleccionar —</option>
            {EQUIPOS.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>
      </div>

      {/* Fecha, hora, lugar */}
      <div style={F.row}>
        <div style={F.group}>
          <label style={F.label}>FECHA</label>
          <select value={form.fecha_id} onChange={e => setForm(p => ({ ...p, fecha_id: e.target.value }))} style={F.input}>
            <option value="">Sin asignar</option>
            {fechas.map(f => <option key={f.id} value={f.id}>{f.descripcion ?? `Fecha ${f.numero}`}</option>)}
          </select>
        </div>
        <div style={F.group}>
          <label style={F.label}>ESTADO</label>
          <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))} style={F.input}>
            <option value="pendiente">Pendiente</option>
            <option value="en_juego">En juego</option>
            <option value="finalizado">Finalizado</option>
          </select>
        </div>
      </div>

      <div style={F.row}>
        {field('hora_inicio', 'HORARIO', 'HH:MM')}
        {field('lugar', 'LUGAR', 'Club, cancha...')}
      </div>

      {/* Parciales */}
      {(form.estado === 'en_juego' || form.estado === 'finalizado') && (
        <div style={{ marginTop: 8, marginBottom: 16 }}>
          <label style={F.label}>PARCIALES POR CUARTO</label>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['', 'Q1', 'Q2', 'Q3', 'Q4', 'OT', 'TOTAL'].map(h => (
                  <th key={h} style={F.qth}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: '#0E1420' }}>
                <td style={{ ...F.qtd, fontWeight: 700, color: '#EEF2F8', textAlign: 'left', padding: '6px 10px', fontSize: 12 }}>
                  LOCAL
                </td>
                {['q1','q2','q3','q4','ot'].map(q => (
                  <td key={q} style={F.qtd}>{qInput(`${q}_local`, '#F0B429')}</td>
                ))}
                <td style={{ ...F.qtd, fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: '#F0B429', fontWeight: 700 }}>
                  {ptsLocal}
                </td>
              </tr>
              <tr style={{ background: '#141C2A' }}>
                <td style={{ ...F.qtd, fontWeight: 700, color: '#EEF2F8', textAlign: 'left', padding: '6px 10px', fontSize: 12 }}>
                  VISIT
                </td>
                {['q1','q2','q3','q4','ot'].map(q => (
                  <td key={q} style={F.qtd}>{qInput(`${q}_visit`, '#60A5FA')}</td>
                ))}
                <td style={{ ...F.qtd, fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: '#60A5FA', fontWeight: 700 }}>
                  {ptsVisit}
                </td>
              </tr>
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: '#4A566E', marginTop: 6 }}>
            💡 El total se calcula automáticamente sumando los cuartos
          </div>
        </div>
      )}

      {/* Botones */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button onClick={onSave} disabled={loading || !form.equipo_local_id || !form.equipo_visit_id}
          style={{ ...F.btnPrimary, opacity: loading || !form.equipo_local_id || !form.equipo_visit_id ? 0.5 : 1 }}>
          {loading ? 'Guardando...' : editId ? '💾 ACTUALIZAR' : '✅ CREAR PARTIDO'}
        </button>
        <button onClick={onCancel} style={F.btnSec}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Fixture masivo ────────────────────────────────────────────────────────────
function FixtureMasivo({ fechas, onCrearFecha, onClose }) {
  const [numFecha, setNumFecha]   = useState('');
  const [partidos, setPartidos]   = useState([
    { local: '', visit: '', hora: '', lugar: '' }
  ]);
  const [loading, setLoading]     = useState(false);
  const [msg, setMsg]             = useState(null);

  const flash = (text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  const addPartido = () => setPartidos(p => [...p, { local: '', visit: '', hora: '', lugar: '' }]);
  const remPartido = i => setPartidos(p => p.filter((_, j) => j !== i));

  const handleSave = async () => {
    if (!numFecha) { flash('Ingresá el número de fecha', false); return; }
    const validos = partidos.filter(p => p.local && p.visit && p.local !== p.visit);
    if (validos.length === 0) { flash('Agregá al menos un partido válido', false); return; }

    setLoading(true);
    try {
      // Crear/obtener fecha — primero buscar si existe
      let fechaId;
      const { data: existing } = await supabase
        .from('fechas_femenino').select('id').eq('numero', Number(numFecha)).maybeSingle();

      if (existing) {
        fechaId = existing.id;
      } else {
        const { data: newFecha, error: fErr } = await supabase
          .from('fechas_femenino')
          .insert({ numero: Number(numFecha), descripcion: `Fecha ${numFecha}` })
          .select('id').single();
        if (fErr) throw new Error(`Fecha: ${fErr.message}`);
        fechaId = newFecha.id;
      }

      // Insertar partidos
      const rows = validos.map(p => ({
        fecha_id: fechaId,
        equipo_local_id: p.local,
        equipo_visit_id: p.visit,
        hora_inicio: p.hora || null,
        lugar: p.lugar || null,
        estado: 'pendiente',
        puntos_local: 0,
        puntos_visit: 0,
      }));

      const { error: pErr } = await supabase.from('partidos_femenino').insert(rows);
      if (pErr) throw new Error(`Partidos: ${pErr.message}`);

      flash(`✅ ${validos.length} partido(s) creados en Fecha ${numFecha}`);
      await onCrearFecha();
      setTimeout(onClose, 1500);
    } catch (err) {
      flash(`❌ ${err.message}`, false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={F.card}>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, letterSpacing: 1, color: '#F0B429', marginBottom: 16 }}>
        📅 CARGAR FIXTURE DE UNA FECHA
      </div>

      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14,
          background: msg.ok ? 'rgba(34,208,122,.1)' : 'rgba(240,64,96,.1)',
          color: msg.ok ? '#22D07A' : '#F04060',
          border: `1px solid ${msg.ok ? 'rgba(34,208,122,.3)' : 'rgba(240,64,96,.3)'}` }}>
          {msg.text}
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <label style={F.label}>N° DE FECHA *</label>
        <input type="number" min="1" value={numFecha}
          onChange={e => setNumFecha(e.target.value)}
          style={{ ...F.input, maxWidth: 120 }} placeholder="6" />
      </div>

      {/* Lista de partidos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {partidos.map((p, i) => (
          <div key={i} style={{ background: '#141C2A', border: '1px solid #1C2535', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, color: '#4A566E' }}>PARTIDO {i + 1}</span>
              {partidos.length > 1 && (
                <button onClick={() => remPartido(i)}
                  style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#F04060', cursor: 'pointer', fontSize: 16 }}>
                  ✕
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={p.local} onChange={e => setPartidos(ps => ps.map((x, j) => j === i ? { ...x, local: e.target.value } : x))}
                style={{ ...F.input, flex: 1, minWidth: 140 }}>
                <option value="">— Local —</option>
                {EQUIPOS.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
              <span style={{ display: 'flex', alignItems: 'center', color: '#4A566E', fontFamily: "'Bebas Neue',sans-serif" }}>VS</span>
              <select value={p.visit} onChange={e => setPartidos(ps => ps.map((x, j) => j === i ? { ...x, visit: e.target.value } : x))}
                style={{ ...F.input, flex: 1, minWidth: 140 }}>
                <option value="">— Visitante —</option>
                {EQUIPOS.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
              <input type="time" value={p.hora}
                onChange={e => setPartidos(ps => ps.map((x, j) => j === i ? { ...x, hora: e.target.value } : x))}
                style={{ ...F.input, width: 110 }} />
              <input type="text" placeholder="Lugar" value={p.lugar}
                onChange={e => setPartidos(ps => ps.map((x, j) => j === i ? { ...x, lugar: e.target.value } : x))}
                style={{ ...F.input, flex: 1, minWidth: 120 }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={addPartido} style={{ ...F.btnSec, borderColor: 'rgba(240,180,41,.3)', color: '#F0B429' }}>
          + Agregar partido
        </button>
        <button onClick={handleSave} disabled={loading}
          style={{ ...F.btnPrimary, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Guardando...' : `📅 CREAR FIXTURE (${partidos.filter(p => p.local && p.visit).length} partidos)`}
        </button>
        <button onClick={onClose} style={F.btnSec}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function PartidosManager() {
  const [partidos,     setPartidos]     = useState([]);
  const [fechas,       setFechas]       = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [view,         setView]         = useState('lista'); // 'lista'|'nuevo'|'fixture'
  const [form,         setForm]         = useState(EMPTY_PARTIDO);
  const [editId,       setEditId]       = useState(null);
  const [msg,          setMsg]          = useState(null);
  const [filtroFecha,  setFiltroFecha]  = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const flash = useCallback((text, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3500);
  }, []);

  const loadAll = useCallback(async () => {
    const [{ data: ps }, { data: fs }] = await Promise.all([
      supabase.from('partidos_femenino').select('*').order('fecha_id').order('id'),
      supabase.from('fechas_femenino').select('*').order('numero'),
    ]);
    setPartidos(ps ?? []);
    setFechas(fs ?? []);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Recalcular promedios de jugadoras afectadas ──
  const recalcularJugadoras = async (partidoId) => {
    const { data: stats } = await supabase
      .from('stats_partido_femenino')
      .select('jugadora_id')
      .eq('partido_id', partidoId);

    const ids = [...new Set((stats ?? []).map(r => r.jugadora_id))];
    for (const jugId of ids) {
      const { data: allStats } = await supabase
        .from('stats_partido_femenino')
        .select('pts,rd,ro,as_,rb,tp,pe,val,sc,sf,dc,df,tc,tf')
        .eq('jugadora_id', jugId);

      if (!allStats?.length) {
        await supabase.from('estadisticas_femenino').delete().eq('jugadora_id', jugId);
        continue;
      }

      const k = allStats.length;
      const sum = key => allStats.reduce((a, r) => a + (r[key] ?? 0), 0);
      const tsc = sum('sc'), tsf = sum('sf');
      const tdc = sum('dc'), tdf = sum('df');
      const ttc = sum('tc'), ttf = sum('tf');
      const trd = sum('rd'), tro = sum('ro');

      await supabase.from('estadisticas_femenino').upsert({
        jugadora_id: jugId, pj: k,
        pts_prom:    +(sum('pts')/k).toFixed(1),
        reb_prom:    +((trd+tro)/k).toFixed(1),
        ast_prom:    +(sum('as_')/k).toFixed(1),
        rob_prom:    +(sum('rb')/k).toFixed(1),
        tap_prom:    +(sum('tp')/k).toFixed(1),
        per_prom:    +(sum('pe')/k).toFixed(1),
        val_prom:    +(sum('val')/k).toFixed(1),
        pct_simples: tsc+tsf>0 ? +((tsc/(tsc+tsf))*100).toFixed(1) : 0,
        pct_dobles:  tdc+tdf>0 ? +((tdc/(tdc+tdf))*100).toFixed(1) : 0,
        pct_triples: ttc+ttf>0 ? +((ttc/(ttc+ttf))*100).toFixed(1) : 0,
        pts_total: sum('pts'), reb_total: trd+tro, ast_total: sum('as_'),
        mejor_pts: Math.max(...allStats.map(r=>r.pts??0)),
        sc_total:tsc, sf_total:tsf, dc_total:tdc, df_total:tdf, tc_total:ttc, tf_total:ttf,
        sc_prom:+(tsc/k).toFixed(1), dc_prom:+(tdc/k).toFixed(1), tc_prom:+(ttc/k).toFixed(1),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'jugadora_id' });
    }
  };

  const handleSave = async () => {
    if (!form.equipo_local_id || !form.equipo_visit_id) {
      flash('❌ Seleccioná ambos equipos', false); return;
    }
    if (form.equipo_local_id === form.equipo_visit_id) {
      flash('❌ Local y visitante no pueden ser el mismo equipo', false); return;
    }

    setLoading(true);
    try {
      // ⚠️ FIX CRÍTICO: calcular puntos_local y puntos_visit
      const ptsLocal = calcPuntos(form, 'local');
      const ptsVisit = calcPuntos(form, 'visit');

      const payload = {
        equipo_local_id: form.equipo_local_id,
        equipo_visit_id: form.equipo_visit_id,
        fecha_id:        form.fecha_id ? Number(form.fecha_id) : null,
        lugar:           form.lugar    || null,
        hora_inicio:     form.hora_inicio || null,
        estado:          form.estado,
        q1_local: n(form.q1_local), q2_local: n(form.q2_local),
        q3_local: n(form.q3_local), q4_local: n(form.q4_local), ot_local: n(form.ot_local),
        q1_visit: n(form.q1_visit), q2_visit: n(form.q2_visit),
        q3_visit: n(form.q3_visit), q4_visit: n(form.q4_visit), ot_visit: n(form.ot_visit),
        // ⚠️ FIX: siempre calcular puntos totales
        puntos_local: ptsLocal,
        puntos_visit: ptsVisit,
      };

      if (editId) {
        const { error } = await supabase.from('partidos_femenino').update(payload).eq('id', editId);
        if (error) throw error;
        flash('✅ Partido actualizado');
      } else {
        const { error } = await supabase.from('partidos_femenino').insert(payload);
        if (error) throw error;
        flash('✅ Partido creado');
      }

      setForm(EMPTY_PARTIDO); setEditId(null); setView('lista');
      await loadAll();
    } catch (err) {
      flash(`❌ ${err.message}`, false);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (p) => {
    setForm({
      equipo_local_id: p.equipo_local_id ?? '',
      equipo_visit_id: p.equipo_visit_id ?? '',
      fecha_id:    p.fecha_id    ? String(p.fecha_id) : '',
      hora_inicio: p.hora_inicio ? String(p.hora_inicio).slice(0,5) : '',
      lugar:       p.lugar       ?? '',
      estado:      p.estado      ?? 'pendiente',
      q1_local: p.q1_local ?? '', q2_local: p.q2_local ?? '',
      q3_local: p.q3_local ?? '', q4_local: p.q4_local ?? '', ot_local: p.ot_local ?? '',
      q1_visit: p.q1_visit ?? '', q2_visit: p.q2_visit ?? '',
      q3_visit: p.q3_visit ?? '', q4_visit: p.q4_visit ?? '', ot_visit: p.ot_visit ?? '',
    });
    setEditId(p.id);
    setView('nuevo');
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este partido y todas sus estadísticas?\n\nEsta acción no se puede deshacer.')) return;
    setLoading(true);
    try {
      // Guardar IDs de jugadoras antes de borrar para recalcular
      const { data: stats } = await supabase
        .from('stats_partido_femenino').select('jugadora_id').eq('partido_id', id);
      const jugIds = [...new Set((stats ?? []).map(r => r.jugadora_id))];

      await supabase.from('partidos_femenino').delete().eq('id', id);

      // Recalcular promedios de las jugadoras afectadas
      for (const jugId of jugIds) {
        const { data: allStats } = await supabase
          .from('stats_partido_femenino')
          .select('pts,rd,ro,as_,rb,tp,pe,val,sc,sf,dc,df,tc,tf')
          .eq('jugadora_id', jugId);

        if (!allStats?.length) {
          await supabase.from('estadisticas_femenino').delete().eq('jugadora_id', jugId);
          continue;
        }

        const k = allStats.length;
        const sum = key => allStats.reduce((a, r) => a + (r[key] ?? 0), 0);
        const tsc=sum('sc'),tsf=sum('sf'),tdc=sum('dc'),tdf=sum('df'),ttc=sum('tc'),ttf=sum('tf');
        const trd=sum('rd'),tro=sum('ro');

        await supabase.from('estadisticas_femenino').upsert({
          jugadora_id:jugId, pj:k,
          pts_prom:+(sum('pts')/k).toFixed(1), reb_prom:+((trd+tro)/k).toFixed(1),
          ast_prom:+(sum('as_')/k).toFixed(1), rob_prom:+(sum('rb')/k).toFixed(1),
          tap_prom:+(sum('tp')/k).toFixed(1),  per_prom:+(sum('pe')/k).toFixed(1),
          val_prom:+(sum('val')/k).toFixed(1),
          pct_simples:tsc+tsf>0?+((tsc/(tsc+tsf))*100).toFixed(1):0,
          pct_dobles: tdc+tdf>0?+((tdc/(tdc+tdf))*100).toFixed(1):0,
          pct_triples:ttc+ttf>0?+((ttc/(ttc+ttf))*100).toFixed(1):0,
          pts_total:sum('pts'), reb_total:trd+tro, ast_total:sum('as_'),
          mejor_pts:Math.max(...allStats.map(r=>r.pts??0)),
          sc_total:tsc,sf_total:tsf,dc_total:tdc,df_total:tdf,tc_total:ttc,tf_total:ttf,
          sc_prom:+(tsc/k).toFixed(1),dc_prom:+(tdc/k).toFixed(1),tc_prom:+(ttc/k).toFixed(1),
        }, { onConflict:'jugadora_id' });
      }

      flash('✅ Partido eliminado y promedios actualizados');
      await loadAll();
    } catch (err) {
      flash(`❌ ${err.message}`, false);
    } finally {
      setLoading(false);
    }
  };

  const handleEstado = async (id, estado) => {
    try {
      const { error } = await supabase.from('partidos_femenino').update({ estado }).eq('id', id);
      if (error) throw error;
      await loadAll();
      flash(`✅ Estado actualizado: ${estado}`);
    } catch (err) {
      flash(`❌ ${err.message}`, false);
    }
  };

  const cancelForm = () => { setForm(EMPTY_PARTIDO); setEditId(null); setView('lista'); };

  // ⚠️ FIX CRÍTICO: comparar como strings en ambos lados
  const partidosFiltrados = partidos.filter(p => {
    if (filtroFecha  && String(p.fecha_id) !== String(filtroFecha))  return false;
    if (filtroEstado && p.estado !== filtroEstado) return false;
    return true;
  });

  const nombreEq = id => EQUIPOS.find(e => e.id === id)?.nombre ?? id;

  // Agrupar por fecha
  const porFecha = {};
  for (const p of partidosFiltrados) {
    const fid = p.fecha_id ?? 'sin-fecha';
    if (!porFecha[fid]) porFecha[fid] = [];
    porFecha[fid].push(p);
  }
  const fechaIds = Object.keys(porFecha).sort((a, b) => {
    if (a === 'sin-fecha') return 1;
    if (b === 'sin-fecha') return -1;
    return Number(a) - Number(b);
  });

  return (
    <div>
      {/* Flash */}
      {msg && (
        <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:16, fontSize:14,
          background: msg.ok ? 'rgba(34,208,122,.1)' : 'rgba(240,64,96,.1)',
          color: msg.ok ? '#22D07A' : '#F04060',
          border: `1px solid ${msg.ok ? 'rgba(34,208,122,.3)' : 'rgba(240,64,96,.3)'}` }}>
          {msg.text}
        </div>
      )}

      {/* Acciones */}
      {view === 'lista' && (
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
          <button onClick={() => setView('fixture')}
            style={{ ...F.btnPrimary, background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', flex:1, maxWidth:280 }}>
            📅 CARGAR FIXTURE DE UNA FECHA
          </button>
          <button onClick={() => setView('nuevo')}
            style={{ ...F.btnSec, display:'flex', alignItems:'center', gap:6 }}>
            ➕ Partido individual
          </button>
        </div>
      )}

      {/* Fixture masivo */}
      {view === 'fixture' && (
        <FixtureMasivo fechas={fechas} onCrearFecha={loadAll} onClose={() => setView('lista')}/>
      )}

      {/* Formulario individual */}
      {view === 'nuevo' && (
        <PartidoForm
          form={form} setForm={setForm} fechas={fechas}
          onSave={handleSave} onCancel={cancelForm}
          loading={loading} editId={editId}
        />
      )}

      {/* Filtros */}
      {view === 'lista' && (
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <select value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)}
            style={{ ...F.input, flex:1, minWidth:140 }}>
            <option value="">Todas las fechas</option>
            {fechas.map(f => <option key={f.id} value={String(f.id)}>{f.descripcion ?? `Fecha ${f.numero}`}</option>)}
          </select>
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
            style={{ ...F.input, flex:1, minWidth:140 }}>
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="en_juego">En juego</option>
            <option value="finalizado">Finalizados</option>
          </select>
          <div style={{ fontSize:12, color:'#4A566E' }}>
            {partidosFiltrados.length} partido(s)
          </div>
        </div>
      )}

      {/* Lista */}
      {view === 'lista' && (
        partidos.length === 0 ? (
          <div style={{ textAlign:'center', padding:'3rem', color:'#6B7A99' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📅</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:'#EEF2F8', marginBottom:8 }}>
              Sin partidos cargados
            </div>
            <div>Usá "Cargar Fixture de una Fecha" para empezar</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {fechaIds.map(fid => {
              const fecha = fechas.find(f => f.id === Number(fid));
              const ps    = porFecha[fid];
              return (
                <div key={fid}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, paddingBottom:8, borderBottom:'1px solid #1C2535' }}>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:1, color:'#F0B429' }}>
                      {fecha ? (fecha.descripcion ?? `Fecha ${fecha.numero}`) : 'Sin fecha asignada'}
                    </div>
                    <div style={{ fontSize:11, color:'#4A566E' }}>{ps.length} partido(s)</div>
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {ps.map(p => (
                      <div key={p.id} style={{
                        background:'#0E1420', border:'1px solid #1C2535',
                        borderRadius:12, padding:'14px 16px',
                        display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
                      }}>
                        <div style={{ flex:1, minWidth:220 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                            <LogoEq id={p.equipo_local_id} size={24}/>
                            <span style={{ color:'#EEF2F8', fontWeight:600, fontSize:14 }}>{nombreEq(p.equipo_local_id)}</span>
                            {p.estado === 'finalizado' ? (
                              <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:'#F0B429', margin:'0 4px' }}>
                                {p.puntos_local ?? 0} – {p.puntos_visit ?? 0}
                              </span>
                            ) : (
                              <span style={{ color:'#4A566E', margin:'0 6px', fontSize:12 }}>vs</span>
                            )}
                            <span style={{ color:'#EEF2F8', fontWeight:600, fontSize:14 }}>{nombreEq(p.equipo_visit_id)}</span>
                            <LogoEq id={p.equipo_visit_id} size={24}/>
                          </div>
                          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                            <EstadoBadge estado={p.estado}/>
                            {p.hora_inicio && (
                              <span style={{ fontSize:12, color:'#F0B429', fontFamily:"'Bebas Neue',sans-serif" }}>
                                🕐 {String(p.hora_inicio).slice(0,5)}
                              </span>
                            )}
                            {p.lugar && <span style={{ fontSize:11, color:'#4A566E' }}>📍 {p.lugar}</span>}
                            {p.estado === 'finalizado' && p.q1_local != null && (
                              <div style={{ display:'flex', gap:4 }}>
                                {['q1','q2','q3','q4'].map(q => (
                                  <span key={q} style={{ fontSize:10, background:'#141C2A', borderRadius:3, padding:'1px 5px', color:'#6B7A99' }}>
                                    {p[`${q}_local`]}-{p[`${q}_visit`]}
                                  </span>
                                ))}
                                {(p.ot_local > 0 || p.ot_visit > 0) && (
                                  <span style={{ fontSize:10, background:'rgba(240,180,41,.1)', borderRadius:3, padding:'1px 5px', color:'#F0B429' }}>
                                    OT {p.ot_local}-{p.ot_visit}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Acciones */}
                        <div style={{ display:'flex', gap:6, flexShrink:0, flexWrap:'wrap' }}>
                          {p.estado === 'pendiente' && (
                            <button onClick={() => handleEstado(p.id, 'en_juego')}
                              style={{ ...F.quickBtn, borderColor:'rgba(240,180,41,.3)', color:'#F0B429' }}>
                              ▶ En vivo
                            </button>
                          )}
                          {p.estado === 'en_juego' && (
                            <button onClick={() => handleEstado(p.id, 'finalizado')}
                              style={{ ...F.quickBtn, borderColor:'rgba(34,208,122,.3)', color:'#22D07A' }}>
                              ✓ Finalizar
                            </button>
                          )}
                          <button onClick={() => handleEdit(p)}
                            style={{ ...F.quickBtn, borderColor:'#1C2535', color:'#6B7A99' }}
                            title="Editar partido">
                            ✏️
                          </button>
                          <button onClick={() => handleDelete(p.id)}
                            style={{ ...F.quickBtn, borderColor:'rgba(240,64,96,.2)', color:'#F04060' }}
                            title="Eliminar partido">
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

const F = {
  label:     { fontSize:10, fontWeight:700, letterSpacing:2, color:'#4A566E', display:'block', marginBottom:6 },
  input:     { width:'100%', padding:'10px 12px', background:'#141C2A', border:'1px solid #1C2535', borderRadius:8, color:'#EEF2F8', fontSize:14, outline:'none', boxSizing:'border-box' },
  card:      { background:'#0E1420', border:'1px solid rgba(240,180,41,.2)', borderRadius:14, padding:'1.5rem', marginBottom:20 },
  row:       { display:'flex', gap:14, marginBottom:16, flexWrap:'wrap' },
  group:     { flex:1, minWidth:160, display:'flex', flexDirection:'column' },
  qth:       { padding:'8px 10px', color:'#6B7A99', fontSize:11, letterSpacing:.5, background:'#080C12', border:'1px solid #1C2535', textAlign:'center' },
  qtd:       { padding:'6px 8px', textAlign:'center', border:'1px solid #1C2535' },
  qInput:    { width:52, padding:'6px 4px', background:'#080C12', border:'1px solid', borderRadius:5, color:'#EEF2F8', fontSize:16, textAlign:'center', outline:'none', fontFamily:"'Bebas Neue',sans-serif" },
  btnPrimary:{ padding:'11px 20px', background:'linear-gradient(135deg,#F0B429,#FF6B2B)', border:'none', borderRadius:9, color:'#080C12', fontFamily:"'Bebas Neue',sans-serif", fontSize:17, letterSpacing:1, cursor:'pointer' },
  btnSec:    { padding:'10px 18px', background:'transparent', border:'1px solid #4A566E', borderRadius:9, color:'#6B7A99', cursor:'pointer', fontSize:13 },
  quickBtn:  { padding:'6px 10px', background:'transparent', border:'1px solid', borderRadius:7, cursor:'pointer', fontSize:13 },
};