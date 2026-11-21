import { useState } from 'react';
import { logoDeEquipo, iniciales } from '../lib/escudos';

// "Foto" de una jugadora/jugador: el escudo de su equipo, ocupando todo el
// círculo del avatar que lo contiene (que pone el tamaño, el borde y el
// brillo del color del equipo). Cuando haya fotos reales se cambia acá en un
// solo lugar. Si el equipo no tiene logo o no carga, quedan las iniciales.
export function EscudoJugador({ logo, equipoId, nombre, color }) {
  const src = logo || logoDeEquipo(equipoId);
  const [roto, setRoto] = useState(null);
  if (src && roto !== src) {
    return (
      <img className="escudo-img" src={src} alt="" loading="lazy" decoding="async"
        onError={() => setRoto(src)}/>
    );
  }
  return <span className="escudo-iniciales" style={color ? { color } : undefined}>{iniciales(nombre)}</span>;
}
