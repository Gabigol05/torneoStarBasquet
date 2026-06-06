import { useEffect, useRef } from 'react';
import { useGlobalSearch } from '../hooks/useGlobalSearch';
import { useFemeninoStats } from '../hooks/useFemeninoStats';

export function GlobalSearch({ onSelectPlayer, onSelectTeam }) {
  const { equipos } = useFemeninoStats();
  const { query, setQuery, results, hasResults, isEmpty, isOpen, open, close } = useGlobalSearch(equipos);
  const inputRef = useRef(null);

  // Abrir con Ctrl+K / Cmd+K
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        open();
      }
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Focus al abrir
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  return (
    <>
      {/* BOTÓN DE BÚSQUEDA en navbar */}
      <button className="gs-trigger" onClick={open} title="Buscar (Ctrl+K)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <span className="gs-trigger-text">Buscar</span>
        <span className="gs-trigger-kbd">Ctrl K</span>
      </button>

      {/* OVERLAY */}
      {isOpen && (
        <div className="gs-overlay" onClick={close}>
          <div className="gs-modal" onClick={e => e.stopPropagation()}>

            {/* INPUT */}
            <div className="gs-input-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="gs-search-icon">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                ref={inputRef}
                className="gs-input"
                type="text"
                placeholder="Buscar jugadora o equipo..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              {query && (
                <button className="gs-clear" onClick={() => setQuery('')}>✕</button>
              )}
            </div>

            {/* RESULTADOS */}
            <div className="gs-results">
              {!query && (
                <div className="gs-hint">
                  Escribí el nombre de una jugadora o equipo del torneo femenino
                </div>
              )}

              {isEmpty && (
                <div className="gs-empty">
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔍</div>
                  <div>Sin resultados para <strong>"{query}"</strong></div>
                </div>
              )}

              {results.equipos.length > 0 && (
                <div className="gs-group">
                  <div className="gs-group-label">Equipos</div>
                  {results.equipos.map(eq => (
                    <div key={eq.id} className="gs-item" onClick={() => { onSelectTeam?.(eq); close(); }}>
                      <div className="gs-item-logo" style={{ borderColor: eq.color }}>
                        <img src={eq.logo} alt={eq.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      </div>
                      <div className="gs-item-info">
                        <div className="gs-item-name">{eq.name}</div>
                        <div className="gs-item-sub">{eq.jugadoras.length} jugadoras · Torneo Femenino</div>
                      </div>
                      <span className="gs-item-arrow">→</span>
                    </div>
                  ))}
                </div>
              )}

              {results.jugadoras.length > 0 && (
                <div className="gs-group">
                  <div className="gs-group-label">Jugadoras</div>
                  {results.jugadoras.map(j => (
                    <div key={j.id} className="gs-item" onClick={() => {
                      onSelectPlayer?.({
                        id: j.id, name: j.nombre, team: j.equipo,
                        fechaNac: j.fechaNac,
                        pts: j.pts ?? 0, reb: j.reb ?? 0, ast: j.ast ?? 0,
                      });
                      close();
                    }}>
                      <div className="gs-item-avatar" style={{ background: `${j.equipoColor}22`, color: j.equipoColor, border: `1.5px solid ${j.equipoColor}55` }}>
                        {j.nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                      </div>
                      <div className="gs-item-info">
                        <div className="gs-item-name">{j.nombre}</div>
                        <div className="gs-item-sub">{j.equipo}</div>
                      </div>
                      <span className="gs-item-arrow">→</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="gs-footer">
              <span className="gs-kbd">Esc</span> para cerrar &nbsp;·&nbsp; <span className="gs-kbd">↵</span> para seleccionar
            </div>
          </div>
        </div>
      )}
    </>
  );
}
