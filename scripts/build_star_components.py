"""
Parte el <body> de FrontEnd/torneo-star-pro.html en componentes React (JSX)
y escribe frontend/src/components/*.jsx + PageHome.jsx

Ejecutar desde la raíz del repo:
    python scripts/build_star_components.py
"""

from __future__ import annotations

import re
from pathlib import Path


def transform_chunk(chunk: str) -> str:
    s = chunk
    s = s.replace("class=", "className=")
    s = s.replace("stroke-width=", "strokeWidth=")
    s = s.replace("stroke-linecap=", "strokeLinecap=")
    s = s.replace("stroke-linejoin=", "strokeLinejoin=")
    s = s.replace("fill-rule=", "fillRule=")
    s = s.replace("clip-rule=", "clipRule=")

    tab_map = [
        (r'onclick="tab\(\'f\',\'tabla\',this\)"', 'data-star-tab="f:tabla"'),
        (r'onclick="tab\(\'f\',\'fixtures\',this\)"', 'data-star-tab="f:fixtures"'),
        (r'onclick="tab\(\'f\',\'jugadoras\',this\)"', 'data-star-tab="f:jugadoras"'),
        (r'onclick="tab\(\'f\',\'equipos-f\',this\)"', 'data-star-tab="f:equipos-f"'),
        (r'onclick="tab\(\'m\',\'tabla\',this\)"', 'data-star-tab="m:tabla"'),
        (r'onclick="tab\(\'m\',\'fixtures\',this\)"', 'data-star-tab="m:fixtures"'),
        (r'onclick="tab\(\'m\',\'jugadores\',this\)"', 'data-star-tab="m:jugadores"'),
        (r'onclick="tab\(\'m\',\'equipos-m\',this\)"', 'data-star-tab="m:equipos-m"'),
    ]
    for pat, repl in tab_map:
        s = re.sub(pat, repl, s)

    s = s.replace(
        'oninput="filterPlayers(this.value,\'f-jugadoras\')"',
        'data-star-filter="f-jugadoras"',
    )
    s = s.replace(
        'oninput="filterPlayers(this.value,\'m-jugadores\')"',
        'data-star-filter="m-jugadores"',
    )

    s = s.replace("<br>", "<br />")
    s = s.replace("<br >", "<br />")
    s = s.replace("<br/>", "<br />")

    s = re.sub(
        r"<!--([\s\S]*?)-->",
        lambda m: "{/*" + m.group(1).replace("*/", "* /") + "*/}",
        s,
    )

    s = re.sub(r"<button(?![^>]*type=)", '<button type="button"', s)

    s = re.sub(r"<input([^>]*?)(?<!/)>", r"<input\1 />", s)

    return s


def indent(text: str, spaces: int) -> str:
    pad = " " * spaces
    return "\n".join(pad + line if line.strip() else line for line in text.splitlines())


def emit_component(out_dir: Path, name: str, inner: str) -> None:
    inner_jsx = indent(inner.strip(), 6)
    content = f'''/* eslint-disable react/no-unknown-property */
/* Fragmento fiel al HTML original (ver scripts/build_star_components.py). */

export function {name}() {{
  return (
    <>
{inner_jsx}
    </>
  );
}}
'''
    (out_dir / f"{name}.jsx").write_text(content, encoding="utf-8")


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    html = (root / "FrontEnd" / "torneo-star-pro.html").read_text(encoding="utf-8")
    low = html.lower()
    b0 = low.index("<body>") + len("<body>")
    b1 = low.index("</body>")
    body = html[b0:b1]

    def exclusive(start: str, end: str) -> str:
        s = body.index(start)
        e = body.index(end, s + len(start))
        return body[s:e]

    def inclusive(start: str, end: str) -> str:
        s = body.index(start)
        e = body.index(end, s + len(start)) + len(end)
        return body[s:e]

    slices: list[tuple[str, str, str, str]] = [
        ("TopBar", "exclusive", "<!-- TOP BAR -->", "<!-- NAV -->"),
        ("Navbar", "exclusive", "<!-- NAV -->", "<!-- HERO -->"),
        ("Hero", "exclusive", "<!-- HERO -->", "<!-- SCORE TICKER -->"),
        ("ScoreTicker", "exclusive", "<!-- SCORE TICKER -->", "<!-- GLOBAL KPIs -->"),
        ("SeasonKpis", "exclusive", "<!-- GLOBAL KPIs -->", '<div class="full-rule"></div>'),
        ("TorneoFemenino", "inclusive", '<div class="torneo-section fem" id="femenino">', "</div><!-- torneo-section fem -->"),
        ("TorneoMasculino", "inclusive", '<div class="torneo-section masc" id="masculino">', "</div><!-- masc section -->"),
        ("LeadersSection", "exclusive", '<section class="page-section" id="jugadores">', "<!-- PLAYOFFS BRACKET -->"),
        ("PlayoffsBracket", "exclusive", '<section class="page-section" id="bracket">', "<!-- FOOTER -->"),
        ("Footer", "exclusive", "<!-- FOOTER -->", "<script>"),
    ]

    out_dir = root / "frontend" / "src" / "components"
    out_dir.mkdir(parents=True, exist_ok=True)

    for name, mode, start, end in slices:
        if mode == "exclusive":
            raw = exclusive(start, end)
        elif mode == "inclusive":
            raw = inclusive(start, end)
        else:
            raise ValueError(mode)
        emit_component(out_dir, name, transform_chunk(raw))

    imports = "\n".join(
        f"import {{ {n} }} from './{n}.jsx';" for n, _, _, _ in slices
    )

    page = f'''/* eslint-disable react/no-unknown-property */
import {{ useEffect }} from "react";
{imports}

function duplicateTicker() {{
  const t = document.getElementById("ticker");
  if (t && !t.dataset.duplicated) {{
    t.innerHTML += t.innerHTML;
    t.dataset.duplicated = "1";
  }}
}}

function installTabDelegation() {{
  const handler = (ev) => {{
    const btn = ev.target.closest("[data-star-tab]");
    if (!btn) return;
    const raw = btn.getAttribute("data-star-tab");
    if (!raw) return;
    const [torneo, name] = raw.split(":");
    const prefix = torneo === "f" ? "f" : "m";
    document.querySelectorAll(`[id^="${{prefix}}-"]`).forEach((p) => p.classList.remove("active"));
    const nav = btn.closest(".tab-nav");
    if (nav) {{
      nav.querySelectorAll(".tab-btn").forEach((b) => {{
        b.classList.remove("active-fem", "active-masc");
      }});
    }}
    const target = document.getElementById(`${{prefix}}-${{name}}`);
    if (target) target.classList.add("active");
    btn.classList.add(torneo === "f" ? "active-fem" : "active-masc");
  }};
  document.addEventListener("click", handler);
  return () => document.removeEventListener("click", handler);
}}

function installFilterDelegation() {{
  const onInput = (ev) => {{
    const el = ev.target;
    if (!(el instanceof HTMLInputElement)) return;
    const paneId = el.getAttribute("data-star-filter");
    if (!paneId) return;
    const pane = document.getElementById(paneId);
    const table = pane?.querySelector("tbody");
    if (!table) return;
    const q = el.value.toLowerCase();
    table.querySelectorAll("tr").forEach((row) => {{
      row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
    }});
  }};
  document.addEventListener("input", onInput);
  return () => document.removeEventListener("input", onInput);
}}

function installFilterButtons() {{
  const cleanups = [];
  document.querySelectorAll(".player-filter").forEach((bar) => {{
    const btns = bar.querySelectorAll(".filter-btn");
    const listeners = [];
    btns.forEach((btn) => {{
      const fn = () => {{
        btns.forEach((b) => b.classList.remove("on"));
        btn.classList.add("on");
      }};
      btn.addEventListener("click", fn);
      listeners.push(() => btn.removeEventListener("click", fn));
    }});
    cleanups.push(() => listeners.forEach((c) => c()));
  }});
  return () => cleanups.forEach((c) => c());
}}

export function PageHome() {{
  useEffect(() => {{
    duplicateTicker();
    const offTabs = installTabDelegation();
    const offInputs = installFilterDelegation();
    const offFilterBtns = installFilterButtons();
    return () => {{
      offTabs();
      offInputs();
      offFilterBtns();
    }};
  }}, []);

  return (
    <>
      <TopBar />
      <Navbar />
      <Hero />
      <ScoreTicker />
      <SeasonKpis />
      <div className="full-rule"></div>
      <TorneoFemenino />
      <div className="full-rule"></div>
      <TorneoMasculino />
      <div className="full-rule"></div>
      <LeadersSection />
      <div className="full-rule"></div>
      <PlayoffsBracket />
      <Footer />
    </>
  );
}}
'''
    (out_dir / "PageHome.jsx").write_text(page, encoding="utf-8")
    print(f"Componentes generados en {out_dir}")


if __name__ == "__main__":
    main()
