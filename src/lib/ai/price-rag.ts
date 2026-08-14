/**
 * Uso 3 · Precio dinámico con RAG — Capa B.
 *
 * Recupera señales de mercado por similitud coseno sobre embeddings en memoria
 * (no necesitamos vector DB para ~20 docs) y le pide al LLM que ajuste ±15%
 * con una justificación explicada.
 *
 * Prompt exacto: docs/06-ia-y-prompts.md
 */
import { getAi, conTimeout, parsearJson, MODELO } from "./client";
import { acotarAjusteIa, tendenciaDe } from "../pricing";
import type { Tendencia, SenalMercado } from "../types";
import type { PrecioResponse } from "../types";

// -- Base de conocimiento cargada desde JSON ----------------------------------

import senalesJson from "../../data/knowledge/senales-mercado.json";

interface SenalRaw {
  id: string;
  tipo: string;
  titulo: string;
  contenido: string;
  fecha: string;
  simulada: boolean;
  fuente?: string;
}

const DOCUMENTOS: SenalRaw[] = (senalesJson as { senales: SenalRaw[] }).senales;

// -- Embeddings en memoria -----------------------------------------------------

let embeddingsCache: { doc: SenalRaw; vector: number[] }[] | null = null;

async function ensureEmbeddings(): Promise<{ doc: SenalRaw; vector: number[] }[]> {
  if (embeddingsCache) return embeddingsCache;

  const ai = getAi();
  const textos = DOCUMENTOS.map((d) => `${d.titulo}. ${d.contenido}`);

  // Generar embeddings en lotes
  const result = await ai.models.embedContent({
    model: "text-embedding-004",
    contents: textos,
  });

  const vectors = result.embeddings?.map((e) => e.values ?? []) ?? [];
  embeddingsCache = DOCUMENTOS.map((doc, i) => ({ doc, vector: vectors[i] }));
  return embeddingsCache;
}

function similitudCoseno(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function recuperarSenales(query: string, topK = 3): Promise<SenalRaw[]> {
  const ai = getAi();
  const cache = await ensureEmbeddings();

  const queryResult = await ai.models.embedContent({
    model: "text-embedding-004",
    contents: [query],
  });
  const queryVector = queryResult.embeddings?.[0]?.values ?? [];

  const scored = cache.map(({ doc, vector }) => ({
    doc,
    score: similitudCoseno(queryVector, vector),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => s.doc);
}

// -- Prompt del LLM -----------------------------------------------------------

function construirPrompt(
  especie: string,
  pesoKg: number,
  horas: number,
  precioBase: number,
  descuentoPct: number,
  precioRegla: number,
  senales: SenalRaw[],
): string {
  const senalesTexto = senales
    .map((s) => `- ${s.titulo}: ${s.contenido}`)
    .join("\n");

  return `Eres analista de precios de pesca artesanal en Valparaíso, Chile.

Producto: ${especie}, ${pesoKg} kg, publicado hace ${horas} horas.
Precio base: $${precioBase}/kg
Descuento por tiempo (regla base ya aplicada): ${descuentoPct}% → $${precioRegla}/kg

Señales de contexto recuperadas:
${senalesTexto}

Ajusta el precio SOLO si las señales lo justifican, dentro de ±15% del precio de la regla base.
La justificación debe nombrar la señal concreta que usaste. No inventes señales.
Máximo 20 palabras, en español de Chile, dirigida al pescador.

Responde SOLO este JSON:
{"precio_sugerido": number, "tendencia": "alcista"|"bajista"|"estable",
 "justificacion": string, "senales_usadas": string[]}`;
}

// -- API pública ---------------------------------------------------------------

export interface InputRag {
  especie: string;
  pesoKg: number;
  horasPublicado: number;
  precioInicialKg: number;
  descuentoPct: number;
  precioReglaKg: number;
}

export async function ajustarPrecioConRag(input: InputRag): Promise<PrecioResponse> {
  const {
    especie,
    pesoKg,
    horasPublicado,
    precioInicialKg,
    descuentoPct,
    precioReglaKg,
  } = input;

  // 1. Recuperar señales por similitud
  const query = `${especie}, ${horasPublicado} horas sin venderse, agosto en Valparaíso`;
  let senales: SenalRaw[];
  try {
    senales = await recuperarSenales(query, 3);
  } catch {
    // Si los embeddings fallan, usar todas las señales (fallback)
    senales = DOCUMENTOS.slice(0, 3);
  }

  // 2. LLM ajusta precio con contexto
  const prompt = construirPrompt(
    especie, pesoKg, horasPublicado,
    precioInicialKg, descuentoPct, precioReglaKg,
    senales,
  );

  try {
    const ai = getAi();
    const resultado = await conTimeout(
      ai.models.generateContent({
        model: MODELO,
        contents: [{ text: prompt }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      }),
    );

    const parsed = parsearJson<{
      precio_sugerido: number;
      tendencia: Tendencia;
      justificacion: string;
      senales_usadas: string[];
    }>(resultado.text ?? "");

    // 3. Acotar ajuste a ±15% del precio de regla
    const { precio: precioFinal, fueAcotado } = acotarAjusteIa(
      precioReglaKg,
      parsed.precio_sugerido,
    );

    const tendencia = tendenciaDe(precioReglaKg, precioFinal);

    return {
      precioAnteriorKg: precioReglaKg,
      precioActualKg: precioFinal,
      descuentoPct: Math.round((1 - precioFinal / precioInicialKg) * 100),
      tendencia,
      justificacion: fueAcotado
        ? `${parsed.justificacion} (ajuste limitado a ±15%)`
        : parsed.justificacion,
      senalesUsadas: parsed.senales_usadas ?? senales.map((s) => s.titulo),
      degradado: false,
    };
  } catch {
    // Fallback: solo regla base, sin IA
    return {
      precioAnteriorKg: precioReglaKg,
      precioActualKg: precioReglaKg,
      descuentoPct,
      tendencia: "estable" as Tendencia,
      justificacion: "Precio ajustado por regla base (IA no disponible).",
      senalesUsadas: [],
      degradado: true,
    };
  }
}

export { recuperarSenales };
