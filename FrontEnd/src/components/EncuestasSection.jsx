import { useEncuestas } from '../hooks/useEncuestas';
import { useTournament } from '../context/TournamentContext';
import { equiposFemenino } from '../data/femeninoData';
import { equiposMasculino } from '../data/masculinoData';

const EQUIPOS_MAP = Object.fromEntries(
  [...equiposFemenino, ...equiposMasculino].map(e => [e.id, e])
);

const CATEGORIA_LABEL = { femenino: 'FEMENINO', masculino: 'MASCULINO', general: 'GENERAL' };
const CATEGORIA_CLASS = { femenino: 'tag-fem', masculino: 'tag-masc', general: 'tag-gen' };

// Alpha en hex de 2 digitos, concatenado directo al color (igual que en las
// tarjetas de fixture/resultado) — evita color-mix()/variables CSS con alpha
// dinamico, que no anda bien en navegadores viejos de celulares.
const hexA = (hex, alpha) => `${hex}${alpha}`;

function OpcionLogo({ equipoId, size = 22, ring }) {
  const eq = EQUIPOS_MAP[equipoId];
  if (!eq?.logo) return null;
  const color = ring ?? `${eq.color}40`;
  return (
    <img src={eq.logo} alt="" width={size} height={size}
      style={{ borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${color}`, flexShrink: 0 }}
      onError={e => { e.currentTarget.style.display = 'none'; }} />
  );
}

function EncuestaCard({ encuesta, opciones, votoElegido, onVotar }) {
  const totalVotos = opciones.reduce((sum, o) => sum + Number(o.votos || 0), 0);
  const yaVoto = votoElegido != null;
  const catClass = CATEGORIA_CLASS[encuesta.categoria] ?? 'tag-gen';
  const maxVotos = Math.max(0, ...opciones.map(o => Number(o.votos || 0)));

  // Si la encuesta es "¿Quién gana?" entre dos equipos (el caso mas comun,
  // creado automaticamente por partido), la card usa el mismo degradado con
  // los colores de ambos equipos que ya tienen las tarjetas de fixture y
  // resultado — si no, se mantiene el estilo neutro con la barra de arriba.
  const equipoIds = opciones.map(o => o.equipo_id).filter(Boolean);
  const esDuelo = equipoIds.length === 2 && opciones.length === 2;
  const cA = esDuelo ? (EQUIPOS_MAP[equipoIds[0]]?.color ?? '#8899BB') : null;
  const cB = esDuelo ? (EQUIPOS_MAP[equipoIds[1]]?.color ?? '#8899BB') : null;

  return (
    <div className={`encuesta-card-v2 reveal-on-scroll ${catClass}${esDuelo ? ' es-duelo' : ''}`}
      style={esDuelo ? { background: `linear-gradient(115deg, ${hexA(cA,'55')}, #1C2535 40%, ${hexA(cB,'55')})` } : undefined}>
      <div className="ev-card-inner" style={esDuelo ? { background: `linear-gradient(135deg, ${hexA(cA,'14')}, #0B111C 45%, ${hexA(cB,'14')})` } : undefined}>
        <div className="ev-header">
          <span className={`encuesta-tag ${catClass}`}>
            {CATEGORIA_LABEL[encuesta.categoria] ?? 'GENERAL'}
          </span>
          {encuesta.subtitulo && <span className="ev-subtitulo">{encuesta.subtitulo}</span>}
        </div>

        <div className="ev-question">{encuesta.pregunta}</div>

        {!yaVoto ? (
          <div className="ev-opciones">
            {opciones.map((o, i) => {
              const color = esDuelo ? (i === 0 ? cA : cB) : null;
              return (
                <button key={o.opcion_id} className="ev-opcion-btn"
                  style={color ? { borderColor: hexA(color,'55') } : undefined}
                  onClick={() => onVotar(encuesta.id, o.opcion_id)}>
                  <span className="ev-opcion-radio" style={color ? { borderColor: color } : undefined} />
                  <OpcionLogo equipoId={o.equipo_id} ring={color} />
                  <span className="ev-opcion-txt">{o.texto}</span>
                  <span className="ev-opcion-arrow">→</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="ev-resultados fade-refresh">
            {opciones.map((o, i) => {
              const votos = Number(o.votos || 0);
              const pct = totalVotos > 0 ? Math.round((votos / totalVotos) * 100) : 0;
              const elegida = o.opcion_id === votoElegido;
              const liderando = votos === maxVotos && maxVotos > 0;
              const color = esDuelo ? (i === 0 ? cA : cB) : null;
              return (
                <div key={o.opcion_id} className={`ev-result-row${elegida ? ' mine' : ''}${liderando ? ' leading' : ''}`}>
                  <div className="ev-result-top">
                    <div className="ev-result-label">
                      <OpcionLogo equipoId={o.equipo_id} size={20} ring={color} />
                      <span>{o.texto}</span>
                      {liderando && <span className="ev-crown" title="Liderando">♛</span>}
                      {elegida && <span className="ev-your-vote">TU VOTO</span>}
                    </div>
                    <div className="ev-pct-big" style={color && liderando ? { color } : undefined}>
                      {pct}<span className="ev-pct-sign">%</span>
                    </div>
                  </div>
                  <div className="ev-bar-track">
                    <div className={`ev-bar-fill${elegida ? ' mine' : ''}${liderando ? ' leading' : ''}`}
                      style={{ width: `${pct}%`, ...(color ? { background: `linear-gradient(90deg, ${hexA(color,'99')}, ${color})` } : {}) }} />
                  </div>
                </div>
              );
            })}
            <div className="ev-total">{totalVotos} voto{totalVotos === 1 ? '' : 's'} totales</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function EncuestasSection({ addToast } = {}) {
  const { mode } = useTournament();
  const { encuestas, resultados, misVotos, votar, isLoading } = useEncuestas();

  const encuestasVisibles = encuestas.filter(e => e.categoria === mode || e.categoria === 'general');

  if (isLoading && encuestasVisibles.length === 0) return null;
  if (encuestasVisibles.length === 0) return null;

  const handleVotar = async (encuestaId, opcionId) => {
    const res = await votar(encuestaId, opcionId);
    if (!res) return;
    if (!res.ok) {
      addToast?.({ icon: '⚠️', title: 'No se pudo votar', sub: res.message, duration: 4500 });
    } else {
      addToast?.({ icon: '🗳️', title: '¡Voto registrado!', duration: 3000 });
    }
  };

  return (
    <div className="votaciones-band">
      <section className="page-section" id="votaciones" style={{ position: 'relative', zIndex: 1 }}>
        <p className="section-eyebrow" style={{ color: 'var(--gold)' }}>✦ Participá</p>
        <h2 className="section-heading">Votaciones <span className="gold">2026</span></h2>
        <div className="encuestas-grid">
          {encuestasVisibles.map(encuesta => (
            <EncuestaCard
              key={encuesta.id}
              encuesta={encuesta}
              opciones={resultados[encuesta.id] ?? []}
              votoElegido={misVotos[encuesta.id]}
              onVotar={handleVotar}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
