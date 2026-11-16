import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import {
  canStaffAccessRequest,
  parsePositiveIntegerId,
} from "@/lib/request-workflow";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

function notFoundResponse(): Response {
  return new Response(null, { status: 404, headers: privateHeaders });
}

function encodeFileName(fileName: string): string {
  return encodeURIComponent(fileName).replace(
    /['()*]/g,
    (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401, headers: privateHeaders },
    );
  }

  const { attachmentId: rawId } = await params;
  const id = parsePositiveIntegerId(rawId);
  if (id === null) {
    return notFoundResponse();
  }

  const prisma = getPrisma();
  const attachment = await prisma.requestAttachment.findUnique({
    where: { id },
    select: {
      kind: true,
      fileName: true,
      mediaType: true,
      sizeBytes: true,
      data: true,
      comment: {
        select: {
          visibility: true,
          request: {
            select: {
              studentId: true,
              assignedToId: true,
              type: true,
              status: true,
            },
          },
        },
      },
    },
  });
  if (!attachment) {
    return notFoundResponse();
  }

  if (user.role === "STUDENT") {
    if (
      !user.student ||
      user.student.id !== attachment.comment.request.studentId ||
      attachment.comment.visibility !== "PUBLIC" ||
      (attachment.kind === "RESULT" &&
        attachment.comment.request.status !== "READY")
    ) {
      return notFoundResponse();
    }
  } else {
    const staff = await prisma.staffProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, department: true },
    });
    if (
      !staff ||
      !canStaffAccessRequest(staff, attachment.comment.request)
    ) {
      return notFoundResponse();
    }
  }

  const fallbackName = attachment.fileName
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
  const headers = new Headers(privateHeaders);
  headers.set("Content-Type", attachment.mediaType);
  headers.set(
    "Content-Disposition",
    `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeFileName(attachment.fileName)}`,
  );
  headers.set("Content-Length", String(attachment.sizeBytes));

  return new Response(new Uint8Array(attachment.data), {
    status: 200,
    headers,
  });
}
