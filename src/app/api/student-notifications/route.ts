import { assertSameSiteRequest } from "@/lib/auth";
import {
  countUnreadStudentNotifications,
  getStudentNotifications,
  markAllStudentNotificationsRead,
  markStudentNotificationRead,
} from "@/lib/notification-data";
import { isNotificationPublicId } from "@/lib/notification-workflow";
import { requireStudentContext } from "@/lib/student";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(): Promise<Response> {
  try {
    const { student } = await requireStudentContext();
    const [notifications, unreadCount] = await Promise.all([
      getStudentNotifications(student.id),
      countUnreadStudentNotifications(student.id),
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
      { error: "Authentication required." },
      { status: 401, headers: privateHeaders },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    await assertSameSiteRequest();
    const { student } = await requireStudentContext();
    const body = (await request.json()) as {
      publicId?: unknown;
      all?: unknown;
    };

    if (body.all === true) {
      await markAllStudentNotificationsRead(student.id);
    } else if (
      typeof body.publicId === "string" &&
      isNotificationPublicId(body.publicId)
    ) {
      await markStudentNotificationRead(body.publicId, student.id);
    } else {
      return Response.json(
        { error: "Некорректное уведомление." },
        { status: 400, headers: privateHeaders },
      );
    }

    const unreadCount = await countUnreadStudentNotifications(student.id);
    return Response.json({ unreadCount }, { headers: privateHeaders });
  } catch (error) {
    if (
      error instanceof SyntaxError ||
      (error instanceof Error &&
        error.message === "Invalid request origin.")
    ) {
      return Response.json(
        { error: "Некорректный запрос." },
        { status: 400, headers: privateHeaders },
      );
    }
    return Response.json(
      { error: "Authentication required." },
      { status: 401, headers: privateHeaders },
    );
  }
}
