import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calcularPrecioBase } from "@/lib/pricing";
import { motorPorSenalesActivo, precioParaMarketplace } from "@/lib/sugerencia-precio";
import { apiOk, type MarketplaceResponse, type ProductoPublico } from "@/lib/types";

/**
 * GET /api/marketplace — dueño: Manuel
 * Contrato: docs/05-api-contratos.md
 *
 * El precio NO se lee de la base como fuente de verdad: se deriva de
 * publicadoEn en cada request. Lo guardado en la BD (precioActualKg) es solo
 * caché para cuando el RAG lo actualiza. Ver docs/04-modelo-datos.md.
 *
 * ⚠️ Qué deriva el precio (cambio de Rubén, avisar a Manuel):
 * con PRECIO_POR_SENALES distinto de "0" —el default— lo hace el motor por
 * señales de src/lib/sugerencia-precio.ts: vida útil de la especie, clima,
 * turismo y día de la semana, y oferta regional. Con PRECIO_POR_SENALES=0
 * vuelve a la tabla fija de TRAMOS (calcularPrecioBase), que descuenta solo por
 * reloj e igual para toda especie. El interruptor existe para poder revertir en
 * segundos durante el ensayo.
 */
export async function GET() {
  const productos = await prisma.producto.findMany({
    where: { estado: { not: "vendido" } },
    include: { captura: { include: { pescador: true } } },
    orderBy: { publicadoEn: "desc" },
  });

  const porSenales = motorPorSenalesActivo();

  const data: MarketplaceResponse = {
    productos: productos.map((p): ProductoPublico => {
      const especie = p.captura.especieNombre;

      // Si el RAG ajustó el precio hace menos de 1h, ese ajuste prima sobre lo
      // derivado (que no sabe de la conversación con el modelo). Pasada 1h, se
      // recalcula para no mostrar un ajuste viejo.
      const ajusteReciente =
        p.ultimoAjuste && Date.now() - p.ultimoAjuste.getTime() < 60 * 60_000;

      const derivado = porSenales
        ? precioParaMarketplace(p, especie)
        : (() => {
            const base = calcularPrecioBase(p.precioInicialKg, p.publicadoEn);
            return {
              precioActualKg: base.precioActualKg,
              descuentoPct: base.descuentoPct,
              horasPublicado: base.horasPublicado,
              etiquetaTramo: base.etiquetaTramo,
              riesgoMerma: base.riesgoMerma,
              horasHastaProximoTramo: base.horasHastaProximoTramo,
              proximoDescuentoPct: base.proximoDescuentoPct,
              justificacion: "",
            };
          })();

      return {
        id: p.id,
        especie: especie as ProductoPublico["especie"],
        cantidad: p.captura.cantidad,
        pesoKg: p.captura.pesoKg,
        precioInicialKg: p.precioInicialKg,
        precioActualKg: ajusteReciente ? p.precioActualKg : derivado.precioActualKg,
        descuentoPct: derivado.descuentoPct,
        horasPublicado: derivado.horasPublicado,
        etiquetaTramo: derivado.etiquetaTramo,
        horasHastaProximoTramo: derivado.horasHastaProximoTramo,
        proximoDescuentoPct: derivado.proximoDescuentoPct,
        estado: derivado.riesgoMerma ? "merma" : (p.estado as ProductoPublico["estado"]),
        tendencia: (ajusteReciente ? p.tendencia : undefined) as ProductoPublico["tendencia"],
        justificacionIa: ajusteReciente
          ? p.justificacionIa ?? undefined
          : derivado.justificacion || undefined,
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
