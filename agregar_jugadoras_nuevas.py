"""
agregar_jugadoras_nuevas.py
============================
Agrega jugadoras nuevas que no estaban en el roster original:
- f_fer_18: Ruesca Pinto Paila Valeria (Ferrobre)
- f_fer_19: Tapia Ana Valeria (Ferrobre)
- f_uag_19: Gonzalez Ayelen (Union)
- f_psc_19: Diani Elisa (Pilar)
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

def post(table, data):
    r = requests.post(f"{SUPABASE_URL}/{table}", headers=H, json=data)
    if r.status_code not in (200, 201):
        raise Exception(f"POST {table}: {r.status_code} {r.text[:400]}")
    return r.json()

print("=" * 60)
print("  Agregando jugadoras nuevas de buena fe")
print("=" * 60)

jugadoras = [
    {
        "id":        "f_fer_18",
        "equipo_id": "f_ferrobre",
        "nombre":    "Ruesca Pinto Paila Valeria",
        "fecha_nac": "1998-02-03",
        "dni":       "95598009",
    },
    {
        "id":        "f_fer_19",
        "equipo_id": "f_ferrobre",
        "nombre":    "Tapia Ana Valeria",
        "fecha_nac": "1994-02-25",
        "dni":       "37919742",
    },
    {
        "id":        "f_uag_19",
        "equipo_id": "f_union",
        "nombre":    "Gonzalez Ayelen",
    },
    {
        "id":        "f_psc_19",
        "equipo_id": "f_pilar",
        "nombre":    "Diani Elisa",
    },
]

for j in jugadoras:
    try:
        res = post("jugadoras_femenino", j)
        print(f"  ✅ {res[0]['id']} — {res[0]['nombre']} ({res[0]['equipo_id']})")
    except Exception as e:
        print(f"  ❌ {j['id']}: {e}")

print("\n🎉 Listo. Jugadoras agregadas al roster.")
print("   Ahora podés cargarles stats en los partidos correspondientes.")
