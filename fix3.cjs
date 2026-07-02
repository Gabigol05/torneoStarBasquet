const fs = require('fs');
const path = require('path');
const file = path.join('src', 'components', 'TorneoView.jsx');
let t = fs.readFileSync(file, 'utf8');

// Limpiar todos los caracteres corruptos conocidos
const replacements = [
  [/â™‚/g, 'M'],
  [/â™€/g, 'F'],
  [/CategorÃ\u00ada/g, 'Categoria'],
  [/CategorÃa/g, 'Categoria'],
  [/estadÃ\u00adsticas/g, 'estadisticas'],
  [/estadÃsticas/g, 'estadisticas'],
  [/todavÃ\u00ada/g, 'todavia'],
  [/todavÃa/g, 'todavia'],
  [/Ã\u00a9/g, 'e'],
  [/Ã³/g, 'o'],
  [/Ã¡/g, 'a'],
  [/Ã©/g, 'e'],
  [/Ã­/g, 'i'],
  [/Ãº/g, 'u'],
  [/Ã±/g, 'n'],
  [/â€"/g, '-'],
  [/â€¢/g, '-'],
  [/â"€/g, '-'],
  [/Â·/g, '.'],
  [/ðŸ€/g, ''],
  [/ðŸ•/g, ''],
  [/ðŸ"/g, ''],
  [/â ï¸/g, '!'],
  [/ï¸/g, ''],
];

for (const [from, to] of replacements) {
  t = t.replace(from, to);
}

fs.writeFileSync(file, t, 'utf8');
console.log('OK');
