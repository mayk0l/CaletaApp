"use client";

import { useState } from "react";
import { ESPECIES, type MatchResponse, type ApiResponse } from "@/lib/types";
import { formatearPesos } from "@/lib/pricing";

export default function RestaurantePage() {
  const [especie, setEspecie] = useState<string>("congrio");
  const [cantidad, setCantidad] = useState("2");
  const [buscando, setBuscando] = useState(false);
  const [matches, setMatches] = useState<MatchResponse | null>(null);
  const [error, setError] = useState("");

  const buscar = async () => {
    setBuscando(true);
    setError("");
    setMatches(null);
    try {
      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restauranteId: "restaurante-1",
          especie,
          cantidadKg: parseFloat(cantidad),
        }),
      });
      const json: ApiResponse<MatchResponse> = await res.json();
      if (!json.ok) throw new Error(json.error.message);
      setMatches(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
    }
    setBuscando(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Compra directo a la caleta</h1>
      <p className="mt-1 text-sm text-marino/70">
        Pide la especie y te conectamos con la captura más fresca.
      </p>

      {/* Formulario de pedido */}
      <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-marino/10">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold text-marino/70">Especie</label>
            <select
              value={especie}
              onChange={(e) => setEspecie(e.target.value)}
              className="mt-1 w-full rounded-xl border border-marino/15 bg-white px-4 py-3"
            >
              {ESPECIES.map((e) => (
                <option key={e} value={e} className="capitalize">{e}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-marino/70">Cantidad (kg)</label>
            <input
              type="number"
              step="0.5"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="mt-1 w-full rounded-xl border border-marino/15 bg-white px-4 py-3"
            />
          </div>
        </div>
        <button
          onClick={buscar}
          disabled={buscando}
          className="mt-4 w-full rounded-xl bg-agua px-4 py-3 font-semibold text-white transition hover:bg-agua-claro disabled:opacity-50"
        >
          {buscando ? "Buscando..." : "Buscar pescadores →"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-cobre/10 p-3 text-sm text-cobre">{error}</div>
      )}

      {/* Resultados */}
      {matches && (
        <div className="mt-6">
          {matches.candidatos.length === 0 ? (
            <p className="text-center text-marino/50">
              No hay <span className="capitalize">{especie}</span> disponible ahora mismo.
            </p>
          ) : (
            <>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-marino/50">
                {matches.candidatos.length} match(s) encontrado(s)
              </h2>
              <ul className="mt-3 space-y-3">
                {matches.candidatos.map((c, i) => (
                  <li
                    key={c.productoId}
                    className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${
                      i === 0 ? "ring-2 ring-agua" : "ring-marino/10"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold capitalize">{c.especie}</h3>
                          {i === 0 && (
                            <span className="rounded-full bg-agua/15 px-2 py-0.5 text-xs font-semibold text-agua">
                              Mejor match
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-marino/60">
                          {c.pesoKg} kg · {c.horasPublicado}h publicado · score {c.score.toFixed(2)}
                        </p>
                        <p className="mt-1 text-xs text-marino/50">{c.motivo}</p>
                      </div>
                      <span className="text-lg font-bold text-marino">
                        {formatearPesos(c.precioActualKg)}
                        <span className="text-sm font-normal text-marino/50">/kg</span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
