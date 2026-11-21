export type DemoNotificationLogin = "student.alpha" | "student.beta";
export type DemoNotificationKind =
  | "schedule"
  | "request"
  | "deadline"
  | "announcement";

export function getDemoNotificationState(
  login: DemoNotificationLogin,
  kind: DemoNotificationKind,
  now: Date,
  index = 0,
) {
  const daysAgo =
    kind === "schedule"
      ? login === "student.alpha"
        ? 4
        : 6
      : kind === "request"
        ? login === "student.alpha"
          ? 1
          : 0
        : kind === "announcement"
          ? login === "student.alpha"
            ? 7
            : 2
          : index + 2;
  const isRead =
    kind === "schedule"
      ? login === "student.beta"
      : kind === "request"
        ? login === "student.alpha"
        : kind === "announcement"
          ? login === "student.beta"
          : login === "student.alpha"
            ? index < 2
            : index >= 2;
  const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  return {
    date: createdAt,
    createdAt,
    readAt: isRead ? new Date(createdAt.getTime() + 60_000) : null,
    isRead,
  };
}
