import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiOk } from "@/lib/types";
import { precioMostradoKg, sugerirPrecio } from "@/lib/sugerencia-precio";

/**
 * GET /api/sugerencias-precio — indicadores de precio de todos los productos.
 * Contrato: docs/05-api-contratos.md
 *
 * SOLO CAPA DETERMINISTA, a propósito: es pura, no toca la red y responde en
 * milisegundos, así que el pescador ve el estado de toda su pesca al entrar sin
 * esperar y sin gastar cuota del modelo. La redacción del LLM se pide aparte,
 * con GET /api/marketplace/[id]/sugerencia, solo para el caso que lo amerita.
 *
 * Solo lectura: no escribe precios. Son sugerencias.
 */
export async function GET() {
  const productos = await prisma.producto.findMany({
    where: { estado: { not: "vendido" } },
    include: { captura: true },
    orderBy: { publicadoEn: "desc" },
  });

  const sugerencias = productos.map((p) => {
    const especie = p.captura.especieNombre;
    return {
      productoId: p.id,
      especie,
      ...sugerirPrecio({
        especie,
        precioBaseKg: p.precioInicialKg,
        precioPublicadoKg: precioMostradoKg(p, new Date(), especie),
        publicadoEn: p.publicadoEn,
      }),
    };
  });

  // Primero lo que necesita atención: riesgo de merma, y luego la baja más grande.
  sugerencias.sort((a, b) => {
    if (a.riesgoMerma !== b.riesgoMerma) return a.riesgoMerma ? -1 : 1;
    return a.diferenciaKg - b.diferenciaKg;
  });

  return NextResponse.json(apiOk({ sugerencias }));
}
