/**
 * P1 — dueño: Rubén. Se corta sin culpa si vamos atrasados (docs/09-plan-noche.md).
 *
 * TODO(Rubén):
 *  1. Filtro por especie sobre GET /api/marketplace
 *  2. Crear pedido → POST /api/pedidos
 *  3. Ver candidatos → GET /api/pedidos/[id]/match (score visible y su motivo)
 *  4. Sello "Pesca Artesanal Certificada" en el perfil
 */
export default function RestaurantePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Compra directo a la caleta</h1>
      <p className="mt-2 text-marino/70">
        Pide la especie que necesitas y te conectamos con la captura más fresca disponible.
      </p>

      <p className="mt-8 rounded-xl border border-dashed border-marino/25 p-4 text-sm text-marino/60">
        Vista de restaurante pendiente (P1). Si no alcanza el tiempo, se muestra como
        mockup estático en el pitch.
      </p>
    </div>
  );
}
