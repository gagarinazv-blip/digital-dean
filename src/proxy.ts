import { NextResponse, type NextRequest } from "next/server";
import { getSessionPrincipalForToken } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import {
  canStaffAccessRequest,
  parsePositiveIntegerId,
} from "@/lib/request-workflow";

const SESSION_COOKIE = "digital-dean-session";

function getLoginPath(pathname: string): string {
  return pathname === "/staff" || pathname.startsWith("/staff/")
    ? "/staff/login"
    : "/login";
}

function notFoundResponse(): Response {
  return new Response(null, {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function proxy(request: NextRequest) {
  const loginPath = getLoginPath(request.nextUrl.pathname);
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  const principal = await getSessionPrincipalForToken(token);
  if (!principal) {
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  const requiredRole =
    request.nextUrl.pathname === "/staff" ||
    request.nextUrl.pathname.startsWith("/staff/")
      ? "STAFF"
      : "STUDENT";
  if (principal.role !== requiredRole) {
    return new Response("403 — Доступ запрещён", {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  const studentRequestPath = request.nextUrl.pathname.match(
    /^\/requests\/([^/]+)$/,
  );
  if (studentRequestPath && studentRequestPath[1] !== "new") {
    const requestId = parsePositiveIntegerId(studentRequestPath[1]);
    if (requestId === null || principal.studentId === null) {
      return notFoundResponse();
    }

    const ownedRequest = await getPrisma().request.findFirst({
      where: { id: requestId, studentId: principal.studentId },
      select: { id: true },
    });
    if (!ownedRequest) {
      return notFoundResponse();
    }
  }

  const staffRequestPath = request.nextUrl.pathname.match(
    /^\/staff\/requests\/([^/]+)$/,
  );
  if (staffRequestPath) {
    const requestId = parsePositiveIntegerId(staffRequestPath[1]);
    const staff = principal.staffProfile;
    if (requestId === null || !staff) {
      return notFoundResponse();
    }

    const staffRequest = await getPrisma().request.findUnique({
      where: { id: requestId },
      select: { assignedToId: true, type: true },
    });
    if (!staffRequest || !canStaffAccessRequest(staff, staffRequest)) {
      return notFoundResponse();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/grades/:path*",
    "/help/:path*",
    "/notifications/:path*",
    "/profile/:path*",
    "/requests/:path*",
    "/schedule/:path*",
    "/staff/:path*",
  ],
};
