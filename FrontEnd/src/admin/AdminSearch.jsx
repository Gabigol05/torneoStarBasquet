import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';
import { equiposMasculino } from '../data/masculinoData';
import { useTemporada } from '../context/TemporadaContext';

const ROSTER = { femenino: equiposFemenino, masculino: equiposMasculino };

// ─── Buscador rápido del panel ────────────────────────────────────────────
// Antes, para encontrar a una jugadora puntual o una fecha había que primero
// adivinar en qué sección/categoría vivía y navegar ahí a mano. Esta barra
// busca en las dos categorías a la vez — jugadoras/es por nombre, equipos por
// nombre, fechas por número o descripción — y al elegir un resultado salta
// directo a la sección correcta con el equipo/fecha ya seleccionado.
function normStr(s) { return (s ?? '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

// Antes esto se tragaba `error` en silencio — una búsqueda que fallara (ej.
// por un permiso RLS, como pasó con "temporadas") se veía igual que "sin
// resultados", indistinguible de una búsqueda que de verdad no encontró nada.
async function buscarJugadores(tabla, term) {
  const { data, error } = await supabase.from(tabla).select('id,nombre,numero,equipo_id').ilike('nombre', `%${term}%`).limit(6);
  if (error) { console.warn(`[AdminSearch] ${tabla}:`, error.message); return { data: [], error }; }
  return { data: data ?? [], error: null };
}
async function buscarFechas(tabla, term) {
  const limpio = term.trim();
  const esNumero = /^\d+$/.test(limpio);
  let query = supabase.from(tabla).select('id,numero,descripcion,temporada_id');
  query = esNumero ? query.eq('numero', Number(limpio)) : query.ilike('descripcion', `%${limpio}%`);
  const { data, error } = await query.order('numero', { ascending:false }).limit(6);
  if (error) { console.warn(`[AdminSearch] ${tabla}:`, error.message); return { data: [], error }; }
  return { data: data ?? [], error: null };
}

export default function AdminSearch({ setSec, setCategoria, setFoco }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState({ jugadores:[], equipos:[], fechas:[] });
  const [searchError, setSearchError] = useState(false);
  const ref = useRef(null);
  const inputRef = useRef(null);
  const { temporadas } = useTemporada();

  // Atajos: Ctrl+K (o "/") enfoca el buscador; Esc lo limpia y lo cierra.
  useEffect(() => {
    const onKey = e => {
      const t = e.target;
      const escribiendo = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !escribiendo)) {
        if (!inputRef.current || inputRef.current.offsetParent === null) return;
        e.preventDefault();
        inputRef.current.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDocClick = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResultados({ jugadores:[], equipos:[], fechas:[] }); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      setSearchError(false);
      try {
        const [jf, jm, ff, fm] = await Promise.all([
          buscarJugadores('jugadoras_femenino', term),
          buscarJugadores('jugadores_masculino', term),
          buscarFechas('fechas_femenino', term),
          buscarFechas('fechas_masculino', term),
        ]);
        if (jf.error || jm.error || ff.error || fm.error) setSearchError(true);
        const equiposMatch = [
          ...equiposFemenino.filter(e => normStr(e.name).includes(normStr(term))).map(e => ({ ...e, categoria:'femenino' })),
          ...equiposMasculino.filter(e => normStr(e.name).includes(normStr(term))).map(e => ({ ...e, categoria:'masculino' })),
        ];
        setResultados({
          jugadores: [
            ...jf.data.map(j => ({ ...j, categoria:'femenino' })),
            ...jm.data.map(j => ({ ...j, categoria:'masculino' })),
          ],
          equipos: equiposMatch,
          fechas: [
            ...ff.data.map(f => ({ ...f, categoria:'femenino' })),
            ...fm.data.map(f => ({ ...f, categoria:'masculino' })),
          ],
        });
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  const nombreEquipo = (categoria, equipoId) => ROSTER[categoria].find(e => e.id === equipoId)?.name ?? equipoId;

  const irAJugador = (j) => {
    setCategoria(j.categoria);
    setSec('plantel');
    setFoco({ equipoId: j.equipo_id, ts: Date.now() });
    setQ(''); setOpen(false);
  };
  const irAEquipo = (e) => {
    setCategoria(e.categoria);
    setSec('plantel');
    setFoco({ equipoId: e.id, ts: Date.now() });
    setQ(''); setOpen(false);
  };
  const irAFecha = (f) => {
    setCategoria(f.categoria);
    setSec('partidos');
    setFoco({ fechaId: f.id, ts: Date.now() });
    setQ(''); setOpen(false);
  };

  const temporadaNombre = (id) => temporadas.find(t => t.id === id)?.nombre ?? null;
  const hayResultados = resultados.jugadores.length || resultados.equipos.length || resultados.fechas.length;
  // Antes femenino y masculino aparecían mezclados bajo un mismo título
  // "JUGADORAS / JUGADORES" — el ícono ♀/♂ de cada fila era la única pista
  // de a qué lado pertenecía, muy fácil de pasar por alto buscando rápido.
  // Separados en dos grupos con su propio título no deja lugar a dudas.
  const jugadorasFem  = resultados.jugadores.filter(j => j.categoria === 'femenino');
  const jugadoresMasc = resultados.jugadores.filter(j => j.categoria === 'masculino');
  const equiposFemR  = resultados.equipos.filter(e => e.categoria === 'femenino');
  const equiposMascR = resultados.equipos.filter(e => e.categoria === 'masculino');

  return (
    <div ref={ref} className="as" style={{ position:'relative', flex:'1 1 260px', minWidth:0 }}>
      <label className={`as-box${open ? ' is-open' : ''}`}>
        <svg className="as-lupa" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input
          ref={inputRef}
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => { if (e.key === 'Escape') { setQ(''); setOpen(false); e.currentTarget.blur(); } }}
          placeholder="Buscar jugador, equipo o fecha…"
          aria-label="Buscar en el panel"
          style={{ background:'transparent' }}/>
        {q
          ? <button type="button" className="as-x" onClick={() => { setQ(''); inputRef.current?.focus(); }} aria-label="Borrar búsqueda">✕</button>
          : <kbd className="as-kbd">Ctrl K</kbd>}
      </label>
      {open && q.trim().length < 2 && (
        <div className="as-pop as-pop--hint">
          <b>Buscá en las dos categorías a la vez</b>
          <span>Jugadoras y jugadores por nombre · equipos · fechas por número</span>
        </div>
      )}
      {open && q.trim().length >= 2 && (
        <div className="as-pop scrollbar-accent">
          {loading && <div style={{ padding:'10px 8px', fontSize:12, color:'#4A566E' }}>Buscando...</div>}
          {searchError && (
            <div style={{ padding:'10px 8px', fontSize:11.5, color:'#F04060' }}>
              ⚠️ Parte de la búsqueda falló — puede haber resultados que no se muestran acá.
            </div>
          )}
          {!loading && !hayResultados && <div style={{ padding:'10px 8px', fontSize:12, color:'#4A566E' }}>Sin resultados para "{q}"</div>}

          {jugadorasFem.length > 0 && (
            <div style={{ marginBottom:6 }}>
              <div style={{ ...S.grupo, color:'#E8187A' }}>♀ JUGADORAS — FEMENINO</div>
              {jugadorasFem.map(j => (
                <button key={`${j.categoria}-${j.id}`} onClick={() => irAJugador(j)} style={S.item}>
                  <span style={{ ...S.catDot, background:'#E8187A22', color:'#E8187A', borderColor:'#E8187A55' }}>♀</span>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={S.itemTitle}>{j.nombre}{j.numero != null ? ` · #${j.numero}` : ''}</div>
                    <div style={S.itemSub}>{nombreEquipo(j.categoria, j.equipo_id)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {jugadoresMasc.length > 0 && (
            <div style={{ marginBottom:6 }}>
              <div style={{ ...S.grupo, color:'#1878E8' }}>♂ JUGADORES — MASCULINO</div>
              {jugadoresMasc.map(j => (
                <button key={`${j.categoria}-${j.id}`} onClick={() => irAJugador(j)} style={S.item}>
                  <span style={{ ...S.catDot, background:'#1878E822', color:'#1878E8', borderColor:'#1878E855' }}>♂</span>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={S.itemTitle}>{j.nombre}{j.numero != null ? ` · #${j.numero}` : ''}</div>
                    <div style={S.itemSub}>{nombreEquipo(j.categoria, j.equipo_id)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {equiposFemR.length > 0 && (
            <div style={{ marginBottom:6 }}>
              <div style={{ ...S.grupo, color:'#E8187A' }}>♀ EQUIPOS — FEMENINO</div>
              {equiposFemR.map(e => (
                <button key={`${e.categoria}-${e.id}`} onClick={() => irAEquipo(e)} style={S.item}>
                  {e.logo
                    ? <img src={e.logo} alt="" width={30} height={30} style={{ borderRadius:'50%', objectFit:'cover', flexShrink:0, border:'2px solid #E8187A88', background:'#0E1420' }} onError={ev=>{ev.currentTarget.style.display='none';}}/>
                    : <span style={{ ...S.catDot, background:'#E8187A22', color:'#E8187A', borderColor:'#E8187A55' }}>♀</span>}
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={S.itemTitle}>{e.name}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {equiposMascR.length > 0 && (
            <div style={{ marginBottom:6 }}>
              <div style={{ ...S.grupo, color:'#1878E8' }}>♂ EQUIPOS — MASCULINO</div>
              {equiposMascR.map(e => (
                <button key={`${e.categoria}-${e.id}`} onClick={() => irAEquipo(e)} style={S.item}>
                  {e.logo
                    ? <img src={e.logo} alt="" width={30} height={30} style={{ borderRadius:'50%', objectFit:'cover', flexShrink:0, border:'2px solid #3b82f688', background:'#0E1420' }} onError={ev=>{ev.currentTarget.style.display='none';}}/>
                    : <span style={{ ...S.catDot, background:'#1878E822', color:'#1878E8', borderColor:'#1878E855' }}>♂</span>}
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={S.itemTitle}>{e.name}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {resultados.fechas.length > 0 && (
            <div>
              <div style={S.grupo}>FECHAS</div>
              {resultados.fechas.map(f => (
                <button key={`${f.categoria}-${f.id}`} onClick={() => irAFecha(f)} style={S.item}>
                  <span className="as-cal"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></svg></span>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={S.itemTitle}>{f.descripcion ?? `Fecha ${f.numero}`}</div>
                    <div style={S.itemSub}>
                      <span style={{ color: f.categoria === 'femenino' ? '#E8187A' : '#1878E8', fontWeight:700 }}>
                        {f.categoria === 'femenino' ? '♀ Femenino' : '♂ Masculino'}
                      </span>
                      {temporadaNombre(f.temporada_id) ? ` · ${temporadaNombre(f.temporada_id)}` : ''}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const S = {
  grupo: { fontSize:11, fontWeight:700, letterSpacing:1.6, color:'#6B7A99', padding:'8px 10px 4px', fontFamily:"'Barlow Condensed',sans-serif", textTransform:'uppercase' },
  item: { display:'flex', alignItems:'center', gap:11, width:'100%', padding:'8px 10px', borderRadius:10, background:'transparent', border:'none', cursor:'pointer', textAlign:'left' },
  itemTitle: { fontSize:15.5, color:'#EEF2F8', fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  itemSub: { fontSize:12.5, color:'#7A879E', fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  catDot: {
    width:30, height:30, borderRadius:'50%', flexShrink:0, fontSize:14, fontWeight:700,
    display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid',
  },
};
