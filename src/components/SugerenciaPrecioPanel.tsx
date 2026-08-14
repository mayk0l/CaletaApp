"use client";

import { useState } from "react";
import { BadgeSimulado } from "@/components/BadgeSimulado";
import { formatearPesos } from "@/lib/pricing";
import type { SugerenciaPrecio } from "@/lib/sugerencia-precio";
import type { ApiResponse } from "@/lib/types";

/**
 * Sugerencia de precio para no perder la captura por merma.
 *
 * Es una sugerencia, no un cambio: el endpoint no escribe nada y el botón solo
 * carga el precio propuesto en el campo de edición, para que el pescador decida.
 *
 * Se muestra el desglose porque una recomendación de precio que no explica de
 * dónde sale no se sigue. Ver docs/05-api-contratos.md
 */
type SugerenciaConIa = SugerenciaPrecio & { modeloIa?: string };

export function SugerenciaPrecioPanel({
  productoId,
  onUsarPrecio,
}: {
  productoId: string;
  onUsarPrecio: (precioKg: number) => void;
}) {
  const [datos, setDatos] = useState<SugerenciaConIa | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function consultar() {
    setCargando(true);
    setError(null);
    try {
      const resp = await fetch(`/api/marketplace/${productoId}/sugerencia`);
      const json: ApiResponse<SugerenciaConIa> = await resp.json();
      if (!json.ok) {
        setError(json.error.message);
        return;
      }
      setDatos(json.data);
    } catch {
      setError("No se pudo calcular la sugerencia. Inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  if (!datos) {
    return (
      <div>
        <button
          type="button"
          onClick={consultar}
          disabled={cargando}
          className="rounded-xl bg-marino px-4 py-2 text-sm font-semibold text-crema transition hover:bg-marino-claro disabled:opacity-60"
        >
          {cargando ? "Revisando señales…" : "¿Me conviene bajar el precio?"}
        </button>
        {error && (
          <p role="alert" className="mt-2 text-sm text-cobre">
            {error}
          </p>
        )}
      </div>
    );
  }

  // La comparación que le importa al pescador es contra lo que tiene publicado
  // hoy, no contra el precio base. Si la tabla antigua ya bajó de más, la
  // sugerencia puede ser SUBIR, y decir "bajar" ahí sería mentir.
  const sube = datos.diferenciaKg > 0;
  const baja = datos.diferenciaKg < 0;
  const igual = datos.diferenciaKg === 0;

  return (
    <div
      className={`rounded-xl p-4 ${baja ? "bg-cobre/10" : "bg-agua/10"}`}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-marino">
          {igual ? (
            <>El precio que tienes es el adecuado</>
          ) : (
            <>
              {baja ? "Conviene bajar a " : "Puedes subir a "}
              <span className="tabular-nums">
                {formatearPesos(datos.precioSugeridoKg)}
              </span>
              /kg
            </>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {datos.reduccionPct > 0 && (
            <span className="rounded-full bg-cobre/20 px-2 py-0.5 text-sm font-semibold tabular-nums text-cobre">
              −{datos.reduccionPct}% del base
            </span>
          )}
          {!igual && (
            <span
              className={`text-sm font-semibold tabular-nums ${
                baja ? "text-cobre" : "text-agua"
              }`}
            >
              {sube ? "+" : ""}
              {formatearPesos(datos.diferenciaKg)} vs lo publicado
            </span>
          )}
        </div>
      </div>

      <p className="mt-2 text-sm text-marino/80">{datos.justificacion}</p>

      {sube && (
        <p className="mt-2 text-sm text-marino/70">
          Estás vendiendo más barato de lo que las señales justifican: tu{" "}
          {formatearPesos(datos.precioActualKg)}/kg quedó por debajo de lo que el mercado
          aguanta hoy.
        </p>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-marino/60 hover:text-marino">
          De dónde sale esta sugerencia
        </summary>
        <ul className="mt-2 space-y-2">
          {datos.factores.map((f) => (
            <li key={f.id} className="text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-marino/80">{f.etiqueta}</span>
                <span
                  className={`shrink-0 tabular-nums font-semibold ${
                    f.puntosPct > 0 ? "text-cobre" : "text-agua"
                  }`}
                >
                  {f.puntosPct > 0 ? "+" : ""}
                  {f.puntosPct} pp
                </span>
              </div>
              <p className="text-marino/60">{f.detalle}</p>
              {f.senal && (
                <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-marino/50">
                  Señal: {f.senal}
                  {f.simulada && <BadgeSimulado texto="simulada" />}
                </p>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-marino/50">
          Los puntos porcentuales se suman sobre el precio base de{" "}
          {formatearPesos(datos.precioBaseKg)}/kg, con techo de 40%.{" "}
          {datos.degradado
            ? "Explicación generada por regla (la IA no respondió)."
            : `Explicación redactada por ${datos.modeloIa ?? "el modelo"}; el número lo deciden las reglas.`}
        </p>
      </details>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {!igual && (
          <button
            type="button"
            onClick={() => onUsarPrecio(datos.precioSugeridoKg)}
            className="rounded-xl bg-agua px-4 py-2 text-sm font-semibold text-marino transition hover:bg-agua-claro"
          >
            Usar este precio
          </button>
        )}
        <button
          type="button"
          onClick={consultar}
          disabled={cargando}
          className="text-sm text-marino/60 underline underline-offset-2 transition hover:text-marino disabled:opacity-60"
        >
          {cargando ? "Revisando…" : "Volver a revisar"}
        </button>
      </div>
    </div>
  );
}
