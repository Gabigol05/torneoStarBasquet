"""
insertar_f2_p2_branca_union.py
================================
Fecha 2 — Partido 2: Branca 48 vs Union 12
MVP: Gette Virginia (f_bra_07)
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
print("  Fecha 2 — Partido 2: Branca vs Union")
print("=" * 60)

# ─── 1. Obtener Fecha 2 ───────────────────────────────────────────────────────
print("\n📅 Obteniendo Fecha 2...")
fechas = get("fechas_femenino", "numero=eq.2&select=id")
if not fechas:
    raise Exception("Fecha 2 no encontrada — corré primero el script del Partido 1")
fecha_id = fechas[0]["id"]
print(f"  ✅ Fecha 2 → ID {fecha_id}")

# ─── 2. Insertar partido ──────────────────────────────────────────────────────
# Branca:  Q1=9  | Q2=21-9=12  | Q3=35-21=14 | Q4=48-35=13 → 9+12+14+13=48 ✅
# Union:   Q1=2  | Q2=2        | Q3=4        | Q4=4        → 2+2+4+4=12    ✅
print("\n🏀 Insertando partido Branca vs Union...")
res = post_ret("partidos_femenino", {
    "fecha_id":        fecha_id,
    "equipo_local_id": "f_branca",
    "equipo_visit_id": "f_union",
    "q1_local": 9,  "q2_local": 12, "q3_local": 14, "q4_local": 13, "ot_local": 0,
    "q1_visit": 2,  "q2_visit": 2,  "q3_visit": 4,  "q4_visit": 4,  "ot_visit": 0,
    "pct_simples_local": 22, "pct_dobles_local": 41, "pct_triples_local": 19,
    "pct_simples_visit": 0,  "pct_dobles_visit": 65, "pct_triples_visit": 0,
    "estado": "finalizado",
})
partido_id = res[0]["id"]
print(f"  ✅ Partido ID {partido_id} — Branca 48 vs Union 12")

# ─── 3. Stats jugadoras ───────────────────────────────────────────────────────
# BRANCA
bra = [
    ("f_bra_16","f_branca",  8,  0,0,  1,4,  0,0,  1, 1,1,  4,0,0,  1,0,0,  0),  # Quiroz
    ("f_bra_04","f_branca",  9,  0,0,  1,4,  1,1,  1, 0,1,  1,0,0,  2,0,1,  0),  # Delu
    ("f_bra_18","f_branca", 10,  0,0,  0,2,  0,1,  1, 2,0,  1,0,0,  0,0,0,  0),  # Romera
    ("f_bra_05","f_branca", 12,  0,2,  2,2,  0,1,  1, 5,2,  0,0,0,  0,0,0,  0),  # Elsezar
    ("f_bra_01","f_branca", 14,  1,1,  0,2,  0,3,  4, 2,3,  1,0,0,  7,0,1,  0),  # Aguilar
    ("f_bra_07","f_branca",  1,  1,0,  5,0,  1,1,  1, 1,1,  0,0,0,  2,0,0,  0),  # Gette MVP
    ("f_bra_03","f_branca",  4,  0,2,  0,1,  0,2,  3, 0,0,  1,0,0,  3,0,0,  0),  # Degiovanni
    ("f_bra_17","f_branca",  5,  0,0,  6,3,  1,4,  0, 1,0,  1,0,0,  1,0,2,  0),  # Real
    ("f_bra_13","f_branca",  6,  0,0,  0,1,  0,0,  1, 1,1,  2,0,0,  1,0,0,  0),  # Pagasartundua
    ("f_bra_11","f_branca",  7,  0,2,  2,3,  1,3,  0, 1,1,  2,0,0,  1,0,1,  0),  # Martinez
]

# UNION
uag = [
    ("f_uag_04","f_union", 13,  0,0,  0,5,  0,2,  1, 2,1,  3,0,0,  1,0,0,  0),  # Haberstock
    ("f_uag_08","f_union", 15,  0,2,  0,1,  0,0,  0, 4,3,  3,0,0,  0,0,0,  0),  # Benchat Darian
    ("f_uag_10","f_union",  5,  0,2,  1,7,  0,0,  0, 6,1,  2,0,0,  1,1,1,  0),  # Benchat Daisy
    ("f_uag_13","f_union", 11,  0,0,  1,3,  0,0,  0, 2,0,  1,0,0,  1,0,0,  0),  # Arce
    ("f_uag_15","f_union",  7,  0,0,  0,2,  0,1,  1, 6,0,  1,0,0,  2,0,0,  0),  # Muñoz
    ("f_uag_03","f_union",  8,  0,0,  0,4,  0,2,  0, 3,0,  1,0,0,  0,0,0,  0),  # Godoy
    ("f_uag_17","f_union", 10,  0,0,  0,1,  0,0,  0, 0,1,  1,0,0,  0,1,0,  0),  # Sanchez
    ("f_uag_05","f_union", 17,  0,0,  0,0,  0,0,  0, 0,0,  0,0,0,  0,0,0,  0),  # Maggi
    ("f_uag_12","f_union", 27,  0,0,  0,0,  0,0,  0, 0,0,  0,0,0,  0,0,2,  0),  # Levitzky
    ("f_uag_14","f_union",  3,  0,0,  0,1,  0,0,  0, 0,2,  0,0,0,  0,0,0,  0),  # Cañas
]

STATS_RAW = bra + uag

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
print("\n⭐ MVP: Gette Virginia (f_bra_07)...")
patch("partidos_femenino", f"id=eq.{partido_id}", {"mvp_jugadora_id": "f_bra_07"})
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
    print("🎉 Fecha 2 - Partido 2 cargado exitosamente.")
    print("   Branca 48 (Q1=9 Q2=12 Q3=14 Q4=13) vs Union 12 (Q1=2 Q2=2 Q3=4 Q4=4)")
    print("   MVP: Gette Virginia")
else:
    print(f"⚠️  Completado con {len(errores)} errores: {errores}")
