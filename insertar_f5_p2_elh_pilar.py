"""
insertar_f5_p2_elh_pilar.py
=============================
Fecha 5 — Partido 2: El H 31 vs Pilar 41
Horario: 12:10 hs
MVP: Viada Veronica (f_psc_18) - VAL 12
Nota: #12 "Rivero" en Excel = Mallia (f_elh_04)
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
print("  Fecha 5 — Partido 2: El H vs Pilar")
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
# El H:  Q1=8  | Q2=18-8=10  | Q3=24-18=6  | Q4=31-24=7  → 8+10+6+7=31  ✅
# Pilar: Q1=7  | Q2=22-7=15  | Q3=33-22=11 | Q4=41-33=8  → 7+15+11+8=41 ✅
print("\n🏀 Insertando partido El H vs Pilar...")
res = post_ret("partidos_femenino", {
    "fecha_id":        fecha_id,
    "equipo_local_id": "f_el_h",
    "equipo_visit_id": "f_pilar",
    "q1_local": 8,  "q2_local": 10, "q3_local": 6,  "q4_local": 7,  "ot_local": 0,
    "q1_visit": 7,  "q2_visit": 15, "q3_visit": 11, "q4_visit": 8,  "ot_visit": 0,
    "pct_simples_local": 57, "pct_dobles_local": 31, "pct_triples_local": 8,
    "pct_simples_visit": 47, "pct_dobles_visit": 29, "pct_triples_visit": 20,
    "estado": "finalizado",
    "hora_inicio": "12:10:00",
})
partido_id = res[0]["id"]
print(f"  ✅ Partido ID {partido_id} — El H 31 vs Pilar 41")

# ─── 3. Stats jugadoras ───────────────────────────────────────────────────────
# EL H
elh = [
    ("f_elh_11","f_el_h",  4,  1,1,  2,3,  0,0,  0, 4,2,  0,0,0,  1,1,1,  0),  # Langhoff
    ("f_elh_16","f_el_h",  5,  1,1,  0,1,  0,0,  0, 2,1,  1,0,0,  1,0,1,  0),  # Escobar
    ("f_elh_07","f_el_h",  6,  0,0,  0,3,  0,6,  0, 3,1,  4,0,0,  1,1,0,  0),  # Moreno
    ("f_elh_15","f_el_h",  8,  0,0,  1,4,  0,1,  1, 2,1,  1,0,0,  0,0,0,  0),  # Zabala
    ("f_elh_06","f_el_h",  9,  1,3,  1,1,  0,2,  0, 2,0,  0,0,0,  0,0,0,  0),  # Francisquetti C
    ("f_elh_02","f_el_h", 11,  5,1,  4,6,  1,3,  0, 3,2,  2,0,0,  1,0,0,  0),  # Francisquetti D
    ("f_elh_04","f_el_h", 12,  0,0,  0,1,  0,0,  0, 1,0,  0,0,0,  0,0,1,  0),  # Mallia
    ("f_elh_03","f_el_h", 77,  0,0,  1,1,  0,0,  1, 1,2,  1,0,0,  1,0,0,  0),  # Rivero Patricia
    ("f_elh_14","f_el_h",  4,  0,0,  0,0,  0,0,  0, 0,0,  1,0,0,  0,0,0,  0),  # Micori
    ("f_elh_05","f_el_h", 14,  0,0,  1,2,  0,0,  1, 4,0,  3,0,0,  0,1,0,  0),  # Toral
]

# PILAR
psc = [
    ("f_psc_07","f_pilar",  4,  1,1,  2,2,  0,0,  0, 1,6,  0,0,0,  1,0,0,  0),  # Arce
    ("f_psc_09","f_pilar",  5,  0,0,  1,3,  0,3,  1, 4,1,  0,0,0,  1,0,1,  0),  # Azar
    ("f_psc_19","f_pilar",  8,  0,0,  0,1,  0,0,  0, 0,0,  1,0,0,  0,0,0,  0),  # Diani
    ("f_psc_08","f_pilar",  9,  1,1,  0,0,  0,1,  1, 2,1,  1,0,0,  1,1,0,  0),  # Chivazza
    ("f_psc_01","f_pilar", 10,  1,2,  4,4,  0,1,  0, 1,0,  3,0,0,  1,0,1,  0),  # Giraudo MJ
    ("f_psc_17","f_pilar", 11,  1,1,  1,2,  0,0,  2, 3,1,  1,0,0,  1,0,0,  0),  # Bulacio
    ("f_psc_03","f_pilar", 12,  0,0,  1,0,  0,0,  0, 1,0,  2,0,0,  0,0,1,  0),  # Giraudo Ivana
    ("f_psc_02","f_pilar", 13,  1,1,  0,1,  2,2,  1, 3,0,  0,0,0,  0,0,1,  0),  # Serra
    ("f_psc_18","f_pilar", 23,  4,4,  4,8,  0,1,  2, 9,0,  3,0,0,  1,1,0,  0),  # Viada MVP
]

STATS_RAW = elh + psc

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
print("\n⭐ MVP: Viada Veronica (f_psc_18)...")
patch("partidos_femenino", f"id=eq.{partido_id}", {"mvp_jugadora_id": "f_psc_18"})
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
    print("🎉 Fecha 5 - Partido 2 cargado exitosamente.")
    print("   El H 31 (Q1=8 Q2=10 Q3=6 Q4=7) vs Pilar 41 (Q1=7 Q2=15 Q3=11 Q4=8)")
    print("   MVP: Viada Veronica")
else:
    print(f"⚠️  Completado con {len(errores)} errores: {errores}")
