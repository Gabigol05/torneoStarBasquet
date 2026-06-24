"""
fix_donofrio_branca_f2p2.py
============================
Agrega las stats de D'Onofrio Camila (f_bra_02) al partido Branca vs Union Fecha 2
que quedaron fuera del script principal.
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

def post_min(table, data):
    r = requests.post(f"{SUPABASE_URL}/{table}", headers=H_MIN, json=data)
    if r.status_code not in (200, 201, 204):
        raise Exception(f"POST {table}: {r.status_code} {r.text[:400]}")

# ─── Buscar el partido Branca vs Union de Fecha 2 ────────────────────────────
print("🔍 Buscando partido Branca vs Union Fecha 2...")
fechas = get("fechas_femenino", "numero=eq.2&select=id")
fecha_id = fechas[0]["id"]
partidos = get("partidos_femenino",
    f"fecha_id=eq.{fecha_id}&equipo_local_id=eq.f_branca&equipo_visit_id=eq.f_union&select=id")
if not partidos:
    raise Exception("Partido no encontrado")
partido_id = partidos[0]["id"]
print(f"  ✅ Partido ID {partido_id}")

# ─── Stats D'Onofrio Camila ──────────────────────────────────────────────────
# Del Excel: SC=0,SF=0, DC=0,DF=2, TC=0,TF=1, AS=2, RD=1,RO=0, FP=0,FT=0,FA=0, RB=4,TP=0,PE=0
sc,sf,dc,df,tc,tf = 0,0,0,2,0,1
as_,rd,ro = 2,1,0
fp,ft,fa = 0,0,0
rb,tp,pe,ca = 4,0,0,0
pts = sc + dc*2 + tc*3
val = pts + rd + ro + as_ + rb + tp - (sf+df+tf) - pe - fa

print(f"\n📊 Insertando D'Onofrio Camila: PTS={pts} VAL={val}")
post_min("stats_partido_femenino", {
    "partido_id": partido_id, "jugadora_id": "f_bra_02", "equipo_id": "f_branca",
    "numero": 24,
    "sc":sc,"sf":sf,"dc":dc,"df":df,"tc":tc,"tf":tf,
    "as_":as_,"rd":rd,"ro":ro,"fp":fp,"ft":ft,"fa":fa,
    "rb":rb,"tp":tp,"pe":pe,"ca":ca,
    "pts":pts,"val":val,
})
print("  ✅ Stats insertadas")

# ─── Recalcular promedios ─────────────────────────────────────────────────────
print("\n🔄 Recalculando promedios de f_bra_02...")
filas = get("stats_partido_femenino",
    "jugadora_id=eq.f_bra_02&select=pts,rd,ro,as_,rb,tp,pe,val,sc,sf,dc,df,tc,tf")

k = len(filas)
def sm(key): return sum(x.get(key) or 0 for x in filas)

tsc,tsf = sm('sc'),sm('sf')
tdc,tdf = sm('dc'),sm('df')
ttc,ttf = sm('tc'),sm('tf')
t_rd,t_ro = sm('rd'),sm('ro')

payload = {
    "jugadora_id": "f_bra_02",
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

existing = get("estadisticas_femenino", "jugadora_id=eq.f_bra_02&select=id")
if existing:
    rec_id = existing[0]["id"]
    r2 = requests.patch(f"{SUPABASE_URL}/estadisticas_femenino?id=eq.{rec_id}",
        headers=H_MIN, json=payload)
    if r2.status_code not in (200,201,204):
        raise Exception(f"PATCH: {r2.status_code} {r2.text[:300]}")
    print(f"  ✅ PJ={k} PTS={payload['pts_prom']} VAL={payload['val_prom']} [actualizado]")
else:
    r2 = requests.post(f"{SUPABASE_URL}/estadisticas_femenino",
        headers=H_MIN, json=payload)
    if r2.status_code not in (200,201,204):
        raise Exception(f"INSERT: {r2.status_code} {r2.text[:300]}")
    print(f"  ✅ PJ={k} PTS={payload['pts_prom']} VAL={payload['val_prom']} [nuevo]")

print("\n🎉 D'Onofrio Camila agregada correctamente.")
