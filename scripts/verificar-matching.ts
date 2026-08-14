/**
 * Verificación del ranking de sugerencias, sin BD y sin servidor.
 *   npx tsx scripts/verificar-matching.ts
 *
 * Corre contra los fixtures de src/lib/mocks.ts, o sea la misma forma de datos que
 * devuelve GET /api/marketplace. Sirve como prueba y como guion de demo: imprime el
 * desglose del score, que es lo que se muestra en pantalla.
 */

import { mockMarketplace } from "../src/lib/mocks";
import {
  PESOS,
  descartar,
  explicarEspera,
  resolverCola,
  sugerirParaPedido,
  sugerirParaProducto,
  type PedidoParaMatch,
} from "../src/lib/matching";

const productos = mockMarketplace.productos;

const pedidos: PedidoParaMatch[] = [
  {
    id: "ped_001",
    especie: "congrio",
    cantidadKg: 5,
    creadoEn: "2026-08-14T00:10:00.000Z",
    restaurante: { nombre: "Bote Salvavidas", comuna: "Valparaíso" },
  },
  {
    id: "ped_002",
    especie: "jibia",
    cantidadKg: 20,
    creadoEn: "2026-08-14T00:40:00.000Z",
    restaurante: { nombre: "Hotel Bahía Suites", comuna: "Viña del Mar" },
  },
  {
    id: "ped_003",
    especie: "congrio",
    cantidadKg: 40,
    creadoEn: "2026-08-14T01:05:00.000Z",
    restaurante: { nombre: "Cocina Cerro Alegre", comuna: "Valparaíso" },
  },
];

let fallas = 0;

function verificar(nombre: string, condicion: boolean, detalle = "") {
  if (condicion) {
    console.log(`  ok   ${nombre}`);
  } else {
    fallas++;
    console.log(`  FALLA ${nombre} ${detalle}`);
  }
}

console.log("Productos publicados (fixtures):");
for (const p of productos) {
  console.log(
    `  ${p.id}  ${p.especie.padEnd(8)} ${String(p.pesoKg).padStart(5)} kg  ` +
      `$${p.precioActualKg}/kg  −${p.descuentoPct}%  ${p.horasPublicado} h  ${p.estado}`,
  );
}

console.log("\nCola resuelta:");
for (const item of resolverCola(pedidos, productos)) {
  const { pedido, estado, sugerencias } = item;
  console.log(
    `\n${pedido.id} · ${pedido.restaurante.nombre} · ${pedido.cantidadKg} kg de ${pedido.especie} → ${estado}`,
  );

  if (sugerencias.length === 0) {
    console.log(`  ${explicarEspera(pedido, productos)}`);
    continue;
  }

  for (const s of sugerencias) {
    console.log(`  score ${String(s.score).padStart(5)}  ${s.motivo}`);
    for (const f of s.factores) {
      console.log(`      ${f.etiqueta.padEnd(18)} ${String(f.puntos).padStart(5)}/${f.maximo}  ${f.detalle}`);
    }
  }
}

console.log("\nDirección inversa — se publica prod_001 y se recorre la cola:");
for (const s of sugerirParaProducto(productos[0], pedidos)) {
  console.log(`  score ${String(s.score).padStart(5)}  ${s.restaurante} (${s.cantidadKg} kg)`);
}

console.log("\nInvariantes:");

const pesoTotal = Object.values(PESOS).reduce((a, b) => a + b, 0);
verificar("los pesos suman 100", pesoTotal === 100, `suman ${pesoTotal}`);

const todas = pedidos.flatMap((p) => sugerirParaPedido(p, productos));
verificar(
  "ningún score sale del rango 0..100",
  todas.every((s) => s.score >= 0 && s.score <= 100),
);

const congrio = sugerirParaPedido(pedidos[0], productos);
verificar(
  "solo sugiere la especie pedida",
  congrio.every((s) => s.especie === "congrio"),
);
verificar("el pedido de congrio de 5 kg tiene candidato", congrio.length === 1);

const jibia = sugerirParaPedido(pedidos[1], productos);
verificar(
  "la jibia de 20 h suma el bonus anti-merma",
  jibia[0]?.factores.find((f) => f.id === "antiMerma")?.puntos === PESOS.antiMerma,
);
verificar(
  "el motivo nombra un factor concreto",
  (jibia[0]?.motivo.length ?? 0) > 30 && jibia[0].motivo.includes("kg"),
  jibia[0]?.motivo,
);

const excesivo = sugerirParaPedido(pedidos[2], productos);
verificar("un pedido de 40 kg de congrio queda en cola", excesivo.length === 0);
verificar(
  "descarta por cantidad insuficiente",
  descartar(pedidos[2], productos[0]) === "cantidad_insuficiente",
);

const ordenado = sugerirParaPedido(
  { ...pedidos[1], cantidadKg: 5 },
  [...productos].reverse(),
);
verificar(
  "el orden es estable e independiente del orden de entrada",
  ordenado.map((s) => s.productoId).join() ===
    sugerirParaPedido({ ...pedidos[1], cantidadKg: 5 }, productos)
      .map((s) => s.productoId)
      .join(),
);

const dosVeces = sugerirParaPedido(pedidos[0], productos);
verificar(
  "es determinista: dos corridas dan el mismo score",
  dosVeces[0].score === congrio[0].score,
);

console.log(fallas === 0 ? "\nTodo verde." : `\n${fallas} falla(s).`);
process.exit(fallas === 0 ? 0 : 1);
