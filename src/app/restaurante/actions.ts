"use server";

import { revalidatePath } from "next/cache";
import {
  crearPedido,
  eliminarPedido,
  tomarSugerencia,
  volverACola,
} from "@/lib/pedidos";
import type { EstadoAccion } from "./estado-accion";

/**
 * Server actions de la pantalla de restaurante. Son la misma capa que usan los
 * endpoints de /api/pedidos (src/lib/pedidos.ts), así que la pantalla y la API
 * nunca pueden discrepar.
 *
 * Solo funciones async: el tipo y el estado inicial viven en ./estado-accion.ts
 */

export async function accionCrearPedido(
  _previo: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  const restauranteId = String(formData.get("restauranteId") ?? "");
  const especie = String(formData.get("especie") ?? "");
  const cantidadKg = Number(formData.get("cantidadKg"));

  const resultado = await crearPedido({ restauranteId, especie, cantidadKg });
  if (!resultado.ok) return { ok: false, mensaje: resultado.error.message };

  revalidatePath("/restaurante");
  return { ok: true, mensaje: `Pedido de ${cantidadKg} kg de ${especie} programado.` };
}

export async function accionTomarSugerencia(formData: FormData): Promise<void> {
  const pedidoId = String(formData.get("pedidoId") ?? "");
  const productoId = String(formData.get("productoId") ?? "");
  await tomarSugerencia(pedidoId, productoId);
  revalidatePath("/restaurante");
}

export async function accionVolverACola(formData: FormData): Promise<void> {
  await volverACola(String(formData.get("pedidoId") ?? ""));
  revalidatePath("/restaurante");
}

export async function accionEliminarPedido(formData: FormData): Promise<void> {
  await eliminarPedido(String(formData.get("pedidoId") ?? ""));
  revalidatePath("/restaurante");
}
