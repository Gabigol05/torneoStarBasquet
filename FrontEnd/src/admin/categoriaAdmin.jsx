// Utilidades compartidas por los componentes del admin que necesitan operar
// tanto sobre el torneo femenino como el masculino (tablas con sufijo distinto).

export const TABLAS = {
  femenino: {
    equipos:        'equipos_femenino',
    jugadores:      'jugadoras_femenino',
    jugadorIdField: 'jugadora_id',
    fechas:         'fechas_femenino',
    partidos:       'partidos_femenino',
    stats:          'stats_partido_femenino',
    estadisticas:   'estadisticas_femenino',
    uploadLog:      'upload_log',
    aliases:        'nombre_aliases',
    mvpField:       'mvp_jugadora_id',
  },
  masculino: {
    equipos:        'equipos_masculino',
    jugadores:      'jugadores_masculino',
    jugadorIdField: 'jugador_id',
    fechas:         'fechas_masculino',
    partidos:       'partidos_masculino',
    stats:          'stats_partido_masculino',
    estadisticas:   'estadisticas_masculino',
    uploadLog:      'upload_log_masculino',
    aliases:        'nombre_aliases_masculino',
    mvpField:       'mvp_jugador_id',
  },
};

export function CategoriaToggle({ categoria, setCategoria }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: '#0E1420', border: '1px solid #1C2535', borderRadius: 10, padding: 4, width: 'fit-content' }}>
      {['femenino', 'masculino'].map(c => (
        <button key={c} onClick={() => setCategoria(c)}
          style={{
            padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 1,
            textTransform: 'uppercase',
            background: categoria === c ? (c === 'femenino' ? '#E8187A' : '#1878E8') : 'transparent',
            color: categoria === c ? '#fff' : '#6B7A99',
            transition: 'all .15s',
          }}>
          {c === 'femenino' ? '♀ Femenino' : '♂ Masculino'}
        </button>
      ))}
    </div>
  );
}
