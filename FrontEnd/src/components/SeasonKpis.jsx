import { CounterUp } from './CounterUp';
import { useTournament } from '../context/TournamentContext';

// Props vienen de PageHome que ya tiene el hook cargado
export function SeasonKpis({ equipos = [], partidos = [] }) {
  const { mode } = useTournament();

  if (mode === 'masculino') {
    const MASC = [
      { end:8,    label:'Equipos',          color:'var(--masc2)' },
      { end:7,    label:'Fechas jugadas',    color:'var(--gold)' },
      { end:28,   label:'Partidos jugados',  color:'var(--white)' },
      { end:2240, label:'Puntos marcados',   color:'var(--green)', duration:2500 },
      { end:80,   label:'Prom. pts/partido', color:'var(--orange)' },
      { end:120,  label:'Jugadores',         color:'var(--gold2)', suffix:'+' },
    ];
    return <KpiGrid kpis={MASC} eyebrow="Masculino" title="Torneo Masculino" />;
  }

  // Femenino — calculado desde datos reales
  const finalizados   = partidos.filter(p => p.estado === 'finalizado');
  const numPartidos   = finalizados.length;
  const numJugadoras  = equipos.reduce((a, e) => a + e.jugadoras.length, 0);
  const numEquipos    = equipos.length;

  // Sumar puntos de todos los partidos finalizados
  const totalPts = finalizados.reduce((a, p) =>
    a + (p.puntos_local ?? 0) + (p.puntos_visit ?? 0), 0);
  const promPts = numPartidos > 0
    ? Math.round(totalPts / numPartidos)
    : 0;

  // Fechas distintas jugadas
  const fechasJugadas = new Set(finalizados.map(p => p.fecha_id).filter(Boolean)).size;

  const FEM = [
    { end: numEquipos,   label:'Equipos',          color:'var(--fem2)' },
    { end: fechasJugadas || 0, label:'Fechas jugadas', color:'var(--gold)' },
    { end: numPartidos,  label:'Partidos jugados',  color:'var(--white)' },
    { end: totalPts,     label:'Puntos marcados',   color:'var(--green)', duration:2500 },
    { end: promPts,      label:'Prom. pts/partido', color:'var(--orange)' },
    { end: numJugadoras, label:'Jugadoras',         color:'var(--gold2)', suffix:'+' },
  ];

  return <KpiGrid kpis={FEM} eyebrow="Femenino" title="Torneo Femenino" />;
}

function KpiGrid({ kpis, eyebrow, title }) {
  return (
    <section className="page-section" style={{ paddingTop:'72px', paddingBottom:'40px' }}>
      <p className="section-eyebrow" style={{ color:'var(--gold)' }}>Resumen de Temporada</p>
      <h2 className="section-heading">{title} <span className="gold">2026</span></h2>
      <div className="kpi-row">
        {kpis.map((k, i) => (
          <div className="kpi-card reveal-on-scroll" key={i}>
            <div className="kpi-num" style={{ color: k.color }}>
              <CounterUp end={k.end} suffix={k.suffix} duration={k.duration} />
            </div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
