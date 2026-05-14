import re

css_path = r"c:\Users\gabri\Desktop\Proyecto_TorneoStar\torneoStarBasquet\FrontEnd\src\styles\torneo-star.css"

with open(css_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix the body background and transition
# Find the body block
if "transition: background-color 0.6s ease-in-out;" not in content:
    content = re.sub(
        r'body\s*\{([^\}]+)background:\s*var\(--dark\);([^\}]+)\}',
        r'body {\1background: var(--bg-body, var(--dark)); transition: background-color 0.6s ease-in-out;\2}',
        content
    )

# Add themes if missing
themes = """
body.theme-masculino {
  --color-primary: var(--masc);
  --color-accent: var(--masc2);
  --bg-main: var(--masc-bg);
  --shadow-primary: rgba(24,120,232,0.35);
  --border-primary: rgba(24,120,232,0.25);
  --border-primary-strong: rgba(24,120,232,0.5);
  --bg-body: #08101A;
}

body.theme-femenino {
  --color-primary: var(--fem);
  --color-accent: var(--fem2);
  --bg-main: var(--fem-bg);
  --shadow-primary: rgba(232,24,122,0.35);
  --border-primary: rgba(232,24,122,0.25);
  --border-primary-strong: rgba(232,24,122,0.5);
  --bg-body: #1A0812;
}

@keyframes fadeRefresh {
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}

.fade-refresh {
  animation: fadeRefresh 0.4s ease-out forwards;
}
"""

if "body.theme-masculino" not in content:
    # Just append it at the end of the root block or anywhere global
    content = re.sub(r'(:root\s*\{[^}]+\})', r'\1\n' + themes, content)
else:
    # If it was there, we need to add --bg-body to them and @keyframes
    # Let's just replace them
    content = re.sub(r'body\.theme-masculino\s*\{[^}]+\}', '', content)
    content = re.sub(r'body\.theme-femenino\s*\{[^}]+\}', '', content)
    content = re.sub(r'(:root\s*\{[^}]+\})', r'\1\n' + themes, content)

with open(css_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Themes and transitions added!")
