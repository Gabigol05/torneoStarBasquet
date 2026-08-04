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

  return (
    <div className="match-card encuesta-card">
      <div className="mc-header">
        <span className={`encuesta-tag ${CATEGORIA_CLASS[encuesta.categoria] ?? 'tag-gen'}`}>
          {CATEGORIA_LABEL[encuesta.categoria] ?? 'GENERAL'}
        </span>
        {encuesta.subtitulo && <span className="mc-date">{encuesta.subtitulo}</span>}
      </div>

      <div className="vote-question" style={{ marginBottom: 14, textAlign: 'left' }}>
        {encuesta.pregunta}
      </div>

      {!yaVoto ? (
        <div className="encuesta-opciones">
          {opciones.map(o => (
            <button key={o.opcion_id} className="vote-btn encuesta-opcion-btn"
              onClick={() => onVotar(encuesta.id, o.opcion_id)}>
              <OpcionLogo equipoId={o.equipo_id} />
              <span>{o.texto}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="vote-results fade-refresh" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
          {opciones.map(o => {
            const pct = totalVotos > 0 ? Math.round((Number(o.votos || 0) / totalVotos) * 100) : 0;
            const elegida = o.opcion_id === votoElegido;
            return (
              <div key={o.opcion_id} className="encuesta-opcion-row">
                <div className="encuesta-opcion-row-label">
                  <OpcionLogo equipoId={o.equipo_id} size={18} />
                  <span className={elegida ? 'winner' : ''}>{o.texto}{elegida ? ' ✓' : ''}</span>
                  <span className="encuesta-pct">{pct}%</span>
                </div>
                <div className="encuesta-bar">
                  <div className={`encuesta-bar-fill${elegida ? ' mine' : ''}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          <div className="encuesta-total">{totalVotos} voto{totalVotos === 1 ? '' : 's'}</div>
        </div>
      )}
    </div>
  );
}

export function EncuestasSection() {
  const { mode } = useTournament();
  const { encuestas, resultados, misVotos, votar, isLoading } = useEncuestas();

  // Solo se muestran las encuestas de la categoria activa (o generales), para
  // no mezclar votaciones de femenino con masculino segun el modo elegido.
  const encuestasVisibles = encuestas.filter(e => e.categoria === mode || e.categoria === 'general');

  if (isLoading && encuestasVisibles.length === 0) return null;
  if (encuestasVisibles.length === 0) return null;

  const handleVotar = async (encuestaId, opcionId) => {
    await votar(encuestaId, opcionId);
  };

  return (
    <section className="page-section" id="votaciones">
      <p className="section-eyebrow" style={{ color: 'var(--gold)' }}>Participá</p>
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
  );
}
