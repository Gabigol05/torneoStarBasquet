-- ================================================================
-- TORNEO STAR BÁSQUET — Schema v3 (seguro para re-ejecutar)
-- Supabase Dashboard → SQL Editor → Run
-- ================================================================

-- 1) Equipos
CREATE TABLE IF NOT EXISTS equipos_femenino (
  id      TEXT PRIMARY KEY,
  nombre  TEXT NOT NULL,
  color   TEXT,
  genero  TEXT DEFAULT 'femenino'
);

-- 2) Jugadoras
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

-- 3) Fechas del torneo
CREATE TABLE IF NOT EXISTS fechas_femenino (
  id          SERIAL PRIMARY KEY,
  numero      INT  NOT NULL UNIQUE,
  descripcion TEXT,
  fecha_dia   DATE
);

-- 4) Partidos
-- NOTA: si ya tenías partidos_femenino sin columnas de cuartos,
-- este bloque las agrega de forma segura.
CREATE TABLE IF NOT EXISTS partidos_femenino (
  id               SERIAL PRIMARY KEY,
  fecha_id         INT  REFERENCES fechas_femenino(id),
  equipo_local_id  TEXT REFERENCES equipos_femenino(id),
  equipo_visit_id  TEXT REFERENCES equipos_femenino(id),
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
  lugar            TEXT,
  estado           TEXT DEFAULT 'pendiente',
  mvp_jugadora_id  TEXT REFERENCES jugadoras_femenino(id)
);

-- Agregar columnas que pueden faltar si la tabla ya existía
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS fecha_id        INT REFERENCES fechas_femenino(id);
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS q1_local        INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS q2_local        INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS q3_local        INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS q4_local        INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS ot_local        INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS q1_visit        INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS q2_visit        INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS q3_visit        INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS q4_visit        INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS ot_visit        INT DEFAULT 0;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS pct_simples_local NUMERIC(5,1);
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS pct_dobles_local  NUMERIC(5,1);
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS pct_triples_local NUMERIC(5,1);
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS pct_simples_visit NUMERIC(5,1);
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS pct_dobles_visit  NUMERIC(5,1);
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS pct_triples_visit NUMERIC(5,1);
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS lugar           TEXT;
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS mvp_jugadora_id TEXT;

-- Trigger para mantener puntos_local/visit sincronizados con cuartos
CREATE OR REPLACE FUNCTION sync_puntos_partido()
RETURNS TRIGGER AS $$
BEGIN
  NEW.puntos_local := COALESCE(NEW.q1_local,0)+COALESCE(NEW.q2_local,0)+COALESCE(NEW.q3_local,0)+COALESCE(NEW.q4_local,0)+COALESCE(NEW.ot_local,0);
  NEW.puntos_visit := COALESCE(NEW.q1_visit,0)+COALESCE(NEW.q2_visit,0)+COALESCE(NEW.q3_visit,0)+COALESCE(NEW.q4_visit,0)+COALESCE(NEW.ot_visit,0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_puntos ON partidos_femenino;
CREATE TRIGGER trg_sync_puntos
  BEFORE INSERT OR UPDATE ON partidos_femenino
  FOR EACH ROW EXECUTE FUNCTION sync_puntos_partido();

-- 5) Stats por jugadora por partido
CREATE TABLE IF NOT EXISTS stats_partido_femenino (
  id          SERIAL PRIMARY KEY,
  partido_id  INT  NOT NULL REFERENCES partidos_femenino(id) ON DELETE CASCADE,
  jugadora_id TEXT NOT NULL REFERENCES jugadoras_femenino(id),
  equipo_id   TEXT NOT NULL REFERENCES equipos_femenino(id),
  numero      INT,
  sc  INT DEFAULT 0, sf  INT DEFAULT 0,
  dc  INT DEFAULT 0, df  INT DEFAULT 0,
  tc  INT DEFAULT 0, tf  INT DEFAULT 0,
  as_ INT DEFAULT 0,
  rd  INT DEFAULT 0, ro  INT DEFAULT 0,
  fp  INT DEFAULT 0, ft  INT DEFAULT 0, fa INT DEFAULT 0,
  rb  INT DEFAULT 0, tp  INT DEFAULT 0, pe INT DEFAULT 0,
  ca  INT DEFAULT 0,
  pts INT DEFAULT 0,
  val INT DEFAULT 0,
  UNIQUE(partido_id, jugadora_id)
);

-- 6) Estadísticas acumuladas por jugadora
CREATE TABLE IF NOT EXISTS estadisticas_femenino (
  jugadora_id  TEXT PRIMARY KEY REFERENCES jugadoras_femenino(id),
  pj           INT            DEFAULT 0,
  pts_prom     NUMERIC(5,1)   DEFAULT 0,
  reb_prom     NUMERIC(5,1)   DEFAULT 0,
  ast_prom     NUMERIC(5,1)   DEFAULT 0,
  rob_prom     NUMERIC(5,1)   DEFAULT 0,
  tap_prom     NUMERIC(5,1)   DEFAULT 0,
  per_prom     NUMERIC(5,1)   DEFAULT 0,
  val_prom     NUMERIC(5,1)   DEFAULT 0,
  pct_simples  NUMERIC(5,1)   DEFAULT 0,
  pct_dobles   NUMERIC(5,1)   DEFAULT 0,
  pct_triples  NUMERIC(5,1)   DEFAULT 0,
  pts_total    INT            DEFAULT 0,
  reb_total    INT            DEFAULT 0,
  ast_total    INT            DEFAULT 0,
  mejor_pts    INT            DEFAULT 0,
  mejor_pts_rival TEXT,
  updated_at   TIMESTAMPTZ    DEFAULT now()
);

-- Agregar columnas si la tabla vieja no las tenía
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

-- 7) RLS — lectura pública para todos
DO $$ BEGIN
  -- equipos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='equipos_femenino' AND policyname='pub_read')
    THEN ALTER TABLE equipos_femenino ENABLE ROW LEVEL SECURITY;
         CREATE POLICY "pub_read" ON equipos_femenino FOR SELECT USING (true); END IF;
  -- jugadoras
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='jugadoras_femenino' AND policyname='pub_read')
    THEN ALTER TABLE jugadoras_femenino ENABLE ROW LEVEL SECURITY;
         CREATE POLICY "pub_read" ON jugadoras_femenino FOR SELECT USING (true); END IF;
  -- fechas
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fechas_femenino' AND policyname='pub_read')
    THEN ALTER TABLE fechas_femenino ENABLE ROW LEVEL SECURITY;
         CREATE POLICY "pub_read" ON fechas_femenino FOR SELECT USING (true); END IF;
  -- partidos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partidos_femenino' AND policyname='pub_read')
    THEN ALTER TABLE partidos_femenino ENABLE ROW LEVEL SECURITY;
         CREATE POLICY "pub_read" ON partidos_femenino FOR SELECT USING (true); END IF;
  -- stats_partido
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='stats_partido_femenino' AND policyname='pub_read')
    THEN ALTER TABLE stats_partido_femenino ENABLE ROW LEVEL SECURITY;
         CREATE POLICY "pub_read" ON stats_partido_femenino FOR SELECT USING (true); END IF;
  -- estadisticas
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='estadisticas_femenino' AND policyname='pub_read')
    THEN ALTER TABLE estadisticas_femenino ENABLE ROW LEVEL SECURITY;
         CREATE POLICY "pub_read" ON estadisticas_femenino FOR SELECT USING (true); END IF;
END $$;

-- 8) Realtime — actualizaciones en vivo al frontend
ALTER PUBLICATION supabase_realtime ADD TABLE estadisticas_femenino;
ALTER PUBLICATION supabase_realtime ADD TABLE partidos_femenino;
ALTER PUBLICATION supabase_realtime ADD TABLE stats_partido_femenino;
ALTER PUBLICATION supabase_realtime ADD TABLE fechas_femenino;
