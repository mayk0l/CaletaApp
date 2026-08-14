import Link from "next/link";
import { BadgeSimulado } from "@/components/BadgeSimulado";
import { MisProductos } from "@/components/MisProductos";
import { PESCADOR_DEMO } from "@/lib/mocks";

/**
 * TODO(Rubén): historial de capturas (P1) + login mock como selector de pescador.
 * Ver docs/07-diseno-ui.md
 */
export default function PescadorPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-2">
        <p className="text-sm text-marino/60">
          {PESCADOR_DEMO.nombre} · {PESCADOR_DEMO.caleta}
        </p>
        <BadgeSimulado texto="sesión simulada" />
      </div>

      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">¿Qué trajiste hoy?</h1>

      <Link
        href="/pescador/captura"
        className="mt-6 block rounded-2xl bg-agua px-6 py-8 text-center text-xl font-semibold text-marino shadow-sm transition hover:bg-agua-claro"
      >
        Registrar captura
      </Link>

      <p className="mt-4 text-sm text-marino/60">
        Saca una foto o dícelo en voz alta. La trazabilidad se completa sola y tu pesca
        queda publicada al instante.
      </p>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-marino/50">
          Mis productos
        </h2>
        <MisProductos />
      </section>
    </div>
  );
}
