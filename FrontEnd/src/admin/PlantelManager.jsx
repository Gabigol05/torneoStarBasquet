import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';
import { equiposMasculino } from '../data/masculinoData';
import { TABLAS } from './categoriaAdmin';
import { useConfirm } from '../components/ConfirmModal.jsx';
import { UI } from './ui';
import './plantel.css';

const ROSTER = { femenino: equiposFemenino, masculino: equiposMasculino };
const normStr = s => (s ?? '').toString().normalize('NFD').replace(/[̀-ͯ'`]/g,'').toLowerCase().trim();

// ─── Editor de plantel — altas, cambio de equipo, edición y borrado ──────────
// jugadoras_femenino/jugadores_masculino también se escriben solas desde la
// carga de Excel cuando aparece un nombre no reconocido (las dos categorías
// se comportan igual desde que femenino dejó de tratarse como plantel
// cerrado). Esta pantalla sigue siendo la forma de editar el plantel a mano
// sin pasar por SQL — para altas anticipadas antes de la primera fecha,
// correcciones de nombre/número, o arreglar un duplicado que haya quedado
// de una carga de Excel con un nombre mal tipeado.
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
      <div className="pl-equipos" role="listbox" aria-label="Elegí un equipo">
        {roster.map(e => (
          <button key={e.id} type="button" role="option" aria-selected={equipoId === e.id}
            className={`pl-eq${equipoId === e.id ? ' is-on' : ''}`} style={{ '--k': e.color ?? '#5A6B85' }}
            onClick={() => setEquipoId(e.id)}>
            <span className="pl-esc">{e.logo && <img src={e.logo} alt="" loading="lazy"/>}</span>
            <span className="pl-eq-n">{e.name}</span>
          </button>
        ))}
      </div>

      {equipoActual ? (
        <div className="pl-banner" style={{ '--k': equipoActual.color ?? '#5A6B85' }}>
          <span className="pl-esc pl-esc--xl">{equipoActual.logo && <img src={equipoActual.logo} alt=""/>}</span>
          <div>
            <b>{equipoActual.name}</b>
            <span>{loading ? 'Cargando plantel…' : `${jugadoras.length} ${jugadoras.length === 1 ? 'integrante' : 'integrantes'} en el plantel`}</span>
          </div>
        </div>
      ) : (
        <div className="pl-vacio">Elegí un equipo para ver y editar su plantel.</div>
      )}

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
            padding: 16, borderRadius: 16, background: 'linear-gradient(160deg,rgba(46,224,138,.08),#0b0f18 70%)',
            border: '1px solid rgba(46,224,138,.28)',
          }}>
            <div style={{ flex: '1 1 220px' }}>
              <label style={UI.label}>Nombre completo</label>
              <input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="Nombre y apellido"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #1C2535', background: '#080C12', color: '#EEF2F8', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: '0 0 120px' }}>
              <label style={UI.label}>Número (opcional)</label>
              <input type="number" min="0" value={nuevoNumero} onChange={e => setNuevoNumero(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #1C2535', background: '#080C12', color: '#EEF2F8', boxSizing: 'border-box' }} />
            </div>
            <button onClick={handleCrear} disabled={creando} style={{
              ...UI.btnPrimary, minHeight: 42, background: 'linear-gradient(135deg,#2EE08A,#0E9F5A)', boxShadow: '0 6px 18px rgba(46,224,138,.2)',
              opacity: creando ? 0.6 : 1,
            }}>
              {creando ? 'Agregando...' : '+ Agregar al plantel'}
            </button>
          </div>

          {loading ? (
            <p style={{ color: '#6B7A99' }}>Cargando plantel...</p>
          ) : jugadoras.length === 0 ? (
            <p style={{ color: '#6B7A99', fontSize: 13 }}>Este equipo todavía no tiene jugadoras/es cargados.</p>
          ) : (
            <div className="pl-grid">
              {jugadoras.map(j => {
                const ed = editando[j.id];
                return (
                  <div key={j.id} className={`pl-j${ed ? ' is-ed' : ''}`} style={{ '--k': equipoActual?.color ?? '#5A6B85' }}>
                    {!ed ? (
                      <div className="pl-j-row">
                        <span className="pl-num">{j.numero != null ? j.numero : '–'}</span>
                        <div className="pl-j-t">
                          <b>{j.nombre}</b>
                          {j.fecha_nac && <small>Nac. {new Date(j.fecha_nac + 'T12:00:00').toLocaleDateString('es-AR')}</small>}
                        </div>
                        <button type="button" onClick={() => startEdit(j)} className="pl-ib" title="Editar">
                          <svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/></svg>
                        </button>
                        <button type="button" onClick={() => handleBorrar(j)} className="pl-ib pl-ib--del" title="Borrar">
                          <svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>
                        </button>
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
                            ...UI.btnPrimary, padding: '8px 16px', fontSize: 14,
                            opacity: guardandoId === j.id ? 0.6 : 1,
                          }}>
                            {guardandoId === j.id ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button onClick={() => cancelEdit(j.id)} style={{ ...UI.btnSec, padding: '8px 14px' }}>Cancelar</button>
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
