import { useEffect } from "react";
import { Navbar }        from './Navbar.jsx';
import { Hero }          from './Hero.jsx';
import { SeasonKpis }    from './SeasonKpis.jsx';
import { TorneoView }    from './TorneoView.jsx';
import { LeadersSection }from './LeadersSection.jsx';
import { PlayoffsBracket}from './PlayoffsBracket.jsx';
import { Footer }        from './Footer.jsx';
import { useScrollReveal } from '../hooks/useScrollReveal';

function duplicateTicker() {
  const t = document.getElementById("ticker");
  if (t && !t.dataset.duplicated) {
    t.innerHTML += t.innerHTML;
    t.dataset.duplicated = "1";
  }
}

export function PageHome() {
  useScrollReveal();           // activa animaciones de entrada en toda la página

  useEffect(() => {
    duplicateTicker();
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
