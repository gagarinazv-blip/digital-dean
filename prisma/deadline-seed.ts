import { readFileSync } from "node:fs";
import path from "node:path";
import type { Prisma } from "../src/generated/prisma/client";
import { UNIVERSITY_TIME_ZONE } from "../src/lib/campus-time";
import { getDefaultDeadlineChecklist } from "../src/lib/deadline-progress";
import { addDemoDays } from "../src/lib/demo-date";
import {
  buildDeadlineSeedData,
  getDeadlineSeedSyncPlan,
  type DeadlineMaterialFixture,
} from "./deadline-seed-data";
import { getDemoNotificationState } from "./notification-seed-data";

const mediaTypes: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function readMaterialFile(fixture: DeadlineMaterialFixture) {
  if (!fixture.fileName) return { url: fixture.url };
  const mediaType = mediaTypes[path.extname(fixture.fileName)];
  if (!mediaType) {
    throw new Error(`Unsupported demo material "${fixture.fileName}".`);
  }
  const data = new Uint8Array(
    readFileSync(
      path.join(process.cwd(), "prisma", "demo-materials", fixture.fileName),
    ),
  );
  return {
    fileName: fixture.fileName,
    mediaType,
    sizeBytes: data.byteLength,
    data,
  };
}

// Только добавляет и обновляет демо-дедлайны: существующие записи, отметки
// студента и прочитанные уведомления не удаляются и не сбрасываются.
export async function syncDeadlineSeed(
  tx: Prisma.TransactionClient,
  studentIds: ReadonlyMap<string, number>,
  now: Date,
): Promise<void> {
  const notificationIndexes = new Map<string, number>();

  for (const fixture of buildDeadlineSeedData(now)) {
    const studentId = studentIds.get(fixture.login);
    if (studentId === undefined) {
      throw new Error(`Deadline student "${fixture.login}" is missing.`);
    }
    const discipline = await tx.academicPlanItem.findFirst({
      where: {
        name: fixture.subject,
        semester: { studentId, isCurrent: true },
      },
      select: { id: true },
    });
    const details = {
      disciplineId: discipline?.id ?? null,
      topic: fixture.topic ?? null,
      description: fixture.description,
      format: fixture.format ?? "ONLINE",
      taskUrl: fixture.taskUrl ?? null,
      location: fixture.location ?? null,
      criteria: [...(fixture.criteria ?? [])],
    };

    const existing = await tx.deadline.findMany({
      where: { studentId, subject: fixture.subject, title: fixture.title },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, status: true },
    });
    const syncPlan = getDeadlineSeedSyncPlan(existing);
    if (syncPlan.openDeadlineIds.length > 0) {
      await tx.deadline.updateMany({
        where: { id: { in: syncPlan.openDeadlineIds } },
        data: { dueAt: fixture.dueAt },
      });
    }
    const { id: deadlineId } = syncPlan.deadlineId
      ? await tx.deadline.update({
          where: { id: syncPlan.deadlineId },
          data: details,
          select: { id: true },
        })
      : await tx.deadline.create({
          data: {
            ...details,
            studentId,
            subject: fixture.subject,
            title: fixture.title,
            dueAt: fixture.dueAt,
            createdAt: now,
          },
          select: { id: true },
        });

    for (const material of fixture.materials ?? []) {
      const known = await tx.deadlineMaterial.findFirst({
        where: { deadlineId, title: material.title },
        select: { id: true },
      });
      if (known) continue;
      const uploader = material.uploadedByLogin
        ? await tx.staffProfile.findFirst({
            where: { user: { login: material.uploadedByLogin } },
            select: { id: true },
          })
        : null;
      await tx.deadlineMaterial.create({
        data: {
          deadlineId,
          title: material.title,
          kind: material.kind,
          ...readMaterialFile(material),
          uploadedById: uploader?.id ?? null,
          uploadedByName: material.uploadedByName,
          uploadedByRole: material.uploadedByRole,
          uploadedAt: addDemoDays(-material.uploadedDaysAgo, now),
        },
      });
    }

    if (fixture.progress) {
      const { status, doneSteps } = fixture.progress;
      await tx.deadlineProgress.upsert({
        where: { deadlineId_studentId: { deadlineId, studentId } },
        update: {},
        create: {
          deadlineId,
          studentId,
          status,
          checklist: getDefaultDeadlineChecklist(details.format).map(
            (item, index) => ({ ...item, done: index < doneSteps }),
          ),
        },
      });
    }

    const index = notificationIndexes.get(fixture.login) ?? 0;
    notificationIndexes.set(fixture.login, index + 1);
    const notified = await tx.notification.findFirst({
      where: {
        studentId,
        type: "DEADLINE",
        targetType: "DEADLINE",
        targetId: deadlineId,
      },
      select: { id: true },
    });
    if (notified) continue;
    await tx.notification.create({
      data: {
        studentId,
        type: "DEADLINE",
        title: `Срок сдачи: ${fixture.title}`,
        text: `${fixture.subject}. Срок: ${fixture.dueAt.toLocaleDateString("ru-RU", { timeZone: UNIVERSITY_TIME_ZONE })}.`,
        targetType: "DEADLINE",
        targetId: deadlineId,
        ...getDemoNotificationState(fixture.login, "deadline", now, index),
      },
    });
  }
}
