import os
import re
import json

directory = r"c:\Users\gabri\Desktop\Proyecto_TorneoStar\torneoStarBasquet\FrontEnd\src\components"

def style_to_jsx(match):
    style_str = match.group(1)
    props = style_str.split(";")
    jsx_props = []
    for prop in props:
        prop = prop.strip()
        if not prop:
            continue
        if ":" not in prop:
            continue
        key, value = prop.split(":", 1)
        key = key.strip()
        value = value.strip()
        
        # CamelCase the key
        parts = key.split("-")
        key_camel = parts[0] + "".join(p.capitalize() for p in parts[1:])
        
        # Convert value to JSON string to safely escape quotes
        # Note: if it has single quotes inside, JSON uses double quotes outside
        value_str = json.dumps(value)
        jsx_props.append(f"{key_camel}: {value_str}")
        
    return "style={{" + ", ".join(jsx_props) + "}}"

for filename in os.listdir(directory):
    if not filename.endswith(".jsx"):
        continue
    filepath = os.path.join(directory, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    new_content = re.sub(r'style="([^"]*)"', style_to_jsx, content)
    
    if new_content != content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Fixed {filename}")
