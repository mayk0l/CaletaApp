/**
 * Indicador de progreso del flujo del pescador.
 *
 * Hoy se pasa de captura a formulario a publicado sin ninguna señal de dónde
 * estás ni cuánto falta, y eso es lo que más produce la sensación de estar
 * perdido en un flujo de 3 pantallas. Ver docs/07-diseno-ui.md
 *
 * Semántica: lista ordenada con aria-current="step", que es lo que anuncian los
 * lectores de pantalla. Los números no son decorativos, así que no van aria-hidden.
 */
const PASOS = ["Registrar", "Confirmar", "Publicado"] as const;

export function PasosFlujo({ actual }: { actual: 1 | 2 | 3 }) {
  return (
    <nav aria-label={`Paso ${actual} de ${PASOS.length}`}>
      <ol className="flex items-center gap-2 text-sm">
        {PASOS.map((paso, i) => {
          const numero = i + 1;
          const activo = numero === actual;
          const completado = numero < actual;

          return (
            <li key={paso} className="flex min-w-0 items-center gap-2">
              <span
                aria-current={activo ? "step" : undefined}
                className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 ${
                  activo
                    ? "bg-marino text-crema"
                    : completado
                      ? "text-agua"
                      : "text-marino/40"
                }`}
              >
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    activo
                      ? "bg-agua text-marino"
                      : completado
                        ? "bg-agua/20 text-agua"
                        : "bg-marino/10 text-marino/50"
                  }`}
                >
                  {completado ? "✓" : numero}
                </span>
                <span className={activo ? "font-semibold" : ""}>{paso}</span>
              </span>

              {numero < PASOS.length && (
                <span
                  aria-hidden
                  className={`h-px w-4 sm:w-8 ${
                    completado ? "bg-agua/40" : "bg-marino/15"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
