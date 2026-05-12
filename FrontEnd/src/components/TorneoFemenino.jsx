/* eslint-disable react/no-unknown-property */
/* Fragmento fiel al HTML original (ver scripts/build_star_components.py). */

export function TorneoFemenino() {
  return (
    <>
      <div className="torneo-section fem" id="femenino">
      <div className="torneo-inner">

        <div className="gender-header">
          <div>
            <div className="gender-pill fem">♀ Categoría Femenina</div>
            <div className="gender-title fem">TORNEO<br />FEMENINO</div>
          </div>
          <div style={{textAlign: "right", paddingTop: "8px"}}>
            <div style={{fontFamily: "'Barlow Condensed',sans-serif", fontSize: "12px", fontWeight: "700", letterSpacing: "2px", color: "var(--gray)", textTransform: "uppercase"}}>Fecha 7 de 10 · Temporada Regular</div>
            <div style={{fontFamily: "'Bebas Neue',sans-serif", fontSize: "28px", letterSpacing: "2px", color: "var(--fem2)", marginTop: "4px"}}>6 equipos clasifican a playoffs</div>
          </div>
        </div>

        {/* TABS */}
        <div className="tab-nav">
          <button type="button" className="tab-btn active-fem" data-star-tab="f:tabla">📊 Tabla</button>
          <button type="button" className="tab-btn" data-star-tab="f:fixtures">📅 Fixture</button>
          <button type="button" className="tab-btn" data-star-tab="f:jugadoras">👤 Jugadoras</button>
          <button type="button" className="tab-btn" data-star-tab="f:equipos-f">🏀 Equipos</button>
        </div>

        {/* TABLA FEMENINA */}
        <div className="tab-pane active" id="f-tabla">
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th style={{textAlign: "left", paddingLeft: "20px"}}># Equipo</th>
                <th>PJ</th><th>G</th><th>P</th><th>PF</th><th>PC</th><th>DIF</th><th title="Porcentaje">%</th><th>PTS</th><th>Forma</th>
              </tr></thead>
              <tbody>
                <tr className="highlight-row">
                  <td className="team-cell"><span className="pos-num top3">1</span><span className="team-crest t-red">LL</span><span className="team-name-txt">Las Leonas</span></td>
                  <td>7</td><td>6</td><td>1</td><td>518</td><td>431</td><td className="green">+87</td><td className="pct-td">.857</td><td className="pts-td" style={{color: "var(--fem2)"}}>13</td>
                  <td><div className="form-badges"><span className="fb W">G</span><span className="fb W">G</span><span className="fb W">G</span><span className="fb L">P</span><span className="fb W">G</span></div></td>
                </tr>
                <tr className="highlight-row">
                  <td className="team-cell"><span className="pos-num top3">2</span><span className="team-crest t-purple">FD</span><span className="team-name-txt">Fuego Divino</span></td>
                  <td>7</td><td>5</td><td>2</td><td>492</td><td>458</td><td className="green">+34</td><td className="pct-td">.714</td><td className="pts-td" style={{color: "var(--fem2)"}}>12</td>
                  <td><div className="form-badges"><span className="fb W">G</span><span className="fb L">P</span><span className="fb W">G</span><span className="fb W">G</span><span className="fb W">G</span></div></td>
                </tr>
                <tr className="highlight-row">
                  <td className="team-cell"><span className="pos-num top3">3</span><span className="team-crest t-cyan">LP</span><span className="team-name-txt">Las Panteras</span></td>
                  <td>7</td><td>5</td><td>2</td><td>480</td><td>462</td><td className="green">+18</td><td className="pct-td">.714</td><td className="pts-td" style={{color: "var(--fem2)"}}>12</td>
                  <td><div className="form-badges"><span className="fb W">G</span><span className="fb W">G</span><span className="fb L">P</span><span className="fb W">G</span><span className="fb L">P</span></div></td>
                </tr>
                <tr>
                  <td className="team-cell"><span className="pos-num">4</span><span className="team-crest t-orange">LA</span><span className="team-name-txt">Las Águilas</span></td>
                  <td>7</td><td>4</td><td>3</td><td>461</td><td>464</td><td className="red">-3</td><td className="pct-td">.571</td><td className="pts-td" style={{color: "var(--fem2)"}}>11</td>
                  <td><div className="form-badges"><span className="fb L">P</span><span className="fb W">G</span><span className="fb W">G</span><span className="fb L">P</span><span className="fb W">G</span></div></td>
                </tr>
                <tr>
                  <td className="team-cell"><span className="pos-num">5</span><span className="team-crest t-teal">LR</span><span className="team-name-txt">Las Rockets</span></td>
                  <td>7</td><td>4</td><td>3</td><td>455</td><td>468</td><td className="red">-13</td><td className="pct-td">.571</td><td className="pts-td" style={{color: "var(--fem2)"}}>11</td>
                  <td><div className="form-badges"><span className="fb W">G</span><span className="fb L">P</span><span className="fb L">P</span><span className="fb W">G</span><span className="fb W">G</span></div></td>
                </tr>
                <tr>
                  <td className="team-cell"><span className="pos-num">6</span><span className="team-crest t-lime">LV</span><span className="team-name-txt">Las Víboras</span></td>
                  <td>7</td><td>3</td><td>4</td><td>438</td><td>478</td><td className="red">-40</td><td className="pct-td">.429</td><td className="pts-td" style={{color: "var(--fem2)"}}>10</td>
                  <td><div className="form-badges"><span className="fb L">P</span><span className="fb W">G</span><span className="fb L">P</span><span className="fb L">P</span><span className="fb W">G</span></div></td>
                </tr>
                <tr>
                  <td className="team-cell"><span className="pos-num">7</span><span className="team-crest t-yellow">LG</span><span className="team-name-txt">Las Guerreras</span></td>
                  <td>7</td><td>2</td><td>5</td><td>419</td><td>501</td><td className="red">-82</td><td className="pct-td">.286</td><td className="pts-td" style={{color: "var(--fem2)"}}>9</td>
                  <td><div className="form-badges"><span className="fb L">P</span><span className="fb L">P</span><span className="fb W">G</span><span className="fb L">P</span><span className="fb L">P</span></div></td>
                </tr>
                <tr>
                  <td className="team-cell"><span className="pos-num">8</span><span className="team-crest t-blue">LB</span><span className="team-name-txt">Las Brasas</span></td>
                  <td>7</td><td>1</td><td>6</td><td>401</td><td>521</td><td className="red">-120</td><td className="pct-td">.143</td><td className="pts-td" style={{color: "var(--fem2)"}}>8</td>
                  <td><div className="form-badges"><span className="fb L">P</span><span className="fb L">P</span><span className="fb L">P</span><span className="fb L">P</span><span className="fb W">G</span></div></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{fontSize: "11px", color: "var(--gray2)", fontFamily: "'Barlow Condensed'", letterSpacing: "2px", textTransform: "uppercase", padding: "10px 0 0", textAlign: "right"}}>★ Top 6 clasifican a playoffs · PJ=Partidos Jugados · G=Ganados · P=Perdidos · PF=Puntos a Favor · PC=Puntos en Contra</p>
        </div>

        {/* FIXTURE FEMENINO */}
        <div className="tab-pane" id="f-fixtures">
          <div className="fixture-round-label">Fecha 7 — Resultados</div>
          <div className="matches-grid">
            <div className="match-card fem">
              <div className="mc-header"><span className="mc-date">Sáb 14 Jun · 16:00</span><span className="mc-status s-fin">Final</span></div>
              <div className="mc-teams">
                <div className="mc-team"><div className="mc-team-name winner">Las Leonas</div></div>
                <div className="mc-score-box"><div className="mc-score" style={{color: "var(--fem2)"}}>72 – 61</div></div>
                <div className="mc-team"><div className="mc-team-name">Fuego Divino</div></div>
              </div>
              <div className="mc-venue">📍 Polideportivo Municipal</div>
            </div>
            <div className="match-card fem">
              <div className="mc-header"><span className="mc-date">Sáb 14 Jun · 17:30</span><span className="mc-status s-fin">Final</span></div>
              <div className="mc-teams">
                <div className="mc-team"><div className="mc-team-name winner">Las Panteras</div></div>
                <div className="mc-score-box"><div className="mc-score" style={{color: "var(--fem2)"}}>65 – 58</div></div>
                <div className="mc-team"><div className="mc-team-name">Las Águilas</div></div>
              </div>
              <div className="mc-venue">📍 Polideportivo Municipal</div>
            </div>
            <div className="match-card fem">
              <div className="mc-header"><span className="mc-date">Sáb 14 Jun · 19:00</span><span className="mc-status s-fin">Final</span></div>
              <div className="mc-teams">
                <div className="mc-team"><div className="mc-team-name winner">Las Rockets</div></div>
                <div className="mc-score-box"><div className="mc-score" style={{color: "var(--fem2)"}}>70 – 68</div></div>
                <div className="mc-team"><div className="mc-team-name">Las Víboras</div></div>
              </div>
              <div className="mc-venue">📍 Polideportivo Municipal</div>
            </div>
            <div className="match-card fem">
              <div className="mc-header"><span className="mc-date">Sáb 14 Jun · 20:30</span><span className="mc-status s-fin">Final</span></div>
              <div className="mc-teams">
                <div className="mc-team"><div className="mc-team-name winner">Las Guerreras</div></div>
                <div className="mc-score-box"><div className="mc-score" style={{color: "var(--fem2)"}}>61 – 55</div></div>
                <div className="mc-team"><div className="mc-team-name">Las Brasas</div></div>
              </div>
              <div className="mc-venue">📍 Polideportivo Municipal</div>
            </div>
          </div>
          <div className="fixture-round-label" style={{color: "var(--gold)", marginTop: "24px"}}>Fecha 8 — Próximos partidos</div>
          <div className="matches-grid">
            <div className="match-card fem">
              <div className="mc-header"><span className="mc-date">Sáb 21 Jun · 16:00</span><span className="mc-status s-prox">Próximo</span></div>
              <div className="mc-teams">
                <div className="mc-team"><div className="mc-team-name">Las Leonas</div></div>
                <div className="mc-score-box"><div className="mc-vs">VS</div></div>
                <div className="mc-team"><div className="mc-team-name">Las Panteras</div></div>
              </div>
              <div className="mc-venue">📍 Polideportivo Municipal</div>
            </div>
            <div className="match-card fem">
              <div className="mc-header"><span className="mc-date">Sáb 21 Jun · 17:30</span><span className="mc-status s-prox">Próximo</span></div>
              <div className="mc-teams">
                <div className="mc-team"><div className="mc-team-name">Fuego Divino</div></div>
                <div className="mc-score-box"><div className="mc-vs">VS</div></div>
                <div className="mc-team"><div className="mc-team-name">Las Rockets</div></div>
              </div>
              <div className="mc-venue">📍 Polideportivo Municipal</div>
            </div>
            <div className="match-card fem">
              <div className="mc-header"><span className="mc-date">Sáb 21 Jun · 19:00</span><span className="mc-status s-prox">Próximo</span></div>
              <div className="mc-teams">
                <div className="mc-team"><div className="mc-team-name">Las Águilas</div></div>
                <div className="mc-score-box"><div className="mc-vs">VS</div></div>
                <div className="mc-team"><div className="mc-team-name">Las Guerreras</div></div>
              </div>
              <div className="mc-venue">📍 Polideportivo Municipal</div>
            </div>
          </div>
        </div>

        {/* JUGADORAS */}
        <div className="tab-pane" id="f-jugadoras">
          <div className="player-filter">
            <button type="button" className="filter-btn on fem">Todas</button>
            <button type="button" className="filter-btn">Bases</button>
            <button type="button" className="filter-btn">Escolteras</button>
            <button type="button" className="filter-btn">Aleros</button>
            <button type="button" className="filter-btn">Pivots</button>
            <input className="filter-search" type="text" placeholder="Buscar jugadora…" data-star-filter="f-jugadoras" />
          </div>
          <div className="table-wrap">
            <table id="fem-players-table">
              <thead><tr>
                <th style={{textAlign: "left", paddingLeft: "20px"}}># Jugadora</th>
                <th>Equipo</th><th>Pos</th><th>PJ</th>
                <th title="Puntos por partido">PPP</th>
                <th title="Rebotes">REB</th>
                <th title="Asistencias">AST</th>
                <th title="Robos">ROB</th>
                <th title="Tapones">TAP</th>
                <th title="Pérdidas">PER</th>
                <th>TOTAL</th>
              </tr></thead>
              <tbody>
                <tr><td className="team-cell"><span className="pos-num top3">1</span><span className="team-name-txt">Valentina G.</span></td><td style={{color: "var(--gray)", fontFamily: "'Barlow Condensed'"}}>Las Leonas</td><td>BASE</td><td>7</td><td className="gold">21.4</td><td>4.2</td><td>6.1</td><td>2.8</td><td>0.3</td><td>2.1</td><td className="pts-td" style={{color: "var(--fem2)"}}>150</td></tr>
                <tr><td className="team-cell"><span className="pos-num top3">2</span><span className="team-name-txt">Camila R.</span></td><td style={{color: "var(--gray)", fontFamily: "'Barlow Condensed'"}}>Fuego Divino</td><td>ESC</td><td>7</td><td className="gold">20.1</td><td>3.8</td><td>4.9</td><td>3.1</td><td>0.5</td><td>1.8</td><td className="pts-td" style={{color: "var(--fem2)"}}>141</td></tr>
                <tr><td className="team-cell"><span className="pos-num top3">3</span><span className="team-name-txt">Lucía M.</span></td><td style={{color: "var(--gray)", fontFamily: "'Barlow Condensed'"}}>Las Panteras</td><td>ALE</td><td>7</td><td>18.6</td><td>6.4</td><td>3.2</td><td>2.4</td><td>1.1</td><td>1.6</td><td className="pts-td" style={{color: "var(--fem2)"}}>130</td></tr>
                <tr><td className="team-cell"><span className="pos-num">4</span><span className="team-name-txt">Sofía P.</span></td><td style={{color: "var(--gray)", fontFamily: "'Barlow Condensed'"}}>Las Águilas</td><td>PIV</td><td>6</td><td>17.8</td><td>8.9</td><td>2.1</td><td>1.2</td><td>2.4</td><td>2.0</td><td className="pts-td" style={{color: "var(--fem2)"}}>107</td></tr>
                <tr><td className="team-cell"><span className="pos-num">5</span><span className="team-name-txt">Florencia D.</span></td><td style={{color: "var(--gray)", fontFamily: "'Barlow Condensed'"}}>Las Rockets</td><td>BASE</td><td>7</td><td>16.3</td><td>3.6</td><td>7.8</td><td>2.9</td><td>0.2</td><td>3.1</td><td className="pts-td" style={{color: "var(--fem2)"}}>114</td></tr>
                <tr><td className="team-cell"><span className="pos-num">6</span><span className="team-name-txt">Milagros E.</span></td><td style={{color: "var(--gray)", fontFamily: "'Barlow Condensed'"}}>Las Víboras</td><td>ESC</td><td>7</td><td>15.7</td><td>4.1</td><td>3.6</td><td>2.1</td><td>0.7</td><td>1.9</td><td className="pts-td" style={{color: "var(--fem2)"}}>110</td></tr>
                <tr><td className="team-cell"><span className="pos-num">7</span><span className="team-name-txt">Agustina F.</span></td><td style={{color: "var(--gray)", fontFamily: "'Barlow Condensed'"}}>Las Leonas</td><td>PIV</td><td>7</td><td>14.9</td><td>9.2</td><td>1.8</td><td>0.9</td><td>3.1</td><td>1.4</td><td className="pts-td" style={{color: "var(--fem2)"}}>104</td></tr>
                <tr><td className="team-cell"><span className="pos-num">8</span><span className="team-name-txt">Romina C.</span></td><td style={{color: "var(--gray)", fontFamily: "'Barlow Condensed'"}}>Fuego Divino</td><td>ALE</td><td>7</td><td>14.1</td><td>5.0</td><td>4.2</td><td>2.6</td><td>0.9</td><td>2.3</td><td className="pts-td" style={{color: "var(--fem2)"}}>99</td></tr>
                <tr><td className="team-cell"><span className="pos-num">9</span><span className="team-name-txt">Carolina S.</span></td><td style={{color: "var(--gray)", fontFamily: "'Barlow Condensed'"}}>Las Guerreras</td><td>BASE</td><td>7</td><td>13.4</td><td>2.9</td><td>5.6</td><td>3.4</td><td>0.1</td><td>2.8</td><td className="pts-td" style={{color: "var(--fem2)"}}>94</td></tr>
                <tr><td className="team-cell"><span className="pos-num">10</span><span className="team-name-txt">Daniela N.</span></td><td style={{color: "var(--gray)", fontFamily: "'Barlow Condensed'"}}>Las Panteras</td><td>ESC</td><td>7</td><td>12.8</td><td>3.7</td><td>3.9</td><td>1.8</td><td>0.6</td><td>1.7</td><td className="pts-td" style={{color: "var(--fem2)"}}>90</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* EQUIPOS FEM */}
        <div className="tab-pane" id="f-equipos-f">
          <div className="teams-grid">
            <div className="team-card"><div className="tc-crest t-red">LL</div><div className="tc-name">Las Leonas</div><div className="tc-record" style={{color: "var(--fem2)"}}>6G – 1P</div><div className="tc-stats-row"><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--gold)"}}>74.0</div><div className="tc-stat-lbl">PTS/PJ</div></div><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--green)"}}>61.6</div><div className="tc-stat-lbl">PC/PJ</div></div></div></div>
            <div className="team-card"><div className="tc-crest t-purple">FD</div><div className="tc-name">Fuego Divino</div><div className="tc-record" style={{color: "var(--fem2)"}}>5G – 2P</div><div className="tc-stats-row"><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--gold)"}}>70.3</div><div className="tc-stat-lbl">PTS/PJ</div></div><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--green)"}}>65.4</div><div className="tc-stat-lbl">PC/PJ</div></div></div></div>
            <div className="team-card"><div className="tc-crest t-cyan">LP</div><div className="tc-name">Las Panteras</div><div className="tc-record" style={{color: "var(--fem2)"}}>5G – 2P</div><div className="tc-stats-row"><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--gold)"}}>68.6</div><div className="tc-stat-lbl">PTS/PJ</div></div><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--green)"}}>66.0</div><div className="tc-stat-lbl">PC/PJ</div></div></div></div>
            <div className="team-card"><div className="tc-crest t-orange">LA</div><div className="tc-name">Las Águilas</div><div className="tc-record" style={{color: "var(--fem2)"}}>4G – 3P</div><div className="tc-stats-row"><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--gold)"}}>65.9</div><div className="tc-stat-lbl">PTS/PJ</div></div><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--green)"}}>66.3</div><div className="tc-stat-lbl">PC/PJ</div></div></div></div>
            <div className="team-card"><div className="tc-crest t-teal">LR</div><div className="tc-name">Las Rockets</div><div className="tc-record" style={{color: "var(--fem2)"}}>4G – 3P</div><div className="tc-stats-row"><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--gold)"}}>65.0</div><div className="tc-stat-lbl">PTS/PJ</div></div><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--green)"}}>66.9</div><div className="tc-stat-lbl">PC/PJ</div></div></div></div>
            <div className="team-card"><div className="tc-crest t-lime">LV</div><div className="tc-name">Las Víboras</div><div className="tc-record" style={{color: "var(--gray)"}}>3G – 4P</div><div className="tc-stats-row"><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--gold)"}}>62.6</div><div className="tc-stat-lbl">PTS/PJ</div></div><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--red)"}}>68.3</div><div className="tc-stat-lbl">PC/PJ</div></div></div></div>
            <div className="team-card"><div className="tc-crest t-yellow">LG</div><div className="tc-name">Las Guerreras</div><div className="tc-record" style={{color: "var(--gray)"}}>2G – 5P</div><div className="tc-stats-row"><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--gold)"}}>59.9</div><div className="tc-stat-lbl">PTS/PJ</div></div><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--red)"}}>71.6</div><div className="tc-stat-lbl">PC/PJ</div></div></div></div>
            <div className="team-card"><div className="tc-crest t-blue">LB</div><div className="tc-name">Las Brasas</div><div className="tc-record" style={{color: "var(--gray)"}}>1G – 6P</div><div className="tc-stats-row"><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--gold)"}}>57.3</div><div className="tc-stat-lbl">PTS/PJ</div></div><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--red)"}}>74.4</div><div className="tc-stat-lbl">PC/PJ</div></div></div></div>
          </div>
        </div>

      </div>{/* torneo-inner */}
      </div>{/* torneo-section fem */}
    </>
  );
}
