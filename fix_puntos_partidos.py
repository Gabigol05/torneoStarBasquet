"""
fix_puntos_partidos.py
=======================
Recalcula y actualiza puntos_local y puntos_visit en todos los partidos
que los tienen en null (los 25 partidos cargados con los scripts históricos).
Fórmula: puntos = q1 + q2 + q3 + q4 + ot
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
    "Prefer": "return=representation",
}
H_MIN = {**H, "Prefer": "return=minimal"}

def n(v):
    return int(v) if v is not None else 0

print("🔍 Obteniendo todos los partidos...")
r = requests.get(
    f"{SUPABASE_URL}/partidos_femenino"
    "?select=id,puntos_local,puntos_visit,q1_local,q2_local,q3_local,q4_local,ot_local,q1_visit,q2_visit,q3_visit,q4_visit,ot_visit",
    headers=H
)
partidos = r.json()
print(f"  {len(partidos)} partidos encontrados")

actualizados = 0
ya_ok = 0
errores = 0

for p in partidos:
    pts_local_calc = n(p['q1_local']) + n(p['q2_local']) + n(p['q3_local']) + n(p['q4_local']) + n(p['ot_local'])
    pts_visit_calc = n(p['q1_visit']) + n(p['q2_visit']) + n(p['q3_visit']) + n(p['q4_visit']) + n(p['ot_visit'])

    # Solo actualizar si son null o difieren del calculado
    necesita_update = (
        p['puntos_local'] is None or
        p['puntos_visit'] is None or
        p['puntos_local'] != pts_local_calc or
        p['puntos_visit'] != pts_visit_calc
    )

    if not necesita_update:
        ya_ok += 1
        continue

    r2 = requests.patch(
        f"{SUPABASE_URL}/partidos_femenino?id=eq.{p['id']}",
        headers=H_MIN,
        json={
            "puntos_local": pts_local_calc,
            "puntos_visit": pts_visit_calc,
        }
    )

    if r2.status_code in (200, 204):
        print(f"  ✅ Partido {p['id']}: {pts_local_calc}-{pts_visit_calc}")
        actualizados += 1
    else:
        print(f"  ❌ Partido {p['id']}: {r2.status_code} {r2.text[:200]}")
        errores += 1

print()
print(f"🎉 Listo.")
print(f"   ✅ {actualizados} partidos actualizados")
print(f"   ✔️  {ya_ok} ya tenían puntos correctos")
if errores:
    print(f"   ❌ {errores} con error")