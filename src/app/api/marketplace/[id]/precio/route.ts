import { NextResponse } from "next/server";
import { apiOk, apiError, type PrecioResponse } from "@/lib/types";
import { prisma } from "@/lib/db";
import { calcularPrecioBase } from "@/lib/pricing";
import { ajustarPrecioConRag } from "@/lib/ai/price-rag";

/**
 * POST /api/marketplace/[id]/precio — dueño: Manuel
 * EL FEATURE CENTRAL. Capa A (regla) + Capa B (RAG). Si B falla → degradado: true.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const producto = await prisma.producto.findUnique({
      where: { id },
      include: { captura: true },
    });

    if (!producto) {
      return NextResponse.json(
        apiError("NO_ENCONTRADO", "Producto no encontrado."),
        { status: 404 },
      );
    }

    // Capa A: regla determinista
    const base = calcularPrecioBase(producto.precioInicialKg, producto.publicadoEn);

    // Capa B: RAG con LLM
    const resultadoRag = await ajustarPrecioConRag({
      especie: producto.captura.especieNombre,
      pesoKg: producto.captura.pesoKg,
      horasPublicado: base.horasPublicado,
      precioInicialKg: producto.precioInicialKg,
      descuentoPct: base.descuentoPct,
      precioReglaKg: base.precioActualKg,
    });

    // Persistir el nuevo precio
    await prisma.producto.update({
      where: { id },
      data: {
        precioActualKg: resultadoRag.precioActualKg,
        descuentoPct: resultadoRag.descuentoPct,
        ultimoAjuste: new Date(),
        tendencia: resultadoRag.tendencia,
        justificacionIa: resultadoRag.justificacion,
      },
    });

    const response: PrecioResponse = resultadoRag;
    return NextResponse.json(apiOk(response));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(apiError("INTERNO", message), { status: 500 });
  }
}
