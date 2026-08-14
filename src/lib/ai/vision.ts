/**
 * Uso 1 · Visión: especie + peso desde foto.
 * Prompt exacto: docs/06-ia-y-prompts.md
 */
import { getAi, conTimeout, parsearJson, MODELO } from "./client";
import { ESPECIES, type Reconocimiento } from "../types";

const PROMPT_VISION = `Eres un asistente de trazabilidad pesquera en la Región de Valparaíso, Chile.
Analiza la foto de una captura de pesca artesanal.

Identifica la especie SOLO entre: ${ESPECIES.join(", ")}.
Si no corresponde a ninguna, devuelve especie "desconocida" con confianza baja.
No inventes una especie que no esté en la lista.

Estima largo (cm) y peso (kg) usando objetos de referencia visibles
(mano, caja pesquera, guante, cubierta). Indica en "notas" qué referencia usaste.
Si no hay referencia de escala, baja la confianza y dilo en "notas".

Responde SOLO este JSON:
{"especie": string, "confianza": number 0-1, "largo_cm_estimado": number,
 "peso_kg_estimado": number, "cantidad": number, "notas": string}`;

export async function reconocerEspecieDesdeFoto(
  bytes: Uint8Array,
  mimeType: string,
): Promise<Reconocimiento> {
  const ai = getAi();

  const resultado = await conTimeout(
    ai.models.generateContent({
      model: MODELO,
      contents: [
        { text: PROMPT_VISION },
        {
          inlineData: {
            mimeType,
            data: Buffer.from(bytes).toString("base64"),
          },
        },
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    }),
  );

  const parsed = parsearJson<{
    especie: string;
    confianza: number;
    largo_cm_estimado: number;
    peso_kg_estimado: number;
    cantidad: number;
    notas?: string;
  }>(resultado.text ?? "");

  return {
    especie: parsed.especie as Reconocimiento["especie"],
    confianza: parsed.confianza,
    pesoKgEstimado: parsed.peso_kg_estimado,
    largoCmEstimado: parsed.largo_cm_estimado,
    cantidad: parsed.cantidad || 1,
    notas: parsed.notas,
    fuente: "vision",
  };
}
