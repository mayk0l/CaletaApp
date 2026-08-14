import { GoogleGenAI } from "@google/genai";

/**
 * ÚNICA puerta a los proveedores de IA. Ningún route handler llama a un SDK
 * o hace fetch directo: así cambiar de proveedor es tocar este archivo.
 *
 * DOS PROVEEDORES, cada uno donde es fuerte (docs/06-ia-y-prompts.md):
 *
 *  - VISIÓN  → Gemini (GEMINI_API_KEY). Los 5 modelos que dio Huawei para esta
 *    hackathon (GLM-5.x, DeepSeek-V3.2, Qwen3-32B) son SOLO texto — probados
 *    contra la API real, no hay ningún modelo VL disponible bajo este acceso.
 *
 *  - TEXTO (RAG de precios, extracción de entidades) → Huawei ModelArts MaaS
 *    (MAAS_API_KEY), API compatible con OpenAI. Es el modelo del NÚCLEO del
 *    producto: la sugerencia de precio dinámico.
 */

// ---------------------------------------------------------------- Gemini (visión)

export const MODELO_VISION = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
/** 12s alcanza para DeepSeek-V3.2 (~3s) y Qwen3-32B (~6s) con margen de red.
 *  Los modelos GLM de esta plataforma son de razonamiento y tardan 11-15s
 *  incluso para un JSON trivial: quedan fuera de este timeout a propósito. */
export const TIMEOUT_MS = 12_000;

let clienteGemini: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Falta GEMINI_API_KEY en el entorno. Ver .env.example");
  }
  clienteGemini ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return clienteGemini;
}

// ---------------------------------------------------------------- Huawei MaaS (texto)

const MAAS_URL =
  process.env.MAAS_BASE_URL ??
  "https://api-ap-southeast-1.modelarts-maas.com/v2/chat/completions";

/** El modelo por defecto para el RAG de precios.
 *
 *  Probados los 5 modelos que dio Huawei contra la API real: GLM-5.2/5.1/5 son
 *  modelos de razonamiento y tardan 11-15s incluso para un JSON trivial —
 *  demasiado lento para una demo en vivo. DeepSeek-V3.2 respondió en ~3s.
 *  Qwen3-32B en ~6s es la alternativa si DeepSeek falla.
 */
export const MODELO_TEXTO = process.env.MAAS_MODEL ?? "deepseek-v3.2";

export interface ChatMensaje {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Llama a un modelo de texto de Huawei MaaS. `responseFormat: "json"` fuerza
 * salida JSON cuando el modelo lo soporta; igual se parsea de forma defensiva
 * porque no todos los modelos de esta lista lo respetan al 100%.
 */
export async function chatTexto(
  mensajes: ChatMensaje[],
  opciones: { model?: string; maxTokens?: number; temperature?: number } = {},
): Promise<{ contenido: string; crudo: unknown }> {
  if (!process.env.MAAS_API_KEY) {
    throw new Error("Falta MAAS_API_KEY en el entorno. Ver .env.example");
  }

  const body = {
    model: opciones.model ?? MODELO_TEXTO,
    messages: mensajes,
    max_tokens: opciones.maxTokens ?? 300,
    temperature: opciones.temperature ?? 0.3,
  };

  const respuesta = await conTimeout(
    fetch(MAAS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MAAS_API_KEY}`,
      },
      body: JSON.stringify(body),
    }),
  );

  if (!respuesta.ok) {
    const texto = await respuesta.text().catch(() => "");
    throw new Error(`MAAS_HTTP_${respuesta.status}: ${texto.slice(0, 200)}`);
  }

  const json = await respuesta.json();
  const contenido = json?.choices?.[0]?.message?.content;
  if (typeof contenido !== "string") {
    throw new Error("IA_SIN_RESULTADO: respuesta sin choices[0].message.content");
  }

  return { contenido, crudo: json };
}

// ---------------------------------------------------------------- utilidades comunes

/** Toda llamada a IA pasa por acá: si se pasa de TIMEOUT_MS, se corta. */
export async function conTimeout<T>(
  promesa: Promise<T>,
  ms = TIMEOUT_MS,
): Promise<T> {
  let temporizador: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promesa,
      new Promise<never>((_, reject) => {
        temporizador = setTimeout(() => reject(new Error("IA_TIMEOUT")), ms);
      }),
    ]);
  } finally {
    if (temporizador) clearTimeout(temporizador);
  }
}

/**
 * Los modelos a veces envuelven el JSON en ```json ... ``` o agregan texto
 * de razonamiento antes/después (visto en GLM y DeepSeek). Se busca el primer
 * bloque {...} o [...] balanceado. Nunca parsear prosa a ciegas.
 */
export function parsearJson<T>(texto: string): T {
  const limpio = texto
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(limpio) as T;
  } catch {
    const inicio = limpio.search(/[{[]/);
    if (inicio === -1) throw new Error("IA_SIN_RESULTADO: no hay JSON en la respuesta");
    const abre = limpio[inicio];
    const cierra = abre === "{" ? "}" : "]";
    let profundidad = 0;
    for (let i = inicio; i < limpio.length; i++) {
      if (limpio[i] === abre) profundidad++;
      if (limpio[i] === cierra) {
        profundidad--;
        if (profundidad === 0) {
          return JSON.parse(limpio.slice(inicio, i + 1)) as T;
        }
      }
    }
    throw new Error("IA_SIN_RESULTADO: JSON no balanceado en la respuesta");
  }
}
