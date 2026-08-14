import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { reconocerEspecieDesdeFoto } from "@/lib/ai/vision";
import { apiError, apiOk, UMBRAL_CONFIANZA, type CapturaResponse } from "@/lib/types";

/**
 * POST /api/capturas/imagen — visión con Gemini. Ver docs/06-ia-y-prompts.md
 *
 * multipart/form-data: foto (File), pescadorId (string)
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(apiError("VALIDACION", "Body inválido, se esperaba multipart/form-data."), {
      status: 400,
    });
  }

  const foto = form.get("foto");
  const pescadorId = form.get("pescadorId");

  if (!(foto instanceof File) || typeof pescadorId !== "string" || !pescadorId) {
    return NextResponse.json(
      apiError("VALIDACION", "Se requiere 'foto' (archivo) y 'pescadorId'."),
      { status: 400 },
    );
  }

  try {
    const bytes = Buffer.from(await foto.arrayBuffer());
    const { reconocimiento, crudo } = await reconocerEspecieDesdeFoto(
      bytes,
      foto.type || "image/jpeg",
    );

    const captura = await prisma.captura.create({
      data: {
        pescadorId,
        especieNombre: reconocimiento.especie,
        cantidad: reconocimiento.cantidad,
        pesoKg: reconocimiento.pesoKgEstimado,
        largoCm: reconocimiento.largoCmEstimado,
        metodo: "foto",
        confianzaIa: reconocimiento.confianza,
        iaRaw: JSON.parse(JSON.stringify(crudo)),
        estado: "pendiente",
      },
    });

    const data: CapturaResponse = { capturaId: captura.id, reconocimiento };

    if (reconocimiento.confianza < UMBRAL_CONFIANZA) {
      // No es un error: es baja confianza real. Se devuelve igual con ok:true
      // para que la UI muestre el resultado y pida confirmación manual
      // (ver ConfianzaIA en docs/07-diseno-ui.md), en vez de bloquear el flujo.
      return NextResponse.json(apiOk(data));
    }

    return NextResponse.json(apiOk(data));
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : String(err);
    if (mensaje.includes("IA_TIMEOUT")) {
      return NextResponse.json(
        apiError("IA_TIMEOUT", "La IA no respondió a tiempo. Probá de nuevo o regístralo manual."),
        { status: 504 },
      );
    }
    return NextResponse.json(
      apiError("IA_SIN_RESULTADO", "No se pudo reconocer la captura desde la foto."),
      { status: 502 },
    );
  }
}
