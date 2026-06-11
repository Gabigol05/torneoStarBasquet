"""
setup_supabase_completo.py
==========================
Ejecutar desde la raíz del repo o desde cualquier carpeta:
    python setup_supabase_completo.py

Hace todo:
  1. Crea las tablas en Supabase via SQL (Management API)
  2. Carga los 10 equipos
  3. Carga las 173 jugadoras
  4. Genera FrontEnd/.env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
"""

import requests, json, os, sys

# ─── Config ────────────────────────────────────────────────────────────────────
PROJECT_REF   = "weveobptegokulxsqsuf"
SUPABASE_URL  = f"https://{PROJECT_REF}.supabase.co"
ANON_KEY      = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndldmVvYnB0ZWdva3VseHNxc3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMjgyNTgsImV4cCI6MjA5NjcwNDI1OH0.lIVx1E-fC-jIHcHXEUDIeuytQjvXVd4Mk-uCoI4-ooc"
SERVICE_KEY   = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndldmVvYnB0ZWdva3VseHNxc3VmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTEyODI1OCwiZXhwIjoyMDk2NzA0MjU4fQ.t8WMPJpnG5vOJPHpzTrwBOjZxdZ_IOjAWabt2ECqQOg"

REST_URL      = f"{SUPABASE_URL}/rest/v1"
MGMT_URL      = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

HEADERS_REST  = {
    "apikey":        SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "resolution=merge-duplicates,return=minimal",
}

# ─── SQL ───────────────────────────────────────────────────────────────────────
CREATE_SQL = """
-- Equipos
CREATE TABLE IF NOT EXISTS equipos_femenino (
  id      TEXT PRIMARY KEY,
  nombre  TEXT NOT NULL,
  color   TEXT,
  genero  TEXT DEFAULT 'femenino'
);

-- Jugadoras
CREATE TABLE IF NOT EXISTS jugadoras_femenino (
  id         TEXT PRIMARY KEY,
  equipo_id  TEXT NOT NULL REFERENCES equipos_femenino(id),
  nombre     TEXT NOT NULL,
  fecha_nac  DATE,
  dni        TEXT,
  foto_url   TEXT
);

-- Estadísticas (las llena el backend cuando esté listo)
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

-- Partidos
CREATE TABLE IF NOT EXISTS partidos_femenino (
  id               SERIAL PRIMARY KEY,
  equipo_local_id  TEXT REFERENCES equipos_femenino(id),
  equipo_visit_id  TEXT REFERENCES equipos_femenino(id),
  puntos_local     INT,
  puntos_visit     INT,
  fecha            TIMESTAMPTZ,
  estado           TEXT DEFAULT 'pendiente',
  jornada          INT
);

-- RLS: lectura pública (anon key puede hacer SELECT)
DO $$ BEGIN
  -- equipos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='equipos_femenino' AND policyname='lectura publica equipos') THEN
    ALTER TABLE equipos_femenino ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "lectura publica equipos" ON equipos_femenino FOR SELECT USING (true);
  END IF;
  -- jugadoras
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='jugadoras_femenino' AND policyname='lectura publica jugadoras') THEN
    ALTER TABLE jugadoras_femenino ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "lectura publica jugadoras" ON jugadoras_femenino FOR SELECT USING (true);
  END IF;
  -- estadisticas
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='estadisticas_femenino' AND policyname='lectura publica estadisticas') THEN
    ALTER TABLE estadisticas_femenino ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "lectura publica estadisticas" ON estadisticas_femenino FOR SELECT USING (true);
  END IF;
  -- partidos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='partidos_femenino' AND policyname='lectura publica partidos') THEN
    ALTER TABLE partidos_femenino ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "lectura publica partidos" ON partidos_femenino FOR SELECT USING (true);
  END IF;
END $$;
"""

# ─── Data ──────────────────────────────────────────────────────────────────────
EQUIPOS = [
    {"id": "f_black_mamba",   "nombre": "Black Mamba",      "color": "#8b5cf6"},
    {"id": "f_pilar",         "nombre": "Pilar Sport Club",  "color": "#ef4444"},
    {"id": "f_artigas",       "nombre": "Artigas BC",        "color": "#22c55e"},
    {"id": "f_triple_locura", "nombre": "Triple Locura",     "color": "#f97316"},
    {"id": "f_union",         "nombre": "Unión Alta Gracia", "color": "#3b82f6"},
    {"id": "f_ferrobre",      "nombre": "Ferrobre",          "color": "#eab308"},
    {"id": "f_branca",        "nombre": "Branca",            "color": "#ec4899"},
    {"id": "f_el_h",          "nombre": "El H",              "color": "#14b8a6"},
    {"id": "f_piratas",       "nombre": "Piratas",           "color": "#f43f5e"},
    {"id": "f_qaramtas",      "nombre": "Qaramtas",          "color": "#a855f7"},
]

JUGADORAS = [
    # Black Mamba
    {"id":"f_bm_01","equipo_id":"f_black_mamba","nombre":"Katya Hanisch","fecha_nac":"1992-05-11","dni":"36610576"},
    {"id":"f_bm_02","equipo_id":"f_black_mamba","nombre":"Gwendoline Farragut","fecha_nac":"1994-04-03","dni":"37628634"},
    {"id":"f_bm_03","equipo_id":"f_black_mamba","nombre":"Agustina Ordoñez","fecha_nac":"2001-12-05","dni":"43811455"},
    {"id":"f_bm_04","equipo_id":"f_black_mamba","nombre":"Lucia Muela","fecha_nac":"2002-01-17","dni":"43695370"},
    {"id":"f_bm_05","equipo_id":"f_black_mamba","nombre":"Rocio Quevedo","fecha_nac":"2005-07-18","dni":"46465344"},
    {"id":"f_bm_06","equipo_id":"f_black_mamba","nombre":"Isabella Palacios","fecha_nac":"2005-01-05","dni":"46177016"},
    {"id":"f_bm_07","equipo_id":"f_black_mamba","nombre":"Malena Caminos","fecha_nac":"2002-01-09","dni":"43617753"},
    {"id":"f_bm_08","equipo_id":"f_black_mamba","nombre":"Lucia Bernardi","fecha_nac":"2001-05-19","dni":"43365821"},
    {"id":"f_bm_09","equipo_id":"f_black_mamba","nombre":"Victoria Sanchez","fecha_nac":"2001-10-31","dni":"43477561"},
    {"id":"f_bm_10","equipo_id":"f_black_mamba","nombre":"Catalina Racca","fecha_nac":"2005-05-03","dni":"46308947"},
    {"id":"f_bm_11","equipo_id":"f_black_mamba","nombre":"Francina Rodriguez","fecha_nac":"2002-04-26","dni":"42788095"},
    {"id":"f_bm_12","equipo_id":"f_black_mamba","nombre":"Luana Gutierrez","fecha_nac":"1999-11-08","dni":"41957402"},
    {"id":"f_bm_13","equipo_id":"f_black_mamba","nombre":"Faustina Moraga Piccardini","fecha_nac":"2005-12-01","dni":"46858504"},
    # Pilar
    {"id":"f_psc_01","equipo_id":"f_pilar","nombre":"Giraudo María Jose","fecha_nac":"1985-06-17","dni":"30847970"},
    {"id":"f_psc_02","equipo_id":"f_pilar","nombre":"Serra Estefania","fecha_nac":"1989-11-07","dni":"34572973"},
    {"id":"f_psc_03","equipo_id":"f_pilar","nombre":"Giraudo Ivana","fecha_nac":"1991-08-19","dni":"35869709"},
    {"id":"f_psc_04","equipo_id":"f_pilar","nombre":"Wolfel Stefania","fecha_nac":"1988-07-11","dni":"33916703"},
    {"id":"f_psc_05","equipo_id":"f_pilar","nombre":"Diaz Abigail","fecha_nac":"1991-07-20","dni":"35869690"},
    {"id":"f_psc_06","equipo_id":"f_pilar","nombre":"Bergia Carolina","fecha_nac":"1984-03-09","dni":"30091752"},
    {"id":"f_psc_07","equipo_id":"f_pilar","nombre":"Arce Vanessa","fecha_nac":"1989-06-27","dni":"34241461"},
    {"id":"f_psc_08","equipo_id":"f_pilar","nombre":"Chivazza Melania","fecha_nac":"1992-11-05","dni":"35869934"},
    {"id":"f_psc_09","equipo_id":"f_pilar","nombre":"Azar Sheila","fecha_nac":"1990-01-17","dni":"34990045"},
    {"id":"f_psc_10","equipo_id":"f_pilar","nombre":"Montironi Daniela","fecha_nac":"1990-06-22","dni":"34968262"},
    {"id":"f_psc_11","equipo_id":"f_pilar","nombre":"Gregori Stefania","fecha_nac":"1989-01-11","dni":"33814834"},
    {"id":"f_psc_12","equipo_id":"f_pilar","nombre":"Sintora Sofia","fecha_nac":"1988-05-19","dni":"33603693"},
    {"id":"f_psc_13","equipo_id":"f_pilar","nombre":"Allende Lis","fecha_nac":"1987-12-04","dni":"33381584"},
    {"id":"f_psc_14","equipo_id":"f_pilar","nombre":"Leigginer Luciana","fecha_nac":"1986-11-11","dni":"32530677"},
    {"id":"f_psc_15","equipo_id":"f_pilar","nombre":"Romero Analia","fecha_nac":"1983-11-21","dni":"30021858"},
    {"id":"f_psc_16","equipo_id":"f_pilar","nombre":"Gomez Erika","fecha_nac":"1981-11-11","dni":"29188067"},
    {"id":"f_psc_17","equipo_id":"f_pilar","nombre":"Bulacio Griselda","fecha_nac":"1978-12-06","dni":"27013969"},
    {"id":"f_psc_18","equipo_id":"f_pilar","nombre":"Viada Verónica","fecha_nac":"1981-11-21","dni":"28840937"},
    # Artigas
    {"id":"f_art_01","equipo_id":"f_artigas","nombre":"Sofia Sotelino","fecha_nac":"1989-12-02","dni":"35018169"},
    {"id":"f_art_02","equipo_id":"f_artigas","nombre":"Julieta Morales","fecha_nac":"1990-09-02","dni":"35157738"},
    {"id":"f_art_03","equipo_id":"f_artigas","nombre":"Florencia Belén Deambrossio","fecha_nac":"1997-07-29","dni":"40518165"},
    {"id":"f_art_04","equipo_id":"f_artigas","nombre":"Francisca Pedrero","fecha_nac":"2005-11-06","dni":"46404799"},
    {"id":"f_art_05","equipo_id":"f_artigas","nombre":"Soledad Dagna","fecha_nac":"1989-04-11","dni":"34440147"},
    {"id":"f_art_06","equipo_id":"f_artigas","nombre":"Emilia del Sacramento","fecha_nac":"1990-04-25","dni":"35089581"},
    {"id":"f_art_07","equipo_id":"f_artigas","nombre":"Camila Cinalli","fecha_nac":"1994-04-04","dni":"38181509"},
    {"id":"f_art_08","equipo_id":"f_artigas","nombre":"Julieta Ferri","fecha_nac":"1999-10-05","dni":"41813709"},
    {"id":"f_art_09","equipo_id":"f_artigas","nombre":"Carla Monte","fecha_nac":"1994-07-20","dni":"36642391"},
    {"id":"f_art_10","equipo_id":"f_artigas","nombre":"Maria Luz Caceres","fecha_nac":"1992-02-25","dni":"36147797"},
    {"id":"f_art_11","equipo_id":"f_artigas","nombre":"Lucia del Luján Seia","fecha_nac":"2002-02-28","dni":"43929359"},
    {"id":"f_art_12","equipo_id":"f_artigas","nombre":"Lucía Juárez","fecha_nac":"1998-11-06","dni":"41185026"},
    {"id":"f_art_13","equipo_id":"f_artigas","nombre":"Agustina Lopez Salvia","fecha_nac":"1992-05-12","dni":"36354856"},
    {"id":"f_art_14","equipo_id":"f_artigas","nombre":"Carolina Lopez Salvia","fecha_nac":"1990-08-28","dni":"35525245"},
    {"id":"f_art_15","equipo_id":"f_artigas","nombre":"Oriana Vilar","fecha_nac":"1999-05-22","dni":"41814719"},
    {"id":"f_art_16","equipo_id":"f_artigas","nombre":"Araceli Vottero","fecha_nac":"1989-02-25","dni":"34421578"},
    {"id":"f_art_17","equipo_id":"f_artigas","nombre":"Guadalupe Alcalá","fecha_nac":"2001-03-22","dni":"43334997"},
    {"id":"f_art_18","equipo_id":"f_artigas","nombre":"Magalí Guevara Olcese","fecha_nac":"1991-06-27","dni":"35965902"},
    {"id":"f_art_19","equipo_id":"f_artigas","nombre":"Romina Galfrascoli","fecha_nac":"1997-03-11","dni":"39999484"},
    {"id":"f_art_20","equipo_id":"f_artigas","nombre":"Valentina Coraglio","fecha_nac":"1996-07-31","dni":"39610626"},
    {"id":"f_art_21","equipo_id":"f_artigas","nombre":"María Silvia Godoy","fecha_nac":"1994-06-18","dni":"37887716"},
    {"id":"f_art_22","equipo_id":"f_artigas","nombre":"Cecilia Cabanellas","fecha_nac":"1992-11-22","dni":"36811077"},
    {"id":"f_art_23","equipo_id":"f_artigas","nombre":"Josefina Ferreyra","fecha_nac":"1988-02-10","dni":"33535979"},
    # Triple Locura
    {"id":"f_tl_01","equipo_id":"f_triple_locura","nombre":"Ana Sabrina Carnielli","fecha_nac":"2001-02-21","dni":"42926885"},
    {"id":"f_tl_02","equipo_id":"f_triple_locura","nombre":"Florencia Ortega","fecha_nac":"2002-07-31","dni":"44235107"},
    {"id":"f_tl_03","equipo_id":"f_triple_locura","nombre":"Sol Gimena Sanchez","fecha_nac":"2002-12-24","dni":"44600725"},
    {"id":"f_tl_04","equipo_id":"f_triple_locura","nombre":"Tiziana Weinbender","fecha_nac":"2003-09-06","dni":"44600502"},
    {"id":"f_tl_05","equipo_id":"f_triple_locura","nombre":"Natasha Michelle Pikaluk","fecha_nac":"1996-09-03","dni":"39898832"},
    {"id":"f_tl_06","equipo_id":"f_triple_locura","nombre":"Lucía Anahí D'Onofrio","fecha_nac":"2001-04-24","dni":"43365294"},
    {"id":"f_tl_07","equipo_id":"f_triple_locura","nombre":"Valeria Angélica Magariño","fecha_nac":"1985-10-08","dni":"31844164"},
    {"id":"f_tl_08","equipo_id":"f_triple_locura","nombre":"Agustina Pinedo","fecha_nac":"1999-01-18","dni":"41094051"},
    {"id":"f_tl_09","equipo_id":"f_triple_locura","nombre":"Patricia Vega","fecha_nac":"1969-06-15","dni":"20784213"},
    {"id":"f_tl_10","equipo_id":"f_triple_locura","nombre":"Maria Julieta Re","fecha_nac":"1986-10-19","dni":"32488209"},
    {"id":"f_tl_11","equipo_id":"f_triple_locura","nombre":"Paloma Abad","fecha_nac":"2004-03-23","dni":"45347849"},
    {"id":"f_tl_12","equipo_id":"f_triple_locura","nombre":"Rosario Farias","fecha_nac":"2003-09-26","dni":"45267842"},
    # Unión Alta Gracia
    {"id":"f_uag_01","equipo_id":"f_union","nombre":"Anahi Pedernera","fecha_nac":"1989-02-27","dni":"34278218"},
    {"id":"f_uag_02","equipo_id":"f_union","nombre":"Carbajal Dinca","fecha_nac":"2006-04-11","dni":"47364554"},
    {"id":"f_uag_03","equipo_id":"f_union","nombre":"Godoy Rocio","fecha_nac":"2002-06-02","dni":"43808625"},
    {"id":"f_uag_04","equipo_id":"f_union","nombre":"Haberstock Florencia","fecha_nac":"1999-06-16","dni":"37439009"},
    {"id":"f_uag_05","equipo_id":"f_union","nombre":"Maggi Evelin","fecha_nac":"1984-01-30","dni":"30772002"},
    {"id":"f_uag_06","equipo_id":"f_union","nombre":"Pedernera Leticia","fecha_nac":"1985-12-18","dni":"32080122"},
    {"id":"f_uag_07","equipo_id":"f_union","nombre":"Serenelli Silvana","fecha_nac":"1974-09-07","dni":"23880500"},
    {"id":"f_uag_08","equipo_id":"f_union","nombre":"Benchat Darian","fecha_nac":"1996-12-02","dni":"39135029"},
    {"id":"f_uag_09","equipo_id":"f_union","nombre":"Mercader Ana Laura","fecha_nac":"1969-09-01","dni":"24471964"},
    {"id":"f_uag_10","equipo_id":"f_union","nombre":"Bencaht Daiana","fecha_nac":"1990-11-13","dni":"35288314"},
    {"id":"f_uag_11","equipo_id":"f_union","nombre":"Allende Maria Eugenia","fecha_nac":"1983-06-24","dni":"30309507"},
    {"id":"f_uag_12","equipo_id":"f_union","nombre":"Levitzky Noelia","fecha_nac":"1983-10-19","dni":"30729835"},
    {"id":"f_uag_13","equipo_id":"f_union","nombre":"Arce Mirta Alejandra","fecha_nac":"1972-04-09","dni":"22793216"},
    {"id":"f_uag_14","equipo_id":"f_union","nombre":"Cañas Maria Jose","fecha_nac":"1972-04-09","dni":"28133968"},
    {"id":"f_uag_15","equipo_id":"f_union","nombre":"Muñoz Sofia","fecha_nac":"1991-07-26","dni":"36101721"},
    {"id":"f_uag_16","equipo_id":"f_union","nombre":"Fassano Melina Abril","fecha_nac":"2003-07-08","dni":"44973880"},
    {"id":"f_uag_17","equipo_id":"f_union","nombre":"Sanchez Carla Gisele","fecha_nac":"1986-05-21","dni":"32281228"},
    {"id":"f_uag_18","equipo_id":"f_union","nombre":"Bustamante Lourdes Mirian","fecha_nac":"2008-02-10","dni":"48601134"},
    # Ferrobre
    {"id":"f_fer_01","equipo_id":"f_ferrobre","nombre":"Hernández Mariela Cristina","fecha_nac":"1974-04-15","dni":"23861526"},
    {"id":"f_fer_02","equipo_id":"f_ferrobre","nombre":"Valles Liliana Elizabeth","fecha_nac":"1973-03-10","dni":"23231268"},
    {"id":"f_fer_03","equipo_id":"f_ferrobre","nombre":"Brasca Paola Roxana","fecha_nac":"1973-03-05","dni":"23195923"},
    {"id":"f_fer_04","equipo_id":"f_ferrobre","nombre":"Valdivia Patricia Veronica","fecha_nac":"1978-11-21","dni":"27012837"},
    {"id":"f_fer_05","equipo_id":"f_ferrobre","nombre":"Motta Maria de los Angeles","fecha_nac":"1968-09-29","dni":"20326125"},
    {"id":"f_fer_06","equipo_id":"f_ferrobre","nombre":"Gonzalez Ivana Andrea","fecha_nac":"1978-03-11","dni":"26481784"},
    {"id":"f_fer_07","equipo_id":"f_ferrobre","nombre":"Roldan Laura Batriz","fecha_nac":"1978-03-03","dni":"26496308"},
    {"id":"f_fer_08","equipo_id":"f_ferrobre","nombre":"Plante Carolina","fecha_nac":"1977-06-02","dni":"26018723"},
    {"id":"f_fer_09","equipo_id":"f_ferrobre","nombre":"Torres Quinteros Chiara","fecha_nac":"2008-03-28","dni":"48719718"},
    {"id":"f_fer_10","equipo_id":"f_ferrobre","nombre":"Zapata Carola Beatriz","fecha_nac":"1970-09-21","dni":"21780505"},
    {"id":"f_fer_11","equipo_id":"f_ferrobre","nombre":"Garcia Natalia Rosario","fecha_nac":"1978-02-09","dni":"26744048"},
    {"id":"f_fer_12","equipo_id":"f_ferrobre","nombre":"Cornejo Analia Lorena","fecha_nac":"1978-05-28","dni":"26612538"},
    {"id":"f_fer_13","equipo_id":"f_ferrobre","nombre":"Nievas Francisca María Laura","fecha_nac":"1969-06-09","dni":"20656975"},
    {"id":"f_fer_14","equipo_id":"f_ferrobre","nombre":"Nievas Adriana Elizabeth","fecha_nac":"1971-02-28","dni":"21780823"},
    {"id":"f_fer_15","equipo_id":"f_ferrobre","nombre":"Plante Candela","fecha_nac":"2003-09-08","dni":"45087362"},
    {"id":"f_fer_16","equipo_id":"f_ferrobre","nombre":"Mallol Guadalupe","fecha_nac":"2002-12-18","dni":"44472179"},
    {"id":"f_fer_17","equipo_id":"f_ferrobre","nombre":"Toranzo Alicia Mabel","fecha_nac":"1974-03-12","dni":"23824154"},
    # Branca
    {"id":"f_bra_01","equipo_id":"f_branca","nombre":"Aguilar Martina","fecha_nac":"2006-01-11","dni":"46410479"},
    {"id":"f_bra_02","equipo_id":"f_branca","nombre":"D'Onofrio Camila","fecha_nac":"2004-01-24","dni":"45379310"},
    {"id":"f_bra_03","equipo_id":"f_branca","nombre":"Degiovanni Lidia","fecha_nac":None,"dni":None},
    {"id":"f_bra_04","equipo_id":"f_branca","nombre":"Delú Morena","fecha_nac":"2004-09-10","dni":"45797334"},
    {"id":"f_bra_05","equipo_id":"f_branca","nombre":"Elsezar Nahim","fecha_nac":"2006-04-22","dni":"47178532"},
    {"id":"f_bra_06","equipo_id":"f_branca","nombre":"Fusco Carmela","fecha_nac":"2007-09-14","dni":"48319116"},
    {"id":"f_bra_07","equipo_id":"f_branca","nombre":"Gette Virginia","fecha_nac":"2004-07-10","dni":"45882629"},
    {"id":"f_bra_08","equipo_id":"f_branca","nombre":"Gutiérrez Rosario","fecha_nac":"2004-10-06","dni":"45789562"},
    {"id":"f_bra_09","equipo_id":"f_branca","nombre":"Langhoff Lucrecia","fecha_nac":"2004-11-27","dni":"46320002"},
    {"id":"f_bra_10","equipo_id":"f_branca","nombre":"Lescano Keila","fecha_nac":"2004-01-13","dni":"45253184"},
    {"id":"f_bra_11","equipo_id":"f_branca","nombre":"Martinez Morena","fecha_nac":"2005-01-19","dni":"46320357"},
    {"id":"f_bra_12","equipo_id":"f_branca","nombre":"Morel Samira","fecha_nac":"2005-05-04","dni":"45793489"},
    {"id":"f_bra_13","equipo_id":"f_branca","nombre":"Pagasartundua Lucia","fecha_nac":"2004-03-01","dni":"45602332"},
    {"id":"f_bra_14","equipo_id":"f_branca","nombre":"Perez Julieta","fecha_nac":"2007-09-11","dni":"48207848"},
    {"id":"f_bra_15","equipo_id":"f_branca","nombre":"Perrig Dana","fecha_nac":"2005-11-30","dni":"46661487"},
    {"id":"f_bra_16","equipo_id":"f_branca","nombre":"Quiroz Ana","fecha_nac":"2005-05-18","dni":"46033323"},
    {"id":"f_bra_17","equipo_id":"f_branca","nombre":"Real Constanza","fecha_nac":"2005-02-21","dni":"46339670"},
    {"id":"f_bra_18","equipo_id":"f_branca","nombre":"Romera Julia","fecha_nac":None,"dni":"46613514"},
    {"id":"f_bra_19","equipo_id":"f_branca","nombre":"Silva Constanza","fecha_nac":"2005-10-27","dni":"46452782"},
    {"id":"f_bra_20","equipo_id":"f_branca","nombre":"Simioni Gina","fecha_nac":"2004-04-27","dni":"45260887"},
    {"id":"f_bra_21","equipo_id":"f_branca","nombre":"Tarifa Agustina","fecha_nac":"2004-09-28","dni":"45887092"},
    # El H
    {"id":"f_elh_01","equipo_id":"f_el_h","nombre":"Micaela Polanco","fecha_nac":"1988-11-01","dni":"34294758"},
    {"id":"f_elh_02","equipo_id":"f_el_h","nombre":"Delfina Francisquetti","fecha_nac":"1999-07-07","dni":"41815454"},
    {"id":"f_elh_03","equipo_id":"f_el_h","nombre":"Patricia Jimena Rivero","fecha_nac":"1980-08-14","dni":"29473801"},
    {"id":"f_elh_04","equipo_id":"f_el_h","nombre":"Sabrina Mallía","fecha_nac":"1995-06-17","dni":"38985249"},
    {"id":"f_elh_05","equipo_id":"f_el_h","nombre":"María Macarena Toral","fecha_nac":"1981-11-08","dni":"28943833"},
    {"id":"f_elh_06","equipo_id":"f_el_h","nombre":"Carolina Francisquetti","fecha_nac":"1992-08-23","dni":"36925226"},
    {"id":"f_elh_07","equipo_id":"f_el_h","nombre":"Julieta Moreno","fecha_nac":"1975-09-08","dni":"24615202"},
    {"id":"f_elh_08","equipo_id":"f_el_h","nombre":"María Sol Ángeles Síntora","fecha_nac":"1993-01-04","dni":"37193344"},
    {"id":"f_elh_09","equipo_id":"f_el_h","nombre":"Rocío Gisel García","fecha_nac":"1996-04-24","dni":"39584270"},
    {"id":"f_elh_10","equipo_id":"f_el_h","nombre":"Virginia Francisco","fecha_nac":"1982-10-05","dni":"30000577"},
    {"id":"f_elh_11","equipo_id":"f_el_h","nombre":"Belen Langhoff","fecha_nac":"1997-08-04","dni":"39942597"},
    {"id":"f_elh_12","equipo_id":"f_el_h","nombre":"Judith Artaza","fecha_nac":"1987-08-19","dni":"34959530"},
    {"id":"f_elh_13","equipo_id":"f_el_h","nombre":"Ines Casanova","fecha_nac":"1980-07-15","dni":"28426462"},
    {"id":"f_elh_14","equipo_id":"f_el_h","nombre":"Pamela Micori Chancalay","fecha_nac":None,"dni":"19010120"},
    {"id":"f_elh_15","equipo_id":"f_el_h","nombre":"Zabala María Laura","fecha_nac":"1985-04-17","dni":"31229429"},
    {"id":"f_elh_16","equipo_id":"f_el_h","nombre":"Jesica Noelia Escobar Vogel","fecha_nac":"2000-07-24","dni":"42515484"},
    # Piratas
    {"id":"f_pir_01","equipo_id":"f_piratas","nombre":"Melisa Ailen Reyes","fecha_nac":"1997-08-11","dni":"40410408"},
    {"id":"f_pir_02","equipo_id":"f_piratas","nombre":"Andrea Natali Pinto","fecha_nac":"1997-09-17","dni":"40441119"},
    {"id":"f_pir_03","equipo_id":"f_piratas","nombre":"Martina Peja Urquiza","fecha_nac":"2006-06-25","dni":"47300173"},
    {"id":"f_pir_04","equipo_id":"f_piratas","nombre":"Leila Daiana Chacano Lopez","fecha_nac":"2003-11-12","dni":"44955901"},
    {"id":"f_pir_05","equipo_id":"f_piratas","nombre":"Ornella Abril Vallejos","fecha_nac":"1999-06-18","dni":"42035655"},
    {"id":"f_pir_06","equipo_id":"f_piratas","nombre":"Dámary Toledo","fecha_nac":"1998-10-22","dni":"41306150"},
    {"id":"f_pir_07","equipo_id":"f_piratas","nombre":"Victoria Giunta Castro","fecha_nac":"2011-01-19","dni":"50630017"},
    {"id":"f_pir_08","equipo_id":"f_piratas","nombre":"Urbano Ailyn Florencia","fecha_nac":"1988-11-15","dni":"34221384"},
    {"id":"f_pir_09","equipo_id":"f_piratas","nombre":"Agustina Bustos Pérez","fecha_nac":"2008-07-30","dni":"48599220"},
    {"id":"f_pir_10","equipo_id":"f_piratas","nombre":"Emilia Fussi","fecha_nac":"2007-02-21","dni":"46765832"},
    {"id":"f_pir_11","equipo_id":"f_piratas","nombre":"Dana Jorgelina Aluatte Paulazo","fecha_nac":"2007-12-20","dni":"47582195"},
    {"id":"f_pir_12","equipo_id":"f_piratas","nombre":"María Agustina Llobell Sotti","fecha_nac":"2001-04-27","dni":"43368945"},
    {"id":"f_pir_13","equipo_id":"f_piratas","nombre":"Bárcena Luna Celeste","fecha_nac":"2011-08-29","dni":"51199611"},
    {"id":"f_pir_14","equipo_id":"f_piratas","nombre":"Julieta Noelia Orellano","fecha_nac":"1995-02-01","dni":"38793955"},
    {"id":"f_pir_15","equipo_id":"f_piratas","nombre":"Aviles Pilar Angelina","fecha_nac":"2006-11-20","dni":"47439939"},
    {"id":"f_pir_16","equipo_id":"f_piratas","nombre":"Sofia Daniela Pacheco","fecha_nac":"2000-02-26","dni":"39437301"},
    {"id":"f_pir_17","equipo_id":"f_piratas","nombre":"Lucía del Carmen Aparicio","fecha_nac":"2006-03-28","dni":"46791835"},
    {"id":"f_pir_18","equipo_id":"f_piratas","nombre":"Florencia Blanc","fecha_nac":"2006-05-05","dni":"47265084"},
    # Qaramtas
    {"id":"f_qar_01","equipo_id":"f_qaramtas","nombre":"Maria Susana Roggio","fecha_nac":"1982-09-03","dni":"29710405"},
    {"id":"f_qar_02","equipo_id":"f_qaramtas","nombre":"María Agustina Dalbene","fecha_nac":"1999-06-24","dni":"41357752"},
    {"id":"f_qar_03","equipo_id":"f_qaramtas","nombre":"Natasha Bonansea","fecha_nac":"1998-05-26","dni":"41264687"},
    {"id":"f_qar_04","equipo_id":"f_qaramtas","nombre":"Debora Mola","fecha_nac":"1989-12-20","dni":"34572994"},
    {"id":"f_qar_05","equipo_id":"f_qaramtas","nombre":"Agustina María Sol Aguirre","fecha_nac":"2003-06-21","dni":"44794576"},
    {"id":"f_qar_06","equipo_id":"f_qaramtas","nombre":"Lucia Ledesma","fecha_nac":"1998-11-26","dni":"41483638"},
    {"id":"f_qar_07","equipo_id":"f_qaramtas","nombre":"Maria Valentina Fara","fecha_nac":"1999-01-15","dni":"41440783"},
    {"id":"f_qar_08","equipo_id":"f_qaramtas","nombre":"María Victoria Moriconi","fecha_nac":"1988-12-22","dni":"34131250"},
    {"id":"f_qar_09","equipo_id":"f_qaramtas","nombre":"Alonso Ana Belén","fecha_nac":"1997-01-23","dni":"40237898"},
    {"id":"f_qar_10","equipo_id":"f_qaramtas","nombre":"Lucrecia Estigarribia","fecha_nac":"1984-06-13","dni":"31086042"},
    {"id":"f_qar_11","equipo_id":"f_qaramtas","nombre":"Rosa Dominguez","fecha_nac":"1990-09-13","dni":"35825611"},
    {"id":"f_qar_12","equipo_id":"f_qaramtas","nombre":"Gabriela Artazo","fecha_nac":"1985-05-20","dni":"31600529"},
    {"id":"f_qar_13","equipo_id":"f_qaramtas","nombre":"Carolina Marzini Irranca","fecha_nac":"1997-07-12","dni":"40405219"},
    {"id":"f_qar_14","equipo_id":"f_qaramtas","nombre":"Valeria Conte","fecha_nac":"1982-09-11","dni":"29710668"},
    {"id":"f_qar_15","equipo_id":"f_qaramtas","nombre":"Wendy Morales","fecha_nac":"1996-11-20","dni":"40681735"},
    {"id":"f_qar_16","equipo_id":"f_qaramtas","nombre":"Rocío Montamat","fecha_nac":"1987-11-09","dni":"33381374"},
    {"id":"f_qar_17","equipo_id":"f_qaramtas","nombre":"Yazmin Sotomayor Conte","fecha_nac":"2002-05-10","dni":"43996196"},
    {"id":"f_qar_18","equipo_id":"f_qaramtas","nombre":"Flavia Adrian","fecha_nac":"1984-12-19","dni":"31308233"},
    {"id":"f_qar_19","equipo_id":"f_qaramtas","nombre":"Victoria Alonso Ricca","fecha_nac":"2001-04-09","dni":"43299587"},
    {"id":"f_qar_20","equipo_id":"f_qaramtas","nombre":"Gretel Garcia Vello","fecha_nac":"2002-11-16","dni":"44606293"},
    {"id":"f_qar_21","equipo_id":"f_qaramtas","nombre":"Renata María Bonavita","fecha_nac":"2008-03-20","dni":"48465818"},
]

# ─── Helpers ───────────────────────────────────────────────────────────────────
def run_sql(sql):
    """Ejecuta SQL via Supabase Management API."""
    url  = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
    resp = requests.post(url,
        headers={
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "application/json",
        },
        json={"query": sql}
    )
    return resp

def upsert(table, data):
    url  = f"{REST_URL}/{table}"
    resp = requests.post(url, headers=HEADERS_REST, json=data)
    return resp.status_code in (200, 201, 204), resp.text[:200]

def banner(msg): print(f"\n{'─'*50}\n  {msg}\n{'─'*50}")

# ─── Main ──────────────────────────────────────────────────────────────────────
def main():
    banner("1/4  Creando tablas en Supabase")
    r = run_sql(CREATE_SQL)
    if r.status_code in (200, 201):
        print("  ✓ Tablas creadas / ya existían")
    else:
        print(f"  ✗ Error SQL ({r.status_code}): {r.text[:300]}")
        print("\n  → Alternativa: pegá create_tables.sql en Supabase SQL Editor y re-corré este script.")
        # No abortamos — intentamos el upsert igual por si las tablas ya existen

    banner("2/4  Cargando equipos")
    ok, err = upsert("equipos_femenino", EQUIPOS)
    if ok:
        print(f"  ✓ {len(EQUIPOS)} equipos")
    else:
        print(f"  ✗ {err}")
        sys.exit(1)

    banner("3/4  Cargando jugadoras")
    BATCH, total_ok = 50, 0
    for i in range(0, len(JUGADORAS), BATCH):
        batch = JUGADORAS[i:i+BATCH]
        ok, err = upsert("jugadoras_femenino", batch)
        if ok:
            total_ok += len(batch)
            print(f"  ✓ lote {i//BATCH+1}: {len(batch)} jugadoras")
        else:
            print(f"  ✗ lote {i//BATCH+1}: {err}")
    print(f"\n  Total: {total_ok}/{len(JUGADORAS)} jugadoras")

    banner("4/4  Generando .env")
    # Busca FrontEnd/ relativo a este script o al CWD
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(script_dir, "FrontEnd", ".env"),
        os.path.join(script_dir, ".env"),
        os.path.join(os.getcwd(), "FrontEnd", ".env"),
    ]
    env_path = next((p for p in candidates if os.path.isdir(os.path.dirname(p))), candidates[0])
    env_content = f"""# Supabase — Torneo Star Básquet
VITE_SUPABASE_URL={SUPABASE_URL}
VITE_SUPABASE_ANON_KEY={ANON_KEY}

# Dejá VITE_API_URL vacío hasta que tengas un backend propio
VITE_API_URL=
"""
    with open(env_path, "w") as f:
        f.write(env_content)
    print(f"  ✓ .env generado en: {env_path}")

    banner("¡Todo listo!")
    print("""  Próximos pasos:
  1. cd torneoStarBasquet/FrontEnd && npm run dev
  2. Verificá en Supabase → Table Editor que las tablas tienen datos
  3. Cuando el backend esté listo, configurá VITE_API_URL en .env
""")

if __name__ == "__main__":
    main()
