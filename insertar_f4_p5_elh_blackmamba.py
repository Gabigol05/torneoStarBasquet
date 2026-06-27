"""
insertar_f4_p5_elh_blackmamba.py
==================================
Fecha 4 — Partido 5: El H 47 vs Black Mamba 27
Horario: 16:40 hs
MVP: Francisquetti D. (f_elh_02) - VAL 26
Nota: Piccardini/Moraga combinadas en f_bm_13
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
print("  Fecha 4 — Partido 5: El H vs Black Mamba")
print("=" * 60)

# ─── 1. Obtener Fecha 4 ───────────────────────────────────────────────────────
print("\n📅 Obteniendo Fecha 4...")
fechas = get("fechas_femenino", "numero=eq.4&select=id")
if not fechas:
    raise Exception("Fecha 4 no encontrada")
fecha_id = fechas[0]["id"]
print(f"  ✅ Fecha 4 → ID {fecha_id}")

# ─── 2. Insertar partido ──────────────────────────────────────────────────────
# Scores acumulados → parciales:
# El H:        Q1=17 | Q2=23-17=6  | Q3=36-23=13 | Q4=47-36=11 → 17+6+13+11=47 ✅
# Black Mamba: Q1=5  | Q2=10-5=5   | Q3=14-10=4  | Q4=27-14=13 → 5+5+4+13=27   ✅
print("\n🏀 Insertando partido El H vs Black Mamba...")
res = post_ret("partidos_femenino", {
    "fecha_id":        fecha_id,
    "equipo_local_id": "f_el_h",
    "equipo_visit_id": "f_black_mamba",
    "q1_local": 17, "q2_local": 6,  "q3_local": 13, "q4_local": 11, "ot_local": 0,
    "q1_visit": 5,  "q2_visit": 5,  "q3_visit": 4,  "q4_visit": 13, "ot_visit": 0,
    "pct_simples_local": 50, "pct_dobles_local": 36, "pct_triples_local": 38,
    "pct_simples_visit": 38, "pct_dobles_visit": 53, "pct_triples_visit": 17,
    "estado": "finalizado",
    "hora_inicio": "16:40:00",
})
partido_id = res[0]["id"]
print(f"  ✅ Partido ID {partido_id} — El H 47 vs Black Mamba 27")

# ─── 3. Stats jugadoras ───────────────────────────────────────────────────────
# EL H
elh = [
    ("f_elh_11","f_el_h",  4,  0,1,  3,8,  0,1,  2, 5,1,  0,0,0,  3,0,1,  0),  # Langhoff
    ("f_elh_07","f_el_h",  6,  2,2,  0,2,  1,1,  0, 1,1,  2,0,0,  0,1,0,  0),  # Moreno
    ("f_elh_15","f_el_h",  8,  0,0,  0,2,  0,0,  1, 1,1,  0,0,0,  3,0,0,  0),  # Zabala
    ("f_elh_06","f_el_h",  9,  0,0,  7,5,  0,2,  2, 2,0,  2,0,0,  2,0,0,  0),  # Francisquetti C
    ("f_elh_02","f_el_h", 11,  4,3,  3,1,  2,0,  2, 4,1,  4,0,0,  7,0,0,  0),  # Francisquetti D MVP
    ("f_elh_04","f_el_h", 12,  0,0,  0,2,  0,0,  0, 0,0,  1,0,0,  2,0,2,  0),  # Mallia
    ("f_elh_03","f_el_h", 77,  0,0,  0,0,  0,1,  2, 3,0,  3,0,0,  0,0,1,  0),  # Rivero
    ("f_elh_13","f_el_h",  1,  0,0,  3,5,  0,0,  2, 1,2,  0,0,0,  1,0,0,  0),  # Casanova
    ("f_elh_09","f_el_h", 24,  0,0,  0,3,  0,0,  0, 0,1,  0,0,0,  0,0,0,  0),  # Garcia Rocio
]

# BLACK MAMBA — Piccardini/Moraga combinadas en f_bm_13
bm = [
    ("f_bm_05","f_black_mamba",  1,  0,0,  0,1,  0,1,  1, 1,3,  1,0,0,  0,0,0,  0),  # Quevedo
    ("f_bm_07","f_black_mamba",  4,  0,2,  0,1,  0,0,  0, 3,0,  0,0,0,  0,1,0,  0),  # Caminos
    ("f_bm_09","f_black_mamba",  5,  0,0,  0,1,  0,0,  2, 4,1,  1,0,0,  0,1,0,  0),  # Sanchez
    ("f_bm_08","f_black_mamba",  6,  0,0,  1,5,  1,4,  1, 0,4,  1,0,0,  0,0,1,  0),  # Bernardi
    ("f_bm_06","f_black_mamba",  7,  2,1,  6,6,  1,1,  2, 2,1,  2,0,0,  0,0,0,  0),  # Palacios
    ("f_bm_02","f_black_mamba",  8,  0,2,  0,1,  0,0,  0, 1,0,  0,0,0,  0,0,0,  0),  # Farragut
    ("f_bm_01","f_black_mamba", 11,  1,0,  1,1,  0,0,  1, 4,0,  1,0,0,  0,1,0,  0),  # Hanisch
    ("f_bm_13","f_black_mamba", 14,  0,0,  2,3,  0,2,  1, 6,1,  3,0,0,  1,0,2,  0),  # Piccardini/Moraga combinada
    ("f_bm_03","f_black_mamba", 17,  0,0,  0,1,  0,0,  0, 2,1,  2,0,0,  0,0,1,  0),  # Ordoñez
    ("f_bm_11","f_black_mamba", 21,  0,0,  0,1,  0,1,  0, 0,1,  2,0,0,  0,0,0,  0),  # Rodriguez
    ("f_bm_04","f_black_mamba", 24,  0,0,  0,0,  0,1,  0, 2,0,  0,0,0,  0,0,1,  0),  # Muela
]

STATS_RAW = elh + bm

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
print("\n⭐ MVP: Francisquetti D. (f_elh_02)...")
patch("partidos_femenino", f"id=eq.{partido_id}", {"mvp_jugadora_id": "f_elh_02"})
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
    print("🎉 Fecha 4 - Partido 5 cargado exitosamente.")
    print("   El H 47 (Q1=17 Q2=6 Q3=13 Q4=11) vs Black Mamba 27 (Q1=5 Q2=5 Q3=4 Q4=13)")
    print("   MVP: Francisquetti Delfina")
else:
    print(f"⚠️  Completado con {len(errores)} errores: {errores}")
