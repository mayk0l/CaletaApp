"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { EstadoVacio, SkeletonLista } from "@/components/Skeleton";
import { TarjetaProducto } from "@/components/TarjetaProducto";
import { formatearPesos } from "@/lib/pricing";
import type { ApiResponse, MarketplaceResponse, ProductoPublico } from "@/lib/types";

/**
 * Pesca publicada del pescador, con edición del precio base
 * (PATCH /api/productos/[id], ver docs/05-api-contratos.md).
 *
 * ⚠️ El endpoint devuelve todos los productos publicados: hoy hay un solo
 * pescador (sesión simulada), así que coincide. Cuando exista login hay que
 * filtrar por pescador en el backend, no acá.
 */
interface Edicion {
  precioInput: string;
  guardando: boolean;
  guardado: boolean;
  error: string;
}

function edicionInicial(p: ProductoPublico): Edicion {
  return {
    precioInput: String(p.precioInicialKg),
    guardando: false,
    guardado: false,
    error: "",
  };
}

export function MisProductos() {
  const [productos, setProductos] = useState<ProductoPublico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [edicion, setEdicion] = useState<Record<string, Edicion>>({});

  const cargar = useCallback(async () => {
    try {
      const resp = await fetch("/api/marketplace");
      const json: ApiResponse<MarketplaceResponse> = await resp.json();
      if (!json.ok) return;

      setProductos(json.data.productos);
      setEdicion((previo) => {
        const siguiente: Record<string, Edicion> = {};
        for (const p of json.data.productos) {
          // Conserva lo que el pescador esté escribiendo si ya había una edición.
          siguiente[p.id] = previo[p.id] ?? edicionInicial(p);
        }
        return siguiente;
      });
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  function actualizar(id: string, cambio: Partial<Edicion>) {
    setEdicion((previo) => {
      const actual = previo[id];
      if (!actual) return previo;
      return { ...previo, [id]: { ...actual, ...cambio } };
    });
  }

  async function guardar(producto: ProductoPublico) {
    const actual = edicion[producto.id];
    if (!actual) return;

    const precio = Number(actual.precioInput);
    if (!Number.isFinite(precio) || precio <= 0) {
      actualizar(producto.id, { error: "Escribe un precio mayor que cero." });
      return;
    }

    actualizar(producto.id, { guardando: true, guardado: false, error: "" });

    try {
      const resp = await fetch(`/api/productos/${producto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ precioInicialKg: precio }),
      });
      const json: ApiResponse<{ productoId: string; precioInicialKg: number }> =
        await resp.json();
      if (!json.ok) throw new Error(json.error.message);

      actualizar(producto.id, { guardando: false, guardado: true });
      // Recargar deja a la vista el precio con el descuento por horas ya aplicado.
      await cargar();
      setTimeout(() => actualizar(producto.id, { guardado: false }), 2500);
    } catch (e) {
      actualizar(producto.id, {
        guardando: false,
        error: e instanceof Error ? e.message : "No se pudo guardar.",
      });
    }
  }

  if (cargando) {
    return (
      <div className="mt-3">
        <SkeletonLista cantidad={2} etiqueta="Cargando tu pesca publicada…" />
      </div>
    );
  }

  if (productos.length === 0) {
    return (
      <div className="mt-3">
        <EstadoVacio
          titulo="Aún no tienes pesca publicada"
          detalle="Registra una captura y valida la trazabilidad: el producto se publica solo."
          accion={
            <Link
              href="/pescador/captura"
              className="rounded-xl bg-agua px-5 py-3 font-semibold text-marino transition hover:bg-agua-claro"
            >
              Registrar captura
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <ul className="mt-3 space-y-4">
      {productos.map((p) => {
        const ed = edicion[p.id] ?? edicionInicial(p);
        const campoId = `precio-${p.id}`;

        return (
          <li key={p.id}>
            <TarjetaProducto
              producto={p}
              compacta
              pie={
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label
                      htmlFor={campoId}
                      className="block text-sm font-medium text-marino/70"
                    >
                      Precio base por kilo
                    </label>
                    <input
                      id={campoId}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={100}
                      value={ed.precioInput}
                      onChange={(e) =>
                        actualizar(p.id, { precioInput: e.target.value, error: "" })
                      }
                      aria-describedby={ed.error ? `${campoId}-error` : undefined}
                      className="mt-1 w-36 rounded-xl border border-marino/20 bg-white px-3 py-2 tabular-nums focus:border-agua focus:outline-none focus:ring-2 focus:ring-agua/40"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => guardar(p)}
                    disabled={ed.guardando}
                    className="rounded-xl bg-agua px-4 py-2 text-sm font-semibold text-marino transition hover:bg-agua-claro disabled:opacity-60"
                  >
                    {ed.guardando ? "Guardando…" : "Guardar"}
                  </button>

                  <p className="text-sm" aria-live="polite">
                    {ed.guardado && (
                      <span className="font-medium text-agua">
                        Guardado · se vende a {formatearPesos(p.precioActualKg)}/kg
                      </span>
                    )}
                  </p>

                  {ed.error && (
                    <p
                      id={`${campoId}-error`}
                      role="alert"
                      className="text-sm text-cobre"
                    >
                      {ed.error}
                    </p>
                  )}
                </div>
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
