import { NextResponse } from "next/server";
import { apiOk } from "@/lib/types";
import { prisma } from "@/lib/db";
import { calcularPrecioBase } from "@/lib/pricing";
import type { MarketplaceResponse, ProductoPublico } from "@/lib/types";

/**
 * GET /api/marketplace — dueño: Manuel
 * Contrato: docs/05-api-contratos.md
 *
 * Trae productos de Prisma, deriva precioActualKg con calcularPrecioBase()
 * (NO confiar en el precio guardado: se deriva de publicadoEn).
 */
export async function GET() {
  const productos = await prisma.producto.findMany({
    where: { estado: { not: "vendido" } },
    include: {
      captura: {
        include: {
          pescador: true,
        },
      },
    },
  });

  const resultado: ProductoPublico[] = productos.map((p) => {
    const base = calcularPrecioBase(p.precioInicialKg, p.publicadoEn);
    return {
      id: p.id,
      especie: p.captura.especieNombre as ProductoPublico["especie"],
      cantidad: p.captura.cantidad,
      pesoKg: p.captura.pesoKg,
      precioInicialKg: p.precioInicialKg,
      precioActualKg: base.precioActualKg,
      descuentoPct: base.descuentoPct,
      horasPublicado: base.horasPublicado,
      estado: base.riesgoMerma ? "merma" : (p.estado as ProductoPublico["estado"]),
      tendencia: (p.tendencia as ProductoPublico["tendencia"]) ?? undefined,
      justificacionIa: p.justificacionIa ?? undefined,
      etiquetaTramo: base.etiquetaTramo,
      horasHastaProximoTramo: base.horasHastaProximoTramo,
      proximoDescuentoPct: base.proximoDescuentoPct,
      pescador: {
        nombre: p.captura.pescador.nombre,
        caleta: p.captura.pescador.caleta,
      },
      selloCertificado: true, // todos los pescadores artesanales tienen sello
    };
  });

  const response: MarketplaceResponse = { productos: resultado };
  return NextResponse.json(apiOk(response));
}
