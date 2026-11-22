import "server-only";

import { getCurrentUser } from "@/lib/auth";

export const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

export function privateNotFound(): Response {
  return new Response(null, { status: 404, headers: privateHeaders });
}

// Возвращает id студента текущей сессии или готовый ответ с отказом.
export async function authorizeStudentRequest(): Promise<number | Response> {
  const user = await getCurrentUser();
  if (!user || user.requiresPasswordSetup) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401, headers: privateHeaders },
    );
  }
  return user.role === "STUDENT" && user.student
    ? user.student.id
    : privateNotFound();
}
