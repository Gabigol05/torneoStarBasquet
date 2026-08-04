-- ================================================================
-- TORNEO STAR BÁSQUET — Schema MASCULINO (espejo del femenino)
-- Supabase Dashboard → SQL Editor → Run
-- 100% seguro para re-ejecutar sobre tablas existentes
-- Correr DESPUÉS de create_tables.sql (usa la misma convención)
-- ================================================================

-- ── 1. EQUIPOS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipos_masculino (
  id      TEXT PRIMARY KEY,
  nombre  TEXT NOT NULL,
  color   TEXT,
  genero  TEXT DEFAULT 'masculino',
  zona    TEXT CHECK (zona IN ('A','B'))
);

ALTER TABLE equipos_masculino ADD COLUMN IF NOT EXISTS zona TEXT CHECK (zona IN ('A','B'));

-- ── 2. JUGADORES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jugadores_masculino (
  id         TEXT PRIMARY KEY,
  equipo_id  TEXT NOT NULL REFERENCES equipos_masculino(id),
  nombre     TEXT NOT NULL,
  numero     INT,
  fecha_nac  DATE,
  dni        TEXT,
  foto_url   TEXT
);

-- ── 3. FECHAS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fechas_masculino (
  id          SERIAL PRIMARY KEY,
  numero      INT  NOT NULL UNIQUE,
  descripcion TEXT,
  fecha_dia   DATE
);

-- ── 4. PARTIDOS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partidos_masculino (
  id               SERIAL PRIMARY KEY,
  fecha_id         INT  REFERENCES fechas_masculino(id),
  equipo_local_id  TEXT REFERENCES equipos_masculino(id),
  equipo_visit_id  TEXT REFERENCES equipos_masculino(id),
  q1_local  INT DEFAULT 0, q2_local INT DEFAULT 0,
  q3_local  INT DEFAULT 0, q4_local INT DEFAULT 0,
  ot_local  INT DEFAULT 0,
  q1_visit  INT DEFAULT 0, q2_visit INT DEFAULT 0,
  q3_visit  INT DEFAULT 0, q4_visit INT DEFAULT 0,
  ot_visit  INT DEFAULT 0,
  puntos_local INT DEFAULT 0,
  puntos_visit INT DEFAULT 0,
  pct_simples_local NUMERIC(5,1), pct_dobles_local NUMERIC(5,1), pct_triples_local NUMERIC(5,1),
  pct_simples_visit NUMERIC(5,1), pct_dobles_visit NUMERIC(5,1), pct_triples_visit NUMERIC(5,1),
  hora_inicio      TIME,
  lugar            TEXT,
  estado           TEXT DEFAULT 'pendiente',
  mvp_jugador_id   TEXT,
  creado_en        TIMESTAMPTZ DEFAULT now(),
  actualizado_en   TIMESTAMPTZ DEFAULT now()
);

-- Reutiliza la misma función trigger que partidos_femenino (es genérica,
-- solo referencia columnas NEW.*, no nombres de tabla — ver create_tables.sql)
DROP TRIGGER IF EXISTS trg_sync_partido_masc ON partidos_masculino;
CREATE TRIGGER trg_sync_partido_masc
  BEFORE INSERT OR UPDATE ON partidos_masculino
  FOR EACH ROW EXECUTE FUNCTION fn_sync_partido();

CREATE INDEX IF NOT EXISTS idx_part_masc_fecha    ON partidos_masculino(fecha_id);
CREATE INDEX IF NOT EXISTS idx_part_masc_estado   ON partidos_masculino(estado);
CREATE INDEX IF NOT EXISTS idx_part_masc_eq_local ON partidos_masculino(equipo_local_id);
CREATE INDEX IF NOT EXISTS idx_part_masc_eq_visit ON partidos_masculino(equipo_visit_id);

-- ── 5. STATS POR PARTIDO ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS stats_partido_masculino (
  id          SERIAL PRIMARY KEY,
  partido_id  INT  NOT NULL REFERENCES partidos_masculino(id) ON DELETE CASCADE,
  jugador_id  TEXT NOT NULL REFERENCES jugadores_masculino(id),
  equipo_id   TEXT NOT NULL REFERENCES equipos_masculino(id),
  numero      INT,
  sc  INT DEFAULT 0,  sf  INT DEFAULT 0,
  dc  INT DEFAULT 0,  df  INT DEFAULT 0,
  tc  INT DEFAULT 0,  tf  INT DEFAULT 0,
  as_ INT DEFAULT 0,
  rd  INT DEFAULT 0,  ro  INT DEFAULT 0,
  fp  INT DEFAULT 0,  ft  INT DEFAULT 0,  fa  INT DEFAULT 0,
  rb  INT DEFAULT 0,  tp  INT DEFAULT 0,  pe  INT DEFAULT 0,  ca  INT DEFAULT 0,
  pts INT DEFAULT 0,
  val INT DEFAULT 0,
  UNIQUE(partido_id, jugador_id)
);

CREATE INDEX IF NOT EXISTS idx_sp_masc_partido ON stats_partido_masculino(partido_id);
CREATE INDEX IF NOT EXISTS idx_sp_masc_jugador ON stats_partido_masculino(jugador_id);
CREATE INDEX IF NOT EXISTS idx_sp_masc_equipo  ON stats_partido_masculino(equipo_id);

-- ── 6. ESTADÍSTICAS ACUMULADAS ────────────────────────────────
CREATE TABLE IF NOT EXISTS estadisticas_masculino (
  jugador_id       TEXT PRIMARY KEY REFERENCES jugadores_masculino(id),
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
  rob_total        INT          DEFAULT 0,
  tap_total        INT          DEFAULT 0,
  val_total        INT          DEFAULT 0,
  per_total        INT          DEFAULT 0,
  mejor_pts        INT          DEFAULT 0,
  mejor_pts_rival  TEXT,
  sc_total  INT DEFAULT 0, sf_total INT DEFAULT 0,
  dc_total  INT DEFAULT 0, df_total INT DEFAULT 0,
  tc_total  INT DEFAULT 0, tf_total INT DEFAULT 0,
  sc_prom   NUMERIC(5,1) DEFAULT 0,
  dc_prom   NUMERIC(5,1) DEFAULT 0,
  tc_prom   NUMERIC(5,1) DEFAULT 0,
  updated_at       TIMESTAMPTZ  DEFAULT now()
);

-- ── 7. LOG DE CARGAS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS upload_log_masculino (
  id              SERIAL PRIMARY KEY,
  fecha_id        INT  REFERENCES fechas_masculino(id),
  partido_id      INT  REFERENCES partidos_masculino(id),
  archivo_nombre  TEXT,
  equipo_local    TEXT,
  equipo_visit    TEXT,
  jugadores_ok    INT  DEFAULT 0,
  jugadores_skip  INT  DEFAULT 0,
  warnings        JSONB,
  cargado_en      TIMESTAMPTZ DEFAULT now()
);

-- ── 8. ALIASES DE NOMBRES (Excel) ──────────────────────────────
CREATE TABLE IF NOT EXISTS nombre_aliases_masculino (
  id           SERIAL PRIMARY KEY,
  alias        TEXT NOT NULL,
  alias_norm   TEXT NOT NULL,
  jugador_id   TEXT NOT NULL REFERENCES jugadores_masculino(id),
  equipo_id    TEXT NOT NULL REFERENCES equipos_masculino(id),
  confirmado   BOOLEAN DEFAULT true,
  creado_en    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(alias_norm, equipo_id)
);

-- ── 9. RLS — lectura pública ───────────────────────────────────
DO $$ BEGIN
  ALTER TABLE equipos_masculino          ENABLE ROW LEVEL SECURITY;
  ALTER TABLE jugadores_masculino        ENABLE ROW LEVEL SECURITY;
  ALTER TABLE fechas_masculino           ENABLE ROW LEVEL SECURITY;
  ALTER TABLE partidos_masculino         ENABLE ROW LEVEL SECURITY;
  ALTER TABLE stats_partido_masculino    ENABLE ROW LEVEL SECURITY;
  ALTER TABLE estadisticas_masculino     ENABLE ROW LEVEL SECURITY;
  ALTER TABLE upload_log_masculino       ENABLE ROW LEVEL SECURITY;
  ALTER TABLE nombre_aliases_masculino   ENABLE ROW LEVEL SECURITY;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='equipos_masculino'       AND policyname='pub_read') THEN CREATE POLICY "pub_read" ON equipos_masculino       FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='jugadores_masculino'     AND policyname='pub_read') THEN CREATE POLICY "pub_read" ON jugadores_masculino     FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fechas_masculino'        AND policyname='pub_read') THEN CREATE POLICY "pub_read" ON fechas_masculino        FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partidos_masculino'      AND policyname='pub_read') THEN CREATE POLICY "pub_read" ON partidos_masculino      FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='stats_partido_masculino' AND policyname='pub_read') THEN CREATE POLICY "pub_read" ON stats_partido_masculino FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='estadisticas_masculino'  AND policyname='pub_read') THEN CREATE POLICY "pub_read" ON estadisticas_masculino  FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='upload_log_masculino'    AND policyname='pub_read') THEN CREATE POLICY "pub_read" ON upload_log_masculino    FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='nombre_aliases_masculino' AND policyname='pub_read') THEN CREATE POLICY "pub_read" ON nombre_aliases_masculino FOR SELECT USING (true); END IF;

  -- Escritura solo admin autenticado (mismo criterio que encuestas)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='equipos_masculino' AND policyname='admin_write') THEN CREATE POLICY "admin_write" ON equipos_masculino FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='jugadores_masculino' AND policyname='admin_write') THEN CREATE POLICY "admin_write" ON jugadores_masculino FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fechas_masculino' AND policyname='admin_write') THEN CREATE POLICY "admin_write" ON fechas_masculino FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partidos_masculino' AND policyname='admin_write') THEN CREATE POLICY "admin_write" ON partidos_masculino FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='stats_partido_masculino' AND policyname='admin_write') THEN CREATE POLICY "admin_write" ON stats_partido_masculino FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='estadisticas_masculino' AND policyname='admin_write') THEN CREATE POLICY "admin_write" ON estadisticas_masculino FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='upload_log_masculino' AND policyname='admin_write') THEN CREATE POLICY "admin_write" ON upload_log_masculino FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='nombre_aliases_masculino' AND policyname='admin_write') THEN CREATE POLICY "admin_write" ON nombre_aliases_masculino FOR ALL USING (auth.role()='authenticated') WITH CHECK (auth.role()='authenticated'); END IF;
END $$;

-- ── 10. REALTIME ───────────────────────────────────────────────
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE equipos_masculino;       EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE estadisticas_masculino;  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE partidos_masculino;      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE stats_partido_masculino; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE fechas_masculino;        EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 11. TRIGGER: recalcula promedios (espejo del femenino) ────
CREATE OR REPLACE FUNCTION fn_recalcular_promedios_masc()
RETURNS TRIGGER AS $$
DECLARE
  v_jugador_id  TEXT;
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
  ELSE
    v_jugador_id := NEW.jugador_id;
  END IF;

  SELECT
    COUNT(*),
    ROUND(AVG(pts)::NUMERIC, 1),
    ROUND(AVG(rd + ro)::NUMERIC, 1),
    ROUND(AVG(as_)::NUMERIC, 1),
    ROUND(AVG(rb)::NUMERIC, 1),
    ROUND(AVG(tp)::NUMERIC, 1),
    ROUND(AVG(pe)::NUMERIC, 1),
    ROUND(AVG(val)::NUMERIC, 1),
    SUM(pts), SUM(rd + ro), SUM(as_), MAX(pts),
    SUM(sc), SUM(sf), SUM(dc), SUM(df), SUM(tc), SUM(tf)
  INTO
    v_pj, v_pts_prom, v_reb_prom, v_ast_prom,
    v_rob_prom, v_tap_prom, v_per_prom, v_val_prom,
    v_pts_total, v_reb_total, v_ast_total, v_mejor_pts,
    v_tsc, v_tsf, v_tdc, v_tdf, v_ttc, v_ttf
  FROM stats_partido_masculino
  WHERE jugador_id = v_jugador_id;

  v_pct_simples := CASE WHEN v_tsc + v_tsf > 0 THEN ROUND((v_tsc::NUMERIC / (v_tsc + v_tsf)) * 100, 1) ELSE 0 END;
  v_pct_dobles  := CASE WHEN v_tdc + v_tdf > 0 THEN ROUND((v_tdc::NUMERIC / (v_tdc + v_tdf)) * 100, 1) ELSE 0 END;
  v_pct_triples := CASE WHEN v_ttc + v_ttf > 0 THEN ROUND((v_ttc::NUMERIC / (v_ttc + v_ttf)) * 100, 1) ELSE 0 END;

  IF v_pj > 0 THEN
    INSERT INTO estadisticas_masculino (
      jugador_id, pj, pts_prom, reb_prom, ast_prom, rob_prom,
      tap_prom, per_prom, val_prom, pct_simples, pct_dobles, pct_triples,
      pts_total, reb_total, ast_total, mejor_pts, updated_at
    ) VALUES (
      v_jugador_id, v_pj, COALESCE(v_pts_prom,0), COALESCE(v_reb_prom,0),
      COALESCE(v_ast_prom,0), COALESCE(v_rob_prom,0), COALESCE(v_tap_prom,0),
      COALESCE(v_per_prom,0), COALESCE(v_val_prom,0),
      v_pct_simples, v_pct_dobles, v_pct_triples,
      COALESCE(v_pts_total,0), COALESCE(v_reb_total,0), COALESCE(v_ast_total,0),
      COALESCE(v_mejor_pts,0), now()
    )
    ON CONFLICT (jugador_id) DO UPDATE SET
      pj=EXCLUDED.pj, pts_prom=EXCLUDED.pts_prom, reb_prom=EXCLUDED.reb_prom,
      ast_prom=EXCLUDED.ast_prom, rob_prom=EXCLUDED.rob_prom, tap_prom=EXCLUDED.tap_prom,
      per_prom=EXCLUDED.per_prom, val_prom=EXCLUDED.val_prom,
      pct_simples=EXCLUDED.pct_simples, pct_dobles=EXCLUDED.pct_dobles, pct_triples=EXCLUDED.pct_triples,
      pts_total=EXCLUDED.pts_total, reb_total=EXCLUDED.reb_total, ast_total=EXCLUDED.ast_total,
      mejor_pts=EXCLUDED.mejor_pts, updated_at=now();
  ELSE
    UPDATE estadisticas_masculino
    SET pj=0, pts_prom=0, reb_prom=0, ast_prom=0, rob_prom=0,
        tap_prom=0, per_prom=0, val_prom=0, pct_simples=0,
        pct_dobles=0, pct_triples=0, pts_total=0, reb_total=0,
        ast_total=0, mejor_pts=0, updated_at=now()
    WHERE jugador_id = v_jugador_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalcular_promedios_masc ON stats_partido_masculino;
CREATE TRIGGER trg_recalcular_promedios_masc
  AFTER INSERT OR UPDATE OR DELETE ON stats_partido_masculino
  FOR EACH ROW EXECUTE FUNCTION fn_recalcular_promedios_masc();

-- ── 12. VISTAS ─────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_stats_resumen_masc AS
SELECT
  j.nombre, e.nombre AS equipo,
  s.pj, s.pts_prom, s.reb_prom, s.ast_prom,
  s.rob_prom, s.tap_prom, s.val_prom,
  s.pct_simples, s.pct_dobles, s.pct_triples,
  s.mejor_pts, s.updated_at
FROM estadisticas_masculino s
JOIN jugadores_masculino j ON j.id = s.jugador_id
JOIN equipos_masculino   e ON e.id = j.equipo_id
ORDER BY s.pts_prom DESC;

CREATE OR REPLACE VIEW v_partidos_masculino AS
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
FROM partidos_masculino p
LEFT JOIN fechas_masculino   f  ON f.id  = p.fecha_id
LEFT JOIN equipos_masculino  el ON el.id = p.equipo_local_id
LEFT JOIN equipos_masculino  ev ON ev.id = p.equipo_visit_id
LEFT JOIN jugadores_masculino j  ON j.id  = p.mvp_jugador_id
ORDER BY f.numero DESC, p.id DESC;

-- ── 13. SEED — Equipos + Zona (asignación aleatoria inicial) ───
-- Los 23 equipos actuales de masculinoData.js, repartidos al azar en
-- Zona A (12) / Zona B (11). Se puede reordenar más adelante con un
-- simple UPDATE equipos_masculino SET zona=... WHERE id=...
INSERT INTO equipos_masculino (id, nombre, color, genero, zona) VALUES
  ('m_independencia',  'Independencia',   '#D4A017', 'masculino', 'A'),
  ('m_jurasicos',      'Jurásicos',        '#E8A020', 'masculino', 'B'),
  ('m_walkers',        'Los Walker''s',    '#dc2626', 'masculino', 'A'),
  ('m_nn',              'NN',              '#e5e7eb', 'masculino', 'B'),
  ('m_north_side',     'North Side',       '#f97316', 'masculino', 'B'),
  ('m_pueblerinos',    'Pueblerinos',      '#4d7c0f', 'masculino', 'B'),
  ('m_4k',              '4K Básquet',      '#a3a3a3', 'masculino', 'B'),
  ('m_crew_monsters',  'Crew Monsters',    '#374151', 'masculino', 'B'),
  ('m_hoopers',        'Hoopers CBA',      '#1a1a1a', 'masculino', 'B'),
  ('m_tanques',        'Tanques BC',       '#3b82f6', 'masculino', 'A'),
  ('m_aguilas',        'Águilas',          '#d97706', 'masculino', 'A'),
  ('m_artigas',        'Artigas BC',       '#D4A017', 'masculino', 'B'),
  ('m_dead_cow',       'Dead Cow',         '#1d4ed8', 'masculino', 'A'),
  ('m_federados',      'Federados',        '#D4A017', 'masculino', 'B'),
  ('m_incas',          'Incas',            '#dc2626', 'masculino', 'A'),
  ('m_changos',        'Los Changos',      '#7c3aed', 'masculino', 'A'),
  ('m_random',         'Random Team',      '#dc2626', 'masculino', 'A'),
  ('m_docta_bandidos', 'Docta Bandidos',   '#0f1f3d', 'masculino', 'A'),
  ('m_linaje',         'Linaje',           '#b91c1c', 'masculino', 'A'),
  ('m_oro_negro',      'Oro Negro',        '#1e3a5f', 'masculino', 'B'),
  ('m_real_norte',     'Real Norte',       '#16a34a', 'masculino', 'B'),
  ('m_el_rejunte',     'El Rejunte',       '#d97706', 'masculino', 'A'),
  ('m_san_francisco',  'San Francisco',    '#facc15', 'masculino', 'A')
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  color  = EXCLUDED.color,
  -- No pisa la zona si ya fue reordenada manualmente después del seed inicial
  zona   = COALESCE(equipos_masculino.zona, EXCLUDED.zona);
