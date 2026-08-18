import { useEffect, useRef } from 'react';
import { useGlobalSearch } from '../hooks/useGlobalSearch';
import { useTournament } from '../context/TournamentContext';

const normQ = s => (s ?? '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Resalta en dorado la parte del nombre que coincide con lo tipeado.
function highlightMatch(nombre, q) {
  if (!q) return nombre;
  const nn = normQ(nombre);
  const nq = normQ(q);
  const i = nn.indexOf(nq);
  if (i < 0) return nombre;
  return (
    <>
      {nombre.slice(0, i)}
      <mark className="gs-mark">{nombre.slice(i, i + q.length)}</mark>
      {nombre.slice(i + q.length)}
    </>
  );
}

const FILTROS = [
  { key: 'todos',   label: 'Todos' },
  { key: 'jugador', label: 'Jugadores' },
  { key: 'equipo',  label: 'Equipos' },
];

export function GlobalSearch({ equipos = [], onSelectPlayer, onSelectTeam }) {
  const { mode } = useTournament();
  // equipos viene de PageHome (ya tiene stats) — sin doble fetch
  const {
    query, setQuery, results, hasResults, isEmpty, isTyping,
    isOpen, open, close, cursor, setCursor, handleKey,
    filtro, setFiltro, recientes, addRecent, clearRecientes, masBuscados,
  } = useGlobalSearch(equipos);

  const inputRef = useRef(null);
  const jugadorLbl  = mode === 'femenino' ? 'Jugadora'  : 'Jugador';
  const jugadoraPl  = mode === 'femenino' ? 'jugadoras' : 'jugadores';

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
    addRecent(type === 'equipo' ? (data.name ?? data.nombre) : data.nombre);
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
        pts_total: data.pts_total ?? 0, reb_total: data.reb_total ?? 0,
        ast_total: data.ast_total ?? 0, rob_total: data.rob_total ?? 0,
        tap_total: data.tap_total ?? 0, val_total: data.val_total ?? 0,
        per_total: data.per_total ?? 0,
        // ⚠️ FIX: faltaban los tiros reales (convertidos/fallados) — sin esto
        // el desglose de tiros mostraba "0/0" con el porcentaje viejo pegado
        // al lado, para cualquier jugador abierto desde el buscador global.
        sc_total: data.sc_total ?? 0, sf_total: data.sf_total ?? 0,
        dc_total: data.dc_total ?? 0, df_total: data.df_total ?? 0,
        tc_total: data.tc_total ?? 0, tf_total: data.tf_total ?? 0,
        sc_prom: data.sc_prom ?? 0, dc_prom: data.dc_prom ?? 0, tc_prom: data.tc_prom ?? 0,
      });
    }
    close();
  };

  const rankClass = i => (i === 0 ? 'r1' : i === 1 ? 'r2' : i === 2 ? 'r3' : '');

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
                placeholder={`${jugadorLbl}, equipo...`}
                value={query}
                onChange={e => { setQuery(e.target.value); setCursor(-1); }}
                onKeyDown={e => handleKey(e, handleSelect)}
              />
              {query
                ? <button className="gs-clear" onClick={() => setQuery('')}>✕</button>
                : <span className="gs-trigger-kbd" style={{ marginRight:8 }}>Esc</span>
              }
            </div>

            {/* Filtros por tipo */}
            <div className="gs-chips">
              {FILTROS.map(f => (
                <button key={f.key}
                  className={`gs-chip ${filtro === f.key ? 'active' : ''}`}
                  onClick={() => setFiltro(f.key)}>
                  {f.key === 'jugador' ? (mode === 'femenino' ? 'Jugadoras' : 'Jugadores') : f.label}
                </button>
              ))}
            </div>

            {/* Resultados */}
            <div className="gs-results">
              {/* Estado inicial: recientes + mas buscados, en vez del hint muerto de antes */}
              {!isTyping && (
                <>
                  {recientes.length > 0 && (
                    <div className="gs-section">
                      <div className="gs-section-lbl">
                        Búsquedas recientes
                        <button className="gs-section-clear" onClick={clearRecientes}>Borrar</button>
                      </div>
                      <div className="gs-recent-chips">
                        {recientes.map((r, i) => (
                          <span key={i} className="gs-recent-chip" onClick={() => setQuery(r)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
                            </svg>
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {masBuscados.length > 0 && filtro !== 'equipo' && (
                    <div className="gs-group">
                      <div className="gs-group-label">Más buscados</div>
                      {masBuscados.map((j, i) => {
                        const active = cursor === i;
                        const initials = j.nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
                        return (
                          <div key={j.id}
                            className={`gs-item ${active ? 'gs-item-active' : ''}`}
                            onMouseEnter={() => setCursor(i)}
                            onClick={() => handleSelect({ type: 'jugadora', data: j })}>
                            <span className={`gs-rank ${rankClass(i)}`}>{i + 1}</span>
                            <div className="gs-item-avatar"
                              style={{ background:`${j.equipoColor}20`, color:j.equipoColor, border:`1.5px solid ${j.equipoColor}40` }}>
                              {initials}
                            </div>
                            <div className="gs-item-info">
                              <div className="gs-item-name">{j.nombre}</div>
                              <div className="gs-item-sub">
                                {j.equipo} <span className="gs-stat-pill">· {j.pts} PTS</span>
                              </div>
                            </div>
                            <span className="gs-item-arrow">→</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {recientes.length === 0 && masBuscados.length === 0 && (
                    <div className="gs-hint">
                      <div style={{ fontSize:32, marginBottom:8 }}>🏀</div>
                      <div>Buscá {jugadoraPl} o equipos del torneo</div>
                    </div>
                  )}
                </>
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
                          <div className="gs-item-name">{highlightMatch(eq.name, query)}</div>
                          <div className="gs-item-sub">
                            {eq.jugadoras.length} {jugadoraPl}
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
                  <div className="gs-group-label">{mode === 'femenino' ? 'Jugadoras' : 'Jugadores'}</div>
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
                          <div className="gs-item-name">{highlightMatch(j.nombre, query)}</div>
                          <div className="gs-item-sub">
                            {j.equipo}
                            {hayStats && (
                              <span className="gs-stat-pill" style={{ marginLeft:6 }}>
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
