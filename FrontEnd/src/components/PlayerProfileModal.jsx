import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { labelPartidoCorto } from '../lib/fechaLabel';
import { edadDesde } from '../lib/edad';
import { useTemporada } from '../context/TemporadaContext';
import { EscudoJugador } from './EscudoJugador.jsx';
import { StatsPorFecha } from './StatsPorFecha.jsx';
import { equipoPorId } from '../lib/escudos';
import { supabase, isConfigured } from '../lib/supabase';

// Qué tabla/columna consultar según la categoría del jugador — mismos
// nombres que usan useFemeninoStats.js/useMasculinoStats.js.
const TABLAS_POR_MODO = {
  femenino:  { estadisticas: 'estadisticas_femenino',  fechas: 'fechas_femenino',  partidos: 'partidos_femenino',  statsPartido: 'stats_partido_femenino',  idCol: 'jugadora_id' },
  masculino: { estadisticas: 'estadisticas_masculino', fechas: 'fechas_masculino', partidos: 'partidos_masculino', statsPartido: 'stats_partido_masculino', idCol: 'jugador_id' },
};

// Alpha en hex de 2 digitos, concatenado directo al color (igual que en el
// resto de las tarjetas con color de equipo) — evita color-mix()/variables
// CSS con alpha dinamico, que no anda bien en navegadores viejos de celulares.
const hexA = (hex, alpha) => `${hex}${alpha}`;

const COPA_COLOR = { oro: '#F0B429', plata: '#C7D1DD', bronce: '#CD7F32' };
const COPA_NOMBRE = { oro: 'Copa de Oro', plata: 'Copa de Plata', bronce: 'Copa de Bronce' };

// ⚠️ FIX: se reemplazó recharts (LineChart/ResponsiveContainer) por este
// mini gráfico SVG propio. Ni sacando ResponsiveContainer se pudo evitar el
// crash — recharts sigue teniendo internamente un manejo de resize/estado
// (via MessagePort) que revienta cuando el modal se cierra en el momento
// justo, sin importar si se usa ResponsiveContainer o no. Como este gráfico
// es simple (una sola línea de puntos por fecha) y recharts no se usa en
// ningún otro lugar del sitio, se saca la dependencia por completo para este
// caso: cero librería de terceros, cero posibilidad de que vuelva a pasar.
// El viewBox fijo + preserveAspectRatio hace que escale solo con CSS, sin
// necesitar medir el contenedor con JS (por eso tampoco hace falta ningún
// ResizeObserver acá).
// ⚠️ Reemplaza al MiniLineChart anterior (línea seca sin relleno) — sigue sin
// depender de ninguna librería externa (mismo motivo que antes: evitar el
// crash de recharts), pero ahora con área degradada, puntos con glow
// tappeables y selector de métrica (PTS/REB/AST/VAL) en vez de mostrar
// siempre puntos.
const CHART_METRICS = [
  { key: 'pts', label: 'PTS' },
  { key: 'reb', label: 'REB' },
  { key: 'ast', label: 'AST' },
  { key: 'val', label: 'VAL' },
];

// Gráfico de barras por partido (rediseño 23/11): número arriba de cada
// barra, escudo del rival abajo, línea punteada con el promedio, ★ en el
// mejor partido y los perdidos más apagados. Al tocar una barra se ve el
// detalle de ese partido (rival, resultado y sus números).
function chipCorto(d) {
  if (!d.esPlayoff) return d.match;
  const w = (d.match ?? '').split(' ')[0];
  return ({ Cuartos: 'CUA', Semifinal: 'SEMI', Semi: 'SEMI', Final: 'FIN', '3er': '3ER' })[w] ?? w.slice(0, 4).toUpperCase();
}

function StatsBarChart({ data, color = '#F0B429' }) {
  const [metric, setMetric] = useState('pts');
  const [activeIdx, setActiveIdx] = useState(null);
  if (!data || data.length < 2) return null;

  const W = 440, H = 182, top = 18, base = 140;
  const values = data.map(d => d[metric] ?? 0);
  const maxV = Math.max(...values, 1);
  const minV = Math.min(...values, 0);
  const span = (maxV - minV) || 1;
  const y = v => base - ((v - minV) / span) * (base - top);
  const step = (W - 20) / data.length;
  const bw = Math.min(26, step * 0.62);
  const prom = values.reduce((a, v) => a + v, 0) / values.length;
  const mejorIdx = values.indexOf(maxV);
  const idx = activeIdx ?? mejorIdx;
  const act = data[idx];
  const metricLbl = CHART_METRICS.find(m => m.key === metric).label;

  return (
    <div>
      <div className="pp3-tabs">
        {CHART_METRICS.map(m => (
          <button key={m.key} type="button" className={metric === m.key ? 'is-on' : ''}
            style={metric === m.key ? { background: color } : undefined}
            onClick={() => { setMetric(m.key); setActiveIdx(null); }}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="pp3-card">
        <svg viewBox={`0 0 ${W} ${H}`} className="pp3-graf" role="img" aria-label={`${metricLbl} por partido`}>
          <line x1="14" x2={W} y1={y(prom)} y2={y(prom)} stroke={color} strokeOpacity=".55" strokeDasharray="4 4"/>
          <text x={W} y={y(prom) - 5} textAnchor="end" fontSize="10" fontWeight="700" fill={color}
            fontFamily="'Barlow Condensed',sans-serif">PROM {prom.toFixed(1)}</text>
          {data.map((d, i) => {
            const v = d[metric] ?? 0;
            const x = 20 + step * i + (step - bw) / 2;
            const yTop = Math.min(y(v), y(0)), alto = Math.max(Math.abs(y(0) - y(v)), 2);
            const on = i === idx, mejor = i === mejorIdx;
            const cx = x + bw / 2;
            return (
              <g key={d.partidoId ?? i} style={{ cursor: 'pointer' }}
                onClick={() => setActiveIdx(i)} onMouseEnter={() => setActiveIdx(i)}>
                <rect x={x - step * .18} y={top - 14} width={bw + step * .36} height={H - top + 14} fill="transparent"/>
                <rect x={x} y={yTop} width={bw} height={alto} rx="5"
                  fill={color} opacity={on ? 1 : d.gano === false ? .3 : .6}/>
                {on && <rect x={x - 3} y={yTop - 3} width={bw + 6} height={alto + 3} rx="7" fill="none" stroke={color} strokeWidth="1.5"/>}
                <text x={cx} y={yTop - 6} textAnchor="middle" fontFamily="'Bebas Neue',sans-serif" fontSize="15"
                  fill={on || mejor ? '#FFFFFF' : '#AEB8CB'}>{mejor ? '★' : ''}{v}</text>
                {d.rival?.logo ? (
                  <>
                    <clipPath id={`pp3c${i}`}><circle cx={cx} cy={base + 15} r="10"/></clipPath>
                    <image href={d.rival.logo} x={cx - 10} y={base + 5} width="20" height="20"
                      clipPath={`url(#pp3c${i})`} preserveAspectRatio="xMidYMid slice"/>
                    <circle cx={cx} cy={base + 15} r="10" fill="none" stroke={d.rival.color ?? '#4A566E'} strokeWidth="1.3"/>
                  </>
                ) : <circle cx={cx} cy={base + 15} r="10" fill="#141C2A"/>}
                <text x={cx} y={base + 37} textAnchor="middle" fontSize="9.5" fontWeight="700"
                  fill={on ? color : '#5C6880'} fontFamily="'Barlow Condensed',sans-serif">{chipCorto(d)}</text>
              </g>
            );
          })}
        </svg>
        {act && (
          <div className="pp3-sel" style={{ borderColor: hexA(color, '44'), background: hexA(color, '10') }}>
            {act.rival?.logo && (
              <span className="pp3-esc" style={{ borderColor: act.rival.color ?? '#4A566E' }}><img src={act.rival.logo} alt=""/></span>
            )}
            <div className="pp3-sel-t">
              <small style={{ color }}>{act.esPlayoff ? act.match : `Fecha ${String(act.match).replace(/^F/, '')}`}</small>
              <div>
                {act.rival ? `vs ${act.rival.name}` : act.match}
                {act.pf != null && act.pc != null && (act.pf || act.pc) ? (
                  <span className={`pp3-res ${act.gano ? 'g' : 'p'}`}>{act.gano ? 'G' : 'P'} {act.pf}-{act.pc}</span>
                ) : null}
              </div>
            </div>
            <div className="pp3-sel-n">
              {CHART_METRICS.map(m => (
                <div key={m.key}><b style={m.key === metric ? { color } : undefined}>{act[m.key] ?? 0}</b><small>{m.label}</small></div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Anillo de porcentaje para el desglose de tiros.
function AnilloTiro({ conv, fall, pct, color, label }) {
  const total = (conv ?? 0) + (fall ?? 0);
  const p = total > 0 ? Math.round(((conv ?? 0) / total) * 100) : Math.round(pct ?? 0);
  const r = 34, c = 2 * Math.PI * r;
  return (
    <div className="pp3-anillo">
      <svg viewBox="0 0 84 84">
        <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="8"/>
        <circle cx="42" cy="42" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${(c * Math.min(p, 100)) / 100} ${c}`} transform="rotate(-90 42 42)"/>
        <text x="42" y="50" textAnchor="middle" fontFamily="'Bebas Neue',sans-serif" fontSize="24" fill="#EEF2F8">{p}%</text>
      </svg>
      <span className="pp3-anillo-lbl">{label}</span>
      <span className="pp3-anillo-sub">{conv ?? 0} de {total}</span>
    </div>
  );
}

// ─── Share button ─────────────────────────────────────────────────────────────
function ShareButton({ player, pts, reb, ast, addToast }) {
  const handleShare = async () => {
    const url = window.location.origin + window.location.pathname + '?jugadora=' + player.id;
    const text = `🏀 ${player.name} — ${player.team}\nPTS: ${pts} | REB: ${reb} | AST: ${ast}\nTorneo Star Básquet 2026`;
    if (navigator.share) {
      try { await navigator.share({ title: `${player.name} — Star Básquet`, text, url }); }
      catch (_) {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
        // Usa el mismo sistema de toasts del sitio si está disponible; si no
        // (instancias del modal que todavía no lo reciben como prop), cae al
        // alert() nativo como antes para no perder el aviso.
        if (addToast) addToast({ icon: '🔗', title: '¡Copiado al portapapeles!', duration: 2500 });
        else alert('¡Copiado al portapapeles!');
      } catch (_) {}
    }
  };
  return (
    <button className="pp-share-btn" onClick={handleShare} title="Compartir perfil">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
      Compartir
    </button>
  );
}

// ─── Barra de porcentaje ──────────────────────────────────────────────────────
function PctBar({ value, color = '#F0B429' }) {
  const pct = Math.min(Math.max(value ?? 0, 0), 100);
  return (
    <div style={{ background: '#1C2535', borderRadius: 4, height: 6, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }}/>
    </div>
  );
}

// ─── Card de stat ─────────────────────────────────────────────────────────────
function StatCard({ val, lbl, color = '#EEF2F8', sub, teamColor }) {
  return (
    <div style={{ flex: 1, minWidth: 60, borderRadius: 9, padding: 1,
      background: teamColor ? `linear-gradient(160deg, ${hexA(teamColor, '50')}, #1C2535 65%)` : '#1C2535' }}>
      <div style={{ borderRadius: 8, padding: '10px 8px', textAlign: 'center', height: '100%',
        background: teamColor ? `linear-gradient(160deg, ${hexA(teamColor, '12')}, #0B111C 60%)` : '#141C2A' }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color, lineHeight: 1 }}>{val}</div>
        <div style={{ color: '#6B7A99', fontSize: 10, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{lbl}</div>
        {sub && <div style={{ color: '#4A566E', fontSize: 9, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ─── Fila de desglose de tiro ─────────────────────────────────────────────────
function TiroRow({ label, conv, fall, pct, color, promConv }) {
  const total   = (conv ?? 0) + (fall ?? 0);
  // ⚠️ FIX: si hay datos reales los usa, sino usa el pct almacenado
  const pctReal = total > 0 ? Math.round(((conv ?? 0) / total) * 100) : (pct ?? 0);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ color: '#8899BB', fontSize: 13 }}>{label}</span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#4A566E' }}>
            {conv ?? 0}/{total}
          </span>
          {(promConv ?? 0) > 0 && (
            <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, color: '#6B7A99' }}>
              {promConv}/pj
            </span>
          )}
          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color, minWidth: 44, textAlign: 'right' }}>
            {pctReal}%
          </span>
        </div>
      </div>
      <PctBar value={pctReal} color={color}/>
    </div>
  );
}

// ─── Chip de temporada (dentro del modal) ──────────────────────────────────────
// Pedido de Alvaro: una jugadora/jugador que disputó más de una temporada
// tiene que poder ver las stats/gráfico de CADA una desde el propio perfil,
// sin salir del modal ni tocar el selector global del resto del sitio. Mismo
// patrón visual/de portal que TemporadaChip.jsx (para no repetir el bug ya
// reportado de "se ve cortado" con un dropdown recortado por un padre con
// overflow), pero en versión chica para entrar en la card del perfil.
function ModalTemporadaChip({ temporadas, mode, valor, onElegir, accent }) {
  const [abierto, setAbierto] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const deLaCategoria = useMemo(
    () => [...(temporadas ?? [])].filter(t => t.categoria === mode).sort((a, b) => b.id - a.id),
    [temporadas, mode]
  );

  const actualizarPosicion = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    setCoords({ top: r.bottom + 6, left: r.left, minWidth: Math.max(r.width, 180) });
  };

  useEffect(() => {
    if (!abierto) return;
    actualizarPosicion();
    const onScrollOrResize = () => actualizarPosicion();
    const onClickFuera = e => {
      if (btnRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setAbierto(false);
    };
    const onEsc = e => { if (e.key === 'Escape') setAbierto(false); };
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    document.addEventListener('mousedown', onClickFuera);
    document.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
      document.removeEventListener('mousedown', onClickFuera);
      document.removeEventListener('keydown', onEsc);
    };
  }, [abierto]);

  if (deLaCategoria.length <= 1) return null;

  const seleccionada = deLaCategoria.find(t => t.id === valor) ?? deLaCategoria[0];

  return (
    <div style={{ marginTop: 8 }}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setAbierto(a => !a)}
        aria-expanded={abierto}
        aria-haspopup="listbox"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px',
          borderRadius: 999, border: `1px solid ${hexA(accent, '55')}`, background: hexA(accent, '14'),
          color: accent, fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700,
          fontSize: 12.5, letterSpacing: .3, cursor: 'pointer',
        }}
      >
        📅 {seleccionada?.nombre ?? 'Temporada'}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {abierto && coords && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={{
            position: 'fixed', top: coords.top, left: coords.left,
            minWidth: coords.minWidth, maxWidth: 'calc(100vw - 16px)',
            zIndex: 10000, overflow: 'hidden', padding: 5,
            borderRadius: 12, border: '1px solid #1C2535', background: '#0E1420',
            boxShadow: '0 18px 40px rgba(0,0,0,.55)',
          }}
        >
          {deLaCategoria.map(t => {
            const sel = t.id === (seleccionada?.id ?? valor);
            return (
              <div
                key={t.id}
                role="option"
                aria-selected={sel}
                onClick={() => { onElegir(t.id); setAbierto(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
                  minHeight: 40, borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap',
                  background: sel ? hexA(accent, '1f') : 'transparent',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: sel ? accent : 'transparent' }} />
                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 14, color: sel ? accent : '#EEF2F8' }}>
                  {t.nombre}
                </span>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────
export function PlayerProfileModal({ player, isOpen, onClose, statsPorPartido, partidos, fechas, addToast, mode = 'femenino' }) {
  // ⚠️ FIX: los hooks tienen que llamarse SIEMPRE, en el mismo orden, sin
  // importar isOpen/player — por eso van antes del "return null" de abajo
  // (este componente queda montado de forma persistente y solo cambia isOpen).

  // ── Chip de temporada DENTRO del modal (pedido de Alvaro) ──────────────
  // `partidos`/`fechas`/`statsPorPartido`/`player` que llegan por props ya
  // vienen scopeados a la temporada elegida en el resto del sitio (el chip
  // global) — eso es la temporada "de casa" de este modal. Acá adentro se
  // puede mirar OTRA sin que eso mueva el chip global ni el resto del sitio:
  // cuando se elige una distinta, se pide aparte (una sola vez, se cachea)
  // la foto de esa jugadora/jugador en esa temporada puntual.
  const { temporadas, temporadaSeleccionadaId } = useTemporada();
  // Encabezado: promedios por partido (por defecto) o totales.
  const [vistaStats, setVistaStats] = useState('prom');
  const temporadaHomeId = temporadaSeleccionadaId[mode];
  const [temporadaVerId, setTemporadaVerId] = useState(temporadaHomeId);
  // ⚠️ FIX: la caché estaba indexada SOLO por temporada — como este modal
  // queda montado entre una persona y otra, abrir a A, mirar "Apertura",
  // y después abrir a B y mirar "Apertura" mostraba los datos de A. Ahora la
  // clave incluye categoría + jugador/a + temporada.
  const [cachePorTemporada, setCachePorTemporada] = useState({});
  const claveCache = `${mode}:${player?.id}:${temporadaVerId}`;
  // Stats partido a partido de ESTA persona en la temporada "de casa" —
  // antes venían de una descarga de la tabla entera (todas las personas,
  // todas las temporadas) que hacía cada visitante al entrar a la página;
  // ahora se piden solo acá, solo las de esta persona, al abrir el perfil.
  const [statsHome, setStatsHome] = useState({});

  // Al abrir el modal (o cambiar de jugadora, o si el chip global cambió
  // mientras el modal estaba cerrado) siempre arranca de nuevo en la
  // temporada "de casa" — si no, podría quedar mostrando por accidente la
  // temporada vieja que se había elegido para OTRA jugadora.
  useEffect(() => {
    if (isOpen) setTemporadaVerId(temporadaHomeId);
  }, [isOpen, player?.id, temporadaHomeId]);

  const esTemporadaHome = temporadaVerId === temporadaHomeId || temporadaVerId == null;

  useEffect(() => {
    if (!isOpen || !player?.id || esTemporadaHome) return;
    if (!isConfigured) return;
    if (cachePorTemporada[claveCache]) return; // ya cargada (u ocurrió error) — no repetir
    const tablas = TABLAS_POR_MODO[mode] ?? TABLAS_POR_MODO.femenino;
    const clave = claveCache;
    let cancelado = false;
    (async () => {
      setCachePorTemporada(prev => ({ ...prev, [clave]: { loading: true } }));
      try {
        const [{ data: estRows, error: eErr }, { data: fechasRows, error: fErr }] = await Promise.all([
          supabase.from(tablas.estadisticas).select('*').eq(tablas.idCol, player.id).eq('temporada_id', temporadaVerId),
          supabase.from(tablas.fechas).select('*').eq('temporada_id', temporadaVerId).order('numero', { ascending: true }),
        ]);
        if (cancelado) return;
        if (eErr || fErr) throw new Error((eErr ?? fErr).message);

        const fechasDeEsa = fechasRows ?? [];
        const fechaIds = fechasDeEsa.map(f => f.id);
        let partidosDeEsa = [];
        if (fechaIds.length && player.equipoId != null) {
          const { data: partidosRows, error: pErr } = await supabase.from(tablas.partidos).select('*')
            .in('fecha_id', fechaIds)
            .or(`equipo_local_id.eq.${player.equipoId},equipo_visit_id.eq.${player.equipoId}`)
            .eq('estado', 'finalizado');
          if (pErr) throw pErr;
          partidosDeEsa = partidosRows ?? [];
        }
        if (cancelado) return;

        const statsPorPartidoDeEsa = {};
        if (partidosDeEsa.length) {
          const partidoIds = partidosDeEsa.map(p => p.id);
          const { data: spRows, error: spErr } = await supabase.from(tablas.statsPartido).select('*')
            .eq(tablas.idCol, player.id)
            .in('partido_id', partidoIds);
          if (spErr) throw spErr;
          for (const r of (spRows ?? [])) {
            if (!statsPorPartidoDeEsa[r.partido_id]) statsPorPartidoDeEsa[r.partido_id] = {};
            statsPorPartidoDeEsa[r.partido_id][player.id] = r;
          }
        }
        if (cancelado) return;

        // El resto del jugador (nombre, equipo, color, foto) es identidad y
        // no cambia por temporada — solo se pisan los números de stats con
        // los de estadisticas_X de ESA temporada puntual (o en cero si
        // todavía no jugó ninguna fecha de esa temporada).
        const estRow = (estRows ?? [])[0] ?? null;
        setCachePorTemporada(prev => ({ ...prev, [clave]: {
          loading: false,
          player: { ...player, ...(estRow ?? { pj: 0 }) },
          partidos: partidosDeEsa,
          fechas: fechasDeEsa,
          statsPorPartido: statsPorPartidoDeEsa,
        } }));
      } catch (err) {
        console.error('[PlayerProfileModal] cambio de temporada:', err);
        if (!cancelado) setCachePorTemporada(prev => ({ ...prev, [clave]: { loading: false, error: err.message } }));
      }
    })();
    // Si se cierra o se cambia de temporada a mitad de la carga, se borra la
    // entrada "cargando" — si no, al volver quedaba un spinner para siempre.
    return () => {
      cancelado = true;
      setCachePorTemporada(prev => (prev[clave]?.loading ? (({ [clave]: _x, ...resto }) => resto)(prev) : prev));
    };
  }, [isOpen, temporadaVerId, esTemporadaHome, player?.id, player?.equipoId, mode]);

  // Stats partido a partido de la temporada "de casa" (ver statsHome arriba).
  const partidosHomeIds = useMemo(() => (partidos ?? [])
    .filter(p => p.estado === 'finalizado' && player?.equipoId != null &&
      (p.equipo_local_id === player.equipoId || p.equipo_visit_id === player.equipoId))
    .map(p => p.id), [partidos, player?.equipoId]);
  const claveHome = `${mode}:${player?.id}:${partidosHomeIds.join(',')}`;
  useEffect(() => {
    if (!isOpen || !player?.id || !isConfigured) return;
    if (statsHome[claveHome]) return;
    if (!partidosHomeIds.length) { setStatsHome(prev => ({ ...prev, [claveHome]: {} })); return; }
    const tablas = TABLAS_POR_MODO[mode] ?? TABLAS_POR_MODO.femenino;
    let cancelado = false;
    supabase.from(tablas.statsPartido)
      .select('partido_id,pts,rd,ro,as_,sc,sf,dc,df,tc,tf,val')
      .eq(tablas.idCol, player.id)
      .in('partido_id', partidosHomeIds)
      .then(({ data, error }) => {
        if (cancelado) return;
        if (error) { console.warn('[PlayerProfileModal] stats por partido:', error.message); return; }
        const m = {};
        for (const r of (data ?? [])) m[r.partido_id] = { [player.id]: r };
        setStatsHome(prev => ({ ...prev, [claveHome]: m }));
      });
    return () => { cancelado = true; };
  }, [isOpen, player?.id, claveHome, mode]);

  const vistaOtraTemporada = !esTemporadaHome ? cachePorTemporada[claveCache] : null;
  const cargandoOtraTemporada = !esTemporadaHome && (vistaOtraTemporada?.loading ?? true);
  const effectivePlayer         = (!esTemporadaHome && vistaOtraTemporada?.player) ? vistaOtraTemporada.player : player;
  const effectivePartidos       = !esTemporadaHome ? (vistaOtraTemporada?.partidos ?? [])       : partidos;
  const effectiveFechas         = !esTemporadaHome ? (vistaOtraTemporada?.fechas ?? [])         : fechas;
  const effectiveStatsPorPartido = !esTemporadaHome
    ? (vistaOtraTemporada?.statsPorPartido ?? {})
    : (statsHome[claveHome] ?? (statsPorPartido && Object.keys(statsPorPartido).length ? statsPorPartido : {}));

  const historialGrafico = useMemo(() => {
    if (!player || !effectiveStatsPorPartido || !effectivePartidos || !effectiveFechas) return [];
    return effectivePartidos
      .filter(p =>
        p.estado === 'finalizado' &&
        (p.equipo_local_id === player.equipoId || p.equipo_visit_id === player.equipoId)
      )
      // Orden por número de fecha (no por id de fecha, que depende del orden
      // en que se crearon en la base). Los playoffs van al final.
      .sort((a, b) => {
        const na = effectiveFechas.find(f => f.id === a.fecha_id)?.numero ?? a.fecha_id ?? 0;
        const nb = effectiveFechas.find(f => f.id === b.fecha_id)?.numero ?? b.fecha_id ?? 0;
        return (!!a.es_playoff - !!b.es_playoff) || (na - nb) || ((a.llave ?? 0) - (b.llave ?? 0));
      })
      .map(p => {
        const st    = effectiveStatsPorPartido?.[p.id]?.[player.id];
        const fecha = effectiveFechas.find(f => f.id === p.fecha_id);
        const esLocal = p.equipo_local_id === player.equipoId;
        const rival = equipoPorId(esLocal ? p.equipo_visit_id : p.equipo_local_id);
        const pf = (esLocal ? p.puntos_local : p.puntos_visit) ?? 0;
        const pc = (esLocal ? p.puntos_visit : p.puntos_local) ?? 0;
        return {
          partidoId: p.id,
          rival, pf, pc, gano: pf > pc,
          // Playoffs: "Semifinal Oro" en vez de "F11" — la instancia/copa
          // viven en el partido, no en la fecha (ver lib/fechaLabel.js).
          match:     labelPartidoCorto(p, fecha) ?? (fecha ? `F${fecha.numero}` : `P${p.id}`),
          esPlayoff: !!p.es_playoff,
          pts:   st?.pts ?? 0,
          reb:   (st?.rd ?? 0) + (st?.ro ?? 0),
          ast:   st?.as_ ?? 0,
          sc: st?.sc ?? 0, sf: st?.sf ?? 0,
          dc: st?.dc ?? 0, df: st?.df ?? 0,
          tc: st?.tc ?? 0, tf: st?.tf ?? 0,
          val: st?.val ?? 0,
        };
      })
      .filter(d => d.pts > 0 || d.reb > 0 || d.ast > 0);
  }, [effectiveStatsPorPartido, effectivePartidos, effectiveFechas, player?.id, player?.equipoId]);

  const mejorPartido = useMemo(() => {
    if (!historialGrafico.length) return null;
    return historialGrafico.reduce((b, r) => (r.pts > (b?.pts ?? -1) ? r : b), null);
  }, [historialGrafico]);

  // Etiquetas del encabezado: copa de playoffs del equipo y su récord G/P.
  const { copaEquipo, record } = useMemo(() => {
    const eqId = player?.equipoId;
    const jugados = (effectivePartidos ?? []).filter(p => p.estado === 'finalizado' && eqId != null &&
      (p.equipo_local_id === eqId || p.equipo_visit_id === eqId));
    let g = 0, pp = 0, copa = null;
    for (const p of jugados) {
      const local = p.equipo_local_id === eqId;
      const pf = (local ? p.puntos_local : p.puntos_visit) ?? 0;
      const pc = (local ? p.puntos_visit : p.puntos_local) ?? 0;
      if (pf > pc) g++; else if (pc > pf) pp++;
    }
    for (const p of (effectivePartidos ?? [])) {
      if (p.es_playoff && p.copa && (p.equipo_local_id === eqId || p.equipo_visit_id === eqId)) { copa = p.copa; break; }
    }
    return { copaEquipo: copa, record: { g, p: pp } };
  }, [effectivePartidos, player?.equipoId]);

  // ⚠️ Accesibilidad: cerrar con Escape (antes solo se podía con el click
  // afuera o el botón ✕ — no funcionaba nada con el teclado).
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = e => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !player) return null;

  // Stats promedios — con fallbacks seguros. Usan effectivePlayer: el mismo
  // `player` de siempre mientras se mira la temporada "de casa", o los
  // números pisados por la temporada que se eligió con el chip de acá
  // adentro (ver más arriba).
  const pts      = effectivePlayer.pts_prom  ?? effectivePlayer.pts ?? 0;
  const reb      = effectivePlayer.reb_prom  ?? effectivePlayer.reb ?? 0;
  const ast      = effectivePlayer.ast_prom  ?? effectivePlayer.ast ?? 0;
  const rob      = effectivePlayer.rob_prom  ?? effectivePlayer.rob ?? 0;
  const tap      = effectivePlayer.tap_prom  ?? effectivePlayer.tap ?? 0;
  const per      = effectivePlayer.per_prom  ?? 0;
  const val      = effectivePlayer.val_prom  ?? 0;
  const pj       = effectivePlayer.pj        ?? 0;
  const mejorPts = effectivePlayer.mejor_pts ?? 0;

  // Totales acumulados — dato principal en el ranking/mérito
  const ptsTotal = effectivePlayer.pts_total ?? 0;
  const rebTotal = effectivePlayer.reb_total ?? 0;
  const astTotal = effectivePlayer.ast_total ?? 0;
  const robTotal = effectivePlayer.rob_total ?? 0;
  const tapTotal = effectivePlayer.tap_total ?? 0;
  const perTotal = effectivePlayer.per_total ?? 0;
  const valTotal = effectivePlayer.val_total ?? 0;

  // Porcentajes
  const pctSimp = effectivePlayer.pct_simples ?? effectivePlayer.tlp ?? 0;
  const pctDob  = effectivePlayer.pct_dobles  ?? effectivePlayer.fgp ?? 0;
  const pctTrip = effectivePlayer.pct_triples ?? effectivePlayer.tpp ?? 0;

  // Totales de tiros
  const scTotal = effectivePlayer.sc_total ?? 0;
  const sfTotal = effectivePlayer.sf_total ?? 0;
  const dcTotal = effectivePlayer.dc_total ?? 0;
  const dfTotal = effectivePlayer.df_total ?? 0;
  const tcTotal = effectivePlayer.tc_total ?? 0;
  const tfTotal = effectivePlayer.tf_total ?? 0;
  const scProm  = effectivePlayer.sc_prom  ?? 0;
  const dcProm  = effectivePlayer.dc_prom  ?? 0;
  const tcProm  = effectivePlayer.tc_prom  ?? 0;

  const hayStats = pj > 0;

  const acento = player.color ?? '#F0B429';
  const fmt1 = v => (Number.isInteger(Number(v)) ? Number(v) : Number(v).toFixed(1));
  const tirosIntentados = scTotal + sfTotal + dcTotal + dfTotal + tcTotal + tfTotal;
  const mezcla = [
    { lbl: 'Libres',  pts: scTotal,     color: '#22D07A' },
    { lbl: 'Dobles',  pts: dcTotal * 2, color: '#F0B429' },
    { lbl: 'Triples', pts: tcTotal * 3, color: '#60A5FA' },
  ];
  const ptsDeTiros = mezcla.reduce((a, m) => a + m.pts, 0);

  const chartData = historialGrafico.length > 0
    ? historialGrafico
    : (hayStats ? [{ match: '–', pts, reb, ast }] : []);

  return (
    <div className="gc-overlay" onClick={onClose}>
      <div className="pp-modal" onClick={e => e.stopPropagation()}>

        {/* ── Card superior (rediseño 23/11) ── */}
        <div className="pp-card pp3-head" style={{
          background: `radial-gradient(120% 90% at 50% 0%, ${hexA(acento, '45')}, transparent 62%), linear-gradient(180deg, ${hexA(acento, '14')}, #0B111C)`,
        }}>
          <div className="pp-card-actions">
            <ShareButton player={player} pts={pts} reb={reb} ast={ast} addToast={addToast}/>
            <button className="gc-close-btn" onClick={onClose}>&times;</button>
          </div>

          <div className="pp3-id">
            <div className="pp-avatar-container pp3-av" style={{ borderColor: acento, boxShadow: `0 0 26px ${hexA(acento, '70')}` }}>
              <EscudoJugador logo={player.logo ?? player.equipoLogo} equipoId={player.equipoId}
                nombre={player.name} color={acento}/>
            </div>
            <div className="pp3-id-txt">
              <div className="pp-name">{player.name}</div>
              <div className="pp-team" style={{ color: acento }}>{player.team}</div>
              <div className="pp3-tags">
                {copaEquipo && <span className="pp3-tag" style={{ color: COPA_COLOR[copaEquipo], background: hexA(COPA_COLOR[copaEquipo], '22') }}>🏆 {COPA_NOMBRE[copaEquipo]}</span>}
                {(record.g + record.p) > 0 && <span className="pp3-tag pp3-tag--rec">{record.g}G · {record.p}P</span>}
                {edadDesde(player.fechaNac) != null && <span className="pp3-tag">🎂 {edadDesde(player.fechaNac)} años</span>}
              </div>
              <ModalTemporadaChip
                temporadas={temporadas}
                mode={mode}
                valor={temporadaVerId}
                onElegir={setTemporadaVerId}
                accent={acento}
              />
            </div>
          </div>

          {hayStats && (
            <>
              <div className="pp3-seg" role="tablist">
                <button type="button" className={vistaStats === 'prom' ? 'is-on' : ''} onClick={() => setVistaStats('prom')}>Por partido</button>
                <button type="button" className={vistaStats === 'total' ? 'is-on' : ''} onClick={() => setVistaStats('total')}>Totales</button>
              </div>
              <div className="pp3-big">
                {[
                  { prom: pts, tot: ptsTotal, lbl: 'Puntos',      color: '#F0B429' },
                  { prom: reb, tot: rebTotal, lbl: 'Rebotes',     color: '#60A5FA' },
                  { prom: ast, tot: astTotal, lbl: 'Asistencias', color: '#22D07A' },
                ].map(s => (
                  <div key={s.lbl} className="pp3-bigc">
                    <b style={{ color: s.color }}>{vistaStats === 'prom' ? fmt1(s.prom) : s.tot}</b>
                    <small>{s.lbl}</small>
                    <em>{vistaStats === 'prom' ? `${s.tot} en total` : `${fmt1(s.prom)} por partido`}</em>
                  </div>
                ))}
              </div>
              <div className="pp3-small">
                {[
                  { prom: rob, tot: robTotal, lbl: 'Robos',      color: '#F97316' },
                  { prom: tap, tot: tapTotal, lbl: 'Tapas',      color: '#A78BFA' },
                  { prom: per, tot: perTotal, lbl: 'Pérdidas',   color: '#94A3B8' },
                  { prom: val, tot: valTotal, lbl: 'Valoración', color: valTotal >= 0 ? '#22D07A' : '#F04060' },
                ].map(s => (
                  <div key={s.lbl} className="pp3-smc">
                    <b style={{ color: s.color }}>{vistaStats === 'prom' ? fmt1(s.prom) : s.tot}</b>
                    <small>{s.lbl}</small>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Cuerpo ── */}
        <div className="pp-body">
          {cargandoOtraTemporada ? (
            <div className="pp-no-stats">
              <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
              <div className="pp-no-stats-title">Cargando temporada…</div>
              <div className="pp-no-stats-sub">Trayendo las estadísticas de esa temporada</div>
            </div>
          ) : hayStats ? (
            <>
              {/* Mejor partido */}
              <div className="pp3-sec">
                <div className="pp3-h"><h4>Mejor partido</h4><span>{pj} {pj === 1 ? 'partido jugado' : 'partidos jugados'}</span></div>
                <div className="pp3-card pp3-best">
                  {mejorPartido?.rival?.logo && (
                    <span className="pp3-esc pp3-esc--lg" style={{ borderColor: mejorPartido.rival.color ?? '#4A566E' }}>
                      <img src={mejorPartido.rival.logo} alt=""/>
                    </span>
                  )}
                  <div className="pp3-best-t">
                    <small style={{ color: acento }}>{mejorPartido ? (mejorPartido.esPlayoff ? mejorPartido.match : `Fecha ${String(mejorPartido.match).replace(/^F/, '')}`) : 'Temporada'}</small>
                    <div>
                      {mejorPartido?.rival ? `vs ${mejorPartido.rival.name}` : 'Su mejor marca'}
                      {mejorPartido && (mejorPartido.pf || mejorPartido.pc) ? (
                        <span className={`pp3-res ${mejorPartido.gano ? 'g' : 'p'}`}>{mejorPartido.gano ? 'G' : 'P'} {mejorPartido.pf}-{mejorPartido.pc}</span>
                      ) : null}
                    </div>
                    {mejorPartido && <span>{mejorPartido.reb} reb · {mejorPartido.ast} ast · {mejorPartido.val} val</span>}
                  </div>
                  <div className="pp3-best-pts" style={{ color: acento }}>{mejorPartido?.pts ?? mejorPts}<small>Puntos</small></div>
                </div>
              </div>

              {/* Tiros */}
              <div className="pp3-sec">
                <div className="pp3-h"><h4>Tiros</h4><span>{tirosIntentados} tiros intentados</span></div>
                <div className="pp3-card">
                  <div className="pp3-anillos">
                    <AnilloTiro label="Libres"  conv={scTotal} fall={sfTotal} pct={pctSimp} color="#22D07A"/>
                    <AnilloTiro label="Dobles"  conv={dcTotal} fall={dfTotal} pct={pctDob}  color="#F0B429"/>
                    <AnilloTiro label="Triples" conv={tcTotal} fall={tfTotal} pct={pctTrip} color="#60A5FA"/>
                  </div>
                  {ptsDeTiros > 0 && (
                    <div className="pp3-mix">
                      <div className="pp3-mix-t"><span>De dónde salen sus puntos</span><span>{ptsDeTiros}</span></div>
                      <div className="pp3-mix-bar">
                        {mezcla.filter(m => m.pts > 0).map(m => <i key={m.lbl} style={{ flex: m.pts, background: m.color }}/>)}
                      </div>
                      <div className="pp3-mix-ley">
                        {mezcla.map(m => (
                          <span key={m.lbl} style={{ '--c': m.color }}>{m.lbl} <b>{m.pts}</b> ({Math.round((m.pts / ptsDeTiros) * 100)}%)</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Gráfico por partido */}
              {chartData.length > 1 && (
                <div className="pp3-sec">
                  <div className="pp3-h"><h4>Rendimiento por fecha</h4><span>Tocá una barra</span></div>
                  {/* El ErrorBoundary local queda como red de contención
                      adicional, aunque ya no dependa de recharts. */}
                  <ErrorBoundary fallback={
                    <div style={{ padding: '20px', textAlign: 'center', color: '#6B7A99', fontSize: 13 }}>
                      No se pudo cargar el gráfico
                    </div>
                  }>
                    <StatsBarChart data={chartData} color={acento}/>
                  </ErrorBoundary>
                </div>
              )}

              {/* Historial por fecha */}
              {historialGrafico.length > 0 && (
                <div>
                  <div style={ST.sectionTitle}>📋 Stats por fecha</div>
                  <StatsPorFecha filas={historialGrafico} mejor={mejorPartido} accent={player.color ?? '#F0B429'}/>
                </div>
              )}
            </>
          ) : (
            <div className="pp-no-stats">
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <div className="pp-no-stats-title">Estadísticas pendientes</div>
              <div className="pp-no-stats-sub">Se actualizarán cuando comience el torneo</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ST = {
  sectionTitle: {
    fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, letterSpacing: 1,
    color: '#EEF2F8', marginBottom: 12, textTransform: 'uppercase',
  },
};