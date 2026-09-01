import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';
import { equiposMasculino } from '../data/masculinoData';
import { TABLAS, sugerirEncuestaQuienGana } from './categoriaAdmin';
import { useConfirm } from '../components/ConfirmModal.jsx';
import { useTemporada } from '../context/TemporadaContext';

const ROSTER = { femenino: equiposFemenino, masculino: equiposMasculino };

const EMPTY_PARTIDO = {
  equipo_local_id:'', equipo_visit_id:'',
  puntos_local:'',    puntos_visit:'',
  q1_local:'', q2_local:'', q3_local:'', q4_local:'', ot_local:'',
  q1_visit:'', q2_visit:'', q3_visit:'', q4_visit:'', ot_visit:'',
  fecha_id:'', hora_inicio:'', lugar:'', estado:'pendiente', fecha_partido:'',
  es_playoff:false, copa:'', instancia:'', llave:'',
};

// Copa e instancia de playoff — mismas claves que usa el cuadro público
// (PlayoffsBracket.jsx) y la migración SQL (add_playoffs.sql).
const COPAS_PLAYOFF = [
  { value:'oro',    label:'Copa de Oro'    },
  { value:'plata',  label:'Copa de Plata'  },
  { value:'bronce', label:'Copa de Bronce' },
];
const INSTANCIAS_PLAYOFF = [
  { value:'cuartos',        label:'Cuartos de Final' },
  { value:'semifinal',      label:'Semifinal'        },
  { value:'final',          label:'Final'            },
  { value:'tercer_puesto',  label:'Tercer Puesto'    },
];

// ── Historial de ediciones ────────────────────────────────────────────────
// El registro de qué cambió y quién lo hizo lo escribe un trigger en la base
// (ver add_partido_historial.sql) para cualquier UPDATE a un partido, sin
// importar desde qué botón del panel se hizo. Acá solo lo leemos y lo
// mostramos legible — traduciendo nombres de columna, ids de equipo/fecha y
// valores técnicos (estado, copa, instancia) a texto entendible.
const ESTADO_LABEL = { pendiente:'Pendiente', en_juego:'En juego', finalizado:'Finalizado' };
const CAMPO_LABEL = {
  equipo_local_id:'Equipo local', equipo_visit_id:'Equipo visitante', fecha_id:'Fecha asignada',
  estado:'Estado', lugar:'Lugar', hora_inicio:'Hora', fecha_partido:'Día del partido',
  puntos_local:'Puntos local', puntos_visit:'Puntos visitante',
  q1_local:'Q1 local', q2_local:'Q2 local', q3_local:'Q3 local', q4_local:'Q4 local', ot_local:'OT local',
  q1_visit:'Q1 visitante', q2_visit:'Q2 visitante', q3_visit:'Q3 visitante', q4_visit:'Q4 visitante', ot_visit:'OT visitante',
  es_playoff:'¿Es playoff?', copa:'Copa', instancia:'Instancia', llave:'Llave',
};
function labelCampo(campo) { return CAMPO_LABEL[campo] ?? campo; }
function formatValorCampo(campo, val, { equipos, fechas }) {
  if (val === null || val === undefined || val === '') return '—';
  if (campo === 'equipo_local_id' || campo === 'equipo_visit_id') return equipos.find(e => e.id === val)?.nombre ?? val;
  if (campo === 'fecha_id') { const f = fechas.find(f => f.id === Number(val)); return f ? (f.descripcion ?? `Fecha ${f.numero}`) : `#${val}`; }
  if (campo === 'estado') return ESTADO_LABEL[val] ?? val;
  if (campo === 'copa') return COPAS_PLAYOFF.find(c => c.value === val)?.label ?? val;
  if (campo === 'instancia') return INSTANCIAS_PLAYOFF.find(i => i.value === val)?.label ?? val;
  if (campo === 'es_playoff') return val === true || val === 'true' ? 'Sí' : 'No';
  return String(val);
}
function formatFechaHora(iso) {
  try {
    return new Date(iso).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  } catch { return iso; }
}

function HistorialPanel({ loading, rows, equipos, fechas }) {
  if (loading) return <div style={{ padding:'10px 14px', color:'#6B7A99', fontSize:12.5 }}>Cargando historial...</div>;
  if (!rows || rows.length === 0) {
    return <div style={{ padding:'10px 14px', color:'#4A566E', fontSize:12.5 }}>Todavía no hay ediciones registradas para este partido.</div>;
  }
  return (
    <div style={{
      marginTop:6, padding:'10px 14px', borderRadius:10, background:'#080C12',
      border:'1px solid #1C2535', display:'flex', flexDirection:'column', gap:10,
    }}>
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:'#4A566E' }}>🕘 HISTORIAL DE EDICIONES</div>
      {rows.map(r => (
        <div key={r.id} style={{ borderLeft:'2px solid rgba(240,180,41,.3)', paddingLeft:10 }}>
          <div style={{ fontSize:12, color:'#CBD5E8', marginBottom:3 }}>
            <strong style={{ color:'#F0B429' }}>{r.editor_email ?? 'Alguien'}</strong>
            <span style={{ color:'#4A566E' }}> · {formatFechaHora(r.editado_en)}</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {Object.entries(r.cambios ?? {}).map(([campo, { antes, despues }]) => (
              <div key={campo} style={{ fontSize:12, color:'#8899BB' }}>
                <span style={{ color:'#6B7A99' }}>{labelCampo(campo)}:</span>{' '}
                {formatValorCampo(campo, antes, { equipos, fechas })}
                {' → '}
                <span style={{ color:'#EEF2F8' }}>{formatValorCampo(campo, despues, { equipos, fechas })}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Bloque reutilizable de "¿Es Playoff?" + Copa/Instancia/Llave — se usa tanto
// en el alta/edición individual (PartidoForm) como en cada fila del fixture
// masivo (FixtureMasivo). `values`/`onChange` son genéricos para servir a
// los dos casos sin duplicar el JSX.
// `crucesExistentes` (opcional, solo lo manda PartidoForm por ahora) es la
// lista de otros partidos YA cargados con la misma Copa+Instancia — sin esto
// era muy fácil cargar dos semifinales de la misma copa con la misma Llave
// (o alguna sin Llave) sin darse cuenta: las dos quedan "de pie" en el cuadro
// público, pero el cuadro solo puede mostrar UNA por número de llave, así que
// la otra desaparece silenciosamente y encima la Final nunca se completa
// (le falta el segundo ganador). Mostrar acá qué llaves ya están ocupadas —
// y avisar si la que estás por guardar choca con una — corta el problema
// antes de publicar, en vez de tener que diagnosticarlo después con el
// cuadro ya mal armado.
function PlayoffFields({ values, onChange, compact=false, equipos=[], crucesExistentes=[] }) {
  const nombreEq = id => equipos.find(e => e.id === id)?.nombre ?? id;
  const llaveActual = values.llave ? Number(values.llave) : null;
  const choca = llaveActual != null && crucesExistentes.some(c => Number(c.llave) === llaveActual);
  return (
    <div style={{
      background: values.es_playoff ? 'rgba(240,180,41,.06)' : 'transparent',
      border: values.es_playoff ? '1px solid rgba(240,180,41,.25)' : '1px solid transparent',
      borderRadius: 8, padding: values.es_playoff ? '10px 12px' : '0', transition: 'all .15s',
    }}>
      <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color: values.es_playoff ? '#F0B429' : '#8899BB', cursor:'pointer', fontWeight: values.es_playoff ? 700 : 400 }}>
        <input type="checkbox" checked={!!values.es_playoff}
          onChange={e => onChange({ ...values, es_playoff: e.target.checked, copa: e.target.checked ? values.copa : '', instancia: e.target.checked ? values.instancia : '', llave: e.target.checked ? values.llave : '' })}/>
        🏆 ¿Es Playoff?
      </label>
      {values.es_playoff && (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
          <select value={values.copa} onChange={e => onChange({ ...values, copa:e.target.value })}
            style={{ ...F.input, flex: compact?'0 0 150px':1, minWidth:130 }}>
            <option value="">Copa —</option>
            {COPAS_PLAYOFF.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={values.instancia} onChange={e => onChange({ ...values, instancia:e.target.value })}
            style={{ ...F.input, flex: compact?'0 0 170px':1, minWidth:150 }}>
            <option value="">Instancia —</option>
            {INSTANCIAS_PLAYOFF.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
          <input type="number" min="1" placeholder="Llave (1, 2...)" value={values.llave}
            onChange={e => onChange({ ...values, llave:e.target.value })}
            title="Posición del cruce dentro de esa copa+instancia — ej: Cuartos tiene 4 cruces (llave 1 a 4), Semifinal tiene 2 (llave 1 y 2), Final y Tercer Puesto tienen 1."
            style={{ ...F.input, flex: compact?'0 0 130px':1, minWidth:110, borderColor: choca ? '#F04060' : undefined }}/>
        </div>
      )}
      {values.es_playoff && values.copa && values.instancia && crucesExistentes.length > 0 && (
        <div style={{ marginTop:8, fontSize:11.5, lineHeight:1.6 }}>
          <div style={{ color:'#8899BB' }}>Ya cargados con esta Copa + Instancia:</div>
          {crucesExistentes.map(c => (
            <div key={c.id} style={{ color: Number(c.llave) === llaveActual ? '#F04060' : '#6B7A99' }}>
              Llave {c.llave ?? '—'}: {nombreEq(c.equipo_local_id)} vs {nombreEq(c.equipo_visit_id)}
            </div>
          ))}
          {choca && (
            <div style={{ color:'#F04060', fontWeight:700, marginTop:2 }}>
              ⚠️ Ya hay otro cruce con la Llave {llaveActual} — usá un número distinto o el cuadro público no va a poder mostrar los dos (y la ronda siguiente se va a quedar esperando para siempre).
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LogoEq({ id, equipos, size=28 }) {
  const eq = equipos.find(e => e.id === id);
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
function PartidoForm({ form, setForm, fechas, equipos, onSave, onCancel, loading, editId, crearEncuesta, setCrearEncuesta, crucesExistentes=[] }) {
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
            {equipos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', alignItems:'flex-end', paddingBottom:10, color:'#4A566E', fontFamily:"'Bebas Neue',sans-serif", fontSize:20 }}>VS</div>
        <div style={F.group}>
          <label style={F.label}>EQUIPO VISITANTE</label>
          <select value={form.equipo_visit_id}
            onChange={e => setForm(f => ({...f, equipo_visit_id:e.target.value}))}
            style={F.input}>
            <option value="">— Seleccionar —</option>
            {equipos.filter(e => e.id !== form.equipo_local_id).map(e => (
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
                { label:'Local',    prefix:'local',  color: equipos.find(e=>e.id===form.equipo_local_id)?.color??'#EEF2F8', total:totalLocal },
                { label:'Visitante',prefix:'visit',  color: equipos.find(e=>e.id===form.equipo_visit_id)?.color??'#EEF2F8', total:totalVisit },
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
          <label style={F.label}>HORA DEL PARTIDO</label>
          <input type="time" value={form.hora_inicio ?? ''}
            onChange={e => setForm(f => ({...f, hora_inicio:e.target.value}))}
            style={F.input}/>
        </div>
        <div style={F.group}>
          <label style={F.label}>LUGAR (opcional)</label>
          {inp('lugar', 'Club, cancha...')}
        </div>
        <div style={F.group}>
          <label style={F.label}>FECHA DE ESTE PARTIDO (opcional)</label>
          <input type="date" value={form.fecha_partido ?? ''}
            onChange={e => setForm(f => ({...f, fecha_partido:e.target.value}))}
            style={F.input}/>
        </div>
      </div>
      {/* Solo hace falta completar esto si la jornada se juega en mas de un
          dia (ej: algunos partidos el sabado, otros el domingo) — si no, con
          la fecha de la jornada alcanza y este campo se puede dejar vacio. */}

      {/* Playoffs — si se tilda, este partido NO cuenta para la tabla de
          posiciones (solo temporada regular) y aparece en el cuadro de
          playoffs y en el chip "Playoffs" de Resultados en vez de mezclarse
          con la fecha regular. */}
      <div style={{ marginBottom:16 }}>
        <PlayoffFields values={form} onChange={setForm} equipos={equipos} crucesExistentes={crucesExistentes}/>
      </div>

      {/* Sugerir encuesta */}
      {!editId && form.estado !== 'finalizado' && (
        <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, fontSize:13, color:'#8899BB', cursor:'pointer' }}>
          <input type="checkbox" checked={crearEncuesta} onChange={e => setCrearEncuesta(e.target.checked)} />
          🗳️ Crear encuesta "¿Quién gana?" automáticamente para este partido
        </label>
      )}

      {/* Resumen antes de guardar — mismo criterio que en la carga de Excel:
          de un vistazo, sin releer todo el formulario, que quede clarísimo
          qué se está por guardar y si cuenta como Temporada Regular o
          Playoffs (el toggle de arriba se puede perder de vista en un
          formulario largo). */}
      {(form.equipo_local_id || form.equipo_visit_id) && (
        <div style={{
          background: form.es_playoff ? 'linear-gradient(160deg,rgba(240,180,41,.10),#0B111C)' : 'linear-gradient(160deg,#101826,#0B111C)',
          border: form.es_playoff ? '1px solid rgba(240,180,41,.35)' : '1px solid #1C2535',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
        }}>
          <div style={{ color:'#6B7A99', fontSize:10, textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>
            Vas a guardar
          </div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:.5, color:'#EEF2F8', marginBottom:8 }}>
            {equipos.find(e => e.id === form.equipo_local_id)?.nombre ?? '— Local —'}
            {' '}<span style={{ color:'#4A566E', fontSize:14 }}>vs</span>{' '}
            {equipos.find(e => e.id === form.equipo_visit_id)?.nombre ?? '— Visitante —'}
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            <span style={{ fontSize:12, color:'#8899BB' }}>
              {fechas.find(f => String(f.id) === String(form.fecha_id))?.descripcion
                ?? (form.fecha_id ? `Fecha #${form.fecha_id}` : 'Sin fecha asignada')}
            </span>
            {form.es_playoff ? (
              <span style={{
                display:'inline-flex', alignItems:'center', gap:6,
                background:'rgba(240,180,41,.15)', border:'1px solid rgba(240,180,41,.4)',
                color:'#F0B429', fontWeight:700, fontSize:12, borderRadius:20, padding:'3px 10px',
              }}>
                🏆 PLAYOFFS
                {form.copa && ` · ${COPAS_PLAYOFF.find(c=>c.value===form.copa)?.label ?? form.copa}`}
                {form.instancia && ` · ${INSTANCIAS_PLAYOFF.find(i=>i.value===form.instancia)?.label ?? form.instancia}`}
                {form.llave && ` (Llave ${form.llave})`}
              </span>
            ) : (
              <span style={{
                display:'inline-flex', alignItems:'center', gap:6,
                background:'rgba(96,165,250,.12)', border:'1px solid rgba(96,165,250,.3)',
                color:'#60A5FA', fontWeight:600, fontSize:12, borderRadius:20, padding:'3px 10px',
              }}>
                📅 Temporada Regular
              </span>
            )}
            <span style={{
              fontSize:11, fontWeight:700, letterSpacing:.5, textTransform:'uppercase',
              color: form.estado === 'finalizado' ? '#22D07A' : form.estado === 'en_juego' ? '#F0B429' : '#8899BB',
            }}>
              {form.estado === 'finalizado' ? '✓ Finalizado' : form.estado === 'en_juego' ? '● En juego' : '○ Pendiente'}
            </span>
          </div>
          {form.es_playoff && (!form.copa || !form.instancia) && (
            <div style={{ marginTop:8, color:'#F04060', fontSize:11, fontWeight:600 }}>
              ⚠️ Falta elegir {!form.copa && 'la Copa'}{!form.copa && !form.instancia && ' y '}{!form.instancia && 'la Instancia'} arriba en "¿Es Playoff?".
            </div>
          )}
        </div>
      )}

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
function FixtureMasivo({ fechas, equipos, tablas, categoria, temporadaActivaId, onCrearFecha, onClose }) {
  const [jornada,      setJornada]      = useState('');
  const [descripcion,  setDescripcion]  = useState('');
  const [fechaDia,     setFechaDia]     = useState('');
  const [partidos,     setPartidos]     = useState([
    { equipo_local_id:'', equipo_visit_id:'', hora_inicio:'', lugar:'', fecha_partido:'', es_playoff:false, copa:'', instancia:'', llave:'' },
  ]);
  const [loading, setLoading] = useState(false);
  const [msg,     setMsg]     = useState(null);
  const [crearEncuestas, setCrearEncuestas] = useState(true);
  const { confirm: confirmDup, ConfirmDialog: ConfirmDialogFixture } = useConfirm();

  const addPartido = () => setPartidos(p => [...p, { equipo_local_id:'', equipo_visit_id:'', hora_inicio:'', lugar:'', fecha_partido:'', es_playoff:false, copa:'', instancia:'', llave:'' }]);
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
      // 1. Crear/obtener fecha — buscando SOLO dentro de la temporada activa
      // (el número de fecha se reinicia en cada temporada, así que "Fecha 1"
      // de este año y "Fecha 1" de un torneo anterior son filas distintas).
      // Si ya existe (ej: se esta cargando un segundo lote de partidos de la
      // misma jornada, en otro dia) no se pisa su descripcion/fecha_dia con
      // un upsert — antes eso se sobreescribía siempre, y una fecha ya
      // renombrada a mano (ej. "SEMIFINALES") volvía a "Fecha 10" sola con
      // la próxima carga del mismo número.
      const { data: fechaExistente, error: fExErr } = await supabase
        .from(tablas.fechas)
        .select('id')
        .eq('numero', Number(jornada))
        .eq('temporada_id', temporadaActivaId)
        .maybeSingle();
      if (fExErr) throw fExErr;

      let fd;
      if (fechaExistente) {
        fd = fechaExistente;
      } else {
        const fechaPayload = {
          numero:        Number(jornada),
          descripcion:   descripcion || `Fecha ${jornada}`,
          temporada_id:  temporadaActivaId,
        };
        if (fechaDia) fechaPayload.fecha_dia = fechaDia;
        const { data: fdNueva, error: fErr } = await supabase
          .from(tablas.fechas)
          .insert(fechaPayload)
          .select('id').single();
        if (fErr) throw fErr;
        fd = fdNueva;
      }

      // Verificar duplicados antes de insertar
      const { data: existentes, error: exErr } = await supabase
        .from(tablas.partidos)
        .select('equipo_local_id, equipo_visit_id')
        .eq('fecha_id', fd.id);
      if (exErr) throw exErr;

      const yaExiste = (a, b) => (existentes ?? []).some(e =>
        (e.equipo_local_id === a && e.equipo_visit_id === b) ||
        (e.equipo_local_id === b && e.equipo_visit_id === a)
      );
      const nombreEqLocal = id => equipos.find(eq => eq.id === id)?.nombre ?? id;
      const duplicados = validos.filter(p => yaExiste(p.equipo_local_id, p.equipo_visit_id));
      if (duplicados.length > 0) {
        const nombres = duplicados.map(p => `${nombreEqLocal(p.equipo_local_id)} vs ${nombreEqLocal(p.equipo_visit_id)}`).join(', ');
        const confirmar = await confirmDup(`Ya existen partidos cargados para: ${nombres}. Continuar y agregarlos de nuevo?`);
        if (!confirmar) { setLoading(false); return; }
      }
      // 2. Insertar partidos
      const rows = validos.map(p => ({
        fecha_id:        fd.id,
        equipo_local_id: p.equipo_local_id,
        equipo_visit_id: p.equipo_visit_id,
        lugar:           p.lugar || null,
        hora_inicio:     p.hora_inicio || null,
        fecha_partido:   p.fecha_partido || null,
        estado:          'pendiente',
        es_playoff:      !!p.es_playoff,
        copa:            p.es_playoff ? (p.copa || null) : null,
        instancia:       p.es_playoff ? (p.instancia || null) : null,
        llave:           p.es_playoff && p.llave ? Number(p.llave) : null,
      }));
      const { data: inserted, error:pErr } = await supabase
        .from(tablas.partidos).insert(rows)
        .select('id, equipo_local_id, equipo_visit_id');
      if (pErr) throw pErr;

      // 3. Sugerir encuesta "¿Quién gana?" por cada partido nuevo (opcional)
      let encuestasOk = 0, encuestasErr = 0;
      if (crearEncuestas) {
        for (const p of inserted ?? []) {
          const eqL = equipos.find(e => e.id === p.equipo_local_id);
          const eqV = equipos.find(e => e.id === p.equipo_visit_id);
          try {
            await sugerirEncuestaQuienGana({
              categoria, partidoId: p.id, equipoLocal: eqL, equipoVisit: eqV,
              subtitulo: descripcion || `Fecha ${jornada}`,
            });
            encuestasOk++;
          } catch (e) {
            console.warn('No se pudo crear la encuesta sugerida:', e.message);
            encuestasErr++;
          }
        }
      }

      const sufijoEncuestas = crearEncuestas
        ? (encuestasErr === 0 ? ` · 🗳️ ${encuestasOk} encuesta(s) creada(s)` : ` · 🗳️ ${encuestasOk} encuesta(s) OK, ${encuestasErr} fallaron`)
        : '';
      setMsg({ ok:true, text:`✅ Fecha ${jornada} creada con ${validos.length} partido(s)${sufijoEncuestas}` });
      onCrearFecha?.();
      setTimeout(onClose, 1800);
    } catch(err) {
      setMsg({ ok:false, text:`❌ ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background:'linear-gradient(160deg,#101826,#0B111C)', border:'1px solid rgba(240,180,41,.25)', borderRadius:14, padding:'1.5rem', marginBottom:20 }}>
      {ConfirmDialogFixture}
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
          <label style={F.label}>FECHA CALENDARIO</label>
          <input type="date" value={fechaDia}
            onChange={e=>setFechaDia(e.target.value)} style={F.input}/>
        </div>
        <div style={{ flex:1, minWidth:200 }}>
          <label style={F.label}>DESCRIPCIÓN (opcional)</label>
          <input type="text" placeholder="Ej: Playoffs - Semifinal" value={descripcion}
            onChange={e=>setDescripcion(e.target.value)} style={F.input}/>
          <div style={{ fontSize:11, color:'#6B7A99', marginTop:4 }}>
            Lo que escribas acá se muestra tal cual en el sitio en vez de "Fecha {jornada || 'N'}" (ej: "Playoffs - Semifinal", "SEMIFINALES", "Copa de Oro").
          </div>
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
                  style={{ ...F.input, borderColor: p.equipo_local_id ? equipos.find(eq=>eq.id===p.equipo_local_id)?.color+'40' : '#1C2535' }}>
                  <option value="">Local —</option>
                  {equipos.filter(eq => !usedLocal.includes(eq.id) || eq.id===p.equipo_local_id).map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.nombre}</option>
                  ))}
                </select>
              </div>
              <div style={{ color:'#4A566E', fontFamily:"'Bebas Neue',sans-serif", fontSize:16, flexShrink:0 }}>VS</div>
              <div style={{ flex:1, minWidth:160 }}>
                <select value={p.equipo_visit_id}
                  onChange={e => updatePartido(i,'equipo_visit_id',e.target.value)}
                  style={{ ...F.input, borderColor: p.equipo_visit_id ? equipos.find(eq=>eq.id===p.equipo_visit_id)?.color+'40' : '#1C2535' }}>
                  <option value="">Visitante —</option>
                  {equipos.filter(eq => eq.id !== p.equipo_local_id && (!usedVisit.includes(eq.id) || eq.id===p.equipo_visit_id)).map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.nombre}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex:'0 0 110px', minWidth:100 }}>
                <input type="time"
                  value={p.hora_inicio ?? ''}
                  onChange={e => updatePartido(i,'hora_inicio',e.target.value)}
                  style={{ ...F.input, fontFamily:"'Barlow Condensed',sans-serif", fontSize:16 }}
                  title="Hora del partido"/>
              </div>
              <div style={{ flex:'0 0 180px', minWidth:140 }}>
                <input type="text" placeholder="Lugar (opcional)"
                  value={p.lugar ?? ''}
                  onChange={e => updatePartido(i,'lugar',e.target.value)}
                  style={F.input}/>
              </div>
              <div style={{ flex:'0 0 150px', minWidth:130 }}>
                <input type="date"
                  value={p.fecha_partido ?? ''}
                  onChange={e => updatePartido(i,'fecha_partido',e.target.value)}
                  style={F.input}
                  title="Solo si este partido se juega otro día que el resto de la fecha"/>
              </div>
            </div>
            {/* Playoffs por partido — una misma fecha puede juntar cruces de
                más de una copa el mismo fin de semana, así que esto se marca
                fila por fila y no una sola vez para todo el fixture. */}
            <div style={{ marginTop:8 }}>
              <PlayoffFields compact values={p} onChange={vals => setPartidos(prev => prev.map((r,j) => j===i?vals:r))}/>
            </div>
          </div>
        ))}
      </div>
      <p style={{ color:'#4A566E', fontSize:11, margin:'-8px 0 16px' }}>
        La fecha calendario de arriba aplica a toda la jornada. Si algún partido puntual se juega otro día (ej: la jornada arranca el sábado y termina el domingo), completale su propia fecha en el campo de la derecha de esa fila.
      </p>

      {/* Agregar partido */}
      {partidos.length < 10 && (
        <button onClick={addPartido} style={{ ...F.btnSec, marginBottom:16, display:'flex', alignItems:'center', gap:6 }}>
          ➕ Agregar partido
        </button>
      )}

      <label style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, fontSize:13, color:'#8899BB', cursor:'pointer' }}>
        <input type="checkbox" checked={crearEncuestas} onChange={e => setCrearEncuestas(e.target.checked)} />
        🗳️ Crear encuesta "¿Quién gana?" automáticamente para cada partido de esta fecha
      </label>

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
export default function PartidosManager({ categoria: categoriaProp, setCategoria: setCategoriaProp, foco } = {}) {
  const [categoriaLocal, setCategoriaLocal] = useState('femenino');
  const categoria    = categoriaProp ?? categoriaLocal;
  const setCategoria = setCategoriaProp ?? setCategoriaLocal;
  const tablas = TABLAS[categoria];
  const EQUIPOS = useMemo(() =>
    ROSTER[categoria].map(e => ({ id: e.id, nombre: e.name ?? e.nombre, color: e.color, logo: e.logo })),
    [categoria]);
  // Toda fecha que se crea desde el panel cae en la temporada ACTIVA — no en
  // la que se esté mirando en el sitio público, que puede ser una vieja — y
  // en la de la categoría que está elegida acá (femenino y masculino tienen
  // cada una la suya, ver TemporadaContext).
  const { temporadaActivaId: temporadaActivaIdPorCategoria } = useTemporada();
  const temporadaActivaId = temporadaActivaIdPorCategoria[categoria];

  const [partidos, setPartidos] = useState([]);
  const [fechas,   setFechas]   = useState([]);
  const [form,     setForm]     = useState(EMPTY_PARTIDO);
  const [editId,   setEditId]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [msg,      setMsg]      = useState(null);
  const [view,     setView]     = useState('lista');   // 'lista' | 'nuevo' | 'fixture'
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroEstado,setFiltroEstado]= useState('');
  const [crearEncuesta, setCrearEncuesta] = useState(true);

  // Otros partidos ya cargados con la misma Copa+Instancia que se está
  // completando en el formulario — se lo pasa a PlayoffFields para que
  // avise si la Llave elegida ya está en uso (ver comentario ahí).
  const crucesExistentesForm = useMemo(() => {
    if (!form.es_playoff || !form.copa || !form.instancia) return [];
    return partidos.filter(p =>
      p.es_playoff && p.copa === form.copa && p.instancia === form.instancia && p.id !== editId);
  }, [partidos, form.es_playoff, form.copa, form.instancia, editId]);
  const { confirm, ConfirmDialog } = useConfirm();
  // Edición de una fecha existente (número/descripción/día) — antes no había
  // forma de corregir el día de un fixture ya cargado si se aplazaba o
  // cambiaba de fecha; solo se podía fijar al crearlo la primera vez.
  const [editandoFechaId, setEditandoFechaId] = useState(null);
  const [fechaEditForm, setFechaEditForm] = useState({ numero:'', descripcion:'', fecha_dia:'' });
  // Mismo aviso que ya tiene UploadHistory.jsx tras borrar una carga — acá
  // faltaba: borrar un partido desde esta pantalla deja los promedios
  // agregados desactualizados hasta que alguien se acuerde de ir a
  // "Recalcular Stats", y antes no había ningún recordatorio de eso.
  const [justDeleted, setJustDeleted] = useState(false);
  // Historial de ediciones por partido — se carga bajo demanda (recién al
  // abrirlo la primera vez) para no pegarle una consulta extra a la base por
  // cada partido de la lista si nadie mira el historial.
  const [historialAbierto, setHistorialAbierto] = useState({});   // { [partidoId]: bool }
  const [historialData,    setHistorialData]    = useState({});   // { [partidoId]: rows[] }
  const [historialLoading, setHistorialLoading] = useState({});   // { [partidoId]: bool }

  const toggleHistorial = async (partidoId) => {
    const yaAbierto = !!historialAbierto[partidoId];
    setHistorialAbierto(prev => ({ ...prev, [partidoId]: !yaAbierto }));
    if (yaAbierto || historialData[partidoId]) return; // ya lo tenemos, no re-consultar
    setHistorialLoading(prev => ({ ...prev, [partidoId]: true }));
    const { data, error } = await supabase
      .from(tablas.historial).select('*')
      .eq('partido_id', partidoId).order('editado_en', { ascending:false });
    if (error) { flash(`Error cargando historial: ${error.message}`, false); }
    setHistorialData(prev => ({ ...prev, [partidoId]: data ?? [] }));
    setHistorialLoading(prev => ({ ...prev, [partidoId]: false }));
  };

  const abrirEditFecha = (fecha) => {
    setEditandoFechaId(fecha.id);
    setFechaEditForm({
      numero: fecha.numero ?? '',
      descripcion: fecha.descripcion ?? '',
      fecha_dia: fecha.fecha_dia ?? '',
    });
  };

  const guardarFecha = async () => {
    if (!fechaEditForm.numero) { flash('Ingresá el número de fecha', false); return; }
    const { error } = await supabase.from(tablas.fechas).update({
      numero: Number(fechaEditForm.numero),
      descripcion: fechaEditForm.descripcion || null,
      fecha_dia: fechaEditForm.fecha_dia || null,
    }).eq('id', editandoFechaId);
    if (error) { flash(`Error actualizando fecha: ${error.message}`, false); return; }
    setEditandoFechaId(null);
    flash('✅ Fecha actualizada');
    loadAll();
  };

  useEffect(() => {
    setForm(EMPTY_PARTIDO); setEditId(null); setView('lista');
    setFiltroFecha(''); setFiltroEstado('');
    loadAll();
  }, [categoria, temporadaActivaId]);

  // Llegada desde el buscador rápido del panel ("che, ¿la Fecha 8?") — filtra
  // la lista a esa fecha apenas se resuelve la navegación. `foco.ts` cambia
  // en cada búsqueda nueva, incluso si es la misma fecha de vuelta, para que
  // este efecto dispare siempre.
  useEffect(() => {
    if (!foco?.fechaId) return;
    setView('lista');
    setFiltroFecha(String(foco.fechaId));
  }, [foco?.ts]);

  // Antes esto traía TODAS las fechas/partidos de siempre, sin filtrar por
  // temporada — apenas hay más de una temporada, esta lista mezclaba fechas
  // de años distintos con el mismo número (ej. dos "Fecha 1"). Ahora se
  // scopea a la temporada ACTIVA, igual que el resto del panel. Los partidos
  // sin fecha asignada (el form individual permite guardarlos así) se traen
  // siempre aparte, porque al no tener fecha no hay forma de saber a qué
  // temporada "pertenecen" — se muestran como pendientes de asignar.
  const loadAll = async () => {
    if (!temporadaActivaId) { setPartidos([]); setFechas([]); return; }
    const { data: fs, error: fsErr } = await supabase
      .from(tablas.fechas).select('*').eq('temporada_id', temporadaActivaId).order('numero', { ascending:true });
    if (fsErr) { flash(`❌ No se pudieron traer las fechas: ${fsErr.message}`, false); return; }
    const fechaIds = (fs ?? []).map(f => f.id);
    const [{ data: psConFecha, error: pErr1 }, { data: psSinFecha, error: pErr2 }] = await Promise.all([
      fechaIds.length ? supabase.from(tablas.partidos).select('*').in('fecha_id', fechaIds) : Promise.resolve({ data: [] }),
      supabase.from(tablas.partidos).select('*').is('fecha_id', null),
    ]);
    if (pErr1 || pErr2) { flash(`❌ No se pudieron traer los partidos: ${(pErr1 ?? pErr2).message}`, false); return; }
    const ps = [...(psConFecha ?? []), ...(psSinFecha ?? [])].sort((a, b) => (a.fecha_id ?? Infinity) - (b.fecha_id ?? Infinity));
    setPartidos(ps);
    setFechas(fs ?? []);
  };

  const flash = (text, ok=true) => { setMsg({text,ok}); setTimeout(()=>setMsg(null),3000); };

  const handleSave = async () => {
    if (!form.equipo_local_id || !form.equipo_visit_id) { flash('Seleccioná ambos equipos',false); return; }
    if (form.equipo_local_id === form.equipo_visit_id)   { flash('Los equipos no pueden ser iguales',false); return; }

    // El básquet no admite empates — si se carga un partido "finalizado" con
    // el mismo puntaje de los dos lados (típico error de tipeo), el código
    // que calcula ganador/perdedor le da la victoria al visitante sin
    // avisar nada. Se corta acá antes de guardar.
    if (form.estado === 'finalizado') {
      const totalLocal = Number(form.q1_local||0)+Number(form.q2_local||0)+Number(form.q3_local||0)+Number(form.q4_local||0)+Number(form.ot_local||0);
      const totalVisit = Number(form.q1_visit||0)+Number(form.q2_visit||0)+Number(form.q3_visit||0)+Number(form.q4_visit||0)+Number(form.ot_visit||0);
      if (totalLocal === totalVisit) {
        flash('El marcador está empatado — revisá los puntos, un partido finalizado no puede quedar en empate', false);
        return;
      }
    }

    if (!editId && form.fecha_id) {
      const { data: dupes, error: dupErr } = await supabase
        .from(tablas.partidos)
        .select('id')
        .eq('fecha_id', form.fecha_id)
        .or(`and(equipo_local_id.eq.${form.equipo_local_id},equipo_visit_id.eq.${form.equipo_visit_id}),and(equipo_local_id.eq.${form.equipo_visit_id},equipo_visit_id.eq.${form.equipo_local_id})`);
      if (dupErr) { flash(`Error verificando duplicados: ${dupErr.message}`, false); return; }
      if (dupes?.length > 0) {
        const confirmar = await confirm('Ya existe un partido entre estos equipos en esta fecha. Agregar de todas formas?');
        if (!confirmar) return;
      }
    }
    setLoading(true);
    try {
      const payload = {
        equipo_local_id: form.equipo_local_id,
        equipo_visit_id: form.equipo_visit_id,
        fecha_id:        form.fecha_id || null,
        lugar:           form.lugar    || null,
        hora_inicio:     form.hora_inicio || null,
        fecha_partido:   form.fecha_partido || null,
        estado:          form.estado,
        q1_local: Number(form.q1_local||0), q2_local: Number(form.q2_local||0),
        q3_local: Number(form.q3_local||0), q4_local: Number(form.q4_local||0), ot_local: Number(form.ot_local||0),
        q1_visit: Number(form.q1_visit||0), q2_visit: Number(form.q2_visit||0),
        q3_visit: Number(form.q3_visit||0), q4_visit: Number(form.q4_visit||0), ot_visit: Number(form.ot_visit||0),
        es_playoff: !!form.es_playoff,
        copa:       form.es_playoff ? (form.copa || null) : null,
        instancia:  form.es_playoff ? (form.instancia || null) : null,
        llave:      form.es_playoff && form.llave ? Number(form.llave) : null,
      };
      if (editId) {
        const { error } = await supabase.from(tablas.partidos).update(payload).eq('id',editId);
        if (error) throw error;
        flash('✅ Partido actualizado');
      } else {
        const { data: nuevo, error } = await supabase.from(tablas.partidos).insert(payload).select('id').single();
        if (error) throw error;

        let sufijo = '';
        if (crearEncuesta && payload.estado !== 'finalizado') {
          const eqL = EQUIPOS.find(e => e.id === payload.equipo_local_id);
          const eqV = EQUIPOS.find(e => e.id === payload.equipo_visit_id);
          const fecha = fechas.find(f => f.id === Number(payload.fecha_id));
          try {
            await sugerirEncuestaQuienGana({
              categoria, partidoId: nuevo.id, equipoLocal: eqL, equipoVisit: eqV,
              subtitulo: fecha ? (fecha.descripcion ?? `Fecha ${fecha.numero}`) : null,
            });
            sufijo = ' · 🗳️ encuesta creada';
          } catch (e) {
            console.warn('No se pudo crear la encuesta sugerida:', e.message);
          }
        }
        flash(`✅ Partido agregado${sufijo}`);
      }
      setForm(EMPTY_PARTIDO); setEditId(null); setView('lista');
      await loadAll();
    } catch(err) { flash(`❌ ${err.message}`,false); }
    finally { setLoading(false); }
  };

  const handleEdit = (p) => {
    setForm({
      equipo_local_id: p.equipo_local_id??'', equipo_visit_id: p.equipo_visit_id??'',
      fecha_id: p.fecha_id??'', hora_inicio: p.hora_inicio??'', lugar: p.lugar??'', estado: p.estado??'pendiente',
      fecha_partido: p.fecha_partido??'',
      q1_local:p.q1_local??'', q2_local:p.q2_local??'', q3_local:p.q3_local??'', q4_local:p.q4_local??'', ot_local:p.ot_local??'',
      q1_visit:p.q1_visit??'', q2_visit:p.q2_visit??'', q3_visit:p.q3_visit??'', q4_visit:p.q4_visit??'', ot_visit:p.ot_visit??'',
      es_playoff: !!p.es_playoff, copa: p.copa??'', instancia: p.instancia??'', llave: p.llave??'',
    });
    setEditId(p.id); setView('nuevo');
  };

  const handleDelete = async (id) => {
    if (!(await confirm('¿Eliminar este partido y todas sus estadísticas?'))) return;
    const { error: logErr } = await supabase.from(tablas.uploadLog).delete().eq('partido_id', id);
    if (logErr) { flash(`Error borrando log de carga: ${logErr.message}`, false); return; }
    const { error: statsErr } = await supabase.from(tablas.stats).delete().eq('partido_id', id);
    if (statsErr) { flash(`Error borrando stats: ${statsErr.message}`, false); return; }
    const { error } = await supabase.from(tablas.partidos).delete().eq('id',id);
    if (error) { flash(`Error: ${error.message}`, false); return; }
    setJustDeleted(true);
    await loadAll(); flash('✅ Eliminado');
  };

  const handleEstado = async (id, estado) => {
    const { error } = await supabase.from(tablas.partidos).update({ estado }).eq('id',id);
    if (error) { flash(`❌ No se pudo cambiar el estado: ${error.message}`, false); return; }
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
      {ConfirmDialog}

      {/* Msg flash */}
      {msg && (
        <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:16, fontSize:14,
          background:msg.ok?'rgba(34,208,122,.1)':'rgba(240,64,96,.1)',
          color:msg.ok?'#22D07A':'#F04060',
          border:`1px solid ${msg.ok?'rgba(34,208,122,.3)':'rgba(240,64,96,.3)'}` }}>
          {msg.text}
        </div>
      )}

      {justDeleted && (
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, padding:'10px 14px',
          borderRadius:8, background:'rgba(240,180,41,.08)', border:'1px solid rgba(240,180,41,.35)',
          color:'#F0B429', fontSize:13 }}>
          ⚠️ Borraste un partido — los promedios pueden haber quedado desactualizados.
          Andá a <b>Recalcular Stats</b> para dejarlos al día.
          <button onClick={() => setJustDeleted(false)} style={{ marginLeft:'auto', background:'transparent', border:'none', color:'#F0B429', cursor:'pointer', fontSize:14, flexShrink:0 }}>✕</button>
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
          equipos={EQUIPOS}
          tablas={tablas}
          categoria={categoria}
          temporadaActivaId={temporadaActivaId}
          onCrearFecha={loadAll}
          onClose={()=>setView('lista')}
        />
      )}

      {/* Formulario individual */}
      {view==='nuevo' && (
        <PartidoForm
          form={form} setForm={setForm}
          fechas={fechas}
          equipos={EQUIPOS}
          onSave={handleSave} onCancel={cancelForm}
          loading={loading} editId={editId}
          crearEncuesta={crearEncuesta} setCrearEncuesta={setCrearEncuesta}
          crucesExistentes={crucesExistentesForm}
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
                    {fecha?.fecha_dia && (
                      <div style={{ fontSize:12, color:'#6B7A99' }}>
                        📅 {new Date(fecha.fecha_dia + 'T00:00:00').toLocaleDateString('es-AR')}
                      </div>
                    )}
                    <div style={{ fontSize:11, color:'#4A566E' }}>{ps.length} partido(s)</div>
                    {fecha && (
                      <button onClick={() => abrirEditFecha(fecha)} title="Editar día/nombre de esta fecha"
                        style={{ marginLeft:'auto', background:'transparent', border:'1px solid #1C2535', borderRadius:6, padding:'4px 8px', cursor:'pointer', fontSize:13 }}>
                        ✏️
                      </button>
                    )}
                  </div>

                  {/* Editor inline de la fecha (número/nombre/día) */}
                  {fecha && editandoFechaId === fecha.id && (
                    <div style={{ background:'linear-gradient(160deg,#101826,#0B111C)', border:'1px solid rgba(240,180,41,.25)', borderRadius:10, padding:14, marginBottom:14, display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
                      <div style={{ minWidth:100 }}>
                        <label style={F.label}>NÚMERO</label>
                        <input type="number" value={fechaEditForm.numero} style={F.input}
                          onChange={e => setFechaEditForm(f => ({ ...f, numero:e.target.value }))}/>
                      </div>
                      <div style={{ flex:1, minWidth:160 }}>
                        <label style={F.label}>NOMBRE / DESCRIPCIÓN</label>
                        <input type="text" value={fechaEditForm.descripcion} style={F.input}
                          placeholder={`Fecha ${fechaEditForm.numero || ''}`}
                          onChange={e => setFechaEditForm(f => ({ ...f, descripcion:e.target.value }))}/>
                      </div>
                      <div style={{ minWidth:160 }}>
                        <label style={F.label}>DÍA</label>
                        <input type="date" value={fechaEditForm.fecha_dia} style={F.input}
                          onChange={e => setFechaEditForm(f => ({ ...f, fecha_dia:e.target.value }))}/>
                      </div>
                      <button onClick={guardarFecha} style={F.btnPrimary}>Guardar</button>
                      <button onClick={() => setEditandoFechaId(null)} style={F.btnSec}>Cancelar</button>
                    </div>
                  )}

                  {/* Partidos de esta fecha */}
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {ps.map(p => {
                      const cA = EQUIPOS.find(e=>e.id===p.equipo_local_id)?.color ?? '#4A566E';
                      const cB = EQUIPOS.find(e=>e.id===p.equipo_visit_id)?.color ?? '#4A566E';
                      return (
                      <div key={p.id}>
                      <div style={{
                        background:`linear-gradient(115deg, ${cA}22, #0E1420 45%, ${cB}22)`,
                        border:'1px solid #1C2535',
                        borderRadius:12, padding:'14px 16px',
                        display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
                      }}>
                        {/* Equipos + marcador */}
                        <div style={{ flex:1, minWidth:220 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                            <LogoEq id={p.equipo_local_id} equipos={EQUIPOS} size={24}/>
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
                            <LogoEq id={p.equipo_visit_id} equipos={EQUIPOS} size={24}/>
                          </div>
                          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                            <EstadoBadge estado={p.estado}/>
                            {p.es_playoff && (
                              <span style={{ fontSize:10, fontWeight:700, letterSpacing:1, padding:'2px 8px', borderRadius:4,
                                background:'rgba(240,180,41,.15)', color:'#F0B429', border:'1px solid rgba(240,180,41,.35)' }}>
                                🏆 PLAYOFFS{p.copa ? ` · ${COPAS_PLAYOFF.find(c=>c.value===p.copa)?.label ?? p.copa}` : ''}{p.instancia ? ` · ${INSTANCIAS_PLAYOFF.find(i=>i.value===p.instancia)?.label ?? p.instancia}` : ''}
                              </span>
                            )}
                            {p.fecha_partido && (
                              <span style={{ fontSize:11, color:'#4FA3FF', background:'rgba(79,163,255,.1)', border:'1px solid rgba(79,163,255,.25)', borderRadius:4, padding:'1px 6px' }}>
                                📅 {new Date(p.fecha_partido + 'T00:00:00').toLocaleDateString('es-AR')}
                              </span>
                            )}
                            {p.hora_inicio && <span style={{ fontSize:11, color:'#F0B429', fontFamily:"'Bebas Neue',sans-serif", fontSize:14 }}>🕐 {p.hora_inicio.slice(0,5)}</span>}
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
                        <div style={{ display:'flex', gap:6, flexShrink:0, flexWrap:'wrap', alignItems:'center' }}>
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
                          <button onClick={()=>handleEdit(p)} title="Editar partido"
                            style={{ ...F.iconBtn, borderColor:'#1C2535', color:'#6B7A99' }}>
                            ✏️
                          </button>
                          <button onClick={()=>toggleHistorial(p.id)} title="Ver historial de ediciones"
                            style={{ ...F.iconBtn, borderColor: historialAbierto[p.id] ? 'rgba(240,180,41,.4)' : '#1C2535', color: historialAbierto[p.id] ? '#F0B429' : '#6B7A99' }}>
                            🕘
                          </button>
                          <button onClick={()=>handleDelete(p.id)} title="Eliminar partido"
                            style={{ ...F.iconBtn, borderColor:'rgba(240,64,96,.3)', color:'#F04060' }}>
                            🗑️
                          </button>
                        </div>
                      </div>
                      {historialAbierto[p.id] && (
                        <HistorialPanel
                          loading={!!historialLoading[p.id]}
                          rows={historialData[p.id]}
                          equipos={EQUIPOS}
                          fechas={fechas}
                        />
                      )}
                      </div>
                      );
                    })}
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
  card:    { background:'linear-gradient(160deg,#101826,#0B111C)', border:'1px solid rgba(240,180,41,.2)', borderRadius:14, padding:'1.5rem', marginBottom:20 },
  row:     { display:'flex', gap:14, marginBottom:16, flexWrap:'wrap' },
  group:   { flex:1, minWidth:160, display:'flex', flexDirection:'column' },
  qth:     { padding:'8px 10px', color:'#6B7A99', fontSize:11, letterSpacing:.5, background:'#080C12', border:'1px solid #1C2535', textAlign:'center' },
  qtd:     { padding:'6px 8px', textAlign:'center', border:'1px solid #1C2535' },
  qInput:  { width:52, padding:'6px 4px', background:'#080C12', border:'1px solid', borderRadius:5, color:'#EEF2F8', fontSize:16, textAlign:'center', outline:'none', fontFamily:"'Bebas Neue',sans-serif" },
  btnPrimary:{ padding:'11px 20px', background:'linear-gradient(135deg,#F0B429,#FF6B2B)', border:'none', borderRadius:9, color:'#080C12', fontFamily:"'Bebas Neue',sans-serif", fontSize:17, letterSpacing:1, cursor:'pointer' },
  btnSec:    { padding:'10px 18px', background:'transparent', border:'1px solid #4A566E', borderRadius:9, color:'#6B7A99', cursor:'pointer', fontSize:13 },
  quickBtn:  { padding:'6px 10px', background:'transparent', border:'1px solid', borderRadius:7, cursor:'pointer', fontSize:13 },
  iconBtn:   { width:32, height:32, padding:0, background:'rgba(255,255,255,.04)', border:'1px solid', borderRadius:'50%', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
};
