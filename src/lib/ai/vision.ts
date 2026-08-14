import { getGemini, MODELO_VISION, conTimeout, parsearJson } from "./client";
import { ESPECIES, type Reconocimiento } from "@/lib/types";

/**
 * Reconocimiento de especie + peso/talla desde una foto. Proveedor: Gemini
 * (los modelos de Huawei disponibles en esta hackathon son solo de texto).
 * Prompt exacto: docs/06-ia-y-prompts.md, Uso 1.
 */

const PROMPT_VISION = `Eres un asistente de trazabilidad pesquera en la Región de Valparaíso, Chile.
Analiza la foto de una captura de pesca artesanal.

Identifica la especie SOLO entre: ${ESPECIES.join(", ")}.
Si no corresponde a ninguna, devuelve especie "desconocida" con confianza baja.
No inventes una especie que no esté en la lista.

Estima largo (cm) y peso (kg) usando objetos de referencia visibles
(mano, caja pesquera, guante, cubierta). Indica en "notas" qué referencia usaste.
Si no hay referencia de escala, baja la confianza y dilo en "notas".

Responde SOLO este JSON:
{"especie": string, "confianza": number, "largo_cm_estimado": number,
 "peso_kg_estimado": number, "cantidad": number, "notas": string}`;

interface RespuestaVisionCruda {
  especie: string;
  confianza: number;
  largo_cm_estimado: number;
  peso_kg_estimado: number;
  cantidad: number;
  notas: string;
}

const ESPECIES_VALIDAS = new Set<string>([...ESPECIES, "desconocida"]);

export async function reconocerEspecieDesdeFoto(
  bytes: Buffer,
  mimeType: string,
): Promise<{ reconocimiento: Reconocimiento; crudo: unknown }> {
  const ai = getGemini();
  const base64 = bytes.toString("base64");

  const respuesta = await conTimeout(
    ai.models.generateContent({
      model: MODELO_VISION,
      contents: [
        {
          role: "user",
          parts: [
            { text: PROMPT_VISION },
            { inlineData: { mimeType, data: base64 } },
          ],
        },
      ],
      config: { responseMimeType: "application/json" },
    }),
  );

  const texto = respuesta.text;
  if (!texto) throw new Error("IA_SIN_RESULTADO: Gemini no devolvió texto");

  const cruda = parsearJson<RespuestaVisionCruda>(texto);

  const especie = ESPECIES_VALIDAS.has(cruda.especie) ? cruda.especie : "desconocida";
  const confianza = especie === cruda.especie ? clamp01(cruda.confianza) : 0;

  const reconocimiento: Reconocimiento = {
    especie: especie as Reconocimiento["especie"],
    confianza,
    pesoKgEstimado: cruda.peso_kg_estimado ?? 0,
    largoCmEstimado: cruda.largo_cm_estimado,
    cantidad: cruda.cantidad ?? 1,
    notas: cruda.notas,
    fuente: "vision",
  };

  return { reconocimiento, crudo: respuesta };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
