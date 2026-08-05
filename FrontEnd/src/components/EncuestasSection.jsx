import { useEncuestas } from '../hooks/useEncuestas';
import { useTournament } from '../context/TournamentContext';
import { equiposFemenino } from '../data/femeninoData';
import { equiposMasculino } from '../data/masculinoData';

const EQUIPOS_MAP = Object.fromEntries(
  [...equiposFemenino, ...equiposMasculino].map(e => [e.id, e])
);

const CATEGORIA_LABEL = { femenino: 'FEMENINO', masculino: 'MASCULINO', general: 'GENERAL' };
const CATEGORIA_CLASS = { femenino: 'tag-fem', masculino: 'tag-masc', general: 'tag-gen' };

function OpcionLogo({ equipoId, size = 22 }) {
  const eq = EQUIPOS_MAP[equipoId];
  if (!eq?.logo) return null;
  return (
    <img src={eq.logo} alt="" width={size} height={size}
      style={{ borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${eq.color}40`, flexShrink: 0 }}
      onError={e => { e.currentTarget.style.display = 'none'; }} />
  );
}

function EncuestaCard({ encuesta, opciones, votoElegido, onVotar }) {
  const totalVotos = opciones.reduce((sum, o) => sum + Number(o.votos || 0), 0);
  const yaVoto = votoElegido != null;
  const catClass = CATEGORIA_CLASS[encuesta.categoria] ?? 'tag-gen';
  const maxVotos = Math.max(0, ...opciones.map(o => Number(o.votos || 0)));

  return (
    <div className={`encuesta-card-v2 reveal-on-scroll ${catClass}`}>
      <div className="ev-header">
        <span className={`encuesta-tag ${catClass}`}>
          {CATEGORIA_LABEL[encuesta.categoria] ?? 'GENERAL'}
        </span>
        {encuesta.subtitulo && <span className="ev-subtitulo">{encuesta.subtitulo}</span>}
      </div>

      <div className="ev-question">{encuesta.pregunta}</div>

      {!yaVoto ? (
        <div className="ev-opciones">
          {opciones.map(o => (
            <button key={o.opcion_id} className="ev-opcion-btn"
              onClick={() => onVotar(encuesta.id, o.opcion_id)}>
              <span className="ev-opcion-radio" />
              <OpcionLogo equipoId={o.equipo_id} />
              <span className="ev-opcion-txt">{o.texto}</span>
              <span className="ev-opcion-arrow">→</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="ev-resultados fade-refresh">
          {opciones.map(o => {
            const votos = Number(o.votos || 0);
            const pct = totalVotos > 0 ? Math.round((votos / totalVotos) * 100) : 0;
            const elegida = o.opcion_id === votoElegido;
            const liderando = votos === maxVotos && maxVotos > 0;
            return (
              <div key={o.opcion_id} className={`ev-result-row${elegida ? ' mine' : ''}${liderando ? ' leading' : ''}`}>
                <div className="ev-result-top">
                  <div className="ev-result-label">
                    <OpcionLogo equipoId={o.equipo_id} size={20} />
                    <span>{o.texto}</span>
                    {liderando && <span className="ev-crown" title="Liderando">♛</span>}
                    {elegida && <span className="ev-your-vote">TU VOTO</span>}
                  </div>
                  <div className="ev-pct-big">{pct}<span className="ev-pct-sign">%</span></div>
                </div>
                <div className="ev-bar-track">
                  <div className={`ev-bar-fill${elegida ? ' mine' : ''}${liderando ? ' leading' : ''}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          <div className="ev-total">{totalVotos} voto{totalVotos === 1 ? '' : 's'} totales</div>
        </div>
      )}
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
