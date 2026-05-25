/* eslint-disable react/no-unknown-property */
/* Fragmento fiel al HTML original (ver scripts/build_star_components.py). */

import { CounterUp } from './CounterUp';

export function SeasonKpis() {
  return (
    <>
      {/* GLOBAL KPIs */}
      <section className="page-section" style={{ paddingTop: "72px", paddingBottom: "40px" }}>
        <p className="section-eyebrow" style={{ color: "var(--gold)" }}>Resumen de Temporada</p>
        <h2 className="section-heading">Temporada <span className="gold">2026</span></h2>
        <div className="kpi-row">
          <div className="kpi-card"><div className="kpi-num" style={{ color: "var(--fem2)" }}><CounterUp end="8" /></div><div className="kpi-label">Equipos Fem.</div></div>
          <div className="kpi-card"><div className="kpi-num" style={{ color: "var(--masc2)" }}><CounterUp end="10" /></div><div className="kpi-label">Equipos Masc.</div></div>
          <div className="kpi-card"><div className="kpi-num" style={{ color: "var(--gold)" }}><CounterUp end="7" /></div><div className="kpi-label">Fechas jugadas</div></div>
          <div className="kpi-card"><div className="kpi-num" style={{ color: "var(--white)" }}><CounterUp end="62" /></div><div className="kpi-label">Partidos totales</div></div>
          <div className="kpi-card"><div className="kpi-num" style={{ color: "var(--green)" }}><CounterUp end="4820" duration={2500} /></div><div className="kpi-label">Puntos marcados</div></div>
          <div className="kpi-card"><div className="kpi-num" style={{ color: "var(--orange)" }}><CounterUp end="78" /></div><div className="kpi-label">Prom. pts/partido</div></div>
          <div className="kpi-card"><div className="kpi-num" style={{ color: "var(--gold2)" }}><CounterUp end="200" suffix="+" duration={2000} /></div><div className="kpi-label">Jugadores inscriptos</div></div>
        </div>
      </section>
    </>
  );
}
