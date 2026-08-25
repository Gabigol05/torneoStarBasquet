import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';
import { equiposMasculino } from '../data/masculinoData';
import { TABLAS } from './categoriaAdmin';
import { useConfirm } from '../components/ConfirmModal.jsx';

const ROSTER = { femenino: equiposFemenino, masculino: equiposMasculino };
const normStr = s => (s ?? '').toString().normalize('NFD').replace(/[̀-ͯ'`]/g,'').toLowerCase().trim();

// ─── Editor de plantel — altas, cambio de equipo, edición y borrado ──────────
// Hasta ahora jugadoras_femenino/jugadores_masculino solo se escribían desde
// la carga de Excel (y ahí, solo masculino podía crear gente nueva sobre la
// marcha — femenino se trataba como plantel cerrado). Esta pantalla es la
// forma de editar el plantel directamente, sin pasar por SQL a mano — clave
// ahora que cada temporada nueva puede traer altas/bajas/cambios de equipo.
export default function PlantelManager({ categoria: categoriaProp, setCategoria: setCategoriaProp, foco } = {}) {
  const [categoriaLocal, setCategoriaLocal] = useState('femenino');
  const categoria    = categoriaProp ?? categoriaLocal;
  const setCategoria = setCategoriaProp ?? setCategoriaLocal;
  const tablas = TABLAS[categoria];
  const roster = ROSTER[categoria];
  const { confirm, ConfirmDialog } = useConfirm();

  const [equipoId, setEquipoId] = useState('');
  const [jugadoras, setJugadoras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [editando, setEditando] = useState({}); // { [id]: {nombre, numero, fechaNac, equipo_id} }
  const [guardandoId, setGuardandoId] = useState(null);

  // Alta de jugadora nueva
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoNumero, setNuevoNumero] = useState('');
  const [creando, setCreando] = useState(false);

  useEffect(() => { setEquipoId(''); setJugadoras([]); }, [categoria]);

  // Llegada desde el buscador rápido del panel — selecciona el equipo de
  // la jugadora/el jugador o equipo buscado. `foco.ts` cambia en cada
  // búsqueda nueva para que este efecto dispare aunque sea el mismo equipo.
  useEffect(() => {
    if (!foco?.equipoId) return;
    setEquipoId(foco.equipoId);
  }, [foco?.ts]);

  const flash = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3500); };

  const cargarJugadoras = async (eqId) => {
    if (!eqId) { setJugadoras([]); return; }
    setLoading(true);
    const { data, error } = await supabase.from(tablas.jugadores).select('*').eq('equipo_id', eqId).order('nombre');
    if (error) { flash(`Error cargando plantel: ${error.message}`, false); setLoading(false); return; }
    setJugadoras(data ?? []);
    setLoading(false);
  };

  useEffect(() => { cargarJugadoras(equipoId); }, [equipoId]);

  const handleCrear = async () => {
    if (!equipoId) { flash('Elegí un equipo primero', false); return; }
    const nombre = nuevoNombre.trim();
    if (!nombre) { flash('Ingresá el nombre de la jugadora/el jugador', false); return; }
    setCreando(true);
    try {
      const idGenerado = `${equipoId}_${normStr(nombre).replace(/\s+/g, '_')}`;
      const payload = {
        id: idGenerado,
        equipo_id: equipoId,
        nombre,
        numero: nuevoNumero ? Number(nuevoNumero) : null,
      };
      const { error } = await supabase.from(tablas.jugadores).upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      flash(`✅ "${nombre}" agregada al plantel`);
      setNuevoNombre(''); setNuevoNumero('');
      await cargarJugadoras(equipoId);
    } catch (err) {
      flash(`❌ ${err.message}`, false);
    } finally {
      setCreando(false);
    }
  };

  const startEdit = (j) => setEditando(prev => ({
    ...prev,
    [j.id]: { nombre: j.nombre, numero: j.numero ?? '', fechaNac: j.fecha_nac ?? '', equipo_id: j.equipo_id },
  }));
  const cancelEdit = (id) => setEditando(prev => { const n = { ...prev }; delete n[id]; return n; });
  const updateEdit = (id, field, val) => setEditando(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));

  const handleGuardar = async (id) => {
    const ed = editando[id];
    if (!ed) return;
    if (!ed.nombre.trim()) { flash('El nombre no puede quedar vacío', false); return; }
    setGuardandoId(id);
    try {
      const payload = {
        nombre: ed.nombre.trim(),
        numero: ed.numero === '' ? null : Number(ed.numero),
        fecha_nac: ed.fechaNac || null,
        equipo_id: ed.equipo_id,
      };
      const { error } = await supabase.from(tablas.jugadores).update(payload).eq('id', id);
      if (error) throw error;
      const cambioDeEquipo = ed.equipo_id !== equipoId;
      flash(cambioDeEquipo ? `✅ Movida a ${roster.find(e => e.id === ed.equipo_id)?.name ?? ed.equipo_id}` : '✅ Guardado');
      cancelEdit(id);
      await cargarJugadoras(equipoId);
    } catch (err) {
      flash(`❌ ${err.message}`, false);
    } finally {
      setGuardandoId(null);
    }
  };

  const handleBorrar = async (j) => {
    const ok = await confirm(`¿Borrar a "${j.nombre}" del plantel? Si ya tiene partidos cargados, no se va a poder — primero hay que sacarle esos partidos.`);
    if (!ok) return;
    try {
      const { error } = await supabase.from(tablas.jugadores).delete().eq('id', j.id);
      if (error) throw error;
      flash(`✅ "${j.nombre}" borrada`);
      await cargarJugadoras(equipoId);
    } catch (err) {
      // El error mas comun acá es una FK: ya tiene stats_partido/estadisticas
      // cargadas y la base no deja borrarla — se le explica en criollo.
      const esFk = /foreign key|violates/i.test(err.message);
      flash(esFk
        ? `❌ No se puede borrar: "${j.nombre}" ya tiene partidos o estadísticas cargadas.`
        : `❌ ${err.message}`, false);
    }
  };

  const equipoActual = roster.find(e => e.id === equipoId);

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 1, color: '#EEF2F8', margin: 0 }}>
          👥 PLANTEL
        </h2>
        <p style={{ color: '#6B7A99', fontSize: 13, margin: '4px 0 0' }}>
          Altas, cambios de equipo y correcciones de nombre — sin pasar por SQL.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={equipoId} onChange={e => setEquipoId(e.target.value)} style={{
          padding: '10px 14px', borderRadius: 8, border: '1px solid #1C2535', background: '#0E1420',
          color: '#EEF2F8', fontSize: 14, minWidth: 220,
        }}>
          <option value="">— Elegí un equipo —</option>
          {roster.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        {equipoActual && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: equipoActual.color, fontFamily: "'Bebas Neue',sans-serif", fontSize: 18 }}>
            {equipoActual.logo && <img src={equipoActual.logo} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />}
            {equipoActual.name}
          </span>
        )}
      </div>

      {msg && (
        <div style={{
          marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: msg.ok ? 'rgba(34,208,122,.1)' : 'rgba(240,64,96,.1)',
          color: msg.ok ? '#22D07A' : '#F04060',
          border: `1px solid ${msg.ok ? 'rgba(34,208,122,.3)' : 'rgba(240,64,96,.3)'}`,
        }}>
          {msg.text}
        </div>
      )}

      {equipoId && (
        <>
          {/* Alta de jugadora/or nueva */}
          <div style={{
            display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 20,
            padding: 16, borderRadius: 10, background: 'linear-gradient(160deg,rgba(34,208,122,.06),#0B111C)',
            border: '1px solid rgba(34,208,122,.25)',
          }}>
            <div style={{ flex: '1 1 220px' }}>
              <label style={{ display: 'block', fontSize: 11, color: '#8899BB', marginBottom: 6 }}>NOMBRE COMPLETO</label>
              <input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="Nombre y apellido"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #1C2535', background: '#080C12', color: '#EEF2F8', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: '0 0 120px' }}>
              <label style={{ display: 'block', fontSize: 11, color: '#8899BB', marginBottom: 6 }}>NÚMERO (opcional)</label>
              <input type="number" min="0" value={nuevoNumero} onChange={e => setNuevoNumero(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #1C2535', background: '#080C12', color: '#EEF2F8', boxSizing: 'border-box' }} />
            </div>
            <button onClick={handleCrear} disabled={creando} style={{
              padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#22D07A,#0E9F5A)', color: '#080C12',
              fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, letterSpacing: 1,
              opacity: creando ? 0.6 : 1,
            }}>
              {creando ? 'Agregando...' : '➕ AGREGAR AL PLANTEL'}
            </button>
          </div>

          {loading ? (
            <p style={{ color: '#6B7A99' }}>Cargando plantel...</p>
          ) : jugadoras.length === 0 ? (
            <p style={{ color: '#6B7A99', fontSize: 13 }}>Este equipo todavía no tiene jugadoras/es cargados.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {jugadoras.map(j => {
                const ed = editando[j.id];
                return (
                  <div key={j.id} style={{
                    padding: '12px 16px', borderRadius: 10, background: '#0E1420', border: '1px solid #1C2535',
                  }}>
                    {!ed ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <span style={{ color: '#EEF2F8', fontWeight: 600, fontSize: 14 }}>
                            {j.numero != null && <span style={{ color: '#F0B429', marginRight: 8 }}>#{j.numero}</span>}
                            {j.nombre}
                          </span>
                          {j.fecha_nac && <span style={{ color: '#6B7A99', fontSize: 12, marginLeft: 10 }}>🎂 {j.fecha_nac}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => startEdit(j)} style={{
                            padding: '6px 12px', borderRadius: 6, border: '1px solid #1C2535', background: 'transparent',
                            color: '#8899BB', fontSize: 12, cursor: 'pointer',
                          }}>✏️ Editar</button>
                          <button onClick={() => handleBorrar(j)} style={{
                            padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(240,64,96,.3)', background: 'transparent',
                            color: '#F04060', fontSize: 12, cursor: 'pointer',
                          }}>🗑️ Borrar</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                          <input value={ed.nombre} onChange={e => updateEdit(j.id, 'nombre', e.target.value)}
                            placeholder="Nombre"
                            style={{ flex: '1 1 200px', padding: '8px 10px', borderRadius: 6, border: '1px solid #1C2535', background: '#080C12', color: '#EEF2F8' }} />
                          <input type="number" min="0" value={ed.numero} onChange={e => updateEdit(j.id, 'numero', e.target.value)}
                            placeholder="Número"
                            style={{ flex: '0 0 100px', padding: '8px 10px', borderRadius: 6, border: '1px solid #1C2535', background: '#080C12', color: '#EEF2F8' }} />
                          <input type="date" value={ed.fechaNac ?? ''} onChange={e => updateEdit(j.id, 'fechaNac', e.target.value)}
                            style={{ flex: '0 0 160px', padding: '8px 10px', borderRadius: 6, border: '1px solid #1C2535', background: '#080C12', color: '#EEF2F8' }} />
                          <select value={ed.equipo_id} onChange={e => updateEdit(j.id, 'equipo_id', e.target.value)}
                            style={{ flex: '0 0 180px', padding: '8px 10px', borderRadius: 6, border: '1px solid #1C2535', background: '#080C12', color: '#EEF2F8' }}>
                            {roster.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                          </select>
                        </div>
                        {ed.equipo_id !== equipoId && (
                          <div style={{ color: '#F0B429', fontSize: 12, marginBottom: 10 }}>
                            ⚠️ Al guardar, pasa a formar parte de {roster.find(e => e.id === ed.equipo_id)?.name} — desaparece de esta lista.
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleGuardar(j.id)} disabled={guardandoId === j.id} style={{
                            padding: '7px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                            background: '#F0B429', color: '#080C12', fontWeight: 700, fontSize: 12,
                            opacity: guardandoId === j.id ? 0.6 : 1,
                          }}>
                            {guardandoId === j.id ? 'Guardando...' : '💾 Guardar'}
                          </button>
                          <button onClick={() => cancelEdit(j.id)} style={{
                            padding: '7px 14px', borderRadius: 6, border: '1px solid #1C2535', background: 'transparent',
                            color: '#8899BB', fontSize: 12, cursor: 'pointer',
                          }}>Cancelar</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      {ConfirmDialog}
    </div>
  );
}
