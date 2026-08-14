import { GoogleGenAI } from "@google/genai";

/**
 * ÚNICA puerta al proveedor de IA. Ningún route handler llama al SDK directo:
 * así cambiar de Gemini a OpenAI es tocar este archivo y nada más.
 * Ver docs/03-arquitectura.md (decisión 2) y docs/06-ia-y-prompts.md
 */

export const MODELO = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
export const TIMEOUT_MS = 12_000;

let cliente: GoogleGenAI | null = null;

export function getAi(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Falta GEMINI_API_KEY en el entorno. Ver .env.example");
  }
  cliente ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return cliente;
}

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
        temporizador = setTimeout(
          () => reject(new Error("IA_TIMEOUT")),
          ms,
        );
      }),
    ]);
  } finally {
    if (temporizador) clearTimeout(temporizador);
  }
}

/**
 * Los modelos a veces envuelven el JSON en ```json ... ```.
 * Nunca parsear prosa: si no hay JSON válido, es IA_SIN_RESULTADO.
 */
export function parsearJson<T>(texto: string): T {
  const limpio = texto
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(limpio) as T;
}

/**
 * TODO(Manuel): implementar acá los 3 usos, con `responseMimeType: "application/json"`
 * y los prompts EXACTOS de docs/06-ia-y-prompts.md:
 *
 *   vision.ts     → reconocerEspecieDesdeFoto(bytes, mimeType)
 *   voice.ts      → transcribirYExtraer(bytes, mimeType)
 *   price-rag.ts  → recuperarSenales(query) + ajustarPrecio(contexto)
 *
 * Guardar SIEMPRE la respuesta cruda para persistirla en Captura.iaRaw:
 * es nuestra evidencia ante el jurado de que la IA hizo algo real.
 */
