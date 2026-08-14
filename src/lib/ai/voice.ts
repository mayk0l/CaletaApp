import { getGemini, MODELO_VISION, conTimeout, parsearJson } from "./client";
import { ESPECIES, type Reconocimiento } from "@/lib/types";

/**
 * Uso 2 · Voz: transcripción + extracción de entidades en una sola pasada.
 * Gemini procesa el audio directamente — no montamos speech-to-text aparte.
 * Prompt exacto: docs/06-ia-y-prompts.md
 */

const PROMPT_VOZ = `Escucha el audio de un pescador artesanal chileno describiendo su captura.
Habla informal, con modismos y nombres locales de especies.

1) Transcribe literal.
2) Extrae los datos de la captura.

Normaliza la especie a una de: ${ESPECIES.join(", ")} (o "desconocida" si no corresponde a ninguna).
Si dice peso total en vez de peso por unidad, calcula el unitario y dilo en "notas".
Si un dato no se menciona, usa null. No inventes.

Responde SOLO este JSON:
{"transcripcion": string, "especie": string, "cantidad": number|null,
 "peso_unitario_kg": number|null, "peso_total_kg": number|null,
 "confianza": number 0-1, "notas": string}`;

export interface ResultadoVoz {
  transcripcion: string;
  reconocimiento: Reconocimiento;
}

export async function transcribirYExtraer(
  bytes: Uint8Array,
  mimeType: string,
): Promise<ResultadoVoz> {
  const ai = getGemini();
  const base64 = Buffer.from(bytes).toString("base64");

  const resultado = await conTimeout(
    ai.models.generateContent({
      model: MODELO_VISION,
      contents: [
        {
          role: "user",
          parts: [
            { text: PROMPT_VOZ },
            { inlineData: { mimeType, data: base64 } },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    }),
  );

  const parsed = parsearJson<{
    transcripcion: string;
    especie: string;
    cantidad: number | null;
    peso_unitario_kg: number | null;
    peso_total_kg: number | null;
    confianza: number;
    notas?: string;
  }>(resultado.text ?? "");

  const cantidad = parsed.cantidad ?? 1;
  const pesoUnitario = parsed.peso_unitario_kg ?? 0;

  return {
    transcripcion: parsed.transcripcion,
    reconocimiento: {
      especie: parsed.especie as Reconocimiento["especie"],
      confianza: parsed.confianza,
      pesoKgEstimado: pesoUnitario,
      cantidad,
      notas: parsed.notas,
      fuente: "voz",
    },
  };
}
