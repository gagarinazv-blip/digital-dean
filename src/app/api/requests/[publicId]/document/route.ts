import { getCurrentUser } from "@/lib/auth";
import { requestTypeLabels } from "@/lib/campus-labels";
import {
  getRequestCatalogTitle,
  getRequestFieldEntries,
  getRequestProfileEntries,
} from "@/lib/request-catalog";
import { getPrisma } from "@/lib/prisma";
import { renderRequestDocumentHtml } from "@/lib/request-document";
import { isRequestPublicId } from "@/lib/request-workflow";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

function notFoundResponse(): Response {
  return new Response(null, { status: 404, headers: privateHeaders });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicId: string }> },
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401, headers: privateHeaders },
    );
  }
  if (user.role !== "STUDENT" || !user.student) {
    return notFoundResponse();
  }

  const { publicId } = await params;
  if (!isRequestPublicId(publicId)) {
    return notFoundResponse();
  }

  const request = await getPrisma().request.findFirst({
    where: {
      publicId,
      studentId: user.student.id,
      status: "READY",
    },
    select: {
      publicId: true,
      type: true,
      catalogCode: true,
      formFields: true,
      profileSnapshot: true,
      updatedAt: true,
    },
  });
  if (!request) {
    return notFoundResponse();
  }

  const html = renderRequestDocumentHtml({
    requestId: request.publicId,
    title: getRequestCatalogTitle(
      request.catalogCode,
      requestTypeLabels[request.type],
    ),
    issuedAt: request.updatedAt,
    profileEntries: getRequestProfileEntries(request.profileSnapshot) ?? [],
    formEntries: getRequestFieldEntries(
      request.catalogCode,
      request.formFields,
    ),
  });
  const headers = new Headers(privateHeaders);
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set(
    "Content-Disposition",
    `attachment; filename="request-${request.publicId}.html"`,
  );

  return new Response(html, { status: 200, headers });
}
