import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';
import { equiposMasculino } from '../data/masculinoData';
import { useConfirm } from '../components/ConfirmModal.jsx';

const ROSTER = {
  femenino:  equiposFemenino.map(e => ({ id: e.id, nombre: e.name, color: e.color })),
  masculino: equiposMasculino.map(e => ({ id: e.id, nombre: e.name, color: e.color })),
  general:   [],
};

const EMPTY_OPCION = { texto: '', equipo_id: '' };
const EMPTY_FORM = { categoria: 'femenino', pregunta: '', subtitulo: '', opciones: [ { ...EMPTY_OPCION }, { ...EMPTY_OPCION } ] };

function CategoriaBadge({ categoria }) {
  const map = {
    femenino:  { bg: 'rgba(232,24,122,.15)', color: '#E8187A', label: 'FEMENINO' },
    masculino: { bg: 'rgba(24,120,232,.15)', color: '#1878E8', label: 'MASCULINO' },
    general:   { bg: 'rgba(240,180,41,.15)', color: '#F0B429', label: 'GENERAL' },
  };
  const s = map[categoria] ?? map.general;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: '2px 8px', borderRadius: 4, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ── Formulario de creación ────────────────────────────────────────────────────
function EncuestaForm({ form, setForm, onSave, onCancel, loading }) {
  const roster = ROSTER[form.categoria] ?? [];

  const updateOpcion = (i, patch) => setForm(f => ({
    ...f, opciones: f.opciones.map((o, j) => j === i ? { ...o, ...patch } : o),
  }));
  const addOpcion = () => setForm(f => ({ ...f, opciones: [...f.opciones, { ...EMPTY_OPCION }] }));
  const removeOpcion = (i) => setForm(f => ({ ...f, opciones: f.opciones.filter((_, j) => j !== i) }));

  const opcionesValidas = form.opciones.filter(o => o.texto.trim()).length;
  const puedeGuardar = form.pregunta.trim() && opcionesValidas >= 2;

  return (
    <div style={F.card}>
      <div style={F.row}>
        <div style={F.group}>
          <label style={F.label}>CATEGORÍA</label>
          <select value={form.categoria}
            onChange={e => setForm(f => ({ ...f, categoria: e.target.value, opciones: [{ ...EMPTY_OPCION }, { ...EMPTY_OPCION }] }))}
            style={F.input}>
            <option value="femenino">Femenino</option>
            <option value="masculino">Masculino</option>
            <option value="general">General</option>
          </select>
        </div>
        <div style={{ ...F.group, flex: 2 }}>
          <label style={F.label}>SUBTÍTULO (opcional)</label>
          <input type="text" placeholder="Ej: Fecha 6 · Sábado 20hs" value={form.subtitulo}
            onChange={e => setForm(f => ({ ...f, subtitulo: e.target.value }))} style={F.input} />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={F.label}>PREGUNTA</label>
        <input type="text" placeholder="Ej: ¿Quién gana el sábado?" value={form.pregunta}
          onChange={e => setForm(f => ({ ...f, pregunta: e.target.value }))} style={F.input} />
      </div>

      <div style={{ background: '#080C12', border: '1px solid #1C2535', borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#4A566E', marginBottom: 12 }}>
          OPCIONES {roster.length > 0 && '(elegí un equipo o escribí texto libre)'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {form.opciones.map((o, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {roster.length > 0 && (
                <select
                  value={o.equipo_id}
                  onChange={e => {
                    const eq = roster.find(r => r.id === e.target.value);
                    updateOpcion(i, { equipo_id: e.target.value, texto: eq ? eq.nombre : o.texto });
                  }}
                  style={{ ...F.input, flex: '0 0 170px' }}>
                  <option value="">— Equipo —</option>
                  {roster.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              )}
              <input type="text" placeholder={`Texto de la opción ${i + 1}`} value={o.texto}
                onChange={e => updateOpcion(i, { texto: e.target.value, equipo_id: '' })}
                style={{ ...F.input, flex: 1 }} />
              {form.opciones.length > 2 && (
                <button onClick={() => removeOpcion(i)}
                  style={{ background: 'transparent', border: 'none', color: '#F04060', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {form.opciones.length < 8 && (
          <button onClick={addOpcion} style={{ ...F.btnSec, marginTop: 12 }}>➕ Agregar opción</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onSave} disabled={loading || !puedeGuardar}
          style={{ ...F.btnPrimary, opacity: (!puedeGuardar || loading) ? 0.5 : 1 }}>
          {loading ? 'Guardando...' : '🗳️ PUBLICAR ENCUESTA'}
        </button>
        <button onClick={onCancel} style={F.btnSec}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Resultados de una encuesta ────────────────────────────────────────────────
function Resultados({ encuestaId }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let alive = true;
    supabase.from('v_encuesta_resultados').select('*').eq('encuesta_id', encuestaId).order('orden')
      .then(({ data }) => { if (alive) setRows(data ?? []); });
    return () => { alive = false; };
  }, [encuestaId]);

  if (!rows) return <div style={{ fontSize: 12, color: '#4A566E' }}>Cargando resultados...</div>;
  const total = rows.reduce((s, r) => s + Number(r.votos || 0), 0);

  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map(r => {
        const pct = total > 0 ? Math.round((r.votos / total) * 100) : 0;
        return (
          <div key={r.opcion_id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#EEF2F8', marginBottom: 3 }}>
              <span>{r.texto}</span>
              <span style={{ color: '#4A566E' }}>{r.votos} · {pct}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: '#141C2A', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: '#F0B429', transition: 'width .5s' }} />
            </div>
          </div>
        );
      })}
      <div style={{ fontSize: 11, color: '#4A566E', textAlign: 'right' }}>{total} voto(s) en total</div>
    </div>
  );
}

// ── Panel principal ───────────────────────────────────────────────────────────
export default function EncuestasManager() {
  const [encuestas, setEncuestas] = useState([]);
  const [form, setForm]     = useState(EMPTY_FORM);
  const [view, setView]     = useState('lista'); // 'lista' | 'nueva'
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]       = useState(null);
  const [abiertaId, setAbiertaId] = useState(null);
  const { confirm, ConfirmDialog } = useConfirm();

  const flash = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); };

  const loadAll = useCallback(async () => {
    const { data, error } = await supabase.from('encuestas').select('*').order('creado_en', { ascending: false });
    if (error) { flash(`Error cargando encuestas: ${error.message}`, false); return; }
    setEncuestas(data ?? []);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: enc, error: eErr } = await supabase.from('encuestas').insert({
        categoria: form.categoria,
        pregunta: form.pregunta.trim(),
        subtitulo: form.subtitulo.trim() || null,
        activa: true,
      }).select('id').single();
      if (eErr) throw eErr;

      const opciones = form.opciones
        .filter(o => o.texto.trim())
        .map((o, i) => ({
          encuesta_id: enc.id,
          texto: o.texto.trim(),
          equipo_id: o.equipo_id || null,
          orden: i,
        }));
      const { error: oErr } = await supabase.from('encuesta_opciones').insert(opciones);
      if (oErr) throw oErr;

      flash('✅ Encuesta publicada');
      setForm(EMPTY_FORM);
      setView('lista');
      await loadAll();
    } catch (err) {
      flash(`❌ ${err.message}`, false);
    } finally {
      setLoading(false);
    }
  };

  const toggleActiva = async (enc) => {
    const { error } = await supabase.from('encuestas')
      .update({ activa: !enc.activa, cerrada_en: enc.activa ? new Date().toISOString() : null })
      .eq('id', enc.id);
    if (error) { flash(`Error: ${error.message}`, false); return; }
    await loadAll();
  };

  const handleDelete = async (id) => {
    if (!(await confirm('¿Eliminar esta encuesta y todos sus votos? No se puede deshacer.'))) return;
    const { error } = await supabase.from('encuestas').delete().eq('id', id);
    if (error) { flash(`Error: ${error.message}`, false); return; }
    await loadAll();
    flash('✅ Eliminada');
  };

  return (
    <div>
      {ConfirmDialog}
      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14,
          background: msg.ok ? 'rgba(34,208,122,.1)' : 'rgba(240,64,96,.1)',
          color: msg.ok ? '#22D07A' : '#F04060',
          border: `1px solid ${msg.ok ? 'rgba(34,208,122,.3)' : 'rgba(240,64,96,.3)'}` }}>
          {msg.text}
        </div>
      )}

      {view === 'lista' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button onClick={() => setView('nueva')} style={F.btnPrimary}>➕ NUEVA ENCUESTA</button>
        </div>
      )}

      {view === 'nueva' && (
        <EncuestaForm form={form} setForm={setForm} onSave={handleSave} onCancel={() => { setForm(EMPTY_FORM); setView('lista'); }} loading={loading} />
      )}

      {view === 'lista' && (
        encuestas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7A99' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗳️</div>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: '#EEF2F8', marginBottom: 8 }}>Sin encuestas todavía</div>
            <div>Creá una para que la gente vote desde la página</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {encuestas.map(enc => (
              <div key={enc.id} style={{ background: '#0E1420', border: '1px solid #1C2535', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <CategoriaBadge categoria={enc.categoria} />
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: '2px 8px', borderRadius: 4,
                    background: enc.activa ? 'rgba(34,208,122,.12)' : 'rgba(107,122,153,.15)',
                    color: enc.activa ? '#22D07A' : '#6B7A99' }}>
                    {enc.activa ? 'ACTIVA' : 'CERRADA'}
                  </span>
                  <span style={{ color: '#EEF2F8', fontWeight: 600, fontSize: 14 }}>{enc.pregunta}</span>
                  {enc.subtitulo && <span style={{ color: '#4A566E', fontSize: 12 }}>· {enc.subtitulo}</span>}

                  <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexShrink: 0 }}>
                    <button onClick={() => setAbiertaId(id => id === enc.id ? null : enc.id)}
                      style={{ ...F.quickBtn, borderColor: '#1C2535', color: '#6B7A99' }}>
                      {abiertaId === enc.id ? '▲ Ocultar' : '▼ Resultados'}
                    </button>
                    <button onClick={() => toggleActiva(enc)}
                      style={{ ...F.quickBtn, borderColor: enc.activa ? 'rgba(240,64,96,.2)' : 'rgba(34,208,122,.3)', color: enc.activa ? '#F04060' : '#22D07A' }}>
                      {enc.activa ? '⏸ Cerrar' : '▶ Reabrir'}
                    </button>
                    <button onClick={() => handleDelete(enc.id)}
                      style={{ ...F.quickBtn, borderColor: 'rgba(240,64,96,.2)', color: '#F04060' }}>
                      🗑️
                    </button>
                  </div>
                </div>
                {abiertaId === enc.id && <Resultados encuestaId={enc.id} />}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

const F = {
  label: { fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#4A566E', display: 'block', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', background: '#141C2A', border: '1px solid #1C2535', borderRadius: 8, color: '#EEF2F8', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  card: { background: '#0E1420', border: '1px solid rgba(240,180,41,.2)', borderRadius: 14, padding: '1.5rem', marginBottom: 20 },
  row: { display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap' },
  group: { flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column' },
  btnPrimary: { padding: '11px 20px', background: 'linear-gradient(135deg,#F0B429,#FF6B2B)', border: 'none', borderRadius: 9, color: '#080C12', fontFamily: "'Bebas Neue',sans-serif", fontSize: 17, letterSpacing: 1, cursor: 'pointer' },
  btnSec: { padding: '10px 18px', background: 'transparent', border: '1px solid #4A566E', borderRadius: 9, color: '#6B7A99', cursor: 'pointer', fontSize: 13 },
  quickBtn: { padding: '6px 10px', background: 'transparent', border: '1px solid', borderRadius: 7, cursor: 'pointer', fontSize: 12 },
};
