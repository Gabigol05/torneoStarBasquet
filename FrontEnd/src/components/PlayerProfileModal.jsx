import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function PlayerProfileModal({ player, isOpen, onClose }) {
  if (!isOpen || !player) return null;

  // Datos mockeados de rendimiento
  const chartData = [
    { match: 'F1', pts: 12 },
    { match: 'F2', pts: 18 },
    { match: 'F3', pts: 15 },
    { match: 'F4', pts: 24 },
    { match: 'F5', pts: 22 }
  ];

  // Determinar color de línea basado en el contexto (se puede pasar como prop o hardcodear el de la variable CSS)
  const strokeColor = '#FACC15'; // Dorado genérico, o var(--color-primary)

  return (
    <div className="gc-overlay" onClick={onClose}>
      <div className="pp-modal" onClick={(e) => e.stopPropagation()}>

        {/* TARJETA 2K STYLE */}
        <div className="pp-card">
          <button className="gc-close-btn" onClick={onClose}>&times;</button>

          <div className="pp-avatar-container">
            {/* Silueta genérica */}
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>

          <div className="pp-name">{player.name}</div>
          <div className="pp-team">{player.team}</div>
          {player.fechaNac && player.fechaNac !== '-' && (
            <div style={{ fontFamily: "'Barlow Condensed'", fontSize: '13px', color: 'var(--gray)', marginTop: '4px', marginBottom: '4px' }}>
              🎂 {player.fechaNac}
            </div>
          )}

          <div className="pp-stats-grid">
            <div className="pp-stat-box">
              <div className="pp-stat-val">{player.pts || 18.5}</div>
              <div className="pp-stat-lbl">PTS</div>
            </div>
            <div className="pp-stat-box">
              <div className="pp-stat-val">{player.reb || 6.2}</div>
              <div className="pp-stat-lbl">REB</div>
            </div>
            <div className="pp-stat-box">
              <div className="pp-stat-val">{player.ast || 4.1}</div>
              <div className="pp-stat-lbl">AST</div>
            </div>
          </div>
        </div>

        {/* GRÁFICO DE RENDIMIENTO */}
        <div className="pp-body">
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
                <Line
                  type="monotone"
                  dataKey="pts"
                  stroke={strokeColor}
                  strokeWidth={4}
                  dot={{ r: 4, fill: strokeColor, strokeWidth: 2, stroke: '#08101a' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
