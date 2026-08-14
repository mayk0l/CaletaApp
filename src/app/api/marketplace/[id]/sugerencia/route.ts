import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk } from "@/lib/types";
import { sugerirPrecio, precioMostradoKg } from "@/lib/sugerencia-precio";
import { explicarSugerencia } from "@/lib/sugerencia-precio-ia";

/**
 * GET /api/marketplace/[id]/sugerencia — sugerencia de precio para evitar merma.
 * Contrato: docs/05-api-contratos.md
 *
 * SOLO LECTURA: no escribe precios ni toca el producto. Es una sugerencia y el
 * pescador decide si la aplica. Por eso es GET y no POST, a diferencia de
 * /precio, que sí persiste el ajuste.
 *
 * Capa A (reglas, src/lib/sugerencia-precio.ts) decide el número y nunca falla.
 * Capa B (RAG, src/lib/sugerencia-precio-ia.ts) redacta la explicación. Si el
 * modelo se cae, se devuelve la sugerencia con degradado:true y la justificación
 * de plantilla — el pescador igual recibe su recomendación.
 */
export async function GET(
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

  const especie = producto.captura.especieNombre;

  const sugerencia = sugerirPrecio({
    especie,
    precioBaseKg: producto.precioInicialKg,
    // El precio que el comprador ve, no el caché de la BD.
    precioPublicadoKg: precioMostradoKg(producto),
    publicadoEn: producto.publicadoEn,
  });

  try {
    const explicacion = await explicarSugerencia(especie, sugerencia);
    return NextResponse.json(
      apiOk({
        ...sugerencia,
        justificacion: explicacion.justificacion,
        senalesUsadas: explicacion.senalesUsadas,
        modeloIa: explicacion.modelo,
        degradado: false,
      }),
    );
  } catch {
    // No es un error: la capa determinista ya trae número y explicación.
    return NextResponse.json(apiOk(sugerencia));
  }
}
