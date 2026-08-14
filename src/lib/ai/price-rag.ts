import { chatTexto, parsearJson, MODELO_TEXTO } from "./client";
import { acotarAjusteIa, tendenciaDe, AJUSTE_IA_MAX_PCT } from "@/lib/pricing";
import {
  analizarMercado,
  calcularAjusteCuantitativo,
  esEspecieReal,
  recuperarEvidencia,
  type AnalisisMercado,
  type DocumentoPuntuado,
} from "@/lib/market";
import type { SenalMercado, Tendencia } from "@/lib/types";

/**
 * RAG de precios — CAPA B + C, el núcleo del producto (docs/06-ia-y-prompts.md).
 *
 * CAMBIO IMPORTANTE respecto de la versión anterior: el precio ya NO lo propone el
 * modelo de lenguaje. Antes el LLM leía 3 frases fijas de un JSON y devolvía un
 * número, que es exactamente el tipo de cifra que no se puede defender frente a un
 * jurado —ni cobrarle a un pescador—. Ahora:
 *
 *   · CUÁNTO ajustar lo decide una regresión sobre la serie de mercado
 *     (src/lib/market/forecast.ts), con coeficientes estimados del dato y una
 *     descomposición exacta de por qué se mueve.
 *   · POR QUÉ, en una frase para el pescador, lo escribe el LLM citando los
 *     documentos que recuperó el RAG (BM25 + recencia sobre corpus generado).
 *
 * Consecuencia práctica: si el LLM se cae, el ajuste numérico sigue en pie y solo
 * se pierde la redacción. Antes, si el LLM fallaba, no quedaba ajuste ninguno.
 *
 * Recuperación: BM25 con decaimiento por recencia sobre el corpus derivado de la
 * serie (src/lib/market/retrieval.ts). No son embeddings: con decenas de
 * documentos rinde igual y no cuesta una llamada de red. Si el corpus crece o hay
 * que capturar sinónimos, se cambia ahí sin tocar este contrato.
 */

export interface ResultadoAjusteIa {
  precioSugeridoKg: number;
  tendencia: Tendencia;
  justificacion: string;
  senalesUsadas: string[];
  /** true = la frase la escribió el LLM. false = plantilla derivada del modelo. */
  explicadoPorIa: boolean;
  /** Trazabilidad del número: qué predijo el modelo y con qué confianza. */
  modelo: {
    variacionEsperadaPct: number;
    factorDominante: string;
    confianza: number;
    precioMercadoActualKg: number;
    precioMercadoEsperadoKg: number;
    r2: number;
    mapePct: number;
    mapeIngenuoPct: number;
    fueAcotado: boolean;
  };
  crudo: unknown;
}

/** Compatibilidad: la UI y el endpoint siguen hablando de "señales". */
function aSenal(d: DocumentoPuntuado): SenalMercado {
  const doc = d.documento;
  const tipo: SenalMercado["tipo"] =
    doc.tipo === "clima" || doc.tipo === "pronostico_clima"
      ? "clima"
      : doc.tipo === "temporada_turistica"
        ? "temporada_turistica"
        : "oferta_regional";
  return {
    id: doc.id,
    tipo,
    titulo: doc.titulo,
    contenido: doc.contenido,
    fecha: doc.fecha,
    simulada: doc.simulada,
    fuente: doc.fuenteReal,
  };
}

/**
 * Recupera las señales relevantes para una especie. Se mantiene exportada porque
 * el contrato público no cambió, pero por dentro ahora es BM25 sobre el corpus
 * generado en vez de `includes()` sobre un JSON estático.
 */
export function recuperarSenales(especie: string, top = 4): SenalMercado[] {
  if (!esEspecieReal(especie)) return [];
  const analisis = analizarMercado(especie);
  return recuperarEvidencia(analisis, { top }).map(aSenal);
}

const NOMBRE_FACTOR: Record<string, string> = {
  oferta: "el desembarque disponible",
  clima: "el estado del mar",
  demanda: "la demanda turística",
  finDeSemana: "el efecto de fin de semana",
  reversion: "el desvío del precio actual respecto de sus fundamentos",
};

/** Frase derivada del modelo, sin LLM. Es el fallback y también la referencia
 *  contra la que se compara lo que escribe el LLM. */
function justificacionDeterminista(
  analisis: AnalisisMercado,
  variacionPct: number,
): string {
  const factor = NOMBRE_FACTOR[analisis.prediccion.factorDominante] ?? "el mercado";
  const direccion = variacionPct > 1 ? "al alza" : variacionPct < -1 ? "a la baja" : "estable";
  return `Mercado ${direccion} (${variacionPct >= 0 ? "+" : ""}${variacionPct.toFixed(1)}%) por ${factor}.`;
}

interface AjusteCrudo {
  justificacion: string;
  senales_usadas: string[];
}

/**
 * Sugerencia de precio para un producto publicado.
 *
 * El ajuste se aplica sobre el precio de la regla base y queda acotado a
 * ±AJUSTE_IA_MAX_PCT: el modelo puede proyectar +58% en un día de marejada y eso
 * es correcto como lectura de mercado, pero mover el precio de venta un 58% de
 * golpe no es defendible. El tope es una decisión de producto, no del modelo.
 */
export async function ajustarPrecioConIa(params: {
  especie: string;
  pesoKg: number;
  horasPublicado: number;
  precioBaseKg: number;
  descuentoPct: number;
  precioReglaKg: number;
}): Promise<ResultadoAjusteIa> {
  if (!esEspecieReal(params.especie)) {
    throw new Error(
      `IA_SIN_RESULTADO: sin modelo de mercado para la especie "${params.especie}"`,
    );
  }

  const analisis = analizarMercado(params.especie);
  const cuantitativo = calcularAjusteCuantitativo(analisis);
  const evidencia = recuperarEvidencia(analisis);

  // --- el número: regla base movida por la variación esperada, acotada
  const precioObjetivo =
    params.precioReglaKg * (1 + cuantitativo.variacionEsperadaPct / 100);
  const { precio, fueAcotado } = acotarAjusteIa(params.precioReglaKg, precioObjetivo);
  const tendencia = tendenciaDe(params.precioReglaKg, precio);
  const variacionAplicadaPct =
    ((precio - params.precioReglaKg) / params.precioReglaKg) * 100;

  const trazabilidad: ResultadoAjusteIa["modelo"] = {
    variacionEsperadaPct: Number(cuantitativo.variacionEsperadaPct.toFixed(2)),
    factorDominante: analisis.prediccion.factorDominante,
    confianza: Number(cuantitativo.confianza.toFixed(3)),
    precioMercadoActualKg: cuantitativo.precioMercadoActualKg,
    precioMercadoEsperadoKg: cuantitativo.precioMercadoEsperadoKg,
    r2: Number(analisis.modelo.r2.toFixed(3)),
    mapePct: Number(analisis.validacion.mapePct.toFixed(2)),
    mapeIngenuoPct: Number(analisis.validacion.mapeIngenuoPct.toFixed(2)),
    fueAcotado,
  };

  const base: ResultadoAjusteIa = {
    precioSugeridoKg: precio,
    tendencia,
    justificacion: justificacionDeterminista(analisis, variacionAplicadaPct),
    senalesUsadas: evidencia.map((e) => e.documento.titulo),
    explicadoPorIa: false,
    modelo: trazabilidad,
    crudo: null,
  };

  // --- la frase: el LLM redacta, citando la evidencia recuperada
  const evidenciaTexto = evidencia
    .map((e) => `- [${e.documento.id}] ${e.documento.titulo}: ${e.documento.contenido}`)
    .join("\n");

  const descomposicion = analisis.prediccion.dias[0]?.contribuciones
    .filter((c) => Math.abs(c.efectoPct) >= 0.5)
    .map((c) => `${c.factor}: ${c.efectoPct >= 0 ? "+" : ""}${c.efectoPct.toFixed(1)}%`)
    .join(", ");

  const prompt = `Eres analista de precios de pesca artesanal en Valparaíso, Chile.

Producto: ${params.especie}, ${params.pesoKg} kg, publicado hace ${params.horasPublicado.toFixed(1)} horas.
Precio por regla de tiempo: $${params.precioReglaKg}/kg (descuento ${params.descuentoPct}%).

Un modelo de regresión ya decidió el ajuste, NO tienes que calcular precios:
- Precio final ya definido: $${precio}/kg (${variacionAplicadaPct >= 0 ? "+" : ""}${variacionAplicadaPct.toFixed(1)}% sobre la regla)
- Variación de mercado proyectada: ${cuantitativo.variacionEsperadaPct >= 0 ? "+" : ""}${cuantitativo.variacionEsperadaPct.toFixed(1)}%
- Factor que más lo explica: ${analisis.prediccion.factorDominante}
- Descomposición del primer día: ${descomposicion || "sin factores relevantes"}

Evidencia recuperada:
${evidenciaTexto || "(sin evidencia disponible)"}

Tu única tarea: escribir la justificación para el pescador, en una frase de máximo
20 palabras, español de Chile, nombrando el dato concreto que la respalda (una cifra
de la evidencia). No propongas otro precio. No inventes señales que no estén arriba.

Responde SOLO este JSON:
{"justificacion": string, "senales_usadas": string[]}`;

  try {
    const { contenido, crudo } = await chatTexto(
      [
        { role: "system", content: "Respondes siempre con JSON válido, sin texto adicional." },
        { role: "user", content: prompt },
      ],
      { model: MODELO_TEXTO, maxTokens: 220, temperature: 0.4 },
    );

    const cruda = parsearJson<AjusteCrudo>(contenido);
    const justificacion = cruda.justificacion?.trim();

    return {
      ...base,
      justificacion: justificacion && justificacion.length > 5 ? justificacion : base.justificacion,
      senalesUsadas: cruda.senales_usadas?.length ? cruda.senales_usadas : base.senalesUsadas,
      explicadoPorIa: Boolean(justificacion && justificacion.length > 5),
      crudo,
    };
  } catch {
    // El LLM es opcional: el precio ya está decidido por el modelo cuantitativo.
    return base;
  }
}

export const TOPE_AJUSTE_PCT = AJUSTE_IA_MAX_PCT;
