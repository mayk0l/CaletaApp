/**
 * MOTOR DE PRECIO CON IA — acá la IA SÍ decide el número.
 *
 * Es una inversión deliberada respecto de los otros dos motores del repo:
 *
 *   · src/lib/sugerencia-precio.ts  → puntos por señal asignados a mano.
 *   · src/lib/market/forecast.ts    → regresión OLS que proyecta el mercado.
 *
 * Los dos dejan al modelo de lenguaje fuera de la decisión y lo usan solo para
 * redactar. Acá el modelo recibe un EXPEDIENTE de análisis y propone el precio.
 *
 * Por qué esto no es "pedirle un número al azar a un LLM":
 *
 *  1. El modelo no inventa el contexto: recibe serie histórica, pronóstico con
 *     banda de confianza, elasticidades estimadas, señales vigentes y vida útil
 *     de la especie. Analiza datos, no adivina.
 *  2. Se le exige citar el dato que usó. Si no cita nada, queda registrado.
 *  3. La propuesta se acota a un rango defendible y se compara contra las dos
 *     referencias deterministas, así se ve cuánto se desvió y por qué.
 *  4. Si el modelo falla, se cae a la referencia determinista. La sugerencia
 *     nunca desaparece.
 *
 * El costo honesto de este diseño: dos llamadas con el mismo insumo pueden dar
 * precios levemente distintos. Se mitiga con temperatura baja, pero no
 * desaparece — es el precio de que decida la IA, y hay que poder defenderlo.
 */

import { chatTexto, parsearJson, MODELO_TEXTO } from "./client";
import { redondearAPesos } from "@/lib/pricing";
import {
  sugerirPrecio,
  senalesAplicables,
  vidaUtilHoras,
  type SugerenciaPrecio,
} from "@/lib/sugerencia-precio";
import {
  analizarMercado,
  calcularAjusteCuantitativo,
  esEspecieReal,
  recuperarEvidencia,
} from "@/lib/market";
import type { Tendencia } from "@/lib/types";

/** La IA no puede proponer menos del 60% ni más del 115% del precio base.
 *  El piso coincide con el descuento máximo que ya aceptaba el motor de tramos
 *  (40%); el techo permite aprovechar un mercado en alza sin volverse absurdo. */
export const PISO_FACTOR = 0.6;
export const TECHO_FACTOR = 1.15;

export interface AnalisisParaIa {
  producto: {
    especie: string;
    pesoKg: number;
    precioBaseKg: number;
    precioPublicadoKg: number;
    horasPublicado: number;
    vidaUtilHoras: number;
    vidaUtilConsumidaPct: number;
  };
  mercado: {
    disponible: boolean;
    precioMercadoActualKg?: number;
    precioMedio7dKg?: number;
    variacion7dPct?: number;
    pronostico?: { fecha: string; precioEsperadoKg: number; variacionPct: number }[];
    factorDominante?: string;
    elasticidadOferta?: number;
    calidadModelo?: { r2: number; mapePct: number; mapeIngenuoPct: number };
  };
  senalesVigentes: { id: string; titulo: string; detalle: string; efecto: string }[];
  evidencia: { id: string; titulo: string; contenido: string; metricas: Record<string, number> }[];
  referencias: {
    /** Lo que propone el motor de reglas por señales. */
    porReglas: number;
    /** Lo que implicaría seguir el pronóstico de mercado sobre el precio base. */
    porMercado: number;
  };
}

/**
 * Arma el expediente que va a analizar la IA. Todo sale de módulos existentes:
 * este archivo no calcula precios, solo reúne el análisis.
 */
export function construirAnalisis(params: {
  especie: string;
  pesoKg: number;
  precioBaseKg: number;
  precioPublicadoKg: number;
  publicadoEn: Date | string;
  ahora?: Date;
}): { analisis: AnalisisParaIa; referencia: SugerenciaPrecio } {
  const ahora = params.ahora ?? new Date();
  const especie = params.especie.toLowerCase();

  const referencia = sugerirPrecio({
    especie,
    precioBaseKg: params.precioBaseKg,
    precioPublicadoKg: params.precioPublicadoKg,
    publicadoEn: params.publicadoEn,
    ahora,
  });

  const vida = vidaUtilHoras(especie);
  const senales = senalesAplicables(especie, ahora).map((s) => ({
    id: s.id,
    titulo: s.titulo,
    detalle: s.detalle,
    efecto: s.efecto,
  }));

  const mercado: AnalisisParaIa["mercado"] = { disponible: false };
  let porMercado = referencia.precioSugeridoKg;
  let evidencia: AnalisisParaIa["evidencia"] = [];

  if (esEspecieReal(especie)) {
    const a = analizarMercado(especie, { hoy: ahora });
    const cuant = calcularAjusteCuantitativo(a);
    const obs = a.serie.observaciones;
    const ultimos7 = obs.slice(-7);
    const previos7 = obs.slice(-14, -7);
    const media = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / (xs.length || 1);
    const p7 = media(ultimos7.map((o) => o.precioMayoristaKg));
    const pPrev = media(previos7.map((o) => o.precioMayoristaKg));

    mercado.disponible = true;
    mercado.precioMercadoActualKg = a.prediccion.precioActualKg;
    mercado.precioMedio7dKg = Math.round(p7);
    mercado.variacion7dPct = Number((((p7 - pPrev) / (pPrev || 1)) * 100).toFixed(1));
    mercado.pronostico = a.prediccion.dias.slice(0, 3).map((d) => ({
      fecha: d.fecha,
      precioEsperadoKg: d.precioEsperadoKg,
      variacionPct: Number(d.variacionPct.toFixed(1)),
    }));
    mercado.factorDominante = a.prediccion.factorDominante;
    mercado.elasticidadOferta = Number(a.modelo.coeficientes.oferta.toFixed(3));
    mercado.calidadModelo = {
      r2: Number(a.modelo.r2.toFixed(3)),
      mapePct: Number(a.validacion.mapePct.toFixed(2)),
      mapeIngenuoPct: Number(a.validacion.mapeIngenuoPct.toFixed(2)),
    };

    porMercado = redondearAPesos(
      params.precioBaseKg * (1 + cuant.variacionEsperadaPct / 100),
    );

    evidencia = recuperarEvidencia(a, { hoy: ahora }).map((e) => ({
      id: e.documento.id,
      titulo: e.documento.titulo,
      contenido: e.documento.contenido,
      metricas: e.documento.metricas,
    }));
  }

  return {
    referencia,
    analisis: {
      producto: {
        especie,
        pesoKg: params.pesoKg,
        precioBaseKg: params.precioBaseKg,
        precioPublicadoKg: params.precioPublicadoKg,
        horasPublicado: referencia.horasPublicado,
        vidaUtilHoras: vida,
        vidaUtilConsumidaPct: Math.round((referencia.horasPublicado / vida) * 100),
      },
      mercado,
      senalesVigentes: senales,
      evidencia,
      referencias: { porReglas: referencia.precioSugeridoKg, porMercado },
    },
  };
}

interface PropuestaCruda {
  precio_sugerido_kg: number;
  tendencia: string;
  confianza: number;
  razonamiento: string[];
  justificacion: string;
  datos_usados: string[];
  riesgo?: string;
}

export interface PropuestaPrecioIa {
  precioSugeridoKg: number;
  reduccionPct: number;
  diferenciaKg: number;
  tendencia: Tendencia;
  /** Confianza que declara el propio modelo, 0 a 1. */
  confianza: number;
  /** Pasos del análisis que dice haber hecho. Es material para el pitch. */
  razonamiento: string[];
  justificacion: string;
  /** Ids de señales o documentos que dice haber usado. */
  datosUsados: string[];
  riesgo?: string;
  /** true = decidió la IA. false = falló y decidió la referencia determinista. */
  decidioIa: boolean;
  /** true = la propuesta salía del rango permitido y se acotó. */
  fueAcotado: boolean;
  /** Cuánto se desvió de cada referencia determinista, en %. */
  desvio: { vsReglasPct: number; vsMercadoPct: number };
  analisis: AnalisisParaIa;
  crudo: unknown;
}

const PROMPT_SISTEMA =
  "Eres analista de precios de pesca artesanal en la Región de Valparaíso, Chile. " +
  "Analizas datos de mercado y propones un precio. Respondes SOLO con JSON válido.";

function construirPrompt(a: AnalisisParaIa): string {
  const p = a.producto;
  const m = a.mercado;

  const bloqueMercado = m.disponible
    ? `Serie de mercado de la especie:
- Precio mayorista actual: $${m.precioMercadoActualKg}/kg
- Promedio últimos 7 días: $${m.precioMedio7dKg}/kg (${(m.variacion7dPct ?? 0) >= 0 ? "+" : ""}${m.variacion7dPct}% vs semana anterior)
- Pronóstico de un modelo de regresión validado:
${(m.pronostico ?? []).map((d) => `    ${d.fecha}: $${d.precioEsperadoKg}/kg (${d.variacionPct >= 0 ? "+" : ""}${d.variacionPct}%)`).join("\n")}
- Factor que más mueve el precio: ${m.factorDominante}
- Elasticidad estimada a la oferta: ${m.elasticidadOferta} (si el desembarque sube 10%, el precio baja ~${Math.abs((m.elasticidadOferta ?? 0) * 10).toFixed(1)}%)
- Calidad del modelo: R²=${m.calidadModelo?.r2}, error fuera de muestra ${m.calidadModelo?.mapePct}% contra ${m.calidadModelo?.mapeIngenuoPct}% de la predicción ingenua`
    : "Serie de mercado: no hay modelo para esta especie. Decide con vida útil y señales.";

  return `Tienes que proponer el precio por kilo de un producto de pesca artesanal.

PRODUCTO
- Especie: ${p.especie}, ${p.pesoKg} kg
- Precio base que puso el pescador: $${p.precioBaseKg}/kg
- Precio publicado ahora: $${p.precioPublicadoKg}/kg
- Lleva ${p.horasPublicado} h publicado, y la vida útil del ${p.especie} es ${p.vidaUtilHoras} h
- Vida útil consumida: ${p.vidaUtilConsumidaPct}%

${bloqueMercado}

SEÑALES VIGENTES HOY
${a.senalesVigentes.length ? a.senalesVigentes.map((s) => `- [${s.id}] ${s.titulo}: ${s.detalle} (efecto: ${s.efecto})`).join("\n") : "- (ninguna vigente)"}

EVIDENCIA RECUPERADA
${a.evidencia.length ? a.evidencia.map((e) => `- [${e.id}] ${e.titulo}: ${e.contenido} · métricas: ${JSON.stringify(e.metricas)}`).join("\n") : "- (sin evidencia)"}

REFERENCIAS DE CÁLCULO (dos motores deterministas, para que compares)
- Motor de reglas por señales: $${a.referencias.porReglas}/kg
- Aplicar el pronóstico de mercado al precio base: $${a.referencias.porMercado}/kg

CÓMO DECIDIR
1. El objetivo es que el pescador venda su producto sin perderlo, al mejor precio posible.
2. Si queda poca vida útil, mover el producto vale más que esperar mejor precio.
3. Si viene menos oferta (marejada, menos desembarque), no conviene liquidar barato.
4. Puedes apartarte de las referencias si los datos lo justifican, pero tienes que decir por qué.
5. El precio debe quedar entre $${Math.round(p.precioBaseKg * PISO_FACTOR)} y $${Math.round(p.precioBaseKg * TECHO_FACTOR)} por kg.
6. Cita en "datos_usados" los [id] concretos de señales o evidencia que pesaron. No inventes datos.
7. "justificacion": una frase para el pescador, máximo 25 palabras, español de Chile,
   sin vocativos (nada de "hermano", "compadre", "oye"), nombrando una cifra concreta.

Responde SOLO este JSON:
{"precio_sugerido_kg": number, "tendencia": "alcista"|"bajista"|"estable",
 "confianza": number entre 0 y 1, "razonamiento": [string, string, string],
 "justificacion": string, "datos_usados": [string], "riesgo": string}`;
}

/**
 * Pide a la IA que analice el expediente y proponga el precio.
 * Si el modelo falla o devuelve algo inservible, cae a la referencia por reglas.
 */
export async function proponerPrecioConIa(params: {
  especie: string;
  pesoKg: number;
  precioBaseKg: number;
  precioPublicadoKg: number;
  publicadoEn: Date | string;
  ahora?: Date;
}): Promise<PropuestaPrecioIa> {
  const { analisis, referencia } = construirAnalisis(params);

  const desvioContra = (precio: number) => ({
    vsReglasPct: Number(
      (((precio - analisis.referencias.porReglas) / analisis.referencias.porReglas) * 100).toFixed(1),
    ),
    vsMercadoPct: Number(
      (((precio - analisis.referencias.porMercado) / analisis.referencias.porMercado) * 100).toFixed(1),
    ),
  });

  const deFallback = (motivo: string): PropuestaPrecioIa => ({
    precioSugeridoKg: referencia.precioSugeridoKg,
    reduccionPct: referencia.reduccionPct,
    diferenciaKg: referencia.precioSugeridoKg - params.precioPublicadoKg,
    tendencia: referencia.tendencia,
    confianza: 0,
    razonamiento: [motivo],
    justificacion: referencia.justificacion,
    datosUsados: referencia.senalesUsadas,
    decidioIa: false,
    fueAcotado: false,
    desvio: desvioContra(referencia.precioSugeridoKg),
    analisis,
    crudo: null,
  });

  let contenido: string;
  let crudo: unknown;
  try {
    const respuesta = await chatTexto(
      [
        { role: "system", content: PROMPT_SISTEMA },
        { role: "user", content: construirPrompt(analisis) },
      ],
      // Temperatura baja: la IA decide el número, así que la estabilidad importa
      // más que la variedad. No la elimina, pero la reduce.
      { model: MODELO_TEXTO, maxTokens: 700, temperature: 0.2, timeoutMs: 30_000 },
    );
    contenido = respuesta.contenido;
    crudo = respuesta.crudo;
  } catch (err) {
    return deFallback(
      `El modelo no respondió (${err instanceof Error ? err.message.slice(0, 80) : "error"}); se usa la referencia por reglas.`,
    );
  }

  let cruda: PropuestaCruda;
  try {
    cruda = parsearJson<PropuestaCruda>(contenido);
  } catch {
    return deFallback("El modelo no devolvió JSON usable; se usa la referencia por reglas.");
  }

  const propuesto = Number(cruda.precio_sugerido_kg);
  if (!Number.isFinite(propuesto) || propuesto <= 0) {
    return deFallback("El modelo no devolvió un precio válido; se usa la referencia por reglas.");
  }

  // Acotado al rango defendible. Es la barrera que hace que la IA pueda decidir
  // sin que un error suyo se traduzca en un precio imposible.
  const piso = params.precioBaseKg * PISO_FACTOR;
  const techo = params.precioBaseKg * TECHO_FACTOR;
  const acotado = Math.min(techo, Math.max(piso, propuesto));
  const precio = redondearAPesos(acotado);
  const fueAcotado = Math.abs(acotado - propuesto) > 1;

  const reduccionPct = Math.round(
    ((params.precioBaseKg - precio) / params.precioBaseKg) * 100,
  );
  const diferenciaKg = precio - params.precioPublicadoKg;
  const tendencia: Tendencia =
    diferenciaKg < 0 ? "bajista" : diferenciaKg > 0 ? "alcista" : "estable";

  const confianza = Number.isFinite(cruda.confianza)
    ? Math.max(0, Math.min(1, cruda.confianza))
    : 0.5;

  return {
    precioSugeridoKg: precio,
    reduccionPct,
    diferenciaKg,
    tendencia,
    confianza,
    razonamiento: Array.isArray(cruda.razonamiento) ? cruda.razonamiento.slice(0, 5) : [],
    justificacion: cruda.justificacion?.trim() || referencia.justificacion,
    datosUsados: Array.isArray(cruda.datos_usados) ? cruda.datos_usados : [],
    riesgo: cruda.riesgo,
    decidioIa: true,
    fueAcotado,
    desvio: desvioContra(precio),
    analisis,
    crudo,
  };
}
