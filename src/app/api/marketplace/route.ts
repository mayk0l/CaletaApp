import { NextResponse } from "next/server";
import { mockMarketplace } from "@/lib/mocks";
import { apiOk } from "@/lib/types";

/**
 * GET /api/marketplace — dueño: Manuel
 * Contrato: docs/05-api-contratos.md
 *
 * Devuelve los mocks para que el frontend pueda hacer fetch REAL desde ya.
 * TODO(Manuel): reemplazar por consulta a Prisma:
 *  - traer productos con estado != "vendido"
 *  - derivar precioActualKg y descuentoPct con calcularPrecioBase() (src/lib/pricing.ts)
 *  - NO confiar en el precio guardado: se deriva de publicadoEn (docs/04-modelo-datos.md)
 */
export async function GET() {
  return NextResponse.json(apiOk(mockMarketplace));
}
