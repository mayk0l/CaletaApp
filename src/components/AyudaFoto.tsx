/**
 * Ayuda para que la foto salga útil. No es decoración: docs/12-roadmap.md §1
 * identifica la falta de referencia de escala como la principal causa de error
 * en la estimación de peso, así que este texto mejora el resultado real de la IA.
 */
const CONSEJOS = [
  "Pescado completo y de lado, sin tapar la cola ni la cabeza.",
  "Deja algo de tamaño conocido al lado: una caja pesquera, un guante, un billete.",
  "Buena luz y fondo simple. Sin sombra encima del pescado.",
];

export function AyudaFoto() {
  return (
    <details className="rounded-xl bg-white p-4 ring-1 ring-marino/10">
      <summary className="cursor-pointer text-sm font-medium text-marino/70 transition hover:text-marino">
        Cómo sacar la foto para que la IA acierte
      </summary>
      <ul className="mt-3 space-y-1.5">
        {CONSEJOS.map((consejo) => (
          <li key={consejo} className="flex gap-2 text-sm text-marino/70">
            <span aria-hidden className="text-agua">
              •
            </span>
            {consejo}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-marino/50">
        Si la IA duda, te lo dice y puedes corregir el dato a mano antes de continuar.
      </p>
    </details>
  );
}
