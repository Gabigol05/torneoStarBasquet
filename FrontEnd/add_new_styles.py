import os

css_path = r"C:\Users\gabri\OneDrive\Escritorio\Proyecto_TorneoStar\torneoStarBasquet\FrontEnd\src\styles\torneo-star.css"

new_css = """
/* ══════════════════════════════
   UPCOMING MATCH WIDGET (VOTING)
══════════════════════════════ */
.upcoming-widget {
  border-left: 4px solid var(--color-primary);
  display: flex; flex-direction: column;
}

.vote-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255,255,255,0.05);
  text-align: center;
}

.vote-question {
  font-family: 'Barlow Condensed'; font-weight: 700;
  font-size: 14px; color: var(--white);
  letter-spacing: 1px; margin-bottom: 12px;
}

.vote-buttons {
  display: flex; gap: 8px;
}

.vote-btn {
  flex: 1; padding: 8px; border-radius: 4px;
  border: 1px solid var(--border-primary-strong);
  background: var(--dark4);
  color: var(--white);
  font-family: 'Barlow Condensed'; font-weight: 600; font-size: 14px;
  cursor: pointer; transition: all 0.2s;
}

.vote-btn:hover {
  background: var(--color-primary);
  color: #fff;
}

.vote-results {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255,255,255,0.05);
  text-align: center;
}

.vote-bar-container {
  margin-top: 8px;
}

.vote-bar {
  width: 100%; height: 8px; border-radius: 4px;
  background: var(--dark5); display: flex; overflow: hidden;
  margin-bottom: 4px;
}

.vote-bar-fill { height: 100%; transition: width 1s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.fill-a { background: var(--color-primary); }
.fill-b { background: var(--gray2); }

.vote-labels {
  display: flex; justify-content: space-between;
  font-family: 'Bebas Neue'; font-size: 16px; color: var(--gray);
}
.vote-pct { color: var(--white); }

/* ══════════════════════════════
   PLAYER PROFILE MODAL & HUB
══════════════════════════════ */
.pp-modal {
  background: var(--dark2);
  border: 1px solid var(--border-primary-strong);
  border-radius: 16px;
  width: 100%; max-width: 500px;
  max-height: 90vh; overflow-y: auto;
  box-shadow: 0 24px 60px rgba(0,0,0,0.5);
  animation: zoomIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.pp-card {
  position: relative;
  background: linear-gradient(135deg, var(--bg-main) 0%, var(--dark4) 100%);
  padding: 32px 24px 24px;
  text-align: center;
  overflow: hidden;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

/* El brillo/reflejo estilo carta */
.pp-card::before {
  content: ''; position: absolute;
  top: -50%; left: -50%; width: 200%; height: 200%;
  background: linear-gradient(to bottom right, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 100%);
  transform: rotate(30deg); pointer-events: none;
}

.pp-avatar-container {
  width: 120px; height: 120px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: var(--dark5);
  border: 4px solid var(--color-primary);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 24px var(--shadow-primary);
  overflow: hidden;
}

.pp-avatar-container svg { width: 80%; height: 80%; color: var(--gray); }

.pp-name {
  font-family: 'Bebas Neue'; font-size: 36px;
  letter-spacing: 1px; color: var(--white); line-height: 1;
}

.pp-team {
  font-family: 'Barlow Condensed'; font-weight: 600; font-size: 16px;
  color: var(--color-accent); text-transform: uppercase;
  margin-top: 4px;
}

.pp-stats-grid {
  display: flex; justify-content: center; gap: 24px;
  margin-top: 24px;
}

.pp-stat-box { text-align: center; }
.pp-stat-val { font-family: 'Bebas Neue'; font-size: 28px; color: var(--white); line-height: 1; }
.pp-stat-lbl { font-family: 'Barlow Condensed'; font-weight: 600; font-size: 12px; color: var(--gray); }

.pp-body {
  padding: 24px;
}

.pp-chart-title {
  font-family: 'Barlow Condensed'; font-weight: 700; font-size: 18px;
  color: var(--white); text-transform: uppercase; margin-bottom: 16px;
}

/* Directorio de Jugadores */
.search-bar {
  width: 100%; padding: 12px 16px;
  background: var(--dark4); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px; color: var(--white);
  font-family: 'Barlow', sans-serif; font-size: 16px;
  margin-bottom: 24px; outline: none; transition: border-color 0.2s;
}
.search-bar:focus { border-color: var(--color-primary); }

.players-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.player-item {
  background: var(--dark3); border-radius: 8px; padding: 12px;
  display: flex; align-items: center; gap: 12px;
  cursor: pointer; transition: transform 0.2s, background 0.2s;
}
.player-item:hover { transform: translateY(-2px); background: var(--dark4); }
.player-item-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--dark5); display: flex; align-items: center; justify-content: center; }
.player-item-info { flex: 1; }
.player-item-name { font-weight: 600; font-size: 14px; }
.player-item-team { font-size: 12px; color: var(--gray); }

"""

with open(css_path, "r", encoding="utf-8") as f:
    content = f.read()

if "UPCOMING MATCH WIDGET" not in content:
    with open(css_path, "a", encoding="utf-8") as f:
        f.write("\n" + new_css)
    print("New styles added.")
else:
    print("CSS already exists.")
