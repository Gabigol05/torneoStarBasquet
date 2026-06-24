"""
insertar_f1_p5_union_triplelocura.py
=====================================
Fecha 1 — Partido 5: Union 19 vs Triple Locura 51
Horario: 16:00 hs
MVP: Sol Gimena Sanchez (f_tl_03)
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
print("  Fecha 1 — Partido 5: Union vs Triple Locura")
print("=" * 60)

# ─── 1. Fecha 1 ya existe con ID=1 ───────────────────────────────────────────
print("\n📅 Usando Fecha 1 (ID=1)...")
fecha_id = 1
print(f"  ✅ Fecha 1 → ID {fecha_id}")

# ─── 2. Insertar partido ──────────────────────────────────────────────────────
# Scores acumulados → parciales:
# Union:         Q1=0  | Q2=6-0=6   | Q3=13-6=7   | Q4=19-13=6  → 0+6+7+6=19  ✅
# Triple Locura: Q1=6  | Q2=24-6=18 | Q3=39-24=15 | Q4=51-39=12 → 6+18+15+12=51 ✅
print("\n🏀 Insertando partido Union vs Triple Locura...")
res = post_ret("partidos_femenino", {
    "fecha_id":        fecha_id,
    "equipo_local_id": "f_union",
    "equipo_visit_id": "f_triple_locura",
    "q1_local": 0,  "q2_local": 6,  "q3_local": 7,  "q4_local": 6,  "ot_local": 0,
    "q1_visit": 6,  "q2_visit": 18, "q3_visit": 15, "q4_visit": 12, "ot_visit": 0,
    "pct_simples_local": 25, "pct_dobles_local": 27, "pct_triples_local": 0,
    "pct_simples_visit": 40, "pct_dobles_visit": 20, "pct_triples_visit": 14,
    "estado": "finalizado",
    "hora_inicio": "16:00:00",
})
partido_id = res[0]["id"]
print(f"  ✅ Partido ID {partido_id} — Union 19 vs Triple Locura 51")

# ─── 3. Stats jugadoras ───────────────────────────────────────────────────────
# formato: jugadora_id, equipo_id, nro, sc,sf, dc,df, tc,tf, as_,rd,ro, fp,ft,fa, rb,tp,pe, ca

# TRIPLE LOCURA
tl = [
    ("f_tl_01","f_triple_locura",  1,  0,1,  2,4,  1,3,  2, 4,1,  1,0,0,  5,2,0,  0),  # Carnielli
    ("f_tl_09","f_triple_locura",  7,  0,0,  4,2,  0,2,  1, 2,0,  0,0,0,  1,0,0,  0),  # Vega
    ("f_tl_04","f_triple_locura", 10,  1,1,  5,7,  0,7,  2, 5,1,  1,0,0,  2,1,2,  0),  # Weinbender
    ("f_tl_03","f_triple_locura", 11,  0,2,  4,6,  2,3,  2, 3,2,  2,0,0,  6,0,0,  0),  # Sanchez Sol MVP
    ("f_tl_08","f_triple_locura", 15,  3,2,  3,2,  0,0,  0, 3,3,  0,0,0,  3,0,0,  0),  # Pinedo
    ("f_tl_02","f_triple_locura", 77,  0,0,  0,2,  0,2,  4, 5,0,  1,0,0,  2,0,0,  0),  # Ortega
]

# UNION
uag = [
    ("f_uag_04","f_union", 13,  0,0,  1,4,  0,1,  0, 2,2,  0,0,0,  1,0,1,  0),  # Haberstock
    ("f_uag_08","f_union", 15,  0,2,  1,1,  0,0,  1, 4,1,  4,0,0,  0,0,1,  0),  # Benchat Dariana
    ("f_uag_10","f_union",  5,  0,0,  0,10, 0,0,  1,12,1,  2,0,0,  4,0,2,  0),  # Benchat Daisy
    ("f_uag_13","f_union", 11,  0,0,  1,1,  0,1,  2, 1,0,  0,0,0,  0,0,1,  0),  # Arce
    ("f_uag_15","f_union",  7,  0,0,  1,2,  0,2,  0, 5,1,  0,0,0,  2,0,1,  0),  # Muñoz
    ("f_uag_01","f_union",  8,  0,0,  0,0,  0,3,  0, 0,0,  1,0,0,  1,0,1,  0),  # Pedernera
    ("f_uag_17","f_union", 10,  0,0,  0,2,  0,1,  1, 3,1,  0,0,0,  0,0,0,  0),  # Sanchez
    ("f_uag_05","f_union", 17,  1,1,  5,4,  0,0,  1, 3,0,  1,0,0,  0,0,2,  0),  # Maggi
    ("f_uag_12","f_union", 27,  0,0,  0,0,  0,0,  0, 1,2,  0,0,0,  0,0,0,  0),  # Levitzky
    ("f_uag_16","f_union",  3,  0,0,  0,0,  0,0,  0, 0,0,  0,0,0,  1,0,0,  0),  # Fassano
]

STATS_RAW = tl + uag

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
print("\n⭐ MVP: Sol Gimena Sanchez (f_tl_03)...")
patch("partidos_femenino", f"id=eq.{partido_id}", {"mvp_jugadora_id": "f_tl_03"})
print("  ✅ MVP guardado")

# ─── 5. Recalcular promedios ──────────────────────────────────────────────────
print("\n🔄 Recalculando promedios...")
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
    print("🎉 Fecha 1 - Partido 5 cargado exitosamente.")
    print("   Union 19 (Q1=0 Q2=6 Q3=7 Q4=6) vs Triple Locura 51 (Q1=6 Q2=18 Q3=15 Q4=12)")
    print("   MVP: Sol Gimena Sanchez")
else:
    print(f"⚠️  Completado con {len(errores)} errores: {errores}")
