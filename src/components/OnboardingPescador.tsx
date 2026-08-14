"use client";

import { useState, useSyncExternalStore } from "react";
import { TourPescador } from "@/components/TourPescador";

/**
 * Bienvenida de 3 pasos para el pescador que entra por primera vez.
 *
 * No es un tour modal encima de la interfaz: es una tarjeta dentro del flujo, que
 * se cierra y se puede volver a abrir. En el ensayo hay que poder mostrarlo de
 * nuevo sin borrar datos del navegador, de ahí el botón "Cómo funciona".
 *
 * localStorage se lee con useSyncExternalStore y no con useEffect + setState:
 * es un store externo, y así no hay cascada de renders ni desajuste de
 * hidratación (el servidor no puede saber si ya lo vio).
 */
const CLAVE = "caletaapp:onboarding-pescador";
const VISTO = "visto";

const oyentes = new Set<() => void>();

function suscribir(alCambiar: () => void) {
  oyentes.add(alCambiar);
  window.addEventListener("storage", alCambiar);
  return () => {
    oyentes.delete(alCambiar);
    window.removeEventListener("storage", alCambiar);
  };
}

function leer(): string {
  try {
    return window.localStorage.getItem(CLAVE) ?? "";
  } catch {
    // Modo privado o storage bloqueado: mostrarlo es el comportamiento seguro.
    return "";
  }
}

/** En el servidor asumimos "ya visto": es lo que menos molesta si ya lo vio. */
function leerEnServidor(): string {
  return VISTO;
}

function marcarVisto() {
  try {
    window.localStorage.setItem(CLAVE, VISTO);
  } catch {
    // Si no se puede persistir, al menos se cierra en esta sesión.
  }
  for (const oyente of oyentes) oyente();
}

const PASOS = [
  {
    titulo: "Saca la foto o dilo en voz alta",
    detalle:
      "La IA reconoce la especie y estima el peso. También puedes escribirlo a mano si hay mala señal.",
    icono: "📸",
  },
  {
    titulo: "Corrige si se equivocó",
    detalle:
      "Tú tienes la última palabra: puedes cambiar especie, cantidad, peso y largo antes de continuar.",
    icono: "✏️",
  },
  {
    titulo: "Queda a la venta al instante",
    detalle:
      "Los papeles de SERNAPESCA se llenan solos y tu pesca aparece en el marketplace con su precio.",
    icono: "✅",
  },
];

export function OnboardingPescador() {
  const estado = useSyncExternalStore(suscribir, leer, leerEnServidor);
  const [abiertoManual, setAbiertoManual] = useState(false);
  const visible = abiertoManual || estado !== VISTO;

  function cerrar() {
    marcarVisto();
    setAbiertoManual(false);
  }

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => setAbiertoManual(true)}
        className="text-sm text-marino/60 underline underline-offset-2 transition hover:text-marino"
      >
        Cómo funciona
      </button>
    );
  }

  return (
    <section
      aria-labelledby="onboarding-titulo"
      className="rounded-2xl bg-marino p-5 text-crema shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="onboarding-titulo" className="text-lg font-semibold">
          Tres pasos y tu pesca queda publicada
        </h2>
        <button
          type="button"
          onClick={cerrar}
          className="shrink-0 rounded-lg px-2 py-1 text-sm text-crema/70 transition hover:bg-white/10 hover:text-crema"
        >
          Cerrar
        </button>
      </div>

      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {PASOS.map((paso, i) => (
          <li key={paso.titulo} className="rounded-xl bg-white/10 p-4">
            <span aria-hidden className="text-xl">
              {paso.icono}
            </span>
            <p className="mt-2 text-sm font-semibold">
              <span className="text-agua-claro">{i + 1}.</span> {paso.titulo}
            </p>
            <p className="mt-1 text-sm text-crema/80">{paso.detalle}</p>
          </li>
        ))}
      </ol>

      <p className="mt-4 text-xs text-crema/70">
        La sesión y el envío a SERNAPESCA son simulados en este prototipo, y están
        rotulados como tales en cada pantalla.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <TourPescador etiqueta="Muéstrame dónde está cada cosa" variante="solido" />
        <button
          type="button"
          onClick={cerrar}
          className="text-sm text-crema/70 underline underline-offset-2 transition hover:text-crema"
        >
          Ya sé usarla
        </button>
      </div>
    </section>
  );
}
