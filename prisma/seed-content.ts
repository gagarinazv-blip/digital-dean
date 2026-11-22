import "dotenv/config";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { getMoscowDateKey } from "../src/lib/campus-time";
import { getDefaultDeadlineChecklist } from "../src/lib/deadline-progress";
import { addDemoDays, getDemoNow } from "../src/lib/demo-date";
import { getContentDate, getContentWeekDate } from "./content/dates";
import { digestContent } from "./content/digest";
import { opportunityContent } from "./content/opportunities";
import {
  achievementContent,
  announcementContent,
  applicationContent,
  bookmarkContent,
  deadlineContent,
  documentContent,
} from "./content/student-life";

/*
 * Наполняет разделы содержанием. Только добавляет: запись с таким же названием
 * не трогается, поэтому правки сотрудников и студентов не теряются, а повторный
 * запуск ничего не дублирует.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Не задан DATABASE_URL.");
if (process.env.NODE_ENV === "production") {
  throw new Error("Наполнение не предназначено для рабочей базы.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const uploadDirectory = path.resolve(process.env.UPLOAD_DIR ?? "./storage/uploads");
const savedFiles: string[] = [];

async function storeFile(fileName: string, title: string) {
  const data = await readFile(path.join(process.cwd(), "prisma", "content", "files", fileName));
  const storedName = `${randomUUID()}.pdf`;
  await mkdir(uploadDirectory, { recursive: true, mode: 0o700 });
  await writeFile(path.join(uploadDirectory, storedName), data, { flag: "wx", mode: 0o600 });
  savedFiles.push(storedName);
  return {
    storedName,
    originalName: `${title}.pdf`,
    mimeType: "application/pdf",
    size: data.byteLength,
  };
}

const statusNames = {
  SUBMITTED: "подана",
  IN_REVIEW: "на рассмотрении",
  NEEDS_INFO: "нужны данные",
  ACCEPTED: "принята",
  REJECTED: "отклонена",
  WITHDRAWN: "отозвана",
} as const;

async function seed(tx: Prisma.TransactionClient) {
  const now = getDemoNow();
  const created: Record<string, number> = {};
  const count = (key: string) => {
    created[key] = (created[key] ?? 0) + 1;
  };

  const author = await tx.user.findFirst({
    where: { role: "STAFF" },
    orderBy: [{ staffProfile: { isSupervisor: "desc" } }, { id: "asc" }],
    select: { id: true },
  });
  if (!author) throw new Error("Нет ни одной учётной записи сотрудника.");
  const students = new Map(
    (
      await tx.student.findMany({
        where: { user: { login: { in: ["student.alpha", "student.beta"] } } },
        select: {
          id: true,
          userId: true,
          fullName: true,
          faculty: true,
          course: true,
          group: { select: { name: true } },
          user: { select: { login: true } },
        },
      })
    ).map((student) => [student.user.login, student]),
  );

  // Дайджест
  for (const event of digestContent) {
    if (await tx.event.findFirst({ where: { title: event.title }, select: { id: true } })) continue;
    const startsAt = event.from
      ? getContentWeekDate(now, event.week, event.day, event.from)
      : null;
    const endsAt =
      event.from && event.to
        ? getContentWeekDate(
            now,
            event.week,
            event.to < event.from ? event.day + 1 : event.day,
            event.to,
          )
        : null;
    const dateKey = getMoscowDateKey(
      getContentWeekDate(now, event.week, event.day, "12:00"),
    );
    const [speaker, room, time] = event.approvals ?? [
      "APPROVED",
      "APPROVED",
      "APPROVED",
    ];
    await tx.event.create({
      data: {
        title: event.title,
        type: event.type,
        description: event.description,
        eventDate: new Date(`${dateKey}T00:00:00.000Z`),
        startsAt,
        endsAt,
        location: event.location,
        host: event.host,
        status: event.status ?? "PUBLISHED",
        speakerApproval: speaker,
        roomApproval: room,
        timeApproval: time,
        speakerApprovalNote: event.note ?? null,
        createdById: author.id,
      },
    });
    count("события дайджеста");
  }

  // Возможности
  const opportunityIds = new Map<string, number>();
  for (const item of opportunityContent) {
    const existing = await tx.opportunity.findFirst({
      where: { title: item.title },
      select: { id: true },
    });
    if (existing) {
      opportunityIds.set(item.title, existing.id);
      continue;
    }
    const deadline = getContentDate(now, item.deadlineInDays, "23:59");
    const opportunity = await tx.opportunity.create({
      data: {
        type: item.type,
        title: item.title,
        organizer: item.organizer,
        shortDescription: item.shortDescription,
        description: item.description,
        requirements: item.requirements,
        deadline,
        allowLateRequests: item.lateDays !== undefined,
        lateRequestsUntil:
          item.lateDays === undefined ? null : addDemoDays(item.lateDays, deadline),
        directions: item.directions,
        minCourse: item.minCourse ?? null,
        format: item.format ?? "OFFLINE",
        location: item.location ?? null,
        startsAt: item.span ? getContentDate(now, item.span[0], item.span[1]) : null,
        endsAt: item.span ? getContentDate(now, item.span[2], item.span[3]) : null,
        cost: item.cost ?? "FREE",
        costNote: item.costNote ?? null,
        requiredDocuments: item.documents ?? [],
        details: item.details,
        status: item.status ?? "PUBLISHED",
        createdById: author.id,
      },
      select: { id: true },
    });
    opportunityIds.set(item.title, opportunity.id);
    count("возможности");
  }

  // Заявки на участие и уведомления о них
  for (const item of applicationContent) {
    const student = students.get(item.login);
    const opportunityId = opportunityIds.get(item.opportunity);
    if (!student || !opportunityId) continue;
    const existing = await tx.opportunityApplication.findFirst({
      where: { studentId: student.id, opportunityId },
      select: { id: true },
    });
    if (existing) continue;
    const isDecided = item.status === "ACCEPTED" || item.status === "REJECTED";
    const application = await tx.opportunityApplication.create({
      data: {
        opportunityId,
        studentId: student.id,
        kind: item.kind ?? "STANDARD",
        status: item.status,
        motivation: item.motivation,
        lateReason: item.lateReason ?? null,
        details: item.details ?? {},
        studentSnapshot: {
          fullName: student.fullName,
          groupName: student.group.name,
          course: student.course,
          faculty: student.faculty,
        },
        staffComment: item.staffComment ?? null,
        decidedById: isDecided ? author.id : null,
        submittedAt: addDemoDays(-item.submittedDaysAgo, now),
      },
      select: { publicId: true },
    });
    count("заявки на участие");
    if (item.status !== "SUBMITTED" && item.status !== "WITHDRAWN") {
      const createdAt = addDemoDays(-Math.floor(item.submittedDaysAgo / 2), now);
      await tx.notification.create({
        data: {
          studentId: student.id,
          type: "OPPORTUNITY_STATUS",
          title: "Статус заявки на участие изменён",
          text: `Статус заявки на «${item.opportunity}»: ${statusNames[item.status]}.`,
          targetType: "OPPORTUNITY_APPLICATION",
          targetId: application.publicId,
          date: createdAt,
          createdAt,
          ...(item.submittedDaysAgo > 10 ? { isRead: true, readAt: createdAt } : {}),
        },
      });
      count("уведомления");
    }
  }

  // Избранное
  for (const [login, titles] of Object.entries(bookmarkContent)) {
    const student = students.get(login);
    if (!student) continue;
    for (const title of titles) {
      const opportunityId = opportunityIds.get(title);
      if (!opportunityId) continue;
      const existing = await tx.opportunityBookmark.findFirst({
        where: { studentId: student.id, opportunityId },
      });
      if (existing) continue;
      await tx.opportunityBookmark.create({ data: { studentId: student.id, opportunityId } });
      count("избранное");
    }
  }

  // Достижения
  for (const item of achievementContent) {
    const student = students.get(item.login);
    if (!student) continue;
    const existing = await tx.portfolioItem.findFirst({
      where: { studentId: student.id, title: item.title },
      select: { id: true },
    });
    if (existing) continue;
    let folderId: number | null = null;
    if (item.folder) {
      const normalizedName = item.folder.toLocaleLowerCase("ru-RU");
      const folder = await tx.portfolioFolder.upsert({
        where: { studentId_normalizedName: { studentId: student.id, normalizedName } },
        create: { studentId: student.id, name: item.folder, normalizedName },
        update: {},
        select: { id: true },
      });
      folderId = folder.id;
    }
    const eventDate = addDemoDays(-item.daysAgo, now);
    await tx.portfolioItem.create({
      data: {
        studentId: student.id,
        folderId,
        title: item.title,
        category: item.category,
        eventName: item.eventName,
        eventDate: new Date(eventDate.toISOString().slice(0, 10)),
        role: item.role,
        description: item.description,
        source: item.source,
        uploadedById: item.source === "STAFF" ? author.id : student.userId,
        ...(await storeFile(item.file, item.fileTitle)),
        createdAt: addDemoDays(-Math.max(0, item.daysAgo - 2), now),
      },
    });
    count("достижения");
  }

  // Мои документы
  for (const item of documentContent) {
    const student = students.get(item.login);
    if (!student) continue;
    const existing = await tx.studentDocument.findFirst({
      where: { studentId: student.id, title: item.title },
      select: { id: true },
    });
    if (existing) continue;
    await tx.studentDocument.create({
      data: {
        studentId: student.id,
        title: item.title,
        documentType: item.documentType,
        ...(await storeFile(item.file, item.fileTitle)),
      },
    });
    count("документы");
  }

  // Задания
  for (const item of deadlineContent) {
    const student = students.get(item.login);
    if (!student) continue;
    const existing = await tx.deadline.findFirst({
      where: { studentId: student.id, subject: item.subject, title: item.title },
      select: { id: true },
    });
    if (existing) continue;
    const discipline = await tx.academicPlanItem.findUnique({
      where: { id: item.disciplineId },
      select: { id: true },
    });
    await tx.deadline.create({
      data: {
        studentId: student.id,
        subject: item.subject,
        title: item.title,
        topic: item.topic,
        description: item.description,
        format: item.format,
        status: item.status,
        dueAt: getContentDate(now, item.inDays, item.time),
        location: item.location ?? null,
        criteria: [...item.criteria],
        disciplineId: discipline?.id ?? null,
        progress: {
          create: {
            studentId: student.id,
            status: item.progress.status,
            checklist: getDefaultDeadlineChecklist(item.format).map((step, index) => ({
              ...step,
              done: index < item.progress.doneSteps,
            })),
          },
        },
      },
    });
    count("задания");
  }

  // Объявления
  for (const student of students.values()) {
    for (const item of announcementContent) {
      const existing = await tx.notification.findFirst({
        where: { studentId: student.id, type: "ANNOUNCEMENT", title: item.title },
        select: { id: true },
      });
      if (existing) continue;
      const createdAt = new Date(now.getTime() - item.hoursAgo * 60 * 60 * 1000);
      await tx.notification.create({
        data: {
          studentId: student.id,
          type: "ANNOUNCEMENT",
          title: item.title,
          text: item.text,
          date: createdAt,
          createdAt,
          isRead: item.isRead,
          readAt: item.isRead ? createdAt : null,
        },
      });
      count("уведомления");
    }
  }

  return created;
}

async function main() {
  try {
    const created = await prisma.$transaction(seed, { timeout: 60_000 });
    console.log(Object.keys(created).length ? "Добавлено:" : "Всё уже на месте, добавлять нечего.");
    for (const [name, total] of Object.entries(created)) console.log(`  ${name}: ${total}`);
  } catch (error) {
    // Записи в базу откатились — убираем и файлы, на которые никто не ссылается.
    await Promise.all(
      savedFiles.map((name) => unlink(path.join(uploadDirectory, name)).catch(() => {})),
    );
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Не удалось наполнить разделы:", error);
  process.exitCode = 1;
});
