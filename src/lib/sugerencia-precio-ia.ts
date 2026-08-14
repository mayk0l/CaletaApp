/**
 * Capa B de la sugerencia de precio: el RAG explica, las reglas deciden.
 *
 * El NÚMERO lo calcula src/lib/sugerencia-precio.ts con factores explícitos. El
 * modelo no lo mueve, y eso es a propósito: un precio que cambia de valor entre
 * dos consultas no es defendible frente a un pescador ni frente a un jurado.
 * Lo que aporta el LLM es lo que un modelo hace bien — leer las señales
 * recuperadas y escribir una frase corta que nombre la que pesó.
 *
 * Si el modelo falla, se queda la justificación de plantilla de la capa A con
 * degradado:true. La sugerencia nunca desaparece.
 *
 * Reutiliza el cliente y la recuperación de señales de Manuel por import, sin
 * modificar sus archivos (docs/08-convenciones-git.md).
 */

import { MODELO_TEXTO, chatTexto, parsearJson } from "@/lib/ai/client";
import { recuperarSenales } from "@/lib/ai/price-rag";
import type { SugerenciaPrecio } from "./sugerencia-precio";

interface RespuestaCruda {
  justificacion: string;
  senales_usadas: string[];
}

/** Techo de palabras de la frase: tiene que caber en una tarjeta del móvil. */
const MAX_PALABRAS = 25;

/**
 * Vocativos que el modelo agrega por su cuenta cuando se le pide "español de
 * Chile": hermano, compadre, oye. No los pidió nadie, cambian en cada respuesta
 * y en pantalla suenan a caricatura. El prompt ya los prohíbe; esto es el
 * seguro, porque el tono de la demo no puede depender de que el modelo obedezca.
 */
const VOCATIVOS = [
  "hermano",
  "hermana",
  "compadre",
  "compare",
  "amigo",
  "amiga",
  "oye",
  "mira",
  "ojo",
  "estimado",
  "don",
  "señor",
  "pescador",
  "colega",
  "weon",
  "weón",
];

/** Quita el vocativo inicial si el modelo lo agregó, y deja la frase capitalizada. */
export function limpiarVocativo(frase: string): string {
  let texto = frase.trim();

  // Puede venir encadenado: "Oye, hermano, sube el precio…"
  for (let i = 0; i < 3; i++) {
    const coincide = texto.match(/^([\p{L}]+)\s*[,:]\s*(.+)$/u);
    if (!coincide) break;

    const primera = coincide[1].toLowerCase();
    if (!VOCATIVOS.includes(primera)) break;
    texto = coincide[2].trim();
  }

  texto = texto.replace(/!+/g, ".").replace(/\.\.+$/, ".");
  return texto.charAt(0).toLocaleUpperCase("es-CL") + texto.slice(1);
}

export interface ExplicacionIa {
  justificacion: string;
  senalesUsadas: string[];
  modelo: string;
  crudo: unknown;
}

export async function explicarSugerencia(
  especie: string,
  sugerencia: SugerenciaPrecio,
): Promise<ExplicacionIa> {
  const narrativas = recuperarSenales(especie);
  const contexto = narrativas.map((s) => `- ${s.titulo}: ${s.contenido}`).join("\n");

  const factores = sugerencia.factores
    .map((f) => `- ${f.etiqueta}: ${f.puntosPct > 0 ? "+" : ""}${f.puntosPct} puntos · ${f.detalle}`)
    .join("\n");

  // La sugerencia se calcula sobre el precio BASE, y el producto puede tener
  // publicado otro precio (por ejemplo, uno que la tabla antigua ya bajó de
  // más). Sin decirle al modelo hacia dónde se mueve respecto de lo publicado,
  // escribe "conviene bajar" mientras el número sube.
  const direccion =
    sugerencia.diferenciaKg < 0
      ? `Respecto de lo que tiene publicado hoy ($${sugerencia.precioActualKg}/kg), el precio BAJA $${Math.abs(sugerencia.diferenciaKg)}.`
      : sugerencia.diferenciaKg > 0
        ? `Respecto de lo que tiene publicado hoy ($${sugerencia.precioActualKg}/kg), el precio SUBE $${sugerencia.diferenciaKg}: está vendiendo más barato de lo que las señales justifican.`
        : `Coincide con lo que tiene publicado hoy ($${sugerencia.precioActualKg}/kg).`;

  const prompt = `Eres quien le explica a un pescador artesanal de Valparaíso por qué le conviene ajustar el precio de su producto.

Producto: ${especie}, publicado hace ${sugerencia.horasPublicado} h, vida útil ${sugerencia.vidaUtilHoras} h.
Precio base: $${sugerencia.precioBaseKg}/kg.
Sugerencia ya calculada por reglas: ${sugerencia.reduccionPct}% bajo el precio base → $${sugerencia.precioSugeridoKg}/kg.
${direccion}
${sugerencia.riesgoMerma ? "El producto está en riesgo de merma." : ""}

Factores que produjeron esa sugerencia:
${factores}

Señales de contexto disponibles:
${contexto || "(sin señales relevantes)"}

Escribe UNA frase de máximo ${MAX_PALABRAS} palabras, en español de Chile neutro, tratando al pescador de tú,
que explique por qué conviene ese precio. Nombra el factor o la señal concreta que más pesó.
Empieza directamente con la recomendación o con el dato. NO uses vocativos ni saludos:
nada de "hermano", "compadre", "oye", "amigo", "mira" ni el nombre del pescador.
No uses signos de exclamación. La frase DEBE ser coherente con la dirección indicada arriba:
no digas "baja" si el precio sube.
NO cambies el porcentaje ni el precio: ya están decididos. No inventes señales que no estén arriba.

Responde SOLO este JSON:
{"justificacion": string, "senales_usadas": string[]}`;

  const { contenido, crudo } = await chatTexto(
    [
      {
        role: "system",
        content: "Respondes siempre con JSON válido, sin texto adicional.",
      },
      { role: "user", content: prompt },
    ],
    { model: MODELO_TEXTO, maxTokens: 200, temperature: 0.3 },
  );

  const parsed = parsearJson<RespuestaCruda>(contenido);
  const justificacion = parsed.justificacion?.trim();

  if (!justificacion) {
    throw new Error("El modelo no devolvió justificación.");
  }

  return {
    justificacion: limpiarVocativo(justificacion),
    senalesUsadas: parsed.senales_usadas?.length
      ? parsed.senales_usadas
      : sugerencia.senalesUsadas,
    modelo: MODELO_TEXTO,
    crudo,
  };
}
