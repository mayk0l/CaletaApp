import { BadgeSimulado } from "@/components/BadgeSimulado";
import { PrecioDinamico } from "@/components/PrecioDinamico";
import { mockMarketplace } from "@/lib/mocks";
import { formatearHoras } from "@/lib/pricing";

/**
 * TODO(Rubén): reemplazar mockMarketplace por fetch a GET /api/marketplace
 * cuando Manuel tenga el endpoint. El contrato es idéntico (docs/05-api-contratos.md).
 *
 * Nota: `horasHastaProximoTramo` y `proximoDescuentoPct` los calcula el backend con
 * calcularPrecioBase(). No recalcular con Date.now() en el render: la regla de pureza
 * de React lo prohíbe y el lint lo bloquea.
 */
export default function MarketplacePage() {
  const { productos } = mockMarketplace;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Marketplace de la caleta</h1>
          <p className="mt-1 text-marino/70">
            Pesca fresca de Caleta Portales. El precio baja solo si el producto no se vende.
          </p>
        </div>
        <BadgeSimulado texto="datos de demostración" />
      </div>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {productos.map((p) => (
          <li
            key={p.id}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-marino/10"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold capitalize">{p.especie}</h2>
                <p className="text-sm text-marino/60">
                  {p.pesoKg} kg · {p.pescador.nombre} · {p.pescador.caleta}
                </p>
              </div>
              {p.selloCertificado && (
                <span className="rounded-full bg-agua/15 px-2 py-1 text-xs font-semibold text-agua">
                  Pesca Artesanal Certificada
                </span>
              )}
            </div>

            <div className="mt-4">
              <PrecioDinamico
                precioInicialKg={p.precioInicialKg}
                precioActualKg={p.precioActualKg}
                descuentoPct={p.descuentoPct}
                tendencia={p.tendencia}
                justificacion={p.justificacionIa}
                horasHastaProximoTramo={p.horasHastaProximoTramo}
                proximoDescuentoPct={p.proximoDescuentoPct}
              />
            </div>

            <p className="mt-4 border-t border-marino/10 pt-3 text-xs text-marino/50">
              Publicado hace {formatearHoras(p.horasPublicado)} · {p.etiquetaTramo}
              {p.estado === "merma" && (
                <strong className="text-cobre"> · riesgo de merma</strong>
              )}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
