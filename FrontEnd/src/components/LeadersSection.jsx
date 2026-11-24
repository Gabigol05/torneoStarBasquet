import { useEffect, useMemo, useState } from 'react';
import { EscudoJugador } from './EscudoJugador.jsx';
import { useTournament } from '../context/TournamentContext';
import { useStats } from '../context/StatsContext';
import { logoDeEquipo } from '../lib/escudos';
import { supabase, isConfigured } from '../lib/supabase';

const TABLAS_POR_MODO = {
  femenino:  { statsPartido: 'stats_partido_femenino',  idCol: 'jugadora_id' },
  masculino: { statsPartido: 'stats_partido_masculino', idCol: 'jugador_id' },
};

// Valor de UN partido para cada categoría (columnas de stats_partido_*).
const VALOR_PARTIDO = {
  pts_total: st => st.pts ?? 0,
  reb_total: st => (st.rd ?? 0) + (st.ro ?? 0),
  ast_total: st => st.as_ ?? 0,
  rob_total: st => st.rb ?? 0,
  tap_total: st => st.tp ?? 0,
  val_total: st => st.val ?? 0,
};
const COLS_JUGO = ['pts','rd','ro','as_','sc','sf','dc','df','tc','tf','val','rb','tp','pe','fp'];

function calcLiders(equipos, statKey, promKey, minAttempts, n = 10) {
  const all = [];
  for (const eq of equipos ?? []) {
    for (const j of eq.jugadoras ?? []) {
      const val = j[statKey] ?? 0;
      // Para porcentajes se pide un mínimo de intentos (ver % Triples abajo).
      const intentos = (j.tc_total ?? 0) + (j.tf_total ?? 0);
      if (val > 0 && (!minAttempts || intentos >= minAttempts)) {
        all.push({
          id: j.id,
          nombre: j.nombre, equipo: eq.name, color: eq.color ?? '#6B7A99', val,
          logo: eq.logo, equipoId: eq.id,
          pj: j.pj ?? 0,
          prom: promKey ? (j[promKey] ?? 0) : null,
          mejorPts: j.mejor_pts ?? 0,
        });
      }
    }
  }
  return all.sort((a, b) => b.val - a.val).slice(0, n);
}

function nombreCorto(nombre) {
  return (nombre ?? '').split(' ').slice(0, 2).join(' ');
}

// Valor con a lo sumo un decimal (42.857 -> 42.9) y el % en los porcentajes.
function formatVal(val, esPct) {
  const n = Number(val ?? 0);
  const txt = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return esPct ? `${txt}%` : txt;
}

// Stats partido a partido de los líderes (solo de esas personas, no de todo
// el torneo: la tabla completa es pesada y por eso ya no la baja el hook).
function useHistorialLideres(ids, mode, partidos, fechas) {
  const [rows, setRows] = useState({});
  const finalizados = useMemo(
    () => (partidos ?? []).filter(p => p.estado === 'finalizado'),
    [partidos]
  );
  const idsKey = [...ids].sort((a, b) => a - b).join(',');
  const partKey = finalizados.map(p => p.id).join(',');

  useEffect(() => {
    if (!isConfigured || !idsKey || !partKey) { setRows({}); return; }
    const t = TABLAS_POR_MODO[mode] ?? TABLAS_POR_MODO.femenino;
    let cancelado = false;
    supabase.from(t.statsPartido)
      .select(`partido_id,${t.idCol},${COLS_JUGO.join(',')}`)
      .in(t.idCol, idsKey.split(',').map(Number))
      .in('partido_id', partKey.split(',').map(Number))
      .then(({ data, error }) => {
        if (cancelado) return;
        if (error) { console.warn('[LeadersSection] stats por partido:', error.message); return; }
        const m = {};
        for (const r of (data ?? [])) {
          const id = r[t.idCol];
          (m[id] ??= {})[r.partido_id] = r;
        }
        setRows(m);
      });
    return () => { cancelado = true; };
  }, [idsKey, partKey, mode]);

  // Partidos en orden (fecha, playoffs al final) para armar las barras.
  const ordenados = useMemo(() => {
    const num = id => (fechas ?? []).find(f => f.id === id)?.numero ?? 0;
    return [...finalizados].sort((a, b) =>
      (!!a.es_playoff - !!b.es_playoff) || (num(a.fecha_id) - num(b.fecha_id)) || ((a.llave ?? 0) - (b.llave ?? 0))
    ).map(p => ({ p, numero: num(p.fecha_id) }));
  }, [finalizados, fechas]);

  return { rows, ordenados };
}

function serieJugador(jugadorId, equipoId, statKey, rows, ordenados) {
  const porPartido = rows[jugadorId];
  const fn = VALOR_PARTIDO[statKey];
  if (!porPartido || !fn) return [];
  const out = [];
  for (const { p, numero } of ordenados) {
    if (p.equipo_local_id !== equipoId && p.equipo_visit_id !== equipoId) continue;
    const st = porPartido[p.id];
    if (!st || !COLS_JUGO.some(k => (Number(st[k]) || 0) !== 0)) continue;
    out.push({ v: Number(fn(st)) || 0, lbl: p.es_playoff ? 'PO' : `F${numero}` });
  }
  return out;
}

function Barras({ serie }) {
  const ult = serie.slice(-8);
  const max = Math.max(...ult.map(d => d.v), 0);
  const iMax = ult.findIndex(d => d.v === max);
  return (
    <div className="ld-bars">
      {ult.map((d, i) => {
        const h = max > 0 ? Math.max(6, (d.v / max) * 46) : 6;
        const cls = `ld-b${i === iMax ? ' top' : ''}${i === ult.length - 1 ? ' last' : ''}`;
        return (
          <div key={i} className={cls}>
            <span>{formatVal(d.v)}</span>
            <i style={{ height: `${h}px` }}/>
            <em>{d.lbl}</em>
          </div>
        );
      })}
    </div>
  );
}

function FilaLider({ l, puesto, top, esPct }) {
  return (
    <div className="ld-row">
      <span className={`ld-row-p ld-row-p--${puesto}`}>{puesto}</span>
      <span className="ld-row-esc" style={{ borderColor: l.color }}>
        <EscudoJugador logo={l.logo} equipoId={l.equipoId} nombre={l.nombre} color={l.color}/>
      </span>
      <span className="ld-row-nm">
        <b>{nombreCorto(l.nombre)}</b>
        <span style={{ color: l.color }}>{l.equipo}</span>
        <i><u style={{ width: `${top.val > 0 ? (l.val / top.val) * 100 : 0}%`, background: l.color }}/></i>
      </span>
      <span className="ld-row-v">
        <b>{formatVal(l.val, esPct)}</b>
        {l.prom !== null && <small>{formatVal(l.prom)} x PJ</small>}
      </span>
    </div>
  );
}

function LeaderCard({ titulo, emoji, statKey, promKey, minAttempts, sub, unidad, equipos, color, mode, rows, ordenados }) {
  const lideres = calcLiders(equipos, statKey, promKey, minAttempts);
  const top = lideres[0];
  const hayDatos = top && top.val > 0;
  const esPct = statKey.startsWith('pct_');
  const [abierta, setAbierta] = useState(false);
  const modeClass = mode === 'masculino' ? 'masc' : 'fem';

  if (!hayDatos) {
    const dim = color ?? '#6B7A99';
    return (
      <div className={`leader-card has-color reveal-on-scroll ${modeClass}`}
        style={{ background: `linear-gradient(160deg, ${dim}40, #1C2535 65%)` }}>
        <div className="lc-inner" style={{ background: `linear-gradient(160deg, ${dim}0d, #0B111C 60%)` }}>
          <div className="lc-stat-label">{emoji} {titulo}</div>
          <div className="lc-top">
            <div className="lc-avatar lc-avatar-empty" style={{ borderColor: `${dim}40`, color: dim }}>{emoji}</div>
            <div>
              <div className="lc-player-name lc-empty-muted">Sin datos aún</div>
              <div className="lc-team-name">—</div>
            </div>
          </div>
          <div className="lc-big-num lc-empty-muted" style={{ color: dim }}>—</div>
          <div className="lc-sub">{sub}</div>
          <div className="lc-empty-txt" style={{ marginTop: 12 }}>Disponible cuando arranque el torneo</div>
        </div>
      </div>
    );
  }

  const serie = serieJugador(top.id, top.equipoId, statKey, rows, ordenados);
  const recordSerie = serie.length ? Math.max(...serie.map(d => d.v)) : null;
  const record = recordSerie ?? (statKey === 'pts_total' && top.mejorPts ? top.mejorPts : null);
  const segundo = lideres[1];
  const dif = segundo ? top.val - segundo.val : null;
  const marca = top.logo || logoDeEquipo(top.equipoId);
  const visibles = abierta ? lideres.slice(1) : lideres.slice(1, 5);

  return (
    <div className={`ld reveal-on-scroll ${modeClass}`} style={{ '--a': color, '--t': top.color }}>
      <div className="ld-top" style={{ background: `radial-gradient(120% 120% at 100% 0%, ${top.color}61, transparent 60%)` }}>
        {marca && <img className="ld-marca" src={marca} alt="" loading="lazy" aria-hidden="true"/>}
        <div className="ld-cat">
          <b><i/>{titulo}</b>
          <em>Líder</em>
        </div>
        <div className="ld-hero">
          <div className="ld-av" style={{ borderColor: top.color, boxShadow: `0 0 22px ${top.color}8c` }}>
            <EscudoJugador logo={top.logo} equipoId={top.equipoId} nombre={top.nombre} color={top.color}/>
            <span className="ld-n1">1</span>
          </div>
          <div className="ld-quien">
            <b>{nombreCorto(top.nombre)}</b>
            <span style={{ color: top.color }}>{top.equipo}</span>
          </div>
        </div>
        <div className="ld-num">
          <span className="ld-big">{formatVal(top.val, esPct)}{unidad && <small>{unidad}</small>}</span>
          <div className="ld-mini">
            {top.prom !== null && <div><b>{formatVal(top.prom)}</b><small>Por partido</small></div>}
            <div><b>{top.pj}</b><small>PJ</small></div>
            {record !== null && <div><b>{formatVal(record)}</b><small>Récord</small></div>}
          </div>
        </div>
        {serie.length > 1 && (
          <div className="ld-graf">
            <div className="ld-graf-t">
              <span>Últimos {Math.min(serie.length, 8)} partidos</span>
              <span>Máx. {formatVal(Math.max(...serie.slice(-8).map(d => d.v)))}</span>
            </div>
            <Barras serie={serie}/>
          </div>
        )}
      </div>

      {dif !== null && (
        <div className="ld-dif">
          {dif > 0
            ? <>Le saca <b>+{formatVal(dif, esPct)}</b> al segundo</>
            : <>Empatado con <b>{nombreCorto(segundo.nombre)}</b></>}
        </div>
      )}

      {visibles.length > 0 && (
        <div className="ld-list">
          {visibles.map((l, i) => (
            <FilaLider key={l.id ?? i} l={l} puesto={i + 2} top={top} esPct={esPct}/>
          ))}
        </div>
      )}

      {lideres.length > 5 && (
        <button type="button" className="ld-pie" onClick={() => setAbierta(a => !a)}>
          <span>{abierta ? 'Ver menos' : `Ver top ${lideres.length}`}</span>
          <span>{abierta ? '↑' : '→'}</span>
        </button>
      )}
    </div>
  );
}

const LIDER_CATEGORIAS = [
  { titulo: 'Puntos',      emoji: '🏀', statKey: 'pts_total', promKey: 'pts_prom', unidad: 'PTS', sub: 'acumulado en el torneo', color: '#F0B429' },
  { titulo: 'Rebotes',     emoji: '🔁', statKey: 'reb_total', promKey: 'reb_prom', unidad: 'REB', sub: 'acumulado en el torneo', color: '#60A5FA' },
  { titulo: 'Asistencias', emoji: '🤝', statKey: 'ast_total', promKey: 'ast_prom', unidad: 'AST', sub: 'acumulado en el torneo', color: '#22D07A' },
  { titulo: 'Robos',       emoji: '🖐️', statKey: 'rob_total', promKey: 'rob_prom', unidad: 'ROB', sub: 'acumulado en el torneo', color: '#F97316' },
  { titulo: 'Tapones',     emoji: '🛡️', statKey: 'tap_total', promKey: 'tap_prom', unidad: 'TAP', sub: 'acumulado en el torneo', color: '#A78BFA' },
  // % Triples sacada (pedido de Alvaro, 21/11): con pocos intentos el ranking
  // mostraba porcentajes engañosos (ej. 60% con 3 de 5).
  // { titulo: '% Triples',   emoji: '🎯', statKey: 'pct_triples', promKey: null,     sub: 'efectividad 3pts',       color: '#FB7185', minAttempts: 5 },
  { titulo: 'Valoración',  emoji: '⭐', statKey: 'val_total', promKey: 'val_prom', unidad: 'VAL', sub: 'acumulado en el torneo', color: '#FCD34D' },
];

export function LeadersSection({ equipos = [], isLoading = false }) {
  const { mode } = useTournament();
  const { partidos, fechas } = useStats() ?? {};

  // Ids de los líderes de cada categoría (para pedir sus partidos de una vez).
  const idsLideres = useMemo(() => {
    const s = new Set();
    for (const c of LIDER_CATEGORIAS) {
      const t = calcLiders(equipos, c.statKey, c.promKey, c.minAttempts, 1)[0];
      if (t?.id != null) s.add(t.id);
    }
    return s;
  }, [equipos]);
  const { rows, ordenados } = useHistorialLideres(idsLideres, mode, partidos, fechas);

  return (
    <>
      <section className="page-section" id="jugadores">
        <p className="section-eyebrow" style={{ color: 'var(--gold)' }}>
          Estadísticas individuales · {mode === 'femenino' ? 'Torneo femenino' : 'Torneo masculino'}
        </p>
        <h2 className="section-heading">Líderes <span className="gold">2026</span></h2>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7A99' }}>
            Cargando estadísticas...
          </div>
        ) : (
          <div className="leaders-grid ld-grid">
            {LIDER_CATEGORIAS.map(cat => (
              <LeaderCard key={cat.statKey} {...cat} equipos={equipos} mode={mode}
                rows={rows} ordenados={ordenados}/>
            ))}
          </div>
        )}
      </section>
      <div className="full-rule"/>
    </>
  );
}
