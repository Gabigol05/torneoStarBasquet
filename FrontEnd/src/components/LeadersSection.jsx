import { useFemeninoStats } from '../hooks/useFemeninoStats';

// Calcula los top 3 de una stat dada entre todas las jugadoras de todos los equipos
function calcLiders(equipos, statKey) {
  const all = [];
  for (const eq of equipos) {
    for (const j of eq.jugadoras) {
      const val = j[statKey] ?? 0;
      all.push({ nombre: j.nombre, equipo: eq.name, color: eq.color, val });
    }
  }
  return all.sort((a, b) => b.val - a.val).slice(0, 3);
}

function getInitials(nombre) {
  return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function LeaderCard({ titulo, emoji, statKey, sub, equipos, color }) {
  const lideres = calcLiders(equipos, statKey);
  const top = lideres[0];
  const hayDatos = top && top.val > 0;

  return (
    <div className="leader-card fem">
      <div className="lc-stat-label">{emoji} {titulo}</div>

      {!hayDatos ? (
        <div className="lc-empty-state">
          <div className="lc-empty-icon">📊</div>
          <div className="lc-empty-txt">Disponible cuando comience el torneo</div>
        </div>
      ) : (
        <>
          <div className="lc-top">
            <div className="lc-avatar" style={{ background: `${top.color}22`, color: top.color, border: `2px solid ${top.color}55` }}>
              {getInitials(top.nombre)}
            </div>
            <div>
              <div className="lc-player-name">{top.nombre.split(' ')[0]} {top.nombre.split(' ')[1] ?? ''}</div>
              <div className="lc-team-name">{top.equipo}</div>
            </div>
          </div>
          <div className="lc-big-num" style={{ color: color ?? 'var(--fem2)' }}>{top.val}</div>
          <div className="lc-sub">{sub}</div>
          <div className="lc-list">
            {lideres.slice(1).map((l, i) => (
              <div className="lc-row" key={i}>
                <span className="lc-row-rank">{i + 2}</span>
                <span>{l.nombre.split(' ')[0]} {l.nombre.split(' ')[1] ?? ''} — {l.equipo}</span>
                <span className="lc-row-val">{l.val}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function LeadersSection() {
  const { equipos } = useFemeninoStats();

  return (
    <>
      <section className="page-section" id="jugadores">
        <p className="section-eyebrow" style={{ color: 'var(--gold)' }}>Estadísticas Individuales</p>
        <h2 className="section-heading">Líderes <span className="gold">2026</span></h2>

        <div style={{ marginBottom: '24px', fontFamily: "'Barlow Condensed'", fontSize: '12px', fontWeight: '700', letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--gray)' }}>
          TORNEO FEMENINO
        </div>

        <div className="leaders-grid">
          <LeaderCard titulo="Líder en Puntos"     emoji="🏆" statKey="pts" sub="puntos por partido"     equipos={equipos} color="var(--fem2)" />
          <LeaderCard titulo="Líder en Rebotes"    emoji="🔁" statKey="reb" sub="rebotes por partido"    equipos={equipos} color="var(--fem2)" />
          <LeaderCard titulo="Líder en Asistencias" emoji="🎯" statKey="ast" sub="asistencias por partido" equipos={equipos} color="var(--fem2)" />
        </div>

        <div style={{ margin: '40px 0 24px', fontFamily: "'Barlow Condensed'", fontSize: '12px', fontWeight: '700', letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--gray)' }}>
          TORNEO MASCULINO — Próximamente
        </div>
        <div style={{ padding: '40px', textAlign: 'center', background: 'var(--dark2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏀</div>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: '20px', color: 'var(--white)', marginBottom: '8px' }}>Estadísticas en camino</div>
          <div style={{ fontFamily: "'Barlow Condensed'", fontSize: '14px', color: 'var(--gray)' }}>Se publicarán cuando el torneo masculino comience</div>
        </div>
      </section>
      <div className="full-rule"></div>
    </>
  );
}
