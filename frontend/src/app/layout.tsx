import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CaletaApp — Pesca Artesanal de Valparaíso",
  description: "Trazabilidad + venta directa para pescadores artesanales. Reduce merma, conecta con restaurantes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="text-ocean-900 antialiased">
        <nav className="bg-ocean-900 text-white shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 font-bold text-lg">
              <span className="text-2xl">🦈</span> CaletaApp
            </a>
            <div className="flex gap-4 text-sm">
              <a href="/" className="hover:text-sand-400 transition">Captura</a>
              <a href="/marketplace" className="hover:text-sand-400 transition">Marketplace</a>
              <a href="/restaurante" className="hover:text-sand-400 transition">Soy Restaurante</a>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        <footer className="text-center text-sm text-ocean-700 py-6">
          LimacheWaves · Ocean Lab Hackathon 2026 · Valparaíso
        </footer>
      </body>
    </html>
  );
}
