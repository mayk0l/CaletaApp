"use client";

import { useState } from "react";

/**
 * Recorrido guiado de la pantalla del pescador, con driver.js 1.8.0 (MIT, sin
 * dependencias propias).
 *
 * Decisiones:
 * - **No arranca solo.** Un tour que aparece encima de la interfaz es una capa
 *   más que hay que cerrar antes de poder trabajar, y esto se usa de pie y con
 *   las manos mojadas. Se abre desde la tarjeta de bienvenida o desde el enlace.
 * - **Import dinámico.** La librería y su CSS solo se descargan si el pescador
 *   pide el recorrido; quien ya sabe usar la app no paga ese peso.
 * - Los pasos apuntan a atributos `data-tour`, no a clases de Tailwind: una
 *   clase de utilidad cambia con cualquier ajuste visual y rompería el tour.
 */
const PASOS = [
  {
    element: '[data-tour="registrar"]',
    popover: {
      title: "Aquí empiezas",
      description:
        "Toca este botón cuando llegues con la pesca. Puedes decirlo en voz alta, sacar una foto o escribirlo.",
    },
  },
  {
    element: '[data-tour="mi-pesca"]',
    popover: {
      title: "Tu pesca a la venta",
      description:
        "Acá aparece lo que ya publicaste. Puedes cambiarle el precio por kilo cuando quieras.",
    },
  },
  {
    element: '[data-tour="nav-marketplace"]',
    popover: {
      title: "Lo que ve el comprador",
      description:
        "Así ven tu pesca los restaurantes. Si no se vende, el precio baja solo antes de que se pierda.",
    },
  },
];

export function TourPescador({
  etiqueta = "Ver el recorrido",
  variante = "texto",
}: {
  etiqueta?: string;
  variante?: "texto" | "solido";
}) {
  const [cargando, setCargando] = useState(false);

  async function iniciar() {
    setCargando(true);
    try {
      const [{ driver }] = await Promise.all([
        import("driver.js"),
        import("driver.js/dist/driver.css"),
      ]);

      driver({
        showProgress: true,
        progressText: "Paso {{current}} de {{total}}",
        nextBtnText: "Siguiente",
        prevBtnText: "Atrás",
        doneBtnText: "Entendido",
        // Los pasos apuntan a elementos que solo existen en /pescador; si alguno
        // falta (por ejemplo, todavía sin pesca publicada) driver.js lo omite.
        steps: PASOS,
      }).drive();
    } finally {
      setCargando(false);
    }
  }

  const clases =
    variante === "solido"
      ? "rounded-xl bg-agua px-4 py-2 text-sm font-semibold text-marino transition hover:bg-agua-claro disabled:opacity-60"
      : "text-sm text-marino/60 underline underline-offset-2 transition hover:text-marino disabled:opacity-60";

  return (
    <button type="button" onClick={iniciar} disabled={cargando} className={clases}>
      {cargando ? "Abriendo…" : etiqueta}
    </button>
  );
}
