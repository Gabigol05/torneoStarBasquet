import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';

const EQUIPOS = equiposFemenino.map(e => ({ id: e.id, nombre: e.nombre }));

const EMPTY_PARTIDO = {
  equipo_local_id: '',
  equipo_visit_id: '',
  puntos_local: '',
  puntos_visit: '',
  fecha: '',
  lugar: '',
  jornada: '',
  estado: 'pendiente',
};

export default function PartidosManager() {
  const [partidos, setPartidos]     = useState([]);
  const [form, setForm]             = useState(EMPTY_PARTIDO);
  const [editId, setEditId]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [msg, setMsg]               = useState('');
  const [tab, setTab]               = useState('lista'); // 'lista' | 'nuevo'

  const load = async () => {
    const { data } = await supabase
      .from('partidos_femenino')
      .select('*')
      .order('fecha', { ascending: false });
    setPartidos(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 3000); };

  const handleSave = async () => {
    if (!form.equipo_local_id || !form.equipo_visit_id) {
      flash('❌ Seleccioná los dos equipos'); return;
    }
    if (form.equipo_local_id === form.equipo_visit_id) {
      flash('❌ Los equipos no pueden ser iguales'); return;
    }

    setLoading(true);
    const payload = {
      equipo_local_id: form.equipo_local_id,
      equipo_visit_id: form.equipo_visit_id,
      puntos_local:    form.puntos_local !== '' ? Number(form.puntos_local) : null,
      puntos_visit:    form.puntos_visit !== '' ? Number(form.puntos_visit) : null,
      fecha:           form.fecha || null,
      lugar:           form.lugar || null,
      jornada:         form.jornada !== '' ? Number(form.jornada) : null,
      estado:          form.estado,
    };

    let error;
    if (editId) {
      ({ error } = await supabase.from('partidos_femenino').update(payload).eq('id', editId));
    } else {
      ({ error } = await supabase.from('partidos_femenino').insert(payload));
    }

    if (error) { flash(`❌ Error: ${error.message}`); }
    else {
      flash(editId ? '✅ Partido actualizado' : '✅ Partido agregado');
      setForm(EMPTY_PARTIDO); setEditId(null); setTab('lista');
      load();
    }
    setLoading(false);
  };

  const handleEdit = (p) => {
    setForm({
      equipo_local_id: p.equipo_local_id ?? '',
      equipo_visit_id: p.equipo_visit_id ?? '',
      puntos_local:    p.puntos_local ?? '',
      puntos_visit:    p.puntos_visit ?? '',
      fecha:           p.fecha ? p.fecha.slice(0, 16) : '',
      lugar:           p.lugar ?? '',
      jornada:         p.jornada ?? '',
      estado:          p.estado ?? 'pendiente',
    });
    setEditId(p.id);
    setTab('nuevo');
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este partido?')) return;
    await supabase.from('partidos_femenino').delete().eq('id', id);
    load();
  };

  const nombreEquipo = (id) => EQUIPOS.find(e => e.id === id)?.nombre ?? id;

  const estadoBadge = (estado) => {
    const map = {
      pendiente:  { color: '#6B7A99', label: 'PENDIENTE' },
      en_juego:   { color: '#F0B429', label: 'EN VIVO' },
      finalizado: { color: '#22D07A', label: 'FINAL' },
    };
    const s = map[estado] ?? map.pendiente;
    return <span style={{ color: s.color, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>{s.label}</span>;
  };

  return (
    <div>
      <h2 style={styles.sectionTitle}>📅 Gestión de Partidos</h2>

      {msg && <div style={styles.flashMsg}>{msg}</div>}

      {/* Tabs */}
      <div style={styles.tabs}>
        <button onClick={() => { setTab('lista'); setEditId(null); setForm(EMPTY_PARTIDO); }} style={tab === 'lista' ? styles.tabActive : styles.tab}>Lista</button>
        <button onClick={() => setTab('nuevo')} style={tab === 'nuevo' ? styles.tabActive : styles.tab}>
          {editId ? 'Editar partido' : '+ Nuevo partido'}
        </button>
      </div>

      {/* FORMULARIO */}
      {tab === 'nuevo' && (
        <div style={styles.formCard}>
          <div style={styles.formGrid}>
            {/* Equipo local */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Equipo Local</label>
              <select value={form.equipo_local_id} onChange={e => setForm({...form, equipo_local_id: e.target.value})} style={styles.select}>
                <option value="">— Seleccionar —</option>
                {EQUIPOS.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            {/* Equipo visitante */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Equipo Visitante</label>
              <select value={form.equipo_visit_id} onChange={e => setForm({...form, equipo_visit_id: e.target.value})} style={styles.select}>
                <option value="">— Seleccionar —</option>
                {EQUIPOS.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            {/* Puntos */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Puntos Local</label>
              <input type="number" value={form.puntos_local} onChange={e => setForm({...form, puntos_local: e.target.value})} style={styles.input} placeholder="0" />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Puntos Visitante</label>
              <input type="number" value={form.puntos_visit} onChange={e => setForm({...form, puntos_visit: e.target.value})} style={styles.input} placeholder="0" />
            </div>
            {/* Fecha */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Fecha y hora</label>
              <input type="datetime-local" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} style={styles.input} />
            </div>
            {/* Lugar */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Lugar</label>
              <input type="text" value={form.lugar} onChange={e => setForm({...form, lugar: e.target.value})} style={styles.input} placeholder="Club, cancha..." />
            </div>
            {/* Jornada */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Jornada</label>
              <input type="number" value={form.jornada} onChange={e => setForm({...form, jornada: e.target.value})} style={styles.input} placeholder="1" />
            </div>
            {/* Estado */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Estado</label>
              <select value={form.estado} onChange={e => setForm({...form, estado: e.target.value})} style={styles.select}>
                <option value="pendiente">Pendiente</option>
                <option value="en_juego">En juego</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button onClick={handleSave} disabled={loading} style={styles.btnSave}>
              {loading ? 'Guardando...' : editId ? '💾 Actualizar' : '➕ Agregar partido'}
            </button>
            <button onClick={() => { setForm(EMPTY_PARTIDO); setEditId(null); setTab('lista'); }} style={styles.btnCancel}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* LISTA */}
      {tab === 'lista' && (
        partidos.length === 0
          ? <p style={{ color: '#6B7A99', textAlign: 'center', padding: '2rem' }}>No hay partidos cargados aún.</p>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {partidos.map(p => (
                <div key={p.id} style={styles.partidoRow}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      {estadoBadge(p.estado)}
                      {p.jornada && <span style={{ color: '#4A566E', fontSize: 11 }}>Fecha {p.jornada}</span>}
                    </div>
                    <div style={{ color: '#EEF2F8', fontWeight: 600, fontSize: 15 }}>
                      {nombreEquipo(p.equipo_local_id)}
                      {p.puntos_local != null && <span style={{ color: '#F0B429', margin: '0 6px' }}>{p.puntos_local} - {p.puntos_visit}</span>}
                      {p.puntos_local == null && <span style={{ color: '#4A566E', margin: '0 6px' }}>vs</span>}
                      {nombreEquipo(p.equipo_visit_id)}
                    </div>
                    {(p.fecha || p.lugar) && (
                      <div style={{ color: '#6B7A99', fontSize: 12, marginTop: 2 }}>
                        {p.fecha && new Date(p.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                        {p.lugar && ` · ${p.lugar}`}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleEdit(p)} style={styles.btnEdit}>✏️</button>
                    <button onClick={() => handleDelete(p.id)} style={styles.btnDel}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
      )}
    </div>
  );
}

const styles = {
  sectionTitle: { color: '#F0B429', fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, letterSpacing: 1, marginBottom: 8 },
  flashMsg:     { padding: '10px 16px', background: '#141C2A', borderRadius: 8, color: '#EEF2F8', marginBottom: 16, fontSize: 14 },
  tabs:         { display: 'flex', gap: 8, marginBottom: 20 },
  tab:          { padding: '8px 20px', background: 'transparent', border: '1px solid #1C2535', borderRadius: 8, color: '#6B7A99', cursor: 'pointer', fontSize: 14 },
  tabActive:    { padding: '8px 20px', background: '#1C2535', border: '1px solid #F0B429', borderRadius: 8, color: '#F0B429', cursor: 'pointer', fontSize: 14, fontWeight: 600 },
  formCard:     { background: '#0E1420', border: '1px solid #1C2535', borderRadius: 12, padding: '1.5rem' },
  formGrid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 },
  formGroup:    { display: 'flex', flexDirection: 'column', gap: 6 },
  label:        { color: '#6B7A99', fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
  input:        { padding: '10px 12px', background: '#141C2A', border: '1px solid #1C2535', borderRadius: 8, color: '#EEF2F8', fontSize: 14, outline: 'none' },
  select:       { padding: '10px 12px', background: '#141C2A', border: '1px solid #1C2535', borderRadius: 8, color: '#EEF2F8', fontSize: 14, outline: 'none' },
  btnSave:      { padding: '10px 24px', background: 'linear-gradient(135deg, #F0B429, #FF6B2B)', border: 'none', borderRadius: 8, color: '#080C12', fontWeight: 700, cursor: 'pointer', fontSize: 15 },
  btnCancel:    { padding: '10px 20px', background: 'transparent', border: '1px solid #4A566E', borderRadius: 8, color: '#6B7A99', cursor: 'pointer', fontSize: 14 },
  partidoRow:   { background: '#0E1420', border: '1px solid #1C2535', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 },
  btnEdit:      { background: 'transparent', border: '1px solid #1C2535', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 16 },
  btnDel:       { background: 'transparent', border: '1px solid rgba(240,64,96,0.3)', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 16 },
};
