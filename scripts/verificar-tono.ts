/**
 * Verificación del saneado de tono de la justificación del modelo.
 *   npx tsx scripts/verificar-tono.ts
 *
 * El modelo agregaba vocativos por su cuenta ("Hermano, sube el precio…") aunque
 * nadie se los pidió. El prompt ya los prohíbe, pero el tono de la demo no puede
 * depender de que obedezca, así que hay un saneado determinista.
 */

import { limpiarVocativo } from "../src/lib/sugerencia-precio-ia";

const CASOS: Array<[string, string]> = [
  [
    "Hermano, sube el precio porque la jibia escasea",
    "Sube el precio porque la jibia escasea",
  ],
  [
    "Compadre, con el mal tiempo que viene la oferta va a bajar",
    "Con el mal tiempo que viene la oferta va a bajar",
  ],
  [
    "Oye, conviene subir el precio porque el sábado escasea la jaiba",
    "Conviene subir el precio porque el sábado escasea la jaiba",
  ],
  [
    "Oye, hermano, baja el precio: quedan 4 horas de venta",
    "Baja el precio: quedan 4 horas de venta",
  ],
  [
    "Mantén el precio porque hay poca oferta de congrio",
    "Mantén el precio porque hay poca oferta de congrio",
  ],
  [
    "Baja el precio ahora!",
    "Baja el precio ahora.",
  ],
  [
    // No debe comerse una frase legítima que empiece con coma después de una palabra.
    "Hoy, con la marejada anunciada, conviene mantener",
    "Hoy, con la marejada anunciada, conviene mantener",
  ],
];

let fallas = 0;

for (const [entrada, esperado] of CASOS) {
  const salida = limpiarVocativo(entrada);
  if (salida === esperado) {
    console.log(`  ok   ${entrada}`);
    console.log(`       → ${salida}`);
  } else {
    fallas++;
    console.log(`  FALLA ${entrada}`);
    console.log(`       esperaba: ${esperado}`);
    console.log(`       obtuvo:   ${salida}`);
  }
}

console.log(fallas === 0 ? "\nTodo verde." : `\n${fallas} falla(s).`);
process.exit(fallas === 0 ? 0 : 1);
