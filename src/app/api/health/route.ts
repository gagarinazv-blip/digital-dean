import { getPrisma } from "@/lib/prisma";

export async function GET() {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return Response.json(
      { status: "ok", db: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.error("Health check failed: database is unavailable");
    return Response.json(
      { status: "error", db: "error" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
