import { useState, useCallback, useRef } from 'react';

// Reemplaza los window.confirm()/alert() nativos del navegador (sin estilo,
// desentonan con el resto del panel admin) por un modal con la estética del
// sitio. Uso: const { confirm, ConfirmDialog } = useConfirm(); ...
// if (!(await confirm('¿Seguro?'))) return;  ...  y renderizar {ConfirmDialog}
// una vez en el JSX del componente que lo usa.
export function useConfirm() {
  const [state, setState] = useState(null); // { message, danger }
  const resolverRef = useRef(null);

  const confirm = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({ message, danger: opts.danger ?? true, confirmLabel: opts.confirmLabel ?? 'Confirmar' });
    });
  }, []);

  const handle = useCallback((result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState(null);
  }, []);

  const ConfirmDialog = !state ? null : (
    <div className="cf-overlay" onClick={() => handle(false)}>
      <div className="cf-modal" onClick={e => e.stopPropagation()}>
        <div className="cf-modal-msg">{state.message}</div>
        <div className="cf-modal-actions">
          <button type="button" className="cf-btn cf-btn-cancel" onClick={() => handle(false)}>
            Cancelar
          </button>
          <button
            type="button"
            className={`cf-btn ${state.danger ? 'cf-btn-danger' : 'cf-btn-ok'}`}
            onClick={() => handle(true)}
            autoFocus>
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return { confirm, ConfirmDialog };
}
