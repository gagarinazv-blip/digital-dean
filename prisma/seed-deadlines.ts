import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { getDemoNow } from "../src/lib/demo-date";
import { syncDeadlineSeed } from "./deadline-seed";

// Добавляет демо-дедлайны в существующую базу, не пересоздавая аккаунты.
async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The deadline seed cannot be run in production.");
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL must be set before running the seed.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    const students = await prisma.student.findMany({
      where: { user: { login: { in: ["student.alpha", "student.beta"] } } },
      select: { id: true, user: { select: { login: true } } },
    });
    const studentIds = new Map(
      students.map(({ id, user }) => [user.login, id]),
    );
    await prisma.$transaction((tx) =>
      syncDeadlineSeed(tx, studentIds, getDemoNow()),
    );
    console.log("Демо-дедлайны добавлены.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Не удалось добавить демо-дедлайны:", error);
  process.exitCode = 1;
});
