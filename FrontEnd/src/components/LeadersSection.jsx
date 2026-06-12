import { useFemeninoStats } from '../hooks/useFemeninoStats';

// Calcula top N de una stat entre todas las jugadoras
function calcLiders(equipos, statKey, n = 3) {
  const all = [];
  for (const eq of equipos) {
    for (const j of eq.jugadoras) {
      const val = j[statKey] ?? 0;
      if (val > 0) all.push({ nombre: j.nombre, equipo: eq.name, color: eq.color, val });
    }
  }
  return all.sort((a, b) => b.val - a.val).slice(0, n);
}

function getInitials(nombre) {
  return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function LeaderCard({ titulo, emoji, statKey, sub, equipos, color }) {
  const lideres  = calcLiders(equipos, statKey);
  const top      = lideres[0];
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
            <div className="lc-avatar" style={{ background:`${top.color}22`, color:top.color, border:`2px solid ${top.color}55` }}>
              {getInitials(top.nombre)}
            </div>
            <div>
              <div className="lc-player-name">{top.nombre.split(' ').slice(0,2).join(' ')}</div>
              <div className="lc-team-name">{top.equipo}</div>
            </div>
          </div>
          <div className="lc-big-num" style={{ color: color ?? 'var(--fem2)' }}>{top.val}</div>
          <div className="lc-sub">{sub}</div>
          <div className="lc-list">
            {lideres.slice(1).map((l, i) => (
              <div className="lc-row" key={i}>
                <span className="lc-row-rank">{i + 2}</span>
                <span>{l.nombre.split(' ').slice(0,2).join(' ')} — {l.equipo}</span>
                <span className="lc-row-val">{l.val}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const CATEGORIAS = [
  { titulo:'Puntos',       emoji:'🏆', statKey:'pts_prom',    sub:'prom. por partido',  color:'#F0B429' },
  { titulo:'Rebotes',      emoji:'🔁', statKey:'reb_prom',    sub:'prom. por partido',  color:'#60A5FA' },
  { titulo:'Asistencias',  emoji:'🎯', statKey:'ast_prom',    sub:'prom. por partido',  color:'#22D07A' },
  { titulo:'Robos',        emoji:'⚡', statKey:'rob_prom',    sub:'prom. por partido',  color:'#F97316' },
  { titulo:'Tapones',      emoji:'🛡️', statKey:'tap_prom',    sub:'prom. por partido',  color:'#A78BFA' },
  { titulo:'% Triples',    emoji:'🎲', statKey:'pct_triples', sub:'efectividad 3pts',   color:'#FB7185' },
  { titulo:'Valoración',   emoji:'⭐', statKey:'val_prom',    sub:'valoración prom.',   color:'#FCD34D' },
];

export function LeadersSection() {
  const { equipos, isLoading } = useFemeninoStats();

  const hayDatos = equipos.some(e => e.jugadoras.some(j => (j.pj ?? 0) > 0));

  return (
    <>
      <section className="page-section" id="jugadores">
        <p className="section-eyebrow" style={{ color:'var(--gold)' }}>Estadísticas Individuales</p>
        <h2 className="section-heading">Líderes <span className="gold">2026</span></h2>

        <div style={{ marginBottom:24, fontFamily:"'Barlow Condensed'", fontSize:12, fontWeight:700, letterSpacing:3, textTransform:'uppercase', color:'var(--gray)' }}>
          TORNEO FEMENINO
        </div>

        {isLoading ? (
          <div style={{ textAlign:'center', padding:'3rem', color:'#6B7A99' }}>Cargando estadísticas...</div>
        ) : (
          <div className="leaders-grid">
            {CATEGORIAS.map(cat => (
              <LeaderCard key={cat.statKey} {...cat} equipos={equipos} />
            ))}
          </div>
        )}

        <div style={{ margin:'40px 0 24px', fontFamily:"'Barlow Condensed'", fontSize:12, fontWeight:700, letterSpacing:3, textTransform:'uppercase', color:'var(--gray)' }}>
          TORNEO MASCULINO — Próximamente
        </div>
        <div style={{ padding:'40px', textAlign:'center', background:'var(--dark2)', borderRadius:12, border:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize:32, marginBottom:12 }}>🏀</div>
          <div style={{ fontFamily:"'Bebas Neue'", fontSize:20, color:'var(--white)', marginBottom:8 }}>Estadísticas en camino</div>
          <div style={{ fontFamily:"'Barlow Condensed'", fontSize:14, color:'var(--gray)' }}>Se publicarán cuando el torneo masculino comience</div>
        </div>
      </section>
      <div className="full-rule"></div>
    </>
  );
}
