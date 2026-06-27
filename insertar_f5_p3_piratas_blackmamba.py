"""
insertar_f5_p3_piratas_blackmamba.py
======================================
Fecha 5 — Partido 3: Piratas 39 vs Black Mamba 33
Horario: 13:20 hs — CON TIEMPO EXTRA (OT)
MVP: Martina Peja (f_pir_03) - VAL 29
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
print("  Fecha 5 — Partido 3: Piratas vs Black Mamba (OT)")
print("=" * 60)

# ─── 1. Obtener Fecha 5 ───────────────────────────────────────────────────────
print("\n📅 Obteniendo Fecha 5...")
fechas = get("fechas_femenino", "numero=eq.5&select=id")
if not fechas:
    raise Exception("Fecha 5 no encontrada")
fecha_id = fechas[0]["id"]
print(f"  ✅ Fecha 5 → ID {fecha_id}")

# ─── 2. Insertar partido ──────────────────────────────────────────────────────
# Scores acumulados → parciales:
# Piratas:     Q1=8  | Q2=20-8=12  | Q3=26-20=6 | Q4=33-26=7 | OT=39-33=6 → 39 ✅
# Black Mamba: Q1=15 | Q2=20-15=5  | Q3=23-20=3 | Q4=33-23=10| OT=0       → 33 ✅
print("\n🏀 Insertando partido Piratas vs Black Mamba (con OT)...")
res = post_ret("partidos_femenino", {
    "fecha_id":        fecha_id,
    "equipo_local_id": "f_piratas",
    "equipo_visit_id": "f_black_mamba",
    "q1_local": 8,  "q2_local": 12, "q3_local": 6,  "q4_local": 7,  "ot_local": 6,
    "q1_visit": 15, "q2_visit": 5,  "q3_visit": 3,  "q4_visit": 10, "ot_visit": 0,
    "pct_simples_local": 27, "pct_dobles_local": 24, "pct_triples_local": 20,
    "pct_simples_visit": 45, "pct_dobles_visit": 52, "pct_triples_visit": 24,
    "estado": "finalizado",
    "hora_inicio": "13:20:00",
})
partido_id = res[0]["id"]
print(f"  ✅ Partido ID {partido_id} — Piratas 39 vs Black Mamba 33 (OT)")

# ─── 3. Stats jugadoras ───────────────────────────────────────────────────────
# PIRATAS
pir = [
    ("f_pir_01","f_piratas",  8,  0,0,  0,1,  0,1,  1, 0,3,  1,0,0,  0,0,0,  0),  # Reyes
    ("f_pir_06","f_piratas",  3,  0,4,  1,9,  0,0,  0, 1,2,  1,0,0,  2,0,0,  0),  # Toledo
    ("f_pir_05","f_piratas",  5,  0,0,  3,7,  1,3,  2, 5,3,  2,0,0,  0,0,2,  0),  # Vallejos
    ("f_pir_03","f_piratas", 11,  1,3,  4,1,  2,1,  0, 6,7,  3,0,0,  4,2,0,  0),  # Peja MVP
    ("f_pir_04","f_piratas", 12,  0,0,  0,1,  0,0,  0, 2,1,  0,0,0,  0,1,0,  0),  # Lopez/Chacano
    ("f_pir_08","f_piratas", 13,  0,0,  0,2,  0,0,  2, 0,0,  2,0,0,  0,0,1,  0),  # Urbano
    ("f_pir_09","f_piratas",  9,  0,0,  0,0,  0,0,  0, 0,0,  0,0,0,  0,0,0,  0),  # Bustos
    ("f_pir_02","f_piratas",  6,  1,0,  2,11, 0,6,  1, 4,2,  0,0,0,  3,1,0,  0),  # Pinto
    ("f_pir_16","f_piratas",  4,  0,4,  1,7,  0,1,  1, 4,1,  1,0,0,  5,0,2,  0),  # Pacheco
    ("f_pir_17","f_piratas", 15,  2,0,  2,2,  0,0,  1, 0,0,  0,0,0,  0,0,0,  0),  # Aparicio
]

# BLACK MAMBA
bm = [
    ("f_bm_05","f_black_mamba",  1,  0,0,  1,2,  1,0,  0, 0,0,  1,0,0,  0,0,1,  0),  # Quevedo
    ("f_bm_07","f_black_mamba",  4,  0,0,  0,0,  0,0,  0, 1,1,  1,0,0,  0,0,0,  0),  # Caminos
    ("f_bm_09","f_black_mamba",  5,  0,2,  1,1,  0,0,  2, 8,4,  4,0,0,  2,3,0,  0),  # Sanchez
    ("f_bm_08","f_black_mamba",  6,  0,0,  1,1,  2,6,  1, 4,0,  2,0,0,  1,0,1,  0),  # Bernardi Lucia
    ("f_bm_06","f_black_mamba",  7,  5,2,  4,6,  0,1,  4, 0,1,  1,0,0,  1,0,3,  0),  # Palacios
    ("f_bm_02","f_black_mamba",  8,  0,0,  0,0,  0,0,  0, 1,0,  0,0,0,  1,0,0,  0),  # Farragut
    ("f_bm_01","f_black_mamba", 11,  0,0,  1,4,  0,2,  1,10,2,  3,0,0,  0,0,1,  0),  # Hanisch
    ("f_bm_13","f_black_mamba", 14,  0,2,  0,3,  1,4,  0, 0,0,  1,0,0,  1,0,1,  0),  # Piccardini
    ("f_bm_03","f_black_mamba", 17,  0,0,  0,0,  0,0,  0, 1,0,  2,0,0,  0,0,0,  0),  # Ordoñez
    ("f_bm_04","f_black_mamba", 24,  0,0,  0,0,  0,0,  1, 3,0,  0,0,0,  1,0,0,  0),  # Muela
]

STATS_RAW = pir + bm

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
    print("🎉 Fecha 5 - Partido 3 cargado exitosamente.")
    print("   Piratas 39 (Q1=8 Q2=12 Q3=6 Q4=7 OT=6) vs Black Mamba 33 (Q1=15 Q2=5 Q3=3 Q4=10 OT=0)")
    print("   MVP: Martina Peja")
else:
    print(f"⚠️  Completado con {len(errores)} errores: {errores}")
