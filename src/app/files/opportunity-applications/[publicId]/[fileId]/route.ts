import { getPortfolioActor } from "@/lib/portfolio-auth";
import { fileStorage } from "@/lib/file-storage";
import { getPrisma } from "@/lib/prisma";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

function notFound(): Response {
  return new Response(null, { status: 404, headers: privateHeaders });
}

function safeFileName(name: string): string {
  return encodeURIComponent(name).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ publicId: string; fileId: string }>;
  },
): Promise<Response> {
  const actor = await getPortfolioActor();
  if (!actor) {
    return Response.json(
      { error: "Требуется авторизация." },
      { status: 401, headers: privateHeaders },
    );
  }

  const { publicId, fileId: rawFileId } = await params;
  const fileId = Number(rawFileId);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(publicId) ||
    !/^[1-9]\d*$/.test(rawFileId) ||
    !Number.isSafeInteger(fileId)
  ) {
    return notFound();
  }

  const application = await getPrisma().opportunityApplication.findUnique({
    where: { publicId },
    select: {
      studentId: true,
      files: {
        where: { id: fileId },
        select: {
          id: true,
          originalName: true,
          storedName: true,
          mimeType: true,
          size: true,
        },
      },
    },
  });
  const file = application?.files[0];
  if (
    !application ||
    !file ||
    (actor.role === "STUDENT" && actor.studentId !== application.studentId)
  ) {
    return notFound();
  }

  let data: Buffer;
  try {
    data = await fileStorage.read(file.storedName);
  } catch {
    console.error("Opportunity application file read failed.");
    return new Response(null, { status: 500, headers: privateHeaders });
  }

  if (data.length !== file.size) {
    console.error("Opportunity application file size mismatch.");
    return new Response(null, { status: 500, headers: privateHeaders });
  }

  if (actor.role === "STAFF") {
    try {
      await getPrisma().studentAuditLog.create({
        data: {
          studentId: application.studentId,
          actorUserId: actor.userId,
          action: "OPPORTUNITY_FILE_DOWNLOADED",
          changedFields: [`application-file:${file.id}`],
        },
      });
    } catch {
      console.error("Opportunity application file audit failed.");
      return new Response(null, { status: 500, headers: privateHeaders });
    }
  }

  const headers = new Headers(privateHeaders);
  headers.set("Content-Type", file.mimeType);
  headers.set(
    "Content-Disposition",
    `${new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline"}; filename*=UTF-8''${safeFileName(file.originalName)}`,
  );
  headers.set("Content-Length", String(data.length));
  return new Response(new Uint8Array(data), { status: 200, headers });
}
