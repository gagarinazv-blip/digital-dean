import { assertSameSiteRequest, getCurrentUser } from "@/lib/auth";
import {
  countUnreadStudentNotifications,
  getStudentNotification,
  getStudentNotificationPage,
  getStudentNotificationsByPublicIds,
  markAllStudentNotificationsRead,
  markStudentNotificationReadState,
  markStudentNotificationsReadState,
  studentOwnsNotificationCursor,
} from "@/lib/notification-data";
import { isNotificationPublicId } from "@/lib/notification-workflow";
import { presentStudentNotifications } from "@/lib/notification-presentation";

type SessionUser = Awaited<ReturnType<typeof getCurrentUser>>;

const privateHeaders = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

function isStudentNotificationIds(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 100 &&
    value.every(
      (publicId): publicId is string =>
        typeof publicId === "string" && isNotificationPublicId(publicId),
    ) &&
    new Set(value).size === value.length
  );
}

export async function GET(
  request: Request = new Request("http://localhost/api/student-notifications"),
): Promise<Response> {
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
    const url = new URL(request.url);
    const rawPublicId = url.searchParams.get("publicId");
    if (rawPublicId !== null) {
      if (!isNotificationPublicId(rawPublicId)) {
        return Response.json(
          { error: "Некорректное уведомление." },
          { status: 400, headers: privateHeaders },
        );
      }
      const notification = await getStudentNotification(
        rawPublicId,
        user.student.id,
      );
      if (!notification?.type) {
        return Response.json(
          { error: "Уведомление не найдено." },
          { status: 404, headers: privateHeaders },
        );
      }
      const [presented] = await presentStudentNotifications(
        [notification],
        user.student.id,
        user.student.group.id,
      );
      if (!presented) {
        return Response.json(
          { error: "Уведомление не найдено." },
          { status: 404, headers: privateHeaders },
        );
      }
      return Response.json({ notification: presented }, { headers: privateHeaders });
    }
    const rawLimit = url.searchParams.get("limit");
    const rawCursor = url.searchParams.get("cursor");
    const limit = rawLimit === null ? 20 : Number(rawLimit);
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 50 ||
      (rawCursor !== null && !isNotificationPublicId(rawCursor))
    ) {
      return Response.json(
        { error: "Некорректный запрос." },
        { status: 400, headers: privateHeaders },
      );
    }
    if (
      rawCursor &&
      !(await studentOwnsNotificationCursor(rawCursor, user.student.id))
    ) {
      return Response.json(
        { error: "Уведомление не найдено." },
        { status: 404, headers: privateHeaders },
      );
    }
    const page = await getStudentNotificationPage(
      user.student.id,
      limit,
      rawCursor ? { publicId: rawCursor } : undefined,
    );
    const notifications = await presentStudentNotifications(
      page.notifications,
      user.student.id,
      user.student.group.id,
    );
    return Response.json(
      {
        ...page,
        notifications,
        typeCounts: {
          SCHEDULE_CHANGE: page.typeCounts.SCHEDULE_CHANGE ?? 0,
          DEADLINE: page.typeCounts.DEADLINE ?? 0,
          REQUEST_STATUS: page.typeCounts.REQUEST_STATUS ?? 0,
          ANNOUNCEMENT: page.typeCounts.ANNOUNCEMENT ?? 0,
          OPPORTUNITY_STATUS: page.typeCounts.OPPORTUNITY_STATUS ?? 0,
        },
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
      if (payload.read !== undefined && payload.read !== true) {
        return Response.json(
          { error: "Некорректный запрос." },
          { status: 400, headers: privateHeaders },
        );
      }
      await markAllStudentNotificationsRead(user.student.id);
    } else if (typeof payload.publicId === "string") {
      if (
        !isNotificationPublicId(payload.publicId) ||
        (payload.read !== undefined && typeof payload.read !== "boolean")
      ) {
        return Response.json(
          { error: "Некорректное уведомление." },
          { status: 400, headers: privateHeaders },
        );
      }
      const read = payload.read !== false;
      const owned = await getStudentNotificationsByPublicIds(
        [payload.publicId],
        user.student.id,
      );
      if (owned.length === 0) {
        return Response.json(
          { error: "Уведомление не найдено." },
          { status: 404, headers: privateHeaders },
        );
      }
      await markStudentNotificationReadState(
        payload.publicId,
        user.student.id,
        read,
      );
    } else if (Array.isArray(payload.publicIds)) {
      if (
        !isStudentNotificationIds(payload.publicIds) ||
        typeof payload.read !== "boolean"
      ) {
        return Response.json(
          { error: "Некорректный список уведомлений." },
          { status: 400, headers: privateHeaders },
        );
      }
      const publicIds = payload.publicIds;
      const owned = await getStudentNotificationsByPublicIds(
        publicIds,
        user.student.id,
      );
      if (owned.length !== publicIds.length) {
        return Response.json(
          { error: "Уведомление не найдено." },
          { status: 404, headers: privateHeaders },
        );
      }
      await markStudentNotificationsReadState(
        publicIds,
        user.student.id,
        payload.read,
      );
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
