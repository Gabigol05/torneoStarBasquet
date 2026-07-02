import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  ?? '';
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

// Fallback seguro: si no hay .env la app no crashea, solo no hay datos en vivo
const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON);

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON)
  : null;

export { isConfigured };
