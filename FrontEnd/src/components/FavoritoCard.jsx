import { useFavorito } from '../hooks/useFavorito';
import { useStats } from '../context/StatsContext';
import { equiposFemenino } from '../data/femeninoData';
import { equiposMasculino } from '../data/masculinoData';
import { ordenarTabla } from './TablaPosiciones.jsx';

// Antes esta tarjeta dependia 100% de encontrar el equipo en el "equipos"
// en vivo (el que trae useMasculinoStats/useFemeninoStats) — si ese fetch
// todavia no habia resuelto, tardaba, o fallaba por un instante (pasa mas
// seguido de lo que parece: reconexion de Realtime, tab en segundo plano,
// etc.), la tarjeta directamente desaparecia aunque el favorito siguiera
// guardado. Ahora la identidad del equipo (nombre/logo/color) sale siempre
// del roster estatico, que esta disponible al toque sin depender de ningun
// fetch — asi la tarjeta nunca "parpadea" a desaparecida por una carga
// lenta. Las estadisticas en vivo (posicion, PJ/PG/PP, proximo partido) se
// suman encima apenas estan disponibles, pero no son requisito para mostrar
// la tarjeta.
const EQUIPOS_ESTATICOS = Object.fromEntries(
  [...equiposFemenino, ...equiposMasculino].map(e => [e.id, e])
);

// Alpha en hex de 2 digitos, concatenado directo al color (igual que en el
// resto de las tarjetas con color de equipo) — evita color-mix()/variables
// CSS con alpha dinamico, que no anda bien en navegadores viejos de celulares.
const hexA = (hex, alpha) => `${hex}${alpha}`;

const COPA = {
  oro:    { nombre: 'Copa de Oro',    icono: '🏆', clase: 'oro' },
  plata:  { nombre: 'Copa de Plata',  icono: '🥈', clase: 'plata' },
  bronce: { nombre: 'Copa de Bronce', icono: '🥉', clase: 'bronce' },
};
const INSTANCIA = { cuartos: 'Cuartos', semifinal: 'Semifinal', tercer_puesto: 'Tercer puesto', final: 'Final' };
const INSTANCIA_EN = { cuartos: 'en cuartos', semifinal: 'en semifinal', tercer_puesto: 'en el 3er puesto', final: 'en la final' };
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const diaCorto = iso => {
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  return `${DIAS[d.getDay()]} ${iso.split('-').reverse().slice(0, 2).join('/')}`;
};

// Tarjeta "Tu equipo favorito" (rediseño 24/11): escudo grande, posición en
// su zona, récord, últimos 5, cómo le va en playoffs y su próximo partido
// (o el último, si no tiene ninguno por jugar).
export function FavoritoCard({ onSelectTeam }) {
  const { favoritoId } = useFavorito();
  const { equipos = [], partidos = [], fechas = [] } = useStats();

  if (!favoritoId) return null;

  const base = EQUIPOS_ESTATICOS[favoritoId];
  // Esto solo pasa si el equipo favorito ya no existe en el roster actual
  // (por ejemplo, se renovaron los equipos de una temporada a otra).
  if (!base) return null;

  const equipoVivo = equipos.find(e => e.id === favoritoId);
  const equipo = equipoVivo ?? base;
  const color = equipo.color ?? '#F0B429';

  // Posición dentro de su zona (o en la general si no hay zonas), con el
  // mismo orden que la tabla de posiciones.
  let pos = null, zona = equipo.zona ?? null;
  if (equipoVivo) {
    const delGrupo = equipos.filter(e => (e.pj ?? 0) > 0 && (zona ? e.zona === zona : true));
    const i = ordenarTabla(delGrupo).findIndex(e => e.id === favoritoId);
    pos = i >= 0 ? i + 1 : null;
  }

  // Últimos 5 (más viejo → más nuevo) según el orden de las fechas.
  const numFecha = Object.fromEntries(fechas.map(f => [f.id, f.numero ?? 0]));
  const jugados = partidos
    .filter(p => p.estado === 'finalizado' && (p.equipo_local_id === favoritoId || p.equipo_visit_id === favoritoId))
    .sort((a, b) => (!!a.es_playoff - !!b.es_playoff) || ((numFecha[a.fecha_id] ?? 0) - (numFecha[b.fecha_id] ?? 0)) || ((a.hora_inicio ?? '').localeCompare(b.hora_inicio ?? '')));
  const resultado = p => {
    const local = p.equipo_local_id === favoritoId;
    const pf = (local ? p.puntos_local : p.puntos_visit) ?? 0;
    const pc = (local ? p.puntos_visit : p.puntos_local) ?? 0;
    return { pf, pc, gano: pf > pc, rivalId: local ? p.equipo_visit_id : p.equipo_local_id };
  };
  const forma = jugados.slice(-5).map(p => resultado(p));

  // Playoffs: último cruce del equipo.
  const cruces = partidos.filter(p => p.es_playoff && p.copa && (p.equipo_local_id === favoritoId || p.equipo_visit_id === favoritoId));
  const ORDEN = { cuartos: 0, semifinal: 1, tercer_puesto: 2, final: 3 };
  const ultimoCruce = [...cruces].sort((a, b) => (ORDEN[a.instancia] ?? 0) - (ORDEN[b.instancia] ?? 0)).pop();
  let playoff = null;
  if (ultimoCruce) {
    const c = COPA[ultimoCruce.copa];
    let detalle = INSTANCIA[ultimoCruce.instancia] ?? 'Playoffs';
    if (ultimoCruce.estado === 'finalizado') {
      const r = resultado(ultimoCruce);
      if (!r.gano) detalle = ultimoCruce.instancia === 'final' ? 'Subcampeón' : ultimoCruce.instancia === 'tercer_puesto' ? '4° puesto' : `eliminado ${INSTANCIA_EN[ultimoCruce.instancia] ?? ''}`.trim();
      else if (ultimoCruce.instancia === 'final') detalle = '¡Campeón!';
      else if (ultimoCruce.instancia === 'tercer_puesto') detalle = '3er puesto';
      else detalle = `pasó ${INSTANCIA_EN[ultimoCruce.instancia] ?? ''}`.trim();
    }
    if (c) playoff = { ...c, detalle };
  }

  const proximo = equipo.proximos?.[0];
  const ultimo = jugados[jugados.length - 1];
  const rivalDe = id => EQUIPOS_ESTATICOS[id];
  const etiquetaPartido = p => (p?.esPlayoff || p?.es_playoff)
    ? `${INSTANCIA[p.instancia] ?? 'Playoffs'}${p.copa ? ` ${COPA[p.copa]?.nombre.replace('Copa de ', '') ?? ''}` : ''}`
    : (p?.fechaNum ? `Fecha ${p.fechaNum}` : (numFecha[p?.fecha_id] ? `Fecha ${numFecha[p.fecha_id]}` : ''));

  let panel = null;
  if (proximo) {
    const rv = rivalDe(proximo.rivalId) ?? equipos.find(e => e.name === proximo.rival);
    panel = (
      <div className="fv-prox">
        <div className="fv-prox-t"><span>Próximo partido</span><b>{diaCorto(proximo.dia) ?? etiquetaPartido(proximo)}</b></div>
        <div className="fv-vs">
          {rv?.logo && <img src={rv.logo} alt="" style={{ borderColor: rv.color ?? '#8899BB' }} loading="lazy"/>}
          <span className="n">vs {proximo.rival}</span>
          {proximo.hora && <span className="h">{proximo.hora}<small>hs</small></span>}
        </div>
        <div className="fv-sub">{[proximo.lugar && `📍 ${proximo.lugar}`, etiquetaPartido(proximo)].filter(Boolean).join(' · ')}</div>
      </div>
    );
  } else if (ultimo) {
    const r = resultado(ultimo);
    const rv = rivalDe(r.rivalId);
    const dia = ultimo.fecha_partido ?? fechas.find(f => f.id === ultimo.fecha_id)?.fecha_dia;
    panel = (
      <div className="fv-prox">
        <div className="fv-prox-t"><span>Último partido</span><span>{[etiquetaPartido(ultimo), diaCorto(dia)].filter(Boolean).join(' · ')}</span></div>
        <div className="fv-vs">
          {rv?.logo && <img src={rv.logo} alt="" style={{ borderColor: rv.color ?? '#8899BB' }} loading="lazy"/>}
          <span className="n">vs {rv?.name ?? 'Rival'}</span>
          <span className={`fv-res ${r.gano ? 'g' : 'p'}`}>{r.gano ? 'G' : 'P'} {r.pf}-{r.pc}</span>
        </div>
        <div className="fv-sub">{playoff?.detalle?.startsWith('eliminado') || playoff?.detalle === 'Subcampeón' ? 'Temporada terminada · ' : ''}Tocá para ver el equipo →</div>
      </div>
    );
  } else {
    panel = (
      <div className="fv-prox">
        <div className="fv-prox-t"><span>Próximo partido</span></div>
        <div className="fv-sub">📅 Fixture pendiente de publicación</div>
      </div>
    );
  }

  return (
    <div className="fv" style={{ '--t': color }} role="button" tabIndex={0}
      onClick={() => onSelectTeam?.(equipo)}
      onKeyDown={e => { if (e.key === 'Enter') onSelectTeam?.(equipo); }}
      aria-label={`Ver ${equipo.name}`}>
      <img className="fv-marca" src={equipo.logo} alt="" aria-hidden="true" loading="lazy"/>
      <div className="fv-esc-wrap">
        <div className="fv-esc" style={{ boxShadow: `0 0 26px ${hexA(color, '88')}` }}>
          <img src={equipo.logo} alt={equipo.name} loading="lazy" decoding="async" />
        </div>
        <span className="fv-star" aria-hidden="true">★</span>
      </div>
      <div className="fv-info">
        <div className="fv-lbl">Tu equipo favorito</div>
        <div className="fv-nom">{equipo.name}</div>
        <div className="fv-chips">
          {pos != null && <span className="fv-chip"><b>{pos}°</b> {zona ? `Zona ${zona}` : 'en la tabla'}</span>}
          {(equipo.pj ?? 0) > 0 && <span className="fv-chip"><b>{equipo.pg ?? 0}G · {equipo.pp ?? 0}P</b></span>}
          {playoff && <span className={`fv-chip copa ${playoff.clase}`}>{playoff.icono} {playoff.nombre} · {playoff.detalle}</span>}
          {forma.length > 0 && (
            <span className="fv-forma" aria-label="Últimos partidos">
              <small>Últimos {forma.length}</small>
              {forma.map((r, i) => (
                <i key={i} className={`${r.gano ? 'g' : 'p'}${i === forma.length - 1 ? ' ult' : ''}`}
                  title={`${r.gano ? 'Ganó' : 'Perdió'} ${r.pf}-${r.pc}`}>{r.gano ? 'G' : 'P'}</i>
              ))}
            </span>
          )}
        </div>
      </div>
      {panel}
    </div>
  );
}
