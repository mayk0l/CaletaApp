import Link from "next/link";
import { BadgeSimulado } from "@/components/BadgeSimulado";
import { MisProductos } from "@/components/MisProductos";
import { OnboardingPescador } from "@/components/OnboardingPescador";
import { PageShell, SeccionTitulo } from "@/components/PageShell";
import { TourPescador } from "@/components/TourPescador";
import { PESCADOR_DEMO } from "@/lib/mocks";

/**
 * Home del pescador: un objetivo por pantalla (registrar la captura) más su
 * pesca publicada. Los `data-tour` son los anclajes del recorrido guiado
 * (src/components/TourPescador.tsx). Ver docs/07-diseno-ui.md
 */
export default function PescadorPage() {
  return (
    <PageShell
      titulo="¿Qué trajiste hoy?"
      descripcion={`${PESCADOR_DEMO.nombre} · ${PESCADOR_DEMO.caleta} · RPA ${PESCADOR_DEMO.rpaMock}`}
      badge={<BadgeSimulado texto="sesión simulada" />}
    >
      <OnboardingPescador />

      <Link
        href="/pescador/captura"
        data-tour="registrar"
        className="mt-6 flex flex-col items-center gap-1 rounded-2xl bg-agua px-6 py-8 text-center font-semibold text-marino shadow-sm transition hover:bg-agua-claro"
      >
        <span className="text-xl">Registrar captura</span>
        <span className="text-sm font-normal text-marino/80">
          Foto, voz o escrita a mano
        </span>
      </Link>

      <p className="mt-4 text-sm text-marino/60">
        Los papeles de SERNAPESCA se llenan solos con lo que registraste, y tu pesca queda
        a la venta al instante.
      </p>

      <section className="mt-10" data-tour="mi-pesca">
        <SeccionTitulo extra={<TourPescador etiqueta="Ver el recorrido" />}>
          Mi pesca publicada
        </SeccionTitulo>
        <MisProductos />
      </section>
    </PageShell>
  );
}
