/**
 * CORPUS DEL RAG — documentos derivados de la serie simulada.
 *
 * Antes el corpus eran 8 frases fijas en un JSON: no cambiaban, no tenían números
 * y no se podían citar contra un dato. Acá cada documento se GENERA desde la serie
 * y lleva las métricas que lo respaldan, así que la justificación del precio puede
 * citar una cifra concreta ("desembarque -24% vs promedio de 7 días") en vez de
 * repetir una frase de plantilla.
 *
 * `simulada: true` viaja en cada documento a propósito: la UI muestra el badge de
 * dato simulado y no le vendemos al jurado un dato real que no tenemos.
 * `fuenteReal` deja anotado qué fuente lo reemplaza (docs/13-datos-mercado.md).
 */

import type { EscenarioFuturo, EspecieReal, SerieMercado } from "./simulador";

export type TipoDocumento =
  | "desembarque"
  | "precio_mayorista"
  | "clima"
  | "pronostico_clima"
  | "temporada_turistica"
  | "oferta_regional";

export interface DocumentoMercado {
  id: string;
  tipo: TipoDocumento;
  especie: EspecieReal;
  titulo: string;
  contenido: string;
  /** ISO yyyy-mm-dd */
  fecha: string;
  simulada: boolean;
  /** Qué fuente real reemplazaría este documento. */
  fuenteReal: string;
  /** Números que respaldan el texto, para poder auditar la cita. */
  metricas: Record<string, number>;
}

function pct(a: number, b: number): number {
  if (b === 0) return 0;
  return ((a - b) / b) * 100;
}

function media(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((s, v) => s + v, 0) / xs.length;
}

function fmtPct(v: number): string {
  const signo = v > 0 ? "+" : "";
  return `${signo}${v.toFixed(1)}%`;
}

function fmtClp(v: number): string {
  return `$${Math.round(v).toLocaleString("es-CL")}`;
}

/**
 * Construye el corpus de una especie a partir de su serie y del pronóstico.
 * Son ~6 documentos por especie, cada uno con la métrica que lo sostiene.
 */
export function construirCorpus(
  serie: SerieMercado,
  escenarios: EscenarioFuturo[] = [],
): DocumentoMercado[] {
  const obs = serie.observaciones;
  if (obs.length < 8) return [];

  const especie = serie.especie;
  const hoy = obs[obs.length - 1];
  const ultimos7 = obs.slice(-7);
  const previos7 = obs.slice(-14, -7);
  const docs: DocumentoMercado[] = [];

  // ---- oferta: desembarque reciente vs semana anterior
  const desembarque7 = media(ultimos7.map((o) => o.desembarqueKg));
  const desembarquePrevio = media(previos7.map((o) => o.desembarqueKg));
  const varDesembarque = pct(desembarque7, desembarquePrevio);
  docs.push({
    id: `desembarque_${especie}_${hoy.fecha}`,
    tipo: "desembarque",
    especie,
    titulo: `Desembarque de ${especie} · últimos 7 días`,
    contenido:
      `Promedio de ${Math.round(desembarque7)} kg/día en la caleta, ` +
      `${fmtPct(varDesembarque)} respecto de la semana anterior ` +
      `(${Math.round(desembarquePrevio)} kg/día). ` +
      (varDesembarque < -10
        ? "Menos producto disponible presiona el precio al alza."
        : varDesembarque > 10
          ? "Más producto disponible presiona el precio a la baja."
          : "Oferta estable respecto de la semana anterior."),
    fecha: hoy.fecha,
    simulada: true,
    fuenteReal: "SERNAPESCA — desembarque artesanal por caleta y especie",
    metricas: {
      desembarqueMedio7dKg: Math.round(desembarque7),
      desembarquePrevio7dKg: Math.round(desembarquePrevio),
      variacionPct: Number(varDesembarque.toFixed(1)),
    },
  });

  // ---- precio mayorista observado
  const precio7 = media(ultimos7.map((o) => o.precioMayoristaKg));
  const precioPrevio = media(previos7.map((o) => o.precioMayoristaKg));
  const varPrecio = pct(precio7, precioPrevio);
  docs.push({
    id: `precio_${especie}_${hoy.fecha}`,
    tipo: "precio_mayorista",
    especie,
    titulo: `Precio mayorista de ${especie} · últimos 7 días`,
    contenido:
      `Promedio ${fmtClp(precio7)}/kg, ${fmtPct(varPrecio)} respecto de la semana ` +
      `anterior (${fmtClp(precioPrevio)}/kg). Último dato: ${fmtClp(hoy.precioMayoristaKg)}/kg.`,
    fecha: hoy.fecha,
    simulada: true,
    fuenteReal: "ODEPA / terminal pesquero — precios mayoristas diarios",
    metricas: {
      precioMedio7dKg: Math.round(precio7),
      precioPrevio7dKg: Math.round(precioPrevio),
      variacionPct: Number(varPrecio.toFixed(1)),
      ultimoPrecioKg: hoy.precioMayoristaKg,
    },
  });

  // ---- clima observado
  const oleaje7 = media(ultimos7.map((o) => o.oleajeM));
  const diasMarejada = ultimos7.filter((o) => o.oleajeM >= 3).length;
  docs.push({
    id: `clima_${especie}_${hoy.fecha}`,
    tipo: "clima",
    especie,
    titulo: `Condición de mar · últimos 7 días`,
    contenido:
      `Oleaje promedio ${oleaje7.toFixed(1)} m, con ${diasMarejada} día(s) sobre 3 m. ` +
      (diasMarejada >= 2
        ? "Varias jornadas sin zarpe redujeron la oferta de pesca fresca."
        : "Condiciones mayormente operables para la flota artesanal."),
    fecha: hoy.fecha,
    simulada: true,
    fuenteReal: "Directemar / SHOA — estado de mar y avisos de marejadas",
    metricas: {
      oleajeMedio7dM: Number(oleaje7.toFixed(2)),
      diasSobre3m: diasMarejada,
    },
  });

  // ---- demanda turística
  const turismo7 = media(ultimos7.map((o) => o.indiceTurismo));
  docs.push({
    id: `turismo_${especie}_${hoy.fecha}`,
    tipo: "temporada_turistica",
    especie,
    titulo: `Presión de demanda turística · Valparaíso`,
    contenido:
      `Índice de demanda ${turismo7.toFixed(2)} de 1.00 ` +
      (turismo7 > 0.66
        ? "(temporada alta: restaurantes y ferias con mayor movimiento)."
        : turismo7 < 0.34
          ? "(temporada baja: menor rotación en restaurantes)."
          : "(temporada media)."),
    fecha: hoy.fecha,
    simulada: true,
    fuenteReal: "SERNATUR — pernoctaciones y ocupación hotelera regional",
    metricas: { indiceTurismo7d: Number(turismo7.toFixed(3)) },
  });

  // ---- pronóstico de mar para el horizonte
  if (escenarios.length) {
    const oleajeFut = media(escenarios.map((e) => e.oleajeM));
    const diasMalos = escenarios.filter((e) => e.oleajeM >= 3).length;
    const desembarqueFut = media(escenarios.map((e) => e.desembarqueEsperadoKg));
    docs.push({
      id: `pronostico_${especie}_${escenarios[0].fecha}`,
      tipo: "pronostico_clima",
      especie,
      titulo: `Pronóstico de mar · próximos ${escenarios.length} días`,
      contenido:
        `Oleaje esperado ${oleajeFut.toFixed(1)} m promedio, ${diasMalos} día(s) sobre 3 m. ` +
        `Desembarque esperado ${Math.round(desembarqueFut)} kg/día. ` +
        (diasMalos >= 2
          ? "Se anticipa menor oferta: conviene no liquidar barato en los próximos días."
          : "Sin restricciones mayores de zarpe previstas."),
      fecha: escenarios[0].fecha,
      simulada: true,
      fuenteReal: "Directemar — pronóstico de oleaje a 7 días",
      metricas: {
        oleajeMedioFuturoM: Number(oleajeFut.toFixed(2)),
        diasSobre3m: diasMalos,
        desembarqueEsperadoKg: Math.round(desembarqueFut),
      },
    });
  }

  // ---- oferta regional: comparación contra el propio histórico largo
  const desembarqueHistorico = media(obs.map((o) => o.desembarqueKg));
  const varVsHistorico = pct(desembarque7, desembarqueHistorico);
  docs.push({
    id: `oferta_regional_${especie}_${hoy.fecha}`,
    tipo: "oferta_regional",
    especie,
    titulo: `Oferta regional de ${especie} vs histórico`,
    contenido:
      `La semana viene ${fmtPct(varVsHistorico)} respecto del promedio de los ` +
      `últimos ${obs.length} días (${Math.round(desembarqueHistorico)} kg/día). ` +
      (Math.abs(varVsHistorico) < 8
        ? "Sin anomalía relevante de oferta."
        : varVsHistorico < 0
          ? "Oferta por debajo de lo habitual."
          : "Oferta por sobre lo habitual."),
    fecha: hoy.fecha,
    simulada: true,
    fuenteReal: "SERNAPESCA — series históricas de desembarque regional",
    metricas: {
      variacionVsHistoricoPct: Number(varVsHistorico.toFixed(1)),
      desembarqueHistoricoKg: Math.round(desembarqueHistorico),
    },
  });

  return docs;
}
