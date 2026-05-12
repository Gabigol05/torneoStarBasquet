import os
import re

css_path = r"c:\Users\gabri\Desktop\Proyecto_TorneoStar\torneoStarBasquet\FrontEnd\src\styles\torneo-star.css"

with open(css_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update max-width
content = content.replace("max-width:1280px", "max-width:1440px")

# 2. Update Hero clamp
content = content.replace("clamp(80px,14vw,180px)", "clamp(60px,10vw,140px)")

# 3. Update padding in topbar, nav, and page-section for wider look
content = content.replace("padding:0 32px;", "padding:0 48px;")
content = content.replace("padding:80px 32px;", "padding:100px 48px;")
# Also torneo-inner padding
content = content.replace("padding:0 32px}", "padding:0 48px}")

# 4. Map font-sizes using regex
def bump_font_size(match):
    size = int(match.group(1))
    # Bump rules:
    if size == 9: new_size = 12
    elif size == 10: new_size = 13
    elif size == 11: new_size = 14
    elif size == 12: new_size = 15
    elif size == 13: new_size = 15
    elif size == 14: new_size = 16
    elif size == 15: new_size = 16
    elif size == 16: new_size = 18
    elif size == 17: new_size = 19
    elif size == 18: new_size = 20
    elif size == 22: new_size = 26
    elif size == 44: new_size = 52
    elif size == 48: new_size = 56
    else: new_size = size # Leave 20, 24, 32 etc untouched unless needed
    return f"font-size:{new_size}px"

content = re.sub(r'font-size:(\d+)px', bump_font_size, content)

with open(css_path, "w", encoding="utf-8") as f:
    f.write(content)

print("CSS updated successfully!")
