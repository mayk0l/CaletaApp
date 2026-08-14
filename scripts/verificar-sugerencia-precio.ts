/**
 * VerificaciÃ³n del motor de sugerencia de precio, sin BD y sin red.
 *   npx tsx scripts/verificar-sugerencia-precio.ts
 *
 * Compara lo que sugerÃ­a la tabla fija de tramos contra lo que sugiere el motor
 * por seÃ±ales, y comprueba las invariantes que sostienen la demo.
 */

import { calcularPrecioBase } from "../src/lib/pricing";
import {
  REDUCCION_MAX_PCT,
  REDUCCION_MINIMA_EN_RIESGO_PCT,
  senalesAplicables,
  sugerirPrecio,
  vidaUtilHoras,
} from "../src/lib/sugerencia-precio";

const PRECIO_BASE: Record<string, number> = { congrio: 12000, jaiba: 8000, jibia: 3500 };

/** 2026-08-14 es VIERNES (dÃ­a de compra de restaurantes) y 2026-08-17 es lunes. */
const VIERNES = new Date("2026-08-14T09:00:00-04:00");
const LUNES = new Date("2026-08-17T09:00:00-04:00");

let fallas = 0;

function verificar(nombre: string, condicion: boolean, detalle = "") {
  if (condicion) {
    console.log(`  ok   ${nombre}`);
  } else {
    fallas++;
    console.log(`  FALLA ${nombre} ${detalle}`);
  }
}

function publicadoHace(horas: number, ahora: Date): Date {
  return new Date(ahora.getTime() - horas * 3_600_000);
}

console.log("Tabla fija (antes) vs motor por seÃ±ales (ahora) â€” VIERNES 09:00\n");
console.log("especie   horas   tabla fija        motor por seÃ±ales   diferencia");

for (const especie of ["congrio", "jaiba", "jibia"]) {
  for (const horas of [2, 8, 14, 20, 30]) {
    const base = PRECIO_BASE[especie];
    const publicado = publicadoHace(horas, VIERNES);
    const tabla = calcularPrecioBase(base, publicado, VIERNES);
    const s = sugerirPrecio({
      especie,
      precioBaseKg: base,
      precioPublicadoKg: tabla.precioActualKg,
      publicadoEn: publicado,
      ahora: VIERNES,
    });

    console.log(
      `${especie.padEnd(9)} ${String(horas).padStart(4)} h  ` +
        `âˆ’${String(tabla.descuentoPct).padStart(2)}% $${String(tabla.precioActualKg).padStart(6)}   ` +
        `âˆ’${String(s.reduccionPct).padStart(2)}% $${String(s.precioSugeridoKg).padStart(6)}      ` +
        `${s.diferenciaKg >= 0 ? "+" : ""}${s.diferenciaKg}`,
    );
  }
}

console.log("\nEjemplo completo â€” jaiba de 20 h un lunes (vida Ãºtil 24 h):\n");
const jaiba = sugerirPrecio({
  especie: "jaiba",
  precioBaseKg: PRECIO_BASE.jaiba,
  precioPublicadoKg: 8000,
  publicadoEn: publicadoHace(20, LUNES),
  ahora: LUNES,
});
console.log(`  sugerencia: âˆ’${jaiba.reduccionPct}% â†’ $${jaiba.precioSugeridoKg}/kg`);
console.log(`  ${jaiba.justificacion}`);
for (const f of jaiba.factores) {
  const signo = f.puntosPct > 0 ? "+" : "";
  console.log(
    `    ${f.etiqueta.padEnd(28)} ${signo}${String(f.puntosPct).padStart(3)} pp  ${f.detalle}`,
  );
}
console.log(`  riesgo de merma: ${jaiba.riesgoMerma}`);

console.log("\nEjemplo de contraste â€” congrio de 20 h el mismo lunes (vida Ãºtil 48 h):\n");
const congrio = sugerirPrecio({
  especie: "congrio",
  precioBaseKg: PRECIO_BASE.congrio,
  precioPublicadoKg: 12000,
  publicadoEn: publicadoHace(20, LUNES),
  ahora: LUNES,
});
console.log(`  sugerencia: âˆ’${congrio.reduccionPct}% â†’ $${congrio.precioSugeridoKg}/kg`);
console.log(`  ${congrio.justificacion}`);

console.log("\nInvariantes:\n");

verificar(
  "la vida Ãºtil diferencia especies (jaiba 24 h, congrio 48 h)",
  vidaUtilHoras("jaiba") === 24 && vidaUtilHoras("congrio") === 48,
);

verificar(
  "a igual hora, la jaiba se castiga mÃ¡s que el congrio",
  jaiba.reduccionPct > congrio.reduccionPct,
  `jaiba ${jaiba.reduccionPct}% vs congrio ${congrio.reduccionPct}%`,
);

const fresco = sugerirPrecio({
  especie: "congrio",
  precioBaseKg: 12000,
  precioPublicadoKg: 12000,
  publicadoEn: publicadoHace(1, VIERNES),
  ahora: VIERNES,
});
verificar(
  "reciÃ©n desembarcado no se sugiere bajar",
  fresco.reduccionPct === 0,
  `dio ${fresco.reduccionPct}%`,
);

const casos = ["congrio", "jaiba", "jibia"].flatMap((especie) =>
  [0, 5, 12, 24, 48, 96].map((horas) =>
    sugerirPrecio({
      especie,
      precioBaseKg: PRECIO_BASE[especie],
      precioPublicadoKg: PRECIO_BASE[especie],
      publicadoEn: publicadoHace(horas, LUNES),
      ahora: LUNES,
    }),
  ),
);

verificar(
  `ninguna sugerencia pasa el techo de ${REDUCCION_MAX_PCT}%`,
  casos.every((c) => c.reduccionPct <= REDUCCION_MAX_PCT),
);
verificar(
  "ninguna sugerencia es negativa",
  casos.every((c) => c.reduccionPct >= 0),
);
verificar(
  "el precio sugerido nunca supera el precio base",
  casos.every((c) => c.precioSugeridoKg <= c.precioBaseKg),
);
verificar(
  "la reducciÃ³n no baja cuando pasa mÃ¡s tiempo, con todo lo demÃ¡s igual",
  (() => {
    const serie = [0, 6, 12, 24, 48].map(
      (h) =>
        sugerirPrecio({
          especie: "congrio",
          precioBaseKg: 12000,
          precioPublicadoKg: 12000,
          publicadoEn: publicadoHace(h, LUNES),
          ahora: LUNES,
        }).reduccionPct,
    );
    return serie.every((v, i) => i === 0 || v >= serie[i - 1]);
  })(),
);

verificar(
  "el VIERNES (dÃ­a de compra) sugiere bajar menos que el lunes",
  sugerirPrecio({
    especie: "congrio",
    precioBaseKg: 12000,
    precioPublicadoKg: 12000,
    publicadoEn: publicadoHace(20, VIERNES),
    ahora: VIERNES,
  }).reduccionPct <
    sugerirPrecio({
      especie: "congrio",
      precioBaseKg: 12000,
      precioPublicadoKg: 12000,
      publicadoEn: publicadoHace(20, LUNES),
      ahora: LUNES,
    }).reduccionPct,
);

verificar(
  "la sobreoferta de jaiba solo aplica a la jaiba",
  senalesAplicables("jaiba", LUNES).some((s) => s.id === "oferta_jaiba_alta") &&
    !senalesAplicables("congrio", LUNES).some((s) => s.id === "oferta_jaiba_alta"),
);

const enRiesgo = sugerirPrecio({
  especie: "congrio",
  precioBaseKg: 12000,
  precioPublicadoKg: 12000,
  publicadoEn: publicadoHace(44, VIERNES),
  ahora: VIERNES,
});
verificar(
  `en riesgo de merma nunca sugiere menos de ${REDUCCION_MINIMA_EN_RIESGO_PCT}%, aunque las señales sostengan el precio`,
  enRiesgo.riesgoMerma && enRiesgo.reduccionPct >= REDUCCION_MINIMA_EN_RIESGO_PCT,
  `riesgo=${enRiesgo.riesgoMerma} reduccion=${enRiesgo.reduccionPct}%`,
);

// A 40 h las señales que sostienen el precio (−18 pp) dejan el bruto bajo el
// piso, así que el piso entra de verdad y tiene que quedar explicado.
const pisoEntra = sugerirPrecio({
  especie: "congrio",
  precioBaseKg: 12000,
  precioPublicadoKg: 12000,
  publicadoEn: publicadoHace(40, VIERNES),
  ahora: VIERNES,
});
verificar(
  "cuando el piso por merma levanta la sugerencia, queda explicado como factor",
  pisoEntra.reduccionPct === REDUCCION_MINIMA_EN_RIESGO_PCT &&
    pisoEntra.factores.some((f) => f.id === "piso_merma"),
  `reduccion=${pisoEntra.reduccionPct}% factores=${pisoEntra.factores.map((f) => f.id).join(",")}`,
);

verificar(
  "toda sugerencia nombra al menos un factor concreto",
  casos.every((c) => c.factores.length > 0 && c.justificacion.length > 20),
);

verificar(
  "es determinista: dos corridas con la misma hora dan lo mismo",
  sugerirPrecio({
    especie: "jibia",
    precioBaseKg: 3500,
    precioPublicadoKg: 3500,
    publicadoEn: publicadoHace(20, LUNES),
    ahora: LUNES,
  }).reduccionPct ===
    sugerirPrecio({
      especie: "jibia",
      precioBaseKg: 3500,
      precioPublicadoKg: 3500,
      publicadoEn: publicadoHace(20, LUNES),
      ahora: LUNES,
    }).reduccionPct,
);

console.log(fallas === 0 ? "\nTodo verde." : `\n${fallas} falla(s).`);
process.exit(fallas === 0 ? 0 : 1);
