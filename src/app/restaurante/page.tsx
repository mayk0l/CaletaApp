import Link from "next/link";
import { BadgeSimulado } from "@/components/BadgeSimulado";
import { FormularioPedido } from "@/components/FormularioPedido";
import { TarjetaSugerencia } from "@/components/TarjetaSugerencia";
import { PESOS } from "@/lib/matching";
import { explicarEspera } from "@/lib/matching";
import { listarCola, listarRestaurantes } from "@/lib/pedidos";
import { accionEliminarPedido, accionVolverACola } from "./actions";

/**
 * Pantalla de restaurante: programar un pedido, quedar en cola y recibir
 * sugerencias rankeadas. Ver docs/07-diseno-ui.md
 *
 * Son sugerencias, no una subasta: un mismo producto puede sugerirse a varios
 * pedidos y tomar una sugerencia no reserva el producto en el marketplace.
 */
export const dynamic = "force-dynamic";

export default async function RestaurantePage({
  searchParams,
}: {
  searchParams: Promise<{ restaurante?: string }>;
}) {
  const { restaurante: restauranteParam } = await searchParams;
  const restaurantes = await listarRestaurantes();

  const activo =
    restaurantes.find((r) => r.id === restauranteParam) ?? restaurantes[0] ?? null;

  if (!activo) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Compra directo a la caleta</h1>
        <p className="mt-6 rounded-xl border border-dashed border-marino/25 p-4 text-sm text-marino/60">
          No hay restaurantes cargados. Corre <code>npm run seed</code> para poblar la
          base de datos de demostración.
        </p>
      </div>
    );
  }

  const { cola, productos } = await listarCola(activo.id);
  const enCola = cola.filter((item) => !item.resuelto);
  const resueltos = cola.filter((item) => item.resuelto);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Compra directo a la caleta</h1>
          <p className="mt-1 text-marino/70">
            Programa lo que necesitas. Si todavía no hay pesca que calce, tu pedido queda
            en cola y te sugerimos la mejor opción en cuanto se publique.
          </p>
        </div>
        <BadgeSimulado texto="sesión simulada" />
      </div>

      <section className="mt-6" aria-label="Restaurante activo">
        <ul className="flex flex-wrap gap-2">
          {restaurantes.map((r) => {
            const seleccionado = r.id === activo.id;
            return (
              <li key={r.id}>
                <Link
                  href={`/restaurante?restaurante=${r.id}`}
                  aria-current={seleccionado ? "true" : undefined}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                    seleccionado
                      ? "bg-marino text-crema"
                      : "bg-white text-marino/70 ring-1 ring-marino/10 hover:text-marino"
                  }`}
                >
                  {r.nombre}
                  <span className={seleccionado ? "text-crema/70" : "text-marino/40"}>
                    {r.comuna}
                  </span>
                  {r.selloCertificado && (
                    <span
                      title="Compra con sello de Pesca Artesanal Certificada"
                      className="text-agua"
                      aria-label="con sello certificado"
                    >
                      ✓
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-6">
        <FormularioPedido restaurantes={restaurantes} restauranteId={activo.id} />
      </div>

      <section className="mt-10" aria-label="Pedidos en cola">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-marino/50">
            En cola ({enCola.length})
          </h2>
          <p className="text-xs text-marino/50">
            {productos.length} producto{productos.length === 1 ? "" : "s"} publicado
            {productos.length === 1 ? "" : "s"}
          </p>
        </div>

        {enCola.length === 0 ? (
          <p className="mt-3 rounded-xl bg-white p-4 text-sm text-marino/60 ring-1 ring-marino/10">
            No tienes pedidos en cola. Programa uno arriba.
          </p>
        ) : (
          <ul className="mt-3 space-y-4">
            {enCola.map(({ pedido, estado, sugerencias }) => (
              <li
                key={pedido.id}
                className="rounded-2xl bg-white/60 p-4 ring-1 ring-marino/10"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold capitalize">
                      {pedido.cantidadKg} kg de {pedido.especie}
                    </p>
                    <p className="text-sm text-marino/60">
                      {estado === "match"
                        ? `${sugerencias.length} sugerencia${sugerencias.length === 1 ? "" : "s"} disponible${sugerencias.length === 1 ? "" : "s"}`
                        : "Esperando pesca que calce"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <EtiquetaEstado estado={estado} />
                    <form action={accionEliminarPedido}>
                      <input type="hidden" name="pedidoId" value={pedido.id} />
                      <button
                        type="submit"
                        className="rounded-lg px-2 py-1 text-sm text-marino/50 underline-offset-2 hover:text-cobre hover:underline"
                      >
                        Cancelar
                      </button>
                    </form>
                  </div>
                </div>

                {sugerencias.length === 0 ? (
                  <p className="mt-3 rounded-xl bg-crema p-3 text-sm text-marino/60">
                    {explicarEspera(pedido, productos)}
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {sugerencias.map((s, i) => (
                      <TarjetaSugerencia
                        key={s.productoId}
                        pedidoId={pedido.id}
                        sugerencia={s}
                        destacada={i === 0}
                      />
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {resueltos.length > 0 && (
        <section className="mt-10" aria-label="Pedidos resueltos">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-marino/50">
            Resueltos ({resueltos.length})
          </h2>
          <ul className="mt-3 space-y-3">
            {resueltos.map(({ pedido, scoreElegido }) => (
              <li
                key={pedido.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-agua/40"
              >
                <div>
                  <p className="font-semibold capitalize">
                    {pedido.cantidadKg} kg de {pedido.especie}
                  </p>
                  <p className="text-sm text-marino/60">
                    Sugerencia tomada
                    {scoreElegido != null && ` · score ${scoreElegido}/100`}
                  </p>
                </div>
                <form action={accionVolverACola}>
                  <input type="hidden" name="pedidoId" value={pedido.id} />
                  <button
                    type="submit"
                    className="rounded-lg px-3 py-1.5 text-sm text-marino/60 ring-1 ring-marino/15 transition hover:text-marino"
                  >
                    Volver a la cola
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10 rounded-2xl bg-white p-5 ring-1 ring-marino/10">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-marino/50">
            Cómo se ordenan las sugerencias
          </h2>
          <BadgeSimulado texto="reglas explícitas, sin LLM" />
        </div>
        <p className="mt-2 text-sm text-marino/70">
          Filtro duro por especie, disponibilidad y cantidad suficiente. Lo que pasa el
          filtro se puntúa sobre 100 con estos pesos, y el desglose queda visible en cada
          sugerencia. A igual puntaje, primero el pedido que llegó antes.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          <Peso etiqueta="Frescura" puntos={PESOS.frescura} />
          <Peso etiqueta="Precio" puntos={PESOS.precio} />
          <Peso etiqueta="Calce de cantidad" puntos={PESOS.calce} />
          <Peso etiqueta="Cercanía" puntos={PESOS.cercania} />
          <Peso etiqueta="Anti-merma" puntos={PESOS.antiMerma} />
        </ul>
      </section>
    </div>
  );
}

function Peso({ etiqueta, puntos }: { etiqueta: string; puntos: number }) {
  return (
    <li className="rounded-full bg-crema px-3 py-1 text-marino/70">
      {etiqueta} <span className="font-semibold text-marino">{puntos}</span>
    </li>
  );
}

function EtiquetaEstado({ estado }: { estado: "cola" | "match" | "resuelto" }) {
  const estilo =
    estado === "match"
      ? "bg-agua/15 text-agua"
      : estado === "resuelto"
        ? "bg-marino/10 text-marino/70"
        : "bg-cobre/10 text-cobre";

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estilo}`}>
      {estado}
    </span>
  );
}
