const fs = require('fs');
const path = require('path');
const file = path.join('src', 'components', 'TorneoView.jsx');

// Leer como latin1 para ver bytes reales
let t = fs.readFileSync(file, 'latin1');

// Decodificar UTF-8 mal interpretado como latin1
const buf = Buffer.from(t, 'latin1');
t = buf.toString('utf8');

// Limpiar caracteres problemáticos restantes
t = t.replace(/â™‚/g, 'M')
     .replace(/â™€/g, 'F')
     .replace(/Ã/g, 'i')
     .replace(/\u00c3\u00a9/g, 'e')
     .replace(/Â·/g, '·');

fs.writeFileSync(file, t, 'utf8');
console.log('OK - ' + buf.length + ' bytes procesados');
