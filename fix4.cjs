const fs = require('fs');
const file = 'FrontEnd/src/components/TorneoView.jsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// Filtrar lineas que no queremos
lines = lines.filter(line => {
  if (line.includes("import logoMambas")) return false;
  if (line.includes("import logoToros")) return false;
  if (line.includes("import logoSpartans")) return false;
  if (line.includes("const TEAMS_MASC = [")) return false;
  if (line.includes("Black Mambas") && line.includes("logo: logoMambas")) return false;
  if (line.includes("Los Toros") && line.includes("logo: logoToros")) return false;
  if (line.includes("Spartans") && line.includes("logo: logoSpartans")) return false;
  if (line.trim() === "];" && lines[lines.indexOf(line)-1] && lines[lines.indexOf(line)-1].includes("logoSpartans")) return false;
  return true;
});

fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('OK - ' + lines.length + ' lineas');
