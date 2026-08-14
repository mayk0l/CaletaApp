import { formatearHoras, formatearPesos } from "@/lib/pricing";
import type { Tendencia } from "@/lib/types";

/**
 * LA imagen del pitch: precio inicial tachado → precio actual + descuento + razón.
 * Que se vea grande. Ver docs/11-riesgos-y-demo.md (guion de la demo, paso 6).
 */
export function PrecioDinamico({
  precioInicialKg,
  precioActualKg,
  descuentoPct,
  tendencia,
  justificacion,
  horasHastaProximoTramo,
  proximoDescuentoPct,
}: {
  precioInicialKg: number;
  precioActualKg: number;
  descuentoPct: number;
  tendencia?: Tendencia;
  justificacion?: string;
  horasHastaProximoTramo?: number | null;
  proximoDescuentoPct?: number | null;
}) {
  const conDescuento = descuentoPct > 0;

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {conDescuento && (
          <span className="text-sm text-marino/50 line-through">
            {formatearPesos(precioInicialKg)}
          </span>
        )}
        <span
          className={`text-2xl font-bold ${conDescuento ? "text-cobre" : "text-marino"}`}
        >
          {formatearPesos(precioActualKg)}
        </span>
        <span className="text-sm text-marino/60">/kg</span>

        {conDescuento && (
          <span className="rounded-full bg-cobre/15 px-2 py-0.5 text-sm font-semibold text-cobre">
            −{descuentoPct}%
          </span>
        )}
        {tendencia && <TendenciaBadge tendencia={tendencia} />}
      </div>

      {justificacion && (
        <p className="mt-2 text-sm text-marino/70" aria-live="polite">
          {justificacion}
        </p>
      )}

      {horasHastaProximoTramo != null && proximoDescuentoPct != null && (
        <p className="mt-1 text-xs font-medium text-cobre">
          Baja a −{proximoDescuentoPct}% en {formatearHoras(horasHastaProximoTramo)}
        </p>
      )}
    </div>
  );
}

const ESTILO_TENDENCIA: Record<Tendencia, { clase: string; icono: string }> = {
  alcista: { clase: "bg-agua/15 text-agua", icono: "▲" },
  bajista: { clase: "bg-cobre/15 text-cobre", icono: "▼" },
  estable: { clase: "bg-marino/10 text-marino/70", icono: "=" },
};

function TendenciaBadge({ tendencia }: { tendencia: Tendencia }) {
  const { clase, icono } = ESTILO_TENDENCIA[tendencia];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${clase}`}>
      <span aria-hidden>{icono}</span> {tendencia}
    </span>
  );
}
