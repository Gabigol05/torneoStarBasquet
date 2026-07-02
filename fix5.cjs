const fs = require('fs');
const file = 'FrontEnd/src/components/TorneoView.jsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

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

// Agregar import si no existe
if (!t.includes("import { equiposMasculino }")) {
  t = t.replace(
    "import { useTournament }",
    "import { equiposMasculino } from '../data/masculinoData';\nimport { useTournament }"
  );
}

fs.writeFileSync(file, t, 'utf8');

// Copiar al segundo path que usa Vite
fs.copyFileSync(file, 'src/components/TorneoView.jsx');

console.log('OK');
