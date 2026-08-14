"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import type { FormularioResponse, EnvioResponse, ApiResponse } from "@/lib/types";
import { BadgeSimulado } from "@/components/BadgeSimulado";

export default function FormularioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [formulario, setFormulario] = useState<FormularioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState<EnvioResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/formulario/${id}`)
      .then((r) => r.json())
      .then((json: ApiResponse<FormularioResponse>) => {
        if (json.ok) setFormulario(json.data);
        else setError(json.error.message);
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setLoading(false));
  }, [id]);

  const validarYEnviar = async () => {
    setEnviando(true);
    setError("");
    try {
      const res = await fetch(`/api/formulario/${id}/enviar`, { method: "POST" });
      const json: ApiResponse<EnvioResponse> = await res.json();
      if (!json.ok) throw new Error(json.error.message);
      setEnviado(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar");
    }
    setEnviando(false);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-center">
        <div className="animate-pulse text-marino/50">Cargando formulario...</div>
      </div>
    );
  }

  if (error && !formulario) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-xl bg-cobre/10 p-4 text-cobre">{error}</div>
        <button onClick={() => router.push("/pescador/captura")} className="mt-4 text-agua hover:underline">
          ← Volver a captura
        </button>
      </div>
    );
  }

  if (!formulario) return null;

  // Pantalla de éxito tras envío
  if (enviado) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="rounded-3xl bg-white p-6 text-center shadow-lg ring-1 ring-marino/10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-agua/15">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold">Trazabilidad enviada</h1>
          <p className="mt-2 text-sm text-marino/70">
            Folio SERNAPESCA: <strong>{enviado.folioMock}</strong>
          </p>
          <div className="mt-2">
            <BadgeSimulado texto="envío simulado" />
          </div>
          <p className="mt-4 text-sm text-marino/70">
            Tu captura se publicó automáticamente en el marketplace.
          </p>
          <button
            onClick={() => router.push("/marketplace")}
            className="mt-6 w-full rounded-xl bg-agua px-4 py-3 font-semibold text-white transition hover:bg-agua-claro"
          >
            Ver en marketplace →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">Trazabilidad SERNAPESCA</h1>
        <BadgeSimulado texto="envío simulado" />
      </div>
      <p className="mt-1 text-sm text-marino/70">
        Autocompletado desde tu captura. Revisa y confirma.
      </p>

      {formulario.advertencias.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-xl bg-cobre/10 p-4 text-sm text-cobre">
          {formulario.advertencias.map((a) => (
            <li key={a}>⚠️ {a}</li>
          ))}
        </ul>
      )}

      <Seccion titulo="Datos del pescador" datos={formulario.camposFijos} />
      <Seccion titulo="Datos de la captura" datos={formulario.camposVariables} />

      {error && (
        <div className="mt-4 rounded-xl bg-cobre/10 p-3 text-sm text-cobre">{error}</div>
      )}

      <button
        onClick={validarYEnviar}
        disabled={enviando}
        className="mt-6 w-full rounded-xl bg-agua px-6 py-4 text-lg font-semibold text-white transition hover:bg-agua-claro disabled:opacity-50"
      >
        {enviando ? "Enviando..." : "Validar y enviar →"}
      </button>
      <p className="mt-2 text-center text-xs text-marino/50">
        Al enviar, tu captura se publica automáticamente en el marketplace.
      </p>
    </div>
  );
}

function Seccion({
  titulo,
  datos,
}: {
  titulo: string;
  datos: Record<string, string | number | undefined>;
}) {
  return (
    <section className="mt-5 rounded-2xl bg-white p-5 ring-1 ring-marino/10">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-marino/50">
        {titulo}
      </h2>
      <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {Object.entries(datos).map(([clave, valor]) => (
          <div key={clave}>
            <dt className="text-xs capitalize text-marino/50">{clave}</dt>
            <dd className="font-medium">{valor ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
