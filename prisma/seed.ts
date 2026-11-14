import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { buildTargetScheduleSeed } from "./schedule-seed-data";

type SeedAccount = {
  login: string;
  password: string;
  fullName: string;
  faculty: string;
  direction: string;
  groupName: string;
  course: number;
};

const originalAccounts: SeedAccount[] = [
  {
    login: "test.seed.01",
    password: "TestOnly-01!",
    fullName: "Аэлитта Ветрова-Даль",
    faculty: "Факультет вымышленных исследований",
    direction: "Межмировые коммуникации",
    groupName: "TEST-SEED-01",
    course: 1,
  },
  {
    login: "test.seed.02",
    password: "TestOnly-02!",
    fullName: "Яромир Листогоров",
    faculty: "Факультет вымышленных исследований",
    direction: "Межмировые коммуникации",
    groupName: "TEST-SEED-01",
    course: 1,
  },
  {
    login: "test.seed.03",
    password: "TestOnly-03!",
    fullName: "Мирелла Камышова",
    faculty: "Факультет вымышленных исследований",
    direction: "Межмировые коммуникации",
    groupName: "TEST-SEED-02",
    course: 2,
  },
  {
    login: "test.seed.04",
    password: "TestOnly-04!",
    fullName: "Терентий Облаков",
    faculty: "Факультет вымышленных исследований",
    direction: "Межмировые коммуникации",
    groupName: "TEST-SEED-02",
    course: 2,
  },
  {
    login: "test.seed.05",
    password: "TestOnly-05!",
    fullName: "Лиора Звездолётова",
    faculty: "Факультет вымышленных исследований",
    direction: "Межмировые коммуникации",
    groupName: "TEST-SEED-03",
    course: 3,
  },
  {
    login: "test.seed.06",
    password: "TestOnly-06!",
    fullName: "Феликс Кленоветер",
    faculty: "Факультет вымышленных исследований",
    direction: "Межмировые коммуникации",
    groupName: "TEST-SEED-03",
    course: 3,
  },
];

const environmentAccounts = [
  {
    login: "student.alpha",
    passwordVariable: "SEED_ALPHA_PASSWORD",
    fullName: "Альфира Луновей",
    faculty: "Факультет лунной картографии",
    direction: "Орбитальная топография",
    groupName: "МО-101",
    course: 2,
  },
  {
    login: "student.beta",
    passwordVariable: "SEED_BETA_PASSWORD",
    fullName: "Бета Северозвёздный",
    faculty: "Факультет межзвёздной истории",
    direction: "Хроники дальних систем",
    groupName: "ЗР-203",
    course: 4,
  },
] as const;

const staffAccounts = [
  {
    login: "staff.demo",
    fullName: "Мирослава Лунная",
    position: "специалист учебного отдела",
    department: "Учебный отдел",
    isSupervisor: false,
  },
  {
    login: "staff.other",
    fullName: "Тихон Северозвёздный",
    position: "специалист по работе со студентами",
    department: "Отдел по работе со студентами",
    isSupervisor: false,
  },
  {
    login: "staff.manager",
    fullName: "Лада Меридиан",
    position: "старший специалист учебного отдела",
    department: "Учебный отдел",
    isSupervisor: true,
  },
] as const;

const subjects = [
  {
    name: "[TEST SEED] История вымышленных цивилизаций",
    teacher: "Профессор Лира Северная",
  },
  {
    name: "[TEST SEED] Основы межзвёздной дипломатии",
    teacher: "Доцент Орест Тихозвёздный",
  },
  {
    name: "[TEST SEED] Математика параллельных миров",
    teacher: "Профессор Элина Меридиан",
  },
  {
    name: "[TEST SEED] Языки древнего архипелага",
    teacher: "Доцент Ника Облачная",
  },
  {
    name: "[TEST SEED] Введение в картографию снов",
    teacher: "Профессор Мирон Лунов",
  },
] as const;

const generalAnnouncements = [
  {
    title: "[TEST SEED] Общее объявление: учебная неделя",
    text: "Это вымышленное тестовое объявление. Учебная неделя начнётся по расписанию.",
  },
  {
    title: "[TEST SEED] Общее объявление: библиотека",
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

const moscowDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Moscow",
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

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The test seed cannot be run in production.");
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL must be set before running the test seed.");
  }

  const accounts: SeedAccount[] = [
    ...originalAccounts,
    ...environmentAccounts.map(({ passwordVariable, ...account }) => {
      const password = process.env[passwordVariable];
      if (!password) {
        throw new Error(
          `${passwordVariable} must be set in .env to seed ${account.login}.`,
        );
      }
      return { ...account, password };
    }),
  ];
  const staffDemoPassword = process.env.SEED_STAFF_PASSWORD;
  if (!staffDemoPassword) {
    throw new Error(
      "SEED_STAFF_PASSWORD must be set in .env to seed staff.demo.",
    );
  }
  const managedLogins = [
    ...accounts.map((account) => account.login),
    ...staffAccounts.map((account) => account.login),
  ];
  const groupNames = [...new Set(accounts.map((account) => account.groupName))];
  const managedGroupNames = [
    ...new Set([...groupNames, ...legacyTargetGroupNames]),
  ];
  const seedNow = new Date();
  const seedDay = startOfMoscowDay(seedNow);
  const targetScheduleRows = buildTargetScheduleSeed(seedNow);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const [passwordHashes, staffDemoPasswordHash, staffOtherPasswordHash] =
      await Promise.all([
        Promise.all(
          accounts.map((account) => bcrypt.hash(account.password, 12)),
        ),
        bcrypt.hash(staffDemoPassword, 12),
        bcrypt.hash(randomBytes(32).toString("hex"), 12),
      ]);

    await prisma.$transaction(async (tx) => {
      const users = await tx.user.findMany({
        where: { login: { in: managedLogins } },
        select: { id: true },
      });
      const students = await tx.student.findMany({
        where: { user: { login: { in: accounts.map((account) => account.login) } } },
        select: { id: true },
      });
      const groups = await tx.studentGroup.findMany({
        where: { name: { in: managedGroupNames } },
        select: { id: true },
      });
      const seededSubjects = await tx.subject.findMany({
        where: { name: { in: subjects.map((subject) => subject.name) } },
        select: { id: true },
      });

      await tx.notification.deleteMany({
        where: {
          OR: [
            { studentId: { in: students.map((student) => student.id) } },
            { groupId: { in: groups.map((group) => group.id) } },
            { title: { in: generalAnnouncements.map(({ title }) => title) } },
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
        where: { name: { in: subjects.map((subject) => subject.name) } },
      });
      await tx.student.deleteMany({
        where: { userId: { in: users.map((user) => user.id) } },
      });
      await tx.user.deleteMany({
        where: { login: { in: managedLogins } },
      });
      await tx.studentGroup.deleteMany({
        where: {
          name: { in: [...legacyTargetGroupNames] },
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
          },
        });
        studentIds.set(account.login, student.id);

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

      const staffProfileIds = new Map<string, number>();
      for (const account of staffAccounts) {
        const user = await tx.user.create({
          data: {
            login: account.login,
            passwordHash:
              account.login === "staff.other"
                ? staffOtherPasswordHash
                : staffDemoPasswordHash,
            role: "STAFF",
            staffProfile: {
              create: {
                fullName: account.fullName,
                position: account.position,
                department: account.department,
                isSupervisor: account.isSupervisor,
              },
            },
          },
          include: { staffProfile: { select: { id: true } } },
        });
        if (!user.staffProfile) {
          throw new Error(`Staff profile was not created for ${account.login}.`);
        }
        staffProfileIds.set(account.login, user.staffProfile.id);
      }

      const alphaStudentId = studentIds.get("student.alpha");
      const betaStudentId = studentIds.get("student.beta");
      const demoStaffProfileId = staffProfileIds.get("staff.demo");
      const otherStaffProfileId = staffProfileIds.get("staff.other");
      if (
        alphaStudentId === undefined ||
        betaStudentId === undefined ||
        demoStaffProfileId === undefined ||
        otherStaffProfileId === undefined
      ) {
        throw new Error("The staff request seed accounts were not created.");
      }

      const testRequests = [
        {
          studentId: alphaStudentId,
          type: "CERTIFICATE",
          status: "NEW",
          assignedToId: demoStaffProfileId,
          comment: "[TEST SEED STAFF] Заявка назначена staff.demo.",
        },
        {
          studentId: betaStudentId,
          type: "CERTIFICATE",
          status: "IN_PROGRESS",
          comment: "[TEST SEED STAFF] Разрешённый тип без назначения.",
        },
        {
          studentId: alphaStudentId,
          type: "CERTIFICATE",
          status: "READY",
          assignedToId: otherStaffProfileId,
          comment: "[TEST SEED STAFF] Заявка назначена staff.other.",
        },
        {
          studentId: betaStudentId,
          type: "APPLICATION",
          status: "REJECTED",
          comment: "[TEST SEED STAFF] Тип не разрешён staff.demo.",
        },
      ] as const;
      for (const request of testRequests) {
        await tx.request.create({ data: request });
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

        await tx.scheduleItem.create({
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
        });
      }

      for (const announcement of generalAnnouncements) {
        await tx.notification.create({ data: announcement });
      }
    });

    console.log("Тестовые данные созданы.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Не удалось создать тестовые данные:", error);
  process.exitCode = 1;
});
