-- ================================================================
-- TORNEO STAR BÁSQUET — Encuestas vinculadas a un partido
-- Supabase Dashboard → SQL Editor → Run
-- 100% seguro para re-ejecutar (todo con IF NOT EXISTS / OR REPLACE)
-- Requiere haber corrido antes create_tables_encuestas.sql,
-- create_tables.sql y create_tables_masculino.sql
-- ================================================================

-- ── 1. Vincular una encuesta a un partido puntual ─────────────────
-- No lleva FK porque el partido puede vivir en partidos_femenino o
-- partidos_masculino según la columna `categoria` de la encuesta.
ALTER TABLE encuestas ADD COLUMN IF NOT EXISTS partido_id INT;
CREATE INDEX IF NOT EXISTS idx_encuestas_partido ON encuestas(partido_id, categoria);

-- ── 2. Auto-cierre: cuando el partido pasa a "finalizado", se cierra
--       sola la encuesta "¿Quién gana?" que quedó linkeada a ese partido.
CREATE OR REPLACE FUNCTION fn_cerrar_encuesta_femenino() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'finalizado' THEN
    UPDATE encuestas SET activa = false, cerrada_en = now()
    WHERE partido_id = NEW.id AND categoria = 'femenino' AND activa = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cerrar_encuesta_femenino ON partidos_femenino;
CREATE TRIGGER trg_cerrar_encuesta_femenino
  AFTER INSERT OR UPDATE ON partidos_femenino
  FOR EACH ROW EXECUTE FUNCTION fn_cerrar_encuesta_femenino();

CREATE OR REPLACE FUNCTION fn_cerrar_encuesta_masculino() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'finalizado' THEN
    UPDATE encuestas SET activa = false, cerrada_en = now()
    WHERE partido_id = NEW.id AND categoria = 'masculino' AND activa = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cerrar_encuesta_masculino ON partidos_masculino;
CREATE TRIGGER trg_cerrar_encuesta_masculino
  AFTER INSERT OR UPDATE ON partidos_masculino
  FOR EACH ROW EXECUTE FUNCTION fn_cerrar_encuesta_masculino();
