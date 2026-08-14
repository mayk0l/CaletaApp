import { NextResponse } from "next/server";
import { candidatosDePedido } from "@/lib/pedidos";

/**
 * GET /api/pedidos/[id]/match — candidatos rankeados para un pedido.
 * Contrato: docs/05-api-contratos.md · Ranking: src/lib/matching.ts
 *
 * Score = reglas explícitas (especie exacta, frescura, precio, calce de cantidad,
 * cercanía de caleta y bonus anti-merma). Cada candidato trae además `factores`
 * con el desglose que la UI muestra en pantalla.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const resultado = await candidatosDePedido(id);

  if (!resultado.ok) {
    return NextResponse.json(resultado, {
      status: resultado.error.code === "NO_ENCONTRADO" ? 404 : 400,
    });
  }

  return NextResponse.json(resultado);
}
