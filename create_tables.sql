-- ================================================================
-- TORNEO STAR BÁSQUET — Schema v5 FINAL
-- Supabase Dashboard → SQL Editor → Run
-- 100% seguro para re-ejecutar sobre tablas existentes
-- ================================================================

-- ── 1. EQUIPOS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipos_femenino (
  id      TEXT PRIMARY KEY,
  nombre  TEXT NOT NULL,
  color   TEXT,
  genero  TEXT DEFAULT 'femenino'
);

-- ── 2. JUGADORAS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jugadoras_femenino (
  id         TEXT PRIMARY KEY,
  equipo_id  TEXT NOT NULL REFERENCES equipos_femenino(id),
  nombre     TEXT NOT NULL,
  numero     INT,
  fecha_nac  DATE,
  dni        TEXT,
  foto_url   TEXT
);
ALTER TABLE jugadoras_femenino ADD COLUMN IF NOT EXISTS numero   INT;
ALTER TABLE jugadoras_femenino ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- ── 3. FECHAS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fechas_femenino (
  id          SERIAL PRIMARY KEY,
  numero      INT  NOT NULL UNIQUE,
  descripcion TEXT,
  fecha_dia   DATE
);

-- ── 4. PARTIDOS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partidos_femenino (
  id               SERIAL PRIMARY KEY,
  fecha_id         INT  REFERENCES fechas_femenino(id),
  equipo_local_id  TEXT REFERENCES equipos_femenino(id),
  equipo_visit_id  TEXT REFERENCES equipos_femenino(id),
  -- Parciales REALES (ya convertidos de acumulados)
  q1_local  INT DEFAULT 0, q2_local INT DEFAULT 0,
  q3_local  INT DEFAULT 0, q4_local INT DEFAULT 0,
  ot_local  INT DEFAULT 0,
  q1_visit  INT DEFAULT 0, q2_visit INT DEFAULT 0,
  q3_visit  INT DEFAULT 0, q4_visit INT DEFAULT 0,
  ot_visit  INT DEFAULT 0,
  -- Totales mantenidos por trigger
  puntos_local INT DEFAULT 0,
  puntos_visit INT DEFAULT 0,
  -- % tiro por equipo
  pct_simples_local NUMERIC(5,1), pct_dobles_local NUMERIC(5,1), pct_triples_local NUMERIC(5,1),
  pct_simples_visit NUMERIC(5,1), pct_dobles_visit NUMERIC(5,1), pct_triples_visit NUMERIC(5,1),
  hora_inicio      TIME,                    -- hora del partido ej: 20:00
  lugar            TEXT,
  estado           TEXT DEFAULT 'pendiente',
  mvp_jugadora_id  TEXT,
  creado_en        TIMESTAMPTZ DEFAULT now(),
  actualizado_en   TIMESTAMPTZ DEFAULT now()
);

-- Columnas que pueden faltar si la tabla ya existía
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS fecha_id          INT REFERENCES fechas_femenino(id);
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS q1_local          INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS q2_local          INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS q3_local          INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS q4_local          INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS ot_local          INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS q1_visit          INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS q2_visit          INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS q3_visit          INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS q4_visit          INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS ot_visit          INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS pct_simples_local NUMERIC(5,1);
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS pct_dobles_local  NUMERIC(5,1);
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS pct_triples_local NUMERIC(5,1);
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS pct_simples_visit NUMERIC(5,1);
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS pct_dobles_visit  NUMERIC(5,1);
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS pct_triples_visit NUMERIC(5,1);
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS hora_inicio       TIME;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS lugar             TEXT;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS mvp_jugadora_id   TEXT;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS creado_en         TIMESTAMPTZ DEFAULT now();
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS actualizado_en    TIMESTAMPTZ DEFAULT now();

-- Trigger: calcula puntos_local/visit desde cuartos + updated_at
CREATE OR REPLACE FUNCTION fn_sync_partido()
RETURNS TRIGGER AS $$
BEGIN
  NEW.puntos_local   := COALESCE(NEW.q1_local,0)+COALESCE(NEW.q2_local,0)
                       +COALESCE(NEW.q3_local,0)+COALESCE(NEW.q4_local,0)
                       +COALESCE(NEW.ot_local,0);
  NEW.puntos_visit   := COALESCE(NEW.q1_visit,0)+COALESCE(NEW.q2_visit,0)
                       +COALESCE(NEW.q3_visit,0)+COALESCE(NEW.q4_visit,0)
                       +COALESCE(NEW.ot_visit,0);
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_partido ON partidos_femenino;
CREATE TRIGGER trg_sync_partido
  BEFORE INSERT OR UPDATE ON partidos_femenino
  FOR EACH ROW EXECUTE FUNCTION fn_sync_partido();

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_part_fecha    ON partidos_femenino(fecha_id);
CREATE INDEX IF NOT EXISTS idx_part_estado   ON partidos_femenino(estado);
CREATE INDEX IF NOT EXISTS idx_part_eq_local ON partidos_femenino(equipo_local_id);
CREATE INDEX IF NOT EXISTS idx_part_eq_visit ON partidos_femenino(equipo_visit_id);

-- ── 5. STATS POR PARTIDO ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS stats_partido_femenino (
  id          SERIAL PRIMARY KEY,
  partido_id  INT  NOT NULL REFERENCES partidos_femenino(id) ON DELETE CASCADE,
  jugadora_id TEXT NOT NULL REFERENCES jugadoras_femenino(id),
  equipo_id   TEXT NOT NULL REFERENCES equipos_femenino(id),
  numero      INT,
  -- Tiros (C=convertidos, F=fallados)
  sc  INT DEFAULT 0,  -- simples (TL) convertidos
  sf  INT DEFAULT 0,  -- simples fallados
  dc  INT DEFAULT 0,  -- dobles convertidos
  df  INT DEFAULT 0,  -- dobles fallados
  tc  INT DEFAULT 0,  -- triples convertidos
  tf  INT DEFAULT 0,  -- triples fallados
  -- Juego
  as_ INT DEFAULT 0,  -- asistencias
  rd  INT DEFAULT 0,  -- rebotes defensivos
  ro  INT DEFAULT 0,  -- rebotes ofensivos
  -- Faltas
  fp  INT DEFAULT 0,  -- personales
  ft  INT DEFAULT 0,  -- técnicas
  fa  INT DEFAULT 0,  -- antideportivas
  -- Otros
  rb  INT DEFAULT 0,  -- robos
  tp  INT DEFAULT 0,  -- tapones
  pe  INT DEFAULT 0,  -- pérdidas
  ca  INT DEFAULT 0,  -- canastas adicionales
  -- Totales
  pts INT DEFAULT 0,
  val INT DEFAULT 0,
  UNIQUE(partido_id, jugadora_id)
);

ALTER TABLE stats_partido_femenino ADD COLUMN IF NOT EXISTS ca INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_sp_partido  ON stats_partido_femenino(partido_id);
CREATE INDEX IF NOT EXISTS idx_sp_jugadora ON stats_partido_femenino(jugadora_id);
CREATE INDEX IF NOT EXISTS idx_sp_equipo   ON stats_partido_femenino(equipo_id);

-- ── 6. ESTADÍSTICAS ACUMULADAS ────────────────────────────────
CREATE TABLE IF NOT EXISTS estadisticas_femenino (
  jugadora_id      TEXT PRIMARY KEY REFERENCES jugadoras_femenino(id),
  pj               INT          DEFAULT 0,
  pts_prom         NUMERIC(5,1) DEFAULT 0,
  reb_prom         NUMERIC(5,1) DEFAULT 0,
  ast_prom         NUMERIC(5,1) DEFAULT 0,
  rob_prom         NUMERIC(5,1) DEFAULT 0,
  tap_prom         NUMERIC(5,1) DEFAULT 0,
  per_prom         NUMERIC(5,1) DEFAULT 0,
  val_prom         NUMERIC(5,1) DEFAULT 0,
  pct_simples      NUMERIC(5,1) DEFAULT 0,
  pct_dobles       NUMERIC(5,1) DEFAULT 0,
  pct_triples      NUMERIC(5,1) DEFAULT 0,
  pts_total        INT          DEFAULT 0,
  reb_total        INT          DEFAULT 0,
  ast_total        INT          DEFAULT 0,
  mejor_pts        INT          DEFAULT 0,
  mejor_pts_rival  TEXT,
  updated_at       TIMESTAMPTZ  DEFAULT now()
);

ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS pts_prom       NUMERIC(5,1) DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS reb_prom       NUMERIC(5,1) DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS ast_prom       NUMERIC(5,1) DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS rob_prom       NUMERIC(5,1) DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS tap_prom       NUMERIC(5,1) DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS per_prom       NUMERIC(5,1) DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS val_prom       NUMERIC(5,1) DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS pct_simples    NUMERIC(5,1) DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS pct_dobles     NUMERIC(5,1) DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS pct_triples    NUMERIC(5,1) DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS pts_total      INT          DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS reb_total      INT          DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS ast_total      INT          DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS mejor_pts      INT          DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS mejor_pts_rival TEXT;

-- ── 7. LOG DE CARGAS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS upload_log (
  id              SERIAL PRIMARY KEY,
  fecha_id        INT  REFERENCES fechas_femenino(id),
  partido_id      INT  REFERENCES partidos_femenino(id),
  archivo_nombre  TEXT,
  equipo_local    TEXT,
  equipo_visit    TEXT,
  jugadoras_ok    INT  DEFAULT 0,
  jugadoras_skip  INT  DEFAULT 0,
  warnings        JSONB,
  cargado_en      TIMESTAMPTZ DEFAULT now()
);

-- ── 8. RLS — lectura pública ──────────────────────────────────
DO $$ BEGIN
  ALTER TABLE equipos_femenino       ENABLE ROW LEVEL SECURITY;
  ALTER TABLE jugadoras_femenino     ENABLE ROW LEVEL SECURITY;
  ALTER TABLE fechas_femenino        ENABLE ROW LEVEL SECURITY;
  ALTER TABLE partidos_femenino      ENABLE ROW LEVEL SECURITY;
  ALTER TABLE stats_partido_femenino ENABLE ROW LEVEL SECURITY;
  ALTER TABLE estadisticas_femenino  ENABLE ROW LEVEL SECURITY;
  ALTER TABLE upload_log             ENABLE ROW LEVEL SECURITY;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='equipos_femenino'       AND policyname='pub_read') THEN CREATE POLICY "pub_read" ON equipos_femenino       FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='jugadoras_femenino'     AND policyname='pub_read') THEN CREATE POLICY "pub_read" ON jugadoras_femenino     FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fechas_femenino'        AND policyname='pub_read') THEN CREATE POLICY "pub_read" ON fechas_femenino        FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partidos_femenino'      AND policyname='pub_read') THEN CREATE POLICY "pub_read" ON partidos_femenino      FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='stats_partido_femenino' AND policyname='pub_read') THEN CREATE POLICY "pub_read" ON stats_partido_femenino FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='estadisticas_femenino'  AND policyname='pub_read') THEN CREATE POLICY "pub_read" ON estadisticas_femenino  FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='upload_log'             AND policyname='pub_read') THEN CREATE POLICY "pub_read" ON upload_log             FOR SELECT USING (true); END IF;
END $$;

-- ── 9. REALTIME ───────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE estadisticas_femenino;
ALTER PUBLICATION supabase_realtime ADD TABLE partidos_femenino;
ALTER PUBLICATION supabase_realtime ADD TABLE stats_partido_femenino;
ALTER PUBLICATION supabase_realtime ADD TABLE fechas_femenino;

-- ── 10. VISTA DEBUGGING ───────────────────────────────────────
CREATE OR REPLACE VIEW v_stats_resumen AS
SELECT
  j.nombre, e.nombre AS equipo,
  s.pj, s.pts_prom, s.reb_prom, s.ast_prom,
  s.rob_prom, s.tap_prom, s.val_prom,
  s.pct_simples, s.pct_dobles, s.pct_triples,
  s.mejor_pts, s.updated_at
FROM estadisticas_femenino s
JOIN jugadoras_femenino j ON j.id = s.jugadora_id
JOIN equipos_femenino   e ON e.id = j.equipo_id
ORDER BY s.pts_prom DESC;

-- ── 11. VISTA PARTIDOS CON NOMBRES ───────────────────────────
CREATE OR REPLACE VIEW v_partidos_femenino AS
SELECT
  p.id, f.numero AS fecha_num, f.descripcion AS fecha_desc,
  el.nombre AS equipo_local, ev.nombre AS equipo_visit,
  p.puntos_local, p.puntos_visit,
  p.q1_local, p.q2_local, p.q3_local, p.q4_local,
  p.q1_visit, p.q2_visit, p.q3_visit, p.q4_visit,
  p.pct_simples_local, p.pct_dobles_local, p.pct_triples_local,
  p.pct_simples_visit, p.pct_dobles_visit, p.pct_triples_visit,
  p.lugar, p.estado, p.creado_en,
  j.nombre AS mvp_nombre
FROM partidos_femenino p
LEFT JOIN fechas_femenino   f  ON f.id  = p.fecha_id
LEFT JOIN equipos_femenino  el ON el.id = p.equipo_local_id
LEFT JOIN equipos_femenino  ev ON ev.id = p.equipo_visit_id
LEFT JOIN jugadoras_femenino j  ON j.id  = p.mvp_jugadora_id
ORDER BY f.numero DESC, p.id DESC;

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER: Recalcula promedios automáticamente en Postgres
-- Se ejecuta después de cada INSERT/UPDATE/DELETE en stats_partido_femenino
-- Garantiza consistencia aunque el browser se cierre a mitad de carga
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION fn_recalcular_promedios()
RETURNS TRIGGER AS $$
DECLARE
  v_jugadora_id TEXT;
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
  -- Determinar qué jugadora cambió
  IF TG_OP = 'DELETE' THEN
    v_jugadora_id := OLD.jugadora_id;
  ELSE
    v_jugadora_id := NEW.jugadora_id;
  END IF;

  -- Calcular agregados desde todos los partidos de esa jugadora
  SELECT
    COUNT(*),
    ROUND(AVG(pts)::NUMERIC, 1),
    ROUND(AVG(rd + ro)::NUMERIC, 1),
    ROUND(AVG(as_)::NUMERIC, 1),
    ROUND(AVG(rb)::NUMERIC, 1),
    ROUND(AVG(tp)::NUMERIC, 1),
    ROUND(AVG(pe)::NUMERIC, 1),
    ROUND(AVG(val)::NUMERIC, 1),
    SUM(pts),
    SUM(rd + ro),
    SUM(as_),
    MAX(pts),
    SUM(sc), SUM(sf),
    SUM(dc), SUM(df),
    SUM(tc), SUM(tf)
  INTO
    v_pj, v_pts_prom, v_reb_prom, v_ast_prom,
    v_rob_prom, v_tap_prom, v_per_prom, v_val_prom,
    v_pts_total, v_reb_total, v_ast_total, v_mejor_pts,
    v_tsc, v_tsf, v_tdc, v_tdf, v_ttc, v_ttf
  FROM stats_partido_femenino
  WHERE jugadora_id = v_jugadora_id;

  -- Calcular porcentajes
  v_pct_simples := CASE WHEN v_tsc + v_tsf > 0 THEN ROUND((v_tsc::NUMERIC / (v_tsc + v_tsf)) * 100, 1) ELSE 0 END;
  v_pct_dobles  := CASE WHEN v_tdc + v_tdf > 0 THEN ROUND((v_tdc::NUMERIC / (v_tdc + v_tdf)) * 100, 1) ELSE 0 END;
  v_pct_triples := CASE WHEN v_ttc + v_ttf > 0 THEN ROUND((v_ttc::NUMERIC / (v_ttc + v_ttf)) * 100, 1) ELSE 0 END;

  IF v_pj > 0 THEN
    -- Upsert en estadisticas_femenino
    INSERT INTO estadisticas_femenino (
      jugadora_id, pj, pts_prom, reb_prom, ast_prom, rob_prom,
      tap_prom, per_prom, val_prom, pct_simples, pct_dobles, pct_triples,
      pts_total, reb_total, ast_total, mejor_pts, updated_at
    ) VALUES (
      v_jugadora_id, v_pj, COALESCE(v_pts_prom,0), COALESCE(v_reb_prom,0),
      COALESCE(v_ast_prom,0), COALESCE(v_rob_prom,0), COALESCE(v_tap_prom,0),
      COALESCE(v_per_prom,0), COALESCE(v_val_prom,0),
      v_pct_simples, v_pct_dobles, v_pct_triples,
      COALESCE(v_pts_total,0), COALESCE(v_reb_total,0), COALESCE(v_ast_total,0),
      COALESCE(v_mejor_pts,0), now()
    )
    ON CONFLICT (jugadora_id) DO UPDATE SET
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
    -- Sin partidos → limpiar stats
    UPDATE estadisticas_femenino
    SET pj=0, pts_prom=0, reb_prom=0, ast_prom=0, rob_prom=0,
        tap_prom=0, per_prom=0, val_prom=0, pct_simples=0,
        pct_dobles=0, pct_triples=0, pts_total=0, reb_total=0,
        ast_total=0, mejor_pts=0, updated_at=now()
    WHERE jugadora_id = v_jugadora_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Crear trigger en stats_partido_femenino
DROP TRIGGER IF EXISTS trg_recalcular_promedios ON stats_partido_femenino;
CREATE TRIGGER trg_recalcular_promedios
  AFTER INSERT OR UPDATE OR DELETE ON stats_partido_femenino
  FOR EACH ROW EXECUTE FUNCTION fn_recalcular_promedios();

-- ═══════════════════════════════════════════════════════════════
-- TABLA: nombre_aliases
-- Mapeo persistente de "apellido en Excel" → jugadora_id
-- Se auto-popula al confirmar un partido en el admin.
-- Garantiza que las cargas futuras resuelvan sin fuzzy matching.
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nombre_aliases (
  id           SERIAL PRIMARY KEY,
  alias        TEXT NOT NULL,          -- ej: 'Teloni', 'Chiavazza', 'Donofrio'
  alias_norm   TEXT NOT NULL,          -- alias normalizado (sin tildes, lowercase)
  jugadora_id  TEXT NOT NULL REFERENCES jugadoras_femenino(id),
  equipo_id    TEXT NOT NULL REFERENCES equipos_femenino(id),
  confirmado   BOOLEAN DEFAULT true,   -- false = fuzzy automático (no confirmado)
  creado_en    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(alias_norm, equipo_id)
);

ALTER TABLE nombre_aliases ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='nombre_aliases' AND policyname='pub_read')
    THEN CREATE POLICY "pub_read" ON nombre_aliases FOR SELECT USING (true); END IF;
END $$;

-- Seed inicial: aliases conocidos de las primeras 4 fechas
-- Pilar Sport Club
INSERT INTO nombre_aliases (alias, alias_norm, jugadora_id, equipo_id) VALUES
  ('Giraudo',   'giraudo',   'f_psc_01', 'f_pilar'),  -- María Jose Giraudo (nro 10)
  ('Ivana',     'ivana',     'f_psc_03', 'f_pilar'),  -- Ivana Giraudo (desambigua con nombre)
  ('Chiavazza', 'chiavazza', 'f_psc_08', 'f_pilar'),  -- Chivazza Melania
  ('Serra',     'serra',     'f_psc_02', 'f_pilar'),
  ('Bulacio',   'bulacio',   'f_psc_17', 'f_pilar'),
  ('Bergia',    'bergia',    'f_psc_06', 'f_pilar'),
  ('Viada',     'viada',     'f_psc_18', 'f_pilar'),
  ('Azar',      'azar',      'f_psc_09', 'f_pilar'),
  ('Arce',      'arce',      'f_psc_07', 'f_pilar'),
  ('Gomez',     'gomez',     'f_psc_16', 'f_pilar'),
  ('Romero',    'romero',    'f_psc_15', 'f_pilar'),
  ('Sintora',   'sintora',   'f_psc_12', 'f_pilar'),
  ('Allende',   'allende',   'f_psc_13', 'f_pilar'),
  ('Montironi', 'montironi', 'f_psc_10', 'f_pilar'),
  ('Gregori',   'gregori',   'f_psc_11', 'f_pilar'),
  ('Wolfel',    'wolfel',    'f_psc_04', 'f_pilar'),
  ('Diaz',      'diaz',      'f_psc_05', 'f_pilar')
ON CONFLICT (alias_norm, equipo_id) DO NOTHING;

-- Triple Locura
INSERT INTO nombre_aliases (alias, alias_norm, jugadora_id, equipo_id) VALUES
  ('Carnielli', 'carnielli', 'f_tl_01', 'f_triple_locura'),
  ('Ortega',    'ortega',    'f_tl_02', 'f_triple_locura'),
  ('Sanchez',   'sanchez',   'f_tl_03', 'f_triple_locura'),
  ('Weinbender','weinbender','f_tl_04', 'f_triple_locura'),
  ('Pikaluk',   'pikaluk',   'f_tl_05', 'f_triple_locura'),
  ('Donofrio',  'donofrio',  'f_tl_06', 'f_triple_locura'),  -- D'Onofrio
  ('D''Onofrio','donofrio',  'f_tl_06', 'f_triple_locura'),
  ('Magariño',  'magarino',  'f_tl_07', 'f_triple_locura'),
  ('Magarino',  'magarino',  'f_tl_07', 'f_triple_locura'),
  ('Pinedo',    'pinedo',    'f_tl_08', 'f_triple_locura'),
  ('Vega',      'vega',      'f_tl_09', 'f_triple_locura'),
  ('Re',        're',        'f_tl_10', 'f_triple_locura'),
  ('Abad',      'abad',      'f_tl_11', 'f_triple_locura'),
  ('Farias',    'farias',    'f_tl_12', 'f_triple_locura'),
  ('Teloni',    'teloni',    'f_tl_13', 'f_triple_locura'),
  ('Farias',    'farias',    'f_tl_12', 'f_triple_locura')
ON CONFLICT (alias_norm, equipo_id) DO NOTHING;
