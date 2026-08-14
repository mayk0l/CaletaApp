import { NextResponse } from "next/server";
import { apiError } from "@/lib/types";

/**
 * POST /api/capturas/voz — dueño: Manuel
 * Contrato: docs/05-api-contratos.md · Prompt: docs/06-ia-y-prompts.md
 *
 * TODO(Manuel):
 *  1. Leer multipart: `audio` (File webm/ogg) + `pescadorId`
 *  2. Gemini procesa el audio directo: transcripción + entidades en UNA llamada
 *     (por eso no montamos un speech-to-text aparte — ver docs/03-arquitectura.md)
 *  3. Si dice peso total en vez de unitario, normalizar y anotarlo en `notas`
 *  4. Devolver { capturaId, transcripcion, reconocimiento }
 */
export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    apiError("INTERNO", "Endpoint de voz aún no implementado."),
    { status: 501 },
  );
}
