import { useTournament } from '../context/TournamentContext';

function calcLiders(equipos, statKey, promKey, n = 3) {
  const all = [];
  for (const eq of equipos ?? []) {
    // ⚠️ FIX: antes esto solo se ejecutaba para femenino (el masculino
    // mostraba un bloque estático aparte). Al unificarlo para las dos
    // categorías, hay que blindar contra un equipo sin jugadoras cargadas
    // todavía — de otro modo un `for...of` sobre undefined tira la app entera.
    for (const j of eq.jugadoras ?? []) {
      const val = j[statKey] ?? 0;
      if (val > 0) {
        all.push({
          nombre: j.nombre, equipo: eq.name, color: eq.color, val,
          pj: j.pj ?? 0,
          prom: promKey ? (j[promKey] ?? 0) : null,
        });
      }
    }
  }
  return all.sort((a, b) => b.val - a.val).slice(0, n);
}

function getInitials(nombre) {
  return (nombre ?? '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function LeaderCard({ titulo, emoji, statKey, promKey, sub, equipos, color, mode }) {
  const lideres = calcLiders(equipos, statKey, promKey);
  const top = lideres[0];
  const hayDatos = top && top.val > 0;
  // ⚠️ FIX: la clase quedaba "fem" fija siempre — en masculino se veían las
  // cards con la línea rosa/fem en vez del celeste/masc ya definido en CSS.
  return (
    <div className={`leader-card ${mode === 'masculino' ? 'masc' : 'fem'}`}>
      <div className="lc-stat-label">{emoji} {titulo}</div>
      {!hayDatos ? (
        <div className="lc-empty-state">
          <div className="lc-empty-icon">-</div>
          <div className="lc-empty-txt">Disponible cuando comience el torneo</div>
        </div>
      ) : (
        <>
          <div className="lc-top">
            <div className="lc-avatar"
              style={{ background: `${top.color}22`, color: top.color, border: `2px solid ${top.color}55` }}>
              {getInitials(top.nombre)}
            </div>
            <div>
              <div className="lc-player-name">{(top.nombre ?? '').split(' ').slice(0, 2).join(' ')}</div>
              <div className="lc-team-name">{top.equipo}</div>
            </div>
          </div>
          <div className="lc-big-num" style={{ color: color ?? 'var(--fem2)' }}>{top.val}</div>
          <div className="lc-sub">{sub}</div>
          {top.prom !== null && (
            <div className="lc-context">
              {top.pj} PJ · {top.prom} prom/partido
            </div>
          )}
          <div className="lc-list">
            {lideres.slice(1).map((l, i) => (
              <div className="lc-row" key={i}>
                <span className="lc-row-rank">{i + 2}</span>
                <span>{(l.nombre ?? '').split(' ').slice(0, 2).join(' ')} - {l.equipo}</span>
                <span className="lc-row-val">
                  {l.val}
                  {l.prom !== null && <span className="lc-row-sub"> ({l.pj} PJ)</span>}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Mismas claves para ambas categorías — useFemeninoStats/useMasculinoStats
// devuelven el mismo formato de jugador (pts_total, reb_total, etc.), así que
// esta lista de categorías sirve para las dos sin duplicarla.
const LIDER_CATEGORIAS = [
  { titulo: 'Puntos',      emoji: '', statKey: 'pts_total', promKey: 'pts_prom', sub: 'acumulado en el torneo', color: '#F0B429' },
  { titulo: 'Rebotes',     emoji: '', statKey: 'reb_total', promKey: 'reb_prom', sub: 'acumulado en el torneo', color: '#60A5FA' },
  { titulo: 'Asistencias', emoji: '', statKey: 'ast_total', promKey: 'ast_prom', sub: 'acumulado en el torneo', color: '#22D07A' },
  { titulo: 'Robos',       emoji: '', statKey: 'rob_total', promKey: 'rob_prom', sub: 'acumulado en el torneo', color: '#F97316' },
  { titulo: 'Tapones',     emoji: '', statKey: 'tap_total', promKey: 'tap_prom', sub: 'acumulado en el torneo', color: '#A78BFA' },
  { titulo: '% Triples',   emoji: '', statKey: 'pct_triples', promKey: null,     sub: 'efectividad 3pts',       color: '#FB7185' },
  { titulo: 'Valoracion',  emoji: '', statKey: 'val_total', promKey: 'val_prom', sub: 'acumulado en el torneo', color: '#FCD34D' },
];

export function LeadersSection({ equipos = [], isLoading = false }) {
  const { mode } = useTournament();

  return (
    <>
      <section className="page-section" id="jugadores">
        <p className="section-eyebrow" style={{ color: 'var(--gold)' }}>Estadisticas Individuales</p>
        <h2 className="section-heading">Lideres <span className="gold">2026</span></h2>

        {/* ⚠️ FIX: antes el masculino mostraba siempre "Estadísticas en
            camino" hardcodeado sin importar si ya había datos reales
            cargados. Ahora las dos categorías usan el mismo grid de
            líderes — cada card ya sabe mostrar su propio estado vacío
            ("Disponible cuando comience el torneo") por categoría, así que
            en cuanto se carguen partidos/stats del masculino esto se llena
            solo, sin tocar código de nuevo. */}
        <div style={{ marginBottom: 24, fontFamily: "'Barlow Condensed'", fontSize: 12,
          fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gray)' }}>
          {mode === 'femenino' ? 'TORNEO FEMENINO' : 'TORNEO MASCULINO'}
        </div>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7A99' }}>
            Cargando estadisticas...
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