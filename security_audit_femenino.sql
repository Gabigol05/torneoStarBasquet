-- ================================================================
-- TORNEO STAR BÁSQUET — Auditoría y corrección de seguridad (RLS)
-- Supabase Dashboard → SQL Editor → Run
-- ================================================================
-- Qué hace:
--   1) Te muestra TODAS las políticas que existen hoy en las tablas
--      del femenino, masculino y encuestas (para que veas qué había
--      antes de tocar nada).
--   2) Sobre las tablas del FEMENINO (que quedaron sin política de
--      escritura explícita en create_tables.sql), borra cualquier
--      política existente y las reemplaza por el mismo criterio que
--      ya usan masculino y encuestas: lectura pública, escritura
--      SOLO para usuarios autenticados.
--   3) Es 100% seguro de re-ejecutar cuantas veces quieras.
-- ================================================================

-- ── PASO 1: ver el estado actual (antes de corregir nada) ────────
-- Copiá el resultado de este SELECT si querés revisarlo antes de seguir.
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'equipos_femenino','jugadoras_femenino','fechas_femenino','partidos_femenino',
    'stats_partido_femenino','estadisticas_femenino','upload_log','nombre_aliases',
    'equipos_masculino','jugadores_masculino','fechas_masculino','partidos_masculino',
    'stats_partido_masculino','estadisticas_masculino','upload_log_masculino','nombre_aliases_masculino',
    'encuestas','encuesta_opciones','encuesta_votos'
  )
ORDER BY tablename, policyname;

-- ── PASO 2: limpiar y recrear políticas del FEMENINO ──────────────
DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'equipos_femenino','jugadoras_femenino','fechas_femenino','partidos_femenino',
    'stats_partido_femenino','estadisticas_femenino','upload_log','nombre_aliases'
  ]
  LOOP
    -- Asegura RLS prendido
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    -- Borra CUALQUIER política existente en la tabla (sin importar el nombre
    -- que tenga hoy), para no dejar reglas viejas/desconocidas conviviendo
    -- con las nuevas.
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
    END LOOP;

    -- Recrea las dos políticas canónicas: lectura pública, escritura solo
    -- para usuarios logueados (mismo criterio que masculino y encuestas).
    EXECUTE format('CREATE POLICY "pub_read" ON %I FOR SELECT USING (true)', tbl);
    EXECUTE format(
      'CREATE POLICY "admin_write" ON %I FOR ALL USING (auth.role() = ''authenticated'') WITH CHECK (auth.role() = ''authenticated'')',
      tbl
    );
  END LOOP;
END $$;

-- ── PASO 3: verificación final — deberías ver exactamente 2 políticas
--            por tabla (pub_read + admin_write) ──────────────────
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'equipos_femenino','jugadoras_femenino','fechas_femenino','partidos_femenino',
    'stats_partido_femenino','estadisticas_femenino','upload_log','nombre_aliases'
  )
ORDER BY tablename, policyname;
