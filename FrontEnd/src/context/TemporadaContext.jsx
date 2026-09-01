import { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { supabase, isConfigured } from '../lib/supabase';

// Temporadas/torneos (ej. "Temporada 2026", "Apertura 2027"). Ver
// add_temporadas.sql y add_temporadas_por_categoria.sql para el esquema.
// Este contexto es compartido por el sitio público (para elegir qué
// temporada mirar) y el panel admin (para saber cuál es la ACTIVA, que es
// donde cae todo lo que se carga nuevo).
//
// ⚠️ Cada temporada pertenece a UNA categoría (femenino o masculino) —
// femenino y masculino NO comparten fila ni estado de "activa". Esto es a
// propósito: el torneo femenino y el masculino no arrancan/terminan el
// mismo día (ver add_temporadas_por_categoria.sql), así que femenino puede
// estar en "Clausura" mientras masculino sigue en "Apertura" sin pisarse.
// Por eso `temporadaActivaId`/`temporadaSeleccionadaId` de acá abajo son
// MAPAS `{ femenino: id, masculino: id }`, no un solo id — cualquier
// componente que los use tiene que indexarlos por la categoría que le
// corresponda (normalmente el `mode` de TournamentContext, o el `categoria`
// que ya recibe la sección del panel en la que está).
const TemporadaContext = createContext(null);

const CATEGORIAS = ['femenino', 'masculino'];

function vacioPorCategoria() { return { femenino: null, masculino: null }; }

const FALLBACK = {
  temporadas: [],
  temporadaActivaId: vacioPorCategoria(),
  temporadaSeleccionadaId: vacioPorCategoria(),
  setTemporadaSeleccionadaId: () => {},
  temporadaSeleccionada: () => null,
  esTemporadaActiva: () => true,
  crearTemporada: async () => { throw new Error('TemporadaProvider no está montado'); },
  activarTemporada: async () => { throw new Error('TemporadaProvider no está montado'); },
  loading: false,
  refetch: async () => {},
};

export function TemporadaProvider({ children }) {
  const [temporadas, setTemporadas] = useState([]);
  const [temporadaActivaId, setTemporadaActivaId] = useState(vacioPorCategoria);
  // La que se está MIRANDO en el sitio público — arranca en la activa de
  // cada categoría, pero el visitante la puede cambiar con el chip para ver
  // una temporada vieja sin que eso afecte qué temporada es la "actual"
  // para el resto del sitio ni para la otra categoría.
  const [temporadaSeleccionadaId, setTemporadaSeleccionadaIdState] = useState(vacioPorCategoria);
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

    const activaPorCat = vacioPorCategoria();
    for (const cat of CATEGORIAS) {
      activaPorCat[cat] = rows.find(t => t.categoria === cat && t.activa)?.id ?? null;
    }
    setTemporadaActivaId(activaPorCat);

    // Solo pisar la seleccionada de cada categoría si todavía no había
    // ninguna (primera carga) o si la que estaba seleccionada dejó de
    // existir — así no se resetea la vista de alguien que estaba mirando
    // a propósito una temporada vieja.
    setTemporadaSeleccionadaIdState(prev => {
      const next = { ...prev };
      for (const cat of CATEGORIAS) {
        const rowsCat = rows.filter(t => t.categoria === cat);
        if (prev[cat] != null && rowsCat.some(t => t.id === prev[cat])) continue;
        next[cat] = activaPorCat[cat] ?? rowsCat[0]?.id ?? null;
      }
      return next;
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

  const setTemporadaSeleccionadaId = useCallback((categoria, id) => {
    setTemporadaSeleccionadaIdState(prev => ({ ...prev, [categoria]: id }));
  }, []);

  // Crea una temporada nueva PARA UNA CATEGORÍA y la deja como activa de
  // esa categoría (usa fn_crear_temporada, que en un solo paso desactiva la
  // anterior de esa misma categoría y activa esta — ver
  // add_temporadas_por_categoria.sql — la otra categoría no se toca).
  // Después de crearla, la deja también como la seleccionada de esa
  // categoría, para que quien la crea vea inmediatamente la temporada en
  // blanco que acaba de arrancar.
  const crearTemporada = useCallback(async (nombre, categoria) => {
    if (!isConfigured) throw new Error('Supabase no está configurado');
    if (!CATEGORIAS.includes(categoria)) throw new Error(`categoría inválida: ${categoria}`);
    const nombreLimpio = (nombre ?? '').trim();
    if (!nombreLimpio) throw new Error('El nombre de la temporada no puede estar vacío');
    const { data: nuevaId, error } = await supabase.rpc('fn_crear_temporada', { p_nombre: nombreLimpio, p_categoria: categoria });
    if (error) throw error;
    await cargar();
    setTemporadaSeleccionadaId(categoria, nuevaId);
    return nuevaId;
  }, [cargar, setTemporadaSeleccionadaId]);

  // Reactiva una temporada ya existente (por ejemplo una archivada por
  // error, o para "volver" a una temporada anterior). La categoría se
  // deduce de la fila misma — fn_activar_temporada solo desactiva la que
  // estaba activa DENTRO de esa categoría, la otra categoría sigue igual.
  const activarTemporada = useCallback(async (id) => {
    if (!isConfigured) throw new Error('Supabase no está configurado');
    const { error } = await supabase.rpc('fn_activar_temporada', { p_id: id });
    if (error) throw error;
    await cargar();
  }, [cargar]);

  const temporadaSeleccionada = useCallback(
    (categoria) => temporadas.find(t => t.id === temporadaSeleccionadaId[categoria]) ?? null,
    [temporadas, temporadaSeleccionadaId]
  );
  const esTemporadaActiva = useCallback(
    (categoria) => temporadaActivaId[categoria] == null || temporadaSeleccionadaId[categoria] === temporadaActivaId[categoria],
    [temporadaActivaId, temporadaSeleccionadaId]
  );

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
    setTemporadaSeleccionadaId,
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
