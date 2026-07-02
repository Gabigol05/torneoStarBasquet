const fs = require('fs');
const file = 'FrontEnd/src/components/TorneoView.jsx';
let t = fs.readFileSync(file, 'utf8');

// 1. Agregar import de masculinoData
t = t.replace(
  "import { useTournament }",
  "import { equiposMasculino } from '../data/masculinoData';\nimport { useTournament }"
);

// 2. Reemplazar TEAMS_MASC por equiposMasculino en los maps
t = t.replace(/TEAMS_MASC\.map/g, 'equiposMasculino.map');

// 3. Eliminar el array TEAMS_MASC hardcodeado
t = t.replace(/const TEAMS_MASC = \[[\s\S]*?\];\n/, '');

// 4. Fix tabla: mostrar guion en vez de datos que no existen
t = t.replace(
  '<td>{t.pg + t.pp}</td><td>{t.pg}</td><td>{t.pp}</td>',
  '<td>-</td><td>-</td><td>-</td>'
);
t = t.replace(
  "style={{ color: modeColor }}>{t.pg * 2}</td>",
  "style={{ color: modeColor }}>-</td>"
);

// 5. Fix jugadores masculino - sacar jugadores falsos
t = t.replace(
  /\[1, 2, 3, 4, 5, 6\]\.map\(i => \([\s\S]*?\)\)[\s\S]*?\)/,
  `<div style={{textAlign:"center",padding:"3rem",color:"#6B7A99"}}>
    <div style={{fontSize:32,marginBottom:12}}>🏀</div>
    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:"#EEF2F8",marginBottom:8}}>Proximamente</div>
    <div style={{fontSize:13}}>Los jugadores del torneo masculino se cargaran pronto</div>
  </div>`
);

fs.writeFileSync(file, t, 'utf8');
console.log('OK');
