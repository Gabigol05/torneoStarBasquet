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
    equipoAliases:  'equipo_aliases',
    mvpField:       'mvp_jugadora_id',
    historial:      'partido_historial_femenino',
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
    equipoAliases:  'equipo_aliases_masculino',
    mvpField:       'mvp_jugador_id',
    historial:      'partido_historial_masculino',
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

// Selector femenino/masculino compartido por TODO el panel — un solo lugar
// para tocar el estilo en vez de que cada sección tenga el suyo (antes
// Resumen tenía tres sueltos, ver Dashboard.jsx). El resaltado con sombra en
// la opción activa es a propósito: con los dos colores tan parecidos en
// tamaño/forma, de un vistazo rápido hay que poder distinguir cuál está
// elegida sin tener que leer el texto.
export function CategoriaToggle({ categoria, setCategoria }) {
  const COLOR = { femenino: '#E8187A', masculino: '#1878E8' };
  return (
    <div style={{ display: 'flex', gap: 5, background: '#0E1420', border: '1px solid #1C2535', borderRadius: 11, padding: 4, width: 'fit-content' }}>
      {['femenino', 'masculino'].map(c => {
        const activo = categoria === c;
        return (
          <button key={c} onClick={() => setCategoria(c)} aria-pressed={activo}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
              border: activo ? `1px solid ${COLOR[c]}` : '1px solid transparent',
              fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: 1,
              textTransform: 'uppercase',
              background: activo ? COLOR[c] : 'transparent',
              color: activo ? '#fff' : '#6B7A99',
              boxShadow: activo ? `0 2px 12px ${COLOR[c]}55` : 'none',
              transition: 'background .15s, box-shadow .15s, color .15s',
            }}>
            <span style={{ fontSize: 14 }}>{c === 'femenino' ? '♀' : '♂'}</span>
            {c === 'femenino' ? 'Femenino' : 'Masculino'}
          </button>
        );
      })}
    </div>
  );
}
