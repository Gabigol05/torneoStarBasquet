import { useFavorito } from '../hooks/useFavorito';
import { useStats } from '../context/StatsContext';
import { equiposFemenino } from '../data/femeninoData';
import { equiposMasculino } from '../data/masculinoData';

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

export function FavoritoCard({ onSelectTeam }) {
  const { favoritoId } = useFavorito();
  const { equipos = [] } = useStats();

  if (!favoritoId) return null;

  const base = EQUIPOS_ESTATICOS[favoritoId];
  // Esto solo pasa si el equipo favorito ya no existe en el roster actual
  // (por ejemplo, se renovaron los equipos de una temporada a otra).
  if (!base) return null;

  const equipoVivo = equipos.find(e => e.id === favoritoId);
  const equipo = equipoVivo ?? base;

  const tieneStats = (equipo.pj ?? 0) > 0;
  const proximo = equipo.proximos?.[0];
  const pct = tieneStats ? (equipo.pg / equipo.pj).toFixed(3) : '.000';

  const sortedTeams = [...equipos].sort((a, b) => (b.pg ?? 0) - (a.pg ?? 0));
  const posIdx = equipoVivo ? sortedTeams.findIndex(t => t.id === favoritoId) : -1;
  const pos = posIdx >= 0 ? posIdx + 1 : null;

  return (
    <div
      className="favorito-card"
      style={{ '--fav-color': equipo.color, background: `linear-gradient(135deg, ${hexA(equipo.color, '70')}, #1C2535 65%)` }}
      onClick={() => onSelectTeam?.(equipo)}
    >
      <div className="fav-card-inner" style={{ background: `linear-gradient(135deg, ${hexA(equipo.color, '14')}, #0B111C 60%)` }}>
        <div className="fav-label">⭐ Tu equipo favorito</div>
        <div className="fav-body">
          <div className="fav-logo-wrap" style={{ borderColor: equipo.color, boxShadow: `0 0 14px ${hexA(equipo.color, '59')}` }}>
            <img src={equipo.logo} alt={equipo.name} loading="lazy" decoding="async" />
          </div>
          <div className="fav-info">
            <div className="fav-name" style={{ color: equipo.color }}>{equipo.name}</div>
            <div className="fav-stats-row">
              {pos != null && (
                <>
                  <span className="fav-stat">
                    <strong style={{ color: equipo.color }}>#{pos}</strong> Posición
                  </span>
                  <span className="fav-stat-sep">·</span>
                </>
              )}
              <span className="fav-stat">
                <strong>{equipo.pg ?? 0}G - {equipo.pp ?? 0}P</strong>
              </span>
              <span className="fav-stat-sep">·</span>
              <span className="fav-stat">{pct}</span>
            </div>
            {proximo ? (
              <div className="fav-proximo">
                📅 Próximo: <strong>{equipo.name} vs {proximo.rival}</strong>
                {proximo.fecha ? ` · ${proximo.fecha}` : ''}
              </div>
            ) : (
              <div className="fav-proximo">📅 Fixture pendiente de publicación</div>
            )}
          </div>
          <div className="fav-arrow">→</div>
        </div>
      </div>
    </div>
  );
}
