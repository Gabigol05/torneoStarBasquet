import { useState } from 'react';
import { useTournament } from '../context/TournamentContext';

function calcLiders(equipos, statKey, promKey, n = 8) {
  const all = [];
  for (const eq of equipos ?? []) {
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
  const accent = color ?? 'var(--fem2)';
  const [flipped, setFlipped] = useState(false);
  const modeClass = mode === 'masculino' ? 'masc' : 'fem';

  if (!hayDatos) {
    return (
      <div className={`leader-card reveal-on-scroll ${modeClass}`}>
        <div className="lc-stat-label">{emoji} {titulo}</div>
        <div className="lc-empty-state">
          <div className="lc-empty-icon">-</div>
          <div className="lc-empty-txt">Disponible cuando comience el torneo</div>
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

        <div className={`leader-flip-face front leader-card ${modeClass}`}>
          <div className="lc-stat-label">{emoji} {titulo}</div>
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
          <div className="lc-big-num" style={{ color: accent }}>{top.val}</div>
          <div className="lc-sub">{sub}</div>
          {top.prom !== null && (
            <div className="lc-context">
              {top.pj} PJ · {top.prom} prom/partido
            </div>
          )}
          <div className="lc-strength-track">
            <div className="lc-strength-fill" style={{ width: '100%', background: `linear-gradient(90deg, ${accent}, ${accent}88)` }} />
          </div>
          <div className="lc-list">
            {lideres.slice(1, 3).map((l, i) => (
              <div className="lc-row" key={i}>
                <span className="lc-row-rank">{i + 2}</span>
                <span style={{ flex: 1 }}>
                  {(l.nombre ?? '').split(' ').slice(0, 2).join(' ')} - {l.equipo}
                  <div className="lc-row-strength">
                    <div className="lc-row-strength-fill" style={{ width: `${top.val > 0 ? (l.val / top.val) * 100 : 0}%`, background: accent }} />
                  </div>
                </span>
                <span className="lc-row-val">
                  {l.val}
                  {l.prom !== null && <span className="lc-row-sub"> ({l.pj} PJ)</span>}
                </span>
              </div>
            ))}
          </div>
          {lideres.length > 3 && (
            <div className="lc-flip-hint">Ver top {lideres.length} ↻</div>
          )}
        </div>

        <div className={`leader-flip-face back leader-card ${modeClass}`}>
          <div className="lc-stat-label">{emoji} {titulo} · Ranking completo</div>
          <div className="lc-list lc-list-full">
            {lideres.map((l, i) => (
              <div className="lc-row" key={i}>
                <span className="lc-row-rank" style={i === 0 ? { color: accent } : undefined}>{i + 1}</span>
                <span style={{ flex: 1 }}>
                  {(l.nombre ?? '').split(' ').slice(0, 2).join(' ')} - {l.equipo}
                  <div className="lc-row-strength">
                    <div className="lc-row-strength-fill" style={{ width: `${top.val > 0 ? (l.val / top.val) * 100 : 0}%`, background: accent }} />
                  </div>
                </span>
                <span className="lc-row-val">
                  {l.val}
                  {l.prom !== null && <span className="lc-row-sub"> ({l.pj} PJ)</span>}
                </span>
              </div>
            ))}
          </div>
          <div className="lc-flip-hint">Volver ↻</div>
        </div>

      </div>
    </div>
  );
}

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
