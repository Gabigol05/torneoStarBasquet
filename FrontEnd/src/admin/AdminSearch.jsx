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

async function buscarJugadores(tabla, term) {
  const { data } = await supabase.from(tabla).select('id,nombre,numero,equipo_id').ilike('nombre', `%${term}%`).limit(6);
  return data ?? [];
}
async function buscarFechas(tabla, term) {
  const limpio = term.trim();
  const esNumero = /^\d+$/.test(limpio);
  let query = supabase.from(tabla).select('id,numero,descripcion,temporada_id');
  query = esNumero ? query.eq('numero', Number(limpio)) : query.ilike('descripcion', `%${limpio}%`);
  const { data } = await query.order('numero', { ascending:false }).limit(6);
  return data ?? [];
}

export default function AdminSearch({ setSec, setCategoria, setFoco }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState({ jugadores:[], equipos:[], fechas:[] });
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
      try {
        const [jf, jm, ff, fm] = await Promise.all([
          buscarJugadores('jugadoras_femenino', term),
          buscarJugadores('jugadores_masculino', term),
          buscarFechas('fechas_femenino', term),
          buscarFechas('fechas_masculino', term),
        ]);
        const equiposMatch = [
          ...equiposFemenino.filter(e => normStr(e.name).includes(normStr(term))).map(e => ({ ...e, categoria:'femenino' })),
          ...equiposMasculino.filter(e => normStr(e.name).includes(normStr(term))).map(e => ({ ...e, categoria:'masculino' })),
        ];
        setResultados({
          jugadores: [
            ...jf.map(j => ({ ...j, categoria:'femenino' })),
            ...jm.map(j => ({ ...j, categoria:'masculino' })),
          ],
          equipos: equiposMatch,
          fechas: [
            ...ff.map(f => ({ ...f, categoria:'femenino' })),
            ...fm.map(f => ({ ...f, categoria:'masculino' })),
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
          {!loading && !hayResultados && <div style={{ padding:'10px 8px', fontSize:12, color:'#4A566E' }}>Sin resultados para "{q}"</div>}

          {resultados.jugadores.length > 0 && (
            <div style={{ marginBottom:6 }}>
              <div style={S.grupo}>JUGADORAS / JUGADORES</div>
              {resultados.jugadores.map(j => (
                <button key={`${j.categoria}-${j.id}`} onClick={() => irAJugador(j)} style={S.item}>
                  <span style={{ fontSize:13 }}>{j.categoria === 'femenino' ? '♀' : '♂'}</span>
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={S.itemTitle}>{j.nombre}{j.numero != null ? ` · #${j.numero}` : ''}</div>
                    <div style={S.itemSub}>{nombreEquipo(j.categoria, j.equipo_id)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {resultados.equipos.length > 0 && (
            <div style={{ marginBottom:6 }}>
              <div style={S.grupo}>EQUIPOS</div>
              {resultados.equipos.map(e => (
                <button key={`${e.categoria}-${e.id}`} onClick={() => irAEquipo(e)} style={S.item}>
                  {e.logo && <img src={e.logo} alt="" width={18} height={18} style={{ borderRadius:'50%', objectFit:'cover', flexShrink:0 }} onError={ev=>{ev.currentTarget.style.display='none';}}/>}
                  <div style={{ minWidth:0, flex:1 }}>
                    <div style={S.itemTitle}>{e.name}</div>
                    <div style={S.itemSub}>{e.categoria === 'femenino' ? 'Femenino' : 'Masculino'}</div>
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
                      {f.categoria === 'femenino' ? '♀ Femenino' : '♂ Masculino'}
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
};
