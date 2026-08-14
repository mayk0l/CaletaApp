import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk, type FormularioResponse } from "@/lib/types";

/**
 * GET /api/formulario/[id] — dueño: Manuel  (id = capturaId)
 * Contrato: docs/05-api-contratos.md
 *
 * `advertencias`: si largoCm < talla mínima legal de la especie, se avisa.
 * Es trazabilidad con valor real, no solo autocompletado — vale en el pitch.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: capturaId } = await context.params;

  const captura = await prisma.captura.findUnique({
    where: { id: capturaId },
    include: { pescador: true, formulario: true },
  });

  if (!captura) {
    return NextResponse.json(apiError("NO_ENCONTRADO", "Captura no encontrada."), {
      status: 404,
    });
  }

  const especie = await prisma.especie.findUnique({
    where: { nombre: captura.especieNombre },
  });

  const advertencias: string[] = [];
  if (especie?.tallaMinimaCm && captura.largoCm && captura.largoCm < especie.tallaMinimaCm) {
    advertencias.push(
      `Talla estimada (${captura.largoCm} cm) bajo el mínimo legal para ${captura.especieNombre} (${especie.tallaMinimaCm} cm).`,
    );
  }

  const camposFijos = {
    pescador: captura.pescador.nombre,
    rpa: captura.pescador.rpaMock,
    caleta: captura.pescador.caleta,
    region: captura.pescador.region,
    embarcacion: captura.pescador.embarcacion ?? "—",
    fecha: captura.creadaEn.toISOString().slice(0, 10),
  };

  const camposVariables = {
    especie: captura.especieNombre,
    cantidad: captura.cantidad,
    pesoKg: captura.pesoKg,
    largoCm: captura.largoCm ?? undefined,
    aparejo: captura.especieNombre === "jaiba" ? "Trampa" : "Espinel",
    zonaCaptura: `${captura.pescador.region} · frente a ${captura.pescador.caleta}`,
    horaDesembarque: captura.creadaEn.toISOString().slice(11, 16),
  };

  // Upsert: si ya existe (por reintento de GET), no duplicar.
  const formulario = await prisma.formulario.upsert({
    where: { capturaId },
    update: { camposFijos, camposVariables },
    create: {
      capturaId,
      camposFijos,
      camposVariables,
      estadoEnvio: "borrador",
    },
  });

  const data: FormularioResponse = {
    formularioId: formulario.id,
    camposFijos,
    camposVariables,
    estadoEnvio: formulario.estadoEnvio as FormularioResponse["estadoEnvio"],
    advertencias,
  };

  return NextResponse.json(apiOk(data));
}
