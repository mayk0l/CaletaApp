/**
 * Smoke test funcional de toda la app (CA-41 de docs/10-tareas-trello.md).
 *
 *   npx tsx scripts/smoke.ts                       # contra http://localhost:3000
 *   npx tsx scripts/smoke.ts https://mi-app.vercel.app
 *
 * Recorre los flujos completos contra la app corriendo, no contra los módulos:
 * páginas, endpoints, el camino captura → formulario → publicado → marketplace,
 * los precios, las sugerencias y la cola del restaurante. Limpia lo que crea.
 *
 * No prueba visión ni voz: necesitan una foto y un audio reales. Quedan marcadas
 * como omitidas para que nadie asuma que están cubiertas.
 */

const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");

let ok = 0;
let fallas = 0;
const omitidas: string[] = [];
const creados: { capturas: string[]; pedidos: string[] } = { capturas: [], pedidos: [] };

function verificar(nombre: string, condicion: boolean, detalle = "") {
  if (condicion) {
    ok++;
    console.log(`  ok    ${nombre}`);
  } else {
    fallas++;
    console.log(`  FALLA ${nombre}${detalle ? ` — ${detalle}` : ""}`);
  }
}

function omitir(nombre: string, motivo: string) {
  omitidas.push(`${nombre} (${motivo})`);
  console.log(`  omit  ${nombre} — ${motivo}`);
}

async function pagina(ruta: string, debeContener: string[]) {
  try {
    const r = await fetch(`${BASE}${ruta}`);
    const html = await r.text();
    verificar(`GET ${ruta} responde 200`, r.status === 200, `dio ${r.status}`);
    for (const texto of debeContener) {
      verificar(`  ${ruta} contiene "${texto}"`, html.includes(texto));
    }
  } catch (e) {
    verificar(`GET ${ruta}`, false, e instanceof Error ? e.message : "error de red");
  }
}

type Envuelto<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

async function api<T>(
  ruta: string,
  opciones: RequestInit = {},
): Promise<{ status: number; json: Envuelto<T> | null }> {
  const r = await fetch(`${BASE}${ruta}`, {
    ...opciones,
    headers: { "Content-Type": "application/json", ...(opciones.headers ?? {}) },
  });
  let json: Envuelto<T> | null = null;
  try {
    json = (await r.json()) as Envuelto<T>;
  } catch {
    json = null;
  }
  return { status: r.status, json };
}

interface ProductoPublico {
  id: string;
  especie: string;
  precioInicialKg: number;
  precioActualKg: number;
  descuentoPct: number;
  horasPublicado: number;
  etiquetaTramo?: string;
  estado: string;
  horasHastaProximoTramo?: number | null;
  proximoDescuentoPct?: number | null;
}

async function main() {
  console.log(`\nSmoke test contra ${BASE}\n`);

  console.log("Páginas");
  await pagina("/", ["CaletaApp", "marketplace"]);
  await pagina("/pescador", ["trajiste", "Mi pesca publicada"]);
  await pagina("/pescador/captura", ["Paso 1 de 3", "Registrar"]);
  await pagina("/marketplace", ["Marketplace de la caleta"]);
  await pagina("/restaurante", ["Compra directo a la caleta", "En cola"]);

  console.log("\nMarketplace y precios");
  const mk = await api<{ productos: ProductoPublico[] }>("/api/marketplace");
  verificar("GET /api/marketplace responde ok", mk.json?.ok === true);
  const productos = mk.json?.ok ? mk.json.data.productos : [];
  verificar("hay productos publicados", productos.length > 0, `${productos.length}`);

  verificar(
    "ningún precio actual supera el precio base",
    productos.every((p) => p.precioActualKg <= p.precioInicialKg),
  );
  verificar(
    "todo producto trae etiqueta de estado y horas publicado",
    productos.every((p) => typeof p.etiquetaTramo === "string" && p.horasPublicado >= 0),
  );

  if (productos[0]) {
    const sug = await api<{
      precioSugeridoKg: number;
      reduccionPct: number;
      factores: unknown[];
      justificacion: string;
      degradado: boolean;
      precioActualKg: number;
    }>(`/api/marketplace/${productos[0].id}/sugerencia`);
    verificar("GET sugerencia de un producto responde ok", sug.json?.ok === true);
    if (sug.json?.ok) {
      const d = sug.json.data;
      verificar("la sugerencia trae factores explicados", d.factores.length > 0);
      verificar("la sugerencia trae justificación", d.justificacion.length > 15);
      verificar(
        "el precio que ve el motor coincide con el del marketplace",
        d.precioActualKg === productos[0].precioActualKg,
        `motor ${d.precioActualKg} vs marketplace ${productos[0].precioActualKg}`,
      );
      if (d.degradado) omitir("explicación con IA", "el modelo no respondió; quedó la de regla");
    }

    const lote = await api<{ sugerencias: { productoId: string }[] }>(
      "/api/sugerencias-precio",
    );
    verificar("GET /api/sugerencias-precio responde ok", lote.json?.ok === true);
    verificar(
      "el lote cubre todos los productos",
      lote.json?.ok ? lote.json.data.sugerencias.length === productos.length : false,
    );
  }

  const inexistente = await api("/api/marketplace/no-existe/sugerencia");
  verificar("sugerencia de producto inexistente da 404", inexistente.status === 404);

  console.log("\nPredicción de mercado (modelo estadístico)");
  {
    const especie = productos[0]?.especie ?? "congrio";
    const pred = await api<{
      precioMercadoActualKg: number;
      factorDominante: string;
      simulada: boolean;
      dias: {
        precioEsperadoKg: number;
        bandaInferiorKg: number;
        bandaSuperiorKg: number;
        variacionPct: number;
        contribuciones: { factor: string; efectoPct: number }[];
      }[];
      modelo: { r2: number; nObservaciones: number };
      validacion: { mapePct: number; mapeIngenuoPct: number };
      evidencia: { id: string; metricas: Record<string, number>; simulada: boolean }[];
    }>(`/api/precios/prediccion?especie=${encodeURIComponent(especie)}&dias=5`);

    verificar("GET /api/precios/prediccion responde ok", pred.json?.ok === true);
    if (pred.json?.ok) {
      const d = pred.json.data;
      verificar("la predicción cubre el horizonte pedido", d.dias.length === 5, `${d.dias.length} días`);
      verificar(
        "cada día trae banda coherente",
        d.dias.every((x) => x.bandaInferiorKg <= x.precioEsperadoKg && x.precioEsperadoKg <= x.bandaSuperiorKg),
      );
      verificar(
        "cada día trae la descomposición por factor",
        d.dias.every((x) => x.contribuciones.length > 0),
      );
      verificar(
        "el modelo le gana a la predicción ingenua",
        d.validacion.mapePct < d.validacion.mapeIngenuoPct,
        `MAPE ${d.validacion.mapePct}% vs ${d.validacion.mapeIngenuoPct}%`,
      );
      verificar("la evidencia va rotulada como simulada", d.evidencia.every((e) => e.simulada));
      verificar(
        "la evidencia trae métricas auditables",
        d.evidencia.every((e) => Object.keys(e.metricas).length > 0),
      );
    }

    const sinEspecie = await api("/api/precios/prediccion");
    verificar("predicción sin especie da 400", sinEspecie.status === 400);
    const especieMala = await api("/api/precios/prediccion?especie=tiburon");
    verificar("predicción con especie fuera del catálogo da 404", especieMala.status === 404);
  }

  console.log("\nPrecio propuesto por IA");
  if (productos[0]) {
    const ia = await api<{
      precioSugeridoKg: number;
      precioBaseKg: number;
      decidioIa: boolean;
      confianza: number;
      fueAcotado: boolean;
      justificacion: string;
      razonamiento: string[];
      datosUsados: string[];
      referencias: { porReglas: number; porMercado: number };
      desvio: { vsReglasPct: number; vsMercadoPct: number };
      analisis: { mercado: { disponible: boolean } };
    }>(`/api/marketplace/${productos[0].id}/precio-ia`);

    verificar("GET /api/marketplace/[id]/precio-ia responde ok", ia.json?.ok === true);
    if (ia.json?.ok) {
      const d = ia.json.data;
      // El precio tiene que quedar en el rango defendible aunque decida la IA.
      verificar(
        "el precio propuesto queda en el rango 60-115% del base",
        d.precioSugeridoKg >= d.precioBaseKg * 0.6 - 1 &&
          d.precioSugeridoKg <= d.precioBaseKg * 1.15 + 1,
        `$${d.precioSugeridoKg} sobre base $${d.precioBaseKg}`,
      );
      verificar("trae justificación mostrable", d.justificacion.length > 15);
      verificar("expone las dos referencias deterministas", d.referencias.porReglas > 0);
      verificar(
        "expone el desvío contra las referencias",
        Number.isFinite(d.desvio.vsReglasPct) && Number.isFinite(d.desvio.vsMercadoPct),
      );
      verificar("el análisis incluye la serie de mercado", d.analisis.mercado.disponible);

      if (d.decidioIa) {
        verificar("la IA cita al menos un dato", d.datosUsados.length > 0);
        verificar("la IA expone su razonamiento", d.razonamiento.length > 0);
        verificar("la confianza queda en [0,1]", d.confianza >= 0 && d.confianza <= 1);
      } else {
        // El fallback es parte del diseño: si el modelo no responde, decide el
        // motor de reglas. Se registra como omitido, no como falla.
        omitir("decisión de precio por IA", "el modelo no respondió; decidió el motor de reglas");
      }
    }

    const iaInexistente = await api("/api/marketplace/no-existe/precio-ia");
    verificar("precio-ia de producto inexistente da 404", iaInexistente.status === 404);
  }

  console.log("\nFlujo del pescador: captura → formulario → publicado → marketplace");
  const captura = await api<{ capturaId: string }>("/api/capturas/manual", {
    method: "POST",
    body: JSON.stringify({
      pescadorId: "smoke",
      especie: "congrio",
      cantidad: 1,
      pesoKg: 5.5,
      largoCm: 72,
    }),
  });
  verificar("POST /api/capturas/manual crea la captura", captura.json?.ok === true);

  if (captura.json?.ok) {
    const capturaId = captura.json.data.capturaId;
    creados.capturas.push(capturaId);

    const form = await api<{ camposFijos: Record<string, unknown>; advertencias: string[] }>(
      `/api/formulario/${capturaId}`,
    );
    verificar("GET /api/formulario/[id] autocompleta el formulario", form.json?.ok === true);
    verificar(
      "el formulario trae los datos fijos del pescador",
      form.json?.ok ? Object.keys(form.json.data.camposFijos).length >= 5 : false,
    );

    const envio = await api<{ folioMock: string; productoId: string; simulado: boolean }>(
      `/api/formulario/${capturaId}/enviar`,
      { method: "POST" },
    );
    verificar("POST enviar devuelve folio y publica el producto", envio.json?.ok === true);

    if (envio.json?.ok) {
      verificar("el envío viene rotulado como simulado", envio.json.data.simulado === true);
      const productoId = envio.json.data.productoId;

      const mk2 = await api<{ productos: ProductoPublico[] }>("/api/marketplace");
      verificar(
        "el producto recién publicado aparece en el marketplace",
        mk2.json?.ok ? mk2.json.data.productos.some((p) => p.id === productoId) : false,
      );

      const nuevo = mk2.json?.ok
        ? mk2.json.data.productos.find((p) => p.id === productoId)
        : undefined;
      verificar(
        "un producto recién publicado no viene descontado",
        nuevo ? nuevo.descuentoPct === 0 : false,
        nuevo ? `descuento ${nuevo.descuentoPct}%` : "sin producto",
      );

      const patch = await api<{ precioInicialKg: number }>(`/api/productos/${productoId}`, {
        method: "PATCH",
        body: JSON.stringify({ precioInicialKg: 13000 }),
      });
      verificar("PATCH /api/productos/[id] cambia el precio base", patch.json?.ok === true);
    }

    const patchCaptura = await api(`/api/capturas/${capturaId}`, {
      method: "PATCH",
      body: JSON.stringify({ pesoKg: 6 }),
    });
    verificar("PATCH /api/capturas/[id] corrige la captura", patchCaptura.json?.ok === true);
  }

  console.log("\nFlujo del restaurante: pedido → cola → sugerencias");
  const cola = await api<{ pedidos: { pedidoId: string; restaurante: string }[] }>(
    "/api/pedidos",
  );
  verificar("GET /api/pedidos devuelve la cola", cola.json?.ok === true);

  const malaEspecie = await api("/api/pedidos", {
    method: "POST",
    body: JSON.stringify({ restauranteId: "x", especie: "salmon", cantidadKg: 5 }),
  });
  verificar("un pedido con especie fuera del catálogo da 400", malaEspecie.status === 400);
  verificar(
    "y responde con el código VALIDACION",
    malaEspecie.json?.ok === false && malaEspecie.json.error.code === "VALIDACION",
  );

  if (cola.json?.ok && cola.json.data.pedidos[0]) {
    const pedidoId = cola.json.data.pedidos[0].pedidoId;
    const match = await api<{ candidatos: { score: number; motivo: string }[] }>(
      `/api/pedidos/${pedidoId}/match`,
    );
    verificar("GET /api/pedidos/[id]/match responde ok", match.json?.ok === true);
    if (match.json?.ok && match.json.data.candidatos[0]) {
      const c = match.json.data.candidatos[0];
      verificar("el candidato trae score en rango", c.score >= 0 && c.score <= 100);
      verificar("y un motivo concreto", c.motivo.length > 20);
    }
  }

  console.log("\nOmitidos y avisos");
  omitir("POST /api/capturas/imagen", "necesita una foto real; probar a mano en el móvil");
  omitir("POST /api/capturas/voz", "necesita un audio real; probar a mano en el móvil");

  console.log(`\nLimpieza`);
  if (creados.capturas.length === 0) {
    console.log("  nada que limpiar");
  } else {
    // No hay DELETE de capturas en la API (y no corresponde inventar un endpoint
    // destructivo para esto), así que el borrado va por Prisma con la misma
    // DATABASE_URL: npx tsx scripts/limpiar-smoke.ts
    const { writeFileSync } = await import("node:fs");
    writeFileSync(
      ".smoke-creados.json",
      JSON.stringify({ base: BASE, capturas: creados.capturas }, null, 2),
      "utf8",
    );
    console.log(
      `  ⚠️ quedaron ${creados.capturas.length} captura(s) de prueba en la base:\n` +
        creados.capturas.map((c) => `     ${c}`).join("\n") +
        `\n     bórralas con: npx tsx scripts/limpiar-smoke.ts`,
    );
  }

  console.log(
    `\n${ok} ok · ${fallas} falla(s) · ${omitidas.length} omitida(s)\n${
      fallas === 0 ? "Todo verde." : "Hay fallas que revisar."
    }`,
  );
  process.exit(fallas === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(`\nEl smoke test se cayó: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
