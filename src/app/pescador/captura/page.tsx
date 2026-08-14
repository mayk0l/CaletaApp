"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PESCADOR_DEMO } from "@/lib/mocks";
import { ESPECIES, UMBRAL_CONFIANZA, type ApiResponse, type CapturaResponse } from "@/lib/types";

type Pestaña = "foto" | "manual";

/**
 * Ver docs/07-diseno-ui.md y docs/05-api-contratos.md
 * Voz queda fuera del alcance de esta noche (docs/09-plan-noche.md): la pestaña
 * se muestra deshabilitada, no se oculta, para que quede claro que fue una
 * decisión de alcance y no un olvido.
 */
export default function CapturaPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Pestaña>("foto");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<CapturaResponse | null>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);

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

  async function confirmarYContinuar() {
    if (!resultado) return;
    router.push(`/pescador/formulario/${resultado.capturaId}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Registrar captura</h1>
      <p className="mt-2 text-marino/70">
        Elige cómo registrarla. La IA identifica la especie y estima el peso; tú confirmas.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <TabButton activo={tab === "foto"} onClick={() => setTab("foto")} titulo="Foto" detalle="Sacar una foto" />
        <TabButton activo={false} disabled titulo="Voz" detalle="Próximamente" />
        <TabButton
          activo={tab === "manual"}
          onClick={() => setTab("manual")}
          titulo="Manual"
          detalle="Escribirla"
        />
      </div>

      {tab === "foto" && (
        <div className="mt-6">
          <input
            ref={inputFotoRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const archivo = e.target.files?.[0];
              if (archivo) manejarFoto(archivo);
            }}
          />
          <button
            type="button"
            onClick={() => inputFotoRef.current?.click()}
            disabled={cargando}
            className="w-full rounded-2xl bg-agua px-6 py-10 text-center text-lg font-semibold text-marino shadow-sm transition hover:bg-agua-claro disabled:opacity-60"
          >
            {cargando ? "Reconociendo captura…" : "Tomar o subir foto"}
          </button>
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

  return (
    <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-marino/10">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-marino/50">
        Resultado
      </h2>

      <p className="mt-2 text-lg font-semibold capitalize">
        {reconocimiento.especie === "desconocida" ? "No identificado" : reconocimiento.especie}
      </p>
      <p className="text-sm text-marino/70">
        {reconocimiento.cantidad} unidad(es) · {reconocimiento.pesoKgEstimado} kg
        {reconocimiento.largoCmEstimado ? ` · ${reconocimiento.largoCmEstimado} cm` : ""}
      </p>

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

      <button
        type="button"
        onClick={onConfirmar}
        className="mt-5 w-full rounded-xl bg-marino px-6 py-3 font-semibold text-white transition hover:bg-marino-claro"
      >
        {confianzaBaja ? "Revisar y continuar" : "Continuar al formulario"}
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
  const [cantidad, setCantidad] = useState(1);
  const [pesoKg, setPesoKg] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      const resp = await fetch("/api/capturas/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pescadorId: PESCADOR_DEMO.id, especie, cantidad, pesoKg }),
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
          className="mt-1 w-full rounded-lg border border-marino/20 px-3 py-2"
        >
          {ESPECIES.map((e) => (
            <option key={e} value={e} className="capitalize">
              {e}
            </option>
          ))}
        </select>
      </label>

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
        disabled={enviando}
        className="w-full rounded-xl bg-marino px-6 py-3 font-semibold text-white transition hover:bg-marino-claro disabled:opacity-60"
      >
        {enviando ? "Registrando…" : "Registrar captura"}
      </button>
    </div>
  );
}
