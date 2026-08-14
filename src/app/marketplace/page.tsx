"use client";

import { useState, useEffect } from "react";
import { BadgeSimulado } from "@/components/BadgeSimulado";
import { PrecioDinamico } from "@/components/PrecioDinamico";
import { formatearHoras } from "@/lib/pricing";
import type { MarketplaceResponse, ApiResponse } from "@/lib/types";

export default function MarketplacePage() {
  const [data, setData] = useState<MarketplaceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/marketplace")
      .then((r) => r.json())
      .then((json: ApiResponse<MarketplaceResponse>) => {
        if (json.ok) setData(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 text-center">
        <div className="animate-pulse text-marino/50">Cargando marketplace...</div>
      </div>
    );
  }

  const productos = data?.productos ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Marketplace de la caleta</h1>
          <p className="mt-1 text-sm text-marino/70">
            Pesca fresca de Caleta Portales. El precio baja si no se vende.
          </p>
        </div>
        <BadgeSimulado texto="datos de demostración" />
      </div>

      {productos.length === 0 ? (
        <p className="mt-8 text-center text-marino/50">No hay productos disponibles.</p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {productos.map((p) => (
            <li
              key={p.id}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-marino/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold capitalize">{p.especie}</h2>
                  <p className="text-sm text-marino/60">
                    {p.pesoKg} kg · {p.pescador.nombre}
                  </p>
                </div>
                {p.selloCertificado && (
                  <span className="rounded-full bg-agua/15 px-2 py-1 text-xs font-semibold text-agua">
                    ⚓ Certificado
                  </span>
                )}
              </div>

              <div className="mt-4">
                <PrecioDinamico
                  precioInicialKg={p.precioInicialKg}
                  precioActualKg={p.precioActualKg}
                  descuentoPct={p.descuentoPct}
                  tendencia={p.tendencia}
                  justificacion={p.justificacionIa}
                  horasHastaProximoTramo={p.horasHastaProximoTramo}
                  proximoDescuentoPct={p.proximoDescuentoPct}
                />
              </div>

              <p className="mt-3 border-t border-marino/10 pt-2 text-xs text-marino/50">
                Publicado hace {formatearHoras(p.horasPublicado)} · {p.etiquetaTramo}
                {p.estado === "merma" && (
                  <strong className="text-cobre"> · riesgo de merma</strong>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
