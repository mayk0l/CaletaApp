/**
 * Rótulo de honestidad. Se usa en todo lo simulado: envío a SERNAPESCA,
 * señales de clima/temporada, login. La rúbrica premia declararlo, no esconderlo.
 * Ver docs/02-producto-alcance.md
 */
export function BadgeSimulado({ texto = "simulado" }: { texto?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-marino/10 px-2 py-0.5 text-xs font-medium text-marino/70">
      <span aria-hidden>●</span>
      {texto}
    </span>
  );
}
