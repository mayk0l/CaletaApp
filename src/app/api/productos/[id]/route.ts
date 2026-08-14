import { NextResponse } from "next/server";
import { apiOk, apiError } from "@/lib/types";
import { prisma } from "@/lib/db";
import { redondearAPesos } from "@/lib/pricing";

/**
 * PATCH /api/productos/[id] — dueño: Manuel
 * El pescador define/edita el precio base (precioInicialKg) de su producto.
 * El precio dinámico sigue aplicando descuentos por tiempo sobre esta base.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { precioInicialKg } = body;

    if (typeof precioInicialKg !== "number" || precioInicialKg <= 0) {
      return NextResponse.json(
        apiError("VALIDACION", "precioInicialKg debe ser un número positivo."),
        { status: 400 },
      );
    }

    const existente = await prisma.producto.findUnique({ where: { id } });
    if (!existente) {
      return NextResponse.json(
        apiError("NO_ENCONTRADO", "Producto no encontrado."),
        { status: 404 },
      );
    }

    const precio = redondearAPesos(precioInicialKg);
    await prisma.producto.update({
      where: { id },
      data: {
        precioInicialKg: precio,
        precioActualKg: precio,
        descuentoPct: 0,
        ultimoAjuste: new Date(),
      },
    });

    return NextResponse.json(apiOk({ productoId: id, precioInicialKg: precio }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(apiError("INTERNO", message), { status: 500 });
  }
}
