import { NextResponse } from "next/server";
import { apiError } from "@/lib/types";

/**
 * POST /api/marketplace/[id]/precio — dueño: Manuel
 * Contrato: docs/05-api-contratos.md · Lógica: docs/06-ia-y-prompts.md
 *
 * EL FEATURE CENTRAL DEL PRODUCTO. Dos capas, en este orden:
 *
 *  A. calcularPrecioBase()  → regla determinista, sin red. NUNCA falla.
 *  B. ajustarConRag()       → recupera señales, pide ajuste al LLM,
 *                             se acota con acotarAjusteIa() a ±15%.
 *
 * Si B falla o da timeout: devolver el resultado de A con degradado: true.
 * Eso NO es un error, es el fallback funcionando, y la UI lo dice
 * ("ajustado por regla base"). Es una decisión de diseño defendible ante el jurado.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  void request;
  void context;
  return NextResponse.json(
    apiError("INTERNO", "Recálculo de precio aún no implementado."),
    { status: 501 },
  );
}
