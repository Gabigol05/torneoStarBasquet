/**
 * Contenedor equivalente a `.table-wrap` + `table` del HTML original.
 */
export function StandingsTable({ children }) {
  return (
    <div className="table-wrap">
      <table>{children}</table>
    </div>
  );
}
