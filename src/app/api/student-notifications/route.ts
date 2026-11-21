import { assertSameSiteRequest, getCurrentUser } from "@/lib/auth";
import {
  countUnreadStudentNotifications,
  getStudentNotifications,
  markAllStudentNotificationsRead,
  markStudentNotificationRead,
} from "@/lib/notification-data";
import { isNotificationPublicId } from "@/lib/notification-workflow";

type SessionUser = Awaited<ReturnType<typeof getCurrentUser>>;

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(): Promise<Response> {
  let user: SessionUser;
  try {
    user = await getCurrentUser();
  } catch {
    return Response.json(
      { error: "Internal server error." },
      { status: 500, headers: privateHeaders },
    );
  }
  if (!user) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401, headers: privateHeaders },
    );
  }
  if (user.role !== "STUDENT" || !user.student) {
    return Response.json(
      { error: "Student access required." },
      { status: 403, headers: privateHeaders },
    );
  }

  try {
    const [notifications, unreadCount] = await Promise.all([
      getStudentNotifications(user.student.id),
      countUnreadStudentNotifications(user.student.id),
    ]);
    return Response.json(
      {
        notifications: notifications.map((notification) => ({
          ...notification,
          createdAt: notification.createdAt.toISOString(),
          readAt: notification.readAt?.toISOString() ?? null,
        })),
        unreadCount,
      },
      { headers: privateHeaders },
    );
  } catch {
    return Response.json(
      { error: "Internal server error." },
      { status: 500, headers: privateHeaders },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    await assertSameSiteRequest();
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid request origin.") {
      return Response.json(
        { error: "Некорректный запрос." },
        { status: 400, headers: privateHeaders },
      );
    }
    return Response.json(
      { error: "Internal server error." },
      { status: 500, headers: privateHeaders },
    );
  }

  let user: SessionUser;
  try {
    user = await getCurrentUser();
  } catch {
    return Response.json(
      { error: "Internal server error." },
      { status: 500, headers: privateHeaders },
    );
  }
  if (!user) {
    return Response.json(
      { error: "Authentication required." },
      { status: 401, headers: privateHeaders },
    );
  }
  if (user.role !== "STUDENT" || !user.student) {
    return Response.json(
      { error: "Student access required." },
      { status: 403, headers: privateHeaders },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Некорректный запрос." },
      { status: 400, headers: privateHeaders },
    );
  }
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return Response.json(
      { error: "Некорректный запрос." },
      { status: 400, headers: privateHeaders },
    );
  }

  const payload = body as Record<string, unknown>;
  try {
    if (payload.all === true) {
      await markAllStudentNotificationsRead(user.student.id);
    } else if (
      typeof payload.publicId === "string" &&
      isNotificationPublicId(payload.publicId)
    ) {
      await markStudentNotificationRead(payload.publicId, user.student.id);
    } else {
      return Response.json(
        { error: "Некорректное уведомление." },
        { status: 400, headers: privateHeaders },
      );
    }

    const unreadCount = await countUnreadStudentNotifications(user.student.id);
    return Response.json({ unreadCount }, { headers: privateHeaders });
  } catch {
    return Response.json(
      { error: "Internal server error." },
      { status: 500, headers: privateHeaders },
    );
  }
}
