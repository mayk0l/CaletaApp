/**
 * CONTRATO COMPARTIDO entre frontend y backend.
 *
 * Este archivo es la versión ejecutable de docs/05-api-contratos.md.
 * Si cambias algo acá: avisa al otro dev y actualiza el doc en el mismo commit.
 */

// ---------------------------------------------------------------- enumeraciones

/** Catálogo cerrado a propósito: un clasificador abierto alucina especies
 *  que no existen en la región. Ver docs/06-ia-y-prompts.md */
export const ESPECIES = [
  "congrio",
  "jaiba",
  "jibia",
  "corvina",
  "reineta",
  "merluza",
  "lenguado",
  "jurel",
  "caballa",
  "loco",
  "erizo",
  "pulpo",
  "albacora",
] as const;
export type Especie = (typeof ESPECIES)[number] | "desconocida";

export type MetodoRegistro = "foto" | "voz" | "manual";
export type EstadoCaptura = "pendiente" | "validada" | "enviada";
export type EstadoProducto = "disponible" | "reservado" | "vendido" | "merma";
export type Tendencia = "alcista" | "bajista" | "estable";
export type EstadoEnvio = "borrador" | "enviado_simulado";
export type EstadoPedido = "cola" | "match" | "resuelto";
export type TipoSenal = "clima" | "temporada_turistica" | "oferta_regional";
export type FuenteReconocimiento = "vision" | "voz" | "manual";

// ---------------------------------------------------------------- envoltura API

export type ApiErrorCode =
  | "VALIDACION"
  | "NO_ENCONTRADO"
  | "IA_TIMEOUT"
  | "IA_SIN_RESULTADO"
  | "INTERNO";

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ApiErrorCode; message: string } };

export function apiOk<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}

export function apiError(
  code: ApiErrorCode,
  message: string,
): ApiResponse<never> {
  return { ok: false, error: { code, message } };
}

// ---------------------------------------------------------------- dominio

export interface Reconocimiento {
  especie: Especie;
  /** 0..1 — si es < UMBRAL_CONFIANZA la UI pide confirmación manual */
  confianza: number;
  pesoKgEstimado: number;
  largoCmEstimado?: number;
  cantidad: number;
  /** Qué referencia de escala usó el modelo, o por qué dudó */
  notas?: string;
  fuente: FuenteReconocimiento;
}

/** Bajo este umbral no damos el dato de la IA por bueno. Ver docs/06-ia-y-prompts.md */
export const UMBRAL_CONFIANZA = 0.6;

export interface Captura {
  id: string;
  pescadorId: string;
  especie: Especie;
  cantidad: number;
  pesoKg: number;
  largoCm?: number;
  metodo: MetodoRegistro;
  confianzaIa?: number;
  transcripcion?: string;
  fotoUrl?: string;
  estado: EstadoCaptura;
  creadaEn: string; // ISO
}

export interface CapturaResponse {
  capturaId: string;
  reconocimiento: Reconocimiento;
  /** Solo en registro por voz */
  transcripcion?: string;
}

// ---------------------------------------------------------------- formulario

/** Type alias (no interface) a propósito: así son indexables y se pueden
 *  recorrer con Object.entries para renderizar el formulario genéricamente. */
export type CamposFijos = {
  pescador: string;
  rpa: string;
  caleta: string;
  region: string;
  embarcacion: string;
  fecha: string;
};

export type CamposVariables = {
  especie: string;
  cantidad: number;
  pesoKg: number;
  largoCm?: number;
  aparejo: string;
  zonaCaptura: string;
  horaDesembarque: string;
};

export interface FormularioResponse {
  formularioId: string;
  camposFijos: CamposFijos;
  camposVariables: CamposVariables;
  estadoEnvio: EstadoEnvio;
  /** ej: "talla estimada bajo el mínimo legal (37 cm)" */
  advertencias: string[];
}

export interface EnvioResponse {
  folioMock: string;
  enviadoEn: string;
  /** Siempre true. La UI DEBE mostrar el badge de simulado. */
  simulado: true;
  productoId: string;
}

// ---------------------------------------------------------------- marketplace

export interface ProductoPublico {
  id: string;
  especie: Especie;
  cantidad: number;
  pesoKg: number;
  precioInicialKg: number;
  precioActualKg: number;
  descuentoPct: number;
  horasPublicado: number;
  estado: EstadoProducto;
  tendencia?: Tendencia;
  justificacionIa?: string;
  /** Etiqueta del tramo actual: "Fresco", "Primer ajuste", ... */
  etiquetaTramo?: string;
  /** Para el contador "baja a −25% en 3 h 40 min". null = ya está en el último tramo.
   *  Lo calcula el backend: el render no puede llamar Date.now() (regla de pureza de React). */
  horasHastaProximoTramo?: number | null;
  proximoDescuentoPct?: number | null;
  pescador: { nombre: string; caleta: string };
  selloCertificado: boolean;
}

export interface MarketplaceResponse {
  productos: ProductoPublico[];
}

export interface PrecioResponse {
  precioAnteriorKg: number;
  precioActualKg: number;
  descuentoPct: number;
  tendencia: Tendencia;
  /** Una frase en español, mostrable tal cual en pantalla */
  justificacion: string;
  /** Títulos de las señales que el RAG recuperó */
  senalesUsadas: string[];
  /** true = la IA falló y se usó solo la regla base. No es un error. */
  degradado: boolean;
}

// ---------------------------------------------------------------- pedidos (P1)

export interface PedidoResponse {
  pedidoId: string;
  estado: EstadoPedido;
}

export interface CandidatoMatch {
  productoId: string;
  especie: Especie;
  pesoKg: number;
  precioActualKg: number;
  horasPublicado: number;
  score: number;
  motivo: string;
}

export interface MatchResponse {
  candidatos: CandidatoMatch[];
}

// ---------------------------------------------------------------- RAG

export interface SenalMercado {
  id: string;
  tipo: TipoSenal;
  titulo: string;
  contenido: string;
  fecha: string;
  /** Se refleja como badge en la UI. Honestidad explícita. */
  simulada: boolean;
  fuente?: string;
}
