"use client";

import { useEffect, useState } from "react";
import { BadgeSimulado } from "@/components/BadgeSimulado";
import { formatearPesos } from "@/lib/pricing";
import type { SugerenciaPrecio } from "@/lib/sugerencia-precio";
import type { ApiResponse } from "@/lib/types";

/**
 * Indicador de precio del producto. Aparece SOLO, sin que el pescador pregunte.
 *
 * Cómo se reparte el trabajo para que sea instantáneo:
 * - La sugerencia y su desglose llegan ya calculados desde
 *   GET /api/sugerencias-precio (capa determinista, sin red, sin cuota), así que
 *   se pintan en el primer render.
 * - La redacción del LLM se pide sola solo si `explicarConIa` es true, que la
 *   lista reserva para el producto que más lo necesita. Pedirla para todos serían
 *   5 llamadas de 3 a 6 s al cargar la página y cuota quemada (docs/12 §7).
 *
 * Nada de esto escribe precios: el botón solo carga el valor en el campo.
 */
type SugerenciaConIa = SugerenciaPrecio & { modeloIa?: string };

export function SugerenciaPrecioPanel({
  productoId,
  sugerencia,
  explicarConIa = false,
  onUsarPrecio,
}: {
  productoId: string;
  sugerencia: SugerenciaConIa;
  explicarConIa?: boolean;
  onUsarPrecio: (precioKg: number) => void;
}) {
  // La explicación del modelo es lo único que vive en estado. El resto se deriva:
  // espejar la prop en estado obliga a un efecto que sincroniza, y la regla
  // react-hooks/set-state-in-effect lo prohíbe con razón.
  const [explicacion, setExplicacion] = useState<SugerenciaConIa | null>(null);
  const [falloIa, setFalloIa] = useState(false);

  const datos = explicacion ?? sugerencia;
  const pidiendoIa = explicarConIa && explicacion === null && !falloIa;

  useEffect(() => {
    if (!explicarConIa) return;
    let cancelado = false;

    fetch(`/api/marketplace/${productoId}/sugerencia`)
      .then((r) => r.json())
      .then((json: ApiResponse<SugerenciaConIa>) => {
        if (cancelado) return;
        if (json.ok) setExplicacion(json.data);
        else setFalloIa(true);
      })
      .catch(() => {
        // Se queda la explicación por regla, que ya está en pantalla.
        if (!cancelado) setFalloIa(true);
      });

    return () => {
      cancelado = true;
    };
  }, [explicarConIa, productoId]);

  const sube = datos.diferenciaKg > 0;
  const baja = datos.diferenciaKg < 0;
  const igual = datos.diferenciaKg === 0;

  return (
    <div className={`rounded-xl p-4 ${baja ? "bg-cobre/10" : "bg-agua/10"}`}>
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
          {datos.riesgoMerma && (
            <span className="rounded-full bg-cobre px-2 py-0.5 text-xs font-semibold text-white">
              Riesgo de merma
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

      <p className="mt-2 text-sm text-marino/80" aria-live="polite">
        {datos.justificacion}
        {pidiendoIa && (
          <span className="ml-1 text-marino/50">· afinando la explicación…</span>
        )}
      </p>

      {sube && (
        <p className="mt-2 text-sm text-marino/70">
          Estás vendiendo a {formatearPesos(datos.precioActualKg)}/kg, por debajo de lo
          que las señales de hoy justifican.
        </p>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-marino/60 hover:text-marino">
          De dónde sale esto
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
            ? "El número y la explicación los calculan las reglas."
            : `Las reglas deciden el número; ${datos.modeloIa ?? "el modelo"} solo redactó la frase.`}
        </p>
      </details>

      {!igual && (
        <button
          type="button"
          onClick={() => onUsarPrecio(datos.precioSugeridoKg)}
          className="mt-3 rounded-xl bg-agua px-4 py-2 text-sm font-semibold text-marino transition hover:bg-agua-claro"
        >
          Usar este precio
        </button>
      )}
    </div>
  );
}
