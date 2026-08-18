import { useState, useMemo, useCallback } from 'react';

const normQ = s => (s ?? '').toString().normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();

const RECENT_KEY = 'star_basquet_recent_search';
const RECENT_MAX = 5;

function readRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

export function useGlobalSearch(equipos = []) {
  const [query,  setQuery]  = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);
  // 'todos' | 'jugador' | 'equipo' — filtro de tipo de resultado
  const [filtro, setFiltro] = useState('todos');
  const [recientes, setRecientes] = useState(readRecent);

  const addRecent = useCallback((nombre) => {
    if (!nombre) return;
    setRecientes(prev => {
      const next = [nombre, ...prev.filter(n => n !== nombre)].slice(0, RECENT_MAX);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const clearRecientes = useCallback(() => {
    setRecientes([]);
    try { localStorage.removeItem(RECENT_KEY); } catch {}
  }, []);

  // "Mas buscados" — top anotadores, mostrado como sugerencia cuando todavia
  // no se escribio nada (reemplaza el viejo panel vacio sin ninguna utilidad).
  const masBuscados = useMemo(() => {
    const all = [];
    for (const eq of equipos ?? []) {
      for (const j of eq.jugadoras ?? []) {
        const pts = j.pts_prom ?? j.pts ?? 0;
        if (pts > 0) {
          all.push({
            ...j, equipo: eq.name, equipoColor: eq.color, equipoLogo: eq.logo, equipoId: eq.id,
            pts, reb: j.reb_prom ?? j.reb ?? 0, ast: j.ast_prom ?? j.ast ?? 0, pj: j.pj ?? 0,
          });
        }
      }
    }
    return all.sort((a, b) => b.pts - a.pts).slice(0, 4);
  }, [equipos]);

  const isTyping = normQ(query).length >= 2;

  const results = useMemo(() => {
    const q = normQ(query.trim());
    if (q.length < 2) return { equipos: [], jugadoras: [] };

    const equiposR = filtro === 'jugador' ? [] : (equipos ?? [])
      .filter(e => normQ(e.name ?? '').includes(q) || normQ(e.nombre ?? '').includes(q))
      .slice(0, 3);

    const jugadoras = [];
    if (filtro !== 'equipo') {
      for (const eq of equipos) {
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
    }

    return { equipos: equiposR, jugadoras };
  }, [query, equipos, filtro]);

  // Items navegables por teclado: los resultados tipeados, o (si todavia no
  // se escribio nada) los "mas buscados" — asi las flechas funcionan igual
  // en los dos estados, como promete el pie del panel.
  const navItems = useMemo(() => {
    if (isTyping) {
      return [
        ...results.equipos.map(e => ({ type: 'equipo', data: e })),
        ...results.jugadoras.map(j => ({ type: 'jugadora', data: j })),
      ];
    }
    return masBuscados.map(j => ({ type: 'jugadora', data: j }));
  }, [isTyping, results, masBuscados]);

  const totalItems = navItems.length;
  const hasResults = isTyping ? (results.equipos.length + results.jugadoras.length) > 0 : true;
  const isEmpty    = isTyping && !hasResults;

  const open  = useCallback(() => { setIsOpen(true); setCursor(-1); }, []);
  const close = useCallback(() => { setIsOpen(false); setQuery(''); setCursor(-1); setFiltro('todos'); }, []);

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
      if (navItems[cursor]) onSelect(navItems[cursor]);
    }
  }, [cursor, totalItems, navItems]);

  return {
    query, setQuery, results, hasResults, isEmpty, isTyping,
    isOpen, open, close, cursor, setCursor, handleKey,
    filtro, setFiltro, recientes, addRecent, clearRecientes, masBuscados, navItems,
  };
}
