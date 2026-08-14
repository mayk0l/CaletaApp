"use client";
import { useState, useEffect } from "react";
import { getRestaurantes, crearPedido, matchPedido } from "@/lib/api";

const ESPECIES = ["congrio", "merluza", "jaiba", "reineta", "corvina"];

export default function RestaurantePage() {
  const [restaurantes, setRestaurantes] = useState<any[]>([]);
  const [restId, setRestId] = useState(1);
  const [especie, setEspecie] = useState("congrio");
  const [cantidad, setCantidad] = useState(1);
  const [pedido, setPedido] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getRestaurantes().then(setRestaurantes).catch(() => {});
  }, []);

  async function handlePedido() {
    setLoading(true);
    try {
      const p = await crearPedido({ restaurante_id: restId, especie_solicitada: especie, cantidad });
      setPedido(p);
      const m = await matchPedido(p.id);
      setMatches(m);
    } catch {}
    setLoading(false);
  }

  function formatCLP(valor: number) {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(valor);
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-ocean-900">Soy Restaurante / Hotel</h1>
        <p className="text-ocean-700 mt-1">Pide especie y encuentra pescadores con IA matching</p>
      </div>

      {/* Lista restaurantes con sello */}
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="font-semibold mb-2">Restaurantes certificados</h2>
        <div className="flex flex-wrap gap-2">
          {restaurantes.map((r) => (
            <span key={r.id} className="bg-ocean-50 px-3 py-1 rounded-lg text-sm flex items-center gap-1">
              {r.nombre}
              {r.sello_certificado && <span className="sello-badge">⚓ Certificado</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Crear pedido */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold text-lg mb-3">📦 Crear pedido</h2>
        <div className="flex flex-wrap gap-3 mb-3">
          <select value={restId} onChange={(e) => setRestId(parseInt(e.target.value))} className="border rounded-lg px-4 py-2">
            {restaurantes.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
          <select value={especie} onChange={(e) => setEspecie(e.target.value)} className="border rounded-lg px-4 py-2">
            {ESPECIES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(parseInt(e.target.value))} className="border rounded-lg px-4 py-2 w-24" />
        </div>
        <button
          onClick={handlePedido}
          disabled={loading}
          className="bg-ocean-700 text-white px-6 py-2 rounded-lg hover:bg-ocean-800 disabled:opacity-50"
        >
          {loading ? "Buscando..." : "Buscar pescadores"}
        </button>
      </div>

      {/* Matches */}
      {matches.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-lg mb-3">🤝 Matches encontrados ({matches.length})</h2>
          <div className="space-y-3">
            {matches.map((m, i) => (
              <div key={m.producto_id} className="border rounded-lg p-3 flex justify-between items-center">
                <div>
                  <span className="font-semibold capitalize">{m.especie}</span>
                  <span className="text-sm text-gray-500 ml-2">{m.cantidad} unidad(es)</span>
                  <span className="text-sm text-gray-500 ml-2">· {m.frescura_horas}h frescura</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm bg-ocean-100 px-2 py-0.5 rounded">
                    Score: {m.score.toFixed(2)}
                  </span>
                  <span className="font-bold text-ocean-700">{formatCLP(m.precio_actual)}</span>
                  {i === 0 && <span className="bg-sand-400 text-ocean-900 text-xs px-2 py-0.5 rounded-full font-bold">Mejor match</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pedido && matches.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          No hay productos disponibles de <strong className="capitalize">{especie}</strong> en este momento.
        </div>
      )}
    </div>
  );
}
