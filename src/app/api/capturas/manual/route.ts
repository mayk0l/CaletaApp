import { NextResponse } from "next/server";
import { apiError } from "@/lib/types";

/**
 * POST /api/capturas/manual — dueño: Manuel
 *
 * Fallback sin IA. No es un caso de error: un pescador con mala señal o una foto
 * ambigua es un caso de uso real. Se presenta como tal en la UI.
 *
 * TODO(Manuel): validar body { pescadorId, especie, cantidad, pesoKg, largoCm? },
 * crear Captura con metodo="manual" y confianza 1, devolver { capturaId, reconocimiento }.
 */
export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    apiError("INTERNO", "Endpoint manual aún no implementado."),
    { status: 501 },
  );
}
