import type { ReactNode } from "react";

/**
 * Contenedor común de todas las pantallas: ancho, padding, encabezado y badge.
 *
 * Existe porque cada página traía su propio ancho (max-w-2xl / 3xl / 5xl) y su
 * propio encabezado, y eso es lo que hacía ver la app como piezas separadas.
 * Ver docs/07-diseno-ui.md
 */
export function PageShell({
  titulo,
  descripcion,
  badge,
  acciones,
  ancho = "trabajo",
  children,
}: {
  titulo: string;
  descripcion?: string;
  /** Rótulo de honestidad o estado, a la derecha del título. */
  badge?: ReactNode;
  /** Acciones alineadas al encabezado (enlaces, botones secundarios). */
  acciones?: ReactNode;
  /** `trabajo` para pantallas de una tarea, `amplio` para grillas y landing. */
  ancho?: "trabajo" | "amplio";
  children: ReactNode;
}) {
  const maxAncho = ancho === "amplio" ? "max-w-5xl" : "max-w-3xl";

  return (
    <div className={`mx-auto ${maxAncho} px-4 py-8 sm:py-10`}>
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{titulo}</h1>
            {badge}
          </div>
          {descripcion && (
            <p className="mt-2 max-w-2xl text-marino/70">{descripcion}</p>
          )}
        </div>
        {acciones && <div className="flex shrink-0 items-center gap-2">{acciones}</div>}
      </header>

      <div className="mt-8">{children}</div>
    </div>
  );
}

/**
 * Título de sección dentro de una pantalla. Unifica el
 * "uppercase tracking-wide text-marino/50" que estaba copiado en 4 lugares.
 */
export function SeccionTitulo({
  children,
  extra,
}: {
  children: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-marino/50">
        {children}
      </h2>
      {extra}
    </div>
  );
}

/** Tarjeta blanca estándar sobre el fondo crema. */
export function Tarjeta({
  children,
  className = "",
  destacada = false,
}: {
  children: ReactNode;
  className?: string;
  destacada?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ${
        destacada ? "ring-2 ring-agua" : "ring-marino/10"
      } ${className}`}
    >
      {children}
    </div>
  );
}
