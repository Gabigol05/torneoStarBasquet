"""
insertar_f3_p1_artigas_piratas.py
====================================
Fecha 3 — Partido 1: Artigas 26 vs Piratas 37
Horario: 11:00 hs
MVP: Martina Peja (f_pir_03) - VAL 18
"""

import requests

SUPABASE_URL = "https://weveobptegokulxsqsuf.supabase.co/rest/v1"
SERVICE_KEY  = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndldmVvYnB0ZWdva3VseHNxc3VmIiwicm9sZSI"
    "6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTEyODI1OCwiZXhwIjoyMDk2NzA0MjU4fQ"
    ".t8WMPJpnG5vOJPHpzTrwBOjZxdZ_IOjAWabt2ECqQOg"
)

H     = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}",
          "Content-Type": "application/json", "Prefer": "return=representation"}
H_MIN = {**H, "Prefer": "return=minimal"}

def get(table, query=""):
    r = requests.get(f"{SUPABASE_URL}/{table}?{query}", headers=H)
    if r.status_code != 200:
        raise Exception(f"GET {table}: {r.status_code} {r.text[:400]}")
    return r.json()

def post_ret(table, data):
    r = requests.post(f"{SUPABASE_URL}/{table}", headers=H, json=data)
    if r.status_code not in (200, 201):
        raise Exception(f"POST {table}: {r.status_code} {r.text[:400]}")
    return r.json()

def post_min(table, data):
    r = requests.post(f"{SUPABASE_URL}/{table}", headers=H_MIN, json=data)
    if r.status_code not in (200, 201, 204):
        raise Exception(f"POST {table}: {r.status_code} {r.text[:400]}")

def patch(table, query, data):
    r = requests.patch(f"{SUPABASE_URL}/{table}?{query}", headers=H_MIN, json=data)
    if r.status_code not in (200, 201, 204):
        raise Exception(f"PATCH {table}: {r.status_code} {r.text[:400]}")

def calc_pts(sc, dc, tc):
    return sc + dc*2 + tc*3

def calc_val(sc,sf,dc,df,tc,tf,as_,rd,ro,fp,ft,fa,rb,tp,pe,ca,pts):
    return pts + rd + ro + as_ + rb + tp - (sf + df + tf) - pe - fa

print("=" * 60)
print("  Fecha 3 — Partido 1: Artigas vs Piratas")
print("=" * 60)

# ─── 1. Crear Fecha 3 ────────────────────────────────────────────────────────
print("\n📅 Creando Fecha 3...")
res = post_ret("fechas_femenino", {"numero": 3, "descripcion": "Fecha 3"})
fecha_id = res[0]["id"]
print(f"  ✅ Fecha 3 → ID {fecha_id}")

# ─── 2. Insertar partido ─────────────────────────────────────────────────────
# Scores acumulados → parciales:
# Artigas: Q1=5  | Q2=16-5=11  | Q3=21-16=5  | Q4=26-21=5  → 5+11+5+5=26  ✅
# Piratas: Q1=12 | Q2=22-12=10 | Q3=27-22=5  | Q4=37-27=10 → 12+10+5+10=37 ✅
print("\n🏀 Insertando partido Artigas vs Piratas...")
res = post_ret("partidos_femenino", {
    "fecha_id":        fecha_id,
    "equipo_local_id": "f_artigas",
    "equipo_visit_id": "f_piratas",
    "q1_local": 5,  "q2_local": 11, "q3_local": 5,  "q4_local": 5,  "ot_local": 0,
    "q1_visit": 12, "q2_visit": 10, "q3_visit": 5,  "q4_visit": 10, "ot_visit": 0,
    "pct_simples_local": 19, "pct_dobles_local": 21, "pct_triples_local": 27,
    "pct_simples_visit": 35, "pct_dobles_visit": 19, "pct_triples_visit": 19,
    "estado": "finalizado",
    "hora_inicio": "11:00:00",
})
partido_id = res[0]["id"]
print(f"  ✅ Partido ID {partido_id} — Artigas 26 vs Piratas 37")

# ─── 3. Stats jugadoras ───────────────────────────────────────────────────────
# ARTIGAS
art = [
    ("f_art_11","f_artigas", 14,  1,1,  1,0,  0,0,  0, 2,1,  2,0,0,  1,0,0,  0),  # Seia
    ("f_art_09","f_artigas", 13,  0,2,  0,3,  0,0,  0, 5,4,  1,0,0,  1,2,0,  0),  # Monte
    ("f_art_05","f_artigas",  1,  0,0,  1,2,  0,3,  1, 1,0,  1,0,0,  0,0,1,  0),  # Dagna
    ("f_art_01","f_artigas", 19,  0,0,  0,1,  0,0,  1, 0,0,  3,0,0,  1,0,0,  0),  # Sotelino
    ("f_art_14","f_artigas", 35,  0,0,  1,1,  0,0,  0, 2,0,  0,0,0,  2,0,0,  0),  # Lopez Carolina
    ("f_art_10","f_artigas", 25,  0,8,  0,8,  0,0,  1, 0,2,  2,0,0,  3,1,0,  0),  # Caceres
    ("f_art_02","f_artigas", 12,  0,0,  0,0,  0,1,  0, 4,0,  1,0,0,  0,0,0,  0),  # Morales
    ("f_art_21","f_artigas",  6,  0,0,  0,0,  0,1,  1, 0,0,  0,0,0,  0,0,0,  0),  # Godoy M
    ("f_art_13","f_artigas", 16,  0,0,  3,0,  0,0,  0, 0,0,  3,0,0,  0,0,0,  0),  # Lopez Agustina
    ("f_art_07","f_artigas", 26,  0,0,  0,3,  1,0,  0, 2,2,  3,0,0,  0,0,1,  0),  # Cinalli
    ("f_art_06","f_artigas", 43,  2,0,  1,5,  1,3,  0, 2,0,  2,0,0,  0,0,0,  0),  # Del Sacramento
    ("f_art_19","f_artigas",  2,  0,2,  0,3,  1,0,  0, 1,0,  1,0,0,  3,0,0,  0),  # Galfrascoli
]

# PIRATAS
pir = [
    ("f_pir_01","f_piratas",  8,  0,2,  2,3,  0,3,  4, 0,4,  1,0,0,  1,0,0,  0),  # Reyes M
    ("f_pir_06","f_piratas",  3,  0,0,  1,4,  0,0,  1, 2,2,  1,0,0,  1,0,2,  0),  # Toledo Damary
    ("f_pir_05","f_piratas",  4,  1,1,  0,6,  0,2,  2, 4,2,  1,0,0,  0,0,0,  0),  # Vallejos
    ("f_pir_03","f_piratas", 11,  3,5,  4,4,  0,1,  1, 8,4,  3,0,0,  4,0,0,  0),  # Peja MVP
    ("f_pir_04","f_piratas",  7,  0,0,  0,0,  0,0,  0, 0,0,  1,0,0,  0,0,0,  0),  # Chacano/Lopez Leila
    ("f_pir_08","f_piratas", 15,  1,0,  2,3,  0,0,  0, 2,2,  2,0,0,  1,0,0,  0),  # Urbano
    ("f_pir_11","f_piratas", 29,  0,0,  0,0,  0,0,  0, 0,0,  0,0,0,  0,0,0,  0),  # Aluatte
    ("f_pir_07","f_piratas",  1,  0,2,  0,0,  0,1,  0, 0,0,  0,0,0,  0,0,0,  0),  # Giunta
    ("f_pir_09","f_piratas",  9,  0,0,  0,1,  0,0,  2, 0,0,  0,0,0,  1,0,1,  0),  # Bustos
    ("f_pir_02","f_piratas",  6,  1,1,  2,4,  3,6,  0, 6,0,  3,0,0,  4,0,1,  0),  # Pinto
]

STATS_RAW = art + pir

print(f"\n📊 Insertando stats ({len(STATS_RAW)} jugadoras)...")
rows = []
for s in STATS_RAW:
    jid,eqid,nro,sc,sf,dc,df,tc,tf,as_,rd,ro,fp,ft,fa,rb,tp,pe,ca = s
    pts = calc_pts(sc, dc, tc)
    val = calc_val(sc,sf,dc,df,tc,tf,as_,rd,ro,fp,ft,fa,rb,tp,pe,ca,pts)
    rows.append({
        "partido_id": partido_id, "jugadora_id": jid, "equipo_id": eqid,
        "numero": nro,
        "sc":sc,"sf":sf,"dc":dc,"df":df,"tc":tc,"tf":tf,
        "as_":as_,"rd":rd,"ro":ro,"fp":fp,"ft":ft,"fa":fa,
        "rb":rb,"tp":tp,"pe":pe,"ca":ca,
        "pts":pts,"val":val,
    })

print("\n  Resumen puntos calculados:")
for r2 in rows:
    print(f"    {r2['jugadora_id']}: PTS={r2['pts']} VAL={r2['val']}")

post_min("stats_partido_femenino", rows)
print(f"\n  ✅ {len(rows)} jugadoras insertadas")

# ─── 4. MVP ───────────────────────────────────────────────────────────────────
print("\n⭐ MVP: Martina Peja (f_pir_03)...")
patch("partidos_femenino", f"id=eq.{partido_id}", {"mvp_jugadora_id": "f_pir_03"})
print("  ✅ MVP guardado")

# ─── 5. Recalcular promedios ──────────────────────────────────────────────────
print("\n🔄 Recalculando promedios...")
jugadoras_ids = list(set(s[0] for s in STATS_RAW))
errores = []

for jug_id in jugadoras_ids:
    try:
        filas = get(
            "stats_partido_femenino",
            f"jugadora_id=eq.{jug_id}"
            "&select=pts,rd,ro,as_,rb,tp,pe,val,sc,sf,dc,df,tc,tf"
        )
        if not filas:
            print(f"  ⚠️  {jug_id}: sin datos")
            continue

        k = len(filas)
        def sm(key): return sum(x.get(key) or 0 for x in filas)

        tsc,tsf = sm('sc'),sm('sf')
        tdc,tdf = sm('dc'),sm('df')
        ttc,ttf = sm('tc'),sm('tf')
        t_rd,t_ro = sm('rd'),sm('ro')

        payload = {
            "jugadora_id": jug_id,
            "pj": k,
            "pts_prom":  round(sm('pts')/k, 1),
            "reb_prom":  round((t_rd+t_ro)/k, 1),
            "ast_prom":  round(sm('as_')/k, 1),
            "rob_prom":  round(sm('rb')/k, 1),
            "tap_prom":  round(sm('tp')/k, 1),
            "per_prom":  round(sm('pe')/k, 1),
            "val_prom":  round(sm('val')/k, 1),
            "pct_simples": round(tsc/(tsc+tsf)*100,1) if (tsc+tsf)>0 else 0,
            "pct_dobles":  round(tdc/(tdc+tdf)*100,1) if (tdc+tdf)>0 else 0,
            "pct_triples": round(ttc/(ttc+ttf)*100,1) if (ttc+ttf)>0 else 0,
            "pts_total": sm('pts'), "reb_total": t_rd+t_ro, "ast_total": sm('as_'),
            "mejor_pts": max(x.get('pts') or 0 for x in filas),
            "sc_total":tsc,"sf_total":tsf,"dc_total":tdc,"df_total":tdf,
            "tc_total":ttc,"tf_total":ttf,
            "sc_prom": round(tsc/k,1),"dc_prom": round(tdc/k,1),"tc_prom": round(ttc/k,1),
        }

        existing = get("estadisticas_femenino", f"jugadora_id=eq.{jug_id}&select=id")
        if existing:
            rec_id = existing[0]["id"]
            r2 = requests.patch(
                f"{SUPABASE_URL}/estadisticas_femenino?id=eq.{rec_id}",
                headers=H_MIN, json=payload
            )
            if r2.status_code not in (200,201,204):
                raise Exception(f"PATCH: {r2.status_code} {r2.text[:300]}")
            print(f"  ✅ {jug_id}: PJ={k} PTS={payload['pts_prom']} VAL={payload['val_prom']} [actualizado]")
        else:
            r2 = requests.post(
                f"{SUPABASE_URL}/estadisticas_femenino",
                headers=H_MIN, json=payload
            )
            if r2.status_code not in (200,201,204):
                raise Exception(f"INSERT: {r2.status_code} {r2.text[:300]}")
            print(f"  ✅ {jug_id}: PJ={k} PTS={payload['pts_prom']} VAL={payload['val_prom']} [nuevo]")

    except Exception as e:
        print(f"  ❌ {jug_id}: {e}")
        errores.append(jug_id)

print()
if not errores:
    print("🎉 Fecha 3 - Partido 1 cargado exitosamente.")
    print("   Artigas 26 (Q1=5 Q2=11 Q3=5 Q4=5) vs Piratas 37 (Q1=12 Q2=10 Q3=5 Q4=10)")
    print("   MVP: Martina Peja")
else:
    print(f"⚠️  Completado con {len(errores)} errores: {errores}")
