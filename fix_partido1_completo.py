"""
fix_partido1_completo.py
========================
Re-inserta las stats de jugadoras del Partido 1 (Pilar vs Qaramtas)
y calcula los promedios en estadisticas_femenino.
El partido ya existe (id=1), solo faltan las stats.
"""

import requests

SUPABASE_URL = "https://weveobptegokulxsqsuf.supabase.co/rest/v1"
SERVICE_KEY  = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    ".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndldmVvYnB0ZWdva3VseHNxc3VmIiwicm9sZSI"
    "6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTEyODI1OCwiZXhwIjoyMDk2NzA0MjU4fQ"
    ".t8WMPJpnG5vOJPHpzTrwBOjZxdZ_IOjAWabt2ECqQOg"
)

H = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}
H_RET = {**H, "Prefer": "return=representation"}

def get(table, query=""):
    r = requests.get(f"{SUPABASE_URL}/{table}?{query}", headers=H_RET)
    if r.status_code != 200:
        raise Exception(f"GET {table}: {r.status_code} {r.text[:400]}")
    return r.json()

def post_min(table, data):
    r = requests.post(f"{SUPABASE_URL}/{table}", headers=H, json=data)
    if r.status_code not in (200, 201, 204):
        raise Exception(f"POST {table}: {r.status_code} {r.text[:400]}")
    print(f"  ✅ POST {table} OK ({r.status_code})")

def upsert_est(data):
    r = requests.post(
        f"{SUPABASE_URL}/estadisticas_femenino",
        headers={**H, "Prefer": "resolution=merge-duplicates,return=minimal"},
        json=data
    )
    if r.status_code not in (200, 201, 204):
        raise Exception(f"UPSERT estadisticas: {r.status_code} {r.text[:400]}")

# ─── 1. Confirmar que el partido existe ───────────────────────────────────────
print("🔍 Verificando partido 1...")
partidos = get("partidos_femenino", "id=eq.1")
if not partidos:
    raise Exception("❌ Partido id=1 no encontrado en BD")
p = partidos[0]
PARTIDO_ID = p["id"]
print(f"  ✅ Partido {PARTIDO_ID}: {p['equipo_local_id']} vs {p['equipo_visit_id']}")
print(f"     puntos_local={p.get('puntos_local')} puntos_visit={p.get('puntos_visit')}")

# ─── 2. Verificar que no haya stats duplicadas ────────────────────────────────
print("\n🔍 Verificando stats existentes...")
existing = get("stats_partido_femenino", f"partido_id=eq.{PARTIDO_ID}")
if existing:
    print(f"  ⚠️  Ya existen {len(existing)} filas — eliminando para reinsertar...")
    r = requests.delete(
        f"{SUPABASE_URL}/stats_partido_femenino?partido_id=eq.{PARTIDO_ID}",
        headers=H
    )
    if r.status_code not in (200, 204):
        raise Exception(f"DELETE stats: {r.status_code} {r.text[:300]}")
    print(f"  ✅ Stats anteriores eliminadas")
else:
    print(f"  ✅ Sin stats previas — insertando desde cero")

# ─── 3. Insertar stats jugadoras ─────────────────────────────────────────────
# formato: jugadora_id, equipo_id, nro, sc,sf, dc,df, tc,tf, as_,rd,ro, fp,ft,fa, rb,tp,pe, ca, pts, val
STATS = [
    # PILAR
    ("f_psc_07","f_pilar",  4,  1,1, 4,1, 0,0, 2, 3,1, 1,0,0, 1,0,0, 0,  9, 14),
    ("f_psc_05","f_pilar",  5,  0,0, 0,1, 0,0, 0, 0,0, 1,0,0, 1,0,0, 0,  0,  0),
    ("f_psc_04","f_pilar",  6,  1,1, 0,2, 0,1, 0, 2,1, 0,0,0, 1,0,0, 0,  1,  1),
    ("f_psc_13","f_pilar",  7,  0,0, 0,2, 0,0, 0, 2,1, 0,0,0, 1,0,0, 0,  0,  2),
    ("f_psc_01","f_pilar", 10,  0,0, 1,10,1,0, 1, 1,4, 1,0,0, 1,0,2, 1,  5, -1),
    ("f_psc_03","f_pilar", 12,  1,1, 2,2, 0,1, 1, 2,2, 2,0,0, 1,1,1, 1,  5,  6),
    ("f_psc_02","f_pilar", 13,  0,0, 0,1, 0,3, 2, 2,2, 3,0,0, 0,0,0, 0,  0,  2),
    ("f_psc_06","f_pilar", 15,  0,2, 1,1, 0,0, 1, 2,1, 1,0,0, 3,0,0, 0,  2,  6),
    ("f_psc_18","f_pilar", 23,  6,4, 4,3, 1,5, 2, 1,3, 0,0,0, 0,1,0, 0, 17, 12),
    # QARAMTAS
    ("f_qar_01","f_qaramtas", 69, 0,0, 1,0, 0,0, 1, 1,3, 3,0,0, 0,0,0, 0,  2,  7),
    ("f_qar_02","f_qaramtas",  6, 0,0, 1,2, 0,0, 0, 1,0, 0,0,0, 0,0,0, 0,  2,  1),
    ("f_qar_03","f_qaramtas",  4, 1,1, 0,2, 0,1, 0, 4,1, 0,0,0, 1,0,2, 0,  1,  1),
    ("f_qar_05","f_qaramtas",  2, 0,2, 1,3, 0,0, 0, 1,1, 5,0,0, 0,0,0, 0,  2, -1),
    ("f_qar_06","f_qaramtas", 26, 1,1, 2,1, 0,0, 0, 2,0, 2,0,0, 0,0,2, 0,  5,  3),
    ("f_qar_07","f_qaramtas", 15, 0,0, 0,2, 0,0, 0, 2,2, 2,0,0, 1,0,0, 0,  0,  3),
    ("f_qar_08","f_qaramtas", 11, 0,0, 0,2, 0,2, 1, 1,0, 2,0,0, 2,0,0, 0,  0,  0),
    ("f_qar_09","f_qaramtas",  1, 0,0, 0,2, 0,0, 1, 1,3, 1,0,0, 0,0,1, 1,  0,  1),
    ("f_qar_10","f_qaramtas", 30, 2,3, 1,5, 0,2, 1, 3,0, 0,0,0, 0,0,1, 0,  4, -3),
    ("f_qar_11","f_qaramtas", 13, 0,0, 0,0, 0,0, 0, 0,0, 0,0,0, 0,0,0, 0,  0,  0),
    ("f_qar_12","f_qaramtas", 10, 0,0, 1,1, 0,0, 0, 1,0, 4,0,0, 0,0,0, 0,  2,  2),
]

print(f"\n📊 Insertando stats ({len(STATS)} jugadoras)...")
rows = []
for s in STATS:
    jid,eqid,nro,sc,sf,dc,df,tc,tf,as_,rd,ro,fp,ft,fa,rb,tp,pe,ca,pts,val = s
    rows.append({
        "partido_id": PARTIDO_ID,
        "jugadora_id": jid,
        "equipo_id": eqid,
        "numero": nro,
        "sc":sc, "sf":sf, "dc":dc, "df":df, "tc":tc, "tf":tf,
        "as_":as_, "rd":rd, "ro":ro,
        "fp":fp, "ft":ft, "fa":fa,
        "rb":rb, "tp":tp, "pe":pe, "ca":ca,
        "pts":pts, "val":val,
    })

post_min("stats_partido_femenino", rows)
print(f"  ✅ {len(rows)} jugadoras insertadas")

# ─── 4. Verificar que se insertaron ──────────────────────────────────────────
print("\n🔍 Verificando inserción...")
check = get("stats_partido_femenino", f"partido_id=eq.{PARTIDO_ID}&select=jugadora_id,pts,val")
print(f"  ✅ {len(check)} filas en stats_partido_femenino")
for row in check:
    print(f"     {row['jugadora_id']}: pts={row['pts']} val={row['val']}")

# ─── 5. Calcular y escribir promedios ─────────────────────────────────────────
print(f"\n🔄 Calculando promedios...")
errores = []

for s in STATS:
    jug_id = s[0]
    try:
        rows_jug = get(
            "stats_partido_femenino",
            f"jugadora_id=eq.{jug_id}"
            "&select=pts,rd,ro,as_,rb,tp,pe,val,sc,sf,dc,df,tc,tf"
        )
        if not rows_jug:
            print(f"  ⚠️  {jug_id}: no encontrado tras inserción")
            errores.append(jug_id)
            continue

        k = len(rows_jug)
        def sm(key): return sum(x.get(key) or 0 for x in rows_jug)

        tsc, tsf = sm('sc'), sm('sf')
        tdc, tdf = sm('dc'), sm('df')
        ttc, ttf = sm('tc'), sm('tf')
        t_rd, t_ro = sm('rd'), sm('ro')

        payload = {
            "jugadora_id":  jug_id,
            "pj":           k,
            "pts_prom":     round(sm('pts') / k, 1),
            "reb_prom":     round((t_rd + t_ro) / k, 1),
            "ast_prom":     round(sm('as_') / k, 1),
            "rob_prom":     round(sm('rb') / k, 1),
            "tap_prom":     round(sm('tp') / k, 1),
            "per_prom":     round(sm('pe') / k, 1),
            "val_prom":     round(sm('val') / k, 1),
            "pct_simples":  round(tsc / (tsc + tsf) * 100, 1) if (tsc + tsf) > 0 else 0,
            "pct_dobles":   round(tdc / (tdc + tdf) * 100, 1) if (tdc + tdf) > 0 else 0,
            "pct_triples":  round(ttc / (ttc + ttf) * 100, 1) if (ttc + ttf) > 0 else 0,
            "pts_total":    sm('pts'),
            "reb_total":    t_rd + t_ro,
            "ast_total":    sm('as_'),
            "mejor_pts":    max(x.get('pts') or 0 for x in rows_jug),
            "sc_total": tsc, "sf_total": tsf,
            "dc_total": tdc, "df_total": tdf,
            "tc_total": ttc, "tf_total": ttf,
            "sc_prom":  round(tsc / k, 1),
            "dc_prom":  round(tdc / k, 1),
            "tc_prom":  round(ttc / k, 1),
        }

        upsert_est(payload)
        print(f"  ✅ {jug_id}: PJ={k} PTS={payload['pts_prom']} REB={payload['reb_prom']} AST={payload['ast_prom']}")

    except Exception as e:
        print(f"  ❌ {jug_id}: {e}")
        errores.append(jug_id)

# ─── 6. Resumen final ─────────────────────────────────────────────────────────
print()
if not errores:
    print("🎉 Todo cargado correctamente.")
    print(f"   {len(STATS)} jugadoras con stats y promedios en BD.")
    print(f"   Partido: Pilar 39 vs Qaramtas 18")
else:
    print(f"⚠️  Completado con {len(errores)} errores: {errores}")
