-- ================================================================
-- TORNEO STAR BÁSQUET — Schema femenino
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Podés correr esto múltiples veces sin problemas (IF NOT EXISTS)
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
  fecha_nac  DATE,
  dni        TEXT,
  foto_url   TEXT
);

-- 3) Estadísticas (una fila por jugadora, se actualiza cada fecha)
CREATE TABLE IF NOT EXISTS estadisticas_femenino (
  jugadora_id  TEXT PRIMARY KEY REFERENCES jugadoras_femenino(id),
  pj   INT            DEFAULT 0,
  pts  NUMERIC(5,1)   DEFAULT 0,
  reb  NUMERIC(5,1)   DEFAULT 0,
  ast  NUMERIC(5,1)   DEFAULT 0,
  rob  NUMERIC(5,1)   DEFAULT 0,
  tap  NUMERIC(5,1)   DEFAULT 0,
  fgp  NUMERIC(5,1)   DEFAULT 0,
  tpp  NUMERIC(5,1)   DEFAULT 0,
  tlp  NUMERIC(5,1)   DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4) Partidos
CREATE TABLE IF NOT EXISTS partidos_femenino (
  id               SERIAL PRIMARY KEY,
  equipo_local_id  TEXT REFERENCES equipos_femenino(id),
  equipo_visit_id  TEXT REFERENCES equipos_femenino(id),
  puntos_local     INT,
  puntos_visit     INT,
  fecha            TIMESTAMPTZ,
  lugar            TEXT,
  estado           TEXT DEFAULT 'pendiente',
  jornada          INT
);

-- Agregar columna lugar si ya existía la tabla sin ella
ALTER TABLE partidos_femenino ADD COLUMN IF NOT EXISTS lugar TEXT;

-- 5) RLS — lectura pública
ALTER TABLE equipos_femenino       ENABLE ROW LEVEL SECURITY;
ALTER TABLE jugadoras_femenino     ENABLE ROW LEVEL SECURITY;
ALTER TABLE estadisticas_femenino  ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidos_femenino      ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='equipos_femenino' AND policyname='lectura publica equipos') THEN
    CREATE POLICY "lectura publica equipos" ON equipos_femenino FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='jugadoras_femenino' AND policyname='lectura publica jugadoras') THEN
    CREATE POLICY "lectura publica jugadoras" ON jugadoras_femenino FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='estadisticas_femenino' AND policyname='lectura publica estadisticas') THEN
    CREATE POLICY "lectura publica estadisticas" ON estadisticas_femenino FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partidos_femenino' AND policyname='lectura publica partidos') THEN
    CREATE POLICY "lectura publica partidos" ON partidos_femenino FOR SELECT USING (true);
  END IF;
END $$;

-- 6) Realtime — el frontend se actualiza automáticamente
ALTER PUBLICATION supabase_realtime ADD TABLE estadisticas_femenino;
ALTER PUBLICATION supabase_realtime ADD TABLE partidos_femenino;
