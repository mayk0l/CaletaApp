import Link from "next/link";

const ACCESOS = [
  {
    href: "/pescador/captura",
    titulo: "Soy pescador",
    detalle: "Registro por voz o foto. La trazabilidad se llena sola.",
    icono: "🎣",
    color: "bg-agua",
  },
  {
    href: "/marketplace",
    titulo: "Marketplace",
    detalle: "Pesca fresca con precio que baja antes de ser merma.",
    icono: "🐟",
    color: "bg-cobre",
  },
  {
    href: "/restaurante",
    titulo: "Soy restaurante",
    detalle: "Compra directo a la caleta, con trazabilidad certificada.",
    icono: "🍽️",
    color: "bg-marino-claro",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-20">
      <h1 className="text-4xl font-bold leading-tight sm:text-6xl">
        El pescado que no se vende{" "}
        <span className="text-cobre">se pierde.</span>
      </h1>

      <p className="mt-4 max-w-2xl text-lg text-marino/70">
        CaletaApp registra la captura con IA, completa la trazabilidad de SERNAPESCA
        y publica el producto en un marketplace donde el precio baja solo
        <strong> antes</strong> de convertirse en merma.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {ACCESOS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-marino/10 transition hover:shadow-md hover:-translate-y-0.5"
          >
            <span
              aria-hidden
              className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${a.color}/15`}
            >
              {a.icono}
            </span>
            <h2 className="text-lg font-semibold">{a.titulo}</h2>
            <p className="mt-1 text-sm text-marino/60">{a.detalle}</p>
            <span className="mt-3 inline-block text-sm font-semibold text-agua opacity-0 transition group-hover:opacity-100">
              Entrar →
            </span>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-xs text-marino/50">
        Prototipo Ocean Lab Hackathon 2026 · LimacheWaves · Caleta Portales, Valparaíso
      </p>
    </div>
  );
}
