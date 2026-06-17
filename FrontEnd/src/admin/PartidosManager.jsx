import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';

const EQUIPOS = equiposFemenino.map(e => ({ id: e.id, nombre: e.name ?? e.nombre, color: e.color, logo: e.logo }));

const EMPTY_PARTIDO = {
  equipo_local_id:'', equipo_visit_id:'',
  puntos_local:'',    puntos_visit:'',
  q1_local:'', q2_local:'', q3_local:'', q4_local:'', ot_local:'',
  q1_visit:'', q2_visit:'', q3_visit:'', q4_visit:'', ot_visit:'',
  fecha_id:'', lugar:'', estado:'pendiente',
};

function LogoEq({ id, size=28 }) {
  const eq = EQUIPOS.find(e => e.id === id);
  if (!eq) return <div style={{ width:size, height:size, borderRadius:'50%', background:'#1C2535' }}/>;
  return (
    <img src={eq.logo} alt={eq.nombre}
      style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', border:`1.5px solid ${eq.color}40`, flexShrink:0 }}
      onError={e=>{e.target.style.display='none';}}/>
  );
}

function EstadoBadge({ estado }) {
  const map = {
    pendiente:  { bg:'rgba(107,122,153,.15)', color:'#6B7A99', label:'PENDIENTE' },
    en_juego:   { bg:'rgba(240,180,41,.15)',  color:'#F0B429', label:'EN VIVO'   },
    finalizado: { bg:'rgba(34,208,122,.12)',  color:'#22D07A', label:'FINAL'     },
  };
  const s = map[estado] ?? map.pendiente;
  return (
    <span style={{ fontSize:10, fontWeight:700, letterSpacing:1, padding:'2px 8px', borderRadius:4, background:s.bg, color:s.color }}>
      {s.label}
    </span>
  );
}

// ── Formulario de partido ─────────────────────────────────────────────────────
function PartidoForm({ form, setForm, fechas, onSave, onCancel, loading, editId }) {
  const n = v => v === '' ? '' : Number(v);

  // Calcular totales desde cuartos
  const totalLocal = ['q1','q2','q3','q4','ot'].reduce((a,q) => a + n(form[`${q}_local`] || 0), 0);
  const totalVisit = ['q1','q2','q3','q4','ot'].reduce((a,q) => a + n(form[`${q}_visit`] || 0), 0);

  const inp = (field, placeholder='', type='text', style={}) => (
    <input
      type={type} placeholder={placeholder} value={form[field] ?? ''}
      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
      style={{ ...F.input, ...style }}
    />
  );

  return (
    <div style={F.card}>
      {/* Equipo Local vs Visitante */}
      <div style={F.row}>
        <div style={F.group}>
          <label style={F.label}>EQUIPO LOCAL</label>
          <select value={form.equipo_local_id}
            onChange={e => setForm(f => ({...f, equipo_local_id:e.target.value}))}
            style={F.input}>
            <option value="">— Seleccionar —</option>
            {EQUIPOS.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', alignItems:'flex-end', paddingBottom:10, color:'#4A566E', fontFamily:"'Bebas Neue',sans-serif", fontSize:20 }}>VS</div>
        <div style={F.group}>
          <label style={F.label}>EQUIPO VISITANTE</label>
          <select value={form.equipo_visit_id}
            onChange={e => setForm(f => ({...f, equipo_visit_id:e.target.value}))}
            style={F.input}>
            <option value="">— Seleccionar —</option>
            {EQUIPOS.filter(e => e.id !== form.equipo_local_id).map(e => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Parciales */}
      <div style={{ background:'#080C12', border:'1px solid #1C2535', borderRadius:10, padding:'14px', marginBottom:16 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:'#4A566E', marginBottom:12 }}>PARCIALES POR CUARTO</div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', textAlign:'center', minWidth:400 }}>
            <thead>
              <tr>
                <th style={F.qth}></th>
                {['Q1','Q2','Q3','Q4','OT'].map(q => (
                  <th key={q} style={F.qth}>{q}</th>
                ))}
                <th style={{ ...F.qth, color:'#F0B429' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label:'Local',    prefix:'local',  color: EQUIPOS.find(e=>e.id===form.equipo_local_id)?.color??'#EEF2F8', total:totalLocal },
                { label:'Visitante',prefix:'visit',  color: EQUIPOS.find(e=>e.id===form.equipo_visit_id)?.color??'#EEF2F8', total:totalVisit },
              ].map(({ label, prefix, color, total }) => (
                <tr key={prefix}>
                  <td style={{ ...F.qtd, fontWeight:700, color, textAlign:'left', paddingLeft:4, whiteSpace:'nowrap' }}>
                    {label}
                  </td>
                  {['q1','q2','q3','q4','ot'].map(q => (
                    <td key={q} style={F.qtd}>
                      <input type="number" min="0" placeholder="0"
                        value={form[`${q}_${prefix}`] ?? ''}
                        onChange={e => setForm(f => ({...f, [`${q}_${prefix}`]:e.target.value}))}
                        style={{ ...F.qInput, borderColor: form[`${q}_${prefix}`]?`${color}40`:'#1C2535' }}
                      />
                    </td>
                  ))}
                  <td style={{ ...F.qtd, fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color }}>
                    {total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Meta */}
      <div style={F.row}>
        <div style={F.group}>
          <label style={F.label}>FECHA / JORNADA</label>
          <select value={form.fecha_id}
            onChange={e => setForm(f => ({...f, fecha_id:e.target.value}))}
            style={F.input}>
            <option value="">— Sin asignar —</option>
            {fechas.map(f => <option key={f.id} value={f.id}>{f.descripcion ?? `Fecha ${f.numero}`}</option>)}
          </select>
        </div>
        <div style={F.group}>
          <label style={F.label}>ESTADO</label>
          <select value={form.estado}
            onChange={e => setForm(f => ({...f, estado:e.target.value}))}
            style={F.input}>
            <option value="pendiente">Pendiente</option>
            <option value="en_juego">En juego</option>
            <option value="finalizado">Finalizado</option>
          </select>
        </div>
        <div style={F.group}>
          <label style={F.label}>LUGAR (opcional)</label>
          {inp('lugar', 'Club, cancha...')}
        </div>
      </div>

      {/* Botones */}
      <div style={{ display:'flex', gap:10, marginTop:4 }}>
        <button onClick={onSave} disabled={loading || !form.equipo_local_id || !form.equipo_visit_id}
          style={{ ...F.btnPrimary, opacity:(!form.equipo_local_id||!form.equipo_visit_id||loading)?0.5:1 }}>
          {loading ? 'Guardando...' : editId ? '💾 ACTUALIZAR PARTIDO' : '➕ AGREGAR PARTIDO'}
        </button>
        <button onClick={onCancel} style={F.btnSec}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Carga masiva de fixture ───────────────────────────────────────────────────
function FixtureMasivo({ fechas, onCrearFecha, onClose }) {
  const [jornada,      setJornada]      = useState('');
  const [descripcion,  setDescripcion]  = useState('');
  const [partidos,     setPartidos]     = useState([
    { equipo_local_id:'', equipo_visit_id:'', lugar:'' },
  ]);
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState(null);

  const addPartido = () => setPartidos(p => [...p, { equipo_local_id:'', equipo_visit_id:'', lugar:'' }]);
  const removePartido = (i) => setPartidos(p => p.filter((_,j) => j!==i));
  const updatePartido = (i, field, val) => setPartidos(p => p.map((r,j) => j===i?{...r,[field]:val}:r));

  // Equipos ya usados como local en esta configuración
  const usedLocal  = partidos.map(p => p.equipo_local_id).filter(Boolean);
  const usedVisit  = partidos.map(p => p.equipo_visit_id).filter(Boolean);

  const handleGuardar = async () => {
    if (!jornada) { setMsg({ok:false,text:'Ingresá el número de fecha'}); return; }
    const validos = partidos.filter(p => p.equipo_local_id && p.equipo_visit_id);
    if (validos.length === 0) { setMsg({ok:false,text:'Agregá al menos un partido completo'}); return; }

    setLoading(true);
    try {
      // 1. Crear/obtener fecha
      const { data:fd, error:fErr } = await supabase
        .from('fechas_femenino')
        .upsert({
          numero:      Number(jornada),
          descripcion: descripcion || `Fecha ${jornada}`,
        }, { onConflict:'numero' })
        .select('id').single();
      if (fErr) throw fErr;

      // 2. Insertar partidos
      const rows = validos.map(p => ({
        fecha_id:        fd.id,
        equipo_local_id: p.equipo_local_id,
        equipo_visit_id: p.equipo_visit_id,
        lugar:           p.lugar || null,
        estado:          'pendiente',
      }));
      const { error:pErr } = await supabase.from('partidos_femenino').insert(rows);
      if (pErr) throw pErr;

      setMsg({ ok:true, text:`✅ Fecha ${jornada} creada con ${validos.length} partido(s)` });
      onCrearFecha?.();
      setTimeout(onClose, 1500);
    } catch(err) {
      setMsg({ ok:false, text:`❌ ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background:'#0E1420', border:'1px solid rgba(240,180,41,.25)', borderRadius:14, padding:'1.5rem', marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:1, color:'#F0B429' }}>
            📅 CARGAR FIXTURE DE UNA FECHA
          </div>
          <div style={{ fontSize:12, color:'#4A566E' }}>Cargá todos los partidos de una fecha de una sola vez</div>
        </div>
        <button onClick={onClose} style={{ background:'transparent', border:'none', color:'#6B7A99', cursor:'pointer', fontSize:20 }}>✕</button>
      </div>

      {msg && (
        <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:16, fontSize:14,
          background:msg.ok?'rgba(34,208,122,.1)':'rgba(240,64,96,.1)',
          color:msg.ok?'#22D07A':'#F04060',
          border:`1px solid ${msg.ok?'rgba(34,208,122,.3)':'rgba(240,64,96,.3)'}` }}>
          {msg.text}
        </div>
      )}

      {/* Número y nombre de fecha */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <div style={{ flex:'0 0 120px' }}>
          <label style={F.label}>N° DE FECHA *</label>
          <input type="number" min="1" placeholder="1" value={jornada}
            onChange={e=>setJornada(e.target.value)} style={F.input}/>
        </div>
        <div style={{ flex:1, minWidth:200 }}>
          <label style={F.label}>DESCRIPCIÓN (opcional)</label>
          <input type="text" placeholder="Ej: Fecha 5 - Semifinal" value={descripcion}
            onChange={e=>setDescripcion(e.target.value)} style={F.input}/>
        </div>
      </div>

      {/* Lista de partidos */}
      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
        {partidos.map((p, i) => (
          <div key={i} style={{ background:'#141C2A', border:'1px solid #1C2535', borderRadius:10, padding:'12px 14px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:8 }}>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:'#4A566E', fontFamily:"'Barlow Condensed',sans-serif" }}>
                PARTIDO {i+1}
              </span>
              {partidos.length > 1 && (
                <button onClick={() => removePartido(i)}
                  style={{ marginLeft:'auto', background:'transparent', border:'none', color:'#F04060', cursor:'pointer', fontSize:16, padding:'0 4px' }}>
                  ✕
                </button>
              )}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:160 }}>
                <select value={p.equipo_local_id}
                  onChange={e => updatePartido(i,'equipo_local_id',e.target.value)}
                  style={{ ...F.input, borderColor: p.equipo_local_id ? EQUIPOS.find(eq=>eq.id===p.equipo_local_id)?.color+'40' : '#1C2535' }}>
                  <option value="">Local —</option>
                  {EQUIPOS.filter(eq => !usedLocal.includes(eq.id) || eq.id===p.equipo_local_id).map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.nombre}</option>
                  ))}
                </select>
              </div>
              <div style={{ color:'#4A566E', fontFamily:"'Bebas Neue',sans-serif", fontSize:16, flexShrink:0 }}>VS</div>
              <div style={{ flex:1, minWidth:160 }}>
                <select value={p.equipo_visit_id}
                  onChange={e => updatePartido(i,'equipo_visit_id',e.target.value)}
                  style={{ ...F.input, borderColor: p.equipo_visit_id ? EQUIPOS.find(eq=>eq.id===p.equipo_visit_id)?.color+'40' : '#1C2535' }}>
                  <option value="">Visitante —</option>
                  {EQUIPOS.filter(eq => eq.id !== p.equipo_local_id && (!usedVisit.includes(eq.id) || eq.id===p.equipo_visit_id)).map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.nombre}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex:'0 0 180px', minWidth:140 }}>
                <input type="text" placeholder="Lugar (opcional)"
                  value={p.lugar ?? ''}
                  onChange={e => updatePartido(i,'lugar',e.target.value)}
                  style={F.input}/>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Agregar partido */}
      {partidos.length < 10 && (
        <button onClick={addPartido} style={{ ...F.btnSec, marginBottom:16, display:'flex', alignItems:'center', gap:6 }}>
          ➕ Agregar partido
        </button>
      )}

      <div style={{ display:'flex', gap:10 }}>
        <button onClick={handleGuardar} disabled={loading||!jornada}
          style={{ ...F.btnPrimary, opacity:loading||!jornada?0.5:1 }}>
          {loading ? 'Guardando...' : `🚀 PUBLICAR FECHA ${jornada||'?'} (${partidos.filter(p=>p.equipo_local_id&&p.equipo_visit_id).length} partidos)`}
        </button>
        <button onClick={onClose} style={F.btnSec}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Panel principal ───────────────────────────────────────────────────────────
export default function PartidosManager() {
  const [partidos, setPartidos] = useState([]);
  const [fechas,   setFechas]   = useState([]);
  const [form,     setForm]     = useState(EMPTY_PARTIDO);
  const [editId,   setEditId]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [msg,      setMsg]      = useState(null);
  const [view,     setView]     = useState('lista');   // 'lista' | 'nuevo' | 'fixture'
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroEstado,setFiltroEstado]= useState('');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [{ data:ps }, { data:fs }] = await Promise.all([
      supabase.from('partidos_femenino').select('*').order('fecha_id',{ascending:true}),
      supabase.from('fechas_femenino').select('*').order('numero',{ascending:true}),
    ]);
    setPartidos(ps ?? []);
    setFechas(fs ?? []);
  };

  const flash = (text, ok=true) => { setMsg({text,ok}); setTimeout(()=>setMsg(null),3000); };

  const handleSave = async () => {
    if (!form.equipo_local_id || !form.equipo_visit_id) { flash('Seleccioná ambos equipos',false); return; }
    if (form.equipo_local_id === form.equipo_visit_id)   { flash('Los equipos no pueden ser iguales',false); return; }
    setLoading(true);
    try {
      const payload = {
        equipo_local_id: form.equipo_local_id,
        equipo_visit_id: form.equipo_visit_id,
        fecha_id:        form.fecha_id || null,
        lugar:           form.lugar    || null,
        estado:          form.estado,
        q1_local: Number(form.q1_local||0), q2_local: Number(form.q2_local||0),
        q3_local: Number(form.q3_local||0), q4_local: Number(form.q4_local||0), ot_local: Number(form.ot_local||0),
        q1_visit: Number(form.q1_visit||0), q2_visit: Number(form.q2_visit||0),
        q3_visit: Number(form.q3_visit||0), q4_visit: Number(form.q4_visit||0), ot_visit: Number(form.ot_visit||0),
      };
      if (editId) {
        const { error } = await supabase.from('partidos_femenino').update(payload).eq('id',editId);
        if (error) throw error;
        flash('✅ Partido actualizado');
      } else {
        const { error } = await supabase.from('partidos_femenino').insert(payload);
        if (error) throw error;
        flash('✅ Partido agregado');
      }
      setForm(EMPTY_PARTIDO); setEditId(null); setView('lista');
      await loadAll();
    } catch(err) { flash(`❌ ${err.message}`,false); }
    finally { setLoading(false); }
  };

  const handleEdit = (p) => {
    setForm({
      equipo_local_id: p.equipo_local_id??'', equipo_visit_id: p.equipo_visit_id??'',
      fecha_id: p.fecha_id??'', lugar: p.lugar??'', estado: p.estado??'pendiente',
      q1_local:p.q1_local??'', q2_local:p.q2_local??'', q3_local:p.q3_local??'', q4_local:p.q4_local??'', ot_local:p.ot_local??'',
      q1_visit:p.q1_visit??'', q2_visit:p.q2_visit??'', q3_visit:p.q3_visit??'', q4_visit:p.q4_visit??'', ot_visit:p.ot_visit??'',
    });
    setEditId(p.id); setView('nuevo');
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este partido y todas sus estadísticas?')) return;
    await supabase.from('partidos_femenino').delete().eq('id',id);
    await loadAll(); flash('✅ Eliminado');
  };

  const handleEstado = async (id, estado) => {
    await supabase.from('partidos_femenino').update({ estado }).eq('id',id);
    await loadAll();
  };

  const cancelForm = () => { setForm(EMPTY_PARTIDO); setEditId(null); setView('lista'); };

  const partidosFiltrados = partidos.filter(p => {
    if (filtroFecha  && p.fecha_id !== Number(filtroFecha))  return false;
    if (filtroEstado && p.estado !== filtroEstado)            return false;
    return true;
  });

  const nombreEq = id => EQUIPOS.find(e=>e.id===id)?.nombre ?? id;

  // Agrupar por fecha
  const porFecha = {};
  for (const p of partidosFiltrados) {
    const fid = p.fecha_id ?? 'sin-fecha';
    if (!porFecha[fid]) porFecha[fid] = [];
    porFecha[fid].push(p);
  }
  const fechaIds = Object.keys(porFecha).sort((a,b) => {
    if (a==='sin-fecha') return 1;
    if (b==='sin-fecha') return -1;
    return Number(a)-Number(b);
  });

  return (
    <div>
      {/* Msg flash */}
      {msg && (
        <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:16, fontSize:14,
          background:msg.ok?'rgba(34,208,122,.1)':'rgba(240,64,96,.1)',
          color:msg.ok?'#22D07A':'#F04060',
          border:`1px solid ${msg.ok?'rgba(34,208,122,.3)':'rgba(240,64,96,.3)'}` }}>
          {msg.text}
        </div>
      )}

      {/* Acciones principales */}
      {view==='lista' && (
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
          <button onClick={()=>setView('fixture')}
            style={{ ...F.btnPrimary, background:'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>
            📅 CARGAR FIXTURE DE UNA FECHA
          </button>
          <button onClick={()=>setView('nuevo')}
            style={{ ...F.btnSec, display:'flex', alignItems:'center', gap:6 }}>
            ➕ Partido individual
          </button>
        </div>
      )}

      {/* Fixture masivo */}
      {view==='fixture' && (
        <FixtureMasivo
          fechas={fechas}
          onCrearFecha={loadAll}
          onClose={()=>setView('lista')}
        />
      )}

      {/* Formulario individual */}
      {view==='nuevo' && (
        <PartidoForm
          form={form} setForm={setForm}
          fechas={fechas}
          onSave={handleSave} onCancel={cancelForm}
          loading={loading} editId={editId}
        />
      )}

      {/* Filtros */}
      {view==='lista' && (
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
          <select value={filtroFecha} onChange={e=>setFiltroFecha(e.target.value)}
            style={{ ...F.input, flex:1, minWidth:140 }}>
            <option value="">Todas las fechas</option>
            {fechas.map(f=><option key={f.id} value={f.id}>{f.descripcion??`Fecha ${f.numero}`}</option>)}
          </select>
          <select value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}
            style={{ ...F.input, flex:1, minWidth:140 }}>
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="en_juego">En juego</option>
            <option value="finalizado">Finalizados</option>
          </select>
          <div style={{ fontSize:13, color:'#6B7A99', display:'flex', alignItems:'center' }}>
            {partidosFiltrados.length} partido(s)
          </div>
        </div>
      )}

      {/* Lista agrupada por fecha */}
      {view==='lista' && (
        partidos.length === 0 ? (
          <div style={{ textAlign:'center', padding:'3rem', color:'#6B7A99' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📅</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:'#EEF2F8', marginBottom:8 }}>Sin partidos cargados</div>
            <div>Usá "Cargar Fixture de una Fecha" para empezar</div>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {fechaIds.map(fid => {
              const fecha = fechas.find(f=>f.id===Number(fid));
              const ps    = porFecha[fid];
              return (
                <div key={fid}>
                  {/* Header de fecha */}
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, paddingBottom:8, borderBottom:'1px solid #1C2535' }}>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:1, color:'#F0B429' }}>
                      {fecha ? (fecha.descripcion ?? `Fecha ${fecha.numero}`) : 'Sin fecha asignada'}
                    </div>
                    <div style={{ fontSize:11, color:'#4A566E' }}>{ps.length} partido(s)</div>
                  </div>

                  {/* Partidos de esta fecha */}
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {ps.map(p => (
                      <div key={p.id} style={{
                        background:'#0E1420', border:'1px solid #1C2535',
                        borderRadius:12, padding:'14px 16px',
                        display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
                      }}>
                        {/* Equipos + marcador */}
                        <div style={{ flex:1, minWidth:220 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                            <LogoEq id={p.equipo_local_id} size={24}/>
                            <span style={{ color:'#EEF2F8', fontWeight:600, fontSize:14 }}>{nombreEq(p.equipo_local_id)}</span>
                            {p.estado==='finalizado' && (
                              <>
                                <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:'#F0B429', margin:'0 4px' }}>
                                  {p.puntos_local} – {p.puntos_visit}
                                </span>
                              </>
                            )}
                            {p.estado!=='finalizado' && (
                              <span style={{ color:'#4A566E', margin:'0 6px' }}>vs</span>
                            )}
                            <span style={{ color:'#EEF2F8', fontWeight:600, fontSize:14 }}>{nombreEq(p.equipo_visit_id)}</span>
                            <LogoEq id={p.equipo_visit_id} size={24}/>
                          </div>
                          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                            <EstadoBadge estado={p.estado}/>
                            {p.lugar && <span style={{ fontSize:11, color:'#4A566E' }}>📍 {p.lugar}</span>}
                            {/* Parciales */}
                            {p.estado==='finalizado' && p.q1_local!=null && (
                              <div style={{ display:'flex', gap:4 }}>
                                {['q1','q2','q3','q4'].map(q => (
                                  <span key={q} style={{ fontSize:10, background:'#141C2A', borderRadius:3, padding:'1px 5px', color:'#6B7A99' }}>
                                    {p[`${q}_local`]}-{p[`${q}_visit`]}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Acciones */}
                        <div style={{ display:'flex', gap:6, flexShrink:0, flexWrap:'wrap' }}>
                          {/* Cambio rápido de estado */}
                          {p.estado==='pendiente' && (
                            <button onClick={()=>handleEstado(p.id,'en_juego')}
                              style={{ ...F.quickBtn, borderColor:'rgba(240,180,41,.3)', color:'#F0B429' }}>
                              ▶ En vivo
                            </button>
                          )}
                          {p.estado==='en_juego' && (
                            <button onClick={()=>handleEstado(p.id,'finalizado')}
                              style={{ ...F.quickBtn, borderColor:'rgba(34,208,122,.3)', color:'#22D07A' }}>
                              ✓ Finalizar
                            </button>
                          )}
                          <button onClick={()=>handleEdit(p)}
                            style={{ ...F.quickBtn, borderColor:'#1C2535', color:'#6B7A99' }}>
                            ✏️
                          </button>
                          <button onClick={()=>handleDelete(p.id)}
                            style={{ ...F.quickBtn, borderColor:'rgba(240,64,96,.2)', color:'#F04060' }}>
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
  label:   { fontSize:10, fontWeight:700, letterSpacing:2, color:'#4A566E', display:'block', marginBottom:6 },
  input:   { width:'100%', padding:'10px 12px', background:'#141C2A', border:'1px solid #1C2535', borderRadius:8, color:'#EEF2F8', fontSize:14, outline:'none', boxSizing:'border-box', transition:'border-color .2s' },
  card:    { background:'#0E1420', border:'1px solid rgba(240,180,41,.2)', borderRadius:14, padding:'1.5rem', marginBottom:20 },
  row:     { display:'flex', gap:14, marginBottom:16, flexWrap:'wrap' },
  group:   { flex:1, minWidth:160, display:'flex', flexDirection:'column' },
  qth:     { padding:'8px 10px', color:'#6B7A99', fontSize:11, letterSpacing:.5, background:'#080C12', border:'1px solid #1C2535', textAlign:'center' },
  qtd:     { padding:'6px 8px', textAlign:'center', border:'1px solid #1C2535' },
  qInput:  { width:52, padding:'6px 4px', background:'#080C12', border:'1px solid', borderRadius:5, color:'#EEF2F8', fontSize:16, textAlign:'center', outline:'none', fontFamily:"'Bebas Neue',sans-serif" },
  btnPrimary:{ padding:'11px 20px', background:'linear-gradient(135deg,#F0B429,#FF6B2B)', border:'none', borderRadius:9, color:'#080C12', fontFamily:"'Bebas Neue',sans-serif", fontSize:17, letterSpacing:1, cursor:'pointer' },
  btnSec:    { padding:'10px 18px', background:'transparent', border:'1px solid #4A566E', borderRadius:9, color:'#6B7A99', cursor:'pointer', fontSize:13 },
  quickBtn:  { padding:'6px 10px', background:'transparent', border:'1px solid', borderRadius:7, cursor:'pointer', fontSize:13 },
};
