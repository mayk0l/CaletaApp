"use client";
import { useState } from "react";
import { capturaVoz, capturaManual, getFormulario, validarFormulario, enviarFormulario } from "@/lib/api";

const ESPECIES = ["congrio", "merluza", "jaiba", "reineta", "corvina"];

export default function CapturaPage() {
  const [textoVoz, setTextoVoz] = useState("");
  const [especie, setEspecie] = useState("congrio");
  const [peso, setPeso] = useState("");
  const [captura, setCaptura] = useState<any>(null);
  const [formulario, setFormulario] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleVoz() {
    setLoading(true); setError("");
    try {
      const c = await capturaVoz(textoVoz);
      setCaptura(c);
      const f = await getFormulario(c.id);
      setFormulario(f);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleManual() {
    setLoading(true); setError("");
    try {
      const c = await capturaManual({ pescador_id: 1, especie, peso_kg: parseFloat(peso) });
      setCaptura(c);
      const f = await getFormulario(c.id);
      setFormulario(f);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleValidar() {
    setLoading(true);
    try { await validarFormulario(captura.id); const f = await getFormulario(captura.id); setFormulario(f); }
    catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleEnviar() {
    setLoading(true);
    try {
      await enviarFormulario(captura.id);
      const f = await getFormulario(captura.id);
      setFormulario(f);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-ocean-900">Registrar Captura</h1>
        <p className="text-ocean-700 mt-1">Por voz o manual — la IA completa el formulario por ti</p>
      </div>

      {/* Registro por voz */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold text-lg mb-3">🎤 Registrar por voz</h2>
        <input
          type="text"
          value={textoVoz}
          onChange={(e) => setTextoVoz(e.target.value)}
          placeholder='Ej: "traje dos congrios de tres kilos cada uno"'
          className="w-full border rounded-lg px-4 py-2 mb-3"
        />
        <button
          onClick={handleVoz}
          disabled={loading || !textoVoz}
          className="bg-ocean-700 text-white px-6 py-2 rounded-lg hover:bg-ocean-800 disabled:opacity-50"
        >
          {loading ? "Procesando..." : "Registrar por voz"}
        </button>
      </div>

      {/* Registro manual */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="font-semibold text-lg mb-3">✍️ Registro manual</h2>
        <div className="flex gap-3 mb-3">
          <select value={especie} onChange={(e) => setEspecie(e.target.value)} className="border rounded-lg px-4 py-2">
            {ESPECIES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <input type="number" value={peso} onChange={(e) => setPeso(e.target.value)} placeholder="Peso (kg)" className="border rounded-lg px-4 py-2 w-32" />
        </div>
        <button
          onClick={handleManual}
          disabled={loading || !peso}
          className="bg-ocean-600 text-white px-6 py-2 rounded-lg hover:bg-ocean-700 disabled:opacity-50"
        >
          Registrar manual
        </button>
      </div>

      {error && <div className="bg-coral-500 text-white p-3 rounded-lg">{error}</div>}

      {/* Resultado captura */}
      {captura && (
        <div className="bg-ocean-50 rounded-xl shadow p-6 border border-ocean-200">
          <h2 className="font-semibold text-lg mb-2">✅ Captura registrada</h2>
          <p>Especie: <strong>{captura.especie}</strong> · Peso: <strong>{captura.peso_kg} kg</strong></p>
        </div>
      )}

      {/* Formulario SERNAPESCA */}
      {formulario && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="font-semibold text-lg mb-3">📋 Formulario SERNAPESCA (autollenado)</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(formulario.campos).map(([k, v]) => (
              <div key={k} className="border-b pb-1">
                <span className="text-gray-500">{k}:</span> <strong>{String(v)}</strong>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            {formulario.estado_envio === "pendiente" && (
              <button onClick={handleValidar} disabled={loading} className="bg-sand-400 text-ocean-900 px-6 py-2 rounded-lg font-semibold hover:bg-sand-300 disabled:opacity-50">
                Validar
              </button>
            )}
            {formulario.estado_envio === "validado" && (
              <button onClick={handleEnviar} disabled={loading} className="bg-ocean-700 text-white px-6 py-2 rounded-lg hover:bg-ocean-800 disabled:opacity-50">
                Enviar a SERNAPESCA → Publicar en marketplace
              </button>
            )}
            {formulario.estado_envio === "enviado_mock" && (
              <div className="text-green-600 font-semibold">
                ✅ Enviado (mock) y publicado en marketplace
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
