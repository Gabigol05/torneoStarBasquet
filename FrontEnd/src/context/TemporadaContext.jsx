import { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { supabase, isConfigured } from '../lib/supabase';

// Temporadas/torneos (ej. "Temporada 2026", "Apertura 2027"). Ver
// add_temporadas.sql para el esquema. Este contexto es compartido por el
// sitio público (para elegir qué temporada mirar) y el panel admin (para
// saber cuál es la ACTIVA, que es donde cae todo lo que se carga nuevo).
const TemporadaContext = createContext(null);

const FALLBACK = {
  temporadas: [],
  temporadaActivaId: null,
  temporadaSeleccionadaId: null,
  setTemporadaSeleccionadaId: () => {},
  temporadaSeleccionada: null,
  esTemporadaActiva: true,
  crearTemporada: async () => { throw new Error('TemporadaProvider no está montado'); },
  activarTemporada: async () => { throw new Error('TemporadaProvider no está montado'); },
  loading: false,
  refetch: async () => {},
};

export function TemporadaProvider({ children }) {
  const [temporadas, setTemporadas] = useState([]);
  const [temporadaActivaId, setTemporadaActivaId] = useState(null);
  // La que se está MIRANDO en el sitio público — arranca en la activa, pero
  // el visitante la puede cambiar con el chip para ver una temporada vieja
  // sin que eso afecte qué temporada es la "actual" para el resto del sitio.
  const [temporadaSeleccionadaId, setTemporadaSeleccionadaId] = useState(null);
  const [loading, setLoading] = useState(isConfigured);

  const cargar = useCallback(async () => {
    if (!isConfigured) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('temporadas')
      .select('*')
      .order('id', { ascending: true });
    if (error) {
      console.warn('[TemporadaContext] temporadas:', error.message);
      setLoading(false);
      return;
    }
    const rows = data ?? [];
    setTemporadas(rows);
    const activa = rows.find(t => t.activa);
    setTemporadaActivaId(activa?.id ?? null);
    // Solo pisar la seleccionada si todavía no había ninguna (primera carga)
    // o si la que estaba seleccionada dejó de existir — así no se resetea
    // la vista de alguien que estaba mirando a propósito una temporada vieja.
    setTemporadaSeleccionadaId(prev => {
      if (prev != null && rows.some(t => t.id === prev)) return prev;
      return activa?.id ?? rows[0]?.id ?? null;
    });
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Si desde el panel se crea una temporada nueva, el sitio público (que
  // puede estar abierto en otra pestaña/dispositivo en ese momento) se
  // entera solo, sin necesitar un F5.
  useEffect(() => {
    if (!isConfigured || !supabase) return;
    const channel = supabase
      .channel('temporadas-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'temporadas' }, cargar)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [cargar]);

  // Crea una temporada nueva y la deja como activa (usa fn_crear_temporada,
  // que en un solo paso desactiva la anterior y activa esta — ver
  // add_temporadas.sql). Después de crearla, la deja también como la
  // seleccionada, para que quien la crea vea inmediatamente la temporada
  // en blanco que acaba de arrancar.
  const crearTemporada = useCallback(async (nombre) => {
    if (!isConfigured) throw new Error('Supabase no está configurado');
    const nombreLimpio = (nombre ?? '').trim();
    if (!nombreLimpio) throw new Error('El nombre de la temporada no puede estar vacío');
    const { data: nuevaId, error } = await supabase.rpc('fn_crear_temporada', { p_nombre: nombreLimpio });
    if (error) throw error;
    await cargar();
    setTemporadaSeleccionadaId(nuevaId);
    return nuevaId;
  }, [cargar]);

  // Reactiva una temporada ya existente (por ejemplo una archivada por error,
  // o para "volver" a una temporada anterior). Antes la ÚNICA forma de dejar
  // algo como activo era crear una temporada nueva — no había vuelta atrás
  // si alguien archivaba la que no era. Usa fn_activar_temporada, que en un
  // solo paso desactiva la que estaba activa y activa la elegida (ver
  // fn_activar_temporada.sql).
  const activarTemporada = useCallback(async (id) => {
    if (!isConfigured) throw new Error('Supabase no está configurado');
    const { error } = await supabase.rpc('fn_activar_temporada', { p_id: id });
    if (error) throw error;
    await cargar();
  }, [cargar]);

  const temporadaSeleccionada = temporadas.find(t => t.id === temporadaSeleccionadaId) ?? null;
  const esTemporadaActiva = temporadaActivaId == null || temporadaSeleccionadaId === temporadaActivaId;

  // Este contexto envuelve TODA la app — sin memoizar, cualquier render de
  // TemporadaProvider (por ejemplo por el `loading`/`temporadas` cambiando)
  // arma un objeto `value` nuevo y fuerza a re-renderizar a cada componente
  // que use useTemporada(), lo haya pedido o no. Con useMemo, el objeto solo
  // cambia cuando alguno de sus campos realmente cambió.
  const value = useMemo(() => ({
    temporadas,
    temporadaActivaId,
    temporadaSeleccionadaId,
    setTemporadaSeleccionadaId,
    temporadaSeleccionada,
    esTemporadaActiva,
    crearTemporada,
    activarTemporada,
    loading,
    refetch: cargar,
  }), [
    temporadas,
    temporadaActivaId,
    temporadaSeleccionadaId,
    temporadaSeleccionada,
    esTemporadaActiva,
    crearTemporada,
    activarTemporada,
    loading,
    cargar,
  ]);

  return (
    <TemporadaContext.Provider value={value}>
      {children}
    </TemporadaContext.Provider>
  );
}

// Hook seguro — nunca null, aunque el componente se renderice fuera del
// Provider (evita tener que null-chequear en cada lugar que lo usa).
export function useTemporada() {
  const ctx = useContext(TemporadaContext);
  return ctx ?? FALLBACK;
}
