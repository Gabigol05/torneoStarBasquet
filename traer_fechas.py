import requests

# Tu URL real armada con tu ID de proyecto
SUPABASE_URL = "https://weveobptegokulxsqsuf.supabase.co/rest/v1/fechas_femenino"
SUPABASE_KEY = "sb_publishable_S_ajr8bsxkMaSeUalyhkSA_Jo591cyp"

# Supabase exige estos headers para dejarte pasar
headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

print("🔄 Conectando con Supabase para traer las fechas...")

# Hacemos la petición GET
response = requests.get(SUPABASE_URL, headers=headers)

if response.status_code == 200:
    fechas = response.json()
    print("\n✨ ¡Sincronizado! Fechas actuales en la base de datos:")
    print("=" * 50)
    fechas_ordenadas = sorted(fechas, key=lambda x: x.get('numero', 0))
    for fecha in fechas_ordenadas:
        print(f"📅 Número: {fecha.get('numero')} | Descripción: {fecha.get('descripcion')}")
    print("=" * 50)
else:
    print(f"❌ Error al conectar: {response.status_code}")
    print(response.text)