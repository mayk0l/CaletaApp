import { chatTexto, parsearJson, MODELO_TEXTO } from "./client";
import { acotarAjusteIa, tendenciaDe, AJUSTE_IA_MAX_PCT } from "@/lib/pricing";
import senalesData from "@/data/knowledge/senales-mercado.json";
import type { SenalMercado, Tendencia } from "@/lib/types";

/**
 * RAG de precios — CAPA B, el núcleo del producto (docs/06-ia-y-prompts.md, Uso 3).
 * Proveedor: Huawei ModelArts MaaS (modelo de texto, ver client.ts).
 *
 * Recuperación: por keyword-matching sobre tipo de señal + especie, NO por
 * embeddings vectoriales. Decisión de tiempo: con ~10 documentos de contexto,
 * una vector DB o coseno con embeddings es sobreingeniería — matching de
 * palabras da resultados igual de buenos y se implementa en minutos, no en horas.
 * Si sobra tiempo después de lo urgente, se puede mejorar a embeddings sin
 * tocar el contrato de esta función (docs/05-api-contratos.md no cambia).
 */

interface SenalCruda {
  id: string;
  tipo: string;
  titulo: string;
  contenido: string;
  fecha: string;
  simulada: boolean;
  fuente?: string;
}

const SENALES: SenalMercado[] = (senalesData.senales as SenalCruda[]).map((s) => ({
  id: s.id,
  tipo: s.tipo as SenalMercado["tipo"],
  titulo: s.titulo,
  contenido: s.contenido,
  fecha: s.fecha,
  simulada: s.simulada,
  fuente: s.fuente,
}));

/** Recupera las señales más relevantes para una especie: prioriza las que
 *  mencionan la especie en el texto, y si no alcanzan, agrega clima/temporada. */
export function recuperarSenales(especie: string, top = 3): SenalMercado[] {
  const q = especie.toLowerCase();
  const puntuadas = SENALES.map((s) => {
    let score = 0;
    if (s.titulo.toLowerCase().includes(q)) score += 2;
    if (s.contenido.toLowerCase().includes(q)) score += 1;
    if (s.tipo === "clima" || s.tipo === "temporada_turistica") score += 0.5;
    return { senal: s, score };
  });

  puntuadas.sort((a, b) => b.score - a.score);
  return puntuadas.slice(0, top).map((p) => p.senal);
}

interface AjusteCrudo {
  precio_sugerido: number;
  tendencia: "alcista" | "bajista" | "estable";
  justificacion: string;
  senales_usadas: string[];
}

export interface ResultadoAjusteIa {
  precioSugeridoKg: number;
  tendencia: Tendencia;
  justificacion: string;
  senalesUsadas: string[];
  crudo: unknown;
}

/**
 * Pide al modelo de texto un ajuste sobre el precio de la regla base, acotado
 * a ±AJUSTE_IA_MAX_PCT. Si falla, el caller (route handler) debe capturar el
 * error y devolver degradado:true con el precio de la regla base — este
 * módulo NO tiene fallback propio, eso vive en el endpoint (ver CA-10).
 */
export async function ajustarPrecioConIa(params: {
  especie: string;
  pesoKg: number;
  horasPublicado: number;
  precioBaseKg: number;
  descuentoPct: number;
  precioReglaKg: number;
}): Promise<ResultadoAjusteIa> {
  const senales = recuperarSenales(params.especie);
  const senalesTexto = senales
    .map((s) => `- ${s.titulo}: ${s.contenido}`)
    .join("\n");

  const prompt = `Eres analista de precios de pesca artesanal en Valparaíso, Chile.

Producto: ${params.especie}, ${params.pesoKg} kg, publicado hace ${params.horasPublicado.toFixed(1)} horas.
Precio base: $${params.precioBaseKg}/kg
Descuento por tiempo (regla base ya aplicada): ${params.descuentoPct}% → $${params.precioReglaKg}/kg

Señales de contexto recuperadas:
${senalesTexto || "(sin señales relevantes disponibles)"}

Ajusta el precio SOLO si las señales lo justifican, dentro de ±${AJUSTE_IA_MAX_PCT}% del precio de la regla base.
La justificación debe nombrar la señal concreta que usaste. No inventes señales.
Máximo 20 palabras, en español de Chile, dirigida al pescador.

Responde SOLO este JSON:
{"precio_sugerido": number, "tendencia": "alcista"|"bajista"|"estable",
 "justificacion": string, "senales_usadas": string[]}`;

  const { contenido, crudo } = await chatTexto(
    [
      { role: "system", content: "Respondes siempre con JSON válido, sin texto adicional." },
      { role: "user", content: prompt },
    ],
    { model: MODELO_TEXTO, maxTokens: 250, temperature: 0.4 },
  );

  const cruda = parsearJson<AjusteCrudo>(contenido);

  const { precio, fueAcotado } = acotarAjusteIa(
    params.precioReglaKg,
    cruda.precio_sugerido,
  );

  return {
    precioSugeridoKg: precio,
    // Si el modelo dijo "alcista" pero el precio quedó igual tras acotar,
    // la tendencia real la decide el precio final, no lo que dijo el texto.
    tendencia: fueAcotado
      ? tendenciaDe(params.precioReglaKg, precio)
      : cruda.tendencia,
    justificacion: cruda.justificacion,
    senalesUsadas: cruda.senales_usadas?.length
      ? cruda.senales_usadas
      : senales.map((s) => s.titulo),
    crudo,
  };
}
