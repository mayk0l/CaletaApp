/**
 * MODELO DE PREDICCIÓN DE PRECIO — regresión log-lineal explicable.
 *
 * No es el LLM opinando ni una regla fija: es una regresión por mínimos cuadrados
 * sobre la serie de mercado, que estima cuánto pesa cada factor y proyecta el
 * precio a N días usando el pronóstico de esos factores.
 *
 *   log(precio) = b0
 *               + b1 · log(desembarque / desembarqueMedio)   ← oferta
 *               + b2 · (oleaje - oleajeMedio)                ← clima
 *               + b3 · indiceTurismo                         ← demanda
 *               + b4 · esFinDeSemana                         ← estacionalidad semanal
 *
 * Por qué log: el precio no puede ser negativo y los efectos son multiplicativos
 * (un 20% más de oferta baja el precio un %, no un monto fijo). En log el modelo
 * es lineal y los coeficientes se leen como elasticidades.
 *
 * POR QUÉ NO HAY TENDENCIA LINEAL: se probó y hubo que sacarla. El índice de
 * demanda turística es estacional anual, así que en una ventana de ~120 días se
 * mueve de forma casi monótona y queda colineal con un término lineal en t. OLS
 * repartía el efecto de forma arbitraria entre los dos: estimaba una tendencia
 * fuertemente negativa compensada con un intercepto inflado, y al extrapolar a 7
 * días eso daba +32% de variación —un precio inventado—. Sin el término lineal la
 * predicción queda estable y la deriva real (~4% anual, 0.08% en una semana) es
 * despreciable en el horizonte que nos importa. Queda como residuo, no como
 * extrapolación peligrosa.
 *
 * Por qué es "fundamentado" y no un número inventado:
 *  - Los coeficientes se estiman del dato, no se fijan a mano.
 *  - Cada predicción viene con la contribución de cada factor, así que se puede
 *    decir POR QUÉ sube o baja, con números.
 *  - Se valida fuera de muestra (backtest) y contra los coeficientes verdaderos
 *    del simulador, que el estimador no conoce. Ver scripts/verificar-mercado.ts
 */

import type { EscenarioFuturo, ObservacionMercado, SerieMercado } from "./simulador";

const OLEAJE_MEDIO_M = 1.9;

export const FACTORES = [
  "intercepto",
  "oferta",
  "clima",
  "demanda",
  "finDeSemana",
] as const;

export type Factor = (typeof FACTORES)[number];

export interface ModeloPrecio {
  especie: string;
  coeficientes: Record<Factor, number>;
  /** Bondad de ajuste dentro de muestra. */
  r2: number;
  /** Desvío de los residuos en escala log: define la banda de confianza. */
  sigmaLog: number;
  nObservaciones: number;
  desembarqueMedioKg: number;
  /**
   * Persistencia AR(1) del residuo. Los shocks de precio no duran un día: una
   * marejada o un comprador grande mueven el precio y el efecto se arrastra.
   * Sin esto la predicción a 1 día revertía a la media histórica y se comparaba
   * contra la última observación, lo que producía saltos falsos de +38%.
   */
  phiResidual: number;
  /** Residuo del último día observado: el estado actual del que parte el pronóstico. */
  ultimoResidual: number;
}

/** Fila de diseño: el orden debe coincidir con FACTORES. */
function fila(obs: ObservacionMercado, desembarqueMedioKg: number): number[] {
  return [
    1,
    Math.log(obs.desembarqueKg / desembarqueMedioKg),
    obs.oleajeM - OLEAJE_MEDIO_M,
    obs.indiceTurismo,
    obs.esFinDeSemana ? 1 : 0,
  ];
}

function filaEscenario(esc: EscenarioFuturo, desembarqueMedioKg: number): number[] {
  return [
    1,
    Math.log(esc.desembarqueEsperadoKg / desembarqueMedioKg),
    esc.oleajeM - OLEAJE_MEDIO_M,
    esc.indiceTurismo,
    esc.esFinDeSemana ? 1 : 0,
  ];
}

/**
 * Ajusta el modelo por mínimos cuadrados (ecuaciones normales + eliminación
 * gaussiana con pivoteo parcial). Con 6 regresores y ~120 observaciones esto es
 * exacto y toma microsegundos: no hace falta una librería de álgebra.
 */
export function ajustarModelo(serie: SerieMercado): ModeloPrecio {
  const desembarqueMedioKg = serie.perfil.desembarqueMedioKg;
  const X = serie.observaciones.map((o) => fila(o, desembarqueMedioKg));
  const y = serie.observaciones.map((o) => Math.log(o.precioMayoristaKg));

  const beta = resolverOls(X, y);

  // Bondad de ajuste
  const yMedio = y.reduce((s, v) => s + v, 0) / y.length;
  let sse = 0;
  let sst = 0;
  const residuos: number[] = [];
  for (let i = 0; i < y.length; i++) {
    const pred = producto(X[i], beta);
    const residuo = y[i] - pred;
    residuos.push(residuo);
    sse += residuo ** 2;
    sst += (y[i] - yMedio) ** 2;
  }
  const gl = Math.max(1, y.length - beta.length);

  const coeficientes = {} as Record<Factor, number>;
  FACTORES.forEach((f, i) => {
    coeficientes[f] = beta[i];
  });

  return {
    especie: serie.especie,
    coeficientes,
    r2: sst === 0 ? 0 : 1 - sse / sst,
    sigmaLog: Math.sqrt(sse / gl),
    nObservaciones: y.length,
    desembarqueMedioKg,
    phiResidual: estimarPhi(residuos),
    ultimoResidual: residuos[residuos.length - 1] ?? 0,
  };
}

/**
 * Estima la persistencia AR(1) del residuo por autocorrelación de rezago 1.
 * Se acota a [0, 0.95]: negativa no tiene sentido económico acá, y por encima de
 * 0.95 el pronóstico dejaría de revertir nunca.
 */
function estimarPhi(residuos: number[]): number {
  if (residuos.length < 3) return 0;
  let num = 0;
  let den = 0;
  for (let i = 1; i < residuos.length; i++) {
    num += residuos[i] * residuos[i - 1];
    den += residuos[i - 1] ** 2;
  }
  if (den === 0) return 0;
  return Math.max(0, Math.min(0.95, num / den));
}

export interface ContribucionFactor {
  factor: Factor;
  /**
   * Efecto en % sobre el precio de HOY, no sobre el nivel base del modelo.
   * Se calcula como exp(coef · (valorFuturo - valorHoy)) - 1, o sea cuánto mueve
   * el precio el hecho de que ese factor CAMBIE respecto de hoy. Es la respuesta
   * a "por qué va a cambiar el precio", que es la pregunta del pescador.
   */
  efectoPct: number;
  valorFuturo: number;
  valorHoy: number;
}

export interface PrediccionDia {
  fecha: string;
  precioEsperadoKg: number;
  /** Banda de ~80% (1.28 sigma) en escala de precio. */
  bandaInferiorKg: number;
  bandaSuperiorKg: number;
  /** Variación respecto al último precio observado. */
  variacionPct: number;
  contribuciones: ContribucionFactor[];
  /**
   * Parte de la variación que NO viene de los factores: el precio de hoy está
   * por encima o por debajo de lo que explican sus fundamentos, y ese desvío se
   * apaga con el tiempo. Sin separarlo, una reversión a la media se leía como si
   * fuera efecto de la oferta.
   */
  efectoReversionPct: number;
}

export interface Prediccion {
  especie: string;
  precioActualKg: number;
  dias: PrediccionDia[];
  modelo: ModeloPrecio;
  /** Factor que más explica el movimiento del horizonte completo.
   *  "reversion" = el precio de hoy está desalineado de sus fundamentos. */
  factorDominante: Factor | "reversion";
  variacionHorizontePct: number;
}

const Z_80 = 1.2816;

/**
 * Proyecta el precio para cada escenario futuro y descompone el porqué.
 *
 * La descomposición es EXACTA en logaritmos y por eso se puede auditar:
 *
 *   log(p_futuro) = X_f·β + φ^h·r_t
 *   log(p_hoy)    = X_t·β + r_t          (r_t es el residuo de hoy, por definición)
 *   ⇒ Δlog        = (X_f - X_t)·β + (φ^h - 1)·r_t
 *
 * El intercepto se cancela, así que cada término es atribuible a un factor que
 * cambia o a la reversión del desvío actual. `verificar-mercado.ts` comprueba que
 * los términos reconstruyen la variación total.
 */
export function predecir(
  serie: SerieMercado,
  escenarios: EscenarioFuturo[],
  modelo = ajustarModelo(serie),
): Prediccion {
  const n = serie.observaciones.length;
  const ultimo = serie.observaciones[n - 1];
  const precioActualKg = ultimo.precioMayoristaKg;
  const beta = FACTORES.map((f) => modelo.coeficientes[f]);
  const xHoy = fila(ultimo, modelo.desembarqueMedioKg);
  // Residuo de hoy: exacto, no el guardado en el modelo (que puede venir de otro
  // ajuste si el caller pasó un modelo entrenado con menos datos).
  const residuoHoy = Math.log(precioActualKg) - producto(xHoy, beta);

  const dias: PrediccionDia[] = escenarios.map((esc, i) => {
    const h = i + 1; // pasos hacia adelante
    const x = filaEscenario(esc, modelo.desembarqueMedioKg);
    // El shock actual se arrastra y se apaga: phi^h. A 1 día el pronóstico parte
    // del estado real del mercado, no de la media histórica.
    const arrastre = modelo.phiResidual ** h * residuoHoy;
    const logPrecio = producto(x, beta) + arrastre;
    const precio = Math.exp(logPrecio);

    // Error de pronóstico a h pasos de un AR(1): sigma·sqrt(1 - phi^(2h)).
    // Angosta a 1 día (sabemos dónde estamos) y se ensancha hacia sigma total.
    const sigmaH =
      modelo.sigmaLog *
      Math.sqrt(Math.max(0.05, 1 - modelo.phiResidual ** (2 * h)));

    const contribuciones: ContribucionFactor[] = FACTORES.map((f, k) => ({
      factor: f,
      efectoPct: f === "intercepto" ? 0 : (Math.exp(beta[k] * (x[k] - xHoy[k])) - 1) * 100,
      valorFuturo: x[k],
      valorHoy: xHoy[k],
    })).filter((c) => c.factor !== "intercepto");

    const efectoReversionPct =
      (Math.exp((modelo.phiResidual ** h - 1) * residuoHoy) - 1) * 100;

    return {
      fecha: esc.fecha,
      precioEsperadoKg: redondearA10(precio),
      bandaInferiorKg: redondearA10(Math.exp(logPrecio - Z_80 * sigmaH)),
      bandaSuperiorKg: redondearA10(Math.exp(logPrecio + Z_80 * sigmaH)),
      variacionPct: ((precio - precioActualKg) / precioActualKg) * 100,
      contribuciones,
      efectoReversionPct,
    };
  });

  // El factor dominante se decide por la contribución media absoluta, no por el
  // último día: interesa qué mueve el horizonte, no un pico aislado. La reversión
  // compite como una causa más: si lo que domina es que hoy el precio está
  // desalineado, hay que decir eso y no inventar una causa de mercado.
  const acumulado = new Map<Factor | "reversion", number>();
  for (const d of dias) {
    for (const c of d.contribuciones) {
      acumulado.set(c.factor, (acumulado.get(c.factor) ?? 0) + Math.abs(c.efectoPct));
    }
    acumulado.set(
      "reversion",
      (acumulado.get("reversion") ?? 0) + Math.abs(d.efectoReversionPct),
    );
  }
  let factorDominante: Factor | "reversion" = "oferta";
  let mejor = -1;
  for (const [f, v] of acumulado) {
    if (v > mejor) {
      mejor = v;
      factorDominante = f;
    }
  }

  const ultimoDia = dias[dias.length - 1];

  return {
    especie: serie.especie,
    precioActualKg,
    dias,
    modelo,
    factorDominante,
    variacionHorizontePct: ultimoDia ? ultimoDia.variacionPct : 0,
  };
}

export interface Backtest {
  nEntrenamiento: number;
  nPrueba: number;
  /** Error porcentual absoluto medio fuera de muestra. */
  mapePct: number;
  /** MAPE de la predicción ingenua (precio de ayer) para comparar. */
  mapeIngenuoPct: number;
  /** Cuántas observaciones de prueba cayeron dentro de la banda del 80%. */
  coberturaBandaPct: number;
}

/**
 * Backtest honesto: entrena con el primer tramo y mide en el último, que el
 * modelo no vio. Es un pronóstico a 1 día: en cada paso se conoce el precio de
 * ayer, así que se usa su residuo para arrastrar el shock, igual que hace
 * `predecir`. Se compara contra la predicción ingenua ("mañana vale lo que vale
 * hoy"), que en series de precios es un rival difícil: si el modelo no le gana,
 * no aporta nada.
 */
export function backtest(serie: SerieMercado, fraccionEntrenamiento = 0.8): Backtest {
  const obs = serie.observaciones;
  const corte = Math.floor(obs.length * fraccionEntrenamiento);
  const entrenamiento: SerieMercado = { ...serie, observaciones: obs.slice(0, corte) };
  const modelo = ajustarModelo(entrenamiento);
  const beta = FACTORES.map((f) => modelo.coeficientes[f]);
  const phi = modelo.phiResidual;
  const sigma1 = modelo.sigmaLog * Math.sqrt(Math.max(0.05, 1 - phi ** 2));

  let sumaError = 0;
  let sumaErrorIngenuo = 0;
  let dentroBanda = 0;
  const prueba = obs.slice(corte);

  for (let i = 0; i < prueba.length; i++) {
    const o = prueba[i];
    const previa = obs[corte + i - 1];

    // residuo de ayer: lo que el modelo no explicó del precio ya conocido
    const residuoPrevio =
      Math.log(previa.precioMayoristaKg) -
      producto(fila(previa, modelo.desembarqueMedioKg), beta);

    const logPred =
      producto(fila(o, modelo.desembarqueMedioKg), beta) + phi * residuoPrevio;
    const pred = Math.exp(logPred);

    sumaError += Math.abs((pred - o.precioMayoristaKg) / o.precioMayoristaKg);
    sumaErrorIngenuo += Math.abs(
      (previa.precioMayoristaKg - o.precioMayoristaKg) / o.precioMayoristaKg,
    );

    const inf = Math.exp(logPred - Z_80 * sigma1);
    const sup = Math.exp(logPred + Z_80 * sigma1);
    if (o.precioMayoristaKg >= inf && o.precioMayoristaKg <= sup) dentroBanda++;
  }

  const n = Math.max(1, prueba.length);
  return {
    nEntrenamiento: corte,
    nPrueba: prueba.length,
    mapePct: (sumaError / n) * 100,
    mapeIngenuoPct: (sumaErrorIngenuo / n) * 100,
    coberturaBandaPct: (dentroBanda / n) * 100,
  };
}

// ---------------------------------------------------------------- álgebra

function producto(x: number[], beta: number[]): number {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * beta[i];
  return s;
}

/** Resuelve (X'X)β = X'y por eliminación gaussiana con pivoteo parcial. */
function resolverOls(X: number[][], y: number[]): number[] {
  const p = X[0].length;
  const xtx: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  const xty: number[] = new Array(p).fill(0);

  for (let i = 0; i < X.length; i++) {
    for (let j = 0; j < p; j++) {
      xty[j] += X[i][j] * y[i];
      for (let k = j; k < p; k++) xtx[j][k] += X[i][j] * X[i][k];
    }
  }
  // X'X es simétrica: se completa el triángulo inferior
  for (let j = 0; j < p; j++) for (let k = 0; k < j; k++) xtx[j][k] = xtx[k][j];

  // matriz aumentada
  const m = xtx.map((filaJ, j) => [...filaJ, xty[j]]);

  for (let col = 0; col < p; col++) {
    let pivote = col;
    for (let r = col + 1; r < p; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivote][col])) pivote = r;
    }
    if (Math.abs(m[pivote][col]) < 1e-12) continue; // columna degenerada
    [m[col], m[pivote]] = [m[pivote], m[col]];

    for (let r = 0; r < p; r++) {
      if (r === col) continue;
      const factor = m[r][col] / m[col][col];
      if (factor === 0) continue;
      for (let c = col; c <= p; c++) m[r][c] -= factor * m[col][c];
    }
  }

  return m.map((filaR, i) => (Math.abs(filaR[i]) < 1e-12 ? 0 : filaR[p] / filaR[i]));
}

function redondearA10(valor: number): number {
  return Math.round(valor / 10) * 10;
}
