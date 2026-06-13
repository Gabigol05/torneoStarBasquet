-- ================================================================
-- TORNEO STAR BÁSQUET — Schema v4 FINAL
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

-- ── 3. FECHAS (jornadas del torneo) ───────────────────────────
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
  -- Parciales por cuarto
  q1_local  INT DEFAULT 0, q2_local INT DEFAULT 0,
  q3_local  INT DEFAULT 0, q4_local INT DEFAULT 0,
  ot_local  INT DEFAULT 0,
  q1_visit  INT DEFAULT 0, q2_visit INT DEFAULT 0,
  q3_visit  INT DEFAULT 0, q4_visit INT DEFAULT 0,
  ot_visit  INT DEFAULT 0,
  -- Totales (mantenidos por trigger)
  puntos_local INT DEFAULT 0,
  puntos_visit INT DEFAULT 0,
  -- Porcentajes de equipo
  pct_simples_local NUMERIC(5,1), pct_dobles_local NUMERIC(5,1), pct_triples_local NUMERIC(5,1),
  pct_simples_visit NUMERIC(5,1), pct_dobles_visit NUMERIC(5,1), pct_triples_visit NUMERIC(5,1),
  -- Meta
  lugar           TEXT,
  estado          TEXT DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','en_juego','finalizado')),
  mvp_jugadora_id TEXT REFERENCES jugadoras_femenino(id),
  -- Auditoría
  creado_en    TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);

-- Columnas que pueden faltar si la tabla ya existía
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS fecha_id         INT REFERENCES fechas_femenino(id);
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS q1_local         INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS q2_local         INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS q3_local         INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS q4_local         INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS ot_local         INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS q1_visit         INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS q2_visit         INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS q3_visit         INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS q4_visit         INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS ot_visit         INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS pct_simples_local NUMERIC(5,1);
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS pct_dobles_local  NUMERIC(5,1);
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS pct_triples_local NUMERIC(5,1);
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS pct_simples_visit NUMERIC(5,1);
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS pct_dobles_visit  NUMERIC(5,1);
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS pct_triples_visit NUMERIC(5,1);
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS lugar            TEXT;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS mvp_jugadora_id  TEXT;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS creado_en        TIMESTAMPTZ DEFAULT now();
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS actualizado_en   TIMESTAMPTZ DEFAULT now();

-- Trigger: sincroniza puntos_local/visit desde cuartos + updated_at
CREATE OR REPLACE FUNCTION fn_sync_partido()
RETURNS TRIGGER AS $$
BEGIN
  NEW.puntos_local    := COALESCE(NEW.q1_local,0)+COALESCE(NEW.q2_local,0)
                        +COALESCE(NEW.q3_local,0)+COALESCE(NEW.q4_local,0)
                        +COALESCE(NEW.ot_local,0);
  NEW.puntos_visit    := COALESCE(NEW.q1_visit,0)+COALESCE(NEW.q2_visit,0)
                        +COALESCE(NEW.q3_visit,0)+COALESCE(NEW.q4_visit,0)
                        +COALESCE(NEW.ot_visit,0);
  NEW.actualizado_en  := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_partido ON partidos_femenino;
CREATE TRIGGER trg_sync_partido
  BEFORE INSERT OR UPDATE ON partidos_femenino
  FOR EACH ROW EXECUTE FUNCTION fn_sync_partido();

-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_partidos_fecha_id   ON partidos_femenino(fecha_id);
CREATE INDEX IF NOT EXISTS idx_partidos_estado      ON partidos_femenino(estado);
CREATE INDEX IF NOT EXISTS idx_partidos_equipo_local ON partidos_femenino(equipo_local_id);
CREATE INDEX IF NOT EXISTS idx_partidos_equipo_visit ON partidos_femenino(equipo_visit_id);

-- ── 5. STATS POR JUGADORA POR PARTIDO ────────────────────────
CREATE TABLE IF NOT EXISTS stats_partido_femenino (
  id          SERIAL PRIMARY KEY,
  partido_id  INT  NOT NULL REFERENCES partidos_femenino(id) ON DELETE CASCADE,
  jugadora_id TEXT NOT NULL REFERENCES jugadoras_femenino(id),
  equipo_id   TEXT NOT NULL REFERENCES equipos_femenino(id),
  numero      INT,
  -- Tiros
  sc  INT DEFAULT 0,  -- simples convertidos (tiros libres)
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
  fp  INT DEFAULT 0,  -- faltas personales
  ft  INT DEFAULT 0,  -- faltas técnicas
  fa  INT DEFAULT 0,  -- faltas antideportivas
  -- Extras
  rb  INT DEFAULT 0,  -- robos
  tp  INT DEFAULT 0,  -- tapones
  pe  INT DEFAULT 0,  -- pérdidas
  ca  INT DEFAULT 0,  -- canastas adicionales
  -- Totales
  pts INT DEFAULT 0,
  val INT DEFAULT 0,
  -- Constraint: una fila por jugadora por partido
  UNIQUE(partido_id, jugadora_id)
);

ALTER TABLE stats_partido_femenino ADD COLUMN IF NOT EXISTS ca INT DEFAULT 0;

-- Índices
CREATE INDEX IF NOT EXISTS idx_stats_partido   ON stats_partido_femenino(partido_id);
CREATE INDEX IF NOT EXISTS idx_stats_jugadora  ON stats_partido_femenino(jugadora_id);
CREATE INDEX IF NOT EXISTS idx_stats_equipo    ON stats_partido_femenino(equipo_id);

-- ── 6. ESTADÍSTICAS ACUMULADAS ────────────────────────────────
-- Una fila por jugadora, recalculada cada vez que se carga un partido
CREATE TABLE IF NOT EXISTS estadisticas_femenino (
  jugadora_id     TEXT PRIMARY KEY REFERENCES jugadoras_femenino(id),
  pj              INT          DEFAULT 0,
  -- Promedios por partido
  pts_prom        NUMERIC(5,1) DEFAULT 0,
  reb_prom        NUMERIC(5,1) DEFAULT 0,
  ast_prom        NUMERIC(5,1) DEFAULT 0,
  rob_prom        NUMERIC(5,1) DEFAULT 0,
  tap_prom        NUMERIC(5,1) DEFAULT 0,
  per_prom        NUMERIC(5,1) DEFAULT 0,
  val_prom        NUMERIC(5,1) DEFAULT 0,
  -- Porcentajes de tiro
  pct_simples     NUMERIC(5,1) DEFAULT 0,
  pct_dobles      NUMERIC(5,1) DEFAULT 0,
  pct_triples     NUMERIC(5,1) DEFAULT 0,
  -- Totales (para rankings)
  pts_total       INT          DEFAULT 0,
  reb_total       INT          DEFAULT 0,
  ast_total       INT          DEFAULT 0,
  -- Mejor partido
  mejor_pts       INT          DEFAULT 0,
  mejor_pts_rival TEXT,
  -- Auditoría
  updated_at      TIMESTAMPTZ  DEFAULT now()
);

-- Columnas adicionales si la tabla ya existía sin ellas
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS pts_prom    NUMERIC(5,1) DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS reb_prom    NUMERIC(5,1) DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS ast_prom    NUMERIC(5,1) DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS rob_prom    NUMERIC(5,1) DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS tap_prom    NUMERIC(5,1) DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS per_prom    NUMERIC(5,1) DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS val_prom    NUMERIC(5,1) DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS pct_simples NUMERIC(5,1) DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS pct_dobles  NUMERIC(5,1) DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS pct_triples NUMERIC(5,1) DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS pts_total   INT          DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS reb_total   INT          DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS ast_total   INT          DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS mejor_pts   INT          DEFAULT 0;
ALTER TABLE estadisticas_femenino ADD COLUMN IF NOT EXISTS mejor_pts_rival TEXT;

-- ── 7. LOG DE CARGAS ──────────────────────────────────────────
-- Historial completo de cada Excel subido — quién, cuándo, qué resultó
CREATE TABLE IF NOT EXISTS upload_log (
  id           SERIAL PRIMARY KEY,
  fecha_id     INT  REFERENCES fechas_femenino(id),
  partido_id   INT  REFERENCES partidos_femenino(id),
  archivo_nombre TEXT,
  equipo_local TEXT,
  equipo_visit TEXT,
  jugadoras_ok  INT DEFAULT 0,
  jugadoras_skip INT DEFAULT 0,
  warnings     JSONB,
  cargado_en   TIMESTAMPTZ DEFAULT now()
);

-- ── 8. ROW LEVEL SECURITY — lectura pública ───────────────────
DO $$ BEGIN
  -- equipos_femenino
  ALTER TABLE equipos_femenino ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='equipos_femenino' AND policyname='pub_read')
    THEN CREATE POLICY "pub_read" ON equipos_femenino FOR SELECT USING (true); END IF;
  -- jugadoras_femenino
  ALTER TABLE jugadoras_femenino ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='jugadoras_femenino' AND policyname='pub_read')
    THEN CREATE POLICY "pub_read" ON jugadoras_femenino FOR SELECT USING (true); END IF;
  -- fechas_femenino
  ALTER TABLE fechas_femenino ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fechas_femenino' AND policyname='pub_read')
    THEN CREATE POLICY "pub_read" ON fechas_femenino FOR SELECT USING (true); END IF;
  -- partidos_femenino
  ALTER TABLE partidos_femenino ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partidos_femenino' AND policyname='pub_read')
    THEN CREATE POLICY "pub_read" ON partidos_femenino FOR SELECT USING (true); END IF;
  -- stats_partido_femenino
  ALTER TABLE stats_partido_femenino ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='stats_partido_femenino' AND policyname='pub_read')
    THEN CREATE POLICY "pub_read" ON stats_partido_femenino FOR SELECT USING (true); END IF;
  -- estadisticas_femenino
  ALTER TABLE estadisticas_femenino ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='estadisticas_femenino' AND policyname='pub_read')
    THEN CREATE POLICY "pub_read" ON estadisticas_femenino FOR SELECT USING (true); END IF;
  -- upload_log (solo lectura pública también)
  ALTER TABLE upload_log ENABLE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='upload_log' AND policyname='pub_read')
    THEN CREATE POLICY "pub_read" ON upload_log FOR SELECT USING (true); END IF;
END $$;

-- ── 9. REALTIME ───────────────────────────────────────────────
-- El frontend recibe push automático cuando cambian estos datos
ALTER PUBLICATION supabase_realtime ADD TABLE estadisticas_femenino;
ALTER PUBLICATION supabase_realtime ADD TABLE partidos_femenino;
ALTER PUBLICATION supabase_realtime ADD TABLE stats_partido_femenino;
ALTER PUBLICATION supabase_realtime ADD TABLE fechas_femenino;

-- ── 10. VISTA útil para debugging ────────────────────────────
CREATE OR REPLACE VIEW v_stats_resumen AS
SELECT
  j.nombre,
  e.nombre AS equipo,
  s.pj,
  s.pts_prom,
  s.reb_prom,
  s.ast_prom,
  s.rob_prom,
  s.tap_prom,
  s.pct_simples,
  s.pct_dobles,
  s.pct_triples,
  s.mejor_pts,
  s.updated_at
FROM estadisticas_femenino s
JOIN jugadoras_femenino j ON j.id = s.jugadora_id
JOIN equipos_femenino   e ON e.id = j.equipo_id
ORDER BY s.pts_prom DESC;
