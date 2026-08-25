import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { TABLAS } from './categoriaAdmin';
import { useConfirm } from '../components/ConfirmModal.jsx';
import { equiposFemenino } from '../data/femeninoData';
import { equiposMasculino } from '../data/masculinoData';

const EQUIPOS_MAP = Object.fromEntries(
  [...equiposFemenino, ...equiposMasculino].map(e => [e.id, e])
);

function normalizar(s) {
  return (s ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export default function AliasesManager({ categoria: categoriaProp, setCategoria: setCategoriaProp } = {}) {
  const [categoriaLocal, setCategoriaLocal] = useState('femenino');
  const categoria    = categoriaProp ?? categoriaLocal;
  const setCategoria = setCategoriaProp ?? setCategoriaLocal;
  const tablas = TABLAS[categoria];
  const idField = tablas.jugadorIdField;

  const [aliases, setAliases]   = useState([]);
  const [jugMap, setJugMap]     = useState({});
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [busy, setBusy]         = useState(null); // id del alias en proceso de borrado
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      setLoading(true);
      setError('');
      try {
        const [aliasRes, jugRes] = await Promise.all([
          supabase.from(tablas.aliases).select('*').order('creado_en', { ascending: false }),
          supabase.from(tablas.jugadores).select(`id,nombre,equipo_id`),
        ]);
        if (aliasRes.error) throw aliasRes.error;
        if (jugRes.error) throw jugRes.error;
        if (cancelado) return;
        setAliases(aliasRes.data ?? []);
        setJugMap(Object.fromEntries((jugRes.data ?? []).map(j => [j.id, j])));
      } catch (err) {
        if (!cancelado) setError(err.message);
      } finally {
        if (!cancelado) setLoading(false);
      }
    }
    cargar();
    return () => { cancelado = true; };
  }, [categoria, tablas.aliases, tablas.jugadores]);

  const filtrados = useMemo(() => {
    const q = normalizar(search);
    if (!q) return aliases;
    return aliases.filter(a => {
      const jug = jugMap[a[idField]];
      const equipoNombre = EQUIPOS_MAP[a.equipo_id]?.name ?? a.equipo_id;
      return (
        normalizar(a.alias).includes(q) ||
        normalizar(jug?.nombre).includes(q) ||
        normalizar(equipoNombre).includes(q)
      );
    });
  }, [aliases, search, jugMap, idField]);

  const handleDelete = async (row) => {
    const jug = jugMap[row[idField]];
    const ok = await confirm(
      `¿Borrar el alias "${row.alias}" (→ ${jug?.nombre ?? row[idField]})? La próxima vez que aparezca ese nombre en un Excel, va a volver a pedir coincidencia por búsqueda difusa.`,
      { danger: true, confirmLabel: 'Borrar alias' }
    );
    if (!ok) return;
    setBusy(row.id);
    try {
      const { error: delErr } = await supabase.from(tablas.aliases).delete().eq('id', row.id);
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
      <h2 style={S.title}>🔗 Alias de nombres</h2>
      <p style={S.hint}>
        Cada fila es un nombre tal cual aparece escrito en algún Excel, vinculado de forma
        permanente a un jugador/a. Se usan para que las próximas planillas reconozcan ese
        nombre directamente, sin pasar por búsqueda difusa. Borrá un alias solo si está
        mal vinculado — la próxima carga con ese nombre va a volver a preguntar coincidencia.
        <br/>¿Ya se llegó a crear un jugador/a duplicado/a por este motivo (dos fichas para
        la misma persona)? Esto no lo arregla — para unir dos fichas en una usá <b>Fusionar jugadores</b>.
      </p>

      <input
        type="text"
        placeholder="Buscar por nombre en excel, jugador/a o equipo..."
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
            <div style={S.empty}>No hay alias cargados todavía.</div>
          ) : (
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Nombre en Excel</th>
                    <th style={S.th}>Jugador/a</th>
                    <th style={S.th}>Equipo</th>
                    <th style={S.th}>Estado</th>
                    <th style={S.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(row => {
                    const jug = jugMap[row[idField]];
                    const equipo = EQUIPOS_MAP[row.equipo_id];
                    return (
                      <tr key={row.id}>
                        <td style={S.td}>{row.alias}</td>
                        <td style={S.td}>
                          {jug?.nombre ?? <span style={{ color: '#F04060' }}>id: {row[idField]} (no encontrado)</span>}
                        </td>
                        <td style={S.td}>
                          <span style={{ color: equipo?.color ?? '#8899BB' }}>
                            {equipo?.name ?? row.equipo_id}
                          </span>
                        </td>
                        <td style={S.td}>
                          {row.confirmado ? (
                            <span style={S.badgeOk}>confirmado</span>
                          ) : (
                            <span style={S.badgeWarn}>automático</span>
                          )}
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
  badgeOk:   { color: '#22D07A', background: 'rgba(34,208,122,.1)', border: '1px solid rgba(34,208,122,.25)',
               borderRadius: 6, padding: '2px 8px', fontSize: 11 },
  badgeWarn: { color: '#F0B429', background: 'rgba(240,180,41,.1)', border: '1px solid rgba(240,180,41,.25)',
               borderRadius: 6, padding: '2px 8px', fontSize: 11 },
  delBtn:  { padding: '6px 12px', background: 'rgba(240,64,96,.08)', border: '1px solid rgba(240,64,96,.2)',
             borderRadius: 6, color: '#F04060', cursor: 'pointer', fontSize: 12, fontFamily: "'Barlow Condensed',sans-serif" },
};
