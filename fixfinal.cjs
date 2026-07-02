const fs = require('fs');
const file = 'D:/Users/Usuario/Desktop/Proyecto_Torneostar/torneoStarBasquet/FrontEnd/src/components/TorneoView.jsx';
let t = fs.readFileSync(file, 'utf8');

// 1. Agregar import masculinoData
if (!t.includes("masculinoData")) {
  t = t.replace(
    "import { useTournament }",
    "import { equiposMasculino } from '../data/masculinoData';\nimport { useTournament }"
  );
}

// 2. Eliminar imports viejos linea por linea
t = t.split('\n').filter(line => 
  !line.includes("import logoMambas") &&
  !line.includes("import logoToros") &&
  !line.includes("import logoSpartans") &&
  !(line.includes("'Black Mambas'") && line.includes("logoMambas")) &&
  !(line.includes("'Los Toros'") && line.includes("logoToros")) &&
  !(line.includes("'Spartans'") && line.includes("logoSpartans")) &&
  !line.includes("const TEAMS_MASC = [")
).join('\n');

// 3. Reemplazar TEAMS_MASC por equiposMasculino
t = t.replace(/TEAMS_MASC/g, 'equiposMasculino');

// 4. Limpiar ];\n]; duplicado si existe
t = t.replace(/\];\n\];/g, '];');

fs.writeFileSync(file, t, 'utf8');
console.log('OK');
