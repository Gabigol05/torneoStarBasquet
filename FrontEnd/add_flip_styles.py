import os

css_path = r"C:\Users\gabri\OneDrive\Escritorio\Proyecto_TorneoStar\torneoStarBasquet\FrontEnd\src\styles\torneo-star.css"

new_css = """
/* ══════════════════════════════
   3D FLIP CARDS (TEAMS)
══════════════════════════════ */
.teams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 24px;
  padding: 16px 0;
  perspective: 1000px; /* Activa el espacio 3D */
}

.flip-card {
  background-color: transparent;
  width: 100%;
  height: 320px;
  perspective: 1000px;
  cursor: pointer;
}

.flip-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: center;
  transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transform-style: preserve-3d;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}

.flip-card:hover .flip-card-inner {
  transform: rotateY(180deg);
}

.flip-card-front, .flip-card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.flip-card-front {
  background: linear-gradient(145deg, var(--dark2), var(--dark4));
  border: 1px solid rgba(255,255,255,0.1);
  justify-content: center;
  align-items: center;
}

.fc-logo-wrap {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  margin-bottom: 20px;
  background: var(--dark5);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 20px rgba(0,0,0,0.5);
  border: 4px solid var(--color-primary);
  overflow: hidden;
}

.fc-logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.fc-name {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 32px;
  color: var(--white);
  letter-spacing: 2px;
  margin: 0;
  line-height: 1;
}

.fc-subtitle {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 14px;
  color: var(--color-accent);
  text-transform: uppercase;
  font-weight: 700;
  margin-top: 4px;
}

.flip-card-back {
  background: var(--dark2);
  color: white;
  transform: rotateY(180deg);
  border: 2px solid var(--color-primary);
  justify-content: center;
  align-items: center;
  padding: 24px;
}

.fc-back-logo {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  opacity: 0.2;
  position: absolute;
  top: 20px;
  right: 20px;
}

.fc-record-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 14px;
  color: var(--gray);
  text-transform: uppercase;
  letter-spacing: 2px;
  font-weight: 700;
}

.fc-record-val {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 48px;
  color: var(--color-primary);
  line-height: 1;
  margin-bottom: 8px;
}

.fc-team-name {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 24px;
  color: var(--white);
  line-height: 1.2;
  margin-top: 20px;
  letter-spacing: 1px;
}
"""

with open(css_path, "r", encoding="utf-8") as f:
    content = f.read()

if "3D FLIP CARDS" not in content:
    with open(css_path, "a", encoding="utf-8") as f:
        f.write("\n" + new_css)
    print("New flip card styles added.")
else:
    print("CSS already exists.")
