import { NextResponse } from "next/server";
import { apiOk, apiError, type PedidoResponse, type MatchResponse, type CandidatoMatch } from "@/lib/types";
import { prisma } from "@/lib/db";
import { horasDesde } from "@/lib/pricing";

/**
 * POST /api/pedidos — dueño: Manuel
 * Matching por reglas explícitas (sin LLM, a propósito). docs/06-ia-y-prompts.md
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restauranteId, especie, cantidadKg } = body;

    if (!especie || !cantidadKg) {
      return NextResponse.json(
        apiError("VALIDACION", "Faltan campos: especie, cantidadKg."),
        { status: 400 },
      );
    }

    // Resolver restaurante (demo: usar el primero si no se especifica)
    let rid = restauranteId;
    if (!rid) {
      const primero = await prisma.restaurante.findFirst();
      rid = primero?.id;
    }
    if (!rid) {
      return NextResponse.json(apiError("NO_ENCONTRADO", "No hay restaurantes registrados."), { status: 404 });
    }

    // Crear pedido
    const pedido = await prisma.pedido.create({
      data: {
        restauranteId: rid,
        especieNombre: especie,
        cantidadKg,
        estado: "cola",
      },
    });

    // Matching: productos disponibles de la especie solicitada
    const productos = await prisma.producto.findMany({
      where: {
        estado: "disponible",
        captura: { especieNombre: especie },
      },
      include: { captura: { include: { pescador: true } } },
    });

    const candidatos: CandidatoMatch[] = productos.map((p) => {
      const horas = horasDesde(p.publicadoEn);

      // Score: más fresco + más barato = mejor match
      const scoreFrescura = 1 / (1 + horas);
      const scorePrecio = p.precioInicialKg > 0
        ? 1 - p.precioActualKg / p.precioInicialKg
        : 0;
      const score = Math.round((scoreFrescura * 0.7 + scorePrecio * 0.3) * 100) / 100;

      let motivo = "";
      if (horas < 6) motivo = "Producto fresco, recién publicado.";
      else if (horas < 12) motivo = "Producto del día, con descuento.";
      else motivo = "Producto con descuento por tiempo.";

      return {
        productoId: p.id,
        especie: p.captura.especieNombre as CandidatoMatch["especie"],
        pesoKg: p.captura.pesoKg,
        precioActualKg: p.precioActualKg,
        horasPublicado: Math.round(horas * 10) / 10,
        score,
        motivo,
      };
    });

    // Ordenar por score descendente
    candidatos.sort((a, b) => b.score - a.score);

    // Marcar pedido como matcheado si hay resultados
    if (candidatos.length > 0) {
      await prisma.pedido.update({
        where: { id: pedido.id },
        data: {
          estado: "match",
          productoId: candidatos[0].productoId,
          scoreMatch: candidatos[0].score,
        },
      });
    }

    const response: MatchResponse = { candidatos };
    return NextResponse.json(apiOk(response));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(apiError("INTERNO", message), { status: 500 });
  }
}

/** GET /api/pedidos — lista pedidos para la vista de restaurante */
export async function GET() {
  const pedidos = await prisma.pedido.findMany({
    include: { restaurante: true, producto: true },
    orderBy: { creadoEn: "desc" },
  });
  return NextResponse.json(apiOk(pedidos));
}
