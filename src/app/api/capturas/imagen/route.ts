import { NextResponse } from "next/server";
import { apiOk, apiError, UMBRAL_CONFIANZA, type CapturaResponse } from "@/lib/types";
import { prisma } from "@/lib/db";
import { reconocerEspecieDesdeFoto } from "@/lib/ai/vision";

/**
 * POST /api/capturas/imagen — dueño: Manuel
 * Contrato: docs/05-api-contratos.md · Prompt: docs/06-ia-y-prompts.md
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const foto = formData.get("foto") as File | null;
    const pescadorId = formData.get("pescadorId") as string | null;

    if (!foto) {
      return NextResponse.json(
        apiError("VALIDACION", "Falta el archivo de foto."),
        { status: 400 },
      );
    }

    // Resolver pescador (demo: usar el primero si no se especifica)
    let pid = pescadorId;
    if (!pid) {
      const primero = await prisma.pescador.findFirst();
      pid = primero?.id;
    }
    if (!pid) {
      return NextResponse.json(apiError("NO_ENCONTRADO", "No hay pescadores registrados."), { status: 404 });
    }

    const bytes = new Uint8Array(await foto.arrayBuffer());
    const mimeType = foto.type || "image/jpeg";

    const reconocimiento = await reconocerEspecieDesdeFoto(bytes, mimeType);

    // Guardar captura con respuesta cruda del modelo
    const captura = await prisma.captura.create({
      data: {
        pescadorId: pid,
        especieNombre: reconocimiento.especie,
        cantidad: reconocimiento.cantidad,
        pesoKg: reconocimiento.pesoKgEstimado,
        largoCm: reconocimiento.largoCmEstimado,
        metodo: "foto",
        confianzaIa: reconocimiento.confianza,
        iaRaw: { reconocimiento } as any,
        estado: "pendiente",
      },
    });

    const response: CapturaResponse = {
      capturaId: captura.id,
      reconocimiento,
    };

    // Si confianza baja, lo decimos pero no bloqueamos
    if (reconocimiento.confianza < UMBRAL_CONFIANZA) {
      return NextResponse.json(
        apiOk(response),
      );
    }

    return NextResponse.json(apiOk(response));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    const code = message.includes("TIMEOUT") ? "IA_TIMEOUT" : "IA_SIN_RESULTADO";
    return NextResponse.json(apiError(code, message), { status: 503 });
  }
}
