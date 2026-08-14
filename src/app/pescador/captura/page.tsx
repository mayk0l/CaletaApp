import { UMBRAL_CONFIANZA } from "@/lib/types";

/**
 * PANTALLA CLAVE — dueño: Rubén. Ver docs/07-diseno-ui.md y docs/05-api-contratos.md
 *
 * TODO(Rubén):
 *  1. CapturaTabs: Foto | Voz | Manual
 *  2. SubidorFoto  → POST /api/capturas/imagen   (input capture="environment")
 *  3. GrabadorVoz  → POST /api/capturas/voz      (MediaRecorder → webm)
 *  4. Formulario manual → POST /api/capturas/manual
 *  5. ConfianzaIA: si confianza < UMBRAL_CONFIANZA, pedir confirmación manual
 *     en vez de dar el dato de la IA por bueno.
 *  6. Al confirmar → redirigir a /pescador/formulario/[capturaId]
 *
 * Mientras el backend no esté: usar mockCapturaFoto / mockCapturaVoz / mockCapturaDudosa
 * de src/lib/mocks.ts. No esperar a Manuel.
 */
export default function CapturaPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Registrar captura</h1>
      <p className="mt-2 text-marino/70">
        Elige cómo registrarla. La IA identifica la especie y estima el peso; tú confirmas.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { titulo: "Foto", detalle: "Saca una foto de la captura" },
          { titulo: "Voz", detalle: "Dícelo en voz alta" },
          { titulo: "Manual", detalle: "Escríbelo tú" },
        ].map((opcion) => (
          <div
            key={opcion.titulo}
            className="rounded-2xl bg-white p-4 ring-1 ring-marino/10"
          >
            <h2 className="font-semibold">{opcion.titulo}</h2>
            <p className="mt-1 text-sm text-marino/60">{opcion.detalle}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 rounded-xl border border-dashed border-marino/25 p-4 text-sm text-marino/60">
        Pendiente de implementar. Umbral de confianza definido en{" "}
        <code className="font-mono">{UMBRAL_CONFIANZA}</code>: bajo ese valor se pide
        confirmación manual.
      </p>
    </div>
  );
}
