/* eslint-disable react/no-unknown-property */
/* Fragmento fiel al HTML original (ver scripts/build_star_components.py). */

export function SeasonKpis() {
  return (
    <>
      {/* GLOBAL KPIs */}
      <section className="page-section" style={{paddingTop: "72px", paddingBottom: "40px"}}>
        <p className="section-eyebrow" style={{color: "var(--gold)"}}>Resumen de Temporada</p>
        <h2 className="section-heading">Temporada <span className="gold">2025</span></h2>
        <div className="kpi-row">
          <div className="kpi-card"><div className="kpi-num" style={{color: "var(--fem2)"}}>8</div><div className="kpi-label">Equipos Fem.</div></div>
          <div className="kpi-card"><div className="kpi-num" style={{color: "var(--masc2)"}}>10</div><div className="kpi-label">Equipos Masc.</div></div>
          <div className="kpi-card"><div className="kpi-num" style={{color: "var(--gold)"}}>7</div><div className="kpi-label">Fechas jugadas</div></div>
          <div className="kpi-card"><div className="kpi-num" style={{color: "var(--white)"}}>62</div><div className="kpi-label">Partidos totales</div></div>
          <div className="kpi-card"><div className="kpi-num" style={{color: "var(--green)"}}>4820</div><div className="kpi-label">Puntos marcados</div></div>
          <div className="kpi-card"><div className="kpi-num" style={{color: "var(--orange)"}}>78</div><div className="kpi-label">Prom. pts/partido</div></div>
          <div className="kpi-card"><div className="kpi-num" style={{color: "var(--gold2)"}}>200+</div><div className="kpi-label">Jugadores inscriptos</div></div>
        </div>
      </section>
    </>
  );
}
