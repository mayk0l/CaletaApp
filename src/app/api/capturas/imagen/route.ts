import { NextResponse } from "next/server";
import { apiError } from "@/lib/types";

/**
 * POST /api/capturas/imagen — dueño: Manuel
 * Contrato: docs/05-api-contratos.md · Prompt: docs/06-ia-y-prompts.md
 *
 * TODO(Manuel):
 *  1. Leer multipart: `foto` (File) + `pescadorId`
 *  2. reconocerEspecie(foto) desde src/lib/ai/vision.ts (timeout 12 s)
 *  3. Guardar Captura con iaRaw = respuesta cruda del modelo
 *  4. Devolver { capturaId, reconocimiento }
 *  5. Error o confianza baja → apiError("IA_SIN_RESULTADO", ...) y el frontend
 *     ofrece el formulario manual. Nunca colgar la pantalla.
 */
export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    apiError("INTERNO", "Endpoint de visión aún no implementado."),
    { status: 501 },
  );
}
