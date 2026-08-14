"use client";

import { useState, useEffect } from "react";
import { formatearPesos } from "@/lib/pricing";
import type { MarketplaceResponse, ApiResponse } from "@/lib/types";

interface ProductoEdicion {
  precioInput: string;
  guardando: boolean;
  ok: boolean;
  error: string;
}

export function MisProductos() {
  const [productos, setProductos] = useState<MarketplaceResponse["productos"]>([]);
  const [loading, setLoading] = useState(true);
  const [edicion, setEdicion] = useState<Record<string, ProductoEdicion>>({});

  useEffect(() => {
    fetch("/api/marketplace")
      .then((r) => r.json())
      .then((json: ApiResponse<MarketplaceResponse>) => {
        if (json.ok) {
          setProductos(json.data.productos);
          const ini: Record<string, ProductoEdicion> = {};
          for (const p of json.data.productos) {
            ini[p.id] = { precioInput: String(p.precioInicialKg), guardando: false, ok: false, error: "" };
          }
          setEdicion(ini);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const guardar = async (id: string) => {
    const ed = edicion[id];
    if (!ed) return;
    setEdicion({ ...edicion, [id]: { ...ed, guardando: true, ok: false, error: "" } });
    try {
      const res = await fetch(`/api/productos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ precioInicialKg: parseFloat(ed.precioInput) }),
      });
      const json: ApiResponse<{ productoId: string; precioInicialKg: number }> = await res.json();
      if (!json.ok) throw new Error(json.error.message);
      setEdicion({ ...edicion, [id]: { ...ed, guardando: false, ok: true, error: "" } });
      setTimeout(() => {
        setEdicion((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], ok: false } } : prev));
      }, 2000);
    } catch (e) {
      setEdicion({
        ...edicion,
        [id]: { ...ed, guardando: false, ok: false, error: e instanceof Error ? e.message : "Error" },
      });
    }
  };

  if (loading) {
    return <p className="mt-3 rounded-xl bg-white p-4 text-sm text-marino/60 ring-1 ring-marino/10">Cargando...</p>;
  }

  if (productos.length === 0) {
    return (
      <p className="mt-3 rounded-xl bg-white p-4 text-sm text-marino/60 ring-1 ring-marino/10">
        Aún no tienes productos publicados.
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-3">
      {productos.map((p) => {
        const ed = edicion[p.id];
        return (
          <li key={p.id} className="rounded-xl bg-white p-4 ring-1 ring-marino/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold capitalize">{p.especie}</h3>
                <p className="text-sm text-marino/60">
                  {p.pesoKg} kg · venta actual {formatearPesos(p.precioActualKg)}/kg
                </p>
              </div>
              <span className="text-xs text-marino/50">{p.etiquetaTramo}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <label className="text-sm text-marino/60">Precio base $/kg:</label>
              <input
                type="number"
                step="100"
                value={ed?.precioInput ?? ""}
                onChange={(e) => setEdicion({ ...edicion, [p.id]: { ...ed!, precioInput: e.target.value } })}
                className="w-32 rounded-lg border border-marino/15 bg-white px-3 py-2"
              />
              <button
                onClick={() => guardar(p.id)}
                disabled={ed?.guardando}
                className="rounded-lg bg-agua px-4 py-2 text-sm font-semibold text-white transition hover:bg-agua-claro disabled:opacity-50"
              >
                {ed?.guardando ? "..." : "Guardar"}
              </button>
              {ed?.ok && <span className="text-sm text-agua">✓</span>}
              {ed?.error && <span className="text-sm text-cobre">{ed.error}</span>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
