import { NextResponse } from "next/server";
import { apiOk, apiError, type CapturaResponse } from "@/lib/types";
import { prisma } from "@/lib/db";
import { transcribirYExtraer } from "@/lib/ai/voice";

/**
 * POST /api/capturas/voz — dueño: Manuel
 * Contrato: docs/05-api-contratos.md · Prompt: docs/06-ia-y-prompts.md
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio") as File | null;
    const pescadorId = formData.get("pescadorId") as string | null;

    if (!audio || !pescadorId) {
      return NextResponse.json(
        apiError("VALIDACION", "Falta audio o pescadorId."),
        { status: 400 },
      );
    }

    const bytes = new Uint8Array(await audio.arrayBuffer());
    const mimeType = audio.type || "audio/webm";

    const { transcripcion, reconocimiento } = await transcribirYExtraer(bytes, mimeType);

    // Guardar captura con respuesta cruda del modelo
    const captura = await prisma.captura.create({
      data: {
        pescadorId,
        especieNombre: reconocimiento.especie,
        cantidad: reconocimiento.cantidad,
        pesoKg: reconocimiento.pesoKgEstimado,
        largoCm: reconocimiento.largoCmEstimado,
        metodo: "voz",
        confianzaIa: reconocimiento.confianza,
        transcripcion,
        iaRaw: { reconocimiento, transcripcion } as any,
        estado: "pendiente",
      },
    });

    const response: CapturaResponse = {
      capturaId: captura.id,
      transcripcion,
      reconocimiento,
    };

    return NextResponse.json(apiOk(response));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    const code = message.includes("TIMEOUT") ? "IA_TIMEOUT" : "IA_SIN_RESULTADO";
    return NextResponse.json(apiError(code, message), { status: 503 });
  }
}
