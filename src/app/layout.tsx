import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CaletaApp · Trazabilidad y venta directa para la pesca artesanal",
  description:
    "Registra tu captura por voz o foto, cumple la trazabilidad y vende directo antes de que se convierta en merma. Caletas de la Región de Valparaíso.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-CL"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-crema text-marino">
        <AppHeader />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
