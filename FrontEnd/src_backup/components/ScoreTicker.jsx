import { useState, useEffect, useRef } from 'react';
import { supabase, isConfigured } from '../lib/supabase';
import { equiposFemenino } from '../data/femeninoData';

const EQ_MAP = Object.fromEntries(equiposFemenino.map(e => [e.id, e]));

export function ScoreTicker() {
  const [items, setItems] = useState([]);
  const trackRef = useRef(null);

  useEffect(() => {
    if (!isConfigured) return;

    const load = async () => {
      // Últimos 8 partidos finalizados + próximos 4 pendientes
      const [{ data: finalizados }, { data: pendientes }] = await Promise.all([
        supabase
          .from('partidos_femenino')
          .select('id,equipo_local_id,equipo_visit_id,puntos_local,puntos_visit,q1_local,q2_local,q3_local,q4_local,ot_local,q1_visit,q2_visit,q3_visit,q4_visit,ot_visit,estado,fecha_id')
          .eq('estado', 'finalizado')
          .order('id', { ascending: false })
          .limit(8),
        supabase
          .from('partidos_femenino')
          .select('id,equipo_local_id,equipo_visit_id,hora_inicio,fecha_id,estado')
          .eq('estado', 'pendiente')
          .order('fecha_id', { ascending: true })
          .limit(4),
      ]);

      const built = [];

      for (const p of finalizados ?? []) {
        const eqL = EQ_MAP[p.equipo_local_id];
        const eqV = EQ_MAP[p.equipo_visit_id];
        if (!eqL || !eqV) continue;

        const ptsL = p.puntos_local ?? (
          (p.q1_local??0)+(p.q2_local??0)+(p.q3_local??0)+(p.q4_local??0)+(p.ot_local??0)
        );
        const ptsV = p.puntos_visit ?? (
          (p.q1_visit??0)+(p.q2_visit??0)+(p.q3_visit??0)+(p.q4_visit??0)+(p.ot_visit??0)
        );
        const conOT = (p.ot_local??0) > 0 || (p.ot_visit??0) > 0;

        built.push({
          tipo: 'final',
          localNombre: eqL.name, localColor: eqL.color, ptsLocal: ptsL,
          visitNombre: eqV.name, visitColor: eqV.color, ptsVisit: ptsV,
          conOT,
        });
      }

      for (const p of pendientes ?? []) {
        const eqL = EQ_MAP[p.equipo_local_id];
        const eqV = EQ_MAP[p.equipo_visit_id];
        if (!eqL || !eqV) continue;
        const hora = p.hora_inicio ? String(p.hora_inicio).slice(0,5) : null;
        built.push({
          tipo: 'proximo',
          localNombre: eqL.name, visitNombre: eqV.name,
          hora,
        });
      }

      setItems(built);
    };

    load();

    // Realtime — actualizar si cambia un partido
    const ch = supabase
      .channel('ticker-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos_femenino' }, load)
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, []);

  // Duplicar ítems para scroll infinito
  const allItems = [...items, ...items];

  if (items.length === 0) return null;

  return (
    <div className="ticker-wrap">
      <div className="ticker-inner" ref={trackRef}>
        {allItems.map((item, i) => (
          <div key={i} className="ticker-item">
            {item.tipo === 'final' ? (
              <>
                <span className="ticker-badge ticker-fin">Final{item.conOT ? ' OT' : ''}</span>
                <span style={{ color: item.localColor }}>{item.localNombre}</span>
                <span className="ticker-result" style={{ color: item.ptsLocal > item.ptsVisit ? item.localColor : item.visitColor }}>
                  {item.ptsLocal} – {item.ptsVisit}
                </span>
                <span style={{ color: item.visitColor }}>{item.visitNombre}</span>
              </>
            ) : (
              <>
                <span className="ticker-badge ticker-prox">Próximo</span>
                <span>{item.localNombre} vs {item.visitNombre}</span>
                {item.hora && (
                  <span style={{ color:'var(--gray)', fontSize:'12px' }}>· {item.hora} hs</span>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}