import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { syncCertificateSeed } from "./certificate-seed-data";

// Добавляет демо-виды справок в существующую базу, не меняя другие данные.
async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The certificate seed cannot be run in production.");
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL must be set before running the seed.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    const created = await prisma.$transaction((tx) => syncCertificateSeed(tx));
    console.log(`Демо-виды справок: добавлено ${created}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Не удалось добавить виды справок:", error);
  process.exitCode = 1;
});
