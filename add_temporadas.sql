-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN: TEMPORADAS / TORNEOS
-- ═══════════════════════════════════════════════════════════════
-- Qué hace:
--   1. Crea la tabla `temporadas` (una fila por torneo/año — ej.
--      "Temporada 2026"), con una sola marcada `activa = true` a la vez.
--   2. Le agrega `temporada_id` a `fechas_femenino` y `fechas_masculino`
--      (todo lo demás — partidos, stats — cuelga de una fecha, así que
--      alcanza con marcar la fecha, no hace falta tocar partidos_X).
--   3. Migra TODAS las fechas/partidos/stats que ya existen a una
--      primera temporada ("Temporada 2026"), que queda como la activa.
--   4. Cambia la restricción de `numero` en fechas_X: hoy es único en
--      TODA la tabla (no podés tener dos "Fecha 1" nunca). Con
--      temporadas, cada torneo nuevo tiene que poder arrancar de
--      nuevo en "Fecha 1" — así que pasa a ser único POR temporada.
--   5. Hace que las estadísticas (estadisticas_femenino/masculino) se
--      calculen POR TEMPORADA en vez de sumar toda la vida del
--      jugador/a junta. Esto es clave para que el próximo torneo
--      arranque con estadísticas en cero y no arrastre las del
--      anterior — pero la temporada vieja se sigue pudiendo consultar
--      igual, con sus números tal cual quedaron.
--
-- Es 100% segura de correr ahora mismo, aunque el frontend todavía no
-- use nada de esto: mientras exista una sola temporada, el sitio se
-- comporta exactamente igual que hoy. El chip para elegir temporada y
-- el botón "Nueva Temporada" en el panel van en el próximo envío,
-- después de que confirmes con la consulta del final que las tablas
-- de plantel femenino (equipos_femenino / jugadoras_femenino) ya
-- tienen los datos reales cargados.
--
-- Corré este script completo en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════


-- ── 1. TABLA TEMPORADAS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS temporadas (
  id            SERIAL PRIMARY KEY,
  nombre        TEXT NOT NULL,
  activa        BOOLEAN NOT NULL DEFAULT false,
  fecha_inicio  DATE,
  creada_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Solo puede haber UNA temporada activa a la vez (índice único parcial:
-- solo mira las filas donde activa = true, así que si dos filas
-- intentan tener activa=true al mismo tiempo, Postgres lo rechaza).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_temporadas_una_activa') THEN
    CREATE UNIQUE INDEX idx_temporadas_una_activa ON temporadas (activa) WHERE activa = true;
  END IF;
END $$;

-- Semilla: si la tabla está vacía, crea la primera temporada con todo
-- lo que ya está cargado hasta ahora.
INSERT INTO temporadas (nombre, activa)
SELECT 'Temporada 2026', true
WHERE NOT EXISTS (SELECT 1 FROM temporadas);


-- ── 2. temporada_id EN FECHAS ────────────────────────────────────
ALTER TABLE fechas_femenino  ADD COLUMN IF NOT EXISTS temporada_id INT REFERENCES temporadas(id);
ALTER TABLE fechas_masculino ADD COLUMN IF NOT EXISTS temporada_id INT REFERENCES temporadas(id);

-- Backfill: todo lo que ya existe pasa a la temporada activa actual.
UPDATE fechas_femenino
SET temporada_id = (SELECT id FROM temporadas WHERE activa = true LIMIT 1)
WHERE temporada_id IS NULL;

UPDATE fechas_masculino
SET temporada_id = (SELECT id FROM temporadas WHERE activa = true LIMIT 1)
WHERE temporada_id IS NULL;

ALTER TABLE fechas_femenino  ALTER COLUMN temporada_id SET NOT NULL;
ALTER TABLE fechas_masculino ALTER COLUMN temporada_id SET NOT NULL;


-- ── 3. numero: único POR TEMPORADA (no global) ───────────────────
-- Antes: numero era único en toda la tabla. Ahora que puede haber más
-- de una temporada, cada una necesita poder tener su propia "Fecha 1".
DO $$
DECLARE v_constraint_name TEXT;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'fechas_femenino'::regclass AND contype = 'u';
  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE fechas_femenino DROP CONSTRAINT %I', v_constraint_name);
  END IF;
END $$;

DO $$
DECLARE v_constraint_name TEXT;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'fechas_masculino'::regclass AND contype = 'u';
  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE fechas_masculino DROP CONSTRAINT %I', v_constraint_name);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fechas_femenino_temporada_numero_key') THEN
    ALTER TABLE fechas_femenino ADD CONSTRAINT fechas_femenino_temporada_numero_key UNIQUE (temporada_id, numero);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fechas_masculino_temporada_numero_key') THEN
    ALTER TABLE fechas_masculino ADD CONSTRAINT fechas_masculino_temporada_numero_key UNIQUE (temporada_id, numero);
  END IF;
END $$;


-- ── 4. ESTADÍSTICAS: de "toda la vida" a "por temporada" ─────────
-- Hoy estadisticas_femenino tiene UNA fila por jugadora (toda su
-- carrera sumada). Pasa a tener una fila por jugadora Y temporada,
-- para que cada torneo tenga sus propios números sin mezclarse con
-- los anteriores, pero sin perder el histórico.

ALTER TABLE estadisticas_femenino  ADD COLUMN IF NOT EXISTS temporada_id INT REFERENCES temporadas(id);
ALTER TABLE estadisticas_masculino ADD COLUMN IF NOT EXISTS temporada_id INT REFERENCES temporadas(id);

UPDATE estadisticas_femenino
SET temporada_id = (SELECT id FROM temporadas WHERE activa = true LIMIT 1)
WHERE temporada_id IS NULL;

UPDATE estadisticas_masculino
SET temporada_id = (SELECT id FROM temporadas WHERE activa = true LIMIT 1)
WHERE temporada_id IS NULL;

ALTER TABLE estadisticas_femenino  ALTER COLUMN temporada_id SET NOT NULL;
ALTER TABLE estadisticas_masculino ALTER COLUMN temporada_id SET NOT NULL;

-- Cambiar la clave primaria de (jugadora_id) a (jugadora_id, temporada_id)
DO $$
DECLARE v_pk_name TEXT;
BEGIN
  SELECT conname INTO v_pk_name FROM pg_constraint
  WHERE conrelid = 'estadisticas_femenino'::regclass AND contype = 'p';
  IF v_pk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE estadisticas_femenino DROP CONSTRAINT %I', v_pk_name);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'estadisticas_femenino_pkey2') THEN
    ALTER TABLE estadisticas_femenino ADD CONSTRAINT estadisticas_femenino_pkey2 PRIMARY KEY (jugadora_id, temporada_id);
  END IF;
END $$;

DO $$
DECLARE v_pk_name TEXT;
BEGIN
  SELECT conname INTO v_pk_name FROM pg_constraint
  WHERE conrelid = 'estadisticas_masculino'::regclass AND contype = 'p';
  IF v_pk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE estadisticas_masculino DROP CONSTRAINT %I', v_pk_name);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'estadisticas_masculino_pkey2') THEN
    ALTER TABLE estadisticas_masculino ADD CONSTRAINT estadisticas_masculino_pkey2 PRIMARY KEY (jugador_id, temporada_id);
  END IF;
END $$;


-- ── 5. TRIGGERS: recalcular promedios AHORA por temporada ───────
-- Antes sumaban TODOS los partidos de la jugadora sin importar
-- cuándo. Ahora agrupan por la temporada a la que pertenece cada
-- partido (a través de partidos_femenino → fechas_femenino.temporada_id).
-- Los playoffs de esa misma temporada se siguen sumando junto con la
-- temporada regular (así lo pediste), solo se separan entre temporadas
-- distintas.

CREATE OR REPLACE FUNCTION fn_recalcular_promedios()
RETURNS TRIGGER AS $$
DECLARE
  v_jugadora_id  TEXT;
  v_partido_id   INT;
  v_temporada_id INT;
  v_pj          INT;
  v_pts_prom    NUMERIC;
  v_reb_prom    NUMERIC;
  v_ast_prom    NUMERIC;
  v_rob_prom    NUMERIC;
  v_tap_prom    NUMERIC;
  v_per_prom    NUMERIC;
  v_val_prom    NUMERIC;
  v_pct_simples NUMERIC;
  v_pct_dobles  NUMERIC;
  v_pct_triples NUMERIC;
  v_pts_total   INT;
  v_reb_total   INT;
  v_ast_total   INT;
  v_mejor_pts   INT;
  v_tsc INT; v_tsf INT;
  v_tdc INT; v_tdf INT;
  v_ttc INT; v_ttf INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_jugadora_id := OLD.jugadora_id;
    v_partido_id  := OLD.partido_id;
  ELSE
    v_jugadora_id := NEW.jugadora_id;
    v_partido_id  := NEW.partido_id;
  END IF;

  -- Temporada del partido que disparó el trigger (para saber cuál
  -- recalcular — un DELETE puede haber sido el último partido de esa
  -- jugadora en esa temporada, y aun así hay que dejar la fila en 0).
  SELECT f.temporada_id INTO v_temporada_id
  FROM partidos_femenino p
  JOIN fechas_femenino f ON f.id = p.fecha_id
  WHERE p.id = v_partido_id;

  IF v_temporada_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT
    COUNT(*),
    ROUND(AVG(sp.pts)::NUMERIC, 1),
    ROUND(AVG(sp.rd + sp.ro)::NUMERIC, 1),
    ROUND(AVG(sp.as_)::NUMERIC, 1),
    ROUND(AVG(sp.rb)::NUMERIC, 1),
    ROUND(AVG(sp.tp)::NUMERIC, 1),
    ROUND(AVG(sp.pe)::NUMERIC, 1),
    ROUND(AVG(sp.val)::NUMERIC, 1),
    SUM(sp.pts),
    SUM(sp.rd + sp.ro),
    SUM(sp.as_),
    MAX(sp.pts),
    SUM(sp.sc), SUM(sp.sf),
    SUM(sp.dc), SUM(sp.df),
    SUM(sp.tc), SUM(sp.tf)
  INTO
    v_pj, v_pts_prom, v_reb_prom, v_ast_prom,
    v_rob_prom, v_tap_prom, v_per_prom, v_val_prom,
    v_pts_total, v_reb_total, v_ast_total, v_mejor_pts,
    v_tsc, v_tsf, v_tdc, v_tdf, v_ttc, v_ttf
  FROM stats_partido_femenino sp
  JOIN partidos_femenino p ON p.id = sp.partido_id
  JOIN fechas_femenino f   ON f.id = p.fecha_id
  WHERE sp.jugadora_id = v_jugadora_id
    AND f.temporada_id = v_temporada_id;

  v_pct_simples := CASE WHEN v_tsc + v_tsf > 0 THEN ROUND((v_tsc::NUMERIC / (v_tsc + v_tsf)) * 100, 1) ELSE 0 END;
  v_pct_dobles  := CASE WHEN v_tdc + v_tdf > 0 THEN ROUND((v_tdc::NUMERIC / (v_tdc + v_tdf)) * 100, 1) ELSE 0 END;
  v_pct_triples := CASE WHEN v_ttc + v_ttf > 0 THEN ROUND((v_ttc::NUMERIC / (v_ttc + v_ttf)) * 100, 1) ELSE 0 END;

  IF v_pj > 0 THEN
    INSERT INTO estadisticas_femenino (
      jugadora_id, temporada_id, pj, pts_prom, reb_prom, ast_prom, rob_prom,
      tap_prom, per_prom, val_prom, pct_simples, pct_dobles, pct_triples,
      pts_total, reb_total, ast_total, mejor_pts, updated_at
    ) VALUES (
      v_jugadora_id, v_temporada_id, v_pj, COALESCE(v_pts_prom,0), COALESCE(v_reb_prom,0),
      COALESCE(v_ast_prom,0), COALESCE(v_rob_prom,0), COALESCE(v_tap_prom,0),
      COALESCE(v_per_prom,0), COALESCE(v_val_prom,0),
      v_pct_simples, v_pct_dobles, v_pct_triples,
      COALESCE(v_pts_total,0), COALESCE(v_reb_total,0), COALESCE(v_ast_total,0),
      COALESCE(v_mejor_pts,0), now()
    )
    ON CONFLICT (jugadora_id, temporada_id) DO UPDATE SET
      pj          = EXCLUDED.pj,
      pts_prom    = EXCLUDED.pts_prom,
      reb_prom    = EXCLUDED.reb_prom,
      ast_prom    = EXCLUDED.ast_prom,
      rob_prom    = EXCLUDED.rob_prom,
      tap_prom    = EXCLUDED.tap_prom,
      per_prom    = EXCLUDED.per_prom,
      val_prom    = EXCLUDED.val_prom,
      pct_simples = EXCLUDED.pct_simples,
      pct_dobles  = EXCLUDED.pct_dobles,
      pct_triples = EXCLUDED.pct_triples,
      pts_total   = EXCLUDED.pts_total,
      reb_total   = EXCLUDED.reb_total,
      ast_total   = EXCLUDED.ast_total,
      mejor_pts   = EXCLUDED.mejor_pts,
      updated_at  = now();
  ELSE
    UPDATE estadisticas_femenino
    SET pj=0, pts_prom=0, reb_prom=0, ast_prom=0, rob_prom=0,
        tap_prom=0, per_prom=0, val_prom=0, pct_simples=0,
        pct_dobles=0, pct_triples=0, pts_total=0, reb_total=0,
        ast_total=0, mejor_pts=0, updated_at=now()
    WHERE jugadora_id = v_jugadora_id AND temporada_id = v_temporada_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_recalcular_promedios_masc()
RETURNS TRIGGER AS $$
DECLARE
  v_jugador_id   TEXT;
  v_partido_id   INT;
  v_temporada_id INT;
  v_pj          INT;
  v_pts_prom    NUMERIC;
  v_reb_prom    NUMERIC;
  v_ast_prom    NUMERIC;
  v_rob_prom    NUMERIC;
  v_tap_prom    NUMERIC;
  v_per_prom    NUMERIC;
  v_val_prom    NUMERIC;
  v_pct_simples NUMERIC;
  v_pct_dobles  NUMERIC;
  v_pct_triples NUMERIC;
  v_pts_total   INT;
  v_reb_total   INT;
  v_ast_total   INT;
  v_mejor_pts   INT;
  v_tsc INT; v_tsf INT;
  v_tdc INT; v_tdf INT;
  v_ttc INT; v_ttf INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_jugador_id := OLD.jugador_id;
    v_partido_id := OLD.partido_id;
  ELSE
    v_jugador_id := NEW.jugador_id;
    v_partido_id := NEW.partido_id;
  END IF;

  SELECT f.temporada_id INTO v_temporada_id
  FROM partidos_masculino p
  JOIN fechas_masculino f ON f.id = p.fecha_id
  WHERE p.id = v_partido_id;

  IF v_temporada_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT
    COUNT(*),
    ROUND(AVG(sp.pts)::NUMERIC, 1),
    ROUND(AVG(sp.rd + sp.ro)::NUMERIC, 1),
    ROUND(AVG(sp.as_)::NUMERIC, 1),
    ROUND(AVG(sp.rb)::NUMERIC, 1),
    ROUND(AVG(sp.tp)::NUMERIC, 1),
    ROUND(AVG(sp.pe)::NUMERIC, 1),
    ROUND(AVG(sp.val)::NUMERIC, 1),
    SUM(sp.pts),
    SUM(sp.rd + sp.ro),
    SUM(sp.as_),
    MAX(sp.pts),
    SUM(sp.sc), SUM(sp.sf),
    SUM(sp.dc), SUM(sp.df),
    SUM(sp.tc), SUM(sp.tf)
  INTO
    v_pj, v_pts_prom, v_reb_prom, v_ast_prom,
    v_rob_prom, v_tap_prom, v_per_prom, v_val_prom,
    v_pts_total, v_reb_total, v_ast_total, v_mejor_pts,
    v_tsc, v_tsf, v_tdc, v_tdf, v_ttc, v_ttf
  FROM stats_partido_masculino sp
  JOIN partidos_masculino p ON p.id = sp.partido_id
  JOIN fechas_masculino f   ON f.id = p.fecha_id
  WHERE sp.jugador_id = v_jugador_id
    AND f.temporada_id = v_temporada_id;

  v_pct_simples := CASE WHEN v_tsc + v_tsf > 0 THEN ROUND((v_tsc::NUMERIC / (v_tsc + v_tsf)) * 100, 1) ELSE 0 END;
  v_pct_dobles  := CASE WHEN v_tdc + v_tdf > 0 THEN ROUND((v_tdc::NUMERIC / (v_tdc + v_tdf)) * 100, 1) ELSE 0 END;
  v_pct_triples := CASE WHEN v_ttc + v_ttf > 0 THEN ROUND((v_ttc::NUMERIC / (v_ttc + v_ttf)) * 100, 1) ELSE 0 END;

  IF v_pj > 0 THEN
    INSERT INTO estadisticas_masculino (
      jugador_id, temporada_id, pj, pts_prom, reb_prom, ast_prom, rob_prom,
      tap_prom, per_prom, val_prom, pct_simples, pct_dobles, pct_triples,
      pts_total, reb_total, ast_total, mejor_pts, updated_at
    ) VALUES (
      v_jugador_id, v_temporada_id, v_pj, COALESCE(v_pts_prom,0), COALESCE(v_reb_prom,0),
      COALESCE(v_ast_prom,0), COALESCE(v_rob_prom,0), COALESCE(v_tap_prom,0),
      COALESCE(v_per_prom,0), COALESCE(v_val_prom,0),
      v_pct_simples, v_pct_dobles, v_pct_triples,
      COALESCE(v_pts_total,0), COALESCE(v_reb_total,0), COALESCE(v_ast_total,0),
      COALESCE(v_mejor_pts,0), now()
    )
    ON CONFLICT (jugador_id, temporada_id) DO UPDATE SET
      pj          = EXCLUDED.pj,
      pts_prom    = EXCLUDED.pts_prom,
      reb_prom    = EXCLUDED.reb_prom,
      ast_prom    = EXCLUDED.ast_prom,
      rob_prom    = EXCLUDED.rob_prom,
      tap_prom    = EXCLUDED.tap_prom,
      per_prom    = EXCLUDED.per_prom,
      val_prom    = EXCLUDED.val_prom,
      pct_simples = EXCLUDED.pct_simples,
      pct_dobles  = EXCLUDED.pct_dobles,
      pct_triples = EXCLUDED.pct_triples,
      pts_total   = EXCLUDED.pts_total,
      reb_total   = EXCLUDED.reb_total,
      ast_total   = EXCLUDED.ast_total,
      mejor_pts   = EXCLUDED.mejor_pts,
      updated_at  = now();
  ELSE
    UPDATE estadisticas_masculino
    SET pj=0, pts_prom=0, reb_prom=0, ast_prom=0, rob_prom=0,
        tap_prom=0, per_prom=0, val_prom=0, pct_simples=0,
        pct_dobles=0, pct_triples=0, pts_total=0, reb_total=0,
        ast_total=0, mejor_pts=0, updated_at=now()
    WHERE jugador_id = v_jugador_id AND temporada_id = v_temporada_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Los triggers ya apuntan a estas funciones (fueron creados en
-- create_tables.sql / create_tables_masculino.sql) — CREATE OR REPLACE
-- alcanza, no hace falta recrearlos.

-- Recalcular TODO lo que ya existe con la lógica nueva (por temporada),
-- disparando el trigger sobre cada fila ya cargada:
UPDATE stats_partido_femenino SET id = id;
UPDATE stats_partido_masculino SET id = id;


-- ── 6. FUNCIÓN PARA CREAR UNA TEMPORADA NUEVA ────────────────────
-- La va a usar el botón "Nueva Temporada" del panel (próximo envío).
-- Hace en un solo paso, sin dejar dos temporadas activas a la vez:
-- desactiva la actual y crea+activa la nueva.
CREATE OR REPLACE FUNCTION fn_crear_temporada(p_nombre TEXT)
RETURNS INT AS $$
DECLARE v_nueva_id INT;
BEGIN
  UPDATE temporadas SET activa = false WHERE activa = true;
  INSERT INTO temporadas (nombre, activa, fecha_inicio)
  VALUES (p_nombre, true, CURRENT_DATE)
  RETURNING id INTO v_nueva_id;
  RETURN v_nueva_id;
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════
-- DIAGNÓSTICO — correlo después de la migración y pasame el resultado
-- ═══════════════════════════════════════════════════════════════

-- (a) Confirmar que quedó una sola temporada activa con todo adentro:
SELECT id, nombre, activa, fecha_inicio,
       (SELECT COUNT(*) FROM fechas_femenino  WHERE temporada_id = t.id) AS fechas_fem,
       (SELECT COUNT(*) FROM fechas_masculino WHERE temporada_id = t.id) AS fechas_masc
FROM temporadas t;

-- (b) Esto es lo importante para el próximo paso (roster femenino en
-- la base de datos en vez de fijo en el código): decime cuántas filas
-- devuelve cada una. Si equipos = 10 y jugadoras ronda las ~130-140
-- (la cantidad real de tu plantel), ya está todo cargado y el próximo
-- paso es más simple. Si da 0 o un número bajo, hay que cargarlo antes.
SELECT
  (SELECT COUNT(*) FROM equipos_femenino)   AS equipos_femenino,
  (SELECT COUNT(*) FROM jugadoras_femenino) AS jugadoras_femenino;
