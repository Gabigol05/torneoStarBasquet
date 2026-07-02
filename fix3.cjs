const fs = require('fs');
const file = 'FrontEnd/src/components/TorneoView.jsx';
let t = fs.readFileSync(file, 'utf8');

// Eliminar las 3 lineas de imports de logos viejos
t = t.replace("import logoMambas   from '../assets/logo_mambas.png';\n", '');
t = t.replace("import logoToros    from '../assets/logo_toros.png';\n", '');
t = t.replace("import logoSpartans from '../assets/logo_spartans.png';\n", '');

// Eliminar TEAMS_MASC bloque exacto
const old = `const TEAMS_MASC = [
  { id: 'm1', name: 'Black Mambas', logo: logoMambas,   record: '7-0', color: '#3b82f6', pg: 7, pp: 0 },
  { id: 'm2', name: 'Los Toros',    logo: logoToros,    record: '6-1', color: '#ef4444', pg: 6, pp: 1 },
  { id: 'm3', name: 'Spartans',     logo: logoSpartans, record: '5-2', color: '#b45309', pg: 5, pp: 2 },
];`;
t = t.replace(old, '');

fs.writeFileSync(file, t, 'utf8');
console.log('OK');
