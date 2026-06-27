"""
insertar_f3_p2_blackmamba_branca.py
=====================================
Fecha 3 — Partido 2: Black Mamba 22 vs Branca 47
Horario: 12:10 hs
MVP: Elsezar Nahim (f_bra_05) - VAL 13
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
print("  Fecha 3 — Partido 2: Black Mamba vs Branca")
print("=" * 60)

# ─── 1. Obtener Fecha 3 ───────────────────────────────────────────────────────
print("\n📅 Obteniendo Fecha 3...")
fechas = get("fechas_femenino", "numero=eq.3&select=id")
if not fechas:
    raise Exception("Fecha 3 no encontrada")
fecha_id = fechas[0]["id"]
print(f"  ✅ Fecha 3 → ID {fecha_id}")

# ─── 2. Insertar partido ──────────────────────────────────────────────────────
# Scores acumulados → parciales:
# Black Mamba: Q1=10 | Q2=10-10=0  | Q3=16-10=6  | Q4=22-16=6  → 10+0+6+6=22  ✅
# Branca:      Q1=12 | Q2=20-12=8  | Q3=36-20=16 | Q4=47-36=11 → 12+8+16+11=47 ✅
print("\n🏀 Insertando partido Black Mamba vs Branca...")
res = post_ret("partidos_femenino", {
    "fecha_id":        fecha_id,
    "equipo_local_id": "f_black_mamba",
    "equipo_visit_id": "f_branca",
    "q1_local": 10, "q2_local": 0,  "q3_local": 6,  "q4_local": 6,  "ot_local": 0,
    "q1_visit": 12, "q2_visit": 8,  "q3_visit": 16, "q4_visit": 11, "ot_visit": 0,
    "pct_simples_local": 75, "pct_dobles_local": 36, "pct_triples_local": 0,
    "pct_simples_visit": 56, "pct_dobles_visit": 24, "pct_triples_visit": 18,
    "estado": "finalizado",
    "hora_inicio": "12:10:00",
})
partido_id = res[0]["id"]
print(f"  ✅ Partido ID {partido_id} — Black Mamba 22 vs Branca 47")

# ─── 3. Stats jugadoras ───────────────────────────────────────────────────────
# BLACK MAMBA
bm = [
    ("f_bm_07","f_black_mamba",  4,  3,1,  1,3,  0,0,  1, 7,1,  0,0,0,  1,0,0,  0),  # Caminos
    ("f_bm_09","f_black_mamba",  5,  0,0,  3,3,  0,0,  0, 4,0,  2,0,0,  1,0,0,  0),  # Sanchez
    ("f_bm_08","f_black_mamba",  6,  0,0,  0,0,  0,2,  1, 1,0,  0,0,0,  1,0,1,  0),  # Bernardi
    ("f_bm_06","f_black_mamba",  7,  3,1,  1,3,  0,0,  1, 0,0,  0,0,0,  0,0,0,  0),  # Palacios
    ("f_bm_02","f_black_mamba",  8,  0,0,  0,0,  0,0,  0, 1,0,  0,0,0,  0,0,0,  0),  # Farragut
    ("f_bm_03","f_black_mamba", 10,  0,0,  0,0,  0,0,  0, 0,0,  0,0,0,  0,0,0,  0),  # Ordoñez
    ("f_bm_11","f_black_mamba", 11,  0,0,  1,0,  0,0,  0, 0,0,  1,0,0,  0,0,0,  0),  # Rodriguez
    ("f_bm_12","f_black_mamba", 14,  0,0,  1,3,  0,1,  0, 5,0,  4,0,0,  2,1,2,  0),  # Gutierrez
    ("f_bm_04","f_black_mamba", 24,  0,0,  0,1,  0,1,  1, 2,1,  0,0,0,  1,0,2,  0),  # Muela
    ("f_bm_05","f_black_mamba",  9,  0,0,  1,1,  0,0,  1, 1,0,  3,0,0,  0,0,1,  0),  # Quevedo
    ("f_bm_13","f_black_mamba", 23,  0,0,  0,0,  0,0,  1, 1,0,  2,0,0,  0,0,0,  0),  # Piccardini
]

# BRANCA
bra = [
    ("f_bra_20","f_branca",  1,  0,0,  2,2,  0,0,  0, 1,0,  0,0,0,  1,0,0,  0),  # Simioni
    ("f_bra_21","f_branca",  2,  0,0,  0,0,  0,0,  0, 0,0,  0,0,0,  0,0,0,  0),  # Tarifa
    ("f_bra_03","f_branca",  4,  1,1,  3,3,  1,2,  1, 1,3,  1,0,0,  3,0,2,  0),  # Degiovanni
    ("f_bra_17","f_branca",  5,  0,0,  1,1,  2,4,  1, 3,0,  2,0,0,  2,0,2,  0),  # Real
    ("f_bra_07","f_branca",  6,  0,0,  2,0,  0,3,  2, 2,1,  0,0,0,  3,0,2,  0),  # Gette
    ("f_bra_11","f_branca",  7,  0,0,  1,2,  0,6,  1, 2,1,  1,0,0,  2,1,0,  0),  # Martinez
    ("f_bra_16","f_branca",  8,  0,0,  0,0,  0,3,  2, 3,0,  1,0,0,  0,0,1,  0),  # Quiroz
    ("f_bra_04","f_branca",  9,  1,1,  0,5,  0,2,  0, 1,1,  0,0,0,  1,1,1,  0),  # Delu
    ("f_bra_18","f_branca", 10,  1,0,  2,2,  1,3,  0, 0,0,  1,0,0,  3,0,0,  0),  # Romera
    ("f_bra_05","f_branca", 12,  0,0,  0,0,  1,0,  4, 2,1,  1,0,0,  3,0,0,  0),  # Elsezar MVP
    ("f_bra_01","f_branca", 14,  2,0,  0,5,  0,3,  0, 2,3,  0,0,0,  0,0,1,  0),  # Aguilar
    ("f_bra_10","f_branca", 15,  0,2,  1,1,  1,2,  0, 0,3,  0,0,0,  4,0,0,  0),  # Lescano
]

STATS_RAW = bm + bra

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
print("\n⭐ MVP: Elsezar Nahim (f_bra_05)...")
patch("partidos_femenino", f"id=eq.{partido_id}", {"mvp_jugadora_id": "f_bra_05"})
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
    print("🎉 Fecha 3 - Partido 2 cargado exitosamente.")
    print("   Black Mamba 22 (Q1=10 Q2=0 Q3=6 Q4=6) vs Branca 47 (Q1=12 Q2=8 Q3=16 Q4=11)")
    print("   MVP: Elsezar Nahim")
else:
    print(f"⚠️  Completado con {len(errores)} errores: {errores}")
