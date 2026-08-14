import { GoogleGenAI, ThinkingLevel } from "@google/genai";

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

/**
 * CADENA DE MODELOS, no un modelo único. Se prueba en orden y se pasa al
 * siguiente ante un error transitorio (503 por saturación, 429 por cuota
 * diaria agotada, timeout). Medido contra la API real el 2026-08-14:
 *
 *  - `gemini-3.5-flash`      → 503 "high traffic" en 8/8 intentos. Es el mejor
 *    de la línea 3.5, así que queda primero: cuando Google libere capacidad se
 *    usa solo. Hoy corta en ~1-3s y cae al siguiente sin que se note.
 *  - `gemini-3.6-flash`      → 3/3 OK (foto 2.2s, audio 3.8s). Va segundo por
 *    ser el más confiable de todos los medidos: es el que sostiene la demo.
 *  - `gemini-3.5-flash-lite` → foto en 886ms cuando responde, pero se colgó
 *    hasta agotar el timeout en una de tres. Último recurso, con cuota propia
 *    (el límite diario es por modelo).
 *
 * Los 2.x quedan fuera a propósito: están deprecados, y además el tier gratuito
 * ya solo daba 20 requests/día para `gemini-2.5-flash`.
 * `GEMINI_MODEL` sigue funcionando para forzar uno solo desde el entorno.
 */
export const MODELOS_VISION: readonly string[] = process.env.GEMINI_MODEL
  ? [process.env.GEMINI_MODEL]
  : ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];

/** Primer modelo de la cadena. Se mantiene por compatibilidad y para logs. */
export const MODELO_VISION = MODELOS_VISION[0];

/** 12s alcanza para DeepSeek-V3.2 (~3s) y Qwen3-32B (~6s) con margen de red.
 *  Los modelos GLM de esta plataforma son de razonamiento y tardan 11-15s
 *  incluso para un JSON trivial: quedan fuera de este timeout a propósito. */
export const TIMEOUT_MS = 12_000;

/** Timeout POR INTENTO de la cadena, no total. Las llamadas multimodales suben
 *  el binario en base64 y tienen una cola de latencia larga: se midieron hasta
 *  48s en una sola foto con el modelo saturado, mientras el camino bueno va de
 *  0.9s a 7s. Los 12s originales cortaban respuestas normales y por eso
 *  `/api/capturas/imagen` y `/api/capturas/voz` devolvían `IA_TIMEOUT` de forma
 *  intermitente; 30s hacían esperar media demo a un modelo colgado. 15s está
 *  muy por encima del camino bueno y deja alcanzar los 3 modelos de la cadena. */
export const TIMEOUT_MULTIMODAL_MS = 15_000;

/** Extraer un JSON de 6 campos no necesita razonamiento en cadena, y pagarlo
 *  cuesta latencia: con razonamiento por defecto se midieron 9.5s / 9.0s / 36.1s
 *  (promedio 18.2s) y 1000-1600 tokens de "thinking" tirados a la basura; con el
 *  razonamiento al mínimo, 886ms-2.1s por la misma respuesta.
 *
 *  Gemini 3.x usa `thinkingLevel`; `thinkingBudget` es de los 2.x y en 3.x
 *  devuelve 400 INVALID_ARGUMENT. */
export const RAZONAMIENTO_MINIMO = { thinkingLevel: ThinkingLevel.MINIMAL } as const;

let clienteGemini: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Falta GEMINI_API_KEY en el entorno. Ver .env.example");
  }
  clienteGemini ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return clienteGemini;
}

/**
 * Ejecuta `llamar` contra la cadena de modelos, con timeout por intento.
 * Ante un error transitorio prueba el siguiente modelo; ante un error real
 * (prompt inválido, key mala) corta de una y propaga.
 *
 * Existe porque en un solo día de pruebas se vieron las tres formas de fallar
 * del tier gratuito: 503 por saturación del modelo, 429 por cuota diaria
 * agotada (es por modelo, así que otro modelo sí responde) y respuestas de 48s.
 */
export async function conCadenaDeModelos<T>(
  llamar: (modelo: string) => Promise<T>,
  modelos: readonly string[] = MODELOS_VISION,
): Promise<T> {
  let ultimoError: unknown = new Error("IA_SIN_RESULTADO: cadena de modelos vacía");

  for (const [indice, modelo] of modelos.entries()) {
    try {
      return await conTimeout(llamar(modelo), TIMEOUT_MULTIMODAL_MS);
    } catch (err) {
      ultimoError = err;
      const esUltimo = indice === modelos.length - 1;
      if (!esErrorTransitorio(err) || esUltimo) throw err;
      console.warn(
        `[ia] ${modelo} falló (${motivoBreve(err)}); probando ${modelos[indice + 1]}`,
      );
    }
  }

  throw ultimoError;
}

/** 503/429/timeout son transitorios: vale la pena probar otro modelo. */
export function esErrorTransitorio(err: unknown): boolean {
  return esErrorDeCuota(err) || esErrorDeSobrecarga(err) || esTimeout(err);
}

export function esTimeout(err: unknown): boolean {
  return mensajeDe(err).includes("IA_TIMEOUT");
}

/**
 * El tier gratuito de Gemini limita por modelo y por día: se midió un tope de
 * 20 requests/día para `gemini-2.5-flash`. Sin esto el 429 caía en el catch
 * genérico y la UI mostraba "no se pudo reconocer la captura", que manda a
 * buscar el problema en la foto cuando en realidad solo hay que esperar.
 */
export function esErrorDeCuota(err: unknown): boolean {
  const mensaje = mensajeDe(err);
  return (
    mensaje.includes('"code":429') ||
    mensaje.includes("RESOURCE_EXHAUSTED") ||
    mensaje.includes("exceeded your current quota")
  );
}

/** 503: "This model is currently experiencing high traffic". No es culpa del
 *  input ni de la key, así que se distingue para no mentirle al usuario. */
export function esErrorDeSobrecarga(err: unknown): boolean {
  const mensaje = mensajeDe(err);
  return (
    mensaje.includes('"code":503') ||
    mensaje.includes("UNAVAILABLE") ||
    mensaje.includes("overloaded") ||
    mensaje.includes("high traffic")
  );
}

function mensajeDe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function motivoBreve(err: unknown): string {
  if (esErrorDeCuota(err)) return "cuota agotada";
  if (esErrorDeSobrecarga(err)) return "saturado (503)";
  if (esTimeout(err)) return `timeout ${TIMEOUT_MULTIMODAL_MS}ms`;
  return mensajeDe(err).slice(0, 60);
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
