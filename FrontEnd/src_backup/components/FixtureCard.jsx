/**
 * Abstracción del marcado `.match-card` del HTML original (variantes `fem` / `masc`).
 * Los fixtures generados conservan el mismo DOM; este componente sirve para vistas futuras.
 */
export function FixtureCard({ variant = "fem", children }) {
  return <div className={`match-card ${variant}`}>{children}</div>;
}
