import { NextResponse } from "next/server";
import { apiOk, apiError } from "@/lib/types";
import { prisma } from "@/lib/db";

/**
 * PATCH /api/capturas/[id] — dueño: Manuel
 * El pescador corrige especie/cantidad/peso/largo tras el reconocimiento de IA
 * antes de continuar al formulario de trazabilidad.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { especie, cantidad, pesoKg, largoCm } = body;

    const existente = await prisma.captura.findUnique({ where: { id } });
    if (!existente) {
      return NextResponse.json(
        apiError("NO_ENCONTRADO", "Captura no encontrada."),
        { status: 404 },
      );
    }

    const data: Record<string, unknown> = {};
    if (typeof especie === "string" && especie.trim()) data.especieNombre = especie.trim();
    if (typeof cantidad === "number" && cantidad > 0) data.cantidad = Math.floor(cantidad);
    if (typeof pesoKg === "number" && pesoKg > 0) data.pesoKg = pesoKg;
    if (largoCm === null || (typeof largoCm === "number" && largoCm > 0)) data.largoCm = largoCm;

    if (Object.keys(data).length > 0) {
      await prisma.captura.update({ where: { id }, data });
    }

    return NextResponse.json(apiOk({ capturaId: id }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(apiError("INTERNO", message), { status: 500 });
  }
}
