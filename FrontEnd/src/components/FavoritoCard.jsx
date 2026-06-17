import { useFavorito } from '../hooks/useFavorito';
import { useStats } from '../context/StatsContext';

export function FavoritoCard({ onSelectTeam }) {
  const { favoritoId } = useFavorito();
  const { equipos } = useStats();

  if (!favoritoId) return null;

  const equipo = equipos.find(e => e.id === favoritoId);
  if (!equipo) return null;

  const proximo = equipo.proximos?.[0];
  const pct = equipo.pj > 0 ? (equipo.pg / equipo.pj).toFixed(3) : '.000';

  const sortedTeams = [...equipos].sort((a, b) => b.pg - a.pg);
  const pos = sortedTeams.findIndex(t => t.id === favoritoId) + 1;

  return (
    <div
      className="favorito-card"
      style={{ '--fav-color': equipo.color }}
      onClick={() => onSelectTeam?.(equipo)}
    >
      <div className="fav-label">⭐ Tu equipo favorito</div>
      <div className="fav-body">
        <div className="fav-logo-wrap" style={{ borderColor: equipo.color }}>
          <img src={equipo.logo} alt={equipo.name} loading="lazy" decoding="async" />
        </div>
        <div className="fav-info">
          <div className="fav-name" style={{ color: equipo.color }}>{equipo.name}</div>
          <div className="fav-stats-row">
            <span className="fav-stat">
              <strong style={{ color: equipo.color }}>#{pos}</strong> Posición
            </span>
            <span className="fav-stat-sep">·</span>
            <span className="fav-stat">
              <strong>{equipo.pg}G - {equipo.pp}P</strong>
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
  );
}
