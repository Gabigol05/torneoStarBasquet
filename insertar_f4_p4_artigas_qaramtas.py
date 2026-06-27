"""
insertar_f4_p4_artigas_qaramtas.py
=====================================
Fecha 4 — Partido 4: Artigas 26 vs Qaramtas 18
Horario: 15:30 hs
MVP: Galfrascoli Romina (f_art_19) - VAL 11
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
print("  Fecha 4 — Partido 4: Artigas vs Qaramtas")
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
# Artigas:  Q1=6 | Q2=18-6=12 | Q3=20-18=2 | Q4=26-20=6 → 6+12+2+6=26 ✅
# Qaramtas: Q1=2 | Q2=8-2=6   | Q3=12-8=4  | Q4=18-12=6 → 2+6+4+6=18  ✅
print("\n🏀 Insertando partido Artigas vs Qaramtas...")
res = post_ret("partidos_femenino", {
    "fecha_id":        fecha_id,
    "equipo_local_id": "f_artigas",
    "equipo_visit_id": "f_qaramtas",
    "q1_local": 6,  "q2_local": 12, "q3_local": 2,  "q4_local": 6,  "ot_local": 0,
    "q1_visit": 2,  "q2_visit": 6,  "q3_visit": 4,  "q4_visit": 6,  "ot_visit": 0,
    "pct_simples_local": 55, "pct_dobles_local": 21, "pct_triples_local": 22,
    "pct_simples_visit": 86, "pct_dobles_visit": 41, "pct_triples_visit": 13,
    "estado": "finalizado",
    "hora_inicio": "15:30:00",
})
partido_id = res[0]["id"]
print(f"  ✅ Partido ID {partido_id} — Artigas 26 vs Qaramtas 18")

# ─── 3. Stats jugadoras ───────────────────────────────────────────────────────
# ARTIGAS
art = [
    ("f_art_09","f_artigas", 13,  1,0,  1,1,  0,1,  1, 1,1,  0,0,0,  2,0,0,  0),  # Monte
    ("f_art_01","f_artigas", 19,  0,2,  0,4,  0,0,  0, 2,3,  1,0,0,  0,0,0,  0),  # Sotelino
    ("f_art_13","f_artigas", 16,  1,1,  1,4,  0,1,  1, 0,0,  0,0,0,  0,0,2,  0),  # Lopez Agustina
    ("f_art_10","f_artigas", 25,  0,0,  1,3,  0,0,  0, 2,1,  2,0,0,  0,0,1,  0),  # Caceres
    ("f_art_02","f_artigas", 12,  0,0,  1,1,  0,1,  0, 0,0,  1,0,0,  3,0,1,  0),  # Morales
    ("f_art_14","f_artigas", 35,  0,0,  0,0,  0,0,  0, 2,0,  2,0,0,  0,0,0,  0),  # Lopez Carolina
    ("f_art_07","f_artigas", 26,  0,0,  0,2,  0,0,  0, 0,0,  0,0,0,  1,0,0,  0),  # Cinalli
    ("f_art_19","f_artigas",  2,  0,0,  0,3,  2,2,  1, 5,2,  1,0,0,  2,0,0,  0),  # Galfrascoli MVP
    ("f_art_04","f_artigas",  6,  0,0,  0,2,  0,0,  0, 0,0,  0,0,0,  0,0,0,  0),  # Pedrero
    ("f_art_06","f_artigas", 43,  1,1,  1,1,  0,1,  0, 0,0,  4,0,0,  1,0,0,  0),  # Del Sacramento
    ("f_art_03","f_artigas",  9,  1,1,  0,2,  0,1,  0, 1,1,  0,0,0,  0,0,0,  0),  # Deambrossio
    ("f_art_08","f_artigas",  7,  2,0,  2,4,  0,0,  0, 0,1,  0,0,0,  0,0,1,  0),  # Ferri
]

# QARAMTAS
qar = [
    ("f_qar_02","f_qaramtas",  6,  0,0,  0,4,  0,1,  0, 1,0,  1,0,0,  1,0,0,  0),  # Dalbene
    ("f_qar_01","f_qaramtas", 69,  0,0,  0,0,  0,0,  0, 1,1,  2,0,0,  0,0,0,  0),  # Roggio
    ("f_qar_03","f_qaramtas",  4,  0,0,  0,1,  0,0,  0, 1,0,  3,0,0,  0,0,0,  0),  # Bonansea
    ("f_qar_04","f_qaramtas", 20,  2,1,  1,3,  2,5,  0, 2,5,  1,0,0,  0,1,1,  0),  # Mola
    ("f_qar_07","f_qaramtas", 15,  0,0,  0,2,  0,0,  0, 1,0,  0,0,0,  0,0,0,  0),  # Fara
    ("f_qar_08","f_qaramtas", 11,  2,0,  0,0,  0,3,  0, 1,0,  0,0,0,  1,0,0,  0),  # Moriconi
    ("f_qar_09","f_qaramtas",  1,  2,0,  0,0,  0,3,  1, 2,0,  0,0,0,  0,0,1,  0),  # Alonso Ana Belen
    ("f_qar_19","f_qaramtas", 13,  0,0,  0,2,  0,0,  0, 4,0,  0,0,0,  0,1,0,  0),  # Alonso Ricca
    ("f_qar_12","f_qaramtas", 10,  0,0,  0,0,  0,0,  0, 3,0,  1,0,0,  0,0,0,  0),  # Artazo
    ("f_qar_10","f_qaramtas", 30,  0,0,  2,2,  0,1,  0, 1,0,  1,0,0,  0,0,1,  0),  # Estigarribia
]

STATS_RAW = art + qar

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
print("\n⭐ MVP: Galfrascoli Romina (f_art_19)...")
patch("partidos_femenino", f"id=eq.{partido_id}", {"mvp_jugadora_id": "f_art_19"})
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
    print("🎉 Fecha 4 - Partido 4 cargado exitosamente.")
    print("   Artigas 26 (Q1=6 Q2=12 Q3=2 Q4=6) vs Qaramtas 18 (Q1=2 Q2=6 Q3=4 Q4=6)")
    print("   MVP: Galfrascoli Romina")
else:
    print(f"⚠️  Completado con {len(errores)} errores: {errores}")
