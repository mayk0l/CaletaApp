"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { CapturaResponse, ApiResponse } from "@/lib/types";
import { UMBRAL_CONFIANZA, ESPECIES } from "@/lib/types";

type Tab = "foto" | "voz" | "manual";
type Estado = "idle" | "enviando" | "ok" | "error";

export default function CapturaPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("voz");
  const [estado, setEstado] = useState<Estado>("idle");
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<CapturaResponse | null>(null);

  // Voz
  const [grabando, setGrabando] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Foto
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual
  const [especieManual, setEspecieManual] = useState<string>("congrio");
  const [pesoManual, setPesoManual] = useState("");
  const [cantidadManual, setCantidadManual] = useState("1");

  // -- Captura por voz --
  const iniciarGrabacion = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        await enviarVoz(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setGrabando(true);
    } catch {
      setError("No se pudo acceder al micrófono. Usa registro manual.");
      setEstado("error");
    }
  }, []);

  const detenerGrabacion = () => {
    mediaRecorderRef.current?.stop();
    setGrabando(false);
  };

  const enviarVoz = async (blob: Blob) => {
    setEstado("enviando");
    setError("");
    try {
      const form = new FormData();
      form.append("audio", blob, "grabacion.webm");
      form.append("pescadorId", "pescador-1");
      const res = await fetch("/api/capturas/voz", { method: "POST", body: form });
      const json: ApiResponse<CapturaResponse> = await res.json();
      if (!json.ok) throw new Error(json.error.message);
      setResultado(json.data);
      setEstado("ok");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
      setEstado("error");
    }
  };

  // -- Captura por foto --
  const enviarFoto = async (file: File) => {
    setEstado("enviando");
    setError("");
    try {
      const form = new FormData();
      form.append("foto", file);
      form.append("pescadorId", "pescador-1");
      const res = await fetch("/api/capturas/imagen", { method: "POST", body: form });
      const json: ApiResponse<CapturaResponse> = await res.json();
      if (!json.ok) throw new Error(json.error.message);
      setResultado(json.data);
      setEstado("ok");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
      setEstado("error");
    }
  };

  // -- Captura manual --
  const enviarManual = async () => {
    setEstado("enviando");
    setError("");
    try {
      const res = await fetch("/api/capturas/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pescadorId: "pescador-1",
          especie: especieManual,
          cantidad: parseInt(cantidadManual),
          pesoKg: parseFloat(pesoManual),
        }),
      });
      const json: ApiResponse<CapturaResponse> = await res.json();
      if (!json.ok) throw new Error(json.error.message);
      setResultado(json.data);
      setEstado("ok");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión");
      setEstado("error");
    }
  };

  const confirmarYContinuar = () => {
    if (resultado) router.push(`/pescador/formulario/${resultado.capturaId}`);
  };

  const reiniciar = () => {
    setResultado(null);
    setEstado("idle");
    setError("");
  };

  // -- Render --
  if (resultado) {
    const confianzaBaja = resultado.reconocimiento.confianza < UMBRAL_CONFIANZA;
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="rounded-3xl bg-white p-6 shadow-lg ring-1 ring-marino/10">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-agua/15">
              <span className="text-3xl">✓</span>
            </div>
            <h1 className="text-2xl font-bold">Captura registrada</h1>
          </div>

          <div className="mt-6 space-y-2">
            <Dato label="Especie" valor={resultado.reconocimiento.especie} capitalize />
            <Dato label="Cantidad" valor={`${resultado.reconocimiento.cantidad} unidad(es)`} />
            <Dato label="Peso estimado" valor={`${resultado.reconocimiento.pesoKgEstimado} kg`} />
            {resultado.reconocimiento.largoCmEstimado && (
              <Dato label="Largo estimado" valor={`${resultado.reconocimiento.largoCmEstimado} cm`} />
            )}
            <Dato label="Confianza IA" valor={`${Math.round(resultado.reconocimiento.confianza * 100)}%`} />
            {resultado.transcripcion && (
              <Dato label="Transcripción" valor={`"${resultado.transcripcion}"`} />
            )}
          </div>

          {confianzaBaja && (
            <div className="mt-4 rounded-xl bg-cobre/10 p-3 text-sm text-cobre">
              ⚠️ Confianza baja. Revisa los datos antes de continuar.
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={confirmarYContinuar}
              className="flex-1 rounded-xl bg-agua px-4 py-3 font-semibold text-white transition hover:bg-agua-claro"
            >
              Continuar a formulario →
            </button>
            <button
              onClick={reiniciar}
              className="rounded-xl bg-marino/5 px-4 py-3 font-semibold text-marino/70 transition hover:bg-marino/10"
            >
              Rehacer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold">Registrar captura</h1>
      <p className="mt-1 text-sm text-marino/70">
        La IA identifica especie y peso. Tú solo confirmas.
      </p>

      {/* Tabs */}
      <div className="mt-6 flex gap-2 rounded-xl bg-marino/5 p-1">
        {( ["voz", "foto", "manual"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold capitalize transition ${
              tab === t ? "bg-white text-marino shadow-sm" : "text-marino/60"
            }`}
          >
            {t === "voz" ? "🎤 Voz" : t === "foto" ? "📸 Foto" : "✍️ Manual"}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {/* VOZ */}
        {tab === "voz" && (
          <div className="text-center">
            {!grabando ? (
              <button
                onClick={iniciarGrabacion}
                disabled={estado === "enviando"}
                className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-agua text-white shadow-lg transition hover:bg-agua-claro disabled:opacity-50"
              >
                <span className="text-3xl">🎤</span>
              </button>
            ) : (
              <button
                onClick={detenerGrabacion}
                className="mx-auto flex h-24 w-24 animate-pulse items-center justify-center rounded-full bg-cobre text-white shadow-lg"
              >
                <span className="text-2xl">⏹</span>
              </button>
            )}
            <p className="mt-4 text-sm text-marino/70">
              {grabando ? "Grabando... toca para detener" : estado === "enviando" ? "Procesando..." : "Toca y describe tu captura"}
            </p>
            <p className="mt-1 text-xs text-marino/50">
              Ej: "traje dos congrios de tres kilos cada uno"
            </p>
          </div>
        )}

        {/* FOTO */}
        {tab === "foto" && (
          <div className="text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) enviarFoto(file);
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={estado === "enviando"}
              className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-agua text-white shadow-lg transition hover:bg-agua-claro disabled:opacity-50"
            >
              <span className="text-3xl">📸</span>
            </button>
            <p className="mt-4 text-sm text-marino/70">
              {estado === "enviando" ? "Analizando foto..." : "Saca una foto de tu captura"}
            </p>
            <p className="mt-1 text-xs text-marino/50">
              La IA identifica especie y estima peso automáticamente
            </p>
          </div>
        )}

        {/* MANUAL */}
        {tab === "manual" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-marino/70">Especie</label>
              <select
                value={especieManual}
                onChange={(e) => setEspecieManual(e.target.value)}
                className="mt-1 w-full rounded-xl border border-marino/15 bg-white px-4 py-3"
              >
                {ESPECIES.map((e) => (
                  <option key={e} value={e} className="capitalize">{e}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-marino/70">Cantidad</label>
                <input
                  type="number"
                  min={1}
                  value={cantidadManual}
                  onChange={(e) => setCantidadManual(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-marino/15 bg-white px-4 py-3"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-marino/70">Peso (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={pesoManual}
                  onChange={(e) => setPesoManual(e.target.value)}
                  placeholder="3.5"
                  className="mt-1 w-full rounded-xl border border-marino/15 bg-white px-4 py-3"
                />
              </div>
            </div>
            <button
              onClick={enviarManual}
              disabled={!pesoManual || estado === "enviando"}
              className="w-full rounded-xl bg-agua px-4 py-3 font-semibold text-white transition hover:bg-agua-claro disabled:opacity-50"
            >
              {estado === "enviando" ? "Guardando..." : "Registrar"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-cobre/10 p-3 text-sm text-cobre">
          {error}
        </div>
      )}
    </div>
  );
}

function Dato({ label, valor, capitalize }: { label: string; valor: string | number; capitalize?: boolean }) {
  return (
    <div className="flex justify-between border-b border-marino/10 pb-2">
      <span className="text-sm text-marino/60">{label}</span>
      <span className={`font-semibold ${capitalize ? "capitalize" : ""}`}>{valor}</span>
    </div>
  );
}
