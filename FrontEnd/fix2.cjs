const fs = require('fs');
const path = require('path');
const file = path.join('src', 'components', 'TorneoView.jsx');

let t = fs.readFileSync(file, 'latin1');
const buf = Buffer.from(t, 'latin1');
t = buf.toString('utf8');

fs.writeFileSync(file, t, 'utf8');
console.log('OK - ' + buf.length + ' bytes');
