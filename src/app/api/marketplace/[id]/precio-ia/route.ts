import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, apiOk } from "@/lib/types";
import { precioMostradoKg } from "@/lib/sugerencia-precio";
import { proponerPrecioConIa } from "@/lib/ai/precio-ia";
import { esErrorDeCuota, esErrorDeSobrecarga } from "@/lib/ai/client";

/**
 * GET /api/marketplace/[id]/precio-ia — la IA analiza los datos y propone el precio.
 *
 * Diferencia con los otros dos endpoints de precio:
 *   · /sugerencia → el número lo decide un motor de reglas; la IA solo redacta.
 *   · /precio     → el número lo decide una regresión; la IA solo redacta.
 *   · /precio-ia  → EL NÚMERO LO DECIDE LA IA, analizando serie de mercado,
 *                   pronóstico, señales vigentes y vida útil de la especie.
 *
 * SOLO LECTURA: no escribe el precio. La propuesta se muestra al pescador con su
 * razonamiento y él decide si la aplica.
 *
 * La respuesta incluye el expediente que analizó la IA y cuánto se desvió de las
 * dos referencias deterministas, para que el número sea auditable y no un acto
 * de fe. Ver src/lib/ai/precio-ia.ts
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const producto = await prisma.producto.findUnique({
    where: { id },
    include: { captura: true },
  });

  if (!producto) {
    return NextResponse.json(apiError("NO_ENCONTRADO", "Producto no encontrado."), {
      status: 404,
    });
  }

  const especie = producto.captura.especieNombre;

  try {
    const propuesta = await proponerPrecioConIa({
      especie,
      pesoKg: producto.captura.pesoKg,
      precioBaseKg: producto.precioInicialKg,
      precioPublicadoKg: precioMostradoKg(producto, new Date(), especie),
      publicadoEn: producto.publicadoEn,
    });

    return NextResponse.json(
      apiOk({
        productoId: producto.id,
        especie,
        // --- la decisión
        precioBaseKg: producto.precioInicialKg,
        precioPublicadoKg: propuesta.analisis.producto.precioPublicadoKg,
        precioSugeridoKg: propuesta.precioSugeridoKg,
        reduccionPct: propuesta.reduccionPct,
        diferenciaKg: propuesta.diferenciaKg,
        tendencia: propuesta.tendencia,

        // --- quién decidió y con qué seguridad
        decidioIa: propuesta.decidioIa,
        confianza: propuesta.confianza,
        fueAcotado: propuesta.fueAcotado,
        modelo: propuesta.decidioIa ? "deepseek-v3.2 (Huawei MaaS)" : "reglas deterministas",

        // --- por qué
        justificacion: propuesta.justificacion,
        razonamiento: propuesta.razonamiento,
        datosUsados: propuesta.datosUsados,
        riesgo: propuesta.riesgo,

        // --- contra qué se compara
        referencias: propuesta.analisis.referencias,
        desvio: propuesta.desvio,

        // --- el expediente que analizó (datos simulados, rotulados)
        simulada: true,
        analisis: {
          producto: propuesta.analisis.producto,
          mercado: propuesta.analisis.mercado,
          senalesVigentes: propuesta.analisis.senalesVigentes,
          evidencia: propuesta.analisis.evidencia,
        },
      }),
    );
  } catch (err) {
    if (esErrorDeCuota(err)) {
      return NextResponse.json(
        apiError("IA_CUOTA", "Se agotó la cuota de IA. Esperá un momento y probá de nuevo."),
        { status: 429 },
      );
    }
    if (esErrorDeSobrecarga(err)) {
      return NextResponse.json(
        apiError("IA_SOBRECARGA", "El modelo está saturado. Probá de nuevo en un momento."),
        { status: 503 },
      );
    }
    return NextResponse.json(
      apiError("IA_SIN_RESULTADO", "No se pudo generar la propuesta de precio."),
      { status: 502 },
    );
  }
}
