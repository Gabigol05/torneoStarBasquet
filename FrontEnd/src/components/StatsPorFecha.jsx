// Tabla "Stats por fecha" del perfil de jugadora/jugador (rediseño 21/11):
// fecha, rival con escudo, resultado, PTS/REB/AST/VAL y tiros (convertidos/
// intentados con %), mejor partido marcado y fila de promedios al final.
// La primera columna queda fija al deslizar en celular.
const pctTiro = (c, i) => (i > 0 ? Math.round((c / i) * 100) : null);

function Tiro({ c, f }) {
  const i = c + f;
  const pct = pctTiro(c, i);
  return (
    <span className={`spf-tiro${i === 0 ? ' is-vacio' : ''}`}>
      <span className="spf-tiro-n">{c}/{i}</span>
      {pct != null && <span className={`spf-tiro-pct${pct >= 50 ? ' is-bien' : ''}`}>{pct}%</span>}
    </span>
  );
}

export function StatsPorFecha({ filas, mejor, accent = '#F0B429' }) {
  if (!filas?.length) return null;
  const n = filas.length;
  const suma = k => filas.reduce((a, r) => a + (r[k] ?? 0), 0);
  const prom = k => (suma(k) / n).toFixed(1);
  return (
    <div className="spf-wrap scrollbar-accent">
      <table className="spf">
        <thead>
          <tr>
            <th className="spf-fija">Fecha</th>
            <th className="spf-izq">Rival</th>
            <th>Res.</th>
            <th>PTS</th><th>REB</th><th>AST</th><th>VAL</th>
            <th>TL</th><th>2P</th><th>3P</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((r, i) => {
            const esMejor = mejor && r === mejor && r.pts > 0;
            return (
              <tr key={r.partidoId ?? i} className={`${r.esPlayoff ? 'is-playoff' : ''}${esMejor ? ' is-mejor' : ''}`}>
                <td className="spf-fija">
                  <span className={`spf-fecha${r.esPlayoff ? ' is-playoff' : ''}`}>{r.match}</span>
                </td>
                <td className="spf-izq">
                  {r.rival ? (
                    <span className="spf-rival" title={r.rival.name}>
                      <img src={r.rival.logo} alt="" loading="lazy" decoding="async"
                        style={{ borderColor: r.rival.color }}
                        onError={e => { e.target.style.visibility = 'hidden'; }}/>
                      <span>{r.rival.name}</span>
                    </span>
                  ) : '—'}
                </td>
                <td>
                  <span className={`spf-res ${r.gano ? 'is-g' : 'is-p'}`}>
                    {r.gano ? 'G' : 'P'} <b>{r.pf}-{r.pc}</b>
                  </span>
                </td>
                <td className="spf-pts" style={{ color: accent }}>
                  {r.pts}{esMejor && <span className="spf-estrella" title="Mejor partido">★</span>}
                </td>
                <td>{r.reb}</td>
                <td>{r.ast}</td>
                <td className={r.val >= 0 ? 'spf-pos' : 'spf-neg'}>{r.val}</td>
                <td><Tiro c={r.sc} f={r.sf}/></td>
                <td><Tiro c={r.dc} f={r.df}/></td>
                <td><Tiro c={r.tc} f={r.tf}/></td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className="spf-fija"><span className="spf-fecha is-prom">Prom.</span></td>
            <td className="spf-izq spf-dim">{n} PJ</td>
            <td/>
            <td className="spf-pts" style={{ color: accent }}>{prom('pts')}</td>
            <td>{prom('reb')}</td>
            <td>{prom('ast')}</td>
            <td>{prom('val')}</td>
            <td><Tiro c={suma('sc')} f={suma('sf')}/></td>
            <td><Tiro c={suma('dc')} f={suma('df')}/></td>
            <td><Tiro c={suma('tc')} f={suma('tf')}/></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
