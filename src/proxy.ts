import { NextResponse, type NextRequest } from "next/server";
import { getSessionPrincipalForToken } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import {
  canStaffAccessRequest,
  parsePositiveIntegerId,
} from "@/lib/request-workflow";

const SESSION_COOKIE = "digital-dean-session";

function notFoundResponse(): Response {
  return new Response(null, {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isStaffArea = pathname === "/staff" || pathname.startsWith("/staff/");
  const loginUrl = isStaffArea
    ? "/login?role=staff"
    : "/login?role=student";
  if (pathname === "/staff/login") {
    return NextResponse.redirect(new URL("/login?role=staff", request.url));
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL(loginUrl, request.url));
  }

  const principal = await getSessionPrincipalForToken(token);
  if (!principal) {
    return NextResponse.redirect(new URL(loginUrl, request.url));
  }

  if (principal.requiresPasswordSetup) {
    return NextResponse.redirect(
      new URL("/login?role=student&step=password", request.url),
    );
  }

  const requiredRole = isStaffArea ? "STAFF" : "STUDENT";
  if (principal.role !== requiredRole) {
    if (
      pathname.startsWith("/api/") ||
      (request.method !== "GET" && request.method !== "HEAD")
    ) {
      return new Response("403 — Доступ запрещён", {
        status: 403,
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    const destination = principal.role === "STAFF" ? "/staff" : "/";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  const staffRequestPath = pathname.match(/^\/staff\/requests\/([^/]+)$/);
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
    if (
      !staffRequest ||
      (!staff.isSupervisor && !canStaffAccessRequest(staff, staffRequest))
    ) {
      return notFoundResponse();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/digest/:path*",
    "/documents/:path*",
    "/grades/:path*",
    "/help/:path*",
    "/notifications/:path*",
    "/profile/:path*",
    "/requests/:path*",
    "/schedule/:path*",
    "/staff/:path*",
  ],
};
