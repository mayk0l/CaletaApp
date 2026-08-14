"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { EstadoVacio, SkeletonLista } from "@/components/Skeleton";
import { SugerenciaPrecioPanel } from "@/components/SugerenciaPrecioPanel";
import { TarjetaProducto } from "@/components/TarjetaProducto";
import { formatearPesos } from "@/lib/pricing";
import type { SugerenciaPrecio } from "@/lib/sugerencia-precio";
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

type SugerenciaConProducto = SugerenciaPrecio & { productoId: string; especie: string };

export function MisProductos() {
  const [productos, setProductos] = useState<ProductoPublico[]>([]);
  const [sugerencias, setSugerencias] = useState<Record<string, SugerenciaConProducto>>({});
  const [urgenteId, setUrgenteId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [edicion, setEdicion] = useState<Record<string, Edicion>>({});

  const cargar = useCallback(async () => {
    try {
      // En paralelo: los productos y los indicadores de precio. Los indicadores
      // son capa determinista, así que llegan en milisegundos y se pintan solos
      // sin que el pescador tenga que pedirlos.
      const [respProductos, respSugerencias] = await Promise.all([
        fetch("/api/marketplace"),
        fetch("/api/sugerencias-precio"),
      ]);

      const jsonProductos: ApiResponse<MarketplaceResponse> = await respProductos.json();
      if (jsonProductos.ok) {
        setProductos(jsonProductos.data.productos);
        setEdicion((previo) => {
          const siguiente: Record<string, Edicion> = {};
          for (const p of jsonProductos.data.productos) {
            // Conserva lo que el pescador esté escribiendo si ya había edición.
            siguiente[p.id] = previo[p.id] ?? edicionInicial(p);
          }
          return siguiente;
        });
      }

      const jsonSugerencias: ApiResponse<{ sugerencias: SugerenciaConProducto[] }> =
        await respSugerencias.json();
      if (jsonSugerencias.ok) {
        const porId: Record<string, SugerenciaConProducto> = {};
        for (const s of jsonSugerencias.data.sugerencias) porId[s.productoId] = s;
        setSugerencias(porId);

        // El endpoint devuelve ordenado por urgencia. Solo al primero que de
        // verdad necesita bajar se le pide la redacción del modelo.
        const candidato = jsonSugerencias.data.sugerencias.find(
          (s) => s.riesgoMerma || s.diferenciaKg < 0,
        );
        setUrgenteId(candidato?.productoId ?? null);
      }
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

  const necesitanAtencion = productos.filter((p) => {
    const s = sugerencias[p.id];
    return s && (s.riesgoMerma || s.diferenciaKg < 0);
  });

  return (
    <>
      {necesitanAtencion.length > 0 && (
        <div
          role="status"
          className="mt-3 rounded-2xl bg-cobre/15 p-4 ring-1 ring-cobre/30"
        >
          <p className="font-semibold text-marino">
            {necesitanAtencion.length === 1
              ? "1 producto necesita que le bajes el precio"
              : `${necesitanAtencion.length} productos necesitan que les bajes el precio`}
          </p>
          <ul className="mt-1 space-y-0.5 text-sm text-marino/80">
            {necesitanAtencion.map((p) => {
              const s = sugerencias[p.id];
              return (
                <li key={p.id} className="capitalize">
                  {p.especie}: a{" "}
                  <span className="tabular-nums">
                    {formatearPesos(s.precioSugeridoKg)}
                  </span>
                  /kg
                  {s.riesgoMerma && (
                    <span className="ml-1 font-medium text-cobre">
                      · quedan {Math.max(0, Math.round(s.vidaUtilHoras - s.horasPublicado))} h
                      de venta
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <ul className="mt-3 space-y-4">
        {productos.map((p) => {
          const ed = edicion[p.id] ?? edicionInicial(p);
          const campoId = `precio-${p.id}`;
          const sugerencia = sugerencias[p.id];

          return (
            <li key={p.id}>
              <TarjetaProducto
                producto={p}
                compacta
                pie={
                  <div className="space-y-4">
                    {sugerencia && (
                      <SugerenciaPrecioPanel
                        productoId={p.id}
                        sugerencia={sugerencia}
                        explicarConIa={p.id === urgenteId}
                        onUsarPrecio={(precioKg) =>
                          actualizar(p.id, { precioInput: String(precioKg), error: "" })
                        }
                      />
                    )}

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
                  </div>
                }
              />
            </li>
          );
        })}
      </ul>
    </>
  );
}
