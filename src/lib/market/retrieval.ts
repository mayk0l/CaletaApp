/**
 * RECUPERACIÓN — BM25 con decaimiento por recencia.
 *
 * Antes la recuperación era `titulo.includes(especie)` con un bonus fijo por tipo.
 * Eso falla de dos formas: no distingue un documento que menciona la especie una
 * vez de otro que habla de ella todo el tiempo, y trata igual un dato de hoy que
 * uno de hace tres semanas — en precios de pescado fresco, la recencia es la mitad
 * de la señal.
 *
 * BM25 es el estándar de recuperación léxica y con un corpus de decenas de
 * documentos rinde igual que embeddings, sin costo de red ni de API. Si el corpus
 * crece a miles de documentos o hay que capturar sinónimos ("marejada" ~ "oleaje"),
 * ahí sí conviene pasar a embeddings; el contrato de `recuperar()` no cambiaría.
 */

import type { DocumentoMercado } from "./corpus";

const K1 = 1.5;
const B = 0.75;
/** Vida media de la relevancia: a los 7 días un documento pesa la mitad. */
const VIDA_MEDIA_DIAS = 7;

/** Palabras que no aportan a la discriminación en español. */
const VACIAS = new Set([
  "de", "la", "el", "los", "las", "un", "una", "y", "o", "en", "con", "por",
  "para", "del", "al", "se", "su", "sus", "es", "son", "que", "sobre", "vs",
  "respecto", "sin", "no", "mas", "más", "dia", "día", "dias", "días",
]);

export function tokenizar(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos: "marejadas" ~ "marejádas"
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !VACIAS.has(t));
}

export interface DocumentoPuntuado {
  documento: DocumentoMercado;
  score: number;
  scoreBm25: number;
  pesoRecencia: number;
}

function diasEntre(desde: string, hasta: Date): number {
  const d = new Date(`${desde}T00:00:00Z`).getTime();
  const ms = hasta.getTime() - d;
  return Math.max(0, ms / 86_400_000);
}

/**
 * Recupera los `top` documentos más relevantes para una consulta.
 *
 * El score final es BM25 · pesoRecencia. El peso de recencia usa decaimiento
 * exponencial con vida media de 7 días, y nunca baja de 0.15 para que un
 * documento viejo pero muy relevante no desaparezca del todo.
 */
export function recuperar(
  corpus: DocumentoMercado[],
  consulta: string,
  opciones: { top?: number; hoy?: Date } = {},
): DocumentoPuntuado[] {
  const top = opciones.top ?? 4;
  const hoy = opciones.hoy ?? new Date();
  if (!corpus.length) return [];

  const docsTokens = corpus.map((d) => tokenizar(`${d.titulo} ${d.contenido} ${d.tipo}`));
  const longitudes = docsTokens.map((t) => t.length);
  const longitudMedia = longitudes.reduce((s, v) => s + v, 0) / corpus.length;
  const N = corpus.length;

  const terminos = tokenizar(consulta);
  // df por término
  const df = new Map<string, number>();
  for (const t of new Set(terminos)) {
    let c = 0;
    for (const tokens of docsTokens) if (tokens.includes(t)) c++;
    df.set(t, c);
  }

  const puntuados: DocumentoPuntuado[] = corpus.map((documento, i) => {
    const tokens = docsTokens[i];
    let scoreBm25 = 0;

    for (const t of terminos) {
      const tf = tokens.filter((x) => x === t).length;
      if (tf === 0) continue;
      const n = df.get(t) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      const denom = tf + K1 * (1 - B + (B * tokens.length) / (longitudMedia || 1));
      scoreBm25 += idf * ((tf * (K1 + 1)) / denom);
    }

    const dias = diasEntre(documento.fecha, hoy);
    const pesoRecencia = Math.max(0.15, Math.exp((-Math.LN2 * dias) / VIDA_MEDIA_DIAS));

    return { documento, scoreBm25, pesoRecencia, score: scoreBm25 * pesoRecencia };
  });

  return puntuados
    .filter((p) => p.scoreBm25 > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, top);
}
