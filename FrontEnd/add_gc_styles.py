import os

css_path = r"C:\Users\gabri\OneDrive\Escritorio\Proyecto_TorneoStar\torneoStarBasquet\FrontEnd\src\styles\torneo-star.css"

modal_css = """
/* ══════════════════════════════
   GAME CENTER MODAL
══════════════════════════════ */
.gc-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(8, 12, 18, 0.85);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fadeIn 0.3s ease forwards;
}

.gc-modal {
  background: var(--dark3);
  border: 1px solid var(--border-primary-strong);
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 24px 60px rgba(0,0,0,0.5);
  animation: zoomIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  display: flex;
  flex-direction: column;
}

.gc-header {
  padding: 24px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  position: relative;
  background: linear-gradient(180deg, var(--bg-main) 0%, transparent 100%);
}

.gc-close-btn {
  position: absolute;
  top: 16px; right: 16px;
  background: transparent;
  border: none;
  color: var(--gray);
  font-size: 24px;
  cursor: pointer;
  transition: color 0.2s;
}
.gc-close-btn:hover { color: #fff; }

.gc-score-board {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
}

.gc-team {
  text-align: center;
  flex: 1;
}

.gc-team-logo {
  width: 64px; height: 64px;
  border-radius: 50%;
  background: var(--dark5);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Bebas Neue'; font-size: 24px;
  margin: 0 auto 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.gc-team-name {
  font-family: 'Barlow Condensed'; font-weight: 700;
  font-size: 20px; text-transform: uppercase;
}

.gc-final-score {
  font-family: 'Bebas Neue';
  font-size: 48px;
  color: var(--color-accent);
  padding: 0 24px;
}

.gc-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.gc-section-title {
  font-family: 'Barlow Condensed'; font-weight: 700;
  font-size: 18px; color: var(--gray);
  text-transform: uppercase; letter-spacing: 1px;
  margin-bottom: 16px;
  text-align: center;
}

/* Tabla de Cuartos */
.gc-quarters-table {
  width: 100%; border-collapse: collapse;
  font-family: 'Barlow Condensed';
  text-align: center;
}
.gc-quarters-table th { color: var(--gray2); padding-bottom: 8px; font-weight: 600;}
.gc-quarters-table td { padding: 8px 4px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 18px; }
.gc-quarters-table td:first-child { text-align: left; font-weight: 700; color: var(--white); }
.gc-quarters-table td:last-child { font-weight: 700; color: var(--color-accent); }

/* Barras de Stats */
.gc-stat-row { margin-bottom: 12px; }
.gc-stat-labels { display: flex; justify-content: space-between; font-family: 'Barlow Condensed'; font-size: 14px; margin-bottom: 4px; font-weight: 600;}
.gc-stat-bar-bg { width: 100%; height: 6px; background: var(--dark5); border-radius: 4px; display: flex; overflow: hidden; }
.gc-stat-bar-left, .gc-stat-bar-right { height: 100%; }
.gc-stat-bar-left { background: var(--color-primary); }
.gc-stat-bar-right { background: var(--gray2); }

/* Líderes */
.gc-leaders {
  display: flex; gap: 16px; justify-content: space-between;
}
.gc-leader-card {
  flex: 1; background: var(--dark4); border-radius: 8px; padding: 12px;
  display: flex; align-items: center; gap: 12px;
}
.gc-leader-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: var(--dark5);
  display: flex; align-items: center; justify-content: center;
  color: var(--gray);
}
.gc-leader-info { flex: 1; }
.gc-leader-name { font-size: 14px; font-weight: 600; line-height: 1.2; }
.gc-leader-stat { font-family: 'Bebas Neue'; font-size: 18px; color: var(--color-accent); line-height: 1.2; }

@keyframes zoomIn {
  0% { opacity: 0; transform: scale(0.95); }
  100% { opacity: 1; transform: scale(1); }
}
"""

with open(css_path, "r", encoding="utf-8") as f:
    content = f.read()

if "GAME CENTER MODAL" not in content:
    with open(css_path, "a", encoding="utf-8") as f:
        f.write("\n" + modal_css)
    print("Game Center CSS added.")
else:
    print("CSS already exists.")
