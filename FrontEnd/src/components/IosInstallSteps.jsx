// Pasos para instalar en iPhone/iPad — reusado por InstallBanner y el botón
// fijo del footer. Apple no deja disparar la instalación por código en iOS,
// así que esto es lo más automático que se puede ofrecer ahí: el camino
// manual explicado paso a paso, en vez de una frase corrida que se leía
// confusa (probado con feedback real).
const STEPS = [
  'Tocá el ícono Compartir (el cuadrado con la flecha hacia arriba, abajo en Safari)',
  'Deslizá y elegí "Agregar a inicio"',
  'Confirmá tocando "Agregar" arriba a la derecha',
];

export function IosInstallSteps({ className = '' }) {
  return (
    <ol className={`ios-install-steps ${className}`}>
      {STEPS.map((s, i) => (
        <li key={i}>
          <span className="ios-install-step-n">{i + 1}</span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  );
}
