import os

css_path = r"C:\Users\gabri\OneDrive\Escritorio\Proyecto_TorneoStar\torneoStarBasquet\FrontEnd\src\styles\torneo-star.css"

new_css = """
/* ══════════════════════════════
   LIVE YOUTUBE BADGE
══════════════════════════════ */
.live-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: rgba(220, 38, 38, 0.15);
  border: 1px solid #dc2626;
  color: #ef4444;
  padding: 6px 12px;
  border-radius: 20px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 1px;
  text-decoration: none;
  transition: all 0.2s ease;
  box-shadow: 0 0 10px rgba(220, 38, 38, 0.2);
}

.live-badge:hover {
  background-color: #dc2626;
  color: #fff;
  box-shadow: 0 0 20px rgba(220, 38, 38, 0.4);
  transform: translateY(-1px);
}

.live-dot {
  width: 8px;
  height: 8px;
  background-color: #ef4444;
  border-radius: 50%;
  animation: pulse-red 1.5s infinite;
}

.live-badge:hover .live-dot {
  background-color: #fff;
}

@keyframes pulse-red {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
  70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

@media (max-width: 768px) {
  .live-text { display: none; }
  .live-badge { padding: 6px 8px; }
}
"""

with open(css_path, "r", encoding="utf-8") as f:
    content = f.read()

if "LIVE YOUTUBE BADGE" not in content:
    with open(css_path, "a", encoding="utf-8") as f:
        f.write("\n" + new_css)
    print("New live styles added.")
else:
    print("CSS already exists.")
