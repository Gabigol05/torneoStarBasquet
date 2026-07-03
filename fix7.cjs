const fs = require('fs');
const file = 'D:/Users/Usuario/Desktop/Proyecto_Torneostar/torneoStarBasquet/FrontEnd/src/components/TorneoView.jsx';
let t = fs.readFileSync(file, 'utf8');

// Eliminar el ];\n]; duplicado
t = t.replace('];\n];', '];');

fs.writeFileSync(file, t, 'utf8');
console.log('OK');
