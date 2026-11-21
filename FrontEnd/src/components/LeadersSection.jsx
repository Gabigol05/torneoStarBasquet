import { useState } from 'react';
import { EscudoJugador } from './EscudoJugador.jsx';
import { useTournament } from '../context/TournamentContext';

function calcLiders(equipos, statKey, promKey, minAttempts, n = 8) {
  const all = [];
  for (const eq of equipos ?? []) {
    for (const j of eq.jugadoras ?? []) {
      const val = j[statKey] ?? 0;
      // Para porcentajes (ej: % Triples) un jugador con un solo tiro
      // convertido de un solo intento arranca la temporada al 100%, por
      // encima de cualquier tirador real de volumen — se pide un minimo de
      // intentos antes de entrar al ranking de ese stat en particular.
      const intentos = (j.tc_total ?? 0) + (j.tf_total ?? 0);
      if (val > 0 && (!minAttempts || intentos >= minAttempts)) {
        all.push({
          nombre: j.nombre, equipo: eq.name, color: eq.color, val,
          logo: eq.logo, equipoId: eq.id,
          pj: j.pj ?? 0,
          prom: promKey ? (j[promKey] ?? 0) : null,
        });
      }
    }
  }
  return all.sort((a, b) => b.val - a.val).slice(0, n);
}

// Alpha en hex de 2 digitos, concatenado directo al color (igual que en las
// tarjetas de fixture/resultado/votaciones) — evita color-mix()/variables
// CSS con alpha dinamico, que no anda bien en navegadores viejos de celulares.
const hexA = (hex, alpha) => `${hex}${alpha}`;

function nombreCorto(nombre) {
  return (nombre ?? '').split(' ').slice(0, 2).join(' ');
}

// Valor con a lo sumo un decimal (42.857 -> 42.9) y el % en los porcentajes.
function formatVal(val, esPct) {
  const n = Number(val ?? 0);
  const txt = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return esPct ? `${txt}%` : txt;
}

// Fila del ranking: puesto, escudo del equipo, nombre (una línea) y equipo
// debajo, barra relativa al líder y el valor a la derecha.
function FilaLider({ l, puesto, top, esPct, accent, destacada = false }) {
  return (
    <div className={`lc-row${destacada ? ' lc-row--lider' : ''}`}>
      <span className="lc-row-rank" style={destacada ? { color: accent } : undefined}>{puesto}</span>
      <span className="lc-row-escudo" style={{ borderColor: l.color }}>
        <EscudoJugador logo={l.logo} equipoId={l.equipoId} nombre={l.nombre} color={l.color}/>
      </span>
      <span className="lc-row-main">
        <span className="lc-row-name">{nombreCorto(l.nombre)}</span>
        <span className="lc-row-team">{l.equipo}</span>
        <span className="lc-row-strength">
          <span className="lc-row-strength-fill" style={{ width: `${top.val > 0 ? (l.val / top.val) * 100 : 0}%`, background: l.color }} />
        </span>
      </span>
      <span className="lc-row-val">
        {formatVal(l.val, esPct)}
        {l.prom !== null && <span className="lc-row-sub">{l.pj} PJ</span>}
      </span>
    </div>
  );
}

function LeaderCard({ titulo, emoji, statKey, promKey, minAttempts, sub, unidad, equipos, color, mode }) {
  const lideres = calcLiders(equipos, statKey, promKey, minAttempts);
  const top = lideres[0];
  const hayDatos = top && top.val > 0;
  const esPct = statKey.startsWith('pct_');
  // Antes la card se coloreaba segun la CATEGORIA de stat (dorado para
  // Puntos, azul para Rebotes, etc.), sin relacion con quien lidera. Ahora
  // usa el color del EQUIPO del lider — mismo lenguaje visual que fixture,
  // resultado y votaciones.
  const accent = top?.color ?? color ?? 'var(--fem2)';
  const [flipped, setFlipped] = useState(false);
  const modeClass = mode === 'masculino' ? 'masc' : 'fem';
  const cardBg = hayDatos ? {
    background: `linear-gradient(160deg, ${hexA(accent,'70')}, #1C2535 65%)`,
  } : undefined;
  const innerBg = hayDatos ? {
    background: `linear-gradient(160deg, ${hexA(accent,'14')}, #0B111C 60%)`,
  } : undefined;

  // MEJORA (pedido de Alvaro): antes esto era una caja aparte con un
  // guioncito de 32px y un texto gris — se veía deslucido al lado del
  // resto de las tarjetas del sitio. Ahora reusa la MISMA anatomía que la
  // tarjeta con datos (etiqueta, avatar + nombre, número grande, sub) pero
  // atenuada — así encaja con el resto de las tarjetas en vez de ser una
  // caja distinta, y ya no hace falta esperar a que arranque el torneo
  // para que la sección se vea prolija.
  // Fondo: mismo degradé con el color de la categoría que usa la tarjeta
  // CON datos (ver cardBg/innerBg más abajo) — antes esto se quedaba en el
  // gris parejo (--dark3) de una tarjeta cualquiera, plano al lado de las
  // demás. Con menos intensidad de color que la versión con datos (no hay
  // líder real todavía), pero ya no es un gris liso.
  if (!hayDatos) {
    const dim = color ?? '#6B7A99';
    const cardBgEmpty = { background: `linear-gradient(160deg, ${hexA(dim, '40')}, #1C2535 65%)` };
    const innerBgEmpty = { background: `linear-gradient(160deg, ${hexA(dim, '0d')}, #0B111C 60%)` };
    return (
      <div className={`leader-card has-color reveal-on-scroll ${modeClass}`} style={cardBgEmpty}>
        <div className="lc-inner" style={innerBgEmpty}>
          <div className="lc-stat-label">{emoji} {titulo}</div>
          <div className="lc-top">
            <div className="lc-avatar lc-avatar-empty" style={{ borderColor: hexA(dim, '40'), color: dim }}>
              {emoji}
            </div>
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

  return (
    <div
      className="leader-flip reveal-on-scroll"
      role="button"
      tabIndex={0}
      aria-label={`${titulo}: tocar para ver ranking completo`}
      onClick={() => setFlipped(f => !f)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFlipped(f => !f); } }}
    >
      <div className={`leader-flip-inner${flipped ? ' is-flipped' : ''}`}>

        <div className={`leader-flip-face front leader-card has-color ${modeClass}`} style={cardBg}>
          <div className="lc-inner" style={innerBg}>
            <div className="lc-stat-label"><span className="lc-stat-emoji">{emoji}</span>{titulo}</div>
            <div className="lc-top">
              <div className="lc-avatar lc-avatar--escudo"
                style={{ borderColor: top.color, boxShadow: `0 0 18px ${hexA(top.color, '66')}` }}>
                <EscudoJugador logo={top.logo} equipoId={top.equipoId} nombre={top.nombre} color={top.color}/>
              </div>
              <div className="lc-top-info">
                <div className="lc-player-name">{nombreCorto(top.nombre)}</div>
                <div className="lc-team-name" style={{ color: top.color }}>{top.equipo}</div>
              </div>
            </div>
            <div className="lc-big-row">
              <span className="lc-big-num" style={{ color: accent }}>{formatVal(top.val, esPct)}</span>
              {unidad && <span className="lc-big-unit">{unidad}</span>}
            </div>
            <div className="lc-sub">{sub}</div>
            {top.prom !== null && (
              <div className="lc-context">
                {top.pj} PJ · {top.prom} por partido
              </div>
            )}
            <div className="lc-strength-track">
              <div className="lc-strength-fill" style={{ width: '100%', background: `linear-gradient(90deg, ${hexA(accent,'99')}, ${accent})` }} />
            </div>
            <div className="lc-list">
              {lideres.slice(1, 3).map((l, i) => (
                <FilaLider key={i} l={l} puesto={i + 2} top={top} esPct={esPct} accent={accent}/>
              ))}
            </div>
            {lideres.length > 3 && (
              <div className="lc-flip-hint">Ver top {lideres.length} ↻</div>
            )}
          </div>
        </div>

        <div className={`leader-flip-face back leader-card has-color ${modeClass}`} style={cardBg}>
          <div className="lc-inner" style={innerBg}>
            <div className="lc-stat-label"><span className="lc-stat-emoji">{emoji}</span>{titulo} · Top {lideres.length}</div>
            <div className="lc-list lc-list-full">
              {lideres.map((l, i) => (
                <FilaLider key={i} l={l} puesto={i + 1} top={top} esPct={esPct} accent={accent} destacada={i === 0}/>
              ))}
            </div>
            <div className="lc-flip-hint">Volver ↻</div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ⚠️ FIX: los 7 emoji estaban vacíos ('') desde siempre — cada tarjeta
// mostraba solo el título pelado ("PUNTOS", "REBOTES"...), sin ícono al
// lado, en las dos versiones de la tarjeta (con y sin datos).
const LIDER_CATEGORIAS = [
  { titulo: 'Puntos',      emoji: '🏀', statKey: 'pts_total', promKey: 'pts_prom', unidad: 'PTS', sub: 'acumulado en el torneo', color: '#F0B429' },
  { titulo: 'Rebotes',     emoji: '🔁', statKey: 'reb_total', promKey: 'reb_prom', unidad: 'REB', sub: 'acumulado en el torneo', color: '#60A5FA' },
  { titulo: 'Asistencias', emoji: '🤝', statKey: 'ast_total', promKey: 'ast_prom', unidad: 'AST', sub: 'acumulado en el torneo', color: '#22D07A' },
  { titulo: 'Robos',       emoji: '🖐️', statKey: 'rob_total', promKey: 'rob_prom', unidad: 'ROB', sub: 'acumulado en el torneo', color: '#F97316' },
  { titulo: 'Tapones',     emoji: '🛡️', statKey: 'tap_total', promKey: 'tap_prom', unidad: 'TAP', sub: 'acumulado en el torneo', color: '#A78BFA' },
  { titulo: '% Triples',   emoji: '🎯', statKey: 'pct_triples', promKey: null,     sub: 'efectividad 3pts',       color: '#FB7185', minAttempts: 5 },
  { titulo: 'Valoración',  emoji: '⭐', statKey: 'val_total', promKey: 'val_prom', unidad: 'VAL', sub: 'acumulado en el torneo', color: '#FCD34D' },
];

export function LeadersSection({ equipos = [], isLoading = false }) {
  const { mode } = useTournament();

  return (
    <>
      <section className="page-section" id="jugadores">
        <p className="section-eyebrow" style={{ color: 'var(--gold)' }}>Estadísticas individuales</p>
        <h2 className="section-heading">Líderes <span className="gold">2026</span></h2>

        <div style={{ marginBottom: 24, fontFamily: "'Barlow Condensed'", fontSize: 12,
          fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gray)' }}>
          {mode === 'femenino' ? 'TORNEO FEMENINO' : 'TORNEO MASCULINO'}
        </div>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7A99' }}>
            Cargando estadísticas...
          </div>
        ) : (
          <div className="leaders-grid">
            {LIDER_CATEGORIAS.map(cat => (
              <LeaderCard key={cat.statKey} {...cat} equipos={equipos} mode={mode}/>
            ))}
          </div>
        )}
      </section>
      <div className="full-rule"/>
    </>
  );
}
