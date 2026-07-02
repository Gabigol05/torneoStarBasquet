const fs = require('fs');
const file = 'FrontEnd/src/components/TorneoView.jsx';
let t = fs.readFileSync(file, 'utf8');

// Eliminar bloque TEAMS_MASC completo
t = t.replace(/const TEAMS_MASC = \[[\s\S]*?\];\n\n/, '');

fs.writeFileSync(file, t, 'utf8');
console.log('OK');
