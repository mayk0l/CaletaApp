/**
 * Fixtures para desarrollar en paralelo.
 *
 * Rubén construye pantallas contra estos mocks sin esperar los endpoints de Manuel.
 * Cumplen exactamente los tipos de types.ts, así que cambiar mock → API real
 * es cambiar la fuente de datos y nada más.
 *
 * Los precios son referenciales de pesca artesanal en Valparaíso; ajustar en el seed.
 */

import { calcularPrecioBase } from "./pricing";
import type {
  CapturaResponse,
  Especie,
  FormularioResponse,
  MarketplaceResponse,
  PrecioResponse,
  ProductoPublico,
  SenalMercado,
} from "./types";

export const PRECIO_BASE_KG: Record<Exclude<Especie, "desconocida">, number> = {
  congrio: 12000,
  jaiba: 8000,
  jibia: 3500,
};

/** Talla mínima legal de referencia. CONFIRMAR con normativa antes del pitch. */
export const TALLA_MINIMA_CM: Record<Exclude<Especie, "desconocida">, number> = {
  congrio: 60,
  jaiba: 12,
  jibia: 0,
};

export const PESCADOR_DEMO = {
  id: "pes_001",
  nombre: "Luis Ovalle",
  caleta: "Caleta Portales",
  region: "Valparaíso",
  rpaMock: "RPA-05-014782",
  embarcacion: "Doña Rosa · VAL-1187",
};

export const mockCapturaFoto: CapturaResponse = {
  capturaId: "cap_001",
  reconocimiento: {
    especie: "congrio",
    confianza: 0.87,
    pesoKgEstimado: 3.2,
    largoCmEstimado: 74,
    cantidad: 2,
    notas: "Escala estimada usando la caja pesquera del fondo como referencia.",
    fuente: "vision",
  },
};

export const mockCapturaVoz: CapturaResponse = {
  capturaId: "cap_002",
  transcripcion: "traje dos congrios de tres kilos cada uno",
  reconocimiento: {
    especie: "congrio",
    confianza: 0.93,
    pesoKgEstimado: 3,
    cantidad: 2,
    notas: "Peso declarado por unidad.",
    fuente: "voz",
  },
};

/** Caso de baja confianza: la UI debe pedir confirmación manual, no dar el dato por bueno. */
export const mockCapturaDudosa: CapturaResponse = {
  capturaId: "cap_003",
  reconocimiento: {
    especie: "desconocida",
    confianza: 0.31,
    pesoKgEstimado: 0,
    cantidad: 1,
    notas: "Sin objeto de referencia de escala y especie no identificable en la foto.",
    fuente: "vision",
  },
};

export const mockFormulario: FormularioResponse = {
  formularioId: "for_001",
  camposFijos: {
    pescador: PESCADOR_DEMO.nombre,
    rpa: PESCADOR_DEMO.rpaMock,
    caleta: PESCADOR_DEMO.caleta,
    region: PESCADOR_DEMO.region,
    embarcacion: PESCADOR_DEMO.embarcacion,
    fecha: "2026-08-14",
  },
  camposVariables: {
    especie: "Congrio colorado",
    cantidad: 2,
    pesoKg: 6.4,
    largoCm: 74,
    aparejo: "Espinel",
    zonaCaptura: "V Región · frente a Caleta Portales",
    horaDesembarque: "06:40",
  },
  estadoEnvio: "borrador",
  advertencias: [],
};

function horasAtras(horas: number): string {
  return new Date(Date.now() - horas * 3_600_000).toISOString();
}

function producto(
  id: string,
  especie: Exclude<Especie, "desconocida">,
  pesoKg: number,
  horas: number,
  extra: Partial<ProductoPublico> = {},
): ProductoPublico {
  const precioInicialKg = PRECIO_BASE_KG[especie];
  const base = calcularPrecioBase(precioInicialKg, horasAtras(horas));
  return {
    id,
    especie,
    cantidad: 1,
    pesoKg,
    precioInicialKg,
    precioActualKg: base.precioActualKg,
    descuentoPct: base.descuentoPct,
    horasPublicado: base.horasPublicado,
    etiquetaTramo: base.etiquetaTramo,
    horasHastaProximoTramo: base.horasHastaProximoTramo,
    proximoDescuentoPct: base.proximoDescuentoPct,
    estado: base.riesgoMerma ? "merma" : "disponible",
    pescador: { nombre: PESCADOR_DEMO.nombre, caleta: PESCADOR_DEMO.caleta },
    selloCertificado: true,
    ...extra,
  };
}

/** Tres tramos de descuento visibles desde el primer segundo. Ver docs/04-modelo-datos.md */
export const mockMarketplace: MarketplaceResponse = {
  productos: [
    producto("prod_001", "congrio", 6.4, 2, {
      tendencia: "alcista",
      justificacionIa: "Fin de semana con alta ocupación turística en Valparaíso.",
    }),
    producto("prod_002", "jaiba", 12, 8, {
      tendencia: "bajista",
      justificacionIa: "Sobreoferta de jaiba esta semana en caletas cercanas.",
    }),
    producto("prod_003", "jibia", 25, 20, {
      tendencia: "bajista",
      justificacionIa: "20 horas sin venta y marejadas anunciadas para mañana.",
    }),
  ],
};

export const mockPrecio: PrecioResponse = {
  precioAnteriorKg: 8000,
  precioActualKg: 6800,
  descuentoPct: 15,
  tendencia: "bajista",
  justificacion: "Sobreoferta de jaiba esta semana: conviene vender hoy.",
  senalesUsadas: [
    "Oferta regional de jaiba · semana del 11-08-2026",
    "Pronóstico marítimo Valparaíso · 14-08-2026",
  ],
  degradado: false,
};

export const mockSenales: SenalMercado[] = [
  {
    id: "sen_001",
    tipo: "clima",
    titulo: "Pronóstico marítimo Valparaíso · 14-08-2026",
    contenido:
      "Marejadas anunciadas para el fin de semana, con probable suspensión de zarpe. Menor oferta esperada de pesca fresca los días siguientes.",
    fecha: "2026-08-14",
    simulada: true,
  },
  {
    id: "sen_002",
    tipo: "temporada_turistica",
    titulo: "Ocupación hotelera Valparaíso · agosto 2026",
    contenido:
      "Agosto es temporada baja, con repunte los fines de semana largos. Demanda gastronómica concentrada viernes y sábado.",
    fecha: "2026-08-01",
    simulada: true,
  },
  {
    id: "sen_003",
    tipo: "oferta_regional",
    titulo: "Oferta regional de jaiba · semana del 11-08-2026",
    contenido:
      "Varias caletas de la región desembarcaron jaiba por sobre el promedio semanal. Presión a la baja en el precio.",
    fecha: "2026-08-11",
    simulada: true,
  },
];
