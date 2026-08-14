import { NextResponse } from "next/server";
import { apiError } from "@/lib/types";

/**
 * POST /api/pedidos — dueño: Manuel · P1 (sacrificable)
 * Contrato: docs/05-api-contratos.md
 *
 * El matching NO usa LLM y eso es a propósito: para 3 especies y 10 productos un
 * modelo agrega latencia y no-determinismo sin mejorar el resultado. Es scoring
 * por reglas explícitas (especie, frescura, cantidad, caleta) y se presenta así.
 * Decir esto en el pitch suma en el criterio de uso *apropiado* de IA.
 */
export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    apiError("INTERNO", "Pedidos aún no implementados (P1)."),
    { status: 501 },
  );
}
