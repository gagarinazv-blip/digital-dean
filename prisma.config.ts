// Настройки Prisma CLI (команды prisma migrate, prisma generate и т.д.).
import "dotenv/config"; // подхватывает переменные из файла .env
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
