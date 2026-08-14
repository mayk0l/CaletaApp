import { NextResponse } from "next/server";
import { apiError } from "@/lib/types";

/**
 * POST /api/formulario/[id]/enviar — dueño: Manuel
 * Contrato: docs/05-api-contratos.md
 *
 * Envío SIMULADO a SERNAPESCA. Decisión tomada y no reabrir: automatizar el portal
 * real con navegador headless fue evaluado y descartado por riesgo/tiempo
 * (docs/06-ia-y-prompts.md, tabla de decisiones).
 *
 * TODO(Manuel):
 *  1. Armar el payload real como si se fuera a enviar (esto se muestra en la demo)
 *  2. Esperar ~1,5 s para que se vea el estado de carga
 *  3. Generar folioMock tipo "SP-2026-000148"
 *  4. Marcar Captura como "enviada" y CREAR el Producto en el marketplace
 *     con precioInicialKg = precio base de la especie y publicadoEn = ahora
 *  5. Devolver { folioMock, enviadoEn, simulado: true, productoId }
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  void request;
  void context;
  return NextResponse.json(
    apiError("INTERNO", "Envío simulado aún no implementado."),
    { status: 501 },
  );
}
