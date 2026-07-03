import { useTournament } from '../context/TournamentContext';
import { CounterUp } from './CounterUp';

export function SeasonKpis({ equipos = [], partidos = [] }) {
  const { mode } = useTournament();

  // ── MASCULINO — datos hardcodeados hasta que haya BD ─────────────────────
  if (mode === 'masculino') {
<<<<<<< HEAD
    return (
      <section className="page-section" style={{ paddingTop: '72px', paddingBottom: '40px' }}>
        <p className="section-eyebrow" style={{ color: 'var(--gold)' }}>Resumen de Temporada</p>
        <h2 className="section-heading">Torneo Masculino <span className="gold">2026</span></h2>
        <div style={{ textAlign: 'center', padding: '40px', background: 'var(--dark2)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: 'var(--white)', marginBottom: 8 }}>Estadisticas proximamente</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, color: 'var(--gray)' }}>Los datos del torneo masculino se cargaran pronto</div>
        </div>
      </section>
    );
  }

=======
    const MASC = [
      { end: 8,    label: 'Equipos',          color: 'var(--masc2)' },
      { end: 7,    label: 'Fechas jugadas',    color: 'var(--gold)' },
      { end: 28,   label: 'Partidos jugados',  color: 'var(--white)' },
      { end: 2240, label: 'Puntos marcados',   color: 'var(--green)', duration: 2500 },
      { end: 80,   label: 'Prom. pts/partido', color: 'var(--orange)' },
      { end: 120,  label: 'Jugadores',         color: 'var(--gold2)', suffix: '+' },
    ];
    return <KpiGrid kpis={MASC} title="Torneo Masculino"/>;
  }

  // ── FEMENINO — calculado desde datos reales ───────────────────────────────
>>>>>>> cf9a68dca73d046ab4b689891720dfc6ec90da17
  const finalizados  = partidos.filter(p => p.estado === 'finalizado');
  const numPartidos  = finalizados.length;
  const numJugadoras = equipos.reduce((a, e) => a + (e.jugadoras?.length ?? 0), 0);
  const numEquipos   = equipos.length;
  const fechasJug    = new Set(finalizados.map(p => p.fecha_id).filter(Boolean)).size;
<<<<<<< HEAD
  const totalPts     = finalizados.reduce((a, p) => a + (p.puntos_local ?? 0) + (p.puntos_visit ?? 0), 0);
  const promPts      = numPartidos > 0 ? Math.round(totalPts / numPartidos) : 0;

  const FEM = [
    { end: numEquipos,   label: 'Equipos',          color: 'var(--fem2)' },
    { end: fechasJug,    label: 'Fechas jugadas',    color: 'var(--gold)' },
    { end: numPartidos,  label: 'Partidos jugados',  color: 'var(--white)' },
    { end: totalPts,     label: 'Puntos marcados',   color: 'var(--green)', duration: 2500 },
    { end: promPts,      label: 'Prom. pts/partido', color: 'var(--orange)' },
    { end: numJugadoras, label: 'Jugadoras',         color: 'var(--gold2)', suffix: '+' },
  ];

  return (
    <section className="page-section" style={{ paddingTop: '72px', paddingBottom: '40px' }}>
      <p className="section-eyebrow" style={{ color: 'var(--gold)' }}>Resumen de Temporada</p>
      <h2 className="section-heading">Torneo Femenino <span className="gold">2026</span></h2>
=======

  const totalPts = finalizados.reduce((a, p) =>
    a + (p.puntos_local ?? 0) + (p.puntos_visit ?? 0), 0);
  const promPts = numPartidos > 0 ? Math.round(totalPts / numPartidos) : 0;

  const FEM = [
    { end: numEquipos,  label: 'Equipos',          color: 'var(--fem2)' },
    { end: fechasJug,   label: 'Fechas jugadas',    color: 'var(--gold)' },
    { end: numPartidos, label: 'Partidos jugados',  color: 'var(--white)' },
    { end: totalPts,    label: 'Puntos marcados',   color: 'var(--green)', duration: 2500 },
    { end: promPts,     label: 'Prom. pts/partido', color: 'var(--orange)' },
    { end: numJugadoras,label: 'Jugadoras',         color: 'var(--gold2)', suffix: '+' },
  ];

  return <KpiGrid kpis={FEM} title="Torneo Femenino"/>;
}

function KpiGrid({ kpis, title }) {
  return (
    <section className="page-section" style={{ paddingTop: '72px', paddingBottom: '40px' }}>
      <p className="section-eyebrow" style={{ color: 'var(--gold)' }}>Resumen de Temporada</p>
      <h2 className="section-heading">{title} <span className="gold">2026</span></h2>
>>>>>>> cf9a68dca73d046ab4b689891720dfc6ec90da17
      <div className="kpi-row">
        {FEM.map((k, i) => (
          <div className="kpi-card reveal-on-scroll" key={i}>
            <div className="kpi-num" style={{ color: k.color }}>
              <CounterUp end={k.end} suffix={k.suffix} duration={k.duration}/>
            </div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
} 