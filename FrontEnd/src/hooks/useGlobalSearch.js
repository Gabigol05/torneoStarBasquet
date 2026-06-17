import { useState, useMemo, useCallback, useRef } from 'react';

const normQ = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

export function useGlobalSearch(equiposFemenino = []) {
  const [query,  setQuery]  = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);

  const results = useMemo(() => {
    const q = normQ(query.trim());
    if (q.length < 2) return { equipos:[], jugadoras:[] };

    const equipos = equiposFemenino
      .filter(e => normQ(e.name).includes(q) || normQ(e.nombre ?? '').includes(q))
      .slice(0, 3);

    const jugadoras = [];
    for (const eq of equiposFemenino) {
      for (const j of eq.jugadoras) {
        if (normQ(j.nombre).includes(q)) {
          jugadoras.push({
            ...j,
            equipo:       eq.name,
            equipoColor:  eq.color,
            equipoLogo:   eq.logo,
            equipoId:     eq.id,
            // stats — ya vienen del hook principal
            pts:          j.pts_prom  ?? j.pts ?? 0,
            reb:          j.reb_prom  ?? j.reb ?? 0,
            ast:          j.ast_prom  ?? j.ast ?? 0,
            pj:           j.pj ?? 0,
          });
          if (jugadoras.length >= 8) break;
        }
      }
      if (jugadoras.length >= 8) break;
    }

    return { equipos, jugadoras };
  }, [query, equiposFemenino]);

  const totalItems = results.equipos.length + results.jugadoras.length;
  const hasResults = totalItems > 0;
  const isEmpty    = normQ(query).length >= 2 && !hasResults;

  const open  = useCallback(() => { setIsOpen(true); setCursor(-1); }, []);
  const close = useCallback(() => { setIsOpen(false); setQuery(''); setCursor(-1); }, []);

  // Navegación por teclado
  const handleKey = useCallback((e, onSelect) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor(c => Math.min(c + 1, totalItems - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor(c => Math.max(c - 1, -1));
    } else if (e.key === 'Enter' && cursor >= 0) {
      e.preventDefault();
      const allItems = [
        ...results.equipos.map(e => ({ type:'equipo', data:e })),
        ...results.jugadoras.map(j => ({ type:'jugadora', data:j })),
      ];
      if (allItems[cursor]) onSelect(allItems[cursor]);
    }
  }, [cursor, totalItems, results]);

  return {
    query, setQuery, results, hasResults, isEmpty,
    isOpen, open, close, cursor, setCursor, handleKey,
  };
}
