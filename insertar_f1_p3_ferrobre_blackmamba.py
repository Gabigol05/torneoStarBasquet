"""
insertar_f1_p3_ferrobre_blackmamba.py
======================================
Fecha 1 — Partido 3: Ferrobre 51 vs Black Mamba 33
Horario: 13:30 hs
MVP: Valles Liliana Elizabeth (f_fer_02)
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
print("  Fecha 1 — Partido 3: Ferrobre vs Black Mamba")
print("=" * 60)

# ─── 1. Fecha 1 ya existe con ID=1 ───────────────────────────────────────────
print("\n📅 Usando Fecha 1 (ID=1)...")
fecha_id = 1
print(f"  ✅ Fecha 1 → ID {fecha_id}")

# ─── 2. Insertar partido ──────────────────────────────────────────────────────
# Scores acumulados → parciales:
# Ferrobre:    Q1=12 | Q2=29-12=17 | Q3=39-29=10 | Q4=51-39=12 → 51 ✅
# Black Mamba: Q1=4  | Q2=13-4=9   | Q3=25-13=12 | Q4=33-25=8  → 33 ✅
print("\n🏀 Insertando partido Ferrobre vs Black Mamba...")
res = post_ret("partidos_femenino", {
    "fecha_id":        fecha_id,
    "equipo_local_id": "f_ferrobre",
    "equipo_visit_id": "f_black_mamba",
    "q1_local": 12, "q2_local": 17, "q3_local": 10, "q4_local": 12, "ot_local": 0,
    "q1_visit":  4, "q2_visit":  9, "q3_visit": 12, "q4_visit":  8, "ot_visit": 0,
    "pct_simples_local": 48, "pct_dobles_local": 42, "pct_triples_local": 9,
    "pct_simples_visit": 29, "pct_dobles_visit": 55, "pct_triples_visit": 42,
    "estado": "finalizado",
    "hora_inicio": "13:30:00",
})
partido_id = res[0]["id"]
print(f"  ✅ Partido ID {partido_id} — Ferrobre 51 vs Black Mamba 33")

# ─── 3. Stats jugadoras ───────────────────────────────────────────────────────
# formato: jugadora_id, equipo_id, nro, sc,sf, dc,df, tc,tf, as_,rd,ro, fp,ft,fa, rb,tp,pe, ca

# BLACK MAMBA
bm = [
    ("f_bm_05","f_black_mamba",  1,  0,2,  0, 2,  0, 0,  0, 1, 0,  0, 0, 0,  1, 0, 0,  0),  # Quevedo
    ("f_bm_07","f_black_mamba",  4,  0,2,  1, 4,  0, 0,  1, 1, 0,  2, 0, 0,  0, 0, 0,  0),  # Caminos
    ("f_bm_09","f_black_mamba",  5,  1,0,  2, 0,  0, 0,  1, 4, 2,  1, 0, 0,  1, 0, 1,  0),  # Sanchez
    ("f_bm_08","f_black_mamba",  6,  0,0,  1, 9,  0, 1,  1, 7, 2,  0, 0, 0,  2, 0, 0,  0),  # Bernardi
    ("f_bm_06","f_black_mamba",  7,  0,1,  2, 4,  2, 2,  1, 6, 1,  5, 0, 0,  1, 0, 0,  0),  # Palacios
    ("f_bm_02","f_black_mamba",  8,  1,1,  0, 1,  0, 0,  1, 0, 0,  1, 0, 0,  0, 0, 0,  0),  # Farragut
    ("f_bm_01","f_black_mamba", 11,  0,0,  0, 3,  1, 1,  0, 0, 0,  2, 0, 0,  1, 0, 0,  0),  # Hanisch
    ("f_bm_13","f_black_mamba", 14,  2,0,  0, 0,  1, 1,  0, 2, 0,  1, 0, 0,  0, 0, 0,  0),  # Moraga
    ("f_bm_12","f_black_mamba", 15,  0,4,  0, 2,  1, 1,  1, 4, 2,  3, 0, 0,  1, 1, 1,  0),  # Gutierrez
    ("f_bm_10","f_black_mamba", 17,  0,0,  0, 0,  0, 0,  0, 0, 0,  0, 0, 0,  0, 0, 0,  0),  # Racca
    ("f_bm_11","f_black_mamba", 21,  0,0,  1, 0,  0, 0,  0, 2, 0,  1, 0, 0,  1, 0, 0,  0),  # Rodriguez
    ("f_bm_04","f_black_mamba", 24,  0,0,  0, 1,  0, 1,  2, 2, 0,  0, 0, 0,  0, 0, 0,  0),  # Muela
]

# FERROBRE
fer = [
    ("f_fer_06","f_ferrobre",  4,  0,1,  3, 2,  0, 0,  1, 6, 3,  1, 0, 0,  2, 0, 0,  0),  # Gonzalez
    ("f_fer_08","f_ferrobre",  5,  0,2,  2, 4,  0, 1,  2, 2, 1,  0, 0, 0,  2, 0, 0,  0),  # Planté Carolina
    ("f_fer_16","f_ferrobre",  6,  0,0,  4, 1,  0, 1,  0, 2, 1,  0, 0, 0,  0, 0, 1,  0),  # Mallol
    ("f_fer_02","f_ferrobre",  7,  5,3,  1, 4,  1, 1,  5, 3, 0,  0, 0, 0,  7, 0, 1,  0),  # Valles MVP
    ("f_fer_15","f_ferrobre",  9,  0,0,  3, 1,  0, 1,  2, 2, 0,  0, 0, 0,  1, 0, 1,  0),  # Planté Candela
    ("f_fer_03","f_ferrobre", 10,  2,0,  2, 1,  0, 3,  0, 1, 0,  0, 0, 0,  2, 1, 0,  0),  # Brasca
    ("f_fer_01","f_ferrobre", 11,  0,0,  1, 3,  0, 1,  0, 0, 1,  1, 0, 0,  2, 0, 0,  0),  # Hernandez
    ("f_fer_14","f_ferrobre", 12,  3,3,  0, 3,  0, 1,  0, 2, 1,  0, 0, 0,  1, 0, 0,  0),  # Nievas Adriana
    ("f_fer_12","f_ferrobre", 13,  0,0,  0, 2,  0, 0,  1, 1, 0,  0, 0, 0,  0, 0, 0,  0),  # Cornejo
    ("f_fer_09","f_ferrobre", 14,  0,4,  2, 1,  0, 1,  0, 2, 0,  2, 0, 0,  1, 0, 0,  0),  # Quinteros
    ("f_fer_10","f_ferrobre", 15,  0,0,  0, 2,  0, 0,  2, 1, 0,  3, 0, 0,  0, 0, 0,  0),  # Zapata
    ("f_fer_04","f_ferrobre", 18,  2,0,  0, 1,  0, 0,  1, 4, 0,  2, 0, 0,  5, 0, 0,  0),  # Valdivia
]

STATS_RAW = bm + fer

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
print("\n⭐ MVP: Valles Liliana Elizabeth (f_fer_02)...")
patch("partidos_femenino", f"id=eq.{partido_id}", {"mvp_jugadora_id": "f_fer_02"})
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
    print("🎉 Fecha 1 - Partido 3 cargado exitosamente.")
    print("   Ferrobre 51 (Q1=12 Q2=17 Q3=10 Q4=12) vs Black Mamba 33 (Q1=4 Q2=9 Q3=12 Q4=8)")
    print("   MVP: Valles Liliana Elizabeth")
else:
    print(f"⚠️  Completado con {len(errores)} errores: {errores}")
