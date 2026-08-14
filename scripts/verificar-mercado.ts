/**
 * Verificación del modelo de mercado. Se corre con: npm run verificar:mercado
 *
 * No es un test de humo: comprueba que el estimador sirve, con cuatro criterios
 * que pueden fallar de verdad.
 *
 *  1. Determinismo — misma semilla, misma serie. Si esto falla, la demo no es
 *     reproducible.
 *  2. Recuperación de parámetros — la regresión no conoce los coeficientes con
 *     los que se generó la serie y debería aproximarlos. Es la prueba de que el
 *     modelo estima y no adivina.
 *  3. Poder predictivo fuera de muestra — tiene que ganarle a la predicción
 *     ingenua ("mañana vale lo que vale hoy"). Si no le gana, no aporta nada.
 *  4. Calibración de la banda — la banda del 80% debería cubrir ~80% de los
 *     casos reales, no el 20% ni el 100%.
 */

import { ESPECIES } from "../src/lib/types";
import {
  ajustarModelo,
  analizarMercado,
  backtest,
  calcularAjusteCuantitativo,
  esEspecieReal,
  generarSerie,
  recuperarEvidencia,
} from "../src/lib/market";

let fallos = 0;
const HOY = new Date("2026-08-14T00:00:00Z");

function comprobar(nombre: string, condicion: boolean, detalle: string) {
  const marca = condicion ? "OK  " : "FALLA";
  if (!condicion) fallos++;
  console.log(`  [${marca}] ${nombre} — ${detalle}`);
}

const especies = ESPECIES.filter(esEspecieReal);

// ------------------------------------------------------------------ 1. determinismo
console.log("\n=== 1. Determinismo del simulador ===");
{
  const a = generarSerie("congrio", { dias: 60, hoy: HOY });
  const b = generarSerie("congrio", { dias: 60, hoy: HOY });
  const iguales =
    JSON.stringify(a.observaciones) === JSON.stringify(b.observaciones);
  comprobar("misma semilla produce misma serie", iguales, iguales ? "idénticas" : "DIFIEREN");

  const c = generarSerie("congrio", { dias: 60, hoy: HOY, semilla: 999 });
  const distintas =
    JSON.stringify(a.observaciones) !== JSON.stringify(c.observaciones);
  comprobar("semilla distinta produce serie distinta", distintas, distintas ? "difieren" : "IGUALES");

  const d = generarSerie("jaiba", { dias: 60, hoy: HOY });
  const porEspecie =
    JSON.stringify(a.observaciones) !== JSON.stringify(d.observaciones);
  comprobar("especies distintas, series distintas", porEspecie, porEspecie ? "difieren" : "IGUALES");
}

// ------------------------------------------------------- 2. recuperación de parámetros
console.log("\n=== 2. Recuperación de coeficientes verdaderos (13 especies) ===");
{
  const errores: number[] = [];
  for (const especie of especies) {
    const serie = generarSerie(especie, { dias: 400, hoy: HOY });
    const modelo = ajustarModelo(serie);
    const v = serie.coeficientesVerdaderos;

    const errOferta = Math.abs(modelo.coeficientes.oferta - v.betaOferta);
    const errTurismo = Math.abs(modelo.coeficientes.demanda - v.betaTurismo);
    errores.push(errOferta);

    const ok = errOferta < 0.12 && errTurismo < 0.15;
    if (!ok) fallos++;
    console.log(
      `  [${ok ? "OK  " : "FALLA"}] ${especie.padEnd(9)} ` +
        `oferta real=${v.betaOferta.toFixed(3)} est=${modelo.coeficientes.oferta.toFixed(3)} ` +
        `| turismo real=${v.betaTurismo.toFixed(3)} est=${modelo.coeficientes.demanda.toFixed(3)} ` +
        `| R²=${modelo.r2.toFixed(3)}`,
    );
  }
  const errMedio = errores.reduce((s, v) => s + v, 0) / errores.length;
  comprobar(
    "error medio del coeficiente de oferta",
    errMedio < 0.08,
    `${errMedio.toFixed(4)} (umbral 0.08)`,
  );
}

// -------------------------------------------------------- 3. poder predictivo
console.log("\n=== 3. Backtest fuera de muestra vs predicción ingenua ===");
{
  let ganadas = 0;
  for (const especie of especies) {
    const serie = generarSerie(especie, { dias: 240, hoy: HOY });
    const bt = backtest(serie);
    const gana = bt.mapePct < bt.mapeIngenuoPct;
    if (gana) ganadas++;
    console.log(
      `  [${gana ? "OK  " : "PEOR "}] ${especie.padEnd(9)} ` +
        `MAPE modelo=${bt.mapePct.toFixed(2)}% ingenuo=${bt.mapeIngenuoPct.toFixed(2)}% ` +
        `| cobertura banda 80%=${bt.coberturaBandaPct.toFixed(0)}% (n=${bt.nPrueba})`,
    );
  }
  comprobar(
    "el modelo le gana al ingenuo en la mayoría de especies",
    ganadas >= Math.ceil(especies.length * 0.75),
    `${ganadas}/${especies.length} especies`,
  );
}

// -------------------------------------------------------- 4. calibración de banda
console.log("\n=== 4. Calibración de la banda de confianza ===");
{
  const coberturas = especies.map(
    (e) => backtest(generarSerie(e, { dias: 240, hoy: HOY })).coberturaBandaPct,
  );
  const media = coberturas.reduce((s, v) => s + v, 0) / coberturas.length;
  comprobar(
    "cobertura media de la banda del 80%",
    media >= 65 && media <= 95,
    `${media.toFixed(1)}% (esperado entre 65% y 95%)`,
  );
}

// -------------------------------------------------- 4b. cordura de la predicción
console.log("\n=== 4b. Cordura y explicabilidad de la proyección ===");
{
  // Una versión anterior incluía una tendencia lineal colineal con la
  // estacionalidad anual y proyectaba precios extrapolados sin sentido. La
  // comprobación NO es un tope arbitrario de variación: un alza fuerte es
  // legítima si viene de un factor identificable (una marejada que corta la
  // oferta). Lo que se exige es que el número esté dentro del rango que el
  // histórico respalda y que todo salto grande tenga una causa en los datos.
  let sinExplicar = 0;
  let fueraDeRango = 0;
  let erroresDescomposicion = 0;
  let mayorSalto = 0;
  let detalleSalto = "";

  for (const especie of especies) {
    const a = analizarMercado(especie, { hoy: HOY });
    const precios = a.serie.observaciones.map((o) => o.precioMayoristaKg);
    const min = Math.min(...precios);
    const max = Math.max(...precios);

    for (let i = 0; i < a.prediccion.dias.length; i++) {
      const d = a.prediccion.dias[i];
      const esc = a.escenarios[i];

      if (!Number.isFinite(d.precioEsperadoKg) || d.precioEsperadoKg <= 0) {
        fallos++;
        console.log(`  [FALLA] ${especie} precio no válido: ${d.precioEsperadoKg}`);
      }
      if (d.bandaInferiorKg > d.precioEsperadoKg || d.bandaSuperiorKg < d.precioEsperadoKg) {
        fallos++;
        console.log(`  [FALLA] ${especie} banda incoherente en ${d.fecha}`);
      }
      // El pronóstico no puede irse fuera de lo que el histórico respalda
      if (d.precioEsperadoKg < min * 0.7 || d.precioEsperadoKg > max * 1.3) {
        fueraDeRango++;
        console.log(
          `  [FALLA] ${especie} ${d.fecha}: ${d.precioEsperadoKg} fuera del rango histórico [${min}, ${max}]`,
        );
      }
      if (Math.abs(d.variacionPct) > Math.abs(mayorSalto)) {
        mayorSalto = d.variacionPct;
        detalleSalto = `${especie} ${d.fecha} oleaje=${esc.oleajeM}m desemb=${esc.desembarqueEsperadoKg}kg`;
      }

      // La descomposición tiene que reconstruir la variación total: es exacta en
      // logaritmos, así que el producto de (1+efecto) debe dar (1+variación).
      // Si esto falla, la explicación que ve el usuario no corresponde al número.
      const reconstruido =
        d.contribuciones.reduce((acc, c) => acc * (1 + c.efectoPct / 100), 1) *
          (1 + d.efectoReversionPct / 100) -
        1;
      // se compara contra la variación sin redondear el precio a $10
      const errorReconstruccion = Math.abs(reconstruido * 100 - d.variacionPct);
      if (errorReconstruccion > 0.5) {
        erroresDescomposicion++;
        console.log(
          `  [FALLA] ${especie} ${d.fecha}: descomposición ${(reconstruido * 100).toFixed(2)}% ` +
            `vs variación ${d.variacionPct.toFixed(2)}%`,
        );
      }

      // Todo salto grande tiene que venir de un factor o de la reversión
      if (Math.abs(d.variacionPct) > 25) {
        const candidatos = [
          ...d.contribuciones.map((c) => ({ nombre: c.factor as string, v: c.efectoPct })),
          { nombre: "reversion", v: d.efectoReversionPct },
        ];
        const dominante = candidatos.reduce((a2, b) => (Math.abs(b.v) > Math.abs(a2.v) ? b : a2));
        if (Math.abs(dominante.v) < 10) {
          sinExplicar++;
          console.log(
            `  [FALLA] ${especie} ${d.fecha}: salto ${d.variacionPct.toFixed(1)}% sin factor que lo explique`,
          );
        }
      }
    }
  }

  comprobar("todas las proyecciones dentro del rango histórico", fueraDeRango === 0, `${fueraDeRango} fuera de rango`);
  comprobar(
    "la descomposición reconstruye la variación (exactitud)",
    erroresDescomposicion === 0,
    `${erroresDescomposicion} inconsistencias`,
  );
  comprobar("todo salto >25% tiene una causa identificada", sinExplicar === 0, `${sinExplicar} sin explicar`);
  console.log(`    mayor variación proyectada: ${mayorSalto.toFixed(1)}% — ${detalleSalto}`);
}

// -------------------------------------------------------- 5. RAG y ajuste
console.log("\n=== 5. Corpus, recuperación y ajuste cuantitativo ===");
{
  const analisis = analizarMercado("congrio", { hoy: HOY });
  comprobar(
    "corpus generado con documentos",
    analisis.corpus.length >= 5,
    `${analisis.corpus.length} documentos`,
  );
  comprobar(
    "todo el corpus va marcado como simulado",
    analisis.corpus.every((d) => d.simulada),
    "simulada=true en todos",
  );
  comprobar(
    "cada documento declara su fuente real pendiente",
    analisis.corpus.every((d) => d.fuenteReal.length > 5),
    "fuenteReal presente",
  );
  comprobar(
    "cada documento trae métricas auditables",
    analisis.corpus.every((d) => Object.keys(d.metricas).length > 0),
    "métricas presentes",
  );

  const evidencia = recuperarEvidencia(analisis, { hoy: HOY });
  comprobar("la recuperación devuelve evidencia", evidencia.length > 0, `${evidencia.length} docs`);
  comprobar(
    "los scores vienen ordenados de mayor a menor",
    evidencia.every((e, i) => i === 0 || evidencia[i - 1].score >= e.score),
    evidencia.map((e) => e.score.toFixed(2)).join(" > "),
  );
  console.log("    documentos recuperados para congrio:");
  for (const e of evidencia) {
    console.log(
      `      · ${e.documento.titulo} (bm25=${e.scoreBm25.toFixed(2)} recencia=${e.pesoRecencia.toFixed(2)})`,
    );
  }

  const ajuste = calcularAjusteCuantitativo(analisis);
  comprobar(
    "el ajuste es un número finito",
    Number.isFinite(ajuste.variacionEsperadaPct),
    `variación esperada ${ajuste.variacionEsperadaPct.toFixed(2)}%`,
  );
  comprobar(
    "la confianza queda en [0,1]",
    ajuste.confianza >= 0 && ajuste.confianza <= 1,
    `confianza=${ajuste.confianza.toFixed(3)}`,
  );
  console.log(
    `    predicción congrio: mercado ${ajuste.precioMercadoActualKg} → ` +
      `${ajuste.precioMercadoEsperadoKg} CLP/kg (${ajuste.variacionEsperadaPct >= 0 ? "+" : ""}${ajuste.variacionEsperadaPct.toFixed(1)}%), ` +
      `factor dominante: ${ajuste.factorDominante}`,
  );
  console.log("    descomposición del último día:");
  const ultimo = analisis.prediccion.dias[analisis.prediccion.dias.length - 1];
  for (const c of ultimo.contribuciones) {
    console.log(`      · ${c.factor.padEnd(12)} ${c.efectoPct >= 0 ? "+" : ""}${c.efectoPct.toFixed(2)}%`);
  }
}

console.log(
  `\n${fallos === 0 ? "TODO OK" : `${fallos} COMPROBACIONES FALLARON`}\n`,
);
process.exit(fallos === 0 ? 0 : 1);
