"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Header marino con la ruta activa marcada. Saber dónde estás parado es la
 * diferencia más barata entre un prototipo y una app. Ver docs/07-diseno-ui.md
 *
 * El logo es la "C" de anzuelo de public/LOGO.jpeg, recortada a PNG con fondo
 * transparente por scripts/extraer-logo.ps1. Acá va la versión blanca porque el
 * azul de marca sobre el marino del header no tiene contraste suficiente.
 */
const NAV = [
  { href: "/pescador", label: "Pescador" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/restaurante", label: "Restaurante" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-marino text-white">
      <nav
        aria-label="Navegación principal"
        className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 sm:gap-6"
      >
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold"
          aria-label="CaletaApp, ir al inicio"
        >
          <Image
            src="/logo-caleta-blanco.png"
            alt=""
            width={512}
            height={512}
            priority
            className="size-9 shrink-0"
          />
          <span className="hidden sm:inline">CaletaApp</span>
        </Link>

        <ul className="ml-auto flex items-center gap-1 text-sm sm:gap-2">
          {NAV.map((item) => {
            const activo = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  data-tour={item.href === "/marketplace" ? "nav-marketplace" : undefined}
                  aria-current={activo ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2 transition ${
                    activo
                      ? "bg-white/15 font-semibold text-white"
                      : "text-white/80 hover:bg-marino-claro hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
