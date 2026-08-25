import { useState, useEffect } from 'react';
import { useTemporada } from '../context/TemporadaContext';
import { supabase } from '../lib/supabase';
import { TABLAS } from './categoriaAdmin';

const CATEGORIAS = [
  { key: 'femenino',  label: 'Femenino',  icon: '👧' },
  { key: 'masculino', label: 'Masculino', icon: '👦' },
];

// Panel de temporadas/torneos: ver todas las que existen (cuál está en curso,
// cuánto se cargó en cada una), reactivar una archivada, arrancar una nueva,
// y saltar directo a armar los playoffs de la que está en curso.
//
// Ojo con no confundir dos cosas distintas que viven acá al lado:
//  - "Activa" es un estado de CADA TEMPORADA (cuál recibe lo que se cargue de
//    acá en adelante). Crear una nueva, o reactivar una archivada, cambia esto.
//  - "Cerrar temporada" (Herramientas → Playoffs) arma los cruces de playoff
//    según la tabla de posiciones. NO cambia cuál temporada está activa — es
//    una acción aparte, que ahora también se puede iniciar directo desde acá.
// Crear una temporada nueva (o reactivar una vieja) es un cambio grande — todo
// lo que se cargue de acá en adelante (fechas, partidos, estadísticas) va a
// caer en la que quede activa, dejando las demás tal cual quedaron, visibles
// pero congeladas. Por eso ambas acciones piden confirmación explícita.
export default function TemporadasManager({ onNavigate } = {}) {
  const { temporadas, temporadaActivaId, crearTemporada, activarTemporada, loading } = useTemporada();
  const [creando, setCreando]         = useState(false);
  const [nombre, setNombre]           = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando]     = useState(false);
  const [msg, setMsg]                 = useState(null);
  // Reactivar una temporada archivada — pide confirmación (mismo criterio que
  // crear: es un cambio grande, deja la que estaba activa como archivada).
  const [activandoId, setActivandoId]         = useState(null);
  const [guardandoActivar, setGuardandoActivar] = useState(false);
  // Estadísticas por temporada (fechas/partidos/finalizados, femenino +
  // masculino) — para que cada tarjeta muestre cuánto se cargó ahí sin tener
  // que entrar a Partidos/Estadísticas a averiguarlo a mano.
  const [stats, setStats] = useState({});

  const flash = (text, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 4500); };

  useEffect(() => {
    let cancelado = false;
    async function cargarStats() {
      if (temporadas.length === 0) return;
      const entries = await Promise.all(temporadas.map(async t => {
        try {
          const porCategoria = await Promise.all(CATEGORIAS.map(async ({ key }) => {
            const tablas = TABLAS[key];
            const { data: fechasT, error: fErr } = await supabase
              .from(tablas.fechas).select('id').eq('temporada_id', t.id);
            if (fErr) throw fErr;
            const ids = (fechasT ?? []).map(f => f.id);
            if (ids.length === 0) return { fechas: 0, partidos: 0, finalizados: 0 };
            const { data: partidosT, error: pErr } = await supabase
              .from(tablas.partidos).select('estado').in('fecha_id', ids);
            if (pErr) throw pErr;
            const finalizados = (partidosT ?? []).filter(p => p.estado === 'finalizado').length;
            return { fechas: ids.length, partidos: (partidosT ?? []).length, finalizados };
          }));
          const [femenino, masculino] = porCategoria;
          const total = {
            fechas:      femenino.fechas      + masculino.fechas,
            partidos:    femenino.partidos    + masculino.partidos,
            finalizados: femenino.finalizados + masculino.finalizados,
          };
          return [t.id, { total, femenino, masculino, error: null }];
        } catch (err) {
          return [t.id, { error: err.message }];
        }
      }));
      if (!cancelado) setStats(Object.fromEntries(entries));
    }
    cargarStats();
    return () => { cancelado = true; };
  }, [temporadas]);

  const iniciarCreacion = () => { setCreando(true); setConfirmando(false); setNombre(''); };

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

  const activa      = temporadas.find(t => t.id === temporadaActivaId);
  const sinActiva   = temporadas.length > 0 && !activa;
  const archivadas  = [...temporadas].filter(t => t.id !== temporadaActivaId).sort((a, b) => b.id - a.id);

  const handleActivar = async (t) => {
    if (activandoId !== t.id) { setActivandoId(t.id); return; }
    setGuardandoActivar(true);
    try {
      await activarTemporada(t.id);
      flash(`✅ "${t.nombre}" reactivada — ahora es la temporada en curso`);
      setActivandoId(null);
    } catch (err) {
      flash(`❌ ${err.message}`, false);
    } finally {
      setGuardandoActivar(false);
    }
  };

  return (
    <div>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>🏆 TEMPORADAS</h2>
          <p style={S.subtitle}>
            Cada temporada guarda sus propias fechas, partidos y estadísticas por separado — nada se mezcla entre una y otra.
          </p>
        </div>
        <div style={S.headerRight}>
          {temporadas.length > 0 && (
            <span style={S.countChip}>
              {temporadas.length} temporada{temporadas.length === 1 ? '' : 's'} en total
            </span>
          )}
          {!creando && (
            <button onClick={iniciarCreacion} style={S.btnNueva}>➕ NUEVA TEMPORADA</button>
          )}
        </div>
      </div>

      <div style={S.hint}>
        ℹ️ Crear una temporada nueva archiva automáticamente la que está en curso (se puede seguir
        viendo, pero no se le puede cargar nada más). <b>Activar</b> una archivada hace lo mismo al
        revés. <b>Cerrar temporada</b> es otra cosa — arma los cruces de playoff según la tabla de
        posiciones actual; no cambia cuál temporada está en curso.
      </div>

      {msg && (
        <div style={{ ...S.msg, ...(msg.ok ? S.msgOk : S.msgErr) }}>
          {msg.text}
        </div>
      )}

      {sinActiva && (
        <div style={S.warnBox}>
          ⚠️ Ninguna temporada está marcada como "en curso" ahora mismo — activá una de la lista de
          abajo para poder seguir cargando fechas, partidos y estadísticas.
        </div>
      )}

      {creando && (
        <div style={S.crearBox}>
          <label style={S.crearLabel}>NOMBRE DE LA TEMPORADA NUEVA</label>
          <input
            type="text" value={nombre} placeholder='Ej: "Temporada 2027" o "Apertura 2027"'
            onChange={e => { setNombre(e.target.value); setConfirmando(false); }}
            style={S.crearInput}
          />

          {confirmando && (
            <div style={S.crearWarn}>
              ⚠️ Esto va a dejar <strong>"{activa?.nombre ?? 'la temporada actual'}"</strong> como archivada
              (se va a poder seguir viendo con su propio chip, pero no se le va a poder cargar nada más) y
              todo lo que subas de acá en adelante — fechas, partidos, estadísticas — va a caer en
              "{nombre.trim()}". Esta acción no se puede deshacer desde el panel. ¿Confirmás?
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={handleCrear} disabled={guardando || !nombre.trim()} style={{
              ...S.btnCrearConfirmar,
              background: confirmando ? '#F04060' : 'linear-gradient(135deg,#F0B429,#FF6B2B)',
              color: confirmando ? '#fff' : '#080C12',
              opacity: (guardando || !nombre.trim()) ? 0.5 : 1,
            }}>
              {guardando ? 'Creando...' : confirmando ? '⚠️ SÍ, CREAR Y ARCHIVAR LA ANTERIOR' : 'CONTINUAR'}
            </button>
            <button onClick={() => { setCreando(false); setConfirmando(false); }} style={S.btnCancelar}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#6B7A99' }}>Cargando temporadas...</p>
      ) : temporadas.length === 0 ? (
        <p style={S.emptyGlobal}>
          No hay ninguna temporada todavía — corré <code>add_temporadas.sql</code> en Supabase primero.
        </p>
      ) : (
        <>
          {activa && (
            <div style={S.hero}>
              <div style={S.heroHeader}>
                <div>
                  <span style={S.heroBadge}>● EN CURSO — acá cae lo que cargues</span>
                  <h3 style={S.heroTitle}>{activa.nombre}</h3>
                  {activa.fecha_inicio && <div style={S.heroFecha}>📆 Iniciada el {activa.fecha_inicio}</div>}
                </div>
                <button
                  onClick={() => onNavigate?.('playoffs')}
                  disabled={!onNavigate}
                  title={onNavigate ? 'Ir a armar los cruces de playoff' : undefined}
                  style={{ ...S.btnCerrar, opacity: onNavigate ? 1 : 0.5, cursor: onNavigate ? 'pointer' : 'not-allowed' }}
                >
                  🥇 CERRAR TEMPORADA (armar playoffs)
                </button>
              </div>
              <StatRow s={stats[activa.id]} />
            </div>
          )}

          <div style={S.sectionLabel}>
            TEMPORADAS ANTERIORES {archivadas.length > 0 && `(${archivadas.length})`}
          </div>
          {archivadas.length === 0 ? (
            <p style={S.emptyGlobal}>Todavía no hay temporadas archivadas — esta es la primera.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {archivadas.map(t => (
                <div key={t.id} style={S.archCard}>
                  <div style={S.archHeader}>
                    <div>
                      <div style={S.archNombre}>{t.nombre}</div>
                      {t.fecha_inicio && <div style={S.archFecha}>Desde {t.fecha_inicio}</div>}
                    </div>

                    {activandoId === t.id ? (
                      <div style={S.confirmRow}>
                        <span style={S.confirmText}>
                          ⚠️ "{activa?.nombre ?? 'la actual'}" queda archivada. ¿Confirmás?
                        </span>
                        <button onClick={() => handleActivar(t)} disabled={guardandoActivar} style={{
                          ...S.btnSiActivar, opacity: guardandoActivar ? 0.6 : 1,
                        }}>
                          {guardandoActivar ? 'Activando...' : 'SÍ, ACTIVAR'}
                        </button>
                        <button onClick={() => setActivandoId(null)} style={S.btnCancelarChico}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={S.badgeArchivada}>📁 Archivada</span>
                        <button onClick={() => handleActivar(t)} title="Volver a activar esta temporada" style={S.btnActivar}>
                          ▶ Activar
                        </button>
                      </div>
                    )}
                  </div>
                  <StatRow s={stats[t.id]} compact />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Fila de estadísticas de una temporada — total combinado + desglose por
// categoría. `compact` achica un poco el tipo para las tarjetas archivadas,
// que ya son más chicas que la tarjeta "en curso".
function StatRow({ s, compact = false }) {
  if (!s) return <div style={S.statsLoading}>Cargando datos de esta temporada…</div>;
  if (s.error) return <div style={S.statsError}>⚠️ No se pudieron cargar los datos: {s.error}</div>;

  const pct = s.total.partidos > 0 ? Math.round((s.total.finalizados / s.total.partidos) * 100) : null;

  return (
    <div>
      <div style={{ ...S.statsChips, fontSize: compact ? 12 : 13 }}>
        <span style={S.chip}>📅 {s.total.fechas} fecha{s.total.fechas === 1 ? '' : 's'}</span>
        <span style={S.chip}>🏀 {s.total.partidos} partido{s.total.partidos === 1 ? '' : 's'}</span>
        <span style={S.chip}>✅ {s.total.finalizados} finalizado{s.total.finalizados === 1 ? '' : 's'}</span>
        {pct !== null && (
          <span style={{ ...S.chip, color: pct === 100 ? '#22D07A' : '#F0B429' }}>{pct}% completado</span>
        )}
      </div>

      {pct !== null && (
        <div style={S.progressTrack}>
          <div style={{
            ...S.progressFill, width: `${pct}%`,
            background: pct === 100 ? '#22D07A' : 'linear-gradient(90deg,#F0B429,#FF6B2B)',
          }} />
        </div>
      )}

      {s.total.fechas > 0 && (
        <div style={{ ...S.byCategoria, fontSize: compact ? 11 : 11.5 }}>
          {CATEGORIAS.map(({ key, label, icon }) => {
            const c = s[key];
            if (c.fechas === 0) return null;
            return (
              <span key={key} style={S.catStat}>
                {icon} {label}: {c.fechas} fecha{c.fechas === 1 ? '' : 's'} · {c.partidos} partido{c.partidos === 1 ? '' : 's'}
                {c.partidos > 0 ? ` (${c.finalizados} fin.)` : ''}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

const S = {
  header:      { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  title:       { fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, letterSpacing: 1, color: '#EEF2F8', margin: 0 },
  subtitle:    { color: '#6B7A99', fontSize: 13, margin: '4px 0 0', maxWidth: 520 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  countChip:   { fontSize: 11.5, color: '#8899BB', fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: .3, whiteSpace: 'nowrap' },
  btnNueva:    {
    padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
    background: 'linear-gradient(135deg,#F0B429,#FF6B2B)', color: '#080C12',
    fontFamily: "'Bebas Neue',sans-serif", fontSize: 15, letterSpacing: 1, whiteSpace: 'nowrap',
  },

  hint: {
    background: '#0E1420', border: '1px solid #1C2535', borderRadius: 10, padding: '12px 16px',
    color: '#6B7A99', fontSize: 12.5, lineHeight: 1.6, marginBottom: 18, maxWidth: 760,
  },

  msg:    { marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600 },
  msgOk:  { background: 'rgba(34,208,122,.1)',  color: '#22D07A', border: '1px solid rgba(34,208,122,.3)' },
  msgErr: { background: 'rgba(240,64,96,.1)',   color: '#F04060', border: '1px solid rgba(240,64,96,.3)' },

  warnBox: {
    marginBottom: 18, padding: '12px 16px', borderRadius: 10, fontSize: 13, lineHeight: 1.5,
    background: 'rgba(240,180,41,.08)', color: '#F0B429', border: '1px solid rgba(240,180,41,.3)',
  },

  crearBox: {
    background: 'linear-gradient(160deg,rgba(240,180,41,.08),#0B111C)', border: '1px solid rgba(240,180,41,.3)',
    borderRadius: 12, padding: 20, marginBottom: 20,
  },
  crearLabel: { display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#8899BB', marginBottom: 8 },
  // fontSize:16 (no 14) a propósito — con menos de 16px, Safari/iOS hace
  // zoom automático de toda la pantalla al tocar el campo, lo que se siente
  // como que "algo se rompió" aunque el input funcione bien.
  crearInput: {
    width: '100%', maxWidth: 360, padding: '10px 14px', borderRadius: 8, border: '1px solid #1C2535',
    background: '#080C12', color: '#EEF2F8', fontSize: 16, marginBottom: 14, boxSizing: 'border-box',
  },
  crearWarn: {
    background: 'rgba(240,64,96,.08)', border: '1px solid rgba(240,64,96,.3)', borderRadius: 8,
    padding: '12px 14px', marginBottom: 14, fontSize: 13, color: '#F04060', lineHeight: 1.5,
  },
  btnCrearConfirmar: {
    padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, letterSpacing: 1,
  },
  btnCancelar: {
    padding: '10px 18px', borderRadius: 8, border: '1px solid #1C2535', cursor: 'pointer',
    background: 'transparent', color: '#8899BB', fontSize: 13,
  },

  emptyGlobal: { color: '#6B7A99', fontSize: 13 },

  hero: {
    borderRadius: 14, padding: '20px 22px', marginBottom: 26,
    background: 'linear-gradient(155deg,rgba(34,208,122,.08),#0B111C 60%)',
    border: '1px solid rgba(34,208,122,.3)',
    userSelect: 'none',
  },
  heroHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 16 },
  heroBadge: {
    display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#22D07A',
    background: 'rgba(34,208,122,.12)', border: '1px solid rgba(34,208,122,.35)',
    padding: '4px 12px', borderRadius: 100, textTransform: 'uppercase', marginBottom: 8,
  },
  heroTitle: { fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: '#EEF2F8', letterSpacing: .5, margin: 0 },
  heroFecha: { color: '#6B7A99', fontSize: 12.5, marginTop: 4 },
  btnCerrar: {
    padding: '11px 18px', borderRadius: 10, border: '1px solid rgba(240,180,41,.4)',
    background: 'linear-gradient(135deg,rgba(240,180,41,.16),rgba(255,107,43,.1))', color: '#F0B429',
    fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, letterSpacing: 1, whiteSpace: 'nowrap',
  },

  sectionLabel: {
    fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#4A566E',
    fontFamily: "'Barlow Condensed',sans-serif", marginBottom: 10, textTransform: 'uppercase',
  },

  archCard: { padding: '14px 18px', borderRadius: 10, background: '#0E1420', border: '1px solid #1C2535', userSelect: 'none' },
  archHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  archNombre: { fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: '#EEF2F8', letterSpacing: .5 },
  archFecha:  { color: '#6B7A99', fontSize: 12 },

  confirmRow:  { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  confirmText: { fontSize: 11.5, color: '#F04060', maxWidth: 260, textAlign: 'right' },
  btnSiActivar: {
    padding: '6px 14px', borderRadius: 100, border: 'none', cursor: 'pointer',
    background: '#F04060', color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: .5,
  },
  btnCancelarChico: {
    padding: '6px 12px', borderRadius: 100, border: '1px solid #1C2535', cursor: 'pointer',
    background: 'transparent', color: '#8899BB', fontSize: 11,
  },
  badgeArchivada: {
    fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#8899BB',
    background: 'rgba(136,153,187,.1)', border: '1px solid #1C2535',
    padding: '4px 12px', borderRadius: 100, textTransform: 'uppercase',
  },
  btnActivar: {
    padding: '4px 12px', borderRadius: 100, border: '1px solid rgba(240,180,41,.35)', cursor: 'pointer',
    background: 'rgba(240,180,41,.08)', color: '#F0B429', fontSize: 11, fontWeight: 700, letterSpacing: .5,
  },

  statsLoading: { color: '#4A566E', fontSize: 12, fontStyle: 'italic' },
  statsError:   { color: '#F04060', fontSize: 12 },
  statsChips:   { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    color: '#CBD5E8', background: '#080C12', border: '1px solid #1C2535',
    borderRadius: 100, padding: '4px 10px', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 600,
  },
  progressTrack: { height: 5, borderRadius: 100, background: '#080C12', overflow: 'hidden', marginBottom: 8 },
  progressFill:  { height: '100%', borderRadius: 100, transition: 'width .3s' },
  byCategoria:   { display: 'flex', flexWrap: 'wrap', gap: '4px 14px', color: '#4A566E', fontFamily: "'Barlow Condensed',sans-serif" },
  catStat:       { whiteSpace: 'nowrap' },
};
