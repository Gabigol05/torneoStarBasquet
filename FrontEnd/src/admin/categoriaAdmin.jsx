// Utilidades compartidas por los componentes del admin que necesitan operar
// tanto sobre el torneo femenino como el masculino (tablas con sufijo distinto).

import { supabase } from '../lib/supabase';

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

// Crea automáticamente una encuesta "¿Quién gana?" para un partido recién
// cargado en el fixture (todavía no jugado). Queda linkeada a ese partido vía
// partido_id, así el trigger de la base la cierra sola cuando el partido se
// marca como finalizado (ver update_encuestas_partido.sql).
export async function sugerirEncuestaQuienGana({ categoria, partidoId, equipoLocal, equipoVisit, subtitulo }) {
  if (!equipoLocal || !equipoVisit || !partidoId) return null;
  const { data: enc, error: eErr } = await supabase
    .from('encuestas')
    .insert({
      categoria,
      pregunta: `¿Quién gana? ${equipoLocal.nombre} vs ${equipoVisit.nombre}`,
      subtitulo: subtitulo || null,
      activa: true,
      partido_id: partidoId,
    })
    .select('id')
    .single();
  if (eErr) throw eErr;

  const { error: oErr } = await supabase.from('encuesta_opciones').insert([
    { encuesta_id: enc.id, texto: equipoLocal.nombre, equipo_id: equipoLocal.id, orden: 1 },
    { encuesta_id: enc.id, texto: equipoVisit.nombre, equipo_id: equipoVisit.id, orden: 2 },
  ]);
  if (oErr) throw oErr;

  return enc.id;
}

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
