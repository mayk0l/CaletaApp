/**
 * Borra los datos que dejó el smoke test.
 *   npx tsx --env-file=.env.local scripts/limpiar-smoke.ts
 *
 * Lee .smoke-creados.json, que escribe scripts/smoke.ts, y borra por Prisma la
 * captura con su formulario y su producto. Va por Prisma y no por la API porque
 * no existe un DELETE de capturas, y no corresponde agregar un endpoint
 * destructivo abierto solo para limpiar pruebas.
 *
 * Funciona igual para un smoke test contra producción: la base es la misma.
 */

import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { prisma } from "../src/lib/db";

const ARCHIVO = ".smoke-creados.json";

async function main() {
  if (!existsSync(ARCHIVO)) {
    console.log(`No hay ${ARCHIVO}: nada que limpiar.`);
    return;
  }

  const { base, capturas } = JSON.parse(readFileSync(ARCHIVO, "utf8")) as {
    base: string;
    capturas: string[];
  };

  console.log(`Limpiando ${capturas.length} captura(s) de prueba de ${base}\n`);

  for (const capturaId of capturas) {
    const captura = await prisma.captura.findUnique({ where: { id: capturaId } });
    if (!captura) {
      console.log(`  ${capturaId} ya no existe`);
      continue;
    }

    await prisma.formulario.deleteMany({ where: { capturaId } });
    await prisma.producto.deleteMany({ where: { capturaId } });
    await prisma.captura.delete({ where: { id: capturaId } });
    console.log(`  borrada ${capturaId} (${captura.especieNombre}, ${captura.pesoKg} kg)`);
  }

  const quedan = await prisma.producto.count();
  console.log(`\nProductos publicados que quedan en la base: ${quedan}`);

  unlinkSync(ARCHIVO);
  console.log(`${ARCHIVO} eliminado.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
