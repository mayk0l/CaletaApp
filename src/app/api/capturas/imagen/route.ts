import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { reconocerEspecieDesdeFoto } from "@/lib/ai/vision";
import { esErrorDeCuota, esErrorDeSobrecarga } from "@/lib/ai/client";
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

  if (!(foto instanceof File)) {
    return NextResponse.json(
      apiError("VALIDACION", "Se requiere 'foto' (archivo)."),
      { status: 400 },
    );
  }

  // Límite de tamaño: 5 MB antes de cargar el binario en memoria
  const MAX_FOTO_BYTES = 5 * 1024 * 1024;
  if (foto.size > MAX_FOTO_BYTES) {
    return NextResponse.json(
      apiError("VALIDACION", `Foto demasiado grande (máx 5 MB, recibido ${Math.round(foto.size / 1024 / 1024)} MB).`),
      { status: 413 },
    );
  }

  // Resolver pescador: SIEMPRE usar uno real de la DB (demo)
  let pid: string | null = typeof pescadorId === "string" ? pescadorId : null;
  const pescadorExistente = pid ? await prisma.pescador.findUnique({ where: { id: pid } }) : null;
  if (!pescadorExistente) {
    const primero = await prisma.pescador.findFirst();
    pid = primero?.id ?? null;
  }
  if (!pid) {
    return NextResponse.json(apiError("NO_ENCONTRADO", "No hay pescadores registrados."), { status: 404 });
  }

  try {
    const bytes = Buffer.from(await foto.arrayBuffer());
    const { reconocimiento, crudo } = await reconocerEspecieDesdeFoto(
      bytes,
      foto.type || "image/jpeg",
    );

    const captura = await prisma.captura.create({
      data: {
        pescadorId: pid,
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
    if (esErrorDeCuota(err)) {
      return NextResponse.json(
        apiError("IA_CUOTA", "Se agotó la cuota de IA por minuto. Esperá un momento y probá de nuevo."),
        { status: 429 },
      );
    }
    if (esErrorDeSobrecarga(err)) {
      return NextResponse.json(
        apiError("IA_SOBRECARGA", "Los modelos de IA están saturados en este momento. Probá de nuevo o registrá la captura manual."),
        { status: 503 },
      );
    }
    return NextResponse.json(
      apiError("IA_SIN_RESULTADO", "No se pudo reconocer la captura desde la foto."),
      { status: 502 },
    );
  }
}
