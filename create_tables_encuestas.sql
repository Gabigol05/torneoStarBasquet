-- ================================================================
-- TORNEO STAR BÁSQUET — Encuestas / Votaciones
-- Supabase Dashboard → SQL Editor → Run
-- 100% seguro para re-ejecutar sobre tablas existentes
-- Sirve tanto para femenino como masculino (columna `categoria`)
-- ================================================================

-- ── 1. ENCUESTAS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS encuestas (
  id          SERIAL PRIMARY KEY,
  categoria   TEXT NOT NULL DEFAULT 'general' CHECK (categoria IN ('femenino','masculino','general')),
  pregunta    TEXT NOT NULL,
  subtitulo   TEXT,                        -- ej: "Fecha 6 · Sábado 20hs"
  activa      BOOLEAN DEFAULT true,
  creado_en   TIMESTAMPTZ DEFAULT now(),
  cerrada_en  TIMESTAMPTZ
);

ALTER TABLE encuestas ADD COLUMN IF NOT EXISTS subtitulo  TEXT;
ALTER TABLE encuestas ADD COLUMN IF NOT EXISTS cerrada_en TIMESTAMPTZ;

-- ── 2. OPCIONES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS encuesta_opciones (
  id           SERIAL PRIMARY KEY,
  encuesta_id  INT NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
  texto        TEXT NOT NULL,
  equipo_id    TEXT,                       -- opcional: id de equipo (roster fem o masc) para logo/color
  orden        INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_eo_encuesta ON encuesta_opciones(encuesta_id);

-- ── 3. VOTOS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS encuesta_votos (
  id           SERIAL PRIMARY KEY,
  encuesta_id  INT NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
  opcion_id    INT NOT NULL REFERENCES encuesta_opciones(id) ON DELETE CASCADE,
  voter_token  TEXT NOT NULL,               -- uuid persistido en localStorage del votante
  ip_hash      TEXT,                        -- hash SHA-256 de la IP pública del votante
  creado_en    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(encuesta_id, voter_token)
);

-- Un solo voto por IP y por encuesta (cuando se pudo obtener la IP)
CREATE UNIQUE INDEX IF NOT EXISTS uq_encuesta_ip
  ON encuesta_votos(encuesta_id, ip_hash) WHERE ip_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ev_encuesta ON encuesta_votos(encuesta_id);
CREATE INDEX IF NOT EXISTS idx_ev_opcion   ON encuesta_votos(opcion_id);

-- ── 4. VISTA DE RESULTADOS ────────────────────────────────────
CREATE OR REPLACE VIEW v_encuesta_resultados AS
SELECT
  o.id AS opcion_id, o.encuesta_id, o.texto, o.equipo_id, o.orden,
  COUNT(v.id) AS votos
FROM encuesta_opciones o
LEFT JOIN encuesta_votos v ON v.opcion_id = o.id
GROUP BY o.id, o.encuesta_id, o.texto, o.equipo_id, o.orden;

-- ── 5. RLS ────────────────────────────────────────────────────
ALTER TABLE encuestas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE encuesta_opciones  ENABLE ROW LEVEL SECURITY;
ALTER TABLE encuesta_votos     ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Lectura pública de encuestas, opciones y votos (para poder contar resultados)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='encuestas' AND policyname='pub_read')
    THEN CREATE POLICY "pub_read" ON encuestas FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='encuesta_opciones' AND policyname='pub_read')
    THEN CREATE POLICY "pub_read" ON encuesta_opciones FOR SELECT USING (true); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='encuesta_votos' AND policyname='pub_read')
    THEN CREATE POLICY "pub_read" ON encuesta_votos FOR SELECT USING (true); END IF;

  -- Cualquier visitante (anon) puede insertar SU voto (el anti-doble-voto lo hacen
  -- el UNIQUE(encuesta_id, voter_token) y el índice único de ip_hash)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='encuesta_votos' AND policyname='pub_insert_voto')
    THEN CREATE POLICY "pub_insert_voto" ON encuesta_votos FOR INSERT WITH CHECK (true); END IF;

  -- Solo el admin autenticado puede crear/editar/borrar encuestas y opciones
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='encuestas' AND policyname='admin_write')
    THEN CREATE POLICY "admin_write" ON encuestas
      FOR INSERT WITH CHECK (auth.role() = 'authenticated'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='encuestas' AND policyname='admin_update')
    THEN CREATE POLICY "admin_update" ON encuestas
      FOR UPDATE USING (auth.role() = 'authenticated'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='encuestas' AND policyname='admin_delete')
    THEN CREATE POLICY "admin_delete" ON encuestas
      FOR DELETE USING (auth.role() = 'authenticated'); END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='encuesta_opciones' AND policyname='admin_write')
    THEN CREATE POLICY "admin_write" ON encuesta_opciones
      FOR INSERT WITH CHECK (auth.role() = 'authenticated'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='encuesta_opciones' AND policyname='admin_update')
    THEN CREATE POLICY "admin_update" ON encuesta_opciones
      FOR UPDATE USING (auth.role() = 'authenticated'); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='encuesta_opciones' AND policyname='admin_delete')
    THEN CREATE POLICY "admin_delete" ON encuesta_opciones
      FOR DELETE USING (auth.role() = 'authenticated'); END IF;
END $$;

-- ── 6. REALTIME ───────────────────────────────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE encuestas;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE encuesta_opciones;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE encuesta_votos;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
