import { NextResponse } from "next/server";
import { apiError, apiOk } from "@/lib/types";
import { crearPedido, listarCola } from "@/lib/pedidos";

/**
 * /api/pedidos — matching de demanda (P1). Implementado por Rubén.
 * Contrato: docs/05-api-contratos.md
 *
 * El matching NO usa LLM y eso es a propósito: para 3 especies y una decena de
 * productos un modelo agrega latencia y no-determinismo sin mejorar el resultado.
 * Es scoring por reglas explícitas (src/lib/matching.ts) con el desglose visible
 * en pantalla. Decir esto en el pitch suma en el criterio de uso *apropiado* de IA.
 */

/** POST: el restaurante programa un pedido y queda a la espera en la cola. */
export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json(apiError("VALIDACION", "Cuerpo JSON inválido."), {
      status: 400,
    });
  }

  const { restauranteId, especie, cantidadKg } = (cuerpo ?? {}) as Record<string, unknown>;

  if (typeof restauranteId !== "string" || typeof especie !== "string") {
    return NextResponse.json(
      apiError("VALIDACION", "Se requieren restauranteId y especie."),
      { status: 400 },
    );
  }

  const resultado = await crearPedido({
    restauranteId,
    especie,
    cantidadKg: Number(cantidadKg),
  });

  if (!resultado.ok) {
    return NextResponse.json(resultado, {
      status: resultado.error.code === "NO_ENCONTRADO" ? 404 : 400,
    });
  }

  return NextResponse.json(resultado, { status: 201 });
}

/**
 * GET: la cola con sus sugerencias. Extensión del contrato para que la pantalla
 * de restaurante se pinte en una sola llamada en vez de N+1.
 */
export async function GET(request: Request) {
  const restauranteId = new URL(request.url).searchParams.get("restauranteId") ?? undefined;
  const { cola } = await listarCola(restauranteId);

  return NextResponse.json(
    apiOk({
      pedidos: cola.map((item) => ({
        pedidoId: item.pedido.id,
        restaurante: item.pedido.restaurante.nombre,
        especie: item.pedido.especie,
        cantidadKg: item.pedido.cantidadKg,
        estado: item.estado,
        candidatos: item.sugerencias,
        productoElegidoId: item.productoElegidoId,
        scoreElegido: item.scoreElegido,
      })),
    }),
  );
}
