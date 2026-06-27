"""
insertar_f4_p2_pilar_branca.py
================================
Fecha 4 — Partido 2: Pilar 39 vs Branca 36
Horario: 13:10 hs
MVP: Viada Veronica (f_psc_18) - VAL 14
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
print("  Fecha 4 — Partido 2: Pilar vs Branca")
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
# Pilar:  Q1=15 | Q2=24-15=9  | Q3=30-24=6  | Q4=39-30=9  → 15+9+6+9=39  ✅
# Branca: Q1=5  | Q2=11-5=6   | Q3=25-11=14 | Q4=36-25=11 → 5+6+14+11=36 ✅
print("\n🏀 Insertando partido Pilar vs Branca...")
res = post_ret("partidos_femenino", {
    "fecha_id":        fecha_id,
    "equipo_local_id": "f_pilar",
    "equipo_visit_id": "f_branca",
    "q1_local": 15, "q2_local": 9,  "q3_local": 6,  "q4_local": 9,  "ot_local": 0,
    "q1_visit": 5,  "q2_visit": 6,  "q3_visit": 14, "q4_visit": 11, "ot_visit": 0,
    "pct_simples_local": 57, "pct_dobles_local": 32, "pct_triples_local": 25,
    "pct_simples_visit": 10, "pct_dobles_visit": 21, "pct_triples_visit": 19,
    "estado": "finalizado",
    "hora_inicio": "13:10:00",
})
partido_id = res[0]["id"]
print(f"  ✅ Partido ID {partido_id} — Pilar 39 vs Branca 36")

# ─── 3. Stats jugadoras ───────────────────────────────────────────────────────
# PILAR
psc = [
    ("f_psc_07","f_pilar",  4,  0,0,  1,2,  0,0,  0, 2,1,  1,0,0,  1,0,0,  0),  # Arce
    ("f_psc_19","f_pilar",  5,  0,0,  0,2,  0,2,  0, 0,1,  4,0,0,  0,0,0,  0),  # Diani
    ("f_psc_09","f_pilar",  7,  3,1,  1,1,  0,2,  0, 6,1,  0,0,0,  0,0,3,  0),  # Azar
    ("f_psc_08","f_pilar",  9,  0,0,  0,0,  1,4,  3, 2,0,  0,0,0,  0,0,0,  0),  # Chivazza
    ("f_psc_01","f_pilar", 10,  2,4,  1,3,  0,1,  3, 5,1,  1,0,0,  0,0,0,  0),  # Giraudo MJ
    ("f_psc_17","f_pilar", 12,  1,1,  1,0,  0,0,  0, 4,1,  1,0,0,  3,0,0,  0),  # Bulacio
    ("f_psc_02","f_pilar", 13,  0,0,  1,2,  2,2,  3, 5,0,  2,0,0,  0,1,0,  0),  # Serra
    ("f_psc_18","f_pilar", 23,  7,4,  2,5,  1,1,  1,10,0,  1,0,0,  0,0,1,  0),  # Viada MVP
]

# BRANCA
bra = [
    ("f_bra_20","f_branca",  1,  0,0,  1,3,  0,1,  0, 1,0,  0,0,0,  0,0,0,  0),  # Simioni
    ("f_bra_17","f_branca",  5,  0,2,  0,1,  1,5,  1, 4,2,  4,0,0,  2,0,0,  0),  # Real
    ("f_bra_07","f_branca",  6,  1,3,  3,7,  2,6,  2, 3,2,  4,0,0,  2,2,0,  0),  # Gette
    ("f_bra_11","f_branca",  7,  0,2,  0,3,  1,3,  0, 5,0,  2,0,0,  1,0,0,  0),  # Martinez
    ("f_bra_16","f_branca",  8,  0,0,  0,0,  0,0,  0, 0,0,  1,0,0,  0,0,0,  0),  # Quiroz
    ("f_bra_04","f_branca",  9,  0,0,  2,2,  0,1,  0, 2,1,  2,0,0,  0,1,0,  0),  # Delu
    ("f_bra_18","f_branca", 10,  0,0,  0,1,  0,2,  0, 0,0,  2,0,0,  1,0,0,  0),  # Romera
    ("f_bra_05","f_branca", 12,  0,2,  3,3,  0,1,  3, 3,3,  2,0,0,  3,1,0,  0),  # Elsezar
    ("f_bra_21","f_branca", 14,  0,0,  0,0,  0,0,  0, 0,0,  0,0,0,  0,0,0,  0),  # Tarifa
    ("f_bra_10","f_branca", 15,  0,0,  1,3,  1,2,  0, 1,2,  2,0,0,  2,0,0,  0),  # Lescano
]

STATS_RAW = psc + bra

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
    print("🎉 Fecha 4 - Partido 2 cargado exitosamente.")
    print("   Pilar 39 (Q1=15 Q2=9 Q3=6 Q4=9) vs Branca 36 (Q1=5 Q2=6 Q3=14 Q4=11)")
    print("   MVP: Viada Veronica")
else:
    print(f"⚠️  Completado con {len(errores)} errores: {errores}")
