import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TABLAS } from './categoriaAdmin';
import { useConfirm } from '../components/ConfirmModal.jsx';
import { equiposFemenino } from '../data/femeninoData';
import { equiposMasculino } from '../data/masculinoData';

function normalizar(s) {
  return (s ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Alias de EQUIPO — mismo concepto que "Alias de nombres" (AliasesManager)
// pero para el nombre del equipo entero en vez de una jugadora/jugador
// puntual. Nace del caso "La Reserva V.A" (así escribió el Excel a Villa
// Azalais, 25/08): un nombre completamente distinto al oficial, no una
// variación de tipeo, así que el fuzzy matching no lo podía resolver solo.
// Antes esto se resolvía a mano en el código (ALIAS_EQUIPOS_TEXTO en
// ExcelUpload.jsx) — acá Alvaro puede cargar uno nuevo sin depender de un
// cambio de código+deploy cada vez que aparece un apodo raro en una planilla.
export default function EquipoAliasesManager({ categoria: categoriaProp, setCategoria: setCategoriaProp } = {}) {
  const [categoriaLocal, setCategoriaLocal] = useState('femenino');
  const categoria    = categoriaProp ?? categoriaLocal;
  const setCategoria = setCategoriaProp ?? setCategoriaLocal;
  const tablas = TABLAS[categoria];
  const roster = categoria === 'masculino' ? equiposMasculino : equiposFemenino;

  const [aliases, setAliases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [busy, setBusy]       = useState(null); // id en proceso de borrado

  // Alta
  const [nuevoEquipoId, setNuevoEquipoId] = useState('');
  const [nuevoAlias, setNuevoAlias]       = useState('');
  const [guardando, setGuardando]         = useState(false);
  const [errorAlta, setErrorAlta]         = useState('');

  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      setLoading(true);
      setError('');
      try {
        const { data, error: err } = await supabase
          .from(tablas.equipoAliases)
          .select('*')
          .order('creado_en', { ascending: false });
        if (err) throw err;
        if (cancelado) return;
        setAliases(data ?? []);
      } catch (err) {
        if (!cancelado) setError(err.message);
      } finally {
        if (!cancelado) setLoading(false);
      }
    }
    cargar();
    setNuevoEquipoId(''); setNuevoAlias(''); setErrorAlta('');
    return () => { cancelado = true; };
  }, [categoria, tablas.equipoAliases]);

  const filtrados = useMemo(() => {
    const q = normalizar(search);
    if (!q) return aliases;
    return aliases.filter(a => {
      const equipoNombre = roster.find(e => e.id === a.equipo_id)?.name ?? a.equipo_id;
      return normalizar(a.alias).includes(q) || normalizar(equipoNombre).includes(q);
    });
  }, [aliases, search, roster]);

  const handleAgregar = async () => {
    setErrorAlta('');
    if (!nuevoEquipoId) { setErrorAlta('Elegí a qué equipo corresponde.'); return; }
    if (!nuevoAlias.trim()) { setErrorAlta('Escribí el nombre tal cual viene en el Excel.'); return; }
    setGuardando(true);
    try {
      const { data, error: err } = await supabase
        .from(tablas.equipoAliases)
        .insert({ alias: nuevoAlias.trim(), equipo_id: nuevoEquipoId })
        .select('*').single();
      if (err) throw err;
      setAliases(prev => [data, ...prev]);
      setNuevoEquipoId(''); setNuevoAlias('');
    } catch (err) {
      setErrorAlta(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleDelete = async (row) => {
    const equipoNombre = roster.find(e => e.id === row.equipo_id)?.name ?? row.equipo_id;
    const ok = await confirm(
      `¿Borrar el alias "${row.alias}" (→ ${equipoNombre})? La próxima vez que un Excel escriba el equipo así, va a volver a fallar como "equipo no encontrado" al publicar.`,
      { danger: true, confirmLabel: 'Borrar alias' }
    );
    if (!ok) return;
    setBusy(row.id);
    try {
      const { error: delErr } = await supabase.from(tablas.equipoAliases).delete().eq('id', row.id);
      if (delErr) throw delErr;
      setAliases(prev => prev.filter(a => a.id !== row.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      {ConfirmDialog}
      <h2 style={S.title}>🛡️ Alias de equipos</h2>
      <p style={S.hint}>
        Algunos Excel escriben el nombre de un equipo distinto al oficial (no un error de tipeo,
        un apodo o nombre totalmente distinto — ej: "La Reserva V.A" en vez de "Villa Azalais").
        Cargá acá esa equivalencia una sola vez y las próximas planillas que lo escriban así se
        van a reconocer solas al publicar, sin volver a tirar "equipo no encontrado".
      </p>

      <div style={S.altaBox}>
        <div style={S.altaRow}>
          <select value={nuevoEquipoId} onChange={e => setNuevoEquipoId(e.target.value)} style={S.select}>
            <option value="">Equipo real —</option>
            {[...roster].sort((a,b)=>a.name.localeCompare(b.name)).map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder='Como lo escribe el Excel (ej: "La Reserva V.A")'
            value={nuevoAlias}
            onChange={e => setNuevoAlias(e.target.value)}
            style={S.input}
          />
          <button onClick={handleAgregar} disabled={guardando} style={{ ...S.addBtn, opacity: guardando ? 0.6 : 1 }}>
            {guardando ? 'Guardando...' : '+ Agregar'}
          </button>
        </div>
        {errorAlta && <div style={{ color:'#F04060', fontSize:12, marginTop:8 }}>❌ {errorAlta}</div>}
      </div>

      <input
        type="text"
        placeholder="Buscar por nombre en excel o equipo..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={S.search}
      />

      {loading && <div style={S.msg}>Cargando alias...</div>}
      {error && <div style={{ ...S.msg, color: '#F04060' }}>❌ {error}</div>}

      {!loading && !error && (
        <>
          <div style={S.count}>
            {filtrados.length} de {aliases.length} alias{search ? ' (filtrados)' : ''}
          </div>

          {filtrados.length === 0 ? (
            <div style={S.empty}>No hay alias de equipo cargados todavía.</div>
          ) : (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Nombre en Excel</th>
                    <th style={S.th}>Equipo real</th>
                    <th style={S.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(row => {
                    const equipo = roster.find(e => e.id === row.equipo_id);
                    return (
                      <tr key={row.id}>
                        <td style={S.td}>{row.alias}</td>
                        <td style={S.td}>
                          <span style={{ color: equipo?.color ?? '#8899BB' }}>
                            {equipo?.name ?? row.equipo_id}
                          </span>
                        </td>
                        <td style={{ ...S.td, textAlign: 'right' }}>
                          <button
                            onClick={() => handleDelete(row)}
                            disabled={busy === row.id}
                            style={{ ...S.delBtn, opacity: busy === row.id ? 0.5 : 1 }}>
                            {busy === row.id ? '...' : '🗑️ Borrar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const S = {
  title:   { color: '#F0B429', fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, letterSpacing: 1, marginBottom: 12 },
  hint:    { color: '#6B7A99', fontSize: 13, lineHeight: 1.6, marginBottom: 16, maxWidth: 720 },
  altaBox: { background: 'linear-gradient(160deg,#101826,#0B111C)', border: '1px solid #1C2535', borderRadius: 10,
             padding: '14px 16px', marginBottom: 18, maxWidth: 720 },
  altaRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  select:  { padding: '10px 12px', background: '#141C2A', border: '1px solid #1C2535', borderRadius: 8,
             color: '#EEF2F8', fontSize: 13, fontFamily: "'Barlow Condensed',sans-serif", flex: '0 0 220px' },
  input:   { padding: '10px 12px', background: '#141C2A', border: '1px solid #1C2535', borderRadius: 8,
             color: '#EEF2F8', fontSize: 13, fontFamily: "'Barlow Condensed',sans-serif", flex: '1 1 240px', minWidth: 200 },
  addBtn:  { padding: '10px 18px', background: 'linear-gradient(135deg,#F0B429,#FF6B2B)', border: 'none',
             borderRadius: 8, color: '#080C12', fontWeight: 700, fontSize: 13, cursor: 'pointer', flex: '0 0 auto' },
  search:  { width: '100%', maxWidth: 420, padding: '10px 14px', background: '#0E1420', border: '1px solid #1C2535',
             borderRadius: 8, color: '#EEF2F8', fontSize: 14, fontFamily: "'Barlow Condensed',sans-serif", marginBottom: 16 },
  msg:     { color: '#8899BB', fontSize: 14, padding: '1rem 0' },
  empty:   { color: '#4A566E', fontSize: 14, padding: '2rem 0', textAlign: 'center' },
  count:   { color: '#4A566E', fontSize: 12, marginBottom: 10, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 0.5 },
  tableWrap: { background: 'linear-gradient(160deg,#101826,#0B111C)', border: '1px solid #1C2535', borderRadius: 10, overflow: 'hidden' },
  table:   { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:      { textAlign: 'left', padding: '10px 14px', color: '#6B7A99', fontFamily: "'Barlow Condensed',sans-serif",
             fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', borderBottom: '1px solid #1C2535' },
  td:      { padding: '10px 14px', color: '#EEF2F8', borderBottom: '1px solid #131A28' },
  delBtn:  { padding: '6px 12px', background: 'rgba(240,64,96,.08)', border: '1px solid rgba(240,64,96,.2)',
             borderRadius: 6, color: '#F04060', cursor: 'pointer', fontSize: 12, fontFamily: "'Barlow Condensed',sans-serif" },
};
