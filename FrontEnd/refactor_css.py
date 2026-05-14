import re

css_path = r"c:\Users\gabri\Desktop\Proyecto_TorneoStar\torneoStarBasquet\FrontEnd\src\styles\torneo-star.css"

with open(css_path, "r", encoding="utf-8") as f:
    content = f.read()

# Insert the themes
themes = """
body.theme-masculino {
  --color-primary: var(--masc);
  --color-accent: var(--masc2);
  --bg-main: var(--masc-bg);
  --shadow-primary: rgba(24,120,232,0.35);
  --border-primary: rgba(24,120,232,0.25);
  --border-primary-strong: rgba(24,120,232,0.5);
}

body.theme-femenino {
  --color-primary: var(--fem);
  --color-accent: var(--fem2);
  --bg-main: var(--fem-bg);
  --shadow-primary: rgba(232,24,122,0.35);
  --border-primary: rgba(232,24,122,0.25);
  --border-primary-strong: rgba(232,24,122,0.5);
}
"""

if "body.theme-masculino" not in content:
    content = content.replace("}\n*{margin:0", "}\n" + themes + "\n*{margin:0")

# Replacements to use variables in generic components
# For Torneo section bg
content = re.sub(r'\.torneo-section\.fem::before\{[^\}]+\}', '', content)
content = re.sub(r'\.torneo-section\.masc::before\{[^\}]+\}', '', content)
# Add generic torneo-section::before
if "background:radial-gradient(ellipse 60% 60% at 50% 50%,var(--bg-main) 0%,transparent 70%);" not in content:
    content = content.replace(".torneo-section::before{", ".torneo-section::before{\n  background:radial-gradient(ellipse 60% 60% at 50% 50%,var(--bg-main) 0%,transparent 70%);")

# Gender Pill
content = re.sub(r'\.gender-pill\.fem\{[^\}]+\}', '', content)
content = re.sub(r'\.gender-pill\.masc\{[^\}]+\}', '', content)
content = content.replace(".gender-pill{", ".gender-pill{\n  background:var(--bg-main);\n  color:var(--color-accent);\n  border:1px solid var(--border-primary);")

# Gender Title
content = re.sub(r'\.gender-title\.fem\{[^\}]+\}', '', content)
content = re.sub(r'\.gender-title\.masc\{[^\}]+\}', '', content)
content = content.replace(".gender-title{", ".gender-title{\n  color:var(--color-accent);")

# Match Card
content = re.sub(r'\.match-card\.fem:hover\{[^\}]+\}', '', content)
content = re.sub(r'\.match-card\.masc:hover\{[^\}]+\}', '', content)
content = content.replace(".match-card:hover{", ".match-card:hover{\n  border-color:var(--border-primary);")

# Leader Card
content = re.sub(r'\.leader-card\.fem::before\{[^\}]+\}', '', content)
content = re.sub(r'\.leader-card\.masc::before\{[^\}]+\}', '', content)
content = content.replace(".leader-card::before{", ".leader-card::before{\n  background:linear-gradient(90deg,var(--color-primary),var(--color-accent));")

# Filter Btn
content = re.sub(r'\.filter-btn\.on\.fem\{[^\}]+\}', '', content)
content = re.sub(r'\.filter-btn\.on\.masc\{[^\}]+\}', '', content)
content = content.replace(".filter-btn.on{", ".filter-btn.on{\n  background:var(--bg-main);border-color:var(--border-primary-strong);color:var(--color-accent);")

# Nav links
content = re.sub(r'\.nav-links a\.nav-fem\{[^\}]+\}', '', content)
content = re.sub(r'\.nav-links a\.nav-fem:hover\{[^\}]+\}', '', content)
content = re.sub(r'\.nav-links a\.nav-masc\{[^\}]+\}', '', content)
content = re.sub(r'\.nav-links a\.nav-masc:hover\{[^\}]+\}', '', content)
content = content.replace(".nav-links a.active{", ".nav-links a.active{\n  color:var(--color-accent);\n  background:var(--bg-main);")

# Tab buttons
content = re.sub(r'\.tab-btn\.active-fem\{[^\}]+\}', '', content)
content = re.sub(r'\.tab-btn\.active-masc\{[^\}]+\}', '', content)
content = content.replace(".tab-btn.active{", ".tab-btn.active{\n  color:var(--color-accent);border-bottom-color:var(--color-accent);")

# Add some styles for TournamentSelector
selector_styles = """
/* ══════════════════════════════
   TOURNAMENT SELECTOR
══════════════════════════════ */
.tournament-selector-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 48px;
  animation: fadeUp .8s .35s ease both;
}

.tournament-toggle {
  position: relative;
  width: 220px;
  height: 54px;
  background: var(--dark4);
  border-radius: 30px;
  border: 1px solid rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px;
}

.tournament-toggle-slider {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 104px;
  height: 44px;
  background: var(--color-primary);
  border-radius: 24px;
  transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), background 0.4s;
  box-shadow: 0 4px 12px var(--shadow-primary);
}

.tournament-toggle.mode-masculino .tournament-toggle-slider {
  transform: translateX(0);
}

.tournament-toggle.mode-femenino .tournament-toggle-slider {
  transform: translateX(106px);
}

.tournament-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  z-index: 2;
  color: var(--gray);
  transition: color 0.3s;
}

.tournament-option.active {
  color: #fff;
}

.tournament-option svg {
  width: 18px;
  height: 18px;
}
"""

if "TOURNAMENT SELECTOR" not in content:
    content += "\n" + selector_styles

with open(css_path, "w", encoding="utf-8") as f:
    f.write(content)

print("CSS variables and selector styles injected.")
