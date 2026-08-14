import { NextResponse } from "next/server";
import { apiError } from "@/lib/types";

/**
 * GET /api/formulario/[id] — dueño: Manuel  (id = capturaId)
 * Contrato: docs/05-api-contratos.md
 *
 * TODO(Manuel):
 *  1. Buscar la Captura + su Pescador
 *  2. camposFijos desde el pescador; camposVariables desde la captura
 *  3. `advertencias`: si largoCm < talla mínima legal de la especie, avisarlo.
 *     Esto es trazabilidad con valor real, no solo autocompletado — vale en el pitch.
 *  4. Persistir el Formulario (upsert) y devolverlo
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  void request;
  void context;
  return NextResponse.json(
    apiError("INTERNO", "Autollenado de formulario aún no implementado."),
    { status: 501 },
  );
}
