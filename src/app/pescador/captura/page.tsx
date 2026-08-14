"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AyudaFoto } from "@/components/AyudaFoto";
import { PasosFlujo } from "@/components/PasosFlujo";
import { PESCADOR_DEMO } from "@/lib/mocks";
import { ESPECIES, UMBRAL_CONFIANZA, type ApiResponse, type CapturaResponse } from "@/lib/types";

type Pestaña = "voz" | "foto" | "manual";

/**
 * Ver docs/07-diseno-ui.md y docs/05-api-contratos.md
 */
export default function CapturaPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Pestaña>("voz");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<CapturaResponse | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Voz
  const [grabando, setGrabando] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // -- Captura por voz --
  async function iniciarGrabacion() {
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
    }
  }

  function detenerGrabacion() {
    mediaRecorderRef.current?.stop();
    setGrabando(false);
  }

  async function enviarVoz(blob: Blob) {
    setCargando(true);
    setError(null);
    setResultado(null);
    try {
      const form = new FormData();
      form.append("audio", blob, "grabacion.webm");
      form.append("pescadorId", PESCADOR_DEMO.id);
      const resp = await fetch("/api/capturas/voz", { method: "POST", body: form });
      const json: ApiResponse<CapturaResponse> = await resp.json();
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setResultado(json.data);
    } catch {
      setError("No se pudo conectar con el servidor. Probá de nuevo o regístralo manual.");
    } finally {
      setCargando(false);
    }
  }

  async function manejarFoto(archivo: File) {
    setCargando(true);
    setError(null);
    setResultado(null);
    try {
      const form = new FormData();
      form.append("foto", archivo);
      form.append("pescadorId", PESCADOR_DEMO.id);
      const resp = await fetch("/api/capturas/imagen", { method: "POST", body: form });
      const json: ApiResponse<CapturaResponse> = await resp.json();
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setResultado(json.data);
    } catch {
      setError("No se pudo conectar con el servidor. Probá de nuevo o regístralo manual.");
    } finally {
      setCargando(false);
    }
  }

  function confirmarYContinuar() {
    if (!resultado) return;
    router.push(`/pescador/formulario/${resultado.capturaId}`);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-10">
      <PasosFlujo actual={1} />
      <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
        ¿Qué trajiste?
      </h1>
      <p className="mt-2 text-marino/70">
        Dilo en voz alta, sácale una foto o escríbelo. Después revisas y corriges.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <TabButton activo={tab === "foto"} onClick={() => setTab("foto")} titulo="Foto" detalle="Sacar una foto" />
        <TabButton activo={tab === "voz"} onClick={() => setTab("voz")} titulo="Voz" detalle="Describirla" />
        <TabButton
          activo={tab === "manual"}
          onClick={() => setTab("manual")}
          titulo="Manual"
          detalle="Escribirla"
        />
      </div>

      {tab === "voz" && (
        <div className="mt-6 text-center">
          {!grabando ? (
            <button
              type="button"
              onClick={iniciarGrabacion}
              disabled={cargando}
              className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-agua text-marino shadow-lg transition hover:bg-agua-claro disabled:opacity-50"
            >
              <span className="text-3xl">🎤</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={detenerGrabacion}
              className="mx-auto flex h-24 w-24 animate-pulse items-center justify-center rounded-full bg-cobre text-white shadow-lg"
            >
              <span className="text-2xl">⏹</span>
            </button>
          )}
          <p className="mt-4 text-sm text-marino/70">
            {grabando ? "Grabando... toca para detener" : cargando ? "Procesando..." : "Toca y describe tu captura"}
          </p>
          <p className="mt-1 text-xs text-marino/50">
            {`Ej: "traje dos congrios de tres kilos cada uno"`}
          </p>
        </div>
      )}

      {tab === "foto" && (
        <div className="mt-6">
          <AyudaFoto />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const archivo = e.target.files?.[0];
              if (archivo) manejarFoto(archivo);
            }}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const archivo = e.target.files?.[0];
              if (archivo) manejarFoto(archivo);
            }}
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={cargando}
              className="flex-1 rounded-2xl bg-agua px-6 py-10 text-center text-lg font-semibold text-marino shadow-sm transition hover:bg-agua-claro disabled:opacity-60"
            >
              {cargando ? "Reconociendo…" : "📷 Tomar foto"}
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={cargando}
              className="flex-1 rounded-2xl bg-white px-6 py-10 text-center text-lg font-semibold text-marino shadow-sm ring-1 ring-marino/10 transition hover:ring-marino/30 disabled:opacity-60"
            >
              🖼️ Galería
            </button>
          </div>
        </div>
      )}

      {tab === "manual" && <FormularioManual onListo={setResultado} />}

      {error && (
        <p className="mt-4 rounded-xl bg-cobre/10 p-4 text-sm text-cobre" role="alert">
          {error}
        </p>
      )}

      {resultado && (
        <ResultadoReconocimiento
          resultado={resultado}
          onConfirmar={confirmarYContinuar}
        />
      )}
    </div>
  );
}

function TabButton({
  activo,
  disabled,
  onClick,
  titulo,
  detalle,
}: {
  activo: boolean;
  disabled?: boolean;
  onClick?: () => void;
  titulo: string;
  detalle: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl p-4 text-left ring-1 transition ${
        activo
          ? "bg-marino text-white ring-marino"
          : "bg-white ring-marino/10 hover:ring-marino/30"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <h2 className="font-semibold">{titulo}</h2>
      <p className={`mt-1 text-sm ${activo ? "text-white/70" : "text-marino/60"}`}>
        {detalle}
      </p>
    </button>
  );
}

function ResultadoReconocimiento({
  resultado,
  onConfirmar,
}: {
  resultado: CapturaResponse;
  onConfirmar: () => void;
}) {
  const { reconocimiento } = resultado;
  const confianzaBaja = reconocimiento.confianza < UMBRAL_CONFIANZA;
  const pct = Math.round(reconocimiento.confianza * 100);

  const espInicial = reconocimiento.especie;
  const esOtraInicial = !(ESPECIES as readonly string[]).includes(espInicial) && espInicial !== "desconocida";

  const [especie, setEspecie] = useState<string>(esOtraInicial ? "otra" : espInicial);
  const [especieEsOtra, setEspecieEsOtra] = useState(esOtraInicial);
  const [especieOtra, setEspecieOtra] = useState(esOtraInicial ? espInicial : "");
  const [cantidad, setCantidad] = useState(String(reconocimiento.cantidad ?? 1));
  const [pesoKg, setPesoKg] = useState(String(reconocimiento.pesoKgEstimado ?? ""));
  const [largoCm, setLargoCm] = useState(
    reconocimiento.largoCmEstimado != null ? String(reconocimiento.largoCmEstimado) : "",
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function continuar() {
    setGuardando(true);
    setError(null);
    try {
      const especieFinal = especieEsOtra ? especieOtra : especie;
      const res = await fetch(`/api/capturas/${resultado.capturaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          especie: especieFinal,
          cantidad: parseInt(cantidad) || 1,
          pesoKg: parseFloat(pesoKg) || 0,
          largoCm: largoCm ? parseFloat(largoCm) : null,
        }),
      });
      const json: ApiResponse<{ capturaId: string }> = await res.json();
      if (!json.ok) throw new Error(json.error.message);
      onConfirmar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    }
    setGuardando(false);
  }

  return (
    <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-marino/10">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-marino/50">
        Resultado — revisa y corrige si es necesario
      </h2>

      <div className="mt-3 space-y-3">
        <div>
          <label className="text-sm font-medium text-marino/70">Especie</label>
          <select
            value={especie}
            onChange={(e) => {
              const v = e.target.value;
              setEspecie(v);
              setEspecieEsOtra(v === "otra");
            }}
            className="mt-1 w-full rounded-lg border border-marino/20 px-3 py-2 capitalize"
          >
            {ESPECIES.map((e) => (
              <option key={e} value={e} className="capitalize">{e}</option>
            ))}
            <option value="desconocida">desconocida</option>
            <option value="otra">Otra...</option>
          </select>
          {especieEsOtra && (
            <input
              type="text"
              value={especieOtra}
              onChange={(e) => setEspecieOtra(e.target.value)}
              placeholder="Nombre de la especie"
              className="mt-2 w-full rounded-lg border border-marino/20 px-3 py-2"
            />
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-marino/70">Cantidad</label>
            <input
              type="number"
              min={1}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className="mt-1 w-full rounded-lg border border-marino/20 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-marino/70">Peso (kg)</label>
            <input
              type="number"
              step="0.1"
              value={pesoKg}
              onChange={(e) => setPesoKg(e.target.value)}
              className="mt-1 w-full rounded-lg border border-marino/20 px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-marino/70">Largo (cm)</label>
          <input
            type="number"
            step="0.1"
            value={largoCm}
            onChange={(e) => setLargoCm(e.target.value)}
            placeholder="Opcional"
            className="mt-1 w-full rounded-lg border border-marino/20 px-3 py-2"
          />
        </div>
      </div>

      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-marino/10">
          <div
            className={`h-full ${confianzaBaja ? "bg-cobre" : "bg-agua"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-marino/60" aria-live="polite">
          Confianza de la IA: {pct}%
          {confianzaBaja ? " — revisa los datos antes de continuar." : ""}
        </p>
      </div>

      {reconocimiento.notas && (
        <p className="mt-2 text-xs text-marino/50">{reconocimiento.notas}</p>
      )}

      {error && <p className="mt-2 text-sm text-cobre">{error}</p>}

      <button
        type="button"
        onClick={continuar}
        disabled={guardando}
        className="mt-5 w-full rounded-xl bg-marino px-6 py-3 font-semibold text-white transition hover:bg-marino-claro disabled:opacity-60"
      >
        {guardando ? "Guardando…" : "Continuar al formulario"}
      </button>
    </div>
  );
}

function FormularioManual({
  onListo,
}: {
  onListo: (r: CapturaResponse) => void;
}) {
  const [especie, setEspecie] = useState<string>(ESPECIES[0]);
  const [especieOtra, setEspecieOtra] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [pesoKg, setPesoKg] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      const especieFinal = especie === "otra" ? especieOtra : especie;
      const resp = await fetch("/api/capturas/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pescadorId: PESCADOR_DEMO.id, especie: especieFinal, cantidad, pesoKg }),
      });
      const json: ApiResponse<CapturaResponse> = await resp.json();
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      onListo(json.data);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-6 space-y-4 rounded-2xl bg-white p-5 ring-1 ring-marino/10">
      <label className="block">
        <span className="text-sm font-medium text-marino/70">Especie</span>
        <select
          value={especie}
          onChange={(e) => setEspecie(e.target.value)}
          className="mt-1 w-full rounded-lg border border-marino/20 px-3 py-2 capitalize"
        >
          {ESPECIES.map((e) => (
            <option key={e} value={e} className="capitalize">
              {e}
            </option>
          ))}
          <option value="otra">Otra...</option>
        </select>
      </label>
      {especie === "otra" && (
        <input
          type="text"
          value={especieOtra}
          onChange={(e) => setEspecieOtra(e.target.value)}
          placeholder="Nombre de la especie"
          className="w-full rounded-lg border border-marino/20 px-3 py-2"
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-marino/70">Cantidad</span>
          <input
            type="number"
            min={1}
            value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-marino/20 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-marino/70">Peso (kg)</span>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={pesoKg}
            onChange={(e) => setPesoKg(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-marino/20 px-3 py-2"
          />
        </label>
      </div>

      {error && <p className="text-sm text-cobre">{error}</p>}

      <button
        type="button"
        onClick={enviar}
        disabled={enviando || (especie === "otra" && !especieOtra)}
        className="w-full rounded-xl bg-marino px-6 py-3 font-semibold text-white transition hover:bg-marino-claro disabled:opacity-60"
      >
        {enviando ? "Registrando…" : "Registrar captura"}
      </button>
    </div>
  );
}
