import type { ReactNode } from "react";

/**
 * Placeholders de carga. Reemplazan los "Cargando..." en texto plano, que era
 * lo que más hacía ver la app como un prototipo a medio terminar.
 *
 * `aria-hidden` porque el texto de espera lo anuncia el contenedor con
 * aria-busy/aria-live: el esqueleto es puramente visual.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block animate-pulse rounded-md bg-marino/10 ${className}`}
    />
  );
}

/** Esqueleto con la forma de una tarjeta de producto. */
export function SkeletonTarjeta() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-marino/10">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="mt-2 h-4 w-44" />
      <Skeleton className="mt-5 h-8 w-32" />
      <Skeleton className="mt-3 h-3 w-full" />
    </div>
  );
}

/** Lista de esqueletos, para grillas y listados. */
export function SkeletonLista({
  cantidad = 3,
  columnas = 1,
  etiqueta = "Cargando…",
}: {
  cantidad?: number;
  columnas?: 1 | 2;
  etiqueta?: string;
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{etiqueta}</span>
      <div className={`grid gap-4 ${columnas === 2 ? "sm:grid-cols-2" : ""}`}>
        {Array.from({ length: cantidad }, (_, i) => (
          <SkeletonTarjeta key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Estado vacío con una acción sugerida. Un vacío explicado se lee como producto
 * terminado; un vacío sin explicar se lee como bug.
 */
export function EstadoVacio({
  titulo,
  detalle,
  accion,
  icono = "🐟",
}: {
  titulo: string;
  detalle?: string;
  accion?: ReactNode;
  icono?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-marino/20 bg-white/60 p-8 text-center">
      <span aria-hidden className="text-3xl">
        {icono}
      </span>
      <p className="mt-3 font-semibold text-marino">{titulo}</p>
      {detalle && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-marino/60">{detalle}</p>
      )}
      {accion && <div className="mt-4 flex justify-center">{accion}</div>}
    </div>
  );
}
