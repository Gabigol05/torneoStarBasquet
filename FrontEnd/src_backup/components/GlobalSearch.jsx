import { useEffect, useRef } from 'react';
import { useGlobalSearch } from '../hooks/useGlobalSearch';

export function GlobalSearch({ equipos = [], onSelectPlayer, onSelectTeam }) {
  // equipos viene de PageHome (ya tiene stats) — sin doble fetch
  const {
    query, setQuery, results, hasResults, isEmpty,
    isOpen, open, close, cursor, setCursor, handleKey,
  } = useGlobalSearch(equipos);

  const inputRef = useRef(null);

  // Ctrl+K / Cmd+K
  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); open(); }
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  const handleSelect = ({ type, data }) => {
    if (type === 'equipo') {
      onSelectTeam?.(data);
    } else {
      onSelectPlayer?.({
        id: data.id, name: data.nombre, team: data.equipo,
        fechaNac: data.fechaNac, equipoId: data.equipoId,
        color: data.equipoColor,
        pts_prom: data.pts_prom ?? 0, reb_prom: data.reb_prom ?? 0,
        ast_prom: data.ast_prom ?? 0, rob_prom: data.rob_prom ?? 0,
        tap_prom: data.tap_prom ?? 0, per_prom: data.per_prom ?? 0,
        val_prom: data.val_prom ?? 0, pj: data.pj ?? 0,
        pct_simples: data.pct_simples ?? 0, pct_dobles: data.pct_dobles ?? 0,
        pct_triples: data.pct_triples ?? 0, mejor_pts: data.mejor_pts ?? 0,
        pts: data.pts ?? 0, reb: data.reb ?? 0, ast: data.ast ?? 0,
      });
    }
    close();
  };

  // Índice global para cursor
  const allItems = [
    ...results.equipos.map(e => ({ type:'equipo', data:e })),
    ...results.jugadoras.map(j => ({ type:'jugadora', data:j })),
  ];

  return (
    <>
      {/* Trigger */}
      <button className="gs-trigger" onClick={open} title="Buscar (Ctrl+K)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <span className="gs-trigger-text">Buscar</span>
        <span className="gs-trigger-kbd">Ctrl K</span>
      </button>

      {isOpen && (
        <div className="gs-overlay" onClick={close}>
          <div className="gs-modal" onClick={e => e.stopPropagation()}>

            {/* Input */}
            <div className="gs-input-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="gs-search-icon">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                ref={inputRef}
                className="gs-input"
                type="text"
                placeholder="Jugadora, equipo..."
                value={query}
                onChange={e => { setQuery(e.target.value); setCursor(-1); }}
                onKeyDown={e => handleKey(e, handleSelect)}
              />
              {query
                ? <button className="gs-clear" onClick={() => setQuery('')}>✕</button>
                : <span className="gs-trigger-kbd" style={{ marginRight:8 }}>Esc</span>
              }
            </div>

            {/* Resultados */}
            <div className="gs-results">
              {!query && (
                <div className="gs-hint">
                  <div style={{ fontSize:32, marginBottom:8 }}>🏀</div>
                  <div>Buscá jugadoras o equipos del torneo</div>
                  <div style={{ marginTop:6, fontSize:11, color:'#4A566E' }}>
                    ↑↓ para navegar · ↵ para seleccionar · Esc para cerrar
                  </div>
                </div>
              )}

              {isEmpty && (
                <div className="gs-empty">
                  <div style={{ fontSize:28, marginBottom:8 }}>🔍</div>
                  <div>Sin resultados para <strong>"{query}"</strong></div>
                  <div style={{ fontSize:12, color:'#4A566E', marginTop:4 }}>
                    Probá con apellido o nombre del equipo
                  </div>
                </div>
              )}

              {/* Equipos */}
              {results.equipos.length > 0 && (
                <div className="gs-group">
                  <div className="gs-group-label">Equipos</div>
                  {results.equipos.map((eq, i) => {
                    const idx = i;
                    const active = cursor === idx;
                    return (
                      <div key={eq.id}
                        className={`gs-item ${active ? 'gs-item-active' : ''}`}
                        onMouseEnter={() => setCursor(idx)}
                        onClick={() => handleSelect({ type:'equipo', data:eq })}>
                        <div className="gs-item-logo" style={{ borderColor: eq.color }}>
                          <img src={eq.logo} alt={eq.name}
                            style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }}
                            onError={e => { e.target.style.display='none'; }}/>
                        </div>
                        <div className="gs-item-info">
                          <div className="gs-item-name">{eq.name}</div>
                          <div className="gs-item-sub">
                            {eq.jugadoras.length} jugadoras
                            {eq.pj > 0 && ` · ${eq.pg}G ${eq.pp}P`}
                          </div>
                        </div>
                        <span className="gs-item-arrow" style={{ color: eq.color }}>→</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Jugadoras */}
              {results.jugadoras.length > 0 && (
                <div className="gs-group">
                  <div className="gs-group-label">Jugadoras</div>
                  {results.jugadoras.map((j, i) => {
                    const idx = results.equipos.length + i;
                    const active = cursor === idx;
                    const initials = j.nombre.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase();
                    const hayStats = (j.pj ?? 0) > 0;
                    return (
                      <div key={j.id}
                        className={`gs-item ${active ? 'gs-item-active' : ''}`}
                        onMouseEnter={() => setCursor(idx)}
                        onClick={() => handleSelect({ type:'jugadora', data:j })}>
                        <div className="gs-item-avatar"
                          style={{ background:`${j.equipoColor}20`, color:j.equipoColor, border:`1.5px solid ${j.equipoColor}40` }}>
                          {initials}
                        </div>
                        <div className="gs-item-info">
                          <div className="gs-item-name">{j.nombre}</div>
                          <div className="gs-item-sub">
                            {j.equipo}
                            {hayStats && (
                              <span style={{ marginLeft:6, color:'#F0B429' }}>
                                · {j.pts} PTS {j.reb} REB {j.ast} AST
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="gs-item-arrow">→</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="gs-footer">
              <span className="gs-kbd">↑↓</span> navegar &nbsp;·&nbsp;
              <span className="gs-kbd">↵</span> abrir &nbsp;·&nbsp;
              <span className="gs-kbd">Esc</span> cerrar
            </div>
          </div>
        </div>
      )}
    </>
  );
}
