import { NextResponse } from "next/server";
import { apiOk, apiError, type CapturaResponse } from "@/lib/types";
import { prisma } from "@/lib/db";
import { transcribirYExtraer } from "@/lib/ai/voice";
import { esErrorDeCuota, esErrorDeSobrecarga } from "@/lib/ai/client";

/**
 * POST /api/capturas/voz — dueño: Manuel
 * Contrato: docs/05-api-contratos.md · Prompt: docs/06-ia-y-prompts.md
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(apiError("VALIDACION", "Body inválido, se esperaba multipart/form-data."), {
      status: 400,
    });
  }

  const audio = form.get("audio");
  const pescadorId = form.get("pescadorId");

  if (!(audio instanceof File)) {
    return NextResponse.json(
      apiError("VALIDACION", "Se requiere 'audio' (archivo)."),
      { status: 400 },
    );
  }

  // Resolver pescador: SIEMPRE usar uno real de la DB (demo)
  let pid: string | null = typeof pescadorId === "string" ? pescadorId : null;
  const pescadorExistente = pid ? await prisma.pescador.findUnique({ where: { id: pid } }) : null;
  if (!pescadorExistente) {
    const primero = await prisma.pescador.findFirst();
    pid = primero?.id ?? null;
  }
  if (!pid) {
    return NextResponse.json(apiError("NO_ENCONTRADO", "No hay pescadores registrados."), { status: 404 });
  }

  try {
    const bytes = new Uint8Array(await audio.arrayBuffer());
    const mimeType = audio.type || "audio/webm";
    const { transcripcion, reconocimiento } = await transcribirYExtraer(bytes, mimeType);

    const captura = await prisma.captura.create({
      data: {
        pescadorId: pid,
        especieNombre: reconocimiento.especie,
        cantidad: reconocimiento.cantidad,
        pesoKg: reconocimiento.pesoKgEstimado,
        largoCm: reconocimiento.largoCmEstimado,
        metodo: "voz",
        confianzaIa: reconocimiento.confianza,
        transcripcion,
        iaRaw: JSON.parse(JSON.stringify({ reconocimiento, transcripcion })),
        estado: "pendiente",
      },
    });

    const response: CapturaResponse = {
      capturaId: captura.id,
      transcripcion,
      reconocimiento,
    };

    return NextResponse.json(apiOk(response));
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    if (mensaje.includes("IA_TIMEOUT")) {
      return NextResponse.json(
        apiError("IA_TIMEOUT", "La IA no respondió a tiempo. Probá de nuevo o regístralo manual."),
        { status: 504 },
      );
    }
    if (esErrorDeCuota(err)) {
      return NextResponse.json(
        apiError("IA_CUOTA", "Se agotó la cuota de IA por minuto. Esperá un momento y probá de nuevo."),
        { status: 429 },
      );
    }
    if (esErrorDeSobrecarga(err)) {
      return NextResponse.json(
        apiError("IA_SOBRECARGA", "Los modelos de IA están saturados en este momento. Probá de nuevo o registrá la captura manual."),
        { status: 503 },
      );
    }
    return NextResponse.json(
      apiError("IA_SIN_RESULTADO", "No se pudo procesar el audio."),
      { status: 502 },
    );
  }
}
