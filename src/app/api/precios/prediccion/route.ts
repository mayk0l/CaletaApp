import { NextResponse } from "next/server";
import { apiError, apiOk, ESPECIES } from "@/lib/types";
import {
  analizarMercado,
  calcularAjusteCuantitativo,
  esEspecieReal,
  recuperarEvidencia,
} from "@/lib/market";

/**
 * GET /api/precios/prediccion?especie=congrio&dias=7
 *
 * Devuelve la proyección de precio de mercado con su descomposición y la
 * evidencia que la respalda. Es el endpoint que hace auditable el número: para
 * cada día se puede ver qué parte del movimiento viene de la oferta, del mar, de
 * la demanda o de la reversión del precio actual, y qué documento lo sostiene.
 *
 * Los datos de mercado son SIMULADOS (cada documento viaja con simulada:true y la
 * fuente real que lo reemplazaría). Ver docs/13-datos-mercado.md
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const especie = (url.searchParams.get("especie") ?? "").toLowerCase().trim();
  const diasParam = Number(url.searchParams.get("dias") ?? "7");
  const horizonteDias = Number.isFinite(diasParam)
    ? Math.min(14, Math.max(1, Math.round(diasParam)))
    : 7;

  if (!especie) {
    return NextResponse.json(
      apiError("VALIDACION", `Falta 'especie'. Opciones: ${ESPECIES.join(", ")}.`),
      { status: 400 },
    );
  }

  if (!esEspecieReal(especie)) {
    return NextResponse.json(
      apiError(
        "NO_ENCONTRADO",
        `Sin modelo de mercado para "${especie}". Opciones: ${ESPECIES.join(", ")}.`,
      ),
      { status: 404 },
    );
  }

  const analisis = analizarMercado(especie, { horizonteDias });
  const ajuste = calcularAjusteCuantitativo(analisis);
  const evidencia = recuperarEvidencia(analisis);

  return NextResponse.json(
    apiOk({
      especie,
      simulada: true,
      precioMercadoActualKg: analisis.prediccion.precioActualKg,
      factorDominante: analisis.prediccion.factorDominante,
      variacionEsperadaPct: Number(ajuste.variacionEsperadaPct.toFixed(2)),
      confianza: Number(ajuste.confianza.toFixed(3)),

      dias: analisis.prediccion.dias.map((d) => ({
        fecha: d.fecha,
        precioEsperadoKg: d.precioEsperadoKg,
        bandaInferiorKg: d.bandaInferiorKg,
        bandaSuperiorKg: d.bandaSuperiorKg,
        variacionPct: Number(d.variacionPct.toFixed(2)),
        efectoReversionPct: Number(d.efectoReversionPct.toFixed(2)),
        contribuciones: d.contribuciones.map((c) => ({
          factor: c.factor,
          efectoPct: Number(c.efectoPct.toFixed(2)),
        })),
      })),

      // Cómo está entrenado y cuánto se le puede creer
      modelo: {
        coeficientes: Object.fromEntries(
          Object.entries(analisis.modelo.coeficientes).map(([k, v]) => [
            k,
            Number(v.toFixed(4)),
          ]),
        ),
        r2: Number(analisis.modelo.r2.toFixed(3)),
        sigmaLog: Number(analisis.modelo.sigmaLog.toFixed(4)),
        persistenciaAr1: Number(analisis.modelo.phiResidual.toFixed(3)),
        nObservaciones: analisis.modelo.nObservaciones,
      },
      validacion: {
        mapePct: Number(analisis.validacion.mapePct.toFixed(2)),
        mapeIngenuoPct: Number(analisis.validacion.mapeIngenuoPct.toFixed(2)),
        coberturaBandaPct: Number(analisis.validacion.coberturaBandaPct.toFixed(1)),
        nPrueba: analisis.validacion.nPrueba,
      },

      evidencia: evidencia.map((e) => ({
        id: e.documento.id,
        titulo: e.documento.titulo,
        contenido: e.documento.contenido,
        fecha: e.documento.fecha,
        metricas: e.documento.metricas,
        simulada: e.documento.simulada,
        fuenteRealPendiente: e.documento.fuenteReal,
        score: Number(e.score.toFixed(3)),
      })),
    }),
  );
}
