/**
 * Precio dinámico — CAPA A: regla determinista.
 *
 * Función pura, sin red y sin IA. Es lo que sostiene el feature central del producto
 * si Gemini se cae en medio del pitch. La capa RAG (src/lib/ai/price-rag.ts) solo
 * ajusta ±15% sobre este resultado y agrega la explicación.
 *
 * Ver docs/06-ia-y-prompts.md
 */

import type { Tendencia } from "./types";

export interface TramoDescuento {
  /** Horas desde la publicación en que empieza a aplicar */
  desdeHoras: number;
  descuentoPct: number;
  etiqueta: string;
}

export const TRAMOS: TramoDescuento[] = [
  { desdeHoras: 0, descuentoPct: 0, etiqueta: "Fresco" },
  { desdeHoras: 6, descuentoPct: 10, etiqueta: "Primer ajuste" },
  { desdeHoras: 12, descuentoPct: 25, etiqueta: "Ajuste medio" },
  { desdeHoras: 24, descuentoPct: 40, etiqueta: "Última oportunidad" },
  { desdeHoras: 36, descuentoPct: 40, etiqueta: "Riesgo de merma" },
];

/** Sobre estas horas el producto se marca en riesgo de merma. */
export const HORAS_RIESGO_MERMA = 36;

/** Techo del ajuste que la capa de IA puede aplicar sobre la regla base. */
export const AJUSTE_IA_MAX_PCT = 15;

export function horasDesde(publicadoEn: Date | string, ahora = new Date()): number {
  const inicio =
    typeof publicadoEn === "string" ? new Date(publicadoEn) : publicadoEn;
  const ms = ahora.getTime() - inicio.getTime();
  return Math.max(0, ms / 3_600_000);
}

export function tramoDe(horas: number): TramoDescuento {
  let actual = TRAMOS[0];
  for (const tramo of TRAMOS) {
    if (horas >= tramo.desdeHoras) actual = tramo;
  }
  return actual;
}

export function descuentoPorHoras(horas: number): number {
  return tramoDe(horas).descuentoPct;
}

export function enRiesgoDeMerma(horas: number): boolean {
  return horas >= HORAS_RIESGO_MERMA;
}

export interface PrecioBase {
  precioActualKg: number;
  descuentoPct: number;
  horasPublicado: number;
  etiquetaTramo: string;
  riesgoMerma: boolean;
  /** Horas hasta el próximo tramo de descuento. null si ya está en el último. */
  horasHastaProximoTramo: number | null;
  proximoDescuentoPct: number | null;
}

/**
 * Precio actual según la regla base.
 * Redondea a $10 porque nadie cotiza pescado en $3.847,3 por kilo.
 */
export function calcularPrecioBase(
  precioInicialKg: number,
  publicadoEn: Date | string,
  ahora = new Date(),
): PrecioBase {
  const horas = horasDesde(publicadoEn, ahora);
  const tramo = tramoDe(horas);
  const precio = redondearAPesos(precioInicialKg * (1 - tramo.descuentoPct / 100));

  const siguiente = TRAMOS.find(
    (t) => t.desdeHoras > tramo.desdeHoras && t.descuentoPct > tramo.descuentoPct,
  );

  return {
    precioActualKg: precio,
    descuentoPct: tramo.descuentoPct,
    horasPublicado: Math.round(horas * 10) / 10,
    etiquetaTramo: tramo.etiqueta,
    riesgoMerma: enRiesgoDeMerma(horas),
    horasHastaProximoTramo: siguiente
      ? Math.max(0, siguiente.desdeHoras - horas)
      : null,
    proximoDescuentoPct: siguiente ? siguiente.descuentoPct : null,
  };
}

/**
 * Aplica el ajuste sugerido por la IA, acotado a ±AJUSTE_IA_MAX_PCT sobre el
 * precio de la regla base. Sin este tope el modelo propone precios absurdos y
 * perdemos control de la demo — es una restricción que pusimos nosotros.
 */
export function acotarAjusteIa(
  precioRegla: number,
  precioSugeridoIa: number,
): { precio: number; fueAcotado: boolean } {
  const max = precioRegla * (1 + AJUSTE_IA_MAX_PCT / 100);
  const min = precioRegla * (1 - AJUSTE_IA_MAX_PCT / 100);
  const acotado = Math.min(max, Math.max(min, precioSugeridoIa));
  return {
    precio: redondearAPesos(acotado),
    fueAcotado: acotado !== precioSugeridoIa,
  };
}

export function tendenciaDe(precioRegla: number, precioFinal: number): Tendencia {
  const delta = (precioFinal - precioRegla) / precioRegla;
  if (delta > 0.02) return "alcista";
  if (delta < -0.02) return "bajista";
  return "estable";
}

export function redondearAPesos(valor: number, multiplo = 10): number {
  return Math.round(valor / multiplo) * multiplo;
}

/** "3 h 40 min" — para el contador al próximo tramo en el marketplace. */
export function formatearHoras(horas: number): string {
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatearPesos(valor: number): string {
  return `$${Math.round(valor).toLocaleString("es-CL")}`;
}
