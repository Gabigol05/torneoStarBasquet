-- ================================================================
-- TORNEO STAR BÁSQUET — Soporte de Playoffs (Femenino + Masculino)
-- Supabase Dashboard → SQL Editor → Run
-- 100% seguro para re-ejecutar (todo IF NOT EXISTS) — no borra ni pisa
-- ningún dato existente. Los partidos ya cargados quedan con
-- es_playoff = false (temporada regular) hasta que los marques a mano.
-- ================================================================

-- ── 1. FEMENINO — columnas nuevas en partidos_femenino ─────────
-- Por qué van en el PARTIDO y no en la fecha: una misma "fecha" (jornada)
-- puede juntar cruces de más de una copa el mismo fin de semana (ej: la
-- semifinal de Copa de Oro y la de Copa de Plata se juegan el mismo
-- sábado, cargadas bajo la misma Fecha 9) — si el dato fuera solo de la
-- fecha, no se podría distinguir a qué copa/instancia pertenece cada
-- partido puntual.
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS es_playoff BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS copa       TEXT;  -- 'oro' | 'plata' | 'bronce' (null si es_playoff=false)
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS instancia  TEXT;  -- 'cuartos' | 'semifinal' | 'final' | 'tercer_puesto'
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS llave      INT;   -- posición del cruce dentro de esa copa+instancia (1,2,3...)

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_partidos_fem_copa') THEN
    ALTER TABLE partidos_femenino ADD CONSTRAINT chk_partidos_fem_copa
      CHECK (copa IS NULL OR copa IN ('oro','plata','bronce'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_partidos_fem_instancia') THEN
    ALTER TABLE partidos_femenino ADD CONSTRAINT chk_partidos_fem_instancia
      CHECK (instancia IS NULL OR instancia IN ('cuartos','semifinal','final','tercer_puesto'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_part_fem_playoff      ON partidos_femenino(es_playoff);
CREATE INDEX IF NOT EXISTS idx_part_fem_playoff_slot ON partidos_femenino(copa, instancia, llave);

-- ── 2. MASCULINO — mismas columnas en partidos_masculino ───────
ALTER TABLE partidos_masculino ADD COLUMN IF NOT EXISTS es_playoff BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE partidos_masculino ADD COLUMN IF NOT EXISTS copa       TEXT;
ALTER TABLE partidos_masculino ADD COLUMN IF NOT EXISTS instancia  TEXT;
ALTER TABLE partidos_masculino ADD COLUMN IF NOT EXISTS llave      INT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_partidos_masc_copa') THEN
    ALTER TABLE partidos_masculino ADD CONSTRAINT chk_partidos_masc_copa
      CHECK (copa IS NULL OR copa IN ('oro','plata','bronce'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_partidos_masc_instancia') THEN
    ALTER TABLE partidos_masculino ADD CONSTRAINT chk_partidos_masc_instancia
      CHECK (instancia IS NULL OR instancia IN ('cuartos','semifinal','final','tercer_puesto'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_part_masc_playoff      ON partidos_masculino(es_playoff);
CREATE INDEX IF NOT EXISTS idx_part_masc_playoff_slot ON partidos_masculino(copa, instancia, llave);

-- Nota: el trigger fn_sync_partido (recalcula puntos_local/visit desde los
-- cuartos) no toca estas columnas nuevas, así que sigue funcionando igual
-- para partidos de playoff — no hace falta tocarlo.

-- Nota: estadisticas_femenino/estadisticas_masculino (líderes y perfil de
-- cada jugadora) siguen sumando TODOS los partidos de stats_partido_*, sin
-- importar es_playoff — es decir, los puntos/rebotes/etc. de playoffs ya
-- se suman solos al total de la jugadora. Eso no se toca acá.

-- ================================================================
-- PASO 2 — DIAGNÓSTICO: ubicar las semifinales que ya cargaste
-- ================================================================
-- Corré este SELECT y anotá el "partido_id" de cada cruce de semifinal.
-- Buscá por el número de fecha que usaste (cambiá el 9 si no era ese) y
-- por cualquier descripción que mencione semifinal/playoff, por si
-- quedaron reflejadas en fechas distintas.
SELECT
  f.numero AS fecha_num, f.descripcion AS fecha_desc,
  p.id AS partido_id, el.nombre AS local, ev.nombre AS visitante,
  p.puntos_local, p.puntos_visit, p.estado
FROM partidos_femenino p
JOIN fechas_femenino  f  ON f.id  = p.fecha_id
JOIN equipos_femenino el ON el.id = p.equipo_local_id
JOIN equipos_femenino ev ON ev.id = p.equipo_visit_id
WHERE f.numero = 9
   OR f.descripcion ILIKE '%semifinal%'
   OR f.descripcion ILIKE '%playoff%'
ORDER BY p.id;

-- ── Corrección opcional por SQL ──────────────────────────────────
-- No hace falta correr esto: una vez aplicada la migración de arriba,
-- podés marcar cada partido como playoff directamente desde el panel de
-- administración (Partidos → editar → "¿Es Playoff?"). Dejo el UPDATE acá
-- solo por si preferís corregirlo por SQL vos mismo:
--
-- UPDATE partidos_femenino
-- SET es_playoff = true, copa = 'oro', instancia = 'semifinal', llave = 1
-- WHERE id = <partido_id de la tabla de arriba>;
