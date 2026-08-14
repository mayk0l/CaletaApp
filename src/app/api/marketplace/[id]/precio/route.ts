import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ajustarPrecioConIa } from "@/lib/ai/price-rag";
import { calcularPrecioBase } from "@/lib/pricing";
import { apiError, apiOk, type PrecioResponse } from "@/lib/types";

/**
 * POST /api/marketplace/[id]/precio — EL FEATURE CENTRAL. Ver docs/06-ia-y-prompts.md
 *
 * Capa A (calcularPrecioBase) nunca falla: es la que sostiene la demo.
 * Capa B (ajustarPrecioConIa, Huawei MaaS) ajusta ±15% y explica.
 * Si B falla: se devuelve A con degradado:true. No es un error.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const producto = await prisma.producto.findUnique({
    where: { id },
    include: { captura: true },
  });

  if (!producto) {
    return NextResponse.json(apiError("NO_ENCONTRADO", "Producto no encontrado."), {
      status: 404,
    });
  }

  const base = calcularPrecioBase(producto.precioInicialKg, producto.publicadoEn);

  let resultado: PrecioResponse;

  try {
    const ajuste = await ajustarPrecioConIa({
      especie: producto.captura.especieNombre,
      pesoKg: producto.captura.pesoKg,
      horasPublicado: base.horasPublicado,
      precioBaseKg: producto.precioInicialKg,
      descuentoPct: base.descuentoPct,
      precioReglaKg: base.precioActualKg,
    });

    resultado = {
      precioAnteriorKg: producto.precioActualKg,
      precioActualKg: ajuste.precioSugeridoKg,
      descuentoPct: base.descuentoPct,
      tendencia: ajuste.tendencia,
      justificacion: ajuste.justificacion,
      senalesUsadas: ajuste.senalesUsadas,
      degradado: false,
      modelo: ajuste.modelo,
      explicadoPorIa: ajuste.explicadoPorIa,
    };
  } catch {
    // Fallback: la regla determinista nunca falla. Ver docs/03-arquitectura.md, decisión 4.
    resultado = {
      precioAnteriorKg: producto.precioActualKg,
      precioActualKg: base.precioActualKg,
      descuentoPct: base.descuentoPct,
      tendencia: "estable",
      justificacion: "Precio ajustado por regla base (tiempo sin venta).",
      senalesUsadas: [],
      degradado: true,
    };
  }

  await prisma.producto.update({
    where: { id },
    data: {
      precioActualKg: resultado.precioActualKg,
      descuentoPct: resultado.descuentoPct,
      tendencia: resultado.tendencia,
      justificacionIa: resultado.justificacion,
      ultimoAjuste: new Date(),
      estado: base.riesgoMerma ? "merma" : producto.estado,
    },
  });

  return NextResponse.json(apiOk(resultado));
}
