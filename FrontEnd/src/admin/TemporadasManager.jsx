import { useState } from 'react';
import { useTemporada } from '../context/TemporadaContext';

// Panel de temporadas: ver todas las que existen (cuál es la activa) y
// arrancar una nueva. Crear una temporada nueva es un cambio grande — todo
// lo que se cargue de acá en adelante (fechas, partidos, estadísticas) va a
// caer en la temporada nueva, dejando la anterior tal cual quedó, visible
// pero congelada. Por eso pide confirmación explícita antes de crearla.
export default function TemporadasManager() {
  const { temporadas, temporadaActivaId, crearTemporada, loading, refetch } = useTemporada();
  const [creando,  setCreando]  = useState(false);
  const [nombre,   setNombre]   = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState(null);

  const flash = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 4000); };

  const iniciarCreacion = () => {
    setCreando(true);
    setConfirmando(false);
    setNombre('');
  };

  const handleCrear = async () => {
    if (!nombre.trim()) { flash('Ingresá un nombre para la temporada', false); return; }
    if (!confirmando) { setConfirmando(true); return; }
    setGuardando(true);
    try {
      await crearTemporada(nombre.trim());
      flash(`✅ "${nombre.trim()}" creada y activada`);
      setCreando(false);
      setConfirmando(false);
      setNombre('');
    } catch (err) {
      flash(`❌ ${err.message}`, false);
    } finally {
      setGuardando(false);
    }
  };

  const activa = temporadas.find(t => t.id === temporadaActivaId);

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:1, color:'#EEF2F8', margin:0 }}>
            🏆 TEMPORADAS
          </h2>
          <p style={{ color:'#6B7A99', fontSize:13, margin:'4px 0 0' }}>
            Cada temporada guarda sus propias fechas, partidos y estadísticas por separado — nada se mezcla entre una y otra.
          </p>
        </div>
        {!creando && (
          <button onClick={iniciarCreacion} style={{
            padding:'10px 18px', borderRadius:10, border:'none', cursor:'pointer',
            background:'linear-gradient(135deg,#F0B429,#FF6B2B)', color:'#080C12',
            fontFamily:"'Bebas Neue',sans-serif", fontSize:15, letterSpacing:1,
          }}>
            ➕ NUEVA TEMPORADA
          </button>
        )}
      </div>

      {msg && (
        <div style={{
          marginBottom:16, padding:'10px 14px', borderRadius:8, fontSize:13, fontWeight:600,
          background: msg.ok ? 'rgba(34,208,122,.1)' : 'rgba(240,64,96,.1)',
          color: msg.ok ? '#22D07A' : '#F04060',
          border: `1px solid ${msg.ok ? 'rgba(34,208,122,.3)' : 'rgba(240,64,96,.3)'}`,
        }}>
          {msg.text}
        </div>
      )}

      {creando && (
        <div style={{
          background:'linear-gradient(160deg,rgba(240,180,41,.08),#0B111C)', border:'1px solid rgba(240,180,41,.3)',
          borderRadius:12, padding:20, marginBottom:20,
        }}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, letterSpacing:1, color:'#8899BB', marginBottom:8 }}>
            NOMBRE DE LA TEMPORADA NUEVA
          </label>
          <input
            type="text" value={nombre} placeholder='Ej: "Temporada 2027" o "Apertura 2027"'
            onChange={e => { setNombre(e.target.value); setConfirmando(false); }}
            style={{
              width:'100%', maxWidth:360, padding:'10px 14px', borderRadius:8, border:'1px solid #1C2535',
              background:'#080C12', color:'#EEF2F8', fontSize:14, marginBottom:14, boxSizing:'border-box',
            }}
          />

          {confirmando && (
            <div style={{
              background:'rgba(240,64,96,.08)', border:'1px solid rgba(240,64,96,.3)', borderRadius:8,
              padding:'12px 14px', marginBottom:14, fontSize:13, color:'#F04060', lineHeight:1.5,
            }}>
              ⚠️ Esto va a dejar <strong>"{activa?.nombre ?? 'la temporada actual'}"</strong> como archivada
              (se va a poder seguir viendo con su propio chip, pero no se le va a poder cargar nada más) y
              todo lo que subas de acá en adelante — fechas, partidos, estadísticas — va a caer en
              "{nombre.trim()}". Esta acción no se puede deshacer desde el panel. ¿Confirmás?
            </div>
          )}

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={handleCrear} disabled={guardando || !nombre.trim()} style={{
              padding:'10px 18px', borderRadius:8, border:'none', cursor:'pointer',
              background: confirmando ? '#F04060' : 'linear-gradient(135deg,#F0B429,#FF6B2B)',
              color: confirmando ? '#fff' : '#080C12',
              fontFamily:"'Bebas Neue',sans-serif", fontSize:14, letterSpacing:1,
              opacity: (guardando || !nombre.trim()) ? 0.5 : 1,
            }}>
              {guardando ? 'Creando...' : confirmando ? '⚠️ SÍ, CREAR Y ARCHIVAR LA ANTERIOR' : 'CONTINUAR'}
            </button>
            <button onClick={() => { setCreando(false); setConfirmando(false); }} style={{
              padding:'10px 18px', borderRadius:8, border:'1px solid #1C2535', cursor:'pointer',
              background:'transparent', color:'#8899BB', fontSize:13,
            }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color:'#6B7A99' }}>Cargando temporadas...</p>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[...temporadas].sort((a,b) => b.id - a.id).map(t => (
            <div key={t.id} style={{
              display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8,
              padding:'14px 18px', borderRadius:10,
              background: t.id === temporadaActivaId ? 'rgba(34,208,122,.06)' : '#0E1420',
              border: `1px solid ${t.id === temporadaActivaId ? 'rgba(34,208,122,.3)' : '#1C2535'}`,
            }}>
              <div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:'#EEF2F8', letterSpacing:.5 }}>
                  {t.nombre}
                </div>
                {t.fecha_inicio && (
                  <div style={{ color:'#6B7A99', fontSize:12 }}>Desde {t.fecha_inicio}</div>
                )}
              </div>
              {t.id === temporadaActivaId ? (
                <span style={{
                  fontSize:11, fontWeight:700, letterSpacing:1, color:'#22D07A',
                  background:'rgba(34,208,122,.12)', border:'1px solid rgba(34,208,122,.35)',
                  padding:'4px 12px', borderRadius:100, textTransform:'uppercase',
                }}>
                  ● En curso — acá cae lo que cargues
                </span>
              ) : (
                <span style={{
                  fontSize:11, fontWeight:700, letterSpacing:1, color:'#8899BB',
                  background:'rgba(136,153,187,.1)', border:'1px solid #1C2535',
                  padding:'4px 12px', borderRadius:100, textTransform:'uppercase',
                }}>
                  📁 Archivada
                </span>
              )}
            </div>
          ))}
          {temporadas.length === 0 && (
            <p style={{ color:'#6B7A99', fontSize:13 }}>
              No hay ninguna temporada todavía — corré <code>add_temporadas.sql</code> en Supabase primero.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
