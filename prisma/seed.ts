/**
 * Seed de demo. Idempotente: limpia y recarga.
 *   npm run seed
 *
 * Objetivo: que la app sea demostrable SIN tocar nada. En particular, deja productos
 * publicados hace 2, 8 y 20 horas para que el marketplace muestre los tres tramos de
 * descuento desde el primer segundo — no queremos esperar en vivo frente al jurado.
 * Ver docs/04-modelo-datos.md
 */

import { PrismaClient } from "@prisma/client";
import { calcularPrecioBase } from "../src/lib/pricing";
import senales from "../src/data/knowledge/senales-mercado.json";

const prisma = new PrismaClient();

const horasAtras = (h: number) => new Date(Date.now() - h * 3_600_000);

async function main() {
  // Orden inverso a las dependencias
  await prisma.pedido.deleteMany();
  await prisma.producto.deleteMany();
  await prisma.formulario.deleteMany();
  await prisma.captura.deleteMany();
  await prisma.pescador.deleteMany();
  await prisma.especie.deleteMany();
  await prisma.senalMercado.deleteMany();
  await prisma.restaurante.deleteMany();

  const especies = await Promise.all([
    prisma.especie.create({
      data: {
        nombre: "congrio",
        nombreCientifico: "Genypterus chilensis",
        precioBaseKg: 12000,
        tallaMinimaCm: 60,
      },
    }),
    prisma.especie.create({
      data: {
        nombre: "jaiba",
        nombreCientifico: "Cancer setosus",
        precioBaseKg: 8000,
        tallaMinimaCm: 12,
      },
    }),
    prisma.especie.create({
      data: {
        nombre: "jibia",
        nombreCientifico: "Dosidicus gigas",
        precioBaseKg: 3500,
      },
    }),
  ]);

  const pescador = await prisma.pescador.create({
    data: {
      nombre: "Luis Ovalle",
      caleta: "Caleta Portales",
      region: "Valparaíso",
      rpaMock: "RPA-05-014782",
      embarcacion: "Doña Rosa · VAL-1187",
    },
  });

  // 2 h → 0% · 8 h → 10% · 20 h → 25%
  const demo: Array<{
    especie: string;
    pesoKg: number;
    cantidad: number;
    horas: number;
    metodo: string;
    tendencia: string;
    justificacion: string;
  }> = [
    {
      especie: "congrio",
      pesoKg: 6.4,
      cantidad: 2,
      horas: 2,
      metodo: "foto",
      tendencia: "alcista",
      justificacion: "Baja oferta regional de congrio y demanda de fin de semana.",
    },
    {
      especie: "jaiba",
      pesoKg: 12,
      cantidad: 8,
      horas: 8,
      metodo: "voz",
      tendencia: "bajista",
      justificacion: "Sobreoferta de jaiba esta semana en caletas cercanas.",
    },
    {
      especie: "jibia",
      pesoKg: 25,
      cantidad: 3,
      horas: 20,
      metodo: "manual",
      tendencia: "bajista",
      justificacion: "20 horas sin venta y marejadas anunciadas para mañana.",
    },
  ];

  for (const item of demo) {
    const especie = especies.find((e) => e.nombre === item.especie)!;
    const publicadoEn = horasAtras(item.horas);
    const precio = calcularPrecioBase(especie.precioBaseKg, publicadoEn);

    const captura = await prisma.captura.create({
      data: {
        pescadorId: pescador.id,
        especieNombre: item.especie,
        cantidad: item.cantidad,
        pesoKg: item.pesoKg,
        metodo: item.metodo,
        confianzaIa: item.metodo === "manual" ? 1 : 0.89,
        estado: "enviada",
        creadaEn: publicadoEn,
      },
    });

    await prisma.formulario.create({
      data: {
        capturaId: captura.id,
        camposFijos: {
          pescador: pescador.nombre,
          rpa: pescador.rpaMock,
          caleta: pescador.caleta,
          region: pescador.region,
          embarcacion: pescador.embarcacion,
          fecha: publicadoEn.toISOString().slice(0, 10),
        },
        camposVariables: {
          especie: item.especie,
          cantidad: item.cantidad,
          pesoKg: item.pesoKg,
          aparejo: item.especie === "jaiba" ? "Trampa" : "Espinel",
          zonaCaptura: "V Región · frente a Caleta Portales",
          horaDesembarque: "06:40",
        },
        estadoEnvio: "enviado_simulado",
        folioMock: `SP-2026-${String(140 + demo.indexOf(item)).padStart(6, "0")}`,
        enviadoEn: publicadoEn,
      },
    });

    await prisma.producto.create({
      data: {
        capturaId: captura.id,
        precioInicialKg: especie.precioBaseKg,
        precioActualKg: precio.precioActualKg,
        descuentoPct: precio.descuentoPct,
        publicadoEn,
        estado: precio.riesgoMerma ? "merma" : "disponible",
        tendencia: item.tendencia,
        justificacionIa: item.justificacion,
      },
    });
  }

  await prisma.senalMercado.createMany({
    data: senales.senales.map((s) => ({
      tipo: s.tipo,
      titulo: s.titulo,
      contenido: s.contenido,
      fecha: new Date(s.fecha),
      simulada: s.simulada,
      fuente: "fuente" in s ? (s.fuente as string) : null,
    })),
  });

  const restaurante = await prisma.restaurante.create({
    data: { nombre: "Bote Salvavidas", comuna: "Valparaíso", selloCertificado: true },
  });
  await prisma.restaurante.create({
    data: { nombre: "Hotel Bahía Suites", comuna: "Viña del Mar", selloCertificado: false },
  });

  await prisma.pedido.create({
    data: {
      restauranteId: restaurante.id,
      especieNombre: "congrio",
      cantidadKg: 5,
      estado: "cola",
    },
  });

  console.log("Seed listo: 1 pescador, 3 especies, 3 productos (2 h / 8 h / 20 h),");
  console.log(`${senales.senales.length} señales, 2 restaurantes, 1 pedido en cola.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
