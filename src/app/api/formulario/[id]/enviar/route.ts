import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk, type EnvioResponse } from "@/lib/types";

/**
 * POST /api/formulario/[id]/enviar — dueño: Manuel  (id = capturaId)
 * Contrato: docs/05-api-contratos.md
 *
 * Envío SIMULADO a SERNAPESCA. Decisión tomada y no reabrir: automatizar el
 * portal real con navegador headless fue evaluado y descartado por
 * riesgo/tiempo (docs/06-ia-y-prompts.md, tabla de decisiones).
 *
 * Arma el payload real como si se fuera a enviar (se muestra en la demo),
 * simula latencia, genera folio mock, marca la captura como enviada y
 * PUBLICA el producto en el marketplace en la misma operación.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: capturaId } = await context.params;

  const captura = await prisma.captura.findUnique({
    where: { id: capturaId },
    include: { formulario: true, producto: true },
  });

  if (!captura) {
    return NextResponse.json(apiError("NO_ENCONTRADO", "Captura no encontrada."), {
      status: 404,
    });
  }
  if (!captura.formulario) {
    return NextResponse.json(
      apiError("VALIDACION", "Primero hay que generar el formulario (GET /api/formulario/[id])."),
      { status: 400 },
    );
  }
  if (captura.producto) {
    // Reintento idempotente: si ya se envió, se devuelve lo que ya existe
    // en vez de duplicar el producto en el marketplace.
    const data: EnvioResponse = {
      folioMock: captura.formulario.folioMock ?? "SP-2026-000000",
      enviadoEn: (captura.formulario.enviadoEn ?? new Date()).toISOString(),
      simulado: true,
      productoId: captura.producto.id,
    };
    return NextResponse.json(apiOk(data));
  }

  const especie = await prisma.especie.findUnique({
    where: { nombre: captura.especieNombre },
  });
  const precioInicialKg = especie?.precioBaseKg ?? 5000;

  // El payload real que "se enviaría" a SERNAPESCA — se muestra en el pitch
  // como evidencia de que el mock arma el dato real, no solo un texto fijo.
  const payloadSimulado = {
    pescadorId: captura.pescadorId,
    especie: captura.especieNombre,
    cantidad: captura.cantidad,
    pesoKg: captura.pesoKg,
    largoCm: captura.largoCm,
    metodo: captura.metodo,
    formulario: captura.formulario.camposVariables,
  };
  void payloadSimulado; // se loguearía / mostraría en demo; no hay envío real.

  // Estado de carga visible: la demo se beneficia de que no sea instantáneo.
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const folioMock = `SP-2026-${String(Math.floor(100000 + Math.random() * 899999))}`;
  const enviadoEn = new Date();

  const [, producto] = await prisma.$transaction([
    prisma.formulario.update({
      where: { capturaId },
      data: { estadoEnvio: "enviado_simulado", folioMock, enviadoEn },
    }),
    prisma.producto.create({
      data: {
        capturaId,
        precioInicialKg,
        precioActualKg: precioInicialKg,
        descuentoPct: 0,
        publicadoEn: enviadoEn,
        estado: "disponible",
      },
    }),
    prisma.captura.update({ where: { id: capturaId }, data: { estado: "enviada" } }),
  ]);

  const data: EnvioResponse = {
    folioMock,
    enviadoEn: enviadoEn.toISOString(),
    simulado: true,
    productoId: producto.id,
  };

  return NextResponse.json(apiOk(data));
}
