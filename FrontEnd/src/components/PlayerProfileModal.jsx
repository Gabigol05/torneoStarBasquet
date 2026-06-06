import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function ShareButton({ player }) {
  const handleShare = async () => {
    const text = `🏀 ${player.name} — ${player.team}\nPTS: ${player.pts} | REB: ${player.reb} | AST: ${player.ast}\nTorneo Star Básquet 2026`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${player.name} — Star Básquet`, text });
      } catch (_) { /* cancelado por el usuario */ }
    } else {
      await navigator.clipboard.writeText(text);
      alert('¡Copiado al portapapeles!');
    }
  };

  return (
    <button className="pp-share-btn" onClick={handleShare} title="Compartir perfil">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
      Compartir
    </button>
  );
}

export function PlayerProfileModal({ player, isOpen, onClose }) {
  if (!isOpen || !player) return null;

  // FIX: usar ?? en vez de || para que el 0 real no sea reemplazado por mock
  const pts = player.pts ?? 0;
  const reb = player.reb ?? 0;
  const ast = player.ast ?? 0;

  const hayStats = pts > 0 || reb > 0 || ast > 0;

  const strokeColor = '#FACC15';

  // Solo mostramos gráfico si hay stats reales
  const chartData = hayStats ? [
    { match: 'F1', pts },
    { match: 'F2', pts },
    { match: 'F3', pts },
    { match: 'F4', pts },
    { match: 'F5', pts },
  ] : [];

  return (
    <div className="gc-overlay" onClick={onClose}>
      <div className="pp-modal" onClick={(e) => e.stopPropagation()}>

        <div className="pp-card">
          <div className="pp-card-actions">
            <ShareButton player={{ ...player, pts, reb, ast }} />
            <button className="gc-close-btn" onClick={onClose}>&times;</button>
          </div>

          <div className="pp-avatar-container">
            {/* Iniciales con el color del equipo si disponible */}
            <div className="pp-avatar-initials">
              {player.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
            </div>
          </div>

          <div className="pp-name">{player.name}</div>
          <div className="pp-team">{player.team}</div>

          {player.fechaNac && player.fechaNac !== '-' && player.fechaNac !== null && (
            <div className="pp-dob">
              🎂 {player.fechaNac}
            </div>
          )}

          <div className="pp-stats-grid">
            <div className="pp-stat-box">
              <div className="pp-stat-val">{pts}</div>
              <div className="pp-stat-lbl">PTS</div>
            </div>
            <div className="pp-stat-box">
              <div className="pp-stat-val">{reb}</div>
              <div className="pp-stat-lbl">REB</div>
            </div>
            <div className="pp-stat-box">
              <div className="pp-stat-val">{ast}</div>
              <div className="pp-stat-lbl">AST</div>
            </div>
          </div>
        </div>

        <div className="pp-body">
          {hayStats ? (
            <>
              <div className="pp-chart-title">Evolución de Anotación</div>
              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <XAxis dataKey="match" stroke="#6b7280" tick={{ fontFamily: 'Barlow Condensed', fontSize: 14 }} />
                    <YAxis stroke="#6b7280" tick={{ fontFamily: 'Bebas Neue', fontSize: 16 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: strokeColor, fontFamily: 'Bebas Neue', fontSize: '20px' }}
                    />
                    <Line type="monotone" dataKey="pts" stroke={strokeColor} strokeWidth={4}
                      dot={{ r: 4, fill: strokeColor, strokeWidth: 2, stroke: '#08101a' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="pp-no-stats">
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
              <div className="pp-no-stats-title">Estadísticas pendientes</div>
              <div className="pp-no-stats-sub">Se actualizarán automáticamente cuando comience el torneo</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
