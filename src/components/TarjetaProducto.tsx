import { PrecioDinamico } from "@/components/PrecioDinamico";
import { formatearHoras } from "@/lib/pricing";
import type { ProductoPublico } from "@/lib/types";
import type { ReactNode } from "react";

/**
 * Tarjeta de producto, única para toda la app.
 *
 * Antes el marketplace, "Mis productos" y las sugerencias del restaurante
 * repetían la misma tarjeta con radios, paddings y jerarquías distintas.
 * Ver docs/07-diseno-ui.md
 */
export function TarjetaProducto({
  producto,
  pie,
  compacta = false,
}: {
  producto: ProductoPublico;
  /** Contenido extra al final (acciones, edición de precio). */
  pie?: ReactNode;
  /** Sin justificación de IA ni contador de tramo: para listados densos. */
  compacta?: boolean;
}) {
  const enMerma = producto.estado === "merma";

  return (
    <article className="flex h-full flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-marino/10 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold capitalize">{producto.especie}</h3>
          <p className="mt-0.5 text-sm text-marino/60">
            <span className="tabular-nums">{producto.pesoKg}</span> kg ·{" "}
            {producto.pescador.nombre} · {producto.pescador.caleta}
          </p>
        </div>

        {producto.selloCertificado && (
          <span className="shrink-0 rounded-full bg-agua/15 px-2 py-1 text-xs font-semibold text-agua">
            Certificada
          </span>
        )}
      </div>

      <div className="mt-4">
        <PrecioDinamico
          precioInicialKg={producto.precioInicialKg}
          precioActualKg={producto.precioActualKg}
          descuentoPct={producto.descuentoPct}
          tendencia={producto.tendencia}
          justificacion={compacta ? undefined : producto.justificacionIa}
          horasHastaProximoTramo={compacta ? null : producto.horasHastaProximoTramo}
          proximoDescuentoPct={compacta ? null : producto.proximoDescuentoPct}
        />
      </div>

      <p className="mt-4 border-t border-marino/10 pt-3 text-xs text-marino/50">
        Publicado hace{" "}
        <span className="tabular-nums">{formatearHoras(producto.horasPublicado)}</span>
        {producto.etiquetaTramo && ` · ${producto.etiquetaTramo}`}
        {enMerma && <strong className="text-cobre"> · riesgo de merma</strong>}
      </p>

      {pie && <div className="mt-4 border-t border-marino/10 pt-4">{pie}</div>}
    </article>
  );
}
