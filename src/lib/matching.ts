/**
 * Sugerencias de match entre pedidos de restaurante y productos publicados.
 *
 * NO usa LLM, y es a propósito: para 3 especies y una decena de productos un modelo
 * agrega latencia y no-determinismo sin mejorar el resultado. Es scoring por reglas
 * explícitas, con el desglose visible en pantalla. Ver docs/05-api-contratos.md.
 *
 * Todo acá es función pura: sin red, sin Prisma, sin Date.now() en el render.
 * La hora se inyecta como parámetro para que el resultado sea reproducible.
 *
 * Consume `ProductoPublico`, o sea la misma forma que devuelve GET /api/marketplace.
 * Así funciona contra src/lib/mocks.ts hoy y contra el endpoint real sin cambios.
 *
 * Dueño: Rubén. No requiere tocar src/app/api/**, prisma/** ni src/lib/pricing.ts.
 */

import { HORAS_RIESGO_MERMA, TRAMOS, formatearHoras, formatearPesos } from "./pricing";
import type { CandidatoMatch, Especie, EstadoPedido, ProductoPublico } from "./types";

// ---------------------------------------------------------------- tipos locales
// Se declaran acá y no en types.ts para no tocar el archivo compartido con Manuel.
// Si después consolidamos el contrato, mover estos tipos es un corta-pega.

export type EspecieConcreta = Exclude<Especie, "desconocida">;

export interface PedidoParaMatch {
  id: string;
  especie: EspecieConcreta;
  cantidadKg: number;
  /** ISO. Ordena la cola: a igual score, primero el que pidió antes. */
  creadoEn: string;
  restaurante: { nombre: string; comuna: string };
}

export type FactorId = "frescura" | "precio" | "calce" | "cercania" | "antiMerma";

export interface FactorScore {
  id: FactorId;
  etiqueta: string;
  puntos: number;
  maximo: number;
  /** Frase corta y concreta, mostrable tal cual en pantalla. */
  detalle: string;
}

/** Extiende el contrato de docs/05 con el desglose que muestra la UI. */
export interface SugerenciaMatch extends CandidatoMatch {
  factores: FactorScore[];
}

export interface SugerenciaPedido {
  pedidoId: string;
  restaurante: string;
  cantidadKg: number;
  score: number;
  motivo: string;
  factores: FactorScore[];
}

export interface ColaResuelta {
  pedido: PedidoParaMatch;
  estado: EstadoPedido;
  sugerencias: SugerenciaMatch[];
}

// ---------------------------------------------------------------- pesos

/** Suman 100. Explícitos y exportados porque la UI los muestra. */
export const PESOS: Record<FactorId, number> = {
  frescura: 30,
  precio: 25,
  calce: 20,
  cercania: 15,
  antiMerma: 10,
};

export const ETIQUETAS: Record<FactorId, string> = {
  frescura: "Frescura",
  precio: "Precio",
  calce: "Calce de cantidad",
  cercania: "Cercanía",
  antiMerma: "Anti-merma",
};

/** Cuántas sugerencias se ofrecen por pedido. Más de 3 no ayuda a decidir. */
export const MAX_SUGERENCIAS = 3;

/** Descuento máximo que puede alcanzar la regla base. Se deriva de pricing.ts
 *  para que el factor precio no quede desincronizado si cambian los tramos. */
const DESCUENTO_MAX_PCT = Math.max(...TRAMOS.map((t) => t.descuentoPct));

/** Sobre este descuento el producto conviene colocarlo hoy. */
const DESCUENTO_URGENTE_PCT = 25;

/** Caleta → comuna y región, para el factor de cercanía.
 *  Mock acotado a la V Región: es el alcance de la demo. */
const CALETAS: Record<string, { comuna: string; region: string }> = {
  "Caleta Portales": { comuna: "Valparaíso", region: "Valparaíso" },
  "Caleta El Membrillo": { comuna: "Valparaíso", region: "Valparaíso" },
  "Caleta Higuerillas": { comuna: "Concón", region: "Valparaíso" },
  "Caleta Quintay": { comuna: "Casablanca", region: "Valparaíso" },
};

const REGION_POR_DEFECTO = "Valparaíso";

export function ubicacionDeCaleta(caleta: string): { comuna: string; region: string } {
  return CALETAS[caleta] ?? { comuna: caleta, region: REGION_POR_DEFECTO };
}

// ---------------------------------------------------------------- filtros duros

export type MotivoDescarte =
  | "especie_distinta"
  | "no_disponible"
  | "cantidad_insuficiente";

/**
 * Filtros que no se negocian con puntaje: si no pasan, el producto no es candidato.
 * Devolver el motivo permite explicar en la UI por qué la cola sigue esperando.
 */
export function descartar(
  pedido: PedidoParaMatch,
  producto: ProductoPublico,
): MotivoDescarte | null {
  if (producto.especie !== pedido.especie) return "especie_distinta";
  if (producto.estado !== "disponible") return "no_disponible";
  if (producto.pesoKg < pedido.cantidadKg) return "cantidad_insuficiente";
  return null;
}

export const TEXTO_DESCARTE: Record<MotivoDescarte, string> = {
  especie_distinta: "otra especie",
  no_disponible: "no está disponible",
  cantidad_insuficiente: "no alcanza la cantidad pedida",
};

// ---------------------------------------------------------------- factores

function acotar01(valor: number): number {
  return Math.min(1, Math.max(0, valor));
}

function redondear1(valor: number): number {
  return Math.round(valor * 10) / 10;
}

function factorFrescura(producto: ProductoPublico): FactorScore {
  const proporcion = acotar01(1 - producto.horasPublicado / HORAS_RIESGO_MERMA);
  return {
    id: "frescura",
    etiqueta: ETIQUETAS.frescura,
    puntos: redondear1(PESOS.frescura * proporcion),
    maximo: PESOS.frescura,
    detalle: `${formatearHoras(producto.horasPublicado)} desde el desembarque`,
  };
}

function factorPrecio(producto: ProductoPublico): FactorScore {
  const descuento =
    producto.precioInicialKg > 0
      ? (producto.precioInicialKg - producto.precioActualKg) / producto.precioInicialKg
      : 0;
  const proporcion = acotar01((descuento * 100) / DESCUENTO_MAX_PCT);
  return {
    id: "precio",
    etiqueta: ETIQUETAS.precio,
    puntos: redondear1(PESOS.precio * proporcion),
    maximo: PESOS.precio,
    detalle:
      producto.descuentoPct > 0
        ? `${formatearPesos(producto.precioActualKg)}/kg, −${producto.descuentoPct}% bajo el precio base`
        : `${formatearPesos(producto.precioActualKg)}/kg, precio base sin ajuste`,
  };
}

function factorCalce(pedido: PedidoParaMatch, producto: ProductoPublico): FactorScore {
  const proporcion = producto.pesoKg > 0 ? acotar01(pedido.cantidadKg / producto.pesoKg) : 0;
  const sobrante = redondear1(producto.pesoKg - pedido.cantidadKg);
  return {
    id: "calce",
    etiqueta: ETIQUETAS.calce,
    puntos: redondear1(PESOS.calce * proporcion),
    maximo: PESOS.calce,
    detalle:
      sobrante <= 0
        ? `calce exacto con los ${pedido.cantidadKg} kg pedidos`
        : `cubre los ${pedido.cantidadKg} kg pedidos y sobran ${sobrante} kg`,
  };
}

function factorCercania(pedido: PedidoParaMatch, producto: ProductoPublico): FactorScore {
  const origen = ubicacionDeCaleta(producto.pescador.caleta);
  const mismaComuna = origen.comuna === pedido.restaurante.comuna;
  const mismaRegion = origen.region === REGION_POR_DEFECTO;

  const puntos = mismaComuna ? PESOS.cercania : mismaRegion ? PESOS.cercania * 0.5 : 0;
  return {
    id: "cercania",
    etiqueta: ETIQUETAS.cercania,
    puntos: redondear1(puntos),
    maximo: PESOS.cercania,
    detalle: mismaComuna
      ? `misma comuna (${origen.comuna})`
      : mismaRegion
        ? `misma región, desde ${origen.comuna}`
        : `fuera de la región (${origen.comuna})`,
  };
}

/**
 * Bonus por liquidar antes de que se pierda. No es un truco de scoring: reducir
 * la merma es el propósito del producto, así que el ranking lo premia explícitamente.
 */
function factorAntiMerma(producto: ProductoPublico): FactorScore {
  const urgente =
    producto.descuentoPct >= DESCUENTO_URGENTE_PCT ||
    producto.horasPublicado >= HORAS_RIESGO_MERMA;
  return {
    id: "antiMerma",
    etiqueta: ETIQUETAS.antiMerma,
    puntos: urgente ? PESOS.antiMerma : 0,
    maximo: PESOS.antiMerma,
    detalle: urgente
      ? "en riesgo de merma: conviene colocarlo hoy"
      : "sin urgencia de colocación",
  };
}

export function calcularFactores(
  pedido: PedidoParaMatch,
  producto: ProductoPublico,
): FactorScore[] {
  return [
    factorFrescura(producto),
    factorPrecio(producto),
    factorCalce(pedido, producto),
    factorCercania(pedido, producto),
    factorAntiMerma(producto),
  ];
}

// ---------------------------------------------------------------- motivo

/**
 * Nombra los dos factores que más pesaron, igual que la justificación del precio
 * nombra la señal concreta que usó. Una frase genérica no convence a nadie.
 */
export function redactarMotivo(
  producto: ProductoPublico,
  factores: FactorScore[],
): string {
  const dominantes = [...factores]
    .filter((f) => f.puntos > 0)
    .sort((a, b) => b.puntos / b.maximo - a.puntos / a.maximo)
    .slice(0, 2);

  const cabecera = `${producto.especie} de ${producto.pesoKg} kg de ${producto.pescador.nombre}`;
  if (dominantes.length === 0) return cabecera;
  return `${cabecera} · ${dominantes.map((f) => f.detalle).join(" y ")}`;
}

// ---------------------------------------------------------------- puntuación

export function puntuar(
  pedido: PedidoParaMatch,
  producto: ProductoPublico,
): SugerenciaMatch {
  const factores = calcularFactores(pedido, producto);
  const score = redondear1(factores.reduce((total, f) => total + f.puntos, 0));

  return {
    productoId: producto.id,
    especie: producto.especie,
    pesoKg: producto.pesoKg,
    precioActualKg: producto.precioActualKg,
    horasPublicado: producto.horasPublicado,
    score,
    motivo: redactarMotivo(producto, factores),
    factores,
  };
}

/** Orden estable: score, luego frescura, luego id. Sin esto la demo cambia entre recargas. */
function porScore(a: SugerenciaMatch, b: SugerenciaMatch): number {
  if (b.score !== a.score) return b.score - a.score;
  if (a.horasPublicado !== b.horasPublicado) return a.horasPublicado - b.horasPublicado;
  return a.productoId.localeCompare(b.productoId);
}

/** Dirección 1: el restaurante programa un pedido y se le sugieren productos. */
export function sugerirParaPedido(
  pedido: PedidoParaMatch,
  productos: ProductoPublico[],
  limite = MAX_SUGERENCIAS,
): SugerenciaMatch[] {
  return productos
    .filter((p) => descartar(pedido, p) === null)
    .map((p) => puntuar(pedido, p))
    .sort(porScore)
    .slice(0, limite);
}

/**
 * Dirección 2: se publica una captura nueva y se recorre la cola para ver a qué
 * pedidos les sirve. Mismo score, así que las dos vistas nunca se contradicen.
 * A igual score gana quien pidió primero: la cola respeta el orden de llegada.
 */
export function sugerirParaProducto(
  producto: ProductoPublico,
  pedidos: PedidoParaMatch[],
  limite = MAX_SUGERENCIAS,
): SugerenciaPedido[] {
  const ranking: Array<{ creadoEn: string; sugerencia: SugerenciaPedido }> = pedidos
    .filter((pedido) => descartar(pedido, producto) === null)
    .map((pedido) => {
      const s = puntuar(pedido, producto);
      return {
        creadoEn: pedido.creadoEn,
        sugerencia: {
          pedidoId: pedido.id,
          restaurante: pedido.restaurante.nombre,
          cantidadKg: pedido.cantidadKg,
          score: s.score,
          motivo: s.motivo,
          factores: s.factores,
        },
      };
    });

  return ranking
    .sort((a, b) =>
      b.sugerencia.score !== a.sugerencia.score
        ? b.sugerencia.score - a.sugerencia.score
        : a.creadoEn.localeCompare(b.creadoEn),
    )
    .slice(0, limite)
    .map((r) => r.sugerencia);
}

/**
 * Estado derivado, no persistido: un pedido está en `cola` mientras no haya nada
 * que sugerirle, y pasa a `match` cuando aparece al menos un candidato. `resuelto`
 * lo escribe la acción del restaurante al tomar una sugerencia.
 *
 * Son sugerencias, no reservas: un mismo producto puede aparecer en varios pedidos.
 * Por eso el matching no escribe `Producto.estado` y no interfiere con el marketplace.
 */
export function estadoDerivado(sugerencias: SugerenciaMatch[]): EstadoPedido {
  return sugerencias.length > 0 ? "match" : "cola";
}

/** Vista completa de la cola, en orden de llegada. */
export function resolverCola(
  pedidos: PedidoParaMatch[],
  productos: ProductoPublico[],
  limite = MAX_SUGERENCIAS,
): ColaResuelta[] {
  return [...pedidos]
    .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
    .map((pedido) => {
      const sugerencias = sugerirParaPedido(pedido, productos, limite);
      return { pedido, estado: estadoDerivado(sugerencias), sugerencias };
    });
}

/** Por qué la cola sigue esperando. Se muestra en el estado vacío. */
export function explicarEspera(
  pedido: PedidoParaMatch,
  productos: ProductoPublico[],
): string {
  if (productos.length === 0) return "Todavía no hay capturas publicadas.";

  const motivos = new Set<MotivoDescarte>();
  for (const p of productos) {
    const motivo = descartar(pedido, p);
    if (motivo) motivos.add(motivo);
  }

  const relevantes = (["cantidad_insuficiente", "no_disponible", "especie_distinta"] as const)
    .filter((m) => motivos.has(m))
    .map((m) => TEXTO_DESCARTE[m]);

  return `Ningún producto calza con ${pedido.cantidadKg} kg de ${pedido.especie}: ${relevantes.join(", ")}.`;
}
