import { getCalendarDayDifference } from "@/lib/date-stack";

export type TaskGroupKey = "overdue" | "week" | "later";

export const taskGroupTitles: Record<TaskGroupKey, string> = {
  overdue: "Просрочено",
  week: "Ближайшие 7 дней",
  later: "Позже",
};

const order: readonly TaskGroupKey[] = ["overdue", "week", "later"];

export function getTaskGroup(dueAt: Date, now: Date): TaskGroupKey {
  if (dueAt.getTime() < now.getTime()) return "overdue";
  return getCalendarDayDifference(dueAt, now) < 7 ? "week" : "later";
}

/** Актуальные задания по срокам; сданные отдельно, свежие сверху. */
export function groupTasks<
  T extends { dueAt: Date; status: "OPEN" | "SUBMITTED" },
>(tasks: readonly T[], now: Date) {
  const open = tasks
    .filter((task) => task.status === "OPEN")
    .sort((first, second) => first.dueAt.getTime() - second.dueAt.getTime());
  return {
    groups: order
      .map((key) => ({
        key,
        title: taskGroupTitles[key],
        tasks: open.filter((task) => getTaskGroup(task.dueAt, now) === key),
      }))
      .filter((group) => group.tasks.length > 0),
    submitted: tasks
      .filter((task) => task.status === "SUBMITTED")
      .sort((first, second) => second.dueAt.getTime() - first.dueAt.getTime()),
  };
}
