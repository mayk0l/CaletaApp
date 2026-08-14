import { PrismaClient } from "@prisma/client";

/**
 * Singleton: en dev, Next recarga los módulos y crearíamos una conexión nueva
 * en cada hot reload hasta agotar el pool de Neon.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
