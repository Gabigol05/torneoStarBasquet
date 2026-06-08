import { CounterUp } from './CounterUp';
import { useTournament } from '../context/TournamentContext';
import { useFemeninoStats } from '../hooks/useFemeninoStats';

const KPIS = {
  masculino: [
    { end: 8,    label: 'Equipos Masc.',      color: 'var(--masc2)' },
    { end: 7,    label: 'Fechas jugadas',      color: 'var(--gold)' },
    { end: 28,   label: 'Partidos jugados',    color: 'var(--white)' },
    { end: 2240, label: 'Puntos marcados',     color: 'var(--green)', duration: 2500 },
    { end: 80,   label: 'Prom. pts/partido',   color: 'var(--orange)' },
    { end: 120,  label: 'Jugadores inscriptos',color: 'var(--gold2)', suffix: '+', duration: 2000 },
  ],
  femenino: [
    { end: 10,   label: 'Equipos Fem.',        color: 'var(--fem2)' },
    { end: 7,    label: 'Fechas jugadas',       color: 'var(--gold)' },
    { end: 34,   label: 'Partidos jugados',     color: 'var(--white)' },
    { end: 2580, label: 'Puntos marcados',      color: 'var(--green)', duration: 2500 },
    { end: 76,   label: 'Prom. pts/partido',    color: 'var(--orange)' },
    { end: 180,  label: 'Jugadoras inscriptas', color: 'var(--gold2)', suffix: '+', duration: 2000 },
  ],
};

export function SeasonKpis() {
  const { mode } = useTournament();
  const { equipos } = useFemeninoStats();
  const kpis = KPIS[mode];

  // En femenino, el nro de jugadoras viene de los datos reales
  const jugadorasReales = mode === 'femenino'
    ? equipos.reduce((acc, eq) => acc + eq.jugadoras.length, 0)
    : null;

  return (
    <section className="page-section" style={{ paddingTop: '72px', paddingBottom: '40px' }}>
      <p className="section-eyebrow" style={{ color: 'var(--gold)' }}>Resumen de Temporada</p>
      <h2 className="section-heading">
        {mode === 'femenino' ? '♀ Torneo' : '♂ Torneo'} <span className="gold">Femenino 2026</span>
      </h2>

      <div className="kpi-row" key={mode}>
        {kpis.map((k, i) => {
          const val = (mode === 'femenino' && i === kpis.length - 1 && jugadorasReales)
            ? jugadorasReales
            : k.end;
          return (
            <div className="kpi-card reveal-on-scroll" key={i}>
              <div className="kpi-num" style={{ color: k.color }}>
                <CounterUp end={val} suffix={k.suffix} duration={k.duration} />
              </div>
              <div className="kpi-label">{k.label}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
