/* eslint-disable react/no-unknown-property */
/* Fragmento fiel al HTML original (ver scripts/build_star_components.py). */

export function TopBar() {
  return (
    <>
      {/* TOP BAR */}
      <div className="topbar">
        <span>⭐ TORNEO STAR BÁSQUET · CÓRDOBA 2026</span>
        <div className="topbar-right">
          <span><span className="live-dot"></span>Torneo en curso</span>
        </div>
      </div>
    </>
  );
}
