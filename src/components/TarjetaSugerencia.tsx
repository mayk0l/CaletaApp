import { formatearHoras, formatearPesos } from "@/lib/pricing";
import type { SugerenciaMatch } from "@/lib/matching";
import { accionTomarSugerencia } from "@/app/restaurante/actions";

/**
 * Sugerencia con el desglose del score a la vista. Mostrar cómo se calculó es
 * parte del argumento: no es una caja negra, son reglas que el usuario puede
 * discutir. Ver docs/05-api-contratos.md
 */
export function TarjetaSugerencia({
  pedidoId,
  sugerencia,
  destacada,
}: {
  pedidoId: string;
  sugerencia: SugerenciaMatch;
  destacada: boolean;
}) {
  return (
    <li
      className={`rounded-2xl bg-white p-4 ring-1 ${
        destacada ? "ring-2 ring-agua" : "ring-marino/10"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold capitalize">
            {sugerencia.especie} · {sugerencia.pesoKg} kg
          </p>
          <p className="text-sm text-marino/60">
            {formatearPesos(sugerencia.precioActualKg)}/kg ·{" "}
            {formatearHoras(sugerencia.horasPublicado)} publicado
          </p>
        </div>

        <div className="text-right">
          {destacada && (
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-agua">
              Mejor sugerencia
            </span>
          )}
          <span className="text-2xl font-bold text-marino">{sugerencia.score}</span>
          <span className="text-sm text-marino/50">/100</span>
        </div>
      </div>

      <p className="mt-2 text-sm text-marino/70">{sugerencia.motivo}</p>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-marino/60 hover:text-marino">
          Cómo se calculó
        </summary>
        <ul className="mt-2 space-y-1.5">
          {sugerencia.factores.map((f) => (
            <li key={f.id} className="text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-marino/70">{f.etiqueta}</span>
                <span className="font-medium tabular-nums">
                  {f.puntos}/{f.maximo}
                </span>
              </div>
              <div
                className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-marino/10"
                role="img"
                aria-label={`${f.etiqueta}: ${f.puntos} de ${f.maximo} puntos`}
              >
                <div
                  className="h-full rounded-full bg-agua"
                  style={{ width: `${Math.round((f.puntos / f.maximo) * 100)}%` }}
                />
              </div>
              <p className="mt-0.5 text-xs text-marino/50">{f.detalle}</p>
            </li>
          ))}
        </ul>
      </details>

      <form action={accionTomarSugerencia} className="mt-4">
        <input type="hidden" name="pedidoId" value={pedidoId} />
        <input type="hidden" name="productoId" value={sugerencia.productoId} />
        <button
          type="submit"
          className="w-full rounded-xl bg-marino px-4 py-2.5 text-sm font-semibold text-crema transition hover:bg-marino/90 sm:w-auto"
        >
          Tomar esta sugerencia
        </button>
      </form>
    </li>
  );
}
