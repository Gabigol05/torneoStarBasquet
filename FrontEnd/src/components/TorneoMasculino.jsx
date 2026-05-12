/* eslint-disable react/no-unknown-property */
/* Fragmento fiel al HTML original (ver scripts/build_star_components.py). */

export function TorneoMasculino() {
  return (
    <>
      <div className="torneo-section masc" id="masculino">
      <div className="torneo-inner">

        <div className="gender-header">
          <div>
            <div className="gender-pill masc">♂ Categoría Masculina</div>
            <div className="gender-title masc">TORNEO<br />MASCULINO</div>
          </div>
          <div style={{textAlign: "right", paddingTop: "8px"}}>
            <div style={{fontFamily: "'Barlow Condensed',sans-serif", fontSize: "12px", fontWeight: "700", letterSpacing: "2px", color: "var(--gray)", textTransform: "uppercase"}}>Fecha 7 de 12 · Temporada Regular</div>
            <div style={{fontFamily: "'Bebas Neue',sans-serif", fontSize: "28px", letterSpacing: "2px", color: "var(--masc2)", marginTop: "4px"}}>8 equipos clasifican a playoffs</div>
          </div>
        </div>

        <div className="tab-nav">
          <button type="button" className="tab-btn active-masc" data-star-tab="m:tabla">📊 Tabla</button>
          <button type="button" className="tab-btn" data-star-tab="m:fixtures">📅 Fixture</button>
          <button type="button" className="tab-btn" data-star-tab="m:jugadores">👤 Jugadores</button>
          <button type="button" className="tab-btn" data-star-tab="m:equipos-m">🏀 Equipos</button>
        </div>

        {/* TABLA MASCULINA */}
        <div className="tab-pane active" id="m-tabla">
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th style={{textAlign: "left", paddingLeft: "20px"}}># Equipo</th>
                <th>PJ</th><th>G</th><th>P</th><th>PF</th><th>PC</th><th>DIF</th><th>%</th><th>PTS</th><th>Forma</th>
              </tr></thead>
              <tbody>
                <tr className="highlight-row">
                  <td className="team-cell"><span className="pos-num top3">1</span><span className="team-crest t-blue">BM</span><span className="team-name-txt">Black Mambas</span></td>
                  <td>7</td><td>7</td><td>0</td><td>614</td><td>528</td><td className="green">+86</td><td className="pct-td">1.000</td><td className="pts-td" style={{color: "var(--masc2)"}}>14</td>
                  <td><div className="form-badges"><span className="fb W">G</span><span className="fb W">G</span><span className="fb W">G</span><span className="fb W">G</span><span className="fb W">G</span></div></td>
                </tr>
                <tr className="highlight-row">
                  <td className="team-cell"><span className="pos-num top3">2</span><span className="team-crest t-red">LT</span><span className="team-name-txt">Los Toros</span></td>
                  <td>7</td><td>6</td><td>1</td><td>588</td><td>541</td><td className="green">+47</td><td className="pct-td">.857</td><td className="pts-td" style={{color: "var(--masc2)"}}>13</td>
                  <td><div className="form-badges"><span className="fb W">G</span><span className="fb W">G</span><span className="fb L">P</span><span className="fb W">G</span><span className="fb W">G</span></div></td>
                </tr>
                <tr className="highlight-row">
                  <td className="team-cell"><span className="pos-num top3">3</span><span className="team-crest t-purple">LG</span><span className="team-name-txt">Los Gladiadores</span></td>
                  <td>7</td><td>5</td><td>2</td><td>571</td><td>548</td><td className="green">+23</td><td className="pct-td">.714</td><td className="pts-td" style={{color: "var(--masc2)"}}>12</td>
                  <td><div className="form-badges"><span className="fb W">G</span><span className="fb W">G</span><span className="fb L">P</span><span className="fb W">G</span><span className="fb L">P</span></div></td>
                </tr>
                <tr className="highlight-row">
                  <td className="team-cell"><span className="pos-num top3">4</span><span className="team-crest t-orange">TB</span><span className="team-name-txt">Titan Basket</span></td>
                  <td>7</td><td>5</td><td>2</td><td>562</td><td>544</td><td className="green">+18</td><td className="pct-td">.714</td><td className="pts-td" style={{color: "var(--masc2)"}}>12</td>
                  <td><div className="form-badges"><span className="fb W">G</span><span className="fb L">P</span><span className="fb W">G</span><span className="fb W">G</span><span className="fb W">G</span></div></td>
                </tr>
                <tr>
                  <td className="team-cell"><span className="pos-num">5</span><span className="team-crest t-cyan">ES</span><span className="team-name-txt">El Escuadrón</span></td>
                  <td>7</td><td>4</td><td>3</td><td>548</td><td>549</td><td className="red">-1</td><td className="pct-td">.571</td><td className="pts-td" style={{color: "var(--masc2)"}}>11</td>
                  <td><div className="form-badges"><span className="fb L">P</span><span className="fb W">G</span><span className="fb W">G</span><span className="fb L">P</span><span className="fb W">G</span></div></td>
                </tr>
                <tr>
                  <td className="team-cell"><span className="pos-num">6</span><span className="team-crest t-green">LJ</span><span className="team-name-txt">Los Jaguares</span></td>
                  <td>7</td><td>4</td><td>3</td><td>541</td><td>553</td><td className="red">-12</td><td className="pct-td">.571</td><td className="pts-td" style={{color: "var(--masc2)"}}>11</td>
                  <td><div className="form-badges"><span className="fb W">G</span><span className="fb L">P</span><span className="fb L">P</span><span className="fb W">G</span><span className="fb W">G</span></div></td>
                </tr>
                <tr>
                  <td className="team-cell"><span className="pos-num">7</span><span className="team-crest t-teal">LF</span><span className="team-name-txt">Los Fenix</span></td>
                  <td>7</td><td>3</td><td>4</td><td>528</td><td>561</td><td className="red">-33</td><td className="pct-td">.429</td><td className="pts-td" style={{color: "var(--masc2)"}}>10</td>
                  <td><div className="form-badges"><span className="fb L">P</span><span className="fb W">G</span><span className="fb L">P</span><span className="fb W">G</span><span className="fb L">P</span></div></td>
                </tr>
                <tr>
                  <td className="team-cell"><span className="pos-num">8</span><span className="team-crest t-lime">LW</span><span className="team-name-txt">Los Wolves</span></td>
                  <td>7</td><td>3</td><td>4</td><td>519</td><td>568</td><td className="red">-49</td><td className="pct-td">.429</td><td className="pts-td" style={{color: "var(--masc2)"}}>10</td>
                  <td><div className="form-badges"><span className="fb L">P</span><span className="fb L">P</span><span className="fb W">G</span><span className="fb W">G</span><span className="fb L">P</span></div></td>
                </tr>
                <tr>
                  <td className="team-cell"><span className="pos-num">9</span><span className="team-crest t-yellow">LV</span><span className="team-name-txt">Los Vikings</span></td>
                  <td>7</td><td>2</td><td>5</td><td>504</td><td>578</td><td className="red">-74</td><td className="pct-td">.286</td><td className="pts-td" style={{color: "var(--masc2)"}}>9</td>
                  <td><div className="form-badges"><span className="fb L">P</span><span className="fb L">P</span><span className="fb W">G</span><span className="fb L">P</span><span className="fb L">P</span></div></td>
                </tr>
                <tr>
                  <td className="team-cell"><span className="pos-num">10</span><span className="team-crest t-pink">SR</span><span className="team-name-txt">Street Royals</span></td>
                  <td>7</td><td>1</td><td>6</td><td>488</td><td>591</td><td className="red">-103</td><td className="pct-td">.143</td><td className="pts-td" style={{color: "var(--masc2)"}}>8</td>
                  <td><div className="form-badges"><span className="fb L">P</span><span className="fb L">P</span><span className="fb L">P</span><span className="fb W">G</span><span className="fb L">P</span></div></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{fontSize: "11px", color: "var(--gray2)", fontFamily: "'Barlow Condensed'", letterSpacing: "2px", textTransform: "uppercase", padding: "10px 0 0", textAlign: "right"}}>★ Top 8 clasifican a playoffs</p>
        </div>

        {/* FIXTURE MASCULINO */}
        <div className="tab-pane" id="m-fixtures">
          <div className="fixture-round-label">Fecha 7 — Resultados</div>
          <div className="matches-grid">
            <div className="match-card masc"><div className="mc-header"><span className="mc-date">Dom 15 Jun · 15:00</span><span className="mc-status s-fin">Final</span></div><div className="mc-teams"><div className="mc-team"><div className="mc-team-name winner">Black Mambas</div></div><div className="mc-score-box"><div className="mc-score" style={{color: "var(--masc2)"}}>88 – 74</div></div><div className="mc-team"><div className="mc-team-name">Los Gladiadores</div></div></div><div className="mc-venue">📍 Polideportivo Municipal</div></div>
            <div className="match-card masc"><div className="mc-header"><span className="mc-date">Dom 15 Jun · 16:30</span><span className="mc-status s-fin">Final</span></div><div className="mc-teams"><div className="mc-team"><div className="mc-team-name winner">Los Toros</div></div><div className="mc-score-box"><div className="mc-score" style={{color: "var(--masc2)"}}>79 – 66</div></div><div className="mc-team"><div className="mc-team-name">Titan Basket</div></div></div><div className="mc-venue">📍 Polideportivo Municipal</div></div>
            <div className="match-card masc"><div className="mc-header"><span className="mc-date">Dom 15 Jun · 18:00</span><span className="mc-status s-fin">Final</span></div><div className="mc-teams"><div className="mc-team"><div className="mc-team-name winner">El Escuadrón</div></div><div className="mc-score-box"><div className="mc-score" style={{color: "var(--masc2)"}}>71 – 68</div></div><div className="mc-team"><div className="mc-team-name">Los Jaguares</div></div></div><div className="mc-venue">📍 Polideportivo Municipal</div></div>
            <div className="match-card masc"><div className="mc-header"><span className="mc-date">Dom 15 Jun · 19:30</span><span className="mc-status s-fin">Final</span></div><div className="mc-teams"><div className="mc-team"><div className="mc-team-name winner">Los Wolves</div></div><div className="mc-score-box"><div className="mc-score" style={{color: "var(--masc2)"}}>76 – 72</div></div><div className="mc-team"><div className="mc-team-name">Los Vikings</div></div></div><div className="mc-venue">📍 Polideportivo Municipal</div></div>
            <div className="match-card masc"><div className="mc-header"><span className="mc-date">Dom 15 Jun · 21:00</span><span className="mc-status s-fin">Final</span></div><div className="mc-teams"><div className="mc-team"><div className="mc-team-name winner">Los Fenix</div></div><div className="mc-score-box"><div className="mc-score" style={{color: "var(--masc2)"}}>82 – 75</div></div><div className="mc-team"><div className="mc-team-name">Street Royals</div></div></div><div className="mc-venue">📍 Polideportivo Municipal</div></div>
          </div>
          <div className="fixture-round-label" style={{color: "var(--gold)", marginTop: "24px"}}>Fecha 8 — Próximos</div>
          <div className="matches-grid">
            <div className="match-card masc"><div className="mc-header"><span className="mc-date">Dom 22 Jun · 15:00</span><span className="mc-status s-prox">Próximo</span></div><div className="mc-teams"><div className="mc-team"><div className="mc-team-name">Black Mambas</div></div><div className="mc-score-box"><div className="mc-vs">VS</div></div><div className="mc-team"><div className="mc-team-name">Los Toros</div></div></div><div className="mc-venue">📍 Polideportivo Municipal</div></div>
            <div className="match-card masc"><div className="mc-header"><span className="mc-date">Dom 22 Jun · 16:30</span><span className="mc-status s-prox">Próximo</span></div><div className="mc-teams"><div className="mc-team"><div className="mc-team-name">Titan Basket</div></div><div className="mc-score-box"><div className="mc-vs">VS</div></div><div className="mc-team"><div className="mc-team-name">El Escuadrón</div></div></div><div className="mc-venue">📍 Polideportivo Municipal</div></div>
            <div className="match-card masc"><div className="mc-header"><span className="mc-date">Dom 22 Jun · 18:00</span><span className="mc-status s-prox">Próximo</span></div><div className="mc-teams"><div className="mc-team"><div className="mc-team-name">Los Gladiadores</div></div><div className="mc-score-box"><div className="mc-vs">VS</div></div><div className="mc-team"><div className="mc-team-name">Los Jaguares</div></div></div><div className="mc-venue">📍 Polideportivo Municipal</div></div>
          </div>
        </div>

        {/* JUGADORES MASCULINOS */}
        <div className="tab-pane" id="m-jugadores">
          <div className="player-filter">
            <button type="button" className="filter-btn on masc">Todos</button>
            <button type="button" className="filter-btn">Bases</button>
            <button type="button" className="filter-btn">Escoltas</button>
            <button type="button" className="filter-btn">Aleros</button>
            <button type="button" className="filter-btn">Pivots</button>
            <input className="filter-search" type="text" placeholder="Buscar jugador…" data-star-filter="m-jugadores" />
          </div>
          <div className="table-wrap">
            <table id="masc-players-table">
              <thead><tr>
                <th style={{textAlign: "left", paddingLeft: "20px"}}># Jugador</th>
                <th>Equipo</th><th>Pos</th><th>PJ</th>
                <th>PPP</th><th>REB</th><th>AST</th><th>ROB</th><th>TAP</th><th>PER</th><th>TOTAL</th>
              </tr></thead>
              <tbody>
                <tr><td className="team-cell"><span className="pos-num top3">1</span><span className="team-name-txt">Matías H.</span></td><td style={{color: "var(--gray)", fontFamily: "'Barlow Condensed'"}}>Black Mambas</td><td>BASE</td><td>7</td><td className="gold">24.1</td><td>4.1</td><td>7.2</td><td>2.9</td><td>0.4</td><td>2.3</td><td className="pts-td" style={{color: "var(--masc2)"}}>169</td></tr>
                <tr><td className="team-cell"><span className="pos-num top3">2</span><span className="team-name-txt">Nicolás F.</span></td><td style={{color: "var(--gray)", fontFamily: "'Barlow Condensed'"}}>Los Toros</td><td>ESC</td><td>7</td><td className="gold">22.4</td><td>5.0</td><td>4.8</td><td>2.1</td><td>0.6</td><td>2.0</td><td className="pts-td" style={{color: "var(--masc2)"}}>157</td></tr>
                <tr><td className="team-cell"><span className="pos-num top3">3</span><span className="team-name-txt">Diego L.</span></td><td style={{color: "var(--gray)", fontFamily: "'Barlow Condensed'"}}>Los Gladiadores</td><td>PIV</td><td>6</td><td>21.5</td><td>10.2</td><td>2.1</td><td>1.0</td><td>2.8</td><td>2.1</td><td className="pts-td" style={{color: "var(--masc2)"}}>129</td></tr>
                <tr><td className="team-cell"><span className="pos-num">4</span><span className="team-name-txt">Agustín V.</span></td><td style={{color: "var(--gray)", fontFamily: "'Barlow Condensed'"}}>Titan Basket</td><td>ALE</td><td>7</td><td>20.0</td><td>6.3</td><td>3.9</td><td>2.5</td><td>0.8</td><td>1.8</td><td className="pts-td" style={{color: "var(--masc2)"}}>140</td></tr>
                <tr><td className="team-cell"><span className="pos-num">5</span><span className="team-name-txt">Rodrigo S.</span></td><td style={{color: "var(--gray)", fontFamily: "'Barlow Condensed'"}}>El Escuadrón</td><td>ESC</td><td>7</td><td>18.7</td><td>4.6</td><td>5.1</td><td>3.0</td><td>0.3</td><td>2.5</td><td className="pts-td" style={{color: "var(--masc2)"}}>131</td></tr>
                <tr><td className="team-cell"><span className="pos-num">6</span><span className="team-name-txt">Ezequiel P.</span></td><td style={{color: "var(--gray)", fontFamily: "'Barlow Condensed'"}}>Los Jaguares</td><td>PIV</td><td>7</td><td>17.3</td><td>9.1</td><td>1.8</td><td>0.8</td><td>3.2</td><td>1.6</td><td className="pts-td" style={{color: "var(--masc2)"}}>121</td></tr>
                <tr><td className="team-cell"><span className="pos-num">7</span><span className="team-name-txt">Lucas M.</span></td><td style={{color: "var(--gray)", fontFamily: "'Barlow Condensed'"}}>Black Mambas</td><td>BASE</td><td>7</td><td>16.4</td><td>3.2</td><td>8.4</td><td>3.4</td><td>0.1</td><td>2.9</td><td className="pts-td" style={{color: "var(--masc2)"}}>115</td></tr>
                <tr><td className="team-cell"><span className="pos-num">8</span><span className="team-name-txt">Franco A.</span></td><td style={{color: "var(--gray)", fontFamily: "'Barlow Condensed'"}}>Los Toros</td><td>ALE</td><td>7</td><td>15.9</td><td>5.7</td><td>3.3</td><td>2.2</td><td>0.7</td><td>2.1</td><td className="pts-td" style={{color: "var(--masc2)"}}>111</td></tr>
                <tr><td className="team-cell"><span className="pos-num">9</span><span className="team-name-txt">Tomás G.</span></td><td style={{color: "var(--gray)", fontFamily: "'Barlow Condensed'"}}>Los Wolves</td><td>ESC</td><td>7</td><td>15.0</td><td>4.0</td><td>4.6</td><td>2.0</td><td>0.4</td><td>2.0</td><td className="pts-td" style={{color: "var(--masc2)"}}>105</td></tr>
                <tr><td className="team-cell"><span className="pos-num">10</span><span className="team-name-txt">Sebastián R.</span></td><td style={{color: "var(--gray)", fontFamily: "'Barlow Condensed'"}}>Los Fenix</td><td>PIV</td><td>7</td><td>14.1</td><td>8.3</td><td>2.0</td><td>0.9</td><td>2.9</td><td>1.7</td><td className="pts-td" style={{color: "var(--masc2)"}}>99</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* EQUIPOS MASCULINOS */}
        <div className="tab-pane" id="m-equipos-m">
          <div className="teams-grid">
            <div className="team-card"><div className="tc-crest t-blue">BM</div><div className="tc-name">Black Mambas</div><div className="tc-record" style={{color: "var(--masc2)"}}>7G – 0P</div><div className="tc-stats-row"><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--gold)"}}>87.7</div><div className="tc-stat-lbl">PTS/PJ</div></div><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--green)"}}>75.4</div><div className="tc-stat-lbl">PC/PJ</div></div></div></div>
            <div className="team-card"><div className="tc-crest t-red">LT</div><div className="tc-name">Los Toros</div><div className="tc-record" style={{color: "var(--masc2)"}}>6G – 1P</div><div className="tc-stats-row"><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--gold)"}}>84.0</div><div className="tc-stat-lbl">PTS/PJ</div></div><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--green)"}}>77.3</div><div className="tc-stat-lbl">PC/PJ</div></div></div></div>
            <div className="team-card"><div className="tc-crest t-purple">LG</div><div className="tc-name">Los Gladiadores</div><div className="tc-record" style={{color: "var(--masc2)"}}>5G – 2P</div><div className="tc-stats-row"><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--gold)"}}>81.6</div><div className="tc-stat-lbl">PTS/PJ</div></div><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--green)"}}>78.3</div><div className="tc-stat-lbl">PC/PJ</div></div></div></div>
            <div className="team-card"><div className="tc-crest t-orange">TB</div><div className="tc-name">Titan Basket</div><div className="tc-record" style={{color: "var(--masc2)"}}>5G – 2P</div><div className="tc-stats-row"><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--gold)"}}>80.3</div><div className="tc-stat-lbl">PTS/PJ</div></div><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--green)"}}>77.7</div><div className="tc-stat-lbl">PC/PJ</div></div></div></div>
            <div className="team-card"><div className="tc-crest t-cyan">ES</div><div className="tc-name">El Escuadrón</div><div className="tc-record" style={{color: "var(--masc2)"}}>4G – 3P</div><div className="tc-stats-row"><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--gold)"}}>78.3</div><div className="tc-stat-lbl">PTS/PJ</div></div><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--green)"}}>78.4</div><div className="tc-stat-lbl">PC/PJ</div></div></div></div>
            <div className="team-card"><div className="tc-crest t-green">LJ</div><div className="tc-name">Los Jaguares</div><div className="tc-record" style={{color: "var(--masc2)"}}>4G – 3P</div><div className="tc-stats-row"><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--gold)"}}>77.3</div><div className="tc-stat-lbl">PTS/PJ</div></div><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--red)"}}>79.0</div><div className="tc-stat-lbl">PC/PJ</div></div></div></div>
            <div className="team-card"><div className="tc-crest t-teal">LF</div><div className="tc-name">Los Fenix</div><div className="tc-record" style={{color: "var(--gray)"}}>3G – 4P</div><div className="tc-stats-row"><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--gold)"}}>75.4</div><div className="tc-stat-lbl">PTS/PJ</div></div><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--red)"}}>80.1</div><div className="tc-stat-lbl">PC/PJ</div></div></div></div>
            <div className="team-card"><div className="tc-crest t-lime">LW</div><div className="tc-name">Los Wolves</div><div className="tc-record" style={{color: "var(--gray)"}}>3G – 4P</div><div className="tc-stats-row"><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--gold)"}}>74.1</div><div className="tc-stat-lbl">PTS/PJ</div></div><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--red)"}}>81.1</div><div className="tc-stat-lbl">PC/PJ</div></div></div></div>
            <div className="team-card"><div className="tc-crest t-yellow">LV</div><div className="tc-name">Los Vikings</div><div className="tc-record" style={{color: "var(--gray)"}}>2G – 5P</div><div className="tc-stats-row"><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--gold)"}}>72.0</div><div className="tc-stat-lbl">PTS/PJ</div></div><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--red)"}}>82.6</div><div className="tc-stat-lbl">PC/PJ</div></div></div></div>
            <div className="team-card"><div className="tc-crest t-pink">SR</div><div className="tc-name">Street Royals</div><div className="tc-record" style={{color: "var(--gray)"}}>1G – 6P</div><div className="tc-stats-row"><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--gold)"}}>69.7</div><div className="tc-stat-lbl">PTS/PJ</div></div><div className="tc-stat"><div className="tc-stat-val" style={{color: "var(--red)"}}>84.4</div><div className="tc-stat-lbl">PC/PJ</div></div></div></div>
          </div>
        </div>

      </div>
      </div>{/* masc section */}
    </>
  );
}
