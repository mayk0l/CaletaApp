/**
 * Motor de sugerencia de precio para reducir merma.
 *
 * REEMPLAZA la tabla fija de descuentos de src/lib/pricing.ts (0% · 10% a las 6 h ·
 * 25% a las 12 h · 40% a las 24 h). Esa tabla era un reloj: bajaba el precio por
 * tiempo transcurrido y nada más, sin saber si viene marejada ni si el fin de
 * semana hay turistas. Acá la reducción se DERIVA de señales.
 *
 * Capa A (este archivo): determinista, sin red, explicable factor por factor.
 * Capa B (src/lib/ai/price-rag.ts, de Manuel): el LLM redacta la justificación
 * sobre las señales recuperadas. Si falla, la capa A ya trae su propia
 * explicación por plantilla y la sugerencia sigue en pie.
 *
 * Es una SUGERENCIA: nada de esto escribe precios. El pescador decide.
 *
 * Los valores de las señales son ficticios y están rotulados como simulados; la
 * estructura es la que tendría una fuente real. Ver src/data/senales-precio.json
 */

import datos from "@/data/senales-precio.json";
import { TRAMOS, horasDesde, redondearAPesos, tramoDe } from "./pricing";
import type { Especie, Tendencia } from "./types";

// ---------------------------------------------------------------- datos

export type EfectoSenal =
  | "sobreoferta"
  | "escasez"
  | "baja_demanda_hoy"
  | "sube_demanda_hoy"
  | "sube_demanda_futura";

export interface SenalPrecio {
  id: string;
  tipo: "clima" | "temporada_turistica" | "oferta_regional";
  titulo: string;
  detalle: string;
  vigenteDesde: string;
  vigenteHasta: string;
  efecto: EfectoSenal;
  /** Puntos porcentuales que suma (positivo) o descuenta (negativo) a la reducción. */
  puntosPct: number;
  /** Si viene, la señal aplica solo a estas especies. */
  especies?: string[];
  /** Si viene, aplica solo estos días (1 = lunes … 7 = domingo). */
  diasSemana?: number[];
  simulada: boolean;
  fuente?: string;
}

const SENALES = datos.senales as SenalPrecio[];
const VIDA_UTIL: Record<string, number> = datos.vida_util_horas;

/** Vida útil por defecto cuando la especie no está en el catálogo. */
const VIDA_UTIL_POR_DEFECTO = 36;

/** Techo de la reducción sugerida. Coincide con el último tramo de la tabla
 *  antigua, para no proponer nunca algo más agresivo de lo que ya se aceptaba. */
const REDUCCION_MAX_PCT = Math.max(...TRAMOS.map((t) => t.descuentoPct));

/** Peso de la vida útil consumida en la reducción, en puntos porcentuales. */
const PESO_VIDA_UTIL_PCT = 32;

/** Bajo esta fracción de vida útil no se sugiere bajar por tiempo: está fresco. */
const FRESCURA_SIN_CASTIGO = 0.25;

/** Sobre esta fracción de vida útil el producto se considera en riesgo de merma. */
const UMBRAL_RIESGO = 0.75;

/**
 * Piso de reducción cuando el producto ya está en riesgo de merma.
 *
 * Sin esto, tres señales que sostienen el precio (escasez + marejada + día de
 * compra suman −18 pp) pueden anular el factor tiempo y dejar la sugerencia en
 * 0% para un producto a horas de perderse. Cuando queda poco tiempo, mover el
 * producto vale más que esperar un mejor precio: la urgencia manda.
 */
const REDUCCION_MINIMA_EN_RIESGO_PCT = 10;

export function vidaUtilHoras(especie: string): number {
  return VIDA_UTIL[especie.toLowerCase()] ?? VIDA_UTIL_POR_DEFECTO;
}

/**
 * Precio que el comprador está viendo ahora mismo.
 *
 * No es `Producto.precioActualKg`: ese campo es caché (docs/04-modelo-datos.md,
 * regla 1). El precio mostrado se deriva de `publicadoEn`, y el valor guardado
 * solo manda si el RAG lo ajustó hace menos de una hora — el mismo criterio que
 * usa GET /api/marketplace.
 *
 * Sin esto, la sugerencia se comparaba contra un caché viejo y la diferencia que
 * veía el pescador no coincidía con la del marketplace.
 */
export function precioMostradoKg(
  producto: {
    precioInicialKg: number;
    precioActualKg: number;
    publicadoEn: Date | string;
    ultimoAjuste?: Date | null;
  },
  ahora = new Date(),
): number {
  const ajusteReciente =
    producto.ultimoAjuste != null &&
    ahora.getTime() - new Date(producto.ultimoAjuste).getTime() < 60 * 60_000;

  if (ajusteReciente) return producto.precioActualKg;

  const { descuentoPct } = tramoDe(horasDesde(producto.publicadoEn, ahora));
  return redondearAPesos(producto.precioInicialKg * (1 - descuentoPct / 100));
}

// ---------------------------------------------------------------- factores

export interface FactorPrecio {
  id: string;
  etiqueta: string;
  /** Puntos porcentuales de reducción que aporta. Negativo = sostiene el precio. */
  puntosPct: number;
  /** Frase concreta y mostrable, con el dato que la sustenta. */
  detalle: string;
  /** Título de la señal, cuando el factor viene de una. */
  senal?: string;
  simulada?: boolean;
}

function vigente(senal: SenalPrecio, ahora: Date): boolean {
  const desde = new Date(senal.vigenteDesde).getTime();
  const hasta = new Date(senal.vigenteHasta).getTime();
  return ahora.getTime() >= desde && ahora.getTime() <= hasta;
}

/** 1 = lunes … 7 = domingo (getDay da 0 para domingo). */
function diaSemanaIso(fecha: Date): number {
  const d = fecha.getDay();
  return d === 0 ? 7 : d;
}

export function senalesAplicables(
  especie: string,
  ahora = new Date(),
): SenalPrecio[] {
  const e = especie.toLowerCase();
  const dia = diaSemanaIso(ahora);

  return SENALES.filter((s) => {
    if (!vigente(s, ahora)) return false;
    if (s.especies && !s.especies.includes(e)) return false;
    if (s.diasSemana && !s.diasSemana.includes(dia)) return false;
    return true;
  });
}

/**
 * Factor de tiempo: curva continua sobre la vida útil de la especie, no
 * escalones. Un congrio de 10 h (48 h de vida útil) no está en la misma
 * situación que una jaiba de 10 h (24 h de vida útil), y la tabla fija los
 * trataba igual.
 */
function factorVidaUtil(especie: string, horasPublicado: number): FactorPrecio {
  const vida = vidaUtilHoras(especie);
  const consumida = Math.min(1, horasPublicado / vida);
  const sobreUmbral = Math.max(0, consumida - FRESCURA_SIN_CASTIGO) / (1 - FRESCURA_SIN_CASTIGO);
  const puntos = Math.round(PESO_VIDA_UTIL_PCT * sobreUmbral);
  const restantes = Math.max(0, vida - horasPublicado);

  return {
    id: "vida_util",
    etiqueta: "Tiempo desde el desembarque",
    puntosPct: puntos,
    detalle:
      consumida >= 1
        ? `Pasaron ${Math.round(horasPublicado)} h y la vida útil del ${especie} es de ${vida} h: hay que colocarlo hoy`
        : `${Math.round(horasPublicado)} h de ${vida} h de vida útil (${Math.round(consumida * 100)}%), quedan ${Math.round(restantes)} h`,
  };
}

function factorDeSenal(senal: SenalPrecio): FactorPrecio {
  return {
    id: senal.id,
    etiqueta:
      senal.tipo === "clima"
        ? "Clima"
        : senal.tipo === "temporada_turistica"
          ? "Turismo y día de la semana"
          : "Oferta regional",
    puntosPct: senal.puntosPct,
    detalle: senal.detalle,
    senal: senal.titulo,
    simulada: senal.simulada,
  };
}

// ---------------------------------------------------------------- sugerencia

export interface SugerenciaPrecio {
  precioBaseKg: number;
  precioActualKg: number;
  /** Lo que el motor sugiere cobrar por kilo. */
  precioSugeridoKg: number;
  /** Reducción sugerida respecto del precio base, en %. */
  reduccionPct: number;
  /** Diferencia contra el precio que tiene hoy publicado. */
  diferenciaKg: number;
  tendencia: Tendencia;
  horasPublicado: number;
  vidaUtilHoras: number;
  riesgoMerma: boolean;
  factores: FactorPrecio[];
  /** Frase lista para pantalla, armada con los factores dominantes. */
  justificacion: string;
  senalesUsadas: string[];
  /** true = el LLM no participó y la explicación es la de plantilla. */
  degradado: boolean;
}

function redactar(
  especie: string,
  factores: FactorPrecio[],
  reduccionPct: number,
): string {
  const dominantes = [...factores]
    .filter((f) => f.puntosPct !== 0)
    .sort((a, b) => Math.abs(b.puntosPct) - Math.abs(a.puntosPct))
    .slice(0, 2);

  if (reduccionPct <= 0) {
    const sostiene = dominantes.find((f) => f.puntosPct < 0);
    return sostiene
      ? `Conviene mantener el precio del ${especie}: ${sostiene.detalle.toLowerCase()}`
      : `El ${especie} está fresco: todavía no hace falta bajar el precio`;
  }

  const razones = dominantes.map((f) => f.detalle.toLowerCase()).join("; y ");
  return `Bajar ${reduccionPct}% el ${especie}: ${razones}`;
}

/**
 * Calcula la sugerencia. Función pura: la hora entra como parámetro para que el
 * resultado sea reproducible y testeable, y para no llamar Date.now() en render.
 */
export function sugerirPrecio(params: {
  especie: Especie | string;
  precioBaseKg: number;
  precioPublicadoKg: number;
  publicadoEn: Date | string;
  ahora?: Date;
}): SugerenciaPrecio {
  const ahora = params.ahora ?? new Date();
  const especie = String(params.especie).toLowerCase();
  const horas = horasDesde(params.publicadoEn, ahora);
  const vida = vidaUtilHoras(especie);

  const factores: FactorPrecio[] = [
    factorVidaUtil(especie, horas),
    ...senalesAplicables(especie, ahora).map(factorDeSenal),
  ];

  const bruto = factores.reduce((total, f) => total + f.puntosPct, 0);
  const riesgoMerma = horas / vida >= UMBRAL_RIESGO;
  const piso = riesgoMerma ? REDUCCION_MINIMA_EN_RIESGO_PCT : 0;
  const reduccionPct = Math.max(
    piso,
    Math.min(REDUCCION_MAX_PCT, Math.round(bruto)),
  );
  const precioSugeridoKg = redondearAPesos(
    params.precioBaseKg * (1 - reduccionPct / 100),
  );

  if (riesgoMerma && Math.round(bruto) < piso) {
    factores.push({
      id: "piso_merma",
      etiqueta: "Riesgo de merma",
      puntosPct: piso - Math.round(bruto),
      detalle: `Queda poco tiempo de venta: se sugiere bajar al menos ${piso}% aunque las señales sostengan el precio`,
    });
  }

  const diferenciaKg = precioSugeridoKg - params.precioPublicadoKg;

  return {
    precioBaseKg: params.precioBaseKg,
    precioActualKg: params.precioPublicadoKg,
    precioSugeridoKg,
    reduccionPct,
    diferenciaKg,
    tendencia: diferenciaKg < 0 ? "bajista" : diferenciaKg > 0 ? "alcista" : "estable",
    horasPublicado: Math.round(horas * 10) / 10,
    vidaUtilHoras: vida,
    riesgoMerma,
    factores,
    justificacion: redactar(especie, factores, reduccionPct),
    senalesUsadas: factores
      .filter((f) => f.senal !== undefined)
      .map((f) => f.senal as string),
    degradado: true,
  };
}

export {
  REDUCCION_MAX_PCT,
  REDUCCION_MINIMA_EN_RIESGO_PCT,
  PESO_VIDA_UTIL_PCT,
  UMBRAL_RIESGO,
};
