/**
 * FACHADA DE MERCADO — une simulador, modelo y RAG en una sola entrada.
 *
 * Orden de las capas y quién decide qué:
 *
 *   A) regla determinista (src/lib/pricing.ts) → descuento por horas sin vender.
 *      Nunca falla, no usa red.
 *   B) modelo de mercado (este módulo) → CUÁNTO ajustar, con una regresión sobre
 *      la serie. El número sale de acá, no del LLM.
 *   C) LLM (src/lib/ai/price-rag.ts) → POR QUÉ, en una frase, citando los
 *      documentos recuperados. Si el LLM se cae, el número de B sigue en pie.
 *
 * Esa separación es el punto: antes el precio lo proponía el modelo de lenguaje
 * leyendo tres frases fijas, y si el LLM fallaba no quedaba ajuste ninguno.
 */

import { ESPECIES } from "@/lib/types";
import { construirCorpus, type DocumentoMercado } from "./corpus";
import {
  ajustarModelo,
  backtest,
  predecir,
  type Backtest,
  type ModeloPrecio,
  type Prediccion,
} from "./forecast";
import { recuperar, type DocumentoPuntuado } from "./retrieval";
import {
  generarSerie,
  proyectarEscenarios,
  type EscenarioFuturo,
  type EspecieReal,
  type SerieMercado,
} from "./simulador";

export * from "./simulador";
export * from "./forecast";
export * from "./corpus";
export * from "./retrieval";

export interface AnalisisMercado {
  especie: EspecieReal;
  serie: SerieMercado;
  escenarios: EscenarioFuturo[];
  modelo: ModeloPrecio;
  prediccion: Prediccion;
  corpus: DocumentoMercado[];
  validacion: Backtest;
}

const ESPECIES_VALIDAS = new Set<string>(ESPECIES);

export function esEspecieReal(especie: string): especie is EspecieReal {
  return ESPECIES_VALIDAS.has(especie) && especie !== "desconocida";
}

/** El análisis es determinista dentro del mismo día, así que se memoiza por
 *  especie + fecha + horizonte. Evita recalcular 120 días de serie y una
 *  regresión en cada request del marketplace. */
const cache = new Map<string, AnalisisMercado>();

export function analizarMercado(
  especie: EspecieReal,
  opciones: { dias?: number; horizonteDias?: number; hoy?: Date; semilla?: number } = {},
): AnalisisMercado {
  const dias = opciones.dias ?? 120;
  const horizonte = opciones.horizonteDias ?? 7;
  const hoy = opciones.hoy ?? new Date();
  const clave = `${especie}|${hoy.toISOString().slice(0, 10)}|${dias}|${horizonte}|${opciones.semilla ?? ""}`;

  const enCache = cache.get(clave);
  if (enCache) return enCache;

  const serie = generarSerie(especie, { dias, hoy, semilla: opciones.semilla });
  const escenarios = proyectarEscenarios(serie, horizonte, { hoy });
  const modelo = ajustarModelo(serie);
  const prediccion = predecir(serie, escenarios, modelo);
  const corpus = construirCorpus(serie, escenarios);
  const validacion = backtest(serie);

  const analisis: AnalisisMercado = {
    especie,
    serie,
    escenarios,
    modelo,
    prediccion,
    corpus,
    validacion,
  };

  cache.set(clave, analisis);
  return analisis;
}

/** Solo para tests y para el endpoint de administración: limpia la memoización. */
export function limpiarCacheMercado(): void {
  cache.clear();
}

/**
 * Recupera evidencia para una especie. La consulta se arma con la especie más los
 * términos de los factores que el modelo encontró relevantes, así el RAG trae
 * documentos alineados con lo que la regresión está diciendo, en vez de traer
 * siempre los mismos tipos.
 */
export function recuperarEvidencia(
  analisis: AnalisisMercado,
  opciones: { top?: number; hoy?: Date } = {},
): DocumentoPuntuado[] {
  const terminosPorFactor: Record<string, string> = {
    oferta: "desembarque oferta disponible",
    clima: "oleaje marejada mar zarpe",
    demanda: "turistica demanda restaurantes temporada",
    finDeSemana: "semana demanda",
    tendencia: "precio mayorista historico",
  };

  const consulta = [
    analisis.especie,
    terminosPorFactor[analisis.prediccion.factorDominante] ?? "",
    "precio desembarque oleaje demanda",
  ].join(" ");

  return recuperar(analisis.corpus, consulta, {
    top: opciones.top ?? 4,
    hoy: opciones.hoy,
  });
}

/**
 * Ajuste CUANTITATIVO sobre el precio de la regla base, derivado del modelo.
 *
 * Se usa la variación esperada del precio de mercado en los próximos días: si el
 * modelo proyecta el mercado 6% arriba, el producto no debería liquidarse al
 * precio de la regla. `sobreCosteo` mide cuánto se desvía el precio de la regla
 * respecto del mercado actual, para no arrastrar un precio base desalineado.
 */
export interface AjusteCuantitativo {
  variacionEsperadaPct: number;
  factorDominante: string;
  precioMercadoActualKg: number;
  precioMercadoEsperadoKg: number;
  /** Confianza del modelo, de 0 a 1, derivada del R² y del backtest. */
  confianza: number;
}

export function calcularAjusteCuantitativo(
  analisis: AnalisisMercado,
  diasVista = 2,
): AjusteCuantitativo {
  const { prediccion, modelo, validacion } = analisis;
  const dias = prediccion.dias.slice(0, Math.max(1, diasVista));
  const variacion =
    dias.reduce((s, d) => s + d.variacionPct, 0) / Math.max(1, dias.length);

  // El modelo aporta si le gana a la predicción ingenua; si no, se le baja el peso.
  const ventaja =
    validacion.mapeIngenuoPct > 0
      ? Math.max(0, 1 - validacion.mapePct / validacion.mapeIngenuoPct)
      : 0;
  const confianza = Math.max(0, Math.min(1, 0.5 * Math.max(0, modelo.r2) + 0.5 * ventaja));

  return {
    variacionEsperadaPct: variacion,
    factorDominante: prediccion.factorDominante,
    precioMercadoActualKg: prediccion.precioActualKg,
    precioMercadoEsperadoKg: dias[dias.length - 1]?.precioEsperadoKg ?? prediccion.precioActualKg,
    confianza,
  };
}
