-- ================================================================
-- TORNEO STAR BÁSQUET — Schema completo v2
-- Ejecutar en: Supabase Dashboard → SQL Editor
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

-- 3) Fechas del torneo (jornadas)
CREATE TABLE IF NOT EXISTS fechas_femenino (
  id          SERIAL PRIMARY KEY,
  numero      INT NOT NULL UNIQUE,   -- 1, 2, 3...
  descripcion TEXT,                  -- "Fecha 1", "Semifinal", etc.
  fecha_dia   DATE
);

-- 4) Partidos
CREATE TABLE IF NOT EXISTS partidos_femenino (
  id               SERIAL PRIMARY KEY,
  fecha_id         INT REFERENCES fechas_femenino(id),
  equipo_local_id  TEXT REFERENCES equipos_femenino(id),
  equipo_visit_id  TEXT REFERENCES equipos_femenino(id),
  -- Parciales
  q1_local  INT DEFAULT 0, q2_local  INT DEFAULT 0,
  q3_local  INT DEFAULT 0, q4_local  INT DEFAULT 0,
  ot_local  INT DEFAULT 0,
  q1_visit  INT DEFAULT 0, q2_visit  INT DEFAULT 0,
  q3_visit  INT DEFAULT 0, q4_visit  INT DEFAULT 0,
  ot_visit  INT DEFAULT 0,
  -- Totales calculados
  puntos_local  INT GENERATED ALWAYS AS (q1_local+q2_local+q3_local+q4_local+ot_local) STORED,
  puntos_visit  INT GENERATED ALWAYS AS (q1_visit+q2_visit+q3_visit+q4_visit+ot_visit) STORED,
  -- Porcentajes de equipo
  pct_simples_local  NUMERIC(5,1), pct_dobles_local  NUMERIC(5,1), pct_triples_local  NUMERIC(5,1),
  pct_simples_visit  NUMERIC(5,1), pct_dobles_visit  NUMERIC(5,1), pct_triples_visit  NUMERIC(5,1),
  -- Meta
  lugar   TEXT,
  estado  TEXT DEFAULT 'pendiente',  -- 'pendiente' | 'en_juego' | 'finalizado'
  mvp_jugadora_id TEXT REFERENCES jugadoras_femenino(id)
);

-- 5) Stats por jugadora por partido (el corazón del sistema)
CREATE TABLE IF NOT EXISTS stats_partido_femenino (
  id           SERIAL PRIMARY KEY,
  partido_id   INT NOT NULL REFERENCES partidos_femenino(id) ON DELETE CASCADE,
  jugadora_id  TEXT NOT NULL REFERENCES jugadoras_femenino(id),
  equipo_id    TEXT NOT NULL REFERENCES equipos_femenino(id),
  numero       INT,      -- número de camiseta en ese partido
  -- Tiros
  sc INT DEFAULT 0,  -- simples convertidos
  sf INT DEFAULT 0,  -- simples fallados
  dc INT DEFAULT 0,  -- dobles convertidos
  df INT DEFAULT 0,  -- dobles fallados
  tc INT DEFAULT 0,  -- triples convertidos
  tf INT DEFAULT 0,  -- triples fallados
  -- Juego
  as_ INT DEFAULT 0,  -- asistencias (as es keyword en SQL)
  rd  INT DEFAULT 0,  -- rebotes defensivos
  ro  INT DEFAULT 0,  -- rebotes ofensivos
  -- Faltas
  fp  INT DEFAULT 0,  -- faltas personales
  ft  INT DEFAULT 0,  -- faltas técnicas
  fa  INT DEFAULT 0,  -- faltas antideportivas
  -- Otros
  rb  INT DEFAULT 0,  -- robos
  tp  INT DEFAULT 0,  -- tapones
  pe  INT DEFAULT 0,  -- pérdidas
  ca  INT DEFAULT 0,  -- canastas adicionales (si aplica)
  pts INT DEFAULT 0,  -- puntos totales
  val INT DEFAULT 0,  -- valoración
  UNIQUE(partido_id, jugadora_id)
);

-- 6) Stats acumuladas por jugadora (se recalculan al cargar cada partido)
CREATE TABLE IF NOT EXISTS estadisticas_femenino (
  jugadora_id  TEXT PRIMARY KEY REFERENCES jugadoras_femenino(id),
  pj   INT DEFAULT 0,
  -- Promedios
  pts_prom  NUMERIC(5,1) DEFAULT 0,
  reb_prom  NUMERIC(5,1) DEFAULT 0,  -- rd + ro
  ast_prom  NUMERIC(5,1) DEFAULT 0,
  rob_prom  NUMERIC(5,1) DEFAULT 0,
  tap_prom  NUMERIC(5,1) DEFAULT 0,
  per_prom  NUMERIC(5,1) DEFAULT 0,
  val_prom  NUMERIC(5,1) DEFAULT 0,
  -- Porcentajes
  pct_simples  NUMERIC(5,1) DEFAULT 0,
  pct_dobles   NUMERIC(5,1) DEFAULT 0,
  pct_triples  NUMERIC(5,1) DEFAULT 0,
  -- Totales (para rankings internos)
  pts_total  INT DEFAULT 0,
  reb_total  INT DEFAULT 0,
  ast_total  INT DEFAULT 0,
  -- Mejor partido
  mejor_pts       INT DEFAULT 0,
  mejor_pts_rival TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Agregar columnas si ya existía la tabla vieja
ALTER TABLE jugadoras_femenino ADD COLUMN IF NOT EXISTS numero INT;
ALTER TABLE partidos_femenino  ADD COLUMN IF NOT EXISTS fecha_id INT REFERENCES fechas_femenino(id);
ALTER TABLE partidos_femenino  ADD COLUMN IF NOT EXISTS lugar TEXT;
ALTER TABLE partidos_femenino  ADD COLUMN IF NOT EXISTS mvp_jugadora_id TEXT;

-- 7) RLS — lectura pública
ALTER TABLE equipos_femenino       ENABLE ROW LEVEL SECURITY;
ALTER TABLE jugadoras_femenino     ENABLE ROW LEVEL SECURITY;
ALTER TABLE fechas_femenino        ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidos_femenino      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats_partido_femenino ENABLE ROW LEVEL SECURITY;
ALTER TABLE estadisticas_femenino  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='equipos_femenino'       AND policyname='pub_read') THEN CREATE POLICY "pub_read" ON equipos_femenino       FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='jugadoras_femenino'     AND policyname='pub_read') THEN CREATE POLICY "pub_read" ON jugadoras_femenino     FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fechas_femenino'        AND policyname='pub_read') THEN CREATE POLICY "pub_read" ON fechas_femenino        FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partidos_femenino'      AND policyname='pub_read') THEN CREATE POLICY "pub_read" ON partidos_femenino      FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='stats_partido_femenino' AND policyname='pub_read') THEN CREATE POLICY "pub_read" ON stats_partido_femenino FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='estadisticas_femenino'  AND policyname='pub_read') THEN CREATE POLICY "pub_read" ON estadisticas_femenino  FOR SELECT USING (true); END IF;
END $$;

-- 8) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE estadisticas_femenino;
ALTER PUBLICATION supabase_realtime ADD TABLE partidos_femenino;
ALTER PUBLICATION supabase_realtime ADD TABLE stats_partido_femenino;
ALTER PUBLICATION supabase_realtime ADD TABLE fechas_femenino;
