// Один общий клиент Prisma на всё приложение.
// В режиме разработки Next.js перезагружает код при каждом сохранении,
// поэтому клиент кладём в globalThis — иначе соединений с базой станет слишком много.
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  const cachedPrisma = globalForPrisma.prisma;
  if (
    cachedPrisma &&
    typeof cachedPrisma.portfolioFolder !== "undefined" &&
    typeof cachedPrisma.portfolioItem !== "undefined" &&
    typeof cachedPrisma.studentDocument !== "undefined" &&
    typeof cachedPrisma.opportunity !== "undefined" &&
    typeof cachedPrisma.opportunityApplication !== "undefined" &&
    typeof cachedPrisma.opportunityBookmark !== "undefined" &&
    typeof cachedPrisma.applicationFile !== "undefined"
  ) {
    return cachedPrisma;
  }
  if (cachedPrisma) {
    delete globalForPrisma.prisma;
    void cachedPrisma.$disconnect().catch(() => {
      console.error("Stale Prisma client disconnect failed.");
    });
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Переменная DATABASE_URL не задана. Скопируйте .env.example в .env.",
    );
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }
  return prisma;
}
