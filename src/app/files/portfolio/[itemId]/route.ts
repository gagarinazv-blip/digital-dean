import { getPortfolioActor } from "@/lib/portfolio-auth";
import {
  getPortfolioFileRecord,
  recordPortfolioFileDownload,
} from "@/lib/portfolio";
import { fileStorage } from "@/lib/file-storage";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

function parseId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function notFound(): Response {
  return new Response(null, { status: 404, headers: privateHeaders });
}

function encodeFileName(name: string): string {
  return encodeURIComponent(name).replace(
    /['()*]/g,
    (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
): Promise<Response> {
  const actor = await getPortfolioActor();
  if (!actor) {
    return Response.json(
      { error: "Требуется авторизация." },
      { status: 401, headers: privateHeaders },
    );
  }
  const itemId = parseId((await params).itemId);
  if (itemId === null) return notFound();

  const item = await getPortfolioFileRecord(itemId);
  if (
    !item ||
    (actor.role === "STUDENT" && actor.studentId !== item.studentId)
  ) {
    return notFound();
  }
  let data: Buffer;
  try {
    data = await fileStorage.read(item.storedName);
  } catch {
    console.error("Portfolio file read failed.");
    return new Response(null, { status: 500, headers: privateHeaders });
  }

  try {
    await recordPortfolioFileDownload(actor, item);
  } catch {
    console.error("Portfolio download audit failed.");
    return new Response(null, { status: 500, headers: privateHeaders });
  }

  const asciiName = item.originalName
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
  const download = new URL(request.url).searchParams.get("download") === "1";
  const headers = new Headers(privateHeaders);
  headers.set("Content-Type", item.mimeType);
  headers.set(
    "Content-Disposition",
    `${download ? "attachment" : "inline"}; filename="${asciiName}"; filename*=UTF-8''${encodeFileName(item.originalName)}`,
  );
  headers.set("Content-Length", String(data.length));
  return new Response(new Uint8Array(data), { status: 200, headers });
}
