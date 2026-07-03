const fs = require('fs');

const src  = 'FrontEnd/src/components/TorneoView.jsx';
const dest = '../src/components/TorneoView.jsx';

let lines = fs.readFileSync(src, 'utf8').split('\n');

lines = lines.filter(line => {
  if (line.includes("import logoMambas")) return false;
  if (line.includes("import logoToros")) return false;
  if (line.includes("import logoSpartans")) return false;
  if (line.includes("const TEAMS_MASC = [")) return false;
  if (line.includes("Black Mambas") && line.includes("logoMambas")) return false;
  if (line.includes("Los Toros") && line.includes("logoToros")) return false;
  if (line.includes("Spartans") && line.includes("logoSpartans")) return false;
  return true;
});

let t = lines.join('\n');
t = t.replace(/TEAMS_MASC/g, 'equiposMasculino');

if (!t.includes("import { equiposMasculino }")) {
  t = t.replace(
    "import { useTournament }",
    "import { equiposMasculino } from '../data/masculinoData';\nimport { useTournament }"
  );
}

fs.writeFileSync(src, t, 'utf8');
fs.writeFileSync(dest, t, 'utf8');
console.log('OK - ambos archivos actualizados');
