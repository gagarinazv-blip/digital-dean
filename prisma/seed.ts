import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Prisma } from "../src/generated/prisma/client";
import type { RequestStatus } from "../src/generated/prisma/enums";
import {
  academicRecordsSeedData,
  shiftAcademicRecordDate,
} from "./academic-records-seed-data";
import { buildTargetScheduleSeed } from "./schedule-seed-data";
import { syncDeadlineSeed } from "./deadline-seed";
import { getDemoNotificationState } from "./notification-seed-data";
import { getDemoNow } from "../src/lib/demo-date";
import {
  getMoscowCalendarWeek,
  getMoscowDateKey,
  UNIVERSITY_TIME_ZONE,
} from "../src/lib/campus-time";
import { getSessionNotificationPlan } from "../src/lib/session-utils";
import { encryptCorporateMailPassword } from "../src/lib/corporate-mail-credentials";
import { getCorporateMailDomain } from "../src/lib/corporate-mail";
import { validateGradebookSeedData } from "../src/lib/gradebook-data";
import {
  demoAcademicStudentCredentials,
  demoStaffAccounts,
  testSeedStudentAccounts,
  type DemoStudentSeedAccount,
} from "./demo-account-data";
import { opportunitySeeds } from "./opportunity-seed-data";

const alphaCorporateMailPassword = "Demo-Mail-Alpha-Only-2026!";

type SeedAccount = Omit<DemoStudentSeedAccount, "passwordVariable"> & {
  password: string;
  accountStatus?: "INVITED" | "ACTIVE";
};

const studyFormValues = {
  очная: "FULL_TIME",
  "очно-заочная": "PART_TIME",
  заочная: "CORRESPONDENCE",
} as const;

function academicAccountData(login: string) {
  const student = academicRecordsSeedData.students.find(
    (record) => record.login === login,
  );
  if (!student) {
    throw new Error(`Academic records are missing for "${login}".`);
  }

  return {
    fullName: student.fullName,
    faculty: student.faculty,
    direction: student.direction,
    groupName: student.group,
    course: student.course,
    recordBookNumber: student.recordBookNumber,
    studyForm: studyFormValues[student.studyForm],
  };
}

const environmentAccounts = demoAcademicStudentCredentials.map((account) => ({
  ...account,
  ...academicAccountData(account.login),
}));

const subjects = [
  {
    name: "История вымышленных цивилизаций",
    teacher: "Профессор Лира Северная",
  },
  {
    name: "Основы межзвёздной дипломатии",
    teacher: "Доцент Орест Тихозвёздный",
  },
  {
    name: "Математика параллельных миров",
    teacher: "Профессор Элина Меридиан",
  },
  {
    name: "Языки древнего архипелага",
    teacher: "Доцент Ника Облачная",
  },
  {
    name: "Введение в картографию снов",
    teacher: "Профессор Мирон Лунов",
  },
] as const;

const generalAnnouncements = [
  {
    title: "Общее объявление: учебная неделя",
    text: "Это вымышленное тестовое объявление. Учебная неделя начнётся по расписанию.",
  },
  {
    title: "Общее объявление: библиотека",
    text: "Это вымышленное тестовое объявление. Тестовая библиотека ждёт читателей.",
  },
] as const;

const weekdays = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
] as const;

const scheduleTimes = [
  ["09:00", "10:30"],
  ["11:00", "12:30"],
  ["13:00", "14:30"],
  ["15:00", "16:30"],
  ["17:00", "18:30"],
] as const;

const scheduleKinds = ["LECTURE", "SEMINAR", "PRACTICE"] as const;
const legacyTargetGroupNames = ["DEMO-ALPHA", "DEMO-BETA"] as const;
const legacyAcademicLogins = [
  "student.academic.alpha",
  "student.academic.beta",
] as const;
const legacyAcademicGroupNames = ["TEST-ACADEMIC-31"] as const;

const moscowDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: UNIVERSITY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function getMoscowParts(date: Date): Record<string, number> {
  return Object.fromEntries(
    moscowDateTimeFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
}

function timeOfDay(value: string): Date {
  const [hours, minutes] = value.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes));
}

function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function dateTimeInMoscow(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const wallClockAsUtc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    hours,
    minutes,
  );
  const localParts = getMoscowParts(new Date(wallClockAsUtc));
  const localAsUtc = Date.UTC(
    localParts.year,
    localParts.month - 1,
    localParts.day,
    localParts.hour,
    localParts.minute,
    localParts.second,
  );
  return new Date(wallClockAsUtc - (localAsUtc - wallClockAsUtc));
}

function nextMonday(): Date {
  const date = startOfMoscowDay(new Date());
  const daysUntilMonday = (8 - date.getUTCDay()) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + daysUntilMonday);
  return date;
}

function startOfMoscowDay(date: Date): Date {
  const parts = getMoscowParts(date);
  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day),
  );
}

function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function getGroupId(groupIds: Map<string, number>, name: string): number {
  const id = groupIds.get(name);
  if (id === undefined) {
    throw new Error(`Test group "${name}" was not created.`);
  }
  return id;
}

async function seedPortfolioDemo(prisma: PrismaClient): Promise<void> {
  const demoStaff = await prisma.user.findUnique({
    where: { login: "staff.demo" },
    select: { id: true },
  });
  if (!demoStaff) {
    throw new Error("Portfolio seed staff account is missing.");
  }

  const students = await prisma.student.findMany({
    where: { user: { login: { in: ["student.alpha", "student.beta"] } } },
    select: { id: true, userId: true, user: { select: { login: true } } },
  });
  const studentByLogin = new Map(
    students.map((student) => [student.user.login, student]),
  );
  const fixtures = [
    { login: "student.alpha", folder: "Научные проекты", title: "Сертификат участника научной конференции", category: "SCIENCE", eventName: "Вымышленная конференция по дипломатии", eventDate: "2026-03-15", role: "Участник", source: "STUDENT", kind: "pdf" },
    { login: "student.alpha", folder: "Научные проекты", title: "Диплом олимпиады по международным отношениям", category: "COMPETITION", eventName: "Вымышленная студенческая олимпиада", eventDate: "2026-04-20", role: "Призёр", source: "STAFF", kind: "png" },
    { login: "student.alpha", folder: "Волонтёрство", title: "Сертификат волонтёра проекта «Тёплый город»", category: "VOLUNTEERING", eventName: "Вымышленная городская акция", eventDate: "2025-11-02", role: "Организатор", source: "STUDENT", kind: "pdf" },
    { login: "student.alpha", folder: null, title: "Подтверждение участия в студенческом форуме", category: "OTHER", eventName: "Вымышленный студенческий форум", eventDate: "2025-10-10", role: "Организатор", source: "STAFF", kind: "png" },
    { login: "student.alpha", folder: null, title: "Диплом факультетского шахматного турнира", category: "SPORT", eventName: "Вымышленный шахматный турнир", eventDate: "2025-05-18", role: "Победитель", source: "STUDENT", kind: "pdf" },
    { login: "student.beta", folder: "Творческие работы", title: "Сертификат участника творческого конкурса", category: "CREATIVITY", eventName: "Вымышленный конкурс плаката", eventDate: "2026-02-12", role: "Участник", source: "STUDENT", kind: "png" },
    { login: "student.beta", folder: null, title: "Диплом конкурса студенческих проектов", category: "COMPETITION", eventName: "Вымышленный конкурс проектов", eventDate: "2025-12-05", role: "Призёр", source: "STAFF", kind: "pdf" },
  ] as const;
  const uploadDirectory = resolve(
    process.env.UPLOAD_DIR ?? "./storage/uploads",
  );
  const pdfPlaceholder = Buffer.from(
    "%PDF-1.4\n1 0 obj<<>>\nendobj\ntrailer<<>>\n%%EOF\n",
    "utf8",
  );
  const pngPlaceholder = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );

  for (const login of ["student.alpha", "student.beta"] as const) {
    const student = studentByLogin.get(login);
    if (!student) {
      throw new Error("Portfolio seed student account is missing.");
    }
    const folderNames = [
      ...new Set(
        fixtures
          .filter((fixture) => fixture.login === login && fixture.folder)
          .map((fixture) => fixture.folder as string),
      ),
    ];
    for (const name of folderNames) {
      const normalizedName = name.normalize("NFKC").toLocaleLowerCase("ru-RU");
      await prisma.portfolioFolder.upsert({
        where: {
          studentId_normalizedName: {
            studentId: student.id,
            normalizedName,
          },
        },
        create: { studentId: student.id, name, normalizedName },
        update: {},
      });
    }
  }

  for (const fixture of fixtures) {
    const student = studentByLogin.get(fixture.login);
    if (!student) {
      throw new Error("Portfolio seed student account is missing.");
    }
    const existing = await prisma.portfolioItem.findFirst({
      where: { studentId: student.id, title: fixture.title },
      select: { id: true },
    });
    if (existing) continue;

    const folder = fixture.folder
      ? await prisma.portfolioFolder.findUnique({
          where: {
            studentId_normalizedName: {
              studentId: student.id,
              normalizedName: fixture.folder
                .normalize("NFKC")
                .toLocaleLowerCase("ru-RU"),
            },
          },
          select: { id: true },
        })
      : null;
    const extension = fixture.kind;
    const mimeType =
      extension === "pdf"
        ? "application/pdf"
        : "image/png";
    const storedName = `${randomUUID()}.${extension}`;
    const data = extension === "pdf" ? pdfPlaceholder : pngPlaceholder;
    await mkdir(uploadDirectory, { recursive: true, mode: 0o700 });
    await writeFile(resolve(uploadDirectory, storedName), data, {
      flag: "wx",
      mode: 0o600,
    });
    try {
      await prisma.portfolioItem.create({
        data: {
          studentId: student.id,
          folderId: folder?.id ?? null,
          title: fixture.title,
          category: fixture.category,
          eventName: fixture.eventName,
          eventDate: new Date(`${fixture.eventDate}T00:00:00.000Z`),
          role: fixture.role,
          storedName,
          originalName: `demo-${storedName}`,
          mimeType,
          size: data.length,
          source: fixture.source,
          uploadedById:
            fixture.source === "STAFF" ? demoStaff.id : student.userId,
        },
      });
    } catch (error) {
      try {
        await unlink(resolve(uploadDirectory, storedName));
      } catch {
        console.error("Portfolio seed file cleanup failed.");
      }
      throw error;
    }
  }

  const alpha = studentByLogin.get("student.alpha");
  if (alpha) {
    const documents = [
      ["Паспорт — демонстрационный скан", "PASSPORT", "pdf", pdfPlaceholder],
      ["СНИЛС — демонстрационный скан", "SNILS", "png", pngPlaceholder],
    ] as const;
    for (const [title, documentType, extension, data] of documents) {
      const existing = await prisma.studentDocument.findFirst({
        where: { studentId: alpha.id, title },
        select: { id: true },
      });
      if (existing) continue;
      const storedName = `${randomUUID()}.${extension}`;
      await mkdir(uploadDirectory, { recursive: true, mode: 0o700 });
      await writeFile(resolve(uploadDirectory, storedName), data, {
        flag: "wx",
        mode: 0o600,
      });
      await prisma.studentDocument.create({
        data: {
          studentId: alpha.id,
          title,
          documentType,
          storedName,
          originalName: `demo-${storedName}`,
          mimeType: extension === "pdf" ? "application/pdf" : "image/png",
          size: data.length,
        },
      });
    }
  }
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The test seed cannot be run in production.");
  }

  validateGradebookSeedData(academicRecordsSeedData);

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL must be set before running the test seed.");
  }

  const accounts: SeedAccount[] = [
    ...testSeedStudentAccounts,
    ...environmentAccounts,
  ].map(({ passwordVariable, ...account }) => {
    const password = process.env[passwordVariable];
    if (!password) {
      throw new Error(
        `${passwordVariable} must be set in .env to seed ${account.login}.`,
      );
    }
    return { ...account, password };
  });
  const staffAccounts = demoStaffAccounts.map(
    ({ passwordVariable, ...account }) => {
      const password = process.env[passwordVariable];
      if (!password) {
        throw new Error(
          `${passwordVariable} must be set in .env to seed ${account.login}.`,
        );
      }
      return { ...account, password };
    },
  );
  const managedLogins = [
    ...accounts.map((account) => account.login),
    ...staffAccounts.map((account) => account.login),
    ...legacyAcademicLogins,
  ];
  const managedStudentLogins = [
    ...accounts.map((account) => account.login),
    ...legacyAcademicLogins,
  ];
  const groupNames = [...new Set(accounts.map((account) => account.groupName))];
  const managedGroupNames = [
    ...new Set([
      ...groupNames,
      ...legacyTargetGroupNames,
      ...legacyAcademicGroupNames,
    ]),
  ];
  const seedNow = getDemoNow();
  const academicSnapshotDate = getMoscowDateKey(seedNow);
  const corporateMailDomain = getCorporateMailDomain();
  const encryptedAlphaMailPassword = encryptCorporateMailPassword(
    alphaCorporateMailPassword,
  );
  const seedDay = startOfMoscowDay(seedNow);
  const targetScheduleRows = buildTargetScheduleSeed(seedNow);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const [passwordHashes, staffPasswordHashes] = await Promise.all([
      Promise.all(
        accounts.map((account) => bcrypt.hash(account.password, 12)),
      ),
      Promise.all(
        staffAccounts.map((account) => bcrypt.hash(account.password, 12)),
      ),
    ]);

    await prisma.$transaction(async (tx) => {
      const users = await tx.user.findMany({
        where: { login: { in: managedLogins } },
        select: { id: true },
      });
      const students = await tx.student.findMany({
        where: { user: { login: { in: managedStudentLogins } } },
        select: { id: true },
      });
      const groups = await tx.studentGroup.findMany({
        where: { name: { in: managedGroupNames } },
        select: { id: true },
      });
      const seededSubjects = await tx.subject.findMany({
        where: {
          OR: [
            { name: { in: subjects.map((subject) => subject.name) } },
            { name: { startsWith: "[TEST SEED]" } },
          ],
        },
        select: { id: true },
      });

      await tx.notification.deleteMany({
        where: {
          OR: [
            { studentId: { in: students.map((student) => student.id) } },
            { groupId: { in: groups.map((group) => group.id) } },
            { title: { in: generalAnnouncements.map(({ title }) => title) } },
            { title: { startsWith: "[TEST SEED]" } },
          ],
        },
      });
      await tx.grade.deleteMany({
        where: { studentId: { in: students.map((student) => student.id) } },
      });
      await tx.request.deleteMany({
        where: { studentId: { in: students.map((student) => student.id) } },
      });
      await tx.scheduleItem.deleteMany({
        where: { groupId: { in: groups.map((group) => group.id) } },
      });
      await tx.scheduleItem.deleteMany({
        where: { subjectId: { in: seededSubjects.map((subject) => subject.id) } },
      });
      await tx.subject.deleteMany({
        where: {
          OR: [
            { name: { in: subjects.map((subject) => subject.name) } },
            { name: { startsWith: "[TEST SEED]" } },
          ],
        },
      });
      await tx.student.deleteMany({
        where: { userId: { in: users.map((user) => user.id) } },
      });
      await tx.session.deleteMany({
        where: { userId: { in: users.map((user) => user.id) } },
      });
      await tx.user.deleteMany({
        where: {
          login: { in: managedLogins },
          OR: [{ role: "STUDENT" }, { createdEvents: { none: {} } }],
        },
      });
      await tx.studentGroup.deleteMany({
        where: {
          name: {
            in: [...legacyTargetGroupNames, ...legacyAcademicGroupNames],
          },
          students: { none: {} },
        },
      });

      const groupIds = new Map<string, number>();
      for (const name of groupNames) {
        const group = await tx.studentGroup.upsert({
          where: { name },
          update: {},
          create: { name },
        });
        groupIds.set(name, group.id);
      }

      const subjectIds: number[] = [];
      for (const subject of subjects) {
        const createdSubject = await tx.subject.create({ data: subject });
        subjectIds.push(createdSubject.id);
      }

      const studentIds = new Map<string, number>();
      const studentUserIds = new Map<string, number>();
      for (const [index, account] of accounts.entries()) {
        const user = await tx.user.create({
          data: {
            login: account.login,
            passwordHash: passwordHashes[index],
            role: "STUDENT",
          },
        });
        const student = await tx.student.create({
          data: {
            userId: user.id,
            fullName: account.fullName,
            faculty: account.faculty,
            direction: account.direction,
            course: account.course,
            groupId: getGroupId(groupIds, account.groupName),
            phone: account.phone,
            accountStatus: account.accountStatus ?? "ACTIVE",
            corporateEmail:
              account.login === "student.alpha"
                ? `student.alpha@${corporateMailDomain}`
                : null,
            corporateMailPasswordEncrypted:
              account.login === "student.alpha"
                ? encryptedAlphaMailPassword
                : null,
            corporateMailIssuedAt:
              account.login === "student.alpha" ? seedNow : null,
            recordBookNumber: account.recordBookNumber,
            studyForm: account.studyForm,
          },
        });
        studentIds.set(account.login, student.id);
        studentUserIds.set(account.login, user.id);

        const isAcademicRecordsStudent =
          academicRecordsSeedData.students.some(
            (academicStudent) => academicStudent.login === account.login,
          );
        if (!isAcademicRecordsStudent) {
          for (const [subjectIndex, subjectId] of subjectIds.entries()) {
            const controlTypes = [
              "EXAM",
              "CREDIT",
              "DIFFERENTIATED_CREDIT",
              "COURSEWORK",
              "EXAM",
            ] as const;
            const values = [
              String(4 + ((index + subjectIndex) % 2)),
              "зачтено",
              String(4 + ((index + subjectIndex + 1) % 2)),
              "5",
              String(3 + ((index + subjectIndex) % 3)),
            ];
            await tx.grade.create({
              data: {
                studentId: student.id,
                subjectId,
                semester: "2026-осень",
                controlType: controlTypes[subjectIndex],
                value: values[subjectIndex],
              },
            });
          }
        }

        if (account.login === "student.alpha") {
          const notifications = [
            {
              title: "[DEMO] Сдать план практики",
              text: "Отправьте вымышленный план практики на проверку.",
              deadline: addUtcDays(seedDay, 1),
            },
            {
              title: "[DEMO] Записаться на консультацию",
              text: "Выберите время консультации по учебному проекту.",
              deadline: addUtcDays(seedDay, 3),
            },
            {
              title: "[DEMO] Подтвердить тему проекта",
              text: "Подтвердите вымышленную тему семестрового проекта.",
              deadline: addUtcDays(seedDay, 5),
            },
          ] as const;
          for (const notification of notifications) {
            await tx.notification.create({
              data: {
                studentId: student.id,
                ...notification,
              },
            });
          }
        }
      }

      await tx.academicDataset.upsert({
        where: { id: academicRecordsSeedData.datasetId },
        update: {
          academicYear: academicRecordsSeedData.academicYear,
          snapshotDate: dateOnly(academicSnapshotDate),
        },
        create: {
          id: academicRecordsSeedData.datasetId,
          academicYear: academicRecordsSeedData.academicYear,
          snapshotDate: dateOnly(academicSnapshotDate),
        },
      });

      for (const academicStudent of academicRecordsSeedData.students) {
        const studentId = studentIds.get(academicStudent.login);
        if (studentId === undefined) {
          throw new Error(
            `Academic records student "${academicStudent.login}" was not created.`,
          );
        }

        for (const semester of academicStudent.semesters) {
          const createdSemester = await tx.academicSemester.create({
            data: {
              datasetId: academicRecordsSeedData.datasetId,
              studentId,
              code: semester.id,
              number: semester.number,
              name: semester.name,
              isCurrent: semester.isCurrent,
            },
          });

          for (const subject of semester.subjects) {
            const result = semester.results.find(
              (row) => row.subjectId === subject.id,
            );
            await tx.academicPlanItem.create({
              data: {
                id: subject.id,
                semesterId: createdSemester.id,
                name: subject.name,
                department: subject.department,
                teacher: subject.teacher,
                hours: subject.hours,
                credits: subject.credits,
                controlType: subject.controlType,
                ...(result
                  ? {
                      result: {
                        create: {
                          status: result.status,
                          value: result.value,
                          date: dateOnly(
                            shiftAcademicRecordDate(
                              result.date,
                              academicRecordsSeedData.snapshotDate,
                              academicSnapshotDate,
                            ),
                          ),
                          attemptCount: result.attemptCount,
                          attempts: {
                            create: result.attempts.map((attempt) => ({
                              attemptNumber: attempt.attempt,
                              date: dateOnly(
                                shiftAcademicRecordDate(
                                  attempt.date,
                                  academicRecordsSeedData.snapshotDate,
                                  academicSnapshotDate,
                                ),
                              ),
                              value: attempt.value,
                            })),
                          },
                        },
                      },
                    }
                  : {}),
              },
            });
          }
        }

        for (const sessionItem of academicStudent.currentSemesterSchedule) {
          const date = shiftAcademicRecordDate(
            sessionItem.date,
            academicRecordsSeedData.snapshotDate,
            academicSnapshotDate,
          );
          const session = await tx.academicSessionItem.create({
            data: {
              planItemId: sessionItem.subjectId,
              date: dateOnly(date),
              startTime: timeOfDay(sessionItem.startTime),
              endTime: timeOfDay(sessionItem.endTime),
              room: sessionItem.room,
              status: sessionItem.status,
            },
            select: { id: true },
          });
          const subject = academicStudent.semesters
            .flatMap((semester) => semester.subjects)
            .find((item) => item.id === sessionItem.subjectId);
          if (!subject) {
            throw new Error(
              `Session subject "${sessionItem.subjectId}" is missing for ${academicStudent.login}.`,
            );
          }
          const result = academicStudent.semesters
            .flatMap((semester) => semester.results)
            .find((item) => item.subjectId === sessionItem.subjectId);
          const notices = getSessionNotificationPlan({
            id: String(session.id),
            subject: subject.name,
            date,
            startTime: sessionItem.startTime,
            endTime: sessionItem.endTime,
            room: sessionItem.room,
            status: sessionItem.status,
            resultStatus: result?.status ?? null,
            resultValue: result?.value ?? null,
            resultDate: result
              ? shiftAcademicRecordDate(
                  result.date,
                  academicRecordsSeedData.snapshotDate,
                  academicSnapshotDate,
                )
              : null,
            controlType: sessionItem.controlType,
            teacher: subject.teacher,
            todayKey: academicSnapshotDate,
          });
          for (const notice of notices) {
            await tx.notification.create({
              data: {
                studentId,
                type: "SCHEDULE_CHANGE",
                title: notice.title,
                text: notice.text,
                date: seedNow,
                createdAt: seedNow,
                targetType: "ACADEMIC_SESSION",
                targetId: String(session.id),
              },
            });
          }
        }
      }

      const staffProfileIds = new Map<string, number>();
      const staffUserIds = new Map<string, number>();
      for (const [index, account] of staffAccounts.entries()) {
        const staffProfileData = {
          fullName: account.fullName,
          position: account.position,
          department: account.department,
          phone: account.phone,
          isSupervisor: account.isSupervisor,
        };
        const user = await tx.user.upsert({
          where: { login: account.login },
          update: {
            passwordHash: staffPasswordHashes[index],
            role: "STAFF",
            staffProfile: {
              upsert: {
                update: staffProfileData,
                create: staffProfileData,
              },
            },
          },
          create: {
            login: account.login,
            passwordHash: staffPasswordHashes[index],
            role: "STAFF",
            staffProfile: { create: staffProfileData },
          },
          include: { staffProfile: { select: { id: true } } },
        });
        if (!user.staffProfile) {
          throw new Error(`Staff profile was not created for ${account.login}.`);
        }
        staffProfileIds.set(account.login, user.staffProfile.id);
        staffUserIds.set(account.login, user.id);
      }

      const alphaStudentId = studentIds.get("student.alpha");
      const betaStudentId = studentIds.get("student.beta");
      const alphaUserId = studentUserIds.get("student.alpha");
      const betaUserId = studentUserIds.get("student.beta");
      const demoStaffProfileId = staffProfileIds.get("staff.demo");
      const otherStaffProfileId = staffProfileIds.get("staff.other");
      const demoStaffUserId = staffUserIds.get("staff.demo");
      const otherStaffUserId = staffUserIds.get("staff.other");
      if (
        alphaStudentId === undefined ||
        betaStudentId === undefined ||
        alphaUserId === undefined ||
        betaUserId === undefined ||
        demoStaffProfileId === undefined ||
        otherStaffProfileId === undefined ||
        demoStaffUserId === undefined ||
        otherStaffUserId === undefined
      ) {
        throw new Error("The staff request seed accounts were not created.");
      }

      const profileSnapshot = (login: string) => {
        const account = accounts.find((item) => item.login === login);
        if (!account) {
          throw new Error(`Request seed account "${login}" is missing.`);
        }
        return {
          fullName: account.fullName,
          faculty: account.faculty,
          direction: account.direction,
          course: account.course,
          groupName: account.groupName,
          recordBookNumber: account.recordBookNumber ?? null,
          studyForm: account.studyForm ?? null,
        };
      };

      const testRequests: Prisma.RequestUncheckedCreateInput[] = [
        {
          studentId: alphaStudentId,
          type: "CERTIFICATE",
          catalogCode: "STUDY_CERTIFICATE",
          formFields: { purpose: "для места работы" },
          profileSnapshot: profileSnapshot("student.alpha"),
          status: "NEW",
          assignedToId: demoStaffProfileId,
          comment: "Заявка назначена staff.demo.",
          statusHistory: {
            create: [
              {
                fromStatus: null,
                status: "NEW",
                authorUserId: alphaUserId,
                comment: "Заявка подана студентом.",
              },
            ],
          },
        },
        {
          studentId: betaStudentId,
          type: "CERTIFICATE",
          catalogCode: "CALL_CERTIFICATE",
          formFields: {
            periodStart: "2026-11-18",
            periodEnd: "2026-11-25",
            reason: "SESSION",
          },
          profileSnapshot: profileSnapshot("student.beta"),
          status: "IN_PROGRESS",
          comment: "Разрешённый тип без назначения.",
          statusHistory: {
            create: [
              {
                fromStatus: null,
                status: "NEW",
                authorUserId: betaUserId,
                comment: "Заявка подана студентом.",
              },
              {
                fromStatus: "NEW",
                status: "IN_PROGRESS",
                authorUserId: demoStaffUserId,
                comment: "Заявка принята в работу.",
              },
            ],
          },
        },
        {
          studentId: alphaStudentId,
          type: "CERTIFICATE",
          catalogCode: "STUDY_CERTIFICATE",
          formFields: { purpose: "для оформления льготы" },
          profileSnapshot: profileSnapshot("student.alpha"),
          status: "READY",
          assignedToId: otherStaffProfileId,
          comment: "Заявка назначена staff.other.",
          statusHistory: {
            create: [
              {
                fromStatus: null,
                status: "NEW",
                authorUserId: alphaUserId,
                comment: "Заявка подана студентом.",
              },
              {
                fromStatus: "NEW",
                status: "IN_PROGRESS",
                authorUserId: otherStaffUserId,
                comment: "Заявка принята в работу.",
              },
              {
                fromStatus: "IN_PROGRESS",
                status: "READY",
                authorUserId: otherStaffUserId,
                comment: "Справка подготовлена.",
              },
            ],
          },
        },
        {
          studentId: betaStudentId,
          type: "APPLICATION",
          catalogCode: "CALL_CERTIFICATE",
          formFields: {
            periodStart: "2026-12-01",
            periodEnd: "2026-12-10",
            reason: "OTHER",
          },
          profileSnapshot: profileSnapshot("student.beta"),
          status: "REJECTED",
          comment: "Тип не разрешён staff.demo.",
          statusHistory: {
            create: [
              {
                fromStatus: null,
                status: "NEW",
                authorUserId: betaUserId,
                comment: "Заявка подана студентом.",
              },
              {
                fromStatus: "NEW",
                status: "IN_PROGRESS",
                authorUserId: otherStaffUserId,
                comment: "Заявка проверена сотрудником.",
              },
              {
                fromStatus: "IN_PROGRESS",
                status: "REJECTED",
                authorUserId: otherStaffUserId,
                comment: "Тип не разрешён staff.demo.",
              },
            ],
          },
        },
      ];
      const requestTargets = new Map<
        string,
        { publicId: string; status: RequestStatus }
      >();
      for (const request of testRequests) {
        const created = await tx.request.create({
          data: request,
          select: { studentId: true, publicId: true, status: true },
        });
        const login =
          created.studentId === alphaStudentId
            ? "student.alpha"
            : "student.beta";
        if (!requestTargets.has(login)) {
          requestTargets.set(login, {
            publicId: created.publicId,
            status: created.status,
          });
        }
      }

      const opportunityIds: number[] = [];
      for (const [index, seed] of opportunitySeeds.entries()) {
        const deadline = new Date(
          seedNow.getTime() + seed.offset * 24 * 60 * 60 * 1000,
        );
        const opportunityData = {
          title: seed.title,
          type: seed.type,
          organizer: seed.organizer,
          shortDescription: `Вымышленная возможность: ${seed.title}.`,
          description: `Демо-описание возможности «${seed.title}». Условия и участники вымышлены и предназначены для проверки интерфейса.`,
          requirements: "Подготовьте краткую мотивацию и проверьте условия участия.",
          deadline,
          allowLateRequests: seed.allowLateRequests ?? false,
          lateRequestsUntil: seed.allowLateRequests
            ? new Date(deadline.getTime() + 7 * 24 * 60 * 60 * 1000)
            : null,
          directions: [seed.direction],
          minCourse: index % 4 === 0 ? 2 : null,
          maxCourse: index % 5 === 0 ? 4 : null,
          allowedFaculties: [],
          format: seed.format,
          location: seed.location ?? "Кампус, аудитория 204",
          startsAt: null,
          endsAt: null,
          cost: seed.cost,
          costNote: seed.costNote ?? null,
          officialUrl: `https://example.com/opportunities/${index + 1}`,
          eventDate: seed.type === "CONFERENCE" ? deadline : null,
          requiredDocuments: [
            { key: "resume", title: "Резюме", required: index % 3 === 0 },
            { key: "statement", title: "Эссе или мотивационное письмо", required: false },
          ],
          details: seed.details,
          status: seed.status,
          createdById: demoStaffUserId!,
        };
        const existing = await tx.opportunity.findFirst({
          where: { title: seed.title },
          select: { id: true },
        });
        const opportunity = existing
          ? await tx.opportunity.update({
              where: { id: existing.id },
              data: opportunityData,
            })
          : await tx.opportunity.create({ data: opportunityData });
        opportunityIds.push(opportunity.id);
      }

      const applicationStatuses = [
        "SUBMITTED",
        "IN_REVIEW",
        "NEEDS_INFO",
        "ACCEPTED",
        "REJECTED",
        "WITHDRAWN",
      ] as const;
      for (const [index, opportunityId] of opportunityIds.entries()) {
        if (opportunitySeeds[index].status === "DRAFT") continue;
        const studentId = index % 2 === 0 ? alphaStudentId : betaStudentId;
        const existingApplication = await tx.opportunityApplication.findFirst({
          where: { opportunityId, studentId },
        });
        if (!existingApplication) {
          await tx.opportunityApplication.create({
            data: {
              opportunityId,
              studentId,
              kind: opportunitySeeds[index].allowLateRequests
                ? "LATE_REQUEST"
                : "STANDARD",
              status: applicationStatuses[index % applicationStatuses.length],
              motivation: "Вымышленная мотивация студента для демонстрации сценария.",
              studentSnapshot: {
                fullName:
                  index % 2 === 0
                    ? "Елизавета Воронцова"
                    : "Александр Фёдоров",
                groupName: index % 2 === 0 ? "TEST-ACADEMIC-31A" : "TEST-ACADEMIC-32B",
                course: 3,
                faculty:
                  index % 2 === 0
                    ? "Факультет прикладных вычислений"
                    : "Факультет международных отношений",
              },
              staffComment:
                applicationStatuses[index % applicationStatuses.length] ===
                "IN_REVIEW"
                  ? "Заявка передана на рассмотрение."
                  : null,
              decidedById:
                applicationStatuses[index % applicationStatuses.length] ===
                  "ACCEPTED" ||
                applicationStatuses[index % applicationStatuses.length] ===
                  "REJECTED"
                  ? demoStaffUserId
                  : null,
            },
          });
        }
      }

      const monday = nextMonday();
      const groupScheduleIndexes = new Map<string, number>();
      for (const account of accounts) {
        if (
          account.login === "student.alpha" ||
          account.login === "student.beta"
        ) {
          continue;
        }
        const groupIndex = groupNames.indexOf(account.groupName);
        if (groupScheduleIndexes.has(account.groupName)) continue;
        groupScheduleIndexes.set(account.groupName, groupIndex);

        for (const weekdayIndex of weekdays.keys()) {
          const moved = weekdayIndex === groupIndex;
          const subjectIndex = (weekdayIndex + groupIndex) % subjects.length;
          const [start, end] = scheduleTimes[weekdayIndex];
          const shiftedStart = moved
            ? `${String(Number(start.slice(0, 2)) + 1).padStart(2, "0")}:${start.slice(3)}`
            : start;
          const shiftedEnd = moved
            ? `${String(Number(end.slice(0, 2)) + 1).padStart(2, "0")}:${end.slice(3)}`
            : end;
          const occurrenceDate = moved
            ? new Date(
                Date.UTC(
                  monday.getUTCFullYear(),
                  monday.getUTCMonth(),
                  monday.getUTCDate() + weekdayIndex,
                ),
              )
            : null;
          const room = `ДЕМО-${groupIndex + 1}0${weekdayIndex + 1}`;

          await tx.scheduleItem.create({
            data: {
              subjectId: subjectIds[subjectIndex],
              groupId: getGroupId(groupIds, account.groupName),
              weekday: moved ? null : weekdays[weekdayIndex],
              date: occurrenceDate,
              startTime: timeOfDay(shiftedStart),
              endTime: timeOfDay(shiftedEnd),
              startsAt: occurrenceDate
                ? dateTimeInMoscow(occurrenceDate, shiftedStart)
                : null,
              endsAt: occurrenceDate
                ? dateTimeInMoscow(occurrenceDate, shiftedEnd)
                : null,
              originalStartsAt:
                occurrenceDate && moved
                  ? dateTimeInMoscow(occurrenceDate, start)
                  : null,
              originalEndsAt:
                occurrenceDate && moved
                  ? dateTimeInMoscow(occurrenceDate, end)
                  : null,
              kind: scheduleKinds[subjectIndex % scheduleKinds.length],
              status: moved ? "RESCHEDULED" : "PLANNED",
              room,
              teacher: subjects[subjectIndex].teacher,
              isRescheduled: moved,
              changeNote: moved
                ? "Тестовый перенос на один час позже обычного времени."
                : null,
            },
          });
        }
      }

      const scheduleTargets = new Map<
        string,
        { id: number; subject: string }
      >();
      for (const row of targetScheduleRows) {
        const account = environmentAccounts.find(
          ({ login }) => login === row.login,
        );
        if (!account) {
          throw new Error(`Test account "${row.login}" was not configured.`);
        }

        const originalStartsAt = row.originalStartTime
          ? dateTimeInMoscow(row.date, row.originalStartTime)
          : null;
        const originalEndsAt = row.originalEndTime
          ? dateTimeInMoscow(row.date, row.originalEndTime)
          : null;

        const scheduleItem = await tx.scheduleItem.create({
          data: {
            subjectId: subjectIds[row.subjectIndex],
            groupId: getGroupId(groupIds, account.groupName),
            date: row.date,
            weekday: null,
            startTime: timeOfDay(row.startTime),
            endTime: timeOfDay(row.endTime),
            startsAt: dateTimeInMoscow(row.date, row.startTime),
            endsAt: dateTimeInMoscow(row.date, row.endTime),
            originalStartsAt,
            originalEndsAt,
            kind: row.kind,
            status: row.status,
            room: row.room,
            originalRoom: row.originalRoom,
            teacher: subjects[row.subjectIndex].teacher,
            isRescheduled: row.status === "RESCHEDULED",
            changeNote: row.changeNote,
          },
          select: { id: true },
        });
        if (
          row.status === "RESCHEDULED" &&
          !scheduleTargets.has(row.login)
        ) {
          scheduleTargets.set(row.login, {
            id: scheduleItem.id,
            subject: subjects[row.subjectIndex].name,
          });
        }
      }

      const requestStatusText = {
        NEW: "Заявка подана и ожидает обработки.",
        IN_PROGRESS: "Заявка принята в работу.",
        NEEDS_INFO: "По заявке нужны дополнительные данные.",
        READY: "Заявка готова.",
        REJECTED: "Заявка отклонена.",
        CANCELLED: "Заявка отменена.",
      } as const;
      for (const login of ["student.alpha", "student.beta"] as const) {
        const studentId = studentIds.get(login);
        const scheduleTarget = scheduleTargets.get(login);
        const requestTarget = requestTargets.get(login);
        if (
          studentId === undefined ||
          scheduleTarget === undefined ||
          requestTarget === undefined
        ) {
          throw new Error(`Notification targets are missing for ${login}.`);
        }
        const scheduleState = getDemoNotificationState(
          login,
          "schedule",
          seedNow,
        );
        const requestState = getDemoNotificationState(
          login,
          "request",
          seedNow,
        );
        await tx.notification.create({
          data: {
            studentId,
            type: "SCHEDULE_CHANGE",
            title: "Изменилось расписание",
            text: `${scheduleTarget.subject}: время или аудитория занятия перенесены.`,
            targetType: "SCHEDULE_ITEM",
            targetId: String(scheduleTarget.id),
            ...scheduleState,
          },
        });
        await tx.notification.create({
          data: {
            studentId,
            type: "REQUEST_STATUS",
            title: "Обновлён статус заявки",
            text: requestStatusText[requestTarget.status],
            targetType: "REQUEST",
            targetId: requestTarget.publicId,
            ...requestState,
          },
        });
      }

      await syncDeadlineSeed(tx, studentIds, seedNow);

      for (const [index, login] of (
        ["student.alpha", "student.beta"] as const
      ).entries()) {
        const studentId = studentIds.get(login);
        if (studentId === undefined) {
          throw new Error(`Announcement student "${login}" is missing.`);
        }
        const announcement = generalAnnouncements[index];
        if (!announcement) {
          throw new Error(`Announcement fixture is missing for ${login}.`);
        }
        await tx.notification.create({
          data: {
            ...announcement,
            studentId,
            type: "ANNOUNCEMENT",
            ...getDemoNotificationState(login, "announcement", seedNow),
          },
        });
      }

      const currentDigestWeek = getMoscowCalendarWeek(seedNow);
      const digestFixtures = [
        {
          weekOffset: 0,
          dayOffset: 0,
          start: "14:00",
          end: "15:30",
          title: "Конференция о цифровой дипломатии",
          type: "CONFERENCE",
          location: "Аудитория Д-204",
          host: "Анна Вересова",
          status: "PUBLISHED",
          url: "https://example.com/register/1",
        },
        {
          weekOffset: 0,
          dayOffset: 1,
          start: "16:00",
          end: "17:00",
          title: "Разговор с культурным атташе",
          type: "SPEAKER_MEETING",
          location: "Зал заседаний Б-310",
          host: "Марк Левин",
          status: "PUBLISHED",
          url: "https://example.com/register/2",
        },
        {
          weekOffset: 0,
          dayOffset: 2,
          start: "12:30",
          end: "14:00",
          title: "Мастер-класс по публичным выступлениям",
          type: "MASTER_CLASS",
          location: "Аудитория В-115",
          host: "Елена Соколова",
          status: "PUBLISHED",
          url: "https://example.com/register/3",
        },
        {
          weekOffset: 0,
          dayOffset: 2,
          start: "17:00",
          end: "18:00",
          title: "Встреча клуба международных исследований",
          type: "OTHER",
          location: "Коворкинг А-02",
          host: "Илья Миронов",
          status: "DRAFT",
          url: "https://example.com/register/4",
        },
        {
          weekOffset: 0,
          dayOffset: 3,
          start: "15:00",
          end: "16:30",
          title: "Научный семинар по региональным исследованиям",
          type: "CONFERENCE",
          location: "Аудитория Г-418",
          host: "Дарья Ветрова",
          status: "PUBLISHED",
          url: "https://example.com/register/5",
        },
        {
          weekOffset: 0,
          dayOffset: 4,
          start: "13:00",
          end: "14:30",
          title: "Мастер-класс по академическому письму",
          type: "MASTER_CLASS",
          location: "Компьютерный класс Е-102",
          host: "Павел Орлов",
          status: "PUBLISHED",
          url: "https://example.com/register/6",
        },
        {
          weekOffset: 0,
          dayOffset: 5,
          start: "11:00",
          end: "12:00",
          title: "Встреча с выпускницей международной организации",
          type: "SPEAKER_MEETING",
          location: "Аудитория А-207",
          host: "София Мельник",
          status: "DRAFT",
          url: "https://example.com/register/7",
        },
        {
          weekOffset: 0,
          dayOffset: 6,
          start: "14:00",
          end: "15:00",
          title: "Открытая дискуссия о городских проектах",
          type: "OTHER",
          location: "Лекторий В-001",
          host: "Роман Тихонов",
          status: "PUBLISHED",
          url: "https://example.com/register/8",
        },
        {
          weekOffset: 1,
          dayOffset: 0,
          start: "15:00",
          end: "16:30",
          title: "Конференция молодых исследователей",
          type: "CONFERENCE",
          location: "Аудитория Д-204",
          host: "Мария Белова",
          status: "PUBLISHED",
          url: "https://example.com/register/9",
        },
        {
          weekOffset: 1,
          dayOffset: 1,
          start: "17:00",
          end: "18:00",
          title: "Встреча с переводчиком международных переговоров",
          type: "SPEAKER_MEETING",
          location: "Зал заседаний Б-310",
          host: "Алексей Неверов",
          status: "PUBLISHED",
          url: "https://example.com/register/10",
        },
        {
          weekOffset: 1,
          dayOffset: 3,
          start: "12:00",
          end: "13:30",
          title: "Мастер-класс по аналитической презентации",
          type: "MASTER_CLASS",
          location: "Аудитория В-115",
          host: "Кира Ланская",
          status: "PUBLISHED",
          url: "https://example.com/register/11",
        },
        {
          weekOffset: 1,
          dayOffset: 4,
          start: "16:00",
          end: "17:00",
          title: "Дискуссия о студенческих инициативах",
          type: "OTHER",
          location: "Коворкинг А-02",
          host: "Никита Рощин",
          status: "DRAFT",
          url: "https://example.com/register/12",
        },
        {
          weekOffset: 1,
          dayOffset: 6,
          start: "13:00",
          end: "14:00",
          title: "Встреча с экспертом по международному праву",
          type: "SPEAKER_MEETING",
          location: "Аудитория Г-418",
          host: "Вера Литвинова",
          status: "PUBLISHED",
          url: "https://example.com/register/13",
        },
      ] as const;

      for (const fixture of digestFixtures) {
        const eventDate = new Date(currentDigestWeek.startDate);
        eventDate.setUTCDate(
          eventDate.getUTCDate() + fixture.weekOffset * 7 + fixture.dayOffset,
        );
        const startsAt = dateTimeInMoscow(eventDate, fixture.start);
        const existingEvent = await tx.event.findFirst({
          where: { title: fixture.title, startsAt },
          select: { id: true },
        });
        if (existingEvent) continue;

        const endsAt = dateTimeInMoscow(eventDate, fixture.end);
        await tx.event.create({
          data: {
            title: fixture.title,
            type: fixture.type,
            description: "Вымышленное тестовое мероприятие для демонстрации раздела.",
            startsAt,
            endsAt,
            location: fixture.location,
            host: fixture.host,
            registrationUrl: fixture.url,
            status: fixture.status,
            createdById: demoStaffUserId,
          },
        });
      }
    });

    await seedPortfolioDemo(prisma);
    console.log("Тестовые данные созданы.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Не удалось создать тестовые данные:", error);
  process.exitCode = 1;
});
