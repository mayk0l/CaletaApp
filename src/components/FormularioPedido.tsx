"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ESPECIES } from "@/lib/types";
import { accionCrearPedido } from "@/app/restaurante/actions";
import { ESTADO_INICIAL } from "@/app/restaurante/estado-accion";
import type { RestaurantePublico } from "@/lib/pedidos";

/**
 * Programar un pedido: especie, cantidad y a la cola. Si no hay nada que calce,
 * el pedido espera; cuando se publica una captura que sirve, aparece la sugerencia.
 */
export function FormularioPedido({
  restaurantes,
  restauranteId,
}: {
  restaurantes: RestaurantePublico[];
  restauranteId: string;
}) {
  const [estado, accion] = useActionState(accionCrearPedido, ESTADO_INICIAL);

  return (
    <form action={accion} className="rounded-2xl bg-white p-5 ring-1 ring-marino/10">
      <input type="hidden" name="restauranteId" value={restauranteId} />

      <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div>
          <label htmlFor="especie" className="block text-sm font-medium text-marino/70">
            Especie
          </label>
          <select
            id="especie"
            name="especie"
            defaultValue="congrio"
            className="mt-1 w-full rounded-xl border border-marino/20 bg-white px-3 py-3 capitalize focus:border-agua focus:outline-none focus:ring-2 focus:ring-agua/40"
          >
            {ESPECIES.map((e) => (
              <option key={e} value={e} className="capitalize">
                {e}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="cantidadKg" className="block text-sm font-medium text-marino/70">
            Cantidad (kg)
          </label>
          <input
            id="cantidadKg"
            name="cantidadKg"
            type="number"
            min={0.5}
            max={500}
            step={0.5}
            defaultValue={5}
            required
            className="mt-1 w-full rounded-xl border border-marino/20 bg-white px-3 py-3 focus:border-agua focus:outline-none focus:ring-2 focus:ring-agua/40 sm:w-32"
          />
        </div>

        <BotonEnviar deshabilitado={restaurantes.length === 0} />
      </div>

      {estado.mensaje && (
        <p
          role={estado.ok ? "status" : "alert"}
          aria-live="polite"
          className={`mt-4 rounded-xl p-3 text-sm ${
            estado.ok ? "bg-agua/15 text-marino" : "bg-cobre/10 text-cobre"
          }`}
        >
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}

function BotonEnviar({ deshabilitado }: { deshabilitado: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || deshabilitado}
      className="rounded-xl bg-agua px-6 py-3 font-semibold text-marino transition hover:bg-agua-claro disabled:opacity-60"
    >
      {pending ? "Programando…" : "Programar pedido"}
    </button>
  );
}
