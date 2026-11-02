// ─── Identidad del votante (anti-doble-voto sin login público) ────────────────
// Combina dos capas:
//  1. Un token UUID persistido en localStorage → bloquea re-votos en el mismo navegador.
//  2. Un hash de la IP pública del visitante → bloquea re-votos desde la misma red
//     aunque borren el localStorage o usen otro navegador en la misma conexión.
// Ambas se validan finalmente con constraints UNIQUE en la base (ver
// create_tables_encuestas.sql), así que aunque alguien manipule el cliente,
// la base es la que decide si el voto se acepta.

const TOKEN_KEY = 'star_voter_token';

export function getVoterToken() {
  try {
    let token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem(TOKEN_KEY, token);
    }
    return token;
  } catch {
    // localStorage no disponible (modo privado estricto, etc.) — token de sesión
    return `session-${Math.random().toString(36).slice(2)}`;
  }
}

// (Antes acá estaba getVoterIpHash(), que le pedía la IP a api.ipify.org desde
// el navegador para "controlar" votos por red. Se sacó: lo decidía el propio
// navegador, así que no protegía nada, y demoraba la carga. El control ahora
// lo hace el servidor dentro de fn_votar — ver seguridad_paso1.sql.)

const VOTES_KEY = 'star_votes';

export function getLocalVotes() {
  try {
    return JSON.parse(localStorage.getItem(VOTES_KEY) || '{}');
  } catch {
    return {};
  }
}

export function setLocalVote(encuestaId, opcionId) {
  try {
    const votes = getLocalVotes();
    votes[encuestaId] = opcionId;
    localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
  } catch { /* best-effort */ }
}
