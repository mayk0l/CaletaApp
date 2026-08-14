import Link from "next/link";

const NAV = [
  { href: "/pescador", label: "Pescador" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/restaurante", label: "Restaurante" },
];

export function AppHeader() {
  return (
    <header className="bg-marino text-white">
      <nav
        aria-label="Navegación principal"
        className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 sm:gap-6"
      >
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-full bg-agua text-lg font-bold text-marino"
          >
            C
          </span>
          <span className="hidden sm:inline">CaletaApp</span>
        </Link>

        <ul className="ml-auto flex items-center gap-1 text-sm sm:gap-3">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="rounded-lg px-3 py-2 hover:bg-marino-claro"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
