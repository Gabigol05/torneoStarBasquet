// Tabla de posiciones (rediseño 21/11): bandas por copa, movimiento respecto
// de la fecha anterior, racha, puntos destacados y últimos 5 con detalle.
// Se adapta al ancho de su panel (container query en el CSS, ver .tp2-*):
// con las dos zonas lado a lado oculta PF/PC; angosto pasa a modo compacto.
const BANDAS = [
  { key: 'oro',    label: 'Copa de Oro',    color: '#F0B429' },
  { key: 'plata',  label: 'Copa de Plata',  color: '#C7D1DD' },
  { key: 'bronce', label: 'Copa de Bronce', color: '#CD7F32' },
];
const hexA = (h, a) => `${h}${a}`;

// Mismo criterio que el resto del sitio: PTS -> DIF -> PF.
export function ordenarTabla(lista) {
  return [...lista].sort((a, b) =>
    ((b.pg ?? 0) * 2 + (b.pp ?? 0)) - ((a.pg ?? 0) * 2 + (a.pp ?? 0)) ||
    ((b.pf ?? 0) - (b.pc ?? 0)) - ((a.pf ?? 0) - (a.pc ?? 0)) ||
    (b.pf ?? 0) - (a.pf ?? 0));
}

// Tabla "como estaba" antes de la última fecha con resultados de temporada
// regular: { stats: { equipoId: {pg,pp,pf,pc} }, ultima } o null si todavía
// no hay una fecha anterior con la que comparar.
export function tablaFechaAnterior(partidos, fechas) {
  const numPorFecha = Object.fromEntries((fechas ?? []).map(f => [f.id, f.numero]));
  const reg = (partidos ?? []).filter(p => p.estado === 'finalizado' && !p.es_playoff
    && numPorFecha[p.fecha_id] != null && (p.puntos_local ?? 0) !== (p.puntos_visit ?? 0));
  if (!reg.length) return null;
  const ultima = Math.max(...reg.map(p => numPorFecha[p.fecha_id]));
  const previos = reg.filter(p => numPorFecha[p.fecha_id] !== ultima);
  if (!previos.length) return { stats: null, ultima };
  const stats = {};
  const fila = id => (stats[id] ??= { pg: 0, pp: 0, pf: 0, pc: 0 });
  for (const p of previos) {
    const L = fila(p.equipo_local_id), V = fila(p.equipo_visit_id);
    const pl = p.puntos_local ?? 0, pv = p.puntos_visit ?? 0;
    L.pf += pl; L.pc += pv; V.pf += pv; V.pc += pl;
    if (pl > pv) { L.pg++; V.pp++; } else { V.pg++; L.pp++; }
  }
  return { stats, ultima };
}

function Movimiento({ delta }) {
  if (delta == null) return <span className="tp2-mov"/>;
  if (delta === 0) return <span className="tp2-mov tp2-mov--igual" title="Misma posición que la fecha anterior">–</span>;
  const sube = delta > 0;
  return (
    <span className={`tp2-mov ${sube ? 'tp2-mov--sube' : 'tp2-mov--baja'}`}
      title={`${sube ? 'Subió' : 'Bajó'} ${Math.abs(delta)} ${Math.abs(delta) === 1 ? 'puesto' : 'puestos'} respecto a la fecha anterior`}>
      {sube ? '▲' : '▼'}{Math.abs(delta)}
    </span>
  );
}

function Forma({ ultimos }) {
  if (!ultimos.length) return <span className="tp2-forma-nd">–</span>;
  return (
    <span className="tp2-forma">
      {ultimos.map((p, i) => (
        <span key={i}
          className={`tp2-forma-pill ${p.resultado === 'G' ? 'is-g' : 'is-p'}`}
          title={`${p.fechaNum != null ? `F${p.fechaNum}: ` : ''}${p.resultado === 'G' ? 'Ganó' : 'Perdió'} ${p.pf}-${p.pc} vs ${p.rival}`}>
          {p.resultado}
        </span>
      ))}
    </span>
  );
}

function racha(historial) {
  if (!historial?.length) return null;
  const ult = historial[historial.length - 1].resultado;
  let n = 0;
  for (let i = historial.length - 1; i >= 0 && historial[i].resultado === ult; i--) n++;
  return { tipo: ult, n };
}

// `destacadoId`: equipo a resaltar (página de equipo). Sin `onSelect` las
// filas no son clickeables.
export function TablaZona({ titulo, lista, anterior, modeColor, esFavorito, onSelect, vacio, destacadoId = null }) {
  const g = Math.ceil(lista.length / 3);
  // Puesto de cada equipo en la fecha anterior, dentro de esta misma lista.
  let posAntes = null;
  if (anterior?.stats) {
    const antes = ordenarTabla(lista.map(t => ({ id: t.id, ...(anterior.stats[t.id] ?? { pg: 0, pp: 0, pf: 0, pc: 0 }) })));
    posAntes = Object.fromEntries(antes.map((t, i) => [t.id, i]));
  }
  return (
    <div className="tp2-panel">
      <div className="tp2-panel-head">
        <div className="tp2-panel-titulo" style={{ color: modeColor }}>{titulo}</div>
      </div>

      <div className="tp2-grid tp2-header">
        <span className="tp2-c-pos">#</span>
        <span/>
        <span className="tp2-c-eq">Equipo</span>
        <span className="tp2-num" title="Partidos jugados">PJ</span>
        <span className="tp2-num" title="Ganados">G</span>
        <span className="tp2-num" title="Perdidos">P</span>
        <span className="tp2-num tp2-opt" title="Puntos a favor">PF</span>
        <span className="tp2-num tp2-opt" title="Puntos en contra">PC</span>
        <span className="tp2-num" title="Diferencia de puntos">DIF</span>
        <span className="tp2-num tp2-c-pts" style={{ color: modeColor }}>PTS</span>
        <span className="tp2-c-forma">Últimos 5</span>
      </div>

      {lista.length === 0 && <div className="tp2-vacio">{vacio}</div>}

      {lista.map((t, i) => {
        const banda = BANDAS[Math.min(2, Math.floor(i / g))];
        const inicioBanda = i % g === 0;
        const dif = (t.pf ?? 0) - (t.pc ?? 0);
        const r = racha(t.historial);
        const fav = esFavorito?.(t.id);
        const color = t.color ?? '#8899BB';
        const destacado = t.id === destacadoId;
        const clickeable = !!onSelect;
        return (
          <div key={t.id} className="tp2-bloque">
            {inicioBanda && (
              <div className="tp2-banda" style={{ '--banda': banda.color }}>
                <span className="tp2-banda-marca"/>
                <span className="tp2-banda-nombre">{banda.label}</span>
              </div>
            )}
            <div role={clickeable ? 'button' : undefined} tabIndex={clickeable ? 0 : undefined}
              className={`tp2-grid tp2-fila${i === 0 && t.pj > 0 ? ' is-lider' : ''}${fav ? ' is-fav' : ''}${destacado ? ' is-actual' : ''}${clickeable ? '' : ' is-estatica'}`}
              onClick={clickeable ? () => onSelect(t) : undefined}
              onKeyDown={clickeable ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(t); } } : undefined}
              style={{ '--banda': banda.color, '--team': color,
                background: `linear-gradient(90deg, ${hexA(color, destacado ? '40' : '1f')}, transparent ${destacado ? '70%' : '45%'})` }}>
              <span className="tp2-c-pos tp2-pos" style={{ color: banda.color }}>{i + 1}</span>
              <Movimiento delta={posAntes ? posAntes[t.id] - i : null}/>
              <span className="tp2-c-eq tp2-equipo">
                <span className="tp2-escudo" style={{ borderColor: color, boxShadow: `0 0 10px ${hexA(color, '55')}` }}>
                  <img src={t.logo} alt="" loading="lazy" decoding="async"
                    onError={e => { e.target.style.visibility = 'hidden'; }}/>
                </span>
                <span className="tp2-equipo-txt">
                  <span className="tp2-nombre">
                    {t.name}
                    {fav && <span className="tp2-fav" title="Tu equipo">★</span>}
                  </span>
                  <span className="tp2-meta">
                    {r && (
                      <span className={`tp2-racha ${r.tipo === 'G' ? 'is-g' : 'is-p'}`}
                        title={`${r.n} ${r.tipo === 'G' ? 'ganado' : 'perdido'}${r.n > 1 ? 's' : ''} seguido${r.n > 1 ? 's' : ''}`}>
                        Racha {r.n}{r.tipo}
                      </span>
                    )}
                    <span className="tp2-meta-mob">{t.pg}-{t.pp} · {dif > 0 ? `+${dif}` : dif}</span>
                  </span>
                </span>
              </span>
              <span className="tp2-num">{t.pj}</span>
              <span className="tp2-num">{t.pg}</span>
              <span className="tp2-num">{t.pp}</span>
              <span className="tp2-num tp2-opt tp2-dim">{t.pf}</span>
              <span className="tp2-num tp2-opt tp2-dim">{t.pc}</span>
              <span className={`tp2-num tp2-dif ${dif >= 0 ? 'is-pos' : 'is-neg'}`}>{dif > 0 ? `+${dif}` : dif}</span>
              <span className="tp2-num tp2-c-pts">
                <span className="tp2-pts" style={{ color: modeColor }}>{(t.pg ?? 0) * 2 + (t.pp ?? 0)}</span>
              </span>
              <span className="tp2-c-forma"><Forma ultimos={(t.historial ?? []).slice(-5)}/></span>
            </div>
          </div>
        );
      })}

      <div className="tp2-pie">
        <div className="tp2-leyenda">
          {BANDAS.map(b => <span key={b.key}><i style={{ background: b.color }}/>{b.label}</span>)}
          {posAntes && <span><b className="tp2-mov--sube">▲</b><b className="tp2-mov--baja">▼</b> vs. fecha anterior</span>}
        </div>
        <div className="tp2-desempate">Desempate: PTS → DIF → PF</div>
      </div>
    </div>
  );
}
