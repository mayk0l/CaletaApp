/**
 * Verificación del motor de precio con IA. Se corre con: npm run verificar:precio-ia
 *
 * Llama al modelo REAL contra escenarios construidos para que la respuesta
 * correcta sea distinta en cada uno. La pregunta que responde este script no es
 * "¿devuelve un número?" sino "¿el número reacciona a los datos?".
 *
 * Un motor que devolviera siempre lo mismo, o que copiara la referencia
 * determinista, pasaría un test de tipos y fallaría acá.
 *
 * Consume cuota de IA: son ~5 llamadas.
 */

import {
  construirAnalisis,
  proponerPrecioConIa,
  PISO_FACTOR,
  TECHO_FACTOR,
} from "../src/lib/ai/precio-ia";

let fallos = 0;
const AHORA = new Date("2026-08-14T12:00:00-04:00");

function comprobar(nombre: string, ok: boolean, detalle: string) {
  if (!ok) fallos++;
  console.log(`  [${ok ? "OK  " : "FALLA"}] ${nombre} — ${detalle}`);
}

function horasAtras(h: number): Date {
  return new Date(AHORA.getTime() - h * 3_600_000);
}

// ------------------------------------------------------ 1. el expediente es real
console.log("\n=== 1. El expediente que recibe la IA tiene datos, no plantillas ===");
{
  const { analisis } = construirAnalisis({
    especie: "congrio",
    pesoKg: 8,
    precioBaseKg: 12000,
    precioPublicadoKg: 12000,
    publicadoEn: horasAtras(10),
    ahora: AHORA,
  });

  comprobar(
    "trae serie y pronóstico de mercado",
    analisis.mercado.disponible && (analisis.mercado.pronostico?.length ?? 0) > 0,
    `pronóstico de ${analisis.mercado.pronostico?.length ?? 0} días, factor=${analisis.mercado.factorDominante}`,
  );
  comprobar(
    "trae elasticidad estimada del modelo",
    typeof analisis.mercado.elasticidadOferta === "number",
    `elasticidad oferta=${analisis.mercado.elasticidadOferta}`,
  );
  comprobar(
    "trae calidad del modelo para que la IA sepa cuánto creerle",
    (analisis.mercado.calidadModelo?.mapePct ?? 99) < (analisis.mercado.calidadModelo?.mapeIngenuoPct ?? 0),
    `MAPE ${analisis.mercado.calidadModelo?.mapePct}% vs ingenuo ${analisis.mercado.calidadModelo?.mapeIngenuoPct}%`,
  );
  comprobar(
    "trae evidencia citable con métricas",
    analisis.evidencia.length > 0 && analisis.evidencia.every((e) => Object.keys(e.metricas).length > 0),
    `${analisis.evidencia.length} documentos con métricas`,
  );
  comprobar(
    "trae vida útil de la especie",
    analisis.producto.vidaUtilHoras > 0,
    `${analisis.producto.vidaUtilHoras} h, consumida ${analisis.producto.vidaUtilConsumidaPct}%`,
  );
  comprobar(
    "trae las dos referencias deterministas para comparar",
    analisis.referencias.porReglas > 0 && analisis.referencias.porMercado > 0,
    `reglas=$${analisis.referencias.porReglas} mercado=$${analisis.referencias.porMercado}`,
  );
}

async function main() {
  // --------------------------------------------- 2. la IA decide y reacciona al dato
  console.log("\n=== 2. La IA propone precio y reacciona a los datos (llamadas reales) ===");

  interface Escenario {
    nombre: string;
    especie: string;
    horas: number;
    precioBaseKg: number;
  }

  const ESCENARIOS: Escenario[] = [
    { nombre: "congrio recién desembarcado", especie: "congrio", horas: 2, precioBaseKg: 12000 },
    { nombre: "congrio a 90% de vida útil", especie: "congrio", horas: 43, precioBaseKg: 12000 },
    { nombre: "erizo casi vencido (18h vida)", especie: "erizo", horas: 17, precioBaseKg: 6000 },
    { nombre: "jaiba fresca", especie: "jaiba", horas: 3, precioBaseKg: 8000 },
  ];

  const resultados: {
    esc: Escenario;
    precio: number;
    reduccion: number;
    decidioIa: boolean;
    confianza: number;
    citas: number;
    justificacion: string;
  }[] = [];

  for (const esc of ESCENARIOS) {
    const p = await proponerPrecioConIa({
      especie: esc.especie,
      pesoKg: 8,
      precioBaseKg: esc.precioBaseKg,
      precioPublicadoKg: esc.precioBaseKg,
      publicadoEn: horasAtras(esc.horas),
      ahora: AHORA,
    });

    resultados.push({
      esc,
      precio: p.precioSugeridoKg,
      reduccion: p.reduccionPct,
      decidioIa: p.decidioIa,
      confianza: p.confianza,
      citas: p.datosUsados.length,
      justificacion: p.justificacion,
    });

    const dentroRango =
      p.precioSugeridoKg >= esc.precioBaseKg * PISO_FACTOR - 1 &&
      p.precioSugeridoKg <= esc.precioBaseKg * TECHO_FACTOR + 1;

    console.log(
      `\n  ${esc.nombre}:\n` +
        `    precio=$${p.precioSugeridoKg}/kg (reducción ${p.reduccionPct}%)  decidioIa=${p.decidioIa}  confianza=${p.confianza}\n` +
        `    desvío: vs reglas ${p.desvio.vsReglasPct}% · vs mercado ${p.desvio.vsMercadoPct}%  acotado=${p.fueAcotado}\n` +
        `    cita: ${JSON.stringify(p.datosUsados)}\n` +
        `    "${p.justificacion}"`,
    );
    if (p.razonamiento.length) {
      console.log(`    razonamiento: ${p.razonamiento.map((r) => `\n      · ${r}`).join("")}`);
    }

    comprobar(`  ${esc.nombre}: precio dentro del rango permitido`, dentroRango, `$${p.precioSugeridoKg}`);
  }

  // ------------------------------------------------------------ 3. invariantes
  console.log("\n=== 3. Invariantes sobre las respuestas de la IA ===");
  {
    const conIa = resultados.filter((r) => r.decidioIa);
    comprobar(
      "la IA decidió en la mayoría de los escenarios",
      conIa.length >= Math.ceil(resultados.length * 0.75),
      `${conIa.length}/${resultados.length} decididos por IA`,
    );

    comprobar(
      "toda propuesta cita al menos un dato",
      conIa.every((r) => r.citas > 0),
      `citas por escenario: ${conIa.map((r) => r.citas).join(", ")}`,
    );

    comprobar(
      "ninguna justificación usa vocativos de caricatura",
      conIa.every((r) => !/\b(hermano|compadre|compare|weon|weón|oye)\b/i.test(r.justificacion)),
      "sin vocativos",
    );

    comprobar(
      "las justificaciones caben en pantalla (<=30 palabras)",
      conIa.every((r) => r.justificacion.split(/\s+/).length <= 30),
      `máximo ${Math.max(...conIa.map((r) => r.justificacion.split(/\s+/).length))} palabras`,
    );

    // La prueba que de verdad importa: el producto casi vencido tiene que bajar
    // más que el recién desembarcado. Si no, la IA no está leyendo la vida útil.
    const fresco = resultados.find((r) => r.esc.nombre.includes("recién"));
    const viejo = resultados.find((r) => r.esc.nombre.includes("90%"));
    if (fresco && viejo && fresco.decidioIa && viejo.decidioIa) {
      comprobar(
        "a más vida útil consumida, más reducción (misma especie)",
        viejo.reduccion > fresco.reduccion,
        `fresco ${fresco.reduccion}% vs 90% de vida ${viejo.reduccion}%`,
      );
    } else {
      console.log("  [--   ] comparación fresco/viejo omitida: la IA no decidió en ambos");
    }

    const distintos = new Set(resultados.map((r) => r.reduccion)).size;
    comprobar(
      "no devuelve la misma reducción para todo (reacciona al escenario)",
      distintos > 1,
      `${distintos} valores distintos de reducción`,
    );
  }

  console.log(`\n${fallos === 0 ? "TODO OK" : `${fallos} COMPROBACIONES FALLARON`}\n`);
  process.exit(fallos === 0 ? 0 : 1);

}

void main();
