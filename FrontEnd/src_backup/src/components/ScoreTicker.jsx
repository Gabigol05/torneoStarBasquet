/* eslint-disable react/no-unknown-property */
/* Fragmento fiel al HTML original (ver scripts/build_star_components.py). */

export function ScoreTicker() {
  return (
    <>
      {/* SCORE TICKER */}
      <div className="ticker-wrap">
        <div className="ticker-inner" id="ticker">
          {/* will be duplicated by JS */}
          <div className="ticker-item">
            <span className="ticker-badge ticker-fin">Final</span>
            <span>Las Leonas</span>
            <span className="ticker-result fem-col">72 – 61</span>
            <span>Fuego Divino</span>
          </div>
          <div className="ticker-item">
            <span className="ticker-badge ticker-fin">Final</span>
            <span>Black Mambas</span>
            <span className="ticker-result masc-col">88 – 74</span>
            <span>Los Gladiadores</span>
          </div>
          <div className="ticker-item">
            <span className="ticker-badge ticker-fin">Final</span>
            <span>Las Panteras</span>
            <span className="ticker-result fem-col">65 – 58</span>
            <span>Las Aguilas</span>
          </div>
          <div className="ticker-item">
            <span className="ticker-badge ticker-fin">Final</span>
            <span>Los Toros</span>
            <span className="ticker-result masc-col">79 – 66</span>
            <span>Titan Basket</span>
          </div>
          <div className="ticker-item">
            <span className="ticker-badge ticker-prox">Próximo</span>
            <span>Las Leonas vs Las Panteras</span>
            <span style={{color: "var(--gray)", fontSize: "12px"}}>Sáb 21 Jun · 18:00</span>
          </div>
          <div className="ticker-item">
            <span className="ticker-badge ticker-prox">Próximo</span>
            <span>Black Mambas vs Los Toros</span>
            <span style={{color: "var(--gray)", fontSize: "12px"}}>Dom 22 Jun · 17:00</span>
          </div>
          <div className="ticker-item">
            <span className="ticker-badge ticker-fin">Final</span>
            <span>Fuego Divino</span>
            <span className="ticker-result fem-col">70 – 68</span>
            <span>Las Rockets</span>
          </div>
          <div className="ticker-item">
            <span className="ticker-badge ticker-fin">Final</span>
            <span>Los Gladiadores</span>
            <span className="ticker-result masc-col">81 – 77</span>
            <span>El Escuadrón</span>
          </div>
        </div>
      </div>
    </>
  );
}
