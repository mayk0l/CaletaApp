import { NextResponse } from "next/server";
import { apiOk, apiError, type CapturaResponse, type Reconocimiento } from "@/lib/types";
import { prisma } from "@/lib/db";

/**
 * POST /api/capturas/manual — dueño: Manuel
 * Fallback sin IA. No es un caso de error: un pescador con mala señal es un caso real.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pescadorId, especie, cantidad, pesoKg, largoCm } = body;

    if (!pescadorId || !especie || !pesoKg) {
      return NextResponse.json(
        apiError("VALIDACION", "Faltan campos: pescadorId, especie, pesoKg."),
        { status: 400 },
      );
    }

    const captura = await prisma.captura.create({
      data: {
        pescadorId,
        especieNombre: especie,
        cantidad: cantidad ?? 1,
        pesoKg,
        largoCm: largoCm ?? null,
        metodo: "manual",
        confianzaIa: 1,
        estado: "pendiente",
      },
    });

    const reconocimiento: Reconocimiento = {
      especie,
      confianza: 1,
      pesoKgEstimado: pesoKg,
      largoCmEstimado: largoCm,
      cantidad: cantidad ?? 1,
      fuente: "manual",
    };

    const response: CapturaResponse = {
      capturaId: captura.id,
      reconocimiento,
    };

    return NextResponse.json(apiOk(response));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(apiError("INTERNO", message), { status: 500 });
  }
}
