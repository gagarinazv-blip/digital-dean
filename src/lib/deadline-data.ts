import "server-only";

import type { DeadlineProgressStatus } from "@/generated/prisma/enums";
import {
  getDefaultDeadlineChecklist,
  readDeadlineChecklist,
  setChecklistItemDone,
  type DeadlineChecklistItem,
} from "@/lib/deadline-progress";
import { getPrisma } from "@/lib/prisma";
import { getNearestDeadlines } from "@/lib/deadline-utils";

export async function getStudentDeadlines(studentId: number) {
  return getPrisma().deadline.findMany({
    where: { studentId },
    orderBy: [{ dueAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      subject: true,
      title: true,
      dueAt: true,
      status: true,
      description: true,
    },
  });
}

export async function getNearestStudentDeadlines(
  studentId: number,
  limit = 5,
) {
  const deadlines = await getPrisma().deadline.findMany({
    where: { studentId, status: "OPEN" },
    orderBy: [{ dueAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      subject: true,
      title: true,
      dueAt: true,
      status: true,
      description: true,
    },
  });

  return getNearestDeadlines(deadlines, limit);
}

// Чужой и несуществующий дедлайн неотличимы: в обоих случаях null.
export async function getStudentDeadline(
  deadlineId: string,
  studentId: number,
) {
  const deadline = await getPrisma().deadline.findFirst({
    where: { id: deadlineId, studentId },
    select: {
      id: true,
      subject: true,
      title: true,
      topic: true,
      description: true,
      format: true,
      dueAt: true,
      status: true,
      taskUrl: true,
      location: true,
      criteria: true,
      disciplineId: true,
      materials: {
        orderBy: [{ uploadedAt: "desc" }, { id: "asc" }],
        select: {
          id: true,
          title: true,
          kind: true,
          url: true,
          fileName: true,
          sizeBytes: true,
          uploadedByName: true,
          uploadedByRole: true,
          uploadedAt: true,
        },
      },
      progress: {
        where: { studentId },
        select: { status: true, checklist: true },
      },
    },
  });
  if (!deadline) return null;

  const { progress, ...details } = deadline;
  return {
    ...details,
    progress: {
      status: progress[0]?.status ?? ("NOT_STARTED" as const),
      checklist: readDeadlineChecklist(
        progress[0]?.checklist,
        deadline.format,
      ),
    },
  };
}

export async function getStudentDeadlineMaterialFile(
  materialId: string,
  studentId: number,
) {
  return getPrisma().deadlineMaterial.findFirst({
    where: { id: materialId, deadline: { studentId } },
    select: { fileName: true, mediaType: true, data: true },
  });
}

async function updateStudentDeadlineProgress(
  deadlineId: string,
  studentId: number,
  change: (current: { checklist: DeadlineChecklistItem[] }) => {
    status?: DeadlineProgressStatus;
    checklist?: DeadlineChecklistItem[];
  } | null,
): Promise<boolean> {
  return getPrisma().$transaction(async (tx) => {
    const deadline = await tx.deadline.findFirst({
      where: { id: deadlineId, studentId },
      select: { format: true },
    });
    if (!deadline) return false;

    // Запись блокируется до конца транзакции, чтобы соседние отметки не терялись.
    const progress = await tx.deadlineProgress.upsert({
      where: { deadlineId_studentId: { deadlineId, studentId } },
      create: {
        deadlineId,
        studentId,
        checklist: getDefaultDeadlineChecklist(deadline.format),
      },
      update: { studentId },
      select: { id: true, checklist: true },
    });
    const data = change({
      checklist: readDeadlineChecklist(progress.checklist, deadline.format),
    });
    if (!data) return false;
    await tx.deadlineProgress.update({ where: { id: progress.id }, data });
    return true;
  });
}

export function setStudentDeadlineStatus(
  deadlineId: string,
  studentId: number,
  status: DeadlineProgressStatus,
) {
  return updateStudentDeadlineProgress(deadlineId, studentId, () => ({
    status,
  }));
}

export function setStudentDeadlineChecklistItem(
  deadlineId: string,
  studentId: number,
  itemId: string,
  done: boolean,
) {
  return updateStudentDeadlineProgress(
    deadlineId,
    studentId,
    ({ checklist }) => {
      const updated = setChecklistItemDone(checklist, itemId, done);
      return updated ? { checklist: updated } : null;
    },
  );
}
