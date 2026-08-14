import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calcularPrecioBase } from "@/lib/pricing";
import { apiOk, type MarketplaceResponse, type ProductoPublico } from "@/lib/types";

/**
 * GET /api/marketplace — dueño: Manuel
 * Contrato: docs/05-api-contratos.md
 *
 * El precio NO se lee de la base como fuente de verdad: se deriva de
 * publicadoEn + calcularPrecioBase() en cada request. Lo guardado en la BD
 * (precioActualKg) es solo caché para cuando el RAG lo actualiza.
 * Ver docs/04-modelo-datos.md.
 */
export async function GET() {
  const productos = await prisma.producto.findMany({
    where: { estado: { not: "vendido" } },
    include: { captura: { include: { pescador: true } } },
    orderBy: { publicadoEn: "desc" },
  });

  const data: MarketplaceResponse = {
    productos: productos.map((p): ProductoPublico => {
      const base = calcularPrecioBase(p.precioInicialKg, p.publicadoEn);

      // Si el RAG ajustó el precio hace menos de 1h, ese ajuste prima sobre la
      // regla pura (que no sabe de señales de mercado, solo de tiempo transcurrido).
      // Pasada 1h, se recalcula con la regla base para no mostrar un ajuste viejo.
      const ajusteReciente =
        p.ultimoAjuste && Date.now() - p.ultimoAjuste.getTime() < 60 * 60_000;

      return {
        id: p.id,
        especie: p.captura.especieNombre as ProductoPublico["especie"],
        cantidad: p.captura.cantidad,
        pesoKg: p.captura.pesoKg,
        precioInicialKg: p.precioInicialKg,
        precioActualKg: ajusteReciente ? p.precioActualKg : base.precioActualKg,
        descuentoPct: base.descuentoPct,
        horasPublicado: base.horasPublicado,
        etiquetaTramo: base.etiquetaTramo,
        horasHastaProximoTramo: base.horasHastaProximoTramo,
        proximoDescuentoPct: base.proximoDescuentoPct,
        estado: base.riesgoMerma ? "merma" : (p.estado as ProductoPublico["estado"]),
        tendencia: (ajusteReciente ? p.tendencia : undefined) as ProductoPublico["tendencia"],
        justificacionIa: ajusteReciente ? p.justificacionIa ?? undefined : undefined,
        pescador: {
          nombre: p.captura.pescador.nombre,
          caleta: p.captura.pescador.caleta,
        },
        selloCertificado: true,
      };
    }),
  };

  return NextResponse.json(apiOk(data));
}
