import { BadgeSimulado } from "@/components/BadgeSimulado";
import { mockFormulario } from "@/lib/mocks";

/**
 * Dueño: Rubén. Ver docs/05-api-contratos.md (GET /api/formulario/[capturaId])
 *
 * TODO(Rubén):
 *  1. Traer el formulario real del endpoint en vez del mock
 *  2. Campos editables (el pescador corrige lo que la IA estimó mal)
 *  3. Mostrar `advertencias` (ej. talla bajo el mínimo legal) en cobre
 *  4. Botón "Validar y enviar" → POST /api/formulario/[id]/enviar
 *     → mostrar folio + badge simulado → redirigir a /marketplace
 *
 * ⚠️ Los campos son una aproximación: falta el screenshot del formulario real de
 *    SERNAPESCA (no está en contexto/). Ver docs/07-diseno-ui.md
 */
export default async function FormularioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { camposFijos, camposVariables, advertencias } = mockFormulario;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold sm:text-3xl">Trazabilidad</h1>
        <BadgeSimulado texto="envío simulado a SERNAPESCA" />
      </div>
      <p className="mt-2 text-marino/70">
        Completado automáticamente desde la captura{" "}
        <code className="font-mono text-sm">{id}</code>. Revisa y confirma.
      </p>

      {advertencias.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-xl bg-cobre/10 p-4 text-sm text-cobre">
          {advertencias.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}

      <Seccion titulo="Datos del pescador (fijos)" datos={camposFijos} />
      <Seccion titulo="Datos de la captura (autocompletados)" datos={camposVariables} />

      <button
        type="button"
        className="mt-8 w-full rounded-xl bg-agua px-6 py-4 text-lg font-semibold text-marino transition hover:bg-agua-claro"
      >
        Validar y enviar
      </button>
      <p className="mt-2 text-center text-xs text-marino/50">
        Pendiente de conectar al endpoint de envío.
      </p>
    </div>
  );
}

function Seccion({
  titulo,
  datos,
}: {
  titulo: string;
  datos: Record<string, string | number | undefined>;
}) {
  return (
    <section className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-marino/10">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-marino/50">
        {titulo}
      </h2>
      <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {Object.entries(datos).map(([clave, valor]) => (
          <div key={clave}>
            <dt className="text-xs capitalize text-marino/50">{clave}</dt>
            <dd className="font-medium">{valor ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
