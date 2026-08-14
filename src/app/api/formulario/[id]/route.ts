import { NextResponse } from "next/server";
import { apiOk, apiError, type FormularioResponse } from "@/lib/types";
import { prisma } from "@/lib/db";
import { TALLA_MINIMA_CM } from "@/lib/mocks";

/**
 * GET /api/formulario/[id] — dueño: Manuel (id = capturaId)
 * Contrato: docs/05-api-contratos.md
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const captura = await prisma.captura.findUnique({
      where: { id },
      include: { pescador: true, formulario: true },
    });

    if (!captura) {
      return NextResponse.json(
        apiError("NO_ENCONTRADO", "Captura no encontrada."),
        { status: 404 },
      );
    }

    // Advertencias: talla mínima legal
    const advertencias: string[] = [];
    const especie = captura.especieNombre as keyof typeof TALLA_MINIMA_CM;
    const tallaMin = TALLA_MINIMA_CM[especie];
    if (tallaMin && captura.largoCm && captura.largoCm < tallaMin) {
      advertencias.push(
        `Talla estimada (${captura.largoCm} cm) bajo el mínimo legal (${tallaMin} cm).`,
      );
    }

    // Upsert formulario
    const camposFijos = {
      pescador: captura.pescador.nombre,
      rpa: captura.pescador.rpaMock,
      caleta: captura.pescador.caleta,
      region: captura.pescador.region,
      embarcacion: captura.pescador.embarcacion ?? "",
      fecha: captura.creadaEn.toISOString().split("T")[0],
    };

    const camposVariables = {
      especie: captura.especieNombre,
      cantidad: captura.cantidad,
      pesoKg: captura.pesoKg,
      largoCm: captura.largoCm ?? undefined,
      aparejo: "Espinel",
      zonaCaptura: "V Región · frente a " + captura.pescador.caleta,
      horaDesembarque: captura.creadaEn.toISOString().split("T")[1]?.slice(0, 5) ?? "",
    };

    const formulario = captura.formulario
      ? await prisma.formulario.update({
          where: { capturaId: id },
          data: { camposFijos, camposVariables },
        })
      : await prisma.formulario.create({
          data: {
            capturaId: id,
            camposFijos,
            camposVariables,
            estadoEnvio: "borrador",
          },
        });

    const response: FormularioResponse = {
      formularioId: formulario.id,
      camposFijos,
      camposVariables,
      estadoEnvio: formulario.estadoEnvio as FormularioResponse["estadoEnvio"],
      advertencias,
    };

    return NextResponse.json(apiOk(response));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(apiError("INTERNO", message), { status: 500 });
  }
}
