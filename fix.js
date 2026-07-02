const fs=require('fs');
let t=fs.readFileSync('src/components/TorneoView.jsx','latin1');
t=t.replace(/\u00e2\u0099\u0082/g,'M')
   .replace(/\u00e2\u0099\u0080/g,'F')
   .replace(/Categor\u00c3a/g,'Categoria')
   .replace(/estad\u00c3\u00adsticas/g,'estadisticas')
   .replace(/todav\u00c3a/g,'todavia')
   .replace(/\u00e2\u0094\u0080/g,'-')
   .replace(/\u00c2\u00b7/g,'·')
   .replace(/\u00f0\u009f\u0080/g,'🏀')
   .replace(/\u00f0\u009f\u0095/g,'📍')
   .replace(/\u00e2\u009a\u00a0/g,'⚠️')
   .replace(/\u00f0\u009f\u0094/g,'🔍');
fs.writeFileSync('src/components/TorneoView.jsx',t,'utf8');
console.log('OK');
