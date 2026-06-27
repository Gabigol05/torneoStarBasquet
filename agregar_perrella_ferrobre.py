"""
agregar_perrella_ferrobre.py
=============================
Agrega Perrella Kiara (f_fer_20) al roster de Ferrobre
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

r = requests.post(f"{SUPABASE_URL}/jugadoras_femenino", headers=H, json={
    "id":        "f_fer_20",
    "equipo_id": "f_ferrobre",
    "nombre":    "Perrella Kiara",
    "fecha_nac": "2003-06-23",
    "dni":       "44749449",
})
if r.status_code in (200, 201):
    print(f"✅ {r.json()[0]['id']} — {r.json()[0]['nombre']} agregada correctamente")
else:
    raise Exception(f"POST: {r.status_code} {r.text[:400]}")
