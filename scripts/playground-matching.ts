/**
 * Playground del ranking: probar casos sueltos sin editar código.
 *
 *   npx tsx scripts/playground-matching.ts --especie congrio --kg 5 --comuna Valparaíso
 *   npx tsx scripts/playground-matching.ts --especie jibia --kg 20 --comuna "Viña del Mar"
 *   npx tsx scripts/playground-matching.ts --especie jaiba --kg 3 --api
 *
 * Sin argumentos usa congrio / 5 kg / Valparaíso.
 * Con --api levanta los productos reales desde el servidor local en vez de los
 * fixtures, para verificar contra lo que publicó el flujo de captura.
 */

import { mockMarketplace } from "../src/lib/mocks";
import { formatearPesos } from "../src/lib/pricing";
import {
  explicarEspera,
  sugerirParaPedido,
  type EspecieConcreta,
  type PedidoParaMatch,
} from "../src/lib/matching";
import type { ApiResponse, MarketplaceResponse, ProductoPublico } from "../src/lib/types";

const ESPECIES_VALIDAS: EspecieConcreta[] = ["congrio", "jaiba", "jibia"];
const URL_API = "http://localhost:3000/api/marketplace";

function arg(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function tieneFlag(nombre: string): boolean {
  return process.argv.includes(`--${nombre}`);
}

async function cargarProductos(): Promise<{ productos: ProductoPublico[]; fuente: string }> {
  if (!tieneFlag("api")) {
    return { productos: mockMarketplace.productos, fuente: "fixtures de src/lib/mocks.ts" };
  }

  try {
    const resp = await fetch(URL_API);
    const json = (await resp.json()) as ApiResponse<MarketplaceResponse>;
    if (!json.ok) {
      console.error(`La API respondió error: ${json.error.code} · ${json.error.message}`);
      process.exit(1);
    }
    return { productos: json.data.productos, fuente: URL_API };
  } catch {
    console.error(
      `No se pudo consultar ${URL_API}. Levanta el servidor con "npm run dev" o corre sin --api.`,
    );
    process.exit(1);
  }
}

async function main() {
  const especieArg = (arg("especie") ?? "congrio") as EspecieConcreta;
  if (!ESPECIES_VALIDAS.includes(especieArg)) {
    console.error(`Especie no válida: ${especieArg}. Opciones: ${ESPECIES_VALIDAS.join(", ")}`);
    process.exit(1);
  }

  const kg = Number(arg("kg") ?? 5);
  if (!Number.isFinite(kg) || kg <= 0) {
    console.error(`Cantidad no válida: ${arg("kg")}`);
    process.exit(1);
  }

  const pedido: PedidoParaMatch = {
    id: "ped_playground",
    especie: especieArg,
    cantidadKg: kg,
    creadoEn: new Date().toISOString(),
    restaurante: {
      nombre: arg("restaurante") ?? "Restaurante de prueba",
      comuna: arg("comuna") ?? "Valparaíso",
    },
  };

  const { productos, fuente } = await cargarProductos();

  console.log(`\nFuente de datos: ${fuente} (${productos.length} productos)`);
  console.log(
    `Pedido: ${pedido.cantidadKg} kg de ${pedido.especie} · ${pedido.restaurante.nombre} · ${pedido.restaurante.comuna}\n`,
  );

  const sugerencias = sugerirParaPedido(pedido, productos);

  if (sugerencias.length === 0) {
    console.log(`Estado: cola`);
    console.log(explicarEspera(pedido, productos));
    return;
  }

  console.log(`Estado: match · ${sugerencias.length} sugerencia(s)\n`);
  for (const [i, s] of sugerencias.entries()) {
    console.log(
      `#${i + 1}  score ${s.score}/100  ${s.pesoKg} kg a ${formatearPesos(s.precioActualKg)}/kg  (${s.horasPublicado} h)`,
    );
    console.log(`    ${s.motivo}`);
    for (const f of s.factores) {
      const barra = "#".repeat(Math.round((f.puntos / f.maximo) * 10)).padEnd(10, ".");
      console.log(`    ${barra} ${f.etiqueta.padEnd(18)} ${f.puntos}/${f.maximo}  ${f.detalle}`);
    }
    console.log("");
  }
}

main();
