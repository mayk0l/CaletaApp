import Link from "next/link";

/**
 * Landing: el problema en una frase y tres accesos claros.
 * Ver docs/07-diseno-ui.md y docs/01-contexto-problema.md
 */
const ACCESOS = [
  {
    href: "/pescador",
    titulo: "Soy pescador",
    detalle: "Registro mi captura por foto o voz y la trazabilidad se llena sola.",
    accion: "Registrar captura",
    color: "bg-agua",
  },
  {
    href: "/marketplace",
    titulo: "Ver marketplace",
    detalle: "Pesca fresca de la caleta, con precio que baja antes de ser merma.",
    accion: "Ver la pesca del día",
    color: "bg-cobre",
  },
  {
    href: "/restaurante",
    titulo: "Soy restaurante",
    detalle: "Compro directo a la caleta, con trazabilidad certificada.",
    accion: "Programar un pedido",
    color: "bg-marino-claro",
  },
];

const CIFRAS = [
  { valor: "1.033", detalle: "embarcaciones artesanales en la Región de Valparaíso" },
  { valor: "40%", detalle: "de descuento antes de que la captura se vuelva merma" },
  { valor: "3 pasos", detalle: "desde la foto hasta la pesca publicada con trazabilidad" },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-wide text-agua">
        Caleta Portales · Región de Valparaíso
      </p>

      <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
        El pescado que no se vende a tiempo no baja de precio:
        <span className="text-cobre"> se pierde.</span>
      </h1>

      <p className="mt-5 max-w-2xl text-lg text-marino/80">
        CaletaApp registra la captura con IA, completa la trazabilidad de SERNAPESCA y
        publica el producto en un marketplace directo. Si no se vende, el precio baja
        automáticamente <strong>antes</strong> de convertirse en merma.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {ACCESOS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-marino/10 transition hover:shadow-md"
          >
            <span
              aria-hidden
              className={`mb-4 block h-1.5 w-12 rounded-full ${a.color}`}
            />
            <h2 className="text-lg font-semibold">{a.titulo}</h2>
            <p className="mt-1 flex-1 text-sm text-marino/70">{a.detalle}</p>
            <span className="mt-4 text-sm font-semibold text-agua">
              {a.accion}
              <span aria-hidden className="ml-1 inline-block transition group-hover:translate-x-0.5">
                →
              </span>
            </span>
          </Link>
        ))}
      </div>

      <dl className="mt-10 grid gap-4 border-t border-marino/10 pt-8 sm:grid-cols-3">
        {CIFRAS.map((c) => (
          <div key={c.valor}>
            <dt className="text-2xl font-bold tabular-nums text-marino">{c.valor}</dt>
            <dd className="mt-1 text-sm text-marino/60">{c.detalle}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-10 text-xs text-marino/50">
        Prototipo Ocean Lab Hackathon 2026 · equipo LimacheWaves. El envío a SERNAPESCA y
        las señales de mercado son simulados y están rotulados como tales.
      </p>
    </div>
  );
}
