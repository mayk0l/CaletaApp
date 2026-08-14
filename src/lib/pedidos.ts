/**
 * Capa de datos de pedidos y sugerencias. Server-side only.
 *
 * La usan tanto los endpoints de src/app/api/pedidos/** como las server actions de
 * src/app/restaurante/actions.ts, para que la API y la pantalla nunca se contradigan.
 * La lógica de ranking vive aparte y es pura: src/lib/matching.ts
 *
 * Dueño: Rubén (matching, P1).
 */

import { prisma } from "./db";
import { calcularPrecioBase } from "./pricing";
import {
  MAX_SUGERENCIAS,
  puntuar,
  resolverCola,
  sugerirParaPedido,
  type ColaResuelta,
  type EspecieConcreta,
  type PedidoParaMatch,
  type SugerenciaMatch,
} from "./matching";
import {
  ESPECIES,
  apiError,
  apiOk,
  type ApiResponse,
  type CandidatoMatch,
  type MatchResponse,
  type PedidoResponse,
  type ProductoPublico,
} from "./types";

/** Tope defensivo: un pedido de 10.000 kg es un error de tipeo, no una compra. */
const MAX_CANTIDAD_KG = 500;

/** Comuna de referencia cuando el restaurante no está en la BD (no debería pasar). */
const COMUNA_POR_DEFECTO = "Valparaíso";

// ---------------------------------------------------------------- productos

/**
 * Misma derivación de precio que GET /api/marketplace: se calcula desde
 * publicadoEn con calcularPrecioBase() y el ajuste del RAG solo prima si tiene
 * menos de 1 h. Está duplicado a propósito en vez de importar del route handler:
 * el matching no debe depender de la ruta de Manuel. Si cambia el criterio allá,
 * hay que cambiarlo acá — está anotado en docs/05-api-contratos.md.
 */
export async function productosPublicos(): Promise<ProductoPublico[]> {
  const productos = await prisma.producto.findMany({
    where: { estado: { not: "vendido" } },
    include: { captura: { include: { pescador: true } } },
    orderBy: { publicadoEn: "desc" },
  });

  return productos.map((p): ProductoPublico => {
    const base = calcularPrecioBase(p.precioInicialKg, p.publicadoEn);
    const ajusteReciente =
      p.ultimoAjuste !== null && Date.now() - p.ultimoAjuste.getTime() < 60 * 60_000;

    return {
      id: p.id,
      especie: p.captura.especieNombre as ProductoPublico["especie"],
      cantidad: p.captura.cantidad,
      pesoKg: p.captura.pesoKg,
      precioInicialKg: p.precioInicialKg,
      precioActualKg: ajusteReciente ? p.precioActualKg : base.precioActualKg,
      descuentoPct: base.descuentoPct,
      horasPublicado: base.horasPublicado,
      etiquetaTramo: base.etiquetaTramo,
      horasHastaProximoTramo: base.horasHastaProximoTramo,
      proximoDescuentoPct: base.proximoDescuentoPct,
      estado: base.riesgoMerma ? "merma" : (p.estado as ProductoPublico["estado"]),
      tendencia: (ajusteReciente ? p.tendencia : undefined) as ProductoPublico["tendencia"],
      justificacionIa: ajusteReciente ? p.justificacionIa ?? undefined : undefined,
      pescador: { nombre: p.captura.pescador.nombre, caleta: p.captura.pescador.caleta },
      selloCertificado: true,
    };
  });
}

// ---------------------------------------------------------------- restaurantes

export interface RestaurantePublico {
  id: string;
  nombre: string;
  comuna: string;
  selloCertificado: boolean;
}

export async function listarRestaurantes(): Promise<RestaurantePublico[]> {
  const restaurantes = await prisma.restaurante.findMany({ orderBy: { nombre: "asc" } });
  return restaurantes.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    comuna: r.comuna,
    selloCertificado: r.selloCertificado,
  }));
}

// ---------------------------------------------------------------- pedidos

export interface PedidoEnCola extends ColaResuelta {
  /** Persistido: un pedido resuelto ya no compite en la cola. */
  resuelto: boolean;
  productoElegidoId: string | null;
  scoreElegido: number | null;
}

function esEspecieValida(valor: string): valor is EspecieConcreta {
  return (ESPECIES as readonly string[]).includes(valor);
}

/**
 * `estado` en la BD guarda solo hechos durables: `cola` o `resuelto`. El estado
 * `match` del contrato es derivado — depende de qué haya publicado en ese momento,
 * así que persistirlo sería guardar algo que caduca solo.
 */
export async function crearPedido(entrada: {
  restauranteId: string;
  especie: string;
  cantidadKg: number;
}): Promise<ApiResponse<PedidoResponse>> {
  const especie = entrada.especie.trim().toLowerCase();

  if (!esEspecieValida(especie)) {
    return apiError(
      "VALIDACION",
      `Especie no válida. Opciones: ${ESPECIES.join(", ")}.`,
    );
  }

  if (!Number.isFinite(entrada.cantidadKg) || entrada.cantidadKg <= 0) {
    return apiError("VALIDACION", "La cantidad debe ser un número mayor que cero.");
  }

  if (entrada.cantidadKg > MAX_CANTIDAD_KG) {
    return apiError("VALIDACION", `La cantidad máxima por pedido es ${MAX_CANTIDAD_KG} kg.`);
  }

  const restaurante = await prisma.restaurante.findUnique({
    where: { id: entrada.restauranteId },
  });
  if (!restaurante) {
    return apiError("NO_ENCONTRADO", "Restaurante no encontrado.");
  }

  const pedido = await prisma.pedido.create({
    data: {
      restauranteId: restaurante.id,
      especieNombre: especie,
      cantidadKg: Math.round(entrada.cantidadKg * 10) / 10,
      estado: "cola",
    },
  });

  return apiOk({ pedidoId: pedido.id, estado: "cola" });
}

/** Vista completa de la cola con sus sugerencias, para la pantalla y para GET /api/pedidos. */
export async function listarCola(restauranteId?: string): Promise<{
  cola: PedidoEnCola[];
  productos: ProductoPublico[];
}> {
  const [pedidos, productos] = await Promise.all([
    prisma.pedido.findMany({
      where: restauranteId ? { restauranteId } : undefined,
      include: { restaurante: true },
      orderBy: { creadoEn: "asc" },
    }),
    productosPublicos(),
  ]);

  const paraMatch: PedidoParaMatch[] = pedidos
    .filter((p) => esEspecieValida(p.especieNombre))
    .map((p) => ({
      id: p.id,
      especie: p.especieNombre as EspecieConcreta,
      cantidadKg: p.cantidadKg,
      creadoEn: p.creadoEn.toISOString(),
      restaurante: {
        nombre: p.restaurante.nombre,
        comuna: p.restaurante.comuna || COMUNA_POR_DEFECTO,
      },
    }));

  const porId = new Map(pedidos.map((p) => [p.id, p]));

  const cola: PedidoEnCola[] = resolverCola(paraMatch, productos).map((item) => {
    const fila = porId.get(item.pedido.id);
    const resuelto = fila?.estado === "resuelto";
    return {
      ...item,
      // Un pedido resuelto no sigue recibiendo sugerencias: ya eligió.
      estado: resuelto ? "resuelto" : item.estado,
      sugerencias: resuelto ? [] : item.sugerencias,
      resuelto,
      productoElegidoId: fila?.productoId ?? null,
      scoreElegido: fila?.scoreMatch ?? null,
    };
  });

  return { cola, productos };
}

/** Candidatos de un pedido puntual — GET /api/pedidos/[id]/match */
export async function candidatosDePedido(
  pedidoId: string,
  limite = MAX_SUGERENCIAS,
): Promise<ApiResponse<MatchResponse>> {
  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: { restaurante: true },
  });

  if (!pedido) return apiError("NO_ENCONTRADO", "Pedido no encontrado.");
  if (!esEspecieValida(pedido.especieNombre)) {
    return apiError("VALIDACION", `El pedido tiene una especie fuera del catálogo.`);
  }

  const productos = await productosPublicos();
  const sugerencias = sugerirParaPedido(
    {
      id: pedido.id,
      especie: pedido.especieNombre,
      cantidadKg: pedido.cantidadKg,
      creadoEn: pedido.creadoEn.toISOString(),
      restaurante: {
        nombre: pedido.restaurante.nombre,
        comuna: pedido.restaurante.comuna || COMUNA_POR_DEFECTO,
      },
    },
    productos,
    limite,
  );

  // El contrato de docs/05 no incluye `factores`; se agrega porque la UI lo muestra
  // y no rompe a nadie: los campos de CandidatoMatch siguen todos presentes.
  const candidatos: CandidatoMatch[] = sugerencias;
  return apiOk({ candidatos });
}

/**
 * El restaurante toma una sugerencia. NO reserva el producto ni toca
 * Producto.estado: son sugerencias, no una subasta con exclusividad. Así el
 * marketplace sigue mostrando lo mismo y el matching no interfiere con la demo
 * de precio dinámico.
 */
export async function tomarSugerencia(
  pedidoId: string,
  productoId: string,
): Promise<ApiResponse<{ pedidoId: string; productoId: string; score: number }>> {
  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: { restaurante: true },
  });
  if (!pedido) return apiError("NO_ENCONTRADO", "Pedido no encontrado.");
  if (!esEspecieValida(pedido.especieNombre)) {
    return apiError("VALIDACION", "El pedido tiene una especie fuera del catálogo.");
  }

  const productos = await productosPublicos();
  const producto = productos.find((p) => p.id === productoId);
  if (!producto) return apiError("NO_ENCONTRADO", "Producto no encontrado.");

  const sugerencia: SugerenciaMatch = puntuar(
    {
      id: pedido.id,
      especie: pedido.especieNombre,
      cantidadKg: pedido.cantidadKg,
      creadoEn: pedido.creadoEn.toISOString(),
      restaurante: {
        nombre: pedido.restaurante.nombre,
        comuna: pedido.restaurante.comuna || COMUNA_POR_DEFECTO,
      },
    },
    producto,
  );

  await prisma.pedido.update({
    where: { id: pedido.id },
    data: { estado: "resuelto", productoId: producto.id, scoreMatch: sugerencia.score },
  });

  return apiOk({ pedidoId: pedido.id, productoId: producto.id, score: sugerencia.score });
}

/** Deshace la elección y devuelve el pedido a la cola. */
export async function volverACola(pedidoId: string): Promise<ApiResponse<PedidoResponse>> {
  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido) return apiError("NO_ENCONTRADO", "Pedido no encontrado.");

  await prisma.pedido.update({
    where: { id: pedido.id },
    data: { estado: "cola", productoId: null, scoreMatch: null },
  });

  return apiOk({ pedidoId: pedido.id, estado: "cola" });
}

export async function eliminarPedido(pedidoId: string): Promise<ApiResponse<{ pedidoId: string }>> {
  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido) return apiError("NO_ENCONTRADO", "Pedido no encontrado.");
  await prisma.pedido.delete({ where: { id: pedido.id } });
  return apiOk({ pedidoId });
}
