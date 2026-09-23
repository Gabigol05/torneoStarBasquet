import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { labelPartidoCorto } from '../lib/fechaLabel';
import { edadDesde } from '../lib/edad';
import { useTemporada } from '../context/TemporadaContext';
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

function StatsLineChart({ data, color = '#F0B429' }) {
  const [metric, setMetric] = useState('pts');
  const [activeIdx, setActiveIdx] = useState(null);
  if (!data || data.length < 2) return null;

  const W = 320, H = 150, padY = 16, padX = 10;
  const values = data.map(d => d[metric] ?? 0);
  const max = Math.max(...values, 1);
  const range = max || 1;
  const stepX = (W - padX * 2) / (data.length - 1);
  const pts = data.map((d, i) => ({
    x: padX + i * stepX,
    y: H - padY - ((d[metric] ?? 0) / range) * (H - padY * 2),
    ...d,
  }));
  const idx = activeIdx ?? pts.length - 1;
  const active = pts[idx];
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${H - padY} L ${pts[0].x.toFixed(1)} ${H - padY} Z`;
  const gradId = `pp-area-${color.replace('#', '')}`;

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {CHART_METRICS.map(m => {
          const on = metric === m.key;
          return (
            <button key={m.key} onClick={() => { setMetric(m.key); setActiveIdx(null); }}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 8,
                border: `1.5px solid ${on ? color : 'transparent'}`,
                background: on ? hexA(color, '18') : '#141C2A',
                color: on ? color : '#6B7A99',
                fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12, fontWeight: 700,
                letterSpacing: 1, cursor: 'pointer', transition: 'all .15s',
              }}>
              {m.label}
            </button>
          );
        })}
      </div>
      <div style={{ background: `linear-gradient(160deg, ${hexA(color, '22')}, #1C2535 55%)`, borderRadius: 14, padding: 1 }}>
        <div style={{ background: '#0E1420', borderRadius: 13, padding: '16px 12px 8px' }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 170, overflow: 'visible', display: 'block' }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.35"/>
                <stop offset="100%" stopColor={color} stopOpacity="0"/>
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map(f => {
              const y = padY + f * (H - padY * 2);
              return <line key={f} x1={padX} x2={W - padX} y1={y} y2={y} stroke="#FFFFFF0d" strokeWidth="1"/>;
            })}
            <path d={area} fill={`url(#${gradId})`} stroke="none"/>
            <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            {pts.map((p, i) => (
              <g key={i} style={{ cursor: 'pointer' }}
                onClick={() => setActiveIdx(i)} onMouseEnter={() => setActiveIdx(i)}>
                <circle cx={p.x} cy={p.y} r={8} fill={color} opacity={i === idx ? 0.25 : 0.15}/>
                <circle cx={p.x} cy={p.y} r={i === idx ? 5 : 4} fill={color} stroke="#0E1420" strokeWidth={2}/>
              </g>
            ))}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, padding: '0 2px' }}>
            {data.map((d, i) => (
              <span key={i} style={{ fontSize: 10, color: i === idx ? color : '#4A566E', fontWeight: i === idx ? 700 : 400, fontFamily: "'Barlow Condensed',sans-serif" }}>
                {d.match}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12, background: '#141C2A', border: `1px solid ${hexA(color, '44')}`, borderRadius: 10, padding: '10px 14px' }}>
        <div style={{ color, fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>
          {active.match} · {CHART_METRICS.find(m => m.key === metric).label}
        </div>
        <div style={{ color: '#EEF2F8', fontSize: 22, fontWeight: 700, fontFamily: "'Bebas Neue',sans-serif" }}>
          {active[metric]}
        </div>
      </div>
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
  const temporadaHomeId = temporadaSeleccionadaId[mode];
  const [temporadaVerId, setTemporadaVerId] = useState(temporadaHomeId);
  const [cachePorTemporada, setCachePorTemporada] = useState({});

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
    if (cachePorTemporada[temporadaVerId]) return; // ya cargada (u ocurrió error) — no repetir
    const tablas = TABLAS_POR_MODO[mode] ?? TABLAS_POR_MODO.femenino;
    let cancelado = false;
    (async () => {
      setCachePorTemporada(prev => ({ ...prev, [temporadaVerId]: { loading: true } }));
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
        setCachePorTemporada(prev => ({ ...prev, [temporadaVerId]: {
          loading: false,
          player: { ...player, ...(estRow ?? { pj: 0 }) },
          partidos: partidosDeEsa,
          fechas: fechasDeEsa,
          statsPorPartido: statsPorPartidoDeEsa,
        } }));
      } catch (err) {
        console.error('[PlayerProfileModal] cambio de temporada:', err);
        if (!cancelado) setCachePorTemporada(prev => ({ ...prev, [temporadaVerId]: { loading: false, error: err.message } }));
      }
    })();
    return () => { cancelado = true; };
  }, [isOpen, temporadaVerId, esTemporadaHome, player?.id, player?.equipoId, mode]);

  const vistaOtraTemporada = !esTemporadaHome ? cachePorTemporada[temporadaVerId] : null;
  const cargandoOtraTemporada = !esTemporadaHome && (vistaOtraTemporada?.loading ?? true);
  const effectivePlayer         = (!esTemporadaHome && vistaOtraTemporada?.player) ? vistaOtraTemporada.player : player;
  const effectivePartidos       = !esTemporadaHome ? (vistaOtraTemporada?.partidos ?? [])       : partidos;
  const effectiveFechas         = !esTemporadaHome ? (vistaOtraTemporada?.fechas ?? [])         : fechas;
  const effectiveStatsPorPartido = !esTemporadaHome ? (vistaOtraTemporada?.statsPorPartido ?? {}) : statsPorPartido;

  const historialGrafico = useMemo(() => {
    if (!player || !effectiveStatsPorPartido || !effectivePartidos || !effectiveFechas) return [];
    return effectivePartidos
      .filter(p =>
        p.estado === 'finalizado' &&
        (p.equipo_local_id === player.equipoId || p.equipo_visit_id === player.equipoId)
      )
      .sort((a, b) => (a.fecha_id ?? 0) - (b.fecha_id ?? 0))
      .map(p => {
        const st    = effectiveStatsPorPartido?.[p.id]?.[player.id];
        const fecha = effectiveFechas.find(f => f.id === p.fecha_id);
        return {
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

  const chartData = historialGrafico.length > 0
    ? historialGrafico
    : (hayStats ? [{ match: '–', pts, reb, ast }] : []);

  return (
    <div className="gc-overlay" onClick={onClose}>
      <div className="pp-modal" onClick={e => e.stopPropagation()}>

        {/* ── Card superior ── */}
        <div className="pp-card" style={{ background: `linear-gradient(160deg, ${hexA(player.color ?? '#FF4FA3', '40')}, #1C2535 70%)` }}>
          <div className="pp-card-actions">
            <ShareButton player={player} pts={pts} reb={reb} ast={ast} addToast={addToast}/>
            <button className="gc-close-btn" onClick={onClose}>&times;</button>
          </div>

          {/* Avatar */}
          <div className="pp-avatar-container" style={{ borderColor: player.color ?? 'var(--fem2)', boxShadow: `0 0 22px ${hexA(player.color ?? '#FF4FA3', '70')}` }}>
            <div className="pp-avatar-initials"
              style={{ borderColor: player.color ?? 'var(--fem2)', color: player.color ?? 'var(--fem2)' }}>
              {(player.name ?? '').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
            </div>
          </div>

          <div className="pp-name">{player.name}</div>
          <div className="pp-team" style={{ color: player.color ?? 'var(--fem2)' }}>{player.team}</div>

          <ModalTemporadaChip
            temporadas={temporadas}
            mode={mode}
            valor={temporadaVerId}
            onElegir={setTemporadaVerId}
            accent={player.color ?? '#FF4FA3'}
          />

          {/* ⚠️ Privacidad: se muestra solo la edad, no la fecha de
              nacimiento completa (ver lib/edad.js) — dato público. */}
          {edadDesde(player.fechaNac) != null && (
            <div className="pp-dob">🎂 {edadDesde(player.fechaNac)} años</div>
          )}

          {/* Stats principales */}
          <div className="pp-stats-grid">
            {[
              { val: ptsTotal, prom: pts, lbl: 'PTS', color: '#F0B429' },
              { val: rebTotal, prom: reb, lbl: 'REB', color: '#60A5FA' },
              { val: astTotal, prom: ast, lbl: 'AST', color: '#22D07A' },
              { val: robTotal, prom: rob, lbl: 'ROB', color: '#F97316' },
              { val: tapTotal, prom: tap, lbl: 'TAP', color: '#A78BFA' },
              { val: perTotal, prom: per, lbl: 'PÉR', color: '#6B7A99' },
            ].map(s => (
              <div key={s.lbl} className="pp-stat-box">
                <div className="pp-stat-val" style={{ color: s.color }}>{s.val}</div>
                <div className="pp-stat-lbl">{s.lbl}</div>
                <div className="pp-stat-prom">{s.prom} prom.</div>
              </div>
            ))}
          </div>
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
              {/* Resumen general */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <StatCard val={pj}       lbl="Partidos"       color="#EEF2F8" teamColor={player.color}/>
                <StatCard val={mejorPts} lbl="Mejor partido"  color="#F0B429" sub={mejorPartido ? `vs ${mejorPartido.match}` : 'PTS'} teamColor={player.color}/>
                <StatCard val={valTotal} lbl="VAL total" color={valTotal >= 0 ? '#22D07A' : '#F04060'} sub={`${val} prom.`} teamColor={player.color}/>
              </div>

              {/* ── DESGLOSE DE TIROS ── */}
              <div style={{ marginBottom: 24 }}>
                <div style={ST.sectionTitle}>🏀 Desglose de tiros</div>
                <div style={{ padding: 1, borderRadius: 13,
                  background: player.color ? `linear-gradient(160deg, ${hexA(player.color, '45')}, #1C2535 65%)` : '#1C2535' }}>
                <div style={{
                  background: player.color ? `linear-gradient(160deg, ${hexA(player.color, '0e')}, #0B111C 60%)` : '#0E1420',
                  borderRadius: 12, padding: '16px' }}>
                  <TiroRow
                    label="Tiros Libres (TL)"
                    conv={scTotal} fall={sfTotal} pct={pctSimp}
                    color="#22D07A" promConv={scProm}
                  />
                  <TiroRow
                    label="Dobles (2P)"
                    conv={dcTotal} fall={dfTotal} pct={pctDob}
                    color="#F0B429" promConv={dcProm}
                  />
                  <TiroRow
                    label="Triples (3P)"
                    conv={tcTotal} fall={tfTotal} pct={pctTrip}
                    color="#60A5FA" promConv={tcProm}
                  />

                  {/* Totales */}
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #1C2535', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { lbl: 'TL', conv: scTotal, fall: sfTotal, color: '#22D07A' },
                      { lbl: '2P', conv: dcTotal, fall: dfTotal, color: '#F0B429' },
                      { lbl: '3P', conv: tcTotal, fall: tfTotal, color: '#60A5FA' },
                    ].map(t => (
                      <div key={t.lbl} style={{ flex: 1, minWidth: 80, textAlign: 'center', background: '#141C2A', borderRadius: 8, padding: '8px 6px' }}>
                        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: t.color, lineHeight: 1 }}>
                          {t.conv}<span style={{ color: '#4A566E', fontSize: 14 }}>/{(t.conv ?? 0) + (t.fall ?? 0)}</span>
                        </div>
                        <div style={{ fontSize: 10, color: '#6B7A99', letterSpacing: .5, marginTop: 2 }}>TOTAL {t.lbl}</div>
                      </div>
                    ))}
                  </div>
                </div>
                </div>
              </div>

              {/* Gráfico de puntos por fecha */}
              {chartData.length > 1 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={ST.sectionTitle}>📈 Rendimiento por fecha</div>
                  {/* El ErrorBoundary local queda como red de contención
                      adicional, aunque ya no dependa de recharts. */}
                  <ErrorBoundary fallback={
                    <div style={{ padding: '20px', textAlign: 'center', color: '#6B7A99', fontSize: 13 }}>
                      No se pudo cargar el gráfico
                    </div>
                  }>
                    <StatsLineChart data={chartData} color={player.color || '#F0B429'}/>
                  </ErrorBoundary>
                </div>
              )}

              {/* Historial por fecha */}
              {historialGrafico.length > 0 && (
                <div>
                  <div style={ST.sectionTitle}>📋 Stats por fecha</div>
                  <div className="scrollbar-accent" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr>
                          {['Fecha', 'PTS', 'REB', 'AST', 'VAL', 'TL', '2P', '3P'].map(h => (
                            <th key={h} style={{ color: '#6B7A99', padding: '6px 8px', textAlign: 'center', fontSize: 10, borderBottom: '1px solid #1C2535', whiteSpace: 'nowrap' }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {historialGrafico.map((r, i) => (
                          <tr key={i} style={{
                            background: r.esPlayoff
                              ? 'rgba(240,180,41,.06)'
                              : (i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)'),
                            boxShadow: r.esPlayoff ? 'inset 3px 0 0 #F0B429' : 'none',
                          }}>
                            <td style={{ color: r.esPlayoff ? '#F0B429' : '#6B7A99', padding: '7px 8px', textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: r.esPlayoff ? 12 : 14, whiteSpace: 'nowrap' }}>{r.match}</td>
                            <td style={{ color: '#F0B429', padding: '7px 8px', textAlign: 'center', fontFamily: "'Bebas Neue',sans-serif", fontSize: 17, fontWeight: 700 }}>{r.pts}</td>
                            <td style={{ color: '#EEF2F8', padding: '7px 8px', textAlign: 'center' }}>{r.reb}</td>
                            <td style={{ color: '#EEF2F8', padding: '7px 8px', textAlign: 'center' }}>{r.ast}</td>
                            {/* ⚠️ FIX: columna VAL agregada */}
                            <td style={{ color: r.val >= 0 ? '#22D07A' : '#F04060', padding: '7px 8px', textAlign: 'center' }}>{r.val}</td>
                            <td style={{ color: '#22D07A', padding: '7px 8px', textAlign: 'center', fontSize: 11 }}>{r.sc}/{r.sc + r.sf}</td>
                            <td style={{ color: '#F0B429', padding: '7px 8px', textAlign: 'center', fontSize: 11 }}>{r.dc}/{r.dc + r.df}</td>
                            <td style={{ color: '#60A5FA', padding: '7px 8px', textAlign: 'center', fontSize: 11 }}>{r.tc}/{r.tc + r.tf}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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