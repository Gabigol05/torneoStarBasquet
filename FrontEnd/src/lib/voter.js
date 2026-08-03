// ─── Identidad del votante (anti-doble-voto sin login público) ────────────────
// Combina dos capas:
//  1. Un token UUID persistido en localStorage → bloquea re-votos en el mismo navegador.
//  2. Un hash de la IP pública del visitante → bloquea re-votos desde la misma red
//     aunque borren el localStorage o usen otro navegador en la misma conexión.
// Ambas se validan finalmente con constraints UNIQUE en la base (ver
// create_tables_encuestas.sql), así que aunque alguien manipule el cliente,
// la base es la que decide si el voto se acepta.

const TOKEN_KEY = 'star_voter_token';
const IP_CACHE_KEY = 'star_voter_ip_hash';
const IP_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6hs

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

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getVoterIpHash() {
  try {
    const cached = JSON.parse(localStorage.getItem(IP_CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.ts < IP_CACHE_TTL_MS) return cached.hash;
  } catch { /* ignorar cache corrupta */ }

  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const { ip } = await res.json();
    if (!ip) return null;
    const hash = await sha256(ip);
    try {
      localStorage.setItem(IP_CACHE_KEY, JSON.stringify({ hash, ts: Date.now() }));
    } catch { /* si no se puede cachear, no pasa nada */ }
    return hash;
  } catch {
    // Sin conexión al servicio de IP — el voto igual se intenta, solo pierde
    // esa capa extra de protección para ese caso puntual.
    return null;
  }
}

// Registro local de "ya voté en esta encuesta" para feedback instantáneo en UI
// (la fuente de verdad real sigue siendo la base de datos).
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
