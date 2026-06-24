"""
insertar_f1_p2_piratas_elh.py
==============================
Fecha 1 — Partido 2: Piratas 25 vs El H 41
Horario: 12:15 hs
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

print("=" * 60)
print("  Fecha 1 — Partido 2: Piratas vs El H")
print("=" * 60)

# ─── 1. Fecha 1 ya existe con ID=1 ───────────────────────────────────────────
print("\n📅 Usando Fecha 1 (ID=1)...")
fecha_id = 1
print(f"  ✅ Fecha 1 → ID {fecha_id}")

# ─── 2. Insertar partido ──────────────────────────────────────────────────────
# Scores acumulados Excel → parciales:
# Piratas: 4 | 9-4=5 | 19-9=10 | 25-19=6  → 4+5+10+6 = 25 ✅
# El H:   11 | 20-11=9 | 28-20=8 | 41-28=13 → 11+9+8+13 = 41 ✅
print("\n🏀 Insertando partido Piratas vs El H...")
res = post_ret("partidos_femenino", {
    "fecha_id":        fecha_id,
    "equipo_local_id": "f_piratas",
    "equipo_visit_id": "f_el_h",
    "q1_local": 4,  "q2_local": 5,  "q3_local": 10, "q4_local": 6,  "ot_local": 0,
    "q1_visit": 11, "q2_visit": 9,  "q3_visit": 8,  "q4_visit": 13, "ot_visit": 0,
    "pct_simples_local": 29, "pct_dobles_local": 24, "pct_triples_local": 5,
    "pct_simples_visit": 36, "pct_dobles_visit": 24, "pct_triples_visit": 20,
    "estado": "finalizado",
    "hora_inicio": "12:15:00",
})
partido_id = res[0]["id"]
print(f"  ✅ Partido ID {partido_id} — Piratas 25 vs El H 41")

# ─── 3. Stats jugadoras ───────────────────────────────────────────────────────
# formato: jugadora_id, equipo_id, nro, sc,sf, dc,df, tc,tf, as_,rd,ro, fp,ft,fa, rb,tp,pe, ca, pts, val
# PTS = sc*1 + dc*2 + tc*3
# VAL = pts + rd + ro + as_ + rb + tp - (sf+df+tf) - pe - fa

def calc_pts(sc, dc, tc):
    return sc + dc*2 + tc*3

def calc_val(sc,sf,dc,df,tc,tf,as_,rd,ro,fp,ft,fa,rb,tp,pe,ca,pts):
    return pts + rd + ro + as_ + rb + tp - (sf + df + tf) - pe - fa

# EL H
elh = [
    # jid,          eqid,     nro, sc,sf, dc, df, tc,tf, as_,rd,ro, fp,ft,fa, rb,tp,pe, ca
    ("f_elh_05","f_el_h", 14,  0,0,  2, 1,  0, 1,   0, 5, 2,  1, 0, 0,   1, 0, 1,  0),  # Toral
    ("f_elh_14","f_el_h",  4,  1,1,  1, 7,  0, 0,   1, 2, 0,  1, 0, 0,   0, 0, 0,  0),  # Micori
    ("f_elh_07","f_el_h",  6,  0,0,  0, 2,  2, 2,   1, 7, 0,  1, 0, 0,   0, 0, 1,  0),  # Moreno
    ("f_elh_04","f_el_h", 12,  0,0,  0, 1,  0, 2,   0, 1, 0,  0, 0, 0,   1, 0, 1,  0),  # Mallia
    ("f_elh_11","f_el_h", 10,  0,0,  0, 3,  0, 0,   2, 7, 0,  1, 0, 0,   0, 0, 0,  0),  # Langhoff
    ("f_elh_15","f_el_h",  8,  1,4,  4, 2,  0, 0,   0, 4, 2,  2, 0, 0,   2, 0, 1,  0),  # Zabala
    ("f_elh_08","f_el_h", 11,  0,0,  0, 0,  0, 0,   1, 0, 0,  2, 0, 0,   0, 0, 1,  0),  # Síntora
    ("f_elh_10","f_el_h",  5,  0,0,  0, 0,  0, 0,   1, 1, 1,  0, 0, 0,   0, 1, 0,  0),  # Francisco
    ("f_elh_02","f_el_h",  7,  0,0,  3, 1,  0, 2,   4, 1, 0,  1, 0, 0,   2, 0, 0,  0),  # Franciscquetti D
    ("f_elh_01","f_el_h", 13,  0,0,  2, 2,  0, 2,   0, 3, 1,  0, 0, 0,   0, 0, 0,  0),  # Polanco
    ("f_elh_09","f_el_h", 15,  2,2,  2, 3,  0, 1,   1, 3, 0,  0, 0, 0,   2, 0, 1,  0),  # Garcia
    ("f_elh_06","f_el_h",  9,  0,0,  0, 5,  1, 2,   3, 2, 2,  0, 0, 0,   2, 0, 0,  0),  # Franciscquetti C
]

# PIRATAS
pir = [
    # jid,           eqid,       nro, sc,sf, dc, df, tc, tf, as_,rd,ro, fp,ft,fa, rb,tp,pe, ca
    ("f_pir_07","f_piratas",  1,  0,0,  0, 3,  0,  1,   0, 1, 0,  0, 0, 0,   0, 0, 0,  0),  # Giunta
    ("f_pir_05","f_piratas",  5,  0,2,  1, 6,  0,  3,   0, 5, 2,  1, 0, 0,   1, 0, 1,  0),  # Vallejos
    ("f_pir_02","f_piratas",  6,  0,0,  1, 0,  1, 10,   1, 9, 3,  2, 0, 0,   3, 3, 2,  0),  # Pinto
    ("f_pir_04","f_piratas",  7,  0,0,  0, 4,  0,  0,   0, 1, 1,  2, 0, 0,   0, 1, 1,  0),  # Chacano
    ("f_pir_09","f_piratas",  9,  0,0,  0, 2,  0,  0,   0, 1, 0,  0, 0, 0,   0, 0, 0,  0),  # Bustos
    ("f_pir_13","f_piratas", 11,  0,0,  0, 5,  0,  0,   0, 0, 0,  2, 0, 0,   0, 0, 0,  0),  # Barcena
    ("f_pir_03","f_piratas", 13,  2,3,  6, 4,  0,  1,   1, 8, 3,  3, 0, 0,   2, 3, 0,  0),  # Peja
    ("f_pir_01","f_piratas", 14,  0,0,  1, 3,  0,  2,   1, 2, 1,  1, 0, 0,   2, 0, 1,  0),  # Reyes
    ("f_pir_06","f_piratas", 24,  0,0,  1, 4,  0,  1,   1, 1, 1,  0, 0, 0,   0, 0, 1,  0),  # Toledo
]

STATS_RAW = elh + pir

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

# Mostrar resumen antes de insertar
print("\n  Resumen de puntos calculados:")
for r2 in rows:
    print(f"    {r2['jugadora_id']} ({r2['equipo_id']}): PTS={r2['pts']} VAL={r2['val']}")

post_min("stats_partido_femenino", rows)
print(f"\n  ✅ {len(rows)} jugadoras insertadas")

# ─── 4. MVP ───────────────────────────────────────────────────────────────────
print("\n⭐ MVP: Martina Peja Urquiza (f_pir_03)...")
patch("partidos_femenino", f"id=eq.{partido_id}", {"mvp_jugadora_id": "f_pir_03"})
print("  ✅ MVP guardado")

# ─── 5. Recalcular promedios via SQL directo ──────────────────────────────────
print("\n🔄 Recalculando promedios en estadisticas_femenino...")

# Usamos RPC o SQL via endpoint — en este caso recalculamos via Python
# leyendo stats_partido_femenino de cada jugadora
jugadoras_ids = [s[0] for s in STATS_RAW]

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

        # PATCH directo si existe, INSERT si no — evita el problema del upsert
        existing = get("estadisticas_femenino", f"jugadora_id=eq.{jug_id}&select=id")
        if existing:
            rec_id = existing[0]["id"]
            r2 = requests.patch(
                f"{SUPABASE_URL}/estadisticas_femenino?id=eq.{rec_id}",
                headers=H_MIN, json=payload
            )
            if r2.status_code not in (200,201,204):
                raise Exception(f"PATCH: {r2.status_code} {r2.text[:300]}")
            print(f"  ✅ {jug_id}: PJ={k} PTS={payload['pts_prom']} REB={payload['reb_prom']} VAL={payload['val_prom']} [actualizado]")
        else:
            r2 = requests.post(
                f"{SUPABASE_URL}/estadisticas_femenino",
                headers=H_MIN, json=payload
            )
            if r2.status_code not in (200,201,204):
                raise Exception(f"INSERT: {r2.status_code} {r2.text[:300]}")
            print(f"  ✅ {jug_id}: PJ={k} PTS={payload['pts_prom']} REB={payload['reb_prom']} VAL={payload['val_prom']} [nuevo]")

    except Exception as e:
        print(f"  ❌ {jug_id}: {e}")
        errores.append(jug_id)

print()
if not errores:
    print("🎉 Fecha 1 - Partido 2 cargado exitosamente.")
    print("   Piratas 25 (Q1=4 Q2=5 Q3=10 Q4=6) vs El H 41 (Q1=11 Q2=9 Q3=8 Q4=13)")
    print("   MVP: Martina Peja Urquiza")
else:
    print(f"⚠️  Completado con {len(errores)} errores: {errores}")
