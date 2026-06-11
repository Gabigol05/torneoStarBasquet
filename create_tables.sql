-- ================================================================
-- TORNEO STAR BÁSQUET — Schema femenino
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ================================================================

-- 1) Equipos femenino
CREATE TABLE IF NOT EXISTS equipos_femenino (
  id        TEXT PRIMARY KEY,        -- ej: 'f_black_mamba'
  nombre    TEXT NOT NULL,
  color     TEXT,
  genero    TEXT DEFAULT 'femenino'
);

-- 2) Jugadoras femenino
CREATE TABLE IF NOT EXISTS jugadoras_femenino (
  id         TEXT PRIMARY KEY,       -- ej: 'f_bm_01'
  equipo_id  TEXT NOT NULL REFERENCES equipos_femenino(id),
  nombre     TEXT NOT NULL,
  fecha_nac  DATE,
  dni        TEXT,
  foto_url   TEXT                    -- para fotos futuras
);

-- 3) Estadísticas de jugadoras (las llena el backend)
CREATE TABLE IF NOT EXISTS estadisticas_femenino (
  id          SERIAL PRIMARY KEY,
  jugadora_id TEXT NOT NULL REFERENCES jugadoras_femenino(id),
  pj          INT  DEFAULT 0,        -- partidos jugados
  pts         NUMERIC(5,1) DEFAULT 0,
  reb         NUMERIC(5,1) DEFAULT 0,
  ast         NUMERIC(5,1) DEFAULT 0,
  stl         NUMERIC(5,1) DEFAULT 0,
  blk         NUMERIC(5,1) DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 4) Partidos (para resultados y fixture)
CREATE TABLE IF NOT EXISTS partidos_femenino (
  id              SERIAL PRIMARY KEY,
  equipo_local_id  TEXT REFERENCES equipos_femenino(id),
  equipo_visit_id  TEXT REFERENCES equipos_femenino(id),
  puntos_local     INT,
  puntos_visit     INT,
  fecha            TIMESTAMPTZ,
  estado           TEXT DEFAULT 'pendiente', -- 'pendiente' | 'en_juego' | 'finalizado'
  jornada          INT,
  lugar            TEXT
);

-- 5) Row Level Security — lectura pública (anon key puede leer)
ALTER TABLE equipos_femenino       ENABLE ROW LEVEL SECURITY;
ALTER TABLE jugadoras_femenino     ENABLE ROW LEVEL SECURITY;
ALTER TABLE estadisticas_femenino  ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidos_femenino      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lectura publica equipos"       ON equipos_femenino       FOR SELECT USING (true);
CREATE POLICY "lectura publica jugadoras"     ON jugadoras_femenino     FOR SELECT USING (true);
CREATE POLICY "lectura publica estadisticas"  ON estadisticas_femenino  FOR SELECT USING (true);
CREATE POLICY "lectura publica partidos"      ON partidos_femenino      FOR SELECT USING (true);
