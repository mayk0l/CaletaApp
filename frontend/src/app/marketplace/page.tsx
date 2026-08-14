"use client";
import { useState, useEffect, useCallback } from "react";
import { getMarketplace, actualizarPrecio, getPrediccion, type Producto } from "@/lib/api";

export default function MarketplacePage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [predicciones, setPredicciones] = useState<Record<number, any>>({});

  const cargar = useCallback(async () => {
    try { setProductos(await getMarketplace()); } catch {}
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function handleActualizar(id: number) {
    setLoading(true);
    try {
      await actualizarPrecio(id);
      const pred = await getPrediccion(id);
      setPredicciones((p) => ({ ...p, [id]: pred }));
      await cargar();
    } catch {}
    setLoading(false);
  }

  function formatCLP(valor: number) {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(valor);
  }

  function descuento(p: Producto) {
    if (p.precio_inicial === 0) return 0;
    return Math.round((1 - p.precio_actual / p.precio_inicial) * 100);
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-ocean-900">Marketplace</h1>
        <p className="text-ocean-700 mt-1">Precio dinámico — baja automática para reducir merma</p>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{productos.length} productos disponibles</p>
        <button
          onClick={() => productos.forEach((p) => handleActualizar(p.id))}
          disabled={loading}
          className="bg-ocean-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-ocean-700 disabled:opacity-50"
        >
          {loading ? "Actualizando..." : "🔄 Actualizar precios"}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {productos.map((p) => {
          const desc = descuento(p);
          const pred = predicciones[p.id];
          return (
            <div key={p.id} className={`bg-white rounded-xl shadow p-5 ${desc > 0 ? "flash-discount" : ""}`}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg capitalize">{p.especie}</h3>
                {desc > 0 && (
                  <span className="bg-coral-500 text-white text-xs px-2 py-0.5 rounded-full">
                    -{desc}%
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-bold text-ocean-700">{formatCLP(p.precio_actual)}</span>
                {desc > 0 && (
                  <span className="text-sm text-gray-400 line-through">{formatCLP(p.precio_inicial)}</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Publicado: {new Date(p.timestamp_publicacion).toLocaleString("es-CL")}
              </p>

              {pred && (
                <div className={`p-2 rounded-lg text-sm mb-3 ${
                  pred.tendencia === "alcista" ? "bg-green-50 text-green-700" :
                  pred.tendencia === "bajista" ? "bg-coral-500/10 text-coral-600" :
                  "bg-ocean-50 text-ocean-700"
                }`}>
                  <strong className="capitalize">📈 {pred.tendencia}</strong>
                  <p className="mt-1 text-xs">{pred.justificacion}</p>
                  <p className="mt-1 text-xs font-semibold">Sugerido: {formatCLP(pred.precio_sugerido)}</p>
                </div>
              )}

              <button
                onClick={() => handleActualizar(p.id)}
                disabled={loading}
                className="text-sm bg-ocean-100 text-ocean-700 px-3 py-1 rounded hover:bg-ocean-200 disabled:opacity-50"
              >
                Ver predicción IA
              </button>
            </div>
          );
        })}
      </div>

      {productos.length === 0 && (
        <div className="text-center text-gray-400 py-12">
          No hay productos publicados aún. Registra una captura y envíala a SERNAPESCA.
        </div>
      )}
    </div>
  );
}
