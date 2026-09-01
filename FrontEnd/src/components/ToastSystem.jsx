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
//
// `temporadaKey` identifica QUÉ está mirando el visitante ahora mismo (por
// ejemplo `${mode}:${temporadaSeleccionadaId}`). ⚠️ FIX (reporte Alvaro):
// sin esto, cambiar de temporada con el chip de arriba (ej: de "2026 -
// Clausura", recién arrancada y en 0, a la vieja "Temporada 2026" con sus
// 54 partidos ya jugados) hacía que CADA equipo pasara de golpe de "0
// partidos" a "muchos partidos" — y el hook lo interpretaba como que todos
// esos partidos eran "nuevos resultados" recién salidos, disparando una
// pila entera de toasts por resultados de hace meses. La comparación de
// equipoId ya protegía el caso de cambiar de modo (femenino/masculino,
// que son IDs de equipo distintos) pero NO el de cambiar de temporada
// dentro de la MISMA categoría, porque los equipos (y sus IDs) son los
// mismos — solo cambia qué partidos trae cada temporada. Ahora, cada vez
// que cambia `temporadaKey`, se toma como una foto nueva (se guarda el
// snapshot sin avisar) en vez de comparar contra la temporada anterior.
export function useResultadosToast(equipos, addToast, isLoading = false, temporadaKey = null) {
  const prevRef = useRef(null);
  const prevKeyRef = useRef(undefined);

  useEffect(() => {
    // Mientras todavía está cargando, "equipos" puede ser el placeholder
    // (historial:[] para todos). Si tomáramos ese placeholder como snapshot
    // base, en cuanto llegaran los datos reales TODOS los equipos con
    // partidos ya jugados parecerían "resultado nuevo" a la vez. Se espera
    // a que termine de cargar para recién ahí fijar la base de comparación.
    if (isLoading) return;
    if (!equipos?.length) return;

    // Construir snapshot actual: equipoId → cantidad de partidos
    const snapshot = {};
    for (const eq of equipos) {
      snapshot[eq.id] = eq.historial?.length ?? 0;
    }

    // Cambió la temporada/modo que se está mirando — es un conjunto de
    // datos distinto, no "resultados nuevos". Se guarda el snapshot nuevo
    // sin avisar, y recién se vuelve a comparar contra la próxima
    // actualización real de ESTA temporada.
    if (prevKeyRef.current !== temporadaKey) {
      prevKeyRef.current = temporadaKey;
      prevRef.current = snapshot;
      return;
    }

    // Primera carga (con datos reales ya disponibles): solo guardar
    // snapshot sin mostrar toast.
    if (prevRef.current === null) {
      prevRef.current = snapshot;
      return;
    }

    // Comparar con snapshot anterior. Un equipo que no estaba en el snapshot
    // previo (ej: se acaba de cambiar de masculino a femenino, IDs distintos)
    // no tiene base de comparación real — se ignora esa vez para no disparar
    // un toast de "nuevo resultado" para TODOS los equipos del modo nuevo.
    for (const eq of equipos) {
      if (!(eq.id in prevRef.current)) continue;
      const prev = prevRef.current[eq.id];
      const curr = snapshot[eq.id];
      if (curr > prev) {
        // Hay partido nuevo — obtener el último
        const ultimo = eq.historial?.[eq.historial.length - 1];
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
  }, [equipos, addToast, isLoading, temporadaKey]);
}
