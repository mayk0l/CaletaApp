/**
 * SIMULADOR DE MERCADO — genera la serie histórica que alimenta el forecast y el RAG.
 *
 * Por qué existe: antes las señales de mercado eran 8 frases escritas a mano en un
 * JSON con fecha fija. Con eso no se puede predecir nada: no hay serie, no hay
 * variación, y el modelo solo podía opinar sobre un texto estático.
 *
 * Acá los datos son SINTÉTICOS pero no arbitrarios: salen de un modelo generativo
 * con componentes separables (oferta, clima, demanda, tendencia, ruido), que es la
 * misma estructura que tendría el dato real. Eso permite dos cosas que antes no se
 * podían hacer:
 *   1. Predecir, porque hay una serie temporal con estructura.
 *   2. Validar el estimador, porque los coeficientes verdaderos se conocen y se
 *      puede medir si la regresión los recupera (ver scripts/verificar-mercado.ts).
 *
 * Todo es determinista dada una semilla: la misma semilla produce la misma serie,
 * así que la demo es reproducible sin fijar valores a mano.
 *
 * QUÉ HAY QUE REEMPLAZAR CON DATO REAL: ver docs/13-datos-mercado.md
 */

import { PRECIO_BASE_KG } from "@/lib/mocks";
import type { Especie } from "@/lib/types";

export type EspecieReal = Exclude<Especie, "desconocida">;

/** PRNG determinista (mulberry32). Se usa uno propio para no depender de
 *  Math.random(), que no acepta semilla y rompería la reproducibilidad. */
export function prng(semilla: number): () => number {
  let a = semilla >>> 0;
  return function siguiente() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Normal estándar por Box-Muller, sobre el PRNG sembrado. */
function normal(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Parámetros de comportamiento de mercado por especie.
 *
 * Estos SÍ son supuestos nuestros, y es correcto que lo sean: son los parámetros
 * del modelo, no los datos. Cada uno es una hipótesis falsable que se calibra
 * contra desembarques y precios reales (docs/13-datos-mercado.md). Se agrupan por
 * comportamiento de mercado, no por taxonomía:
 *
 *  - elasticidadOferta: cuánto cae el precio si el desembarque sube. Negativo.
 *    Más negativo en especies que se venden frescas y no se pueden guardar.
 *  - sensibilidadOleaje: cuánto sube el precio por metro de oleaje, vía caída de
 *    oferta. Mayor en especies de bote chico, que no salen con marejada.
 *  - sensibilidadTurismo: cuánto sube con demanda turística. Mayor en las especies
 *    que pide el restaurante (congrio, corvina, reineta) que en las de volumen.
 *  - volatilidad: desvío del shock diario en escala log.
 */
export interface PerfilMercado {
  elasticidadOferta: number;
  sensibilidadOleaje: number;
  sensibilidadTurismo: number;
  volatilidad: number;
  /** Desembarque diario típico en kg para la caleta simulada. */
  desembarqueMedioKg: number;
}

const PERFIL_ALTO_VALOR: PerfilMercado = {
  elasticidadOferta: -0.35,
  sensibilidadOleaje: 0.06,
  sensibilidadTurismo: 0.18,
  volatilidad: 0.05,
  desembarqueMedioKg: 420,
};

const PERFIL_VOLUMEN: PerfilMercado = {
  elasticidadOferta: -0.55,
  sensibilidadOleaje: 0.03,
  sensibilidadTurismo: 0.06,
  volatilidad: 0.07,
  desembarqueMedioKg: 3200,
};

const PERFIL_MARISCO: PerfilMercado = {
  elasticidadOferta: -0.25,
  sensibilidadOleaje: 0.09,
  sensibilidadTurismo: 0.22,
  volatilidad: 0.06,
  desembarqueMedioKg: 260,
};

export const PERFILES: Record<EspecieReal, PerfilMercado> = {
  congrio: PERFIL_ALTO_VALOR,
  corvina: PERFIL_ALTO_VALOR,
  reineta: PERFIL_ALTO_VALOR,
  lenguado: PERFIL_ALTO_VALOR,
  albacora: PERFIL_ALTO_VALOR,
  merluza: PERFIL_VOLUMEN,
  jurel: PERFIL_VOLUMEN,
  caballa: PERFIL_VOLUMEN,
  jibia: PERFIL_VOLUMEN,
  jaiba: PERFIL_MARISCO,
  loco: PERFIL_MARISCO,
  erizo: PERFIL_MARISCO,
  pulpo: PERFIL_MARISCO,
};

export interface ObservacionMercado {
  /** ISO yyyy-mm-dd, en UTC para que la serie no se mueva con la zona horaria. */
  fecha: string;
  /** 0 = domingo */
  diaSemana: number;
  esFinDeSemana: boolean;
  /** Altura significativa de ola en metros. Proxy de si se puede salir a pescar. */
  oleajeM: number;
  /** 0..1 — presión de demanda turística en la bahía. */
  indiceTurismo: number;
  /** Kg desembarcados en la caleta ese día. */
  desembarqueKg: number;
  /** Precio mayorista observado, CLP/kg. Es la variable a predecir. */
  precioMayoristaKg: number;
}

export interface SerieMercado {
  especie: EspecieReal;
  perfil: PerfilMercado;
  observaciones: ObservacionMercado[];
  /** Coeficientes verdaderos con los que se generó. Sirven para validar el
   *  estimador: la regresión no los conoce y debería aproximarlos. */
  coeficientesVerdaderos: {
    interceptoLog: number;
    betaOferta: number;
    betaOleaje: number;
    betaTurismo: number;
    betaFinDeSemana: number;
    tendenciaDiaria: number;
  };
}

const OLEAJE_MEDIO_M = 1.9;
const BETA_FIN_DE_SEMANA = 0.05;
/** Deriva anual leve (~4% al año) para que la serie tenga tendencia real. */
const TENDENCIA_DIARIA = 0.04 / 365;

function fechaUtc(diasAtras: number, hoy: Date): Date {
  const d = new Date(
    Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()),
  );
  d.setUTCDate(d.getUTCDate() - diasAtras);
  return d;
}

/** Verano austral = temporada alta en la costa de Valparaíso. Pico en enero. */
function estacionalidadTuristica(fecha: Date): number {
  const dia = Math.floor(
    (fecha.getTime() - Date.UTC(fecha.getUTCFullYear(), 0, 1)) / 86_400_000,
  );
  // coseno con máximo el 15 de enero (día ~15) y mínimo a mitad de año
  return 0.5 + 0.5 * Math.cos((2 * Math.PI * (dia - 15)) / 365);
}

/**
 * Genera la serie diaria de una especie.
 *
 * El precio NO se sortea: se construye desde los regresores, así que la relación
 * oferta/clima/demanda → precio existe de verdad en el dato y el estimador tiene
 * algo real que encontrar. El ruido es AR(1) para que se parezca a una serie
 * económica (los shocks persisten unos días) y no a ruido blanco.
 */
export function generarSerie(
  especie: EspecieReal,
  opciones: { dias?: number; semilla?: number; hoy?: Date } = {},
): SerieMercado {
  const dias = opciones.dias ?? 120;
  const hoy = opciones.hoy ?? new Date();
  // La semilla depende de la especie para que dos especies no tengan la misma
  // serie, pero sigue siendo determinista.
  const semillaBase = opciones.semilla ?? 20260814;
  const rand = prng(semillaBase + hashTexto(especie));

  const perfil = PERFILES[especie];
  const nivelBase = PRECIO_BASE_KG[especie];
  const interceptoLog = Math.log(nivelBase);

  const observaciones: ObservacionMercado[] = [];
  let shock = 0;
  // Estado de marejada: persiste varios días, como un sistema frontal real.
  let marejadaRestante = 0;

  for (let i = dias - 1; i >= 0; i--) {
    const fecha = fechaUtc(i, hoy);
    const diaSemana = fecha.getUTCDay();
    const esFinDeSemana = diaSemana === 0 || diaSemana === 6;
    const t = dias - 1 - i;

    // --- clima: marejadas por episodios, no día a día independiente
    if (marejadaRestante > 0) {
      marejadaRestante--;
    } else if (rand() < 0.08) {
      marejadaRestante = 1 + Math.floor(rand() * 3);
    }
    const oleajeM = Math.max(
      0.4,
      OLEAJE_MEDIO_M + (marejadaRestante > 0 ? 1.6 : 0) + 0.35 * normal(rand),
    );

    // --- demanda
    const indiceTurismo = Math.min(
      1,
      Math.max(0, estacionalidadTuristica(fecha) + 0.05 * normal(rand)),
    );

    // --- oferta: el oleaje impide zarpar, así que baja el desembarque
    const factorClima = Math.exp(-0.45 * Math.max(0, oleajeM - OLEAJE_MEDIO_M));
    const factorFinde = esFinDeSemana ? 0.85 : 1; // menos botes el domingo
    const desembarqueKg = Math.max(
      20,
      perfil.desembarqueMedioKg * factorClima * factorFinde * Math.exp(0.12 * normal(rand)),
    );

    // --- precio: log-lineal en los regresores + shock AR(1)
    shock = 0.6 * shock + perfil.volatilidad * normal(rand);
    const logPrecio =
      interceptoLog +
      perfil.elasticidadOferta * Math.log(desembarqueKg / perfil.desembarqueMedioKg) +
      perfil.sensibilidadOleaje * (oleajeM - OLEAJE_MEDIO_M) +
      perfil.sensibilidadTurismo * indiceTurismo +
      BETA_FIN_DE_SEMANA * (esFinDeSemana ? 1 : 0) +
      TENDENCIA_DIARIA * t +
      shock;

    observaciones.push({
      fecha: fecha.toISOString().slice(0, 10),
      diaSemana,
      esFinDeSemana,
      oleajeM: redondear(oleajeM, 2),
      indiceTurismo: redondear(indiceTurismo, 3),
      desembarqueKg: Math.round(desembarqueKg),
      precioMayoristaKg: Math.round(Math.exp(logPrecio) / 10) * 10,
    });
  }

  return {
    especie,
    perfil,
    observaciones,
    coeficientesVerdaderos: {
      interceptoLog,
      betaOferta: perfil.elasticidadOferta,
      betaOleaje: perfil.sensibilidadOleaje,
      betaTurismo: perfil.sensibilidadTurismo,
      betaFinDeSemana: BETA_FIN_DE_SEMANA,
      tendenciaDiaria: TENDENCIA_DIARIA,
    },
  };
}

/**
 * Pronóstico de los REGRESORES para los próximos días (no del precio).
 *
 * Es lo mismo que pasa en la realidad: para proyectar precio hace falta un
 * pronóstico de oleaje y una expectativa de demanda. Acá se simula con la misma
 * semilla, extendiendo la serie. Cuando haya dato real, esto lo reemplaza el
 * pronóstico de Directemar/SHOA y el calendario turístico.
 */
export interface EscenarioFuturo {
  fecha: string;
  diaSemana: number;
  esFinDeSemana: boolean;
  oleajeM: number;
  indiceTurismo: number;
  desembarqueEsperadoKg: number;
}

export function proyectarEscenarios(
  serie: SerieMercado,
  horizonteDias = 7,
  opciones: { semilla?: number; hoy?: Date } = {},
): EscenarioFuturo[] {
  const hoy = opciones.hoy ?? new Date();
  const rand = prng((opciones.semilla ?? 77003) + hashTexto(serie.especie));
  const perfil = serie.perfil;
  const escenarios: EscenarioFuturo[] = [];

  let marejadaRestante = 0;
  for (let h = 1; h <= horizonteDias; h++) {
    const fecha = fechaUtc(-h, hoy);
    const diaSemana = fecha.getUTCDay();
    const esFinDeSemana = diaSemana === 0 || diaSemana === 6;

    if (marejadaRestante > 0) marejadaRestante--;
    else if (rand() < 0.1) marejadaRestante = 1 + Math.floor(rand() * 3);

    const oleajeM = Math.max(
      0.4,
      OLEAJE_MEDIO_M + (marejadaRestante > 0 ? 1.6 : 0) + 0.3 * normal(rand),
    );
    const indiceTurismo = Math.min(
      1,
      Math.max(0, estacionalidadTuristica(fecha) + 0.04 * normal(rand)),
    );
    const factorClima = Math.exp(-0.45 * Math.max(0, oleajeM - OLEAJE_MEDIO_M));
    const factorFinde = esFinDeSemana ? 0.85 : 1;

    escenarios.push({
      fecha: fecha.toISOString().slice(0, 10),
      diaSemana,
      esFinDeSemana,
      oleajeM: redondear(oleajeM, 2),
      indiceTurismo: redondear(indiceTurismo, 3),
      desembarqueEsperadoKg: Math.round(
        perfil.desembarqueMedioKg * factorClima * factorFinde,
      ),
    });
  }

  return escenarios;
}

/** Hash estable de string a entero, para sembrar por especie sin tabla fija. */
export function hashTexto(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function redondear(valor: number, decimales: number): number {
  const f = 10 ** decimales;
  return Math.round(valor * f) / f;
}
