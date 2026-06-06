import { useState, useMemo, useCallback } from 'react';

export function useGlobalSearch(equiposFemenino = []) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return { equipos: [], jugadoras: [] };

    const equipos = equiposFemenino.filter(e =>
      e.name.toLowerCase().includes(q)
    ).slice(0, 3);

    const jugadoras = [];
    for (const eq of equiposFemenino) {
      for (const j of eq.jugadoras) {
        if (j.nombre.toLowerCase().includes(q)) {
          jugadoras.push({ ...j, equipo: eq.name, equipoColor: eq.color, equipoLogo: eq.logo, equipoId: eq.id });
          if (jugadoras.length >= 6) break;
        }
      }
      if (jugadoras.length >= 6) break;
    }

    return { equipos, jugadoras };
  }, [query, equiposFemenino]);

  const hasResults = results.equipos.length > 0 || results.jugadoras.length > 0;
  const isEmpty = query.trim().length >= 2 && !hasResults;

  const open  = useCallback(() => setIsOpen(true),  []);
  const close = useCallback(() => { setIsOpen(false); setQuery(''); }, []);

  return { query, setQuery, results, hasResults, isEmpty, isOpen, open, close };
}
