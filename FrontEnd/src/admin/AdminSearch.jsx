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
  const { temporadas } = useTemporada();

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
    <div ref={ref} style={{ position:'relative', flex:'1 1 260px', minWidth:180, maxWidth:360 }}>
      <div style={{ position:'relative' }}>
        <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'#4A566E', pointerEvents:'none' }}>🔍</span>
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar jugadora, equipo, fecha..."
          style={{
            width:'100%', padding:'8px 12px 8px 32px', borderRadius:9, border:'1px solid #1C2535',
            background:'#0E1420', color:'#EEF2F8', fontSize:13, outline:'none', boxSizing:'border-box',
            fontFamily:"'Barlow Condensed',sans-serif",
          }}/>
      </div>
      {open && q.trim().length >= 2 && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)', left:0, right:0, zIndex:80, maxHeight:400, overflowY:'auto',
          background:'#0E1420', border:'1px solid #1C2535', borderRadius:11, padding:6,
          boxShadow:'0 12px 32px rgba(0,0,0,.5)',
        }}>
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
                    ? <img src={e.logo} alt="" width={18} height={18} style={{ borderRadius:'50%', objectFit:'cover', flexShrink:0, border:'1px solid #E8187A55' }} onError={ev=>{ev.currentTarget.style.display='none';}}/>
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
                    ? <img src={e.logo} alt="" width={18} height={18} style={{ borderRadius:'50%', objectFit:'cover', flexShrink:0, border:'1px solid #1878E855' }} onError={ev=>{ev.currentTarget.style.display='none';}}/>
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
                  <span style={{ fontSize:13 }}>📅</span>
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
  grupo: { fontSize:9.5, fontWeight:700, letterSpacing:1.5, color:'#4A566E', padding:'6px 8px 4px', fontFamily:"'Barlow Condensed',sans-serif" },
  item: { display:'flex', alignItems:'center', gap:9, width:'100%', padding:'7px 8px', borderRadius:8, background:'transparent', border:'none', cursor:'pointer', textAlign:'left' },
  itemTitle: { fontSize:13, color:'#CBD5E8', fontFamily:"'Barlow Condensed',sans-serif", fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  itemSub: { fontSize:10.5, color:'#4A566E', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  catDot: {
    width:18, height:18, borderRadius:'50%', flexShrink:0, fontSize:11, fontWeight:700,
    display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid',
  },
};
