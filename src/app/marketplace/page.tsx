"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BadgeSimulado } from "@/components/BadgeSimulado";
import { PageShell } from "@/components/PageShell";
import { EstadoVacio, SkeletonLista } from "@/components/Skeleton";
import { TarjetaProducto } from "@/components/TarjetaProducto";
import type { ApiResponse, MarketplaceResponse, ProductoPublico } from "@/lib/types";

/**
 * Grilla del marketplace contra GET /api/marketplace (CA-25).
 *
 * Antes usaba mockMarketplace, así que un producto publicado con el flujo real
 * no aparecía acá. Contrato en docs/05-api-contratos.md.
 *
 * `horasHastaProximoTramo` y `proximoDescuentoPct` los calcula el backend: el
 * render no puede llamar Date.now() (regla de pureza de React).
 */
export default function MarketplacePage() {
  const [productos, setProductos] = useState<ProductoPublico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    fetch("/api/marketplace")
      .then((r) => r.json())
      .then((json: ApiResponse<MarketplaceResponse>) => {
        if (cancelado) return;
        if (!json.ok) {
          setError(json.error.message);
          return;
        }
        setProductos(json.data.productos);
      })
      .catch(() => {
        if (!cancelado) setError("No se pudo cargar el marketplace.");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const disponibles = productos.filter((p) => p.estado !== "vendido");

  return (
    <PageShell
      ancho="amplio"
      titulo="Marketplace de la caleta"
      descripcion="Pesca fresca de Caleta Portales. El precio baja solo si el producto no se vende."
      badge={<BadgeSimulado texto="señales de mercado simuladas" />}
      acciones={
        !cargando && !error ? (
          <p className="text-sm text-marino/60">
            <span className="tabular-nums font-semibold text-marino">
              {disponibles.length}
            </span>{" "}
            {disponibles.length === 1 ? "producto" : "productos"}
          </p>
        ) : null
      }
    >
      {cargando ? (
        <SkeletonLista cantidad={4} columnas={2} etiqueta="Cargando productos…" />
      ) : error ? (
        <p className="rounded-xl bg-cobre/10 p-4 text-sm text-cobre" role="alert">
          {error}
        </p>
      ) : disponibles.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay pesca publicada"
          detalle="Cuando un pescador registre su captura y valide la trazabilidad, el producto aparece acá con su precio."
          accion={
            <Link
              href="/pescador/captura"
              className="rounded-xl bg-agua px-5 py-3 font-semibold text-marino transition hover:bg-agua-claro"
            >
              Registrar una captura
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {disponibles.map((p) => (
            <li key={p.id}>
              <TarjetaProducto producto={p} />
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
