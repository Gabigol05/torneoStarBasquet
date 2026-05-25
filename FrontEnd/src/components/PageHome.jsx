/* eslint-disable react/no-unknown-property */
import { useEffect } from "react";
import { Navbar } from './Navbar.jsx';
import { Hero } from './Hero.jsx';
import { SeasonKpis } from './SeasonKpis.jsx';
import { TorneoView } from './TorneoView.jsx';
import { LeadersSection } from './LeadersSection.jsx';
import { PlayoffsBracket } from './PlayoffsBracket.jsx';
import { Footer } from './Footer.jsx';

function duplicateTicker() {
  const t = document.getElementById("ticker");
  if (t && !t.dataset.duplicated) {
    t.innerHTML += t.innerHTML;
    t.dataset.duplicated = "1";
  }
}

function installTabDelegation() {
  const handler = (ev) => {
    const btn = ev.target.closest("[data-star-tab]");
    if (!btn) return;
    const raw = btn.getAttribute("data-star-tab");
    if (!raw) return;
    const [torneo, name] = raw.split(":");
    const prefix = torneo === "f" ? "f" : "m";
    document.querySelectorAll(`[id^="${prefix}-"]`).forEach((p) => p.classList.remove("active"));
    const nav = btn.closest(".tab-nav");
    if (nav) {
      nav.querySelectorAll(".tab-btn").forEach((b) => {
        b.classList.remove("active-fem", "active-masc", "active");
      });
    }
    const target = document.getElementById(`${prefix}-${name}`);
    if (target) target.classList.add("active");
    btn.classList.add("active");
  };
  document.addEventListener("click", handler);
  return () => document.removeEventListener("click", handler);
}

function installFilterDelegation() {
  const onInput = (ev) => {
    const el = ev.target;
    if (!(el instanceof HTMLInputElement)) return;
    const paneId = el.getAttribute("data-star-filter");
    if (!paneId) return;
    const pane = document.getElementById(paneId);
    const table = pane?.querySelector("tbody");
    if (!table) return;
    const q = el.value.toLowerCase();
    table.querySelectorAll("tr").forEach((row) => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  };
  document.addEventListener("input", onInput);
  return () => document.removeEventListener("input", onInput);
}

function installFilterButtons() {
  const cleanups = [];
  document.querySelectorAll(".player-filter").forEach((bar) => {
    const btns = bar.querySelectorAll(".filter-btn");
    const listeners = [];
    btns.forEach((btn) => {
      const fn = () => {
        btns.forEach((b) => b.classList.remove("on"));
        btn.classList.add("on");
      };
      btn.addEventListener("click", fn);
      listeners.push(() => btn.removeEventListener("click", fn));
    });
    cleanups.push(() => listeners.forEach((c) => c()));
  });
  return () => cleanups.forEach((c) => c());
}

export function PageHome() {
  useEffect(() => {
    duplicateTicker();
    const offTabs = installTabDelegation();
    const offInputs = installFilterDelegation();
    const offFilterBtns = installFilterButtons();
    return () => {
      offTabs();
      offInputs();
      offFilterBtns();
    };
  }, []);

  return (
    <>
      <Navbar />
      <Hero />
      <SeasonKpis />
      <div className="full-rule"></div>
      <TorneoView />
      <div className="full-rule"></div>
      <LeadersSection />
      <div className="full-rule"></div>
      <PlayoffsBracket />
      <Footer />
    </>
  );
}
