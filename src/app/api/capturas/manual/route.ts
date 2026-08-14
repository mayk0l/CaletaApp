import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk, ESPECIES, type CapturaResponse } from "@/lib/types";

/**
 * POST /api/capturas/manual — dueño: Manuel
 *
 * Fallback sin IA. No es un caso de error: un pescador con mala señal o una foto
 * ambigua es un caso de uso real. Se presenta como tal en la UI.
 * Contrato: docs/05-api-contratos.md
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(apiError("VALIDACION", "Body inválido, se esperaba JSON."), {
      status: 400,
    });
  }

  const { pescadorId, especie, cantidad, pesoKg, largoCm } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (
    typeof pescadorId !== "string" ||
    !pescadorId ||
    typeof especie !== "string" ||
    !ESPECIES.includes(especie as (typeof ESPECIES)[number]) ||
    typeof cantidad !== "number" ||
    cantidad <= 0 ||
    typeof pesoKg !== "number" ||
    pesoKg <= 0
  ) {
    return NextResponse.json(
      apiError(
        "VALIDACION",
        `Se requiere pescadorId, especie (una de: ${ESPECIES.join(", ")}), cantidad y pesoKg > 0.`,
      ),
      { status: 400 },
    );
  }

  const captura = await prisma.captura.create({
    data: {
      pescadorId,
      especieNombre: especie,
      cantidad,
      pesoKg,
      largoCm: typeof largoCm === "number" ? largoCm : null,
      metodo: "manual",
      confianzaIa: 1,
      estado: "pendiente",
    },
  });

  const data: CapturaResponse = {
    capturaId: captura.id,
    reconocimiento: {
      especie: especie as CapturaResponse["reconocimiento"]["especie"],
      confianza: 1,
      pesoKgEstimado: pesoKg,
      largoCmEstimado: typeof largoCm === "number" ? largoCm : undefined,
      cantidad,
      fuente: "manual",
    },
  };

  return NextResponse.json(apiOk(data));
}
