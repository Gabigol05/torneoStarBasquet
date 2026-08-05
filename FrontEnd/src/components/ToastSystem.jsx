import { useState, useCallback, useEffect, useRef } from 'react';

// ── HOOK para manejar toasts ──────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ icon = '🏀', title, sub, duration = 4000 }) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, icon, title, sub }]);
    setTimeout(() => removeToast(id), duration);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

// ── COMPONENTE ToastContainer ─────────────────────────────────
export function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className="toast">
          <span className="toast-icon">{t.icon}</span>
          <div className="toast-body">
            <div className="toast-title">{t.title}</div>
            {t.sub && <div className="toast-sub">{t.sub}</div>}
          </div>
          <button className="toast-close" onClick={() => onRemove(t.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ── HOOK que detecta nuevos resultados del backend ────────────
// Compara el snapshot anterior con el nuevo y emite un toast
// si aparece un partido nuevo en algún equipo
export function useResultadosToast(equipos, addToast) {
  const prevRef = useRef(null);

  useEffect(() => {
    if (!equipos?.length) return;

    // Construir snapshot actual: equipoId → cantidad de partidos
    const snapshot = {};
    for (const eq of equipos) {
      snapshot[eq.id] = eq.historial?.length ?? 0;
    }

    // Primera carga: solo guardar snapshot sin mostrar toast
    if (prevRef.current === null) {
      prevRef.current = snapshot;
      return;
    }

    // Comparar con snapshot anterior
    for (const eq of equipos) {
      const prev = prevRef.current[eq.id] ?? 0;
      const curr = snapshot[eq.id];
      if (curr > prev) {
        // Hay partido nuevo — obtener el último
        const ultimo = eq.partidos[eq.partidos.length - 1];
        addToast({
          icon: ultimo?.resultado === 'G' ? '🏆' : '🏀',
          title: `Nuevo resultado — ${eq.name}`,
          sub: ultimo
            ? `${eq.name} ${ultimo.pf} – ${ultimo.pc} ${ultimo.rival}`
            : 'Resultado disponible',
          duration: 6000,
        });
      }
    }

    prevRef.current = snapshot;
  }, [equipos, addToast]);
}
