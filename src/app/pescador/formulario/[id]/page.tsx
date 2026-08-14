"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeSimulado } from "@/components/BadgeSimulado";
import { PageShell, SeccionTitulo } from "@/components/PageShell";
import { Skeleton } from "@/components/Skeleton";
import type {
  ApiResponse,
  CamposFijos,
  CamposVariables,
  EnvioResponse,
  FormularioResponse,
} from "@/lib/types";

/**
 * Ver docs/05-api-contratos.md. Trae el formulario real, permite confirmarlo
 * y al enviar redirige al marketplace donde el producto ya quedó publicado.
 *
 * ⚠️ Los campos son una aproximación: falta el screenshot del formulario real
 *    de SERNAPESCA (no está en contexto/). Ver docs/07-diseno-ui.md
 */
export default function FormularioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: capturaId } = use(params);
  const router = useRouter();
  const [datos, setDatos] = useState<FormularioResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folio, setFolio] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/formulario/${capturaId}`)
      .then((r) => r.json())
      .then((json: ApiResponse<FormularioResponse>) => {
        if (cancelado) return;
        if (!json.ok) {
          setError(json.error.message);
          return;
        }
        setDatos(json.data);
      })
      .catch(() => {
        if (!cancelado) setError("No se pudo cargar el formulario.");
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [capturaId]);

  async function validarYEnviar() {
    setEnviando(true);
    setError(null);
    try {
      const resp = await fetch(`/api/formulario/${capturaId}/enviar`, { method: "POST" });
      const json: ApiResponse<EnvioResponse> = await resp.json();
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setFolio(json.data.folioMock);
      setTimeout(() => router.push("/marketplace"), 1400);
    } catch {
      setError("No se pudo enviar. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (cargando) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="mt-3 h-4 w-full max-w-md" />
        <div className="mt-8 space-y-4" role="status" aria-busy="true" aria-live="polite">
          <span className="sr-only">Cargando el formulario de trazabilidad…</span>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-marino/10">
            <Skeleton className="h-3 w-40" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 ring-1 ring-marino/10">
            <Skeleton className="h-3 w-52" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !datos) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <p className="rounded-xl bg-cobre/10 p-4 text-sm text-cobre" role="alert">
          {error}
        </p>
      </div>
    );
  }

  if (!datos) return null;

  return (
    <PageShell
      titulo="Trazabilidad"
      descripcion="Completado automáticamente desde tu captura. Revisa y confirma."
      badge={<BadgeSimulado texto="envío simulado a SERNAPESCA" />}
    >
      {datos.advertencias.length > 0 && (
        <ul className="space-y-1 rounded-xl bg-cobre/10 p-4 text-sm text-cobre" role="alert">
          {datos.advertencias.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}

      <Seccion titulo="Datos del pescador (fijos)" datos={datos.camposFijos} />
      <Seccion titulo="Datos de la captura (autocompletados)" datos={datos.camposVariables} />

      {error && (
        <p className="mt-4 rounded-xl bg-cobre/10 p-4 text-sm text-cobre" role="alert">
          {error}
        </p>
      )}

      {folio ? (
        <div
          className="mt-6 rounded-xl bg-agua/15 p-4 text-center text-agua"
          aria-live="polite"
        >
          <p className="font-semibold">Enviado — folio {folio}</p>
          <p className="text-sm">Publicado en el marketplace. Redirigiendo…</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={validarYEnviar}
          disabled={enviando || datos.estadoEnvio === "enviado_simulado"}
          className="mt-8 w-full rounded-xl bg-agua px-6 py-4 text-lg font-semibold text-marino transition hover:bg-agua-claro disabled:opacity-60"
        >
          {enviando ? "Enviando…" : "Validar y enviar"}
        </button>
      )}
    </PageShell>
  );
}

function Seccion<T extends Record<string, string | number | undefined>>({
  titulo,
  datos,
}: {
  titulo: string;
  datos: T;
}) {
  return (
    <section className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-marino/10">
      <SeccionTitulo>{titulo}</SeccionTitulo>
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

// Nota: CamposFijos/CamposVariables ya son indexables por diseño (types.ts),
// así que Seccion funciona igual para ambos sin any.
export type { CamposFijos, CamposVariables };
