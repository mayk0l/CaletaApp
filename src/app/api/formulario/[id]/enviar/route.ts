import { NextResponse } from "next/server";
import { apiOk, apiError, type EnvioResponse } from "@/lib/types";
import { prisma } from "@/lib/db";
import { PRECIO_BASE_KG } from "@/lib/mocks";

/**
 * POST /api/formulario/[id]/enviar — dueño: Manuel (id = capturaId)
 * Envío SIMULADO a SERNAPESCA + publicación automática en marketplace.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const captura = await prisma.captura.findUnique({
      where: { id },
      include: { formulario: true, producto: true },
    });

    if (!captura) {
      return NextResponse.json(
        apiError("NO_ENCONTRADO", "Captura no encontrada."),
        { status: 404 },
      );
    }

    // Simular envío con folio mock
    const folioMock = `SP-2026-${String(Math.floor(Math.random() * 900000) + 100000)}`;
    const enviadoEn = new Date().toISOString();

    // Marcar captura como enviada
    await prisma.captura.update({
      where: { id },
      data: { estado: "enviada" },
    });

    // Actualizar formulario
    if (captura.formulario) {
      await prisma.formulario.update({
        where: { capturaId: id },
        data: {
          estadoEnvio: "enviado_simulado",
          folioMock,
          enviadoEn: new Date(),
        },
      });
    }

    // Publicar en marketplace si no existe ya
    let productoId = captura.producto?.id;
    if (!captura.producto) {
      const especie = captura.especieNombre as keyof typeof PRECIO_BASE_KG;
      const precioInicial = PRECIO_BASE_KG[especie] ?? 5000;

      const producto = await prisma.producto.create({
        data: {
          capturaId: id,
          precioInicialKg: precioInicial,
          precioActualKg: precioInicial,
          descuentoPct: 0,
          publicadoEn: new Date(),
          ultimoAjuste: new Date(),
          estado: "disponible",
        },
      });
      productoId = producto.id;
    }

    const response: EnvioResponse = {
      folioMock,
      enviadoEn,
      simulado: true,
      productoId: productoId!,
    };

    return NextResponse.json(apiOk(response));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(apiError("INTERNO", message), { status: 500 });
  }
}
