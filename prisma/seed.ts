import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

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
    groupName: "DEMO-ALPHA",
    course: 2,
  },
  {
    login: "student.beta",
    passwordVariable: "SEED_BETA_PASSWORD",
    fullName: "Бета Северозвёздный",
    faculty: "Факультет межзвёздной истории",
    direction: "Хроники дальних систем",
    groupName: "DEMO-BETA",
    course: 4,
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

function timeOfDay(value: string): Date {
  const [hours, minutes] = value.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, hours, minutes));
}

function nextMonday(): Date {
  const today = new Date();
  const date = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const daysUntilMonday = (8 - date.getUTCDay()) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + daysUntilMonday);
  return date;
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
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
  const groupNames = [...new Set(accounts.map((account) => account.groupName))];
  const seedDay = startOfUtcDay(new Date());

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const passwordHashes = await Promise.all(
      accounts.map((account) => bcrypt.hash(account.password, 12)),
    );

    await prisma.$transaction(async (tx) => {
      const users = await tx.user.findMany({
        where: { login: { in: accounts.map((account) => account.login) } },
        select: { id: true },
      });
      const students = await tx.student.findMany({
        where: { user: { login: { in: accounts.map((account) => account.login) } } },
        select: { id: true },
      });
      const groups = await tx.studentGroup.findMany({
        where: { name: { in: groupNames } },
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
        where: { login: { in: accounts.map((account) => account.login) } },
      });
      await tx.studentGroup.deleteMany({
        where: { name: { in: groupNames } },
      });

      const groupIds = new Map<string, number>();
      for (const name of groupNames) {
        const group = await tx.studentGroup.create({ data: { name } });
        groupIds.set(name, group.id);
      }

      const subjectIds: number[] = [];
      for (const subject of subjects) {
        const createdSubject = await tx.subject.create({ data: subject });
        subjectIds.push(createdSubject.id);
      }

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
          const requests = [
            { type: "CERTIFICATE", status: "PENDING" },
            { type: "APPLICATION", status: "IN_PROGRESS" },
          ] as const;
          for (const [requestIndex, request] of requests.entries()) {
            await tx.request.create({
              data: {
                studentId: student.id,
                ...request,
                comment: `Вымышленная тестовая заявка ${requestIndex + 1}.`,
              },
            });
          }

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

      const monday = nextMonday();
      const groupScheduleIndexes = new Map<string, number>();
      for (const account of accounts) {
        const groupIndex = groupNames.indexOf(account.groupName);
        if (groupScheduleIndexes.has(account.groupName)) continue;
        groupScheduleIndexes.set(account.groupName, groupIndex);

        if (
          account.login === "student.alpha" ||
          account.login === "student.beta"
        ) {
          for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
            const moved =
              account.login === "student.alpha" &&
              (dayIndex === 1 || dayIndex === 4);
            const subjectIndex = (dayIndex + groupIndex) % subjects.length;
            const [start, end] = scheduleTimes[dayIndex % scheduleTimes.length];
            const shiftedStart = moved
              ? `${String(Number(start.slice(0, 2)) + 1).padStart(2, "0")}:${start.slice(3)}`
              : start;
            const shiftedEnd = moved
              ? `${String(Number(end.slice(0, 2)) + 1).padStart(2, "0")}:${end.slice(3)}`
              : end;

            await tx.scheduleItem.create({
              data: {
                subjectId: subjectIds[subjectIndex],
                groupId: getGroupId(groupIds, account.groupName),
                date: addUtcDays(seedDay, dayIndex),
                startTime: timeOfDay(shiftedStart),
                endTime: timeOfDay(shiftedEnd),
                classroom: `ДЕМО-${groupIndex + 1}0${dayIndex + 1}`,
                teacher: subjects[subjectIndex].teacher,
                isRescheduled: moved,
                comment: moved
                  ? "Вымышленная пара перенесена на один час позже."
                  : null,
              },
            });
          }
          continue;
        }

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

          await tx.scheduleItem.create({
            data: {
              subjectId: subjectIds[subjectIndex],
              groupId: getGroupId(groupIds, account.groupName),
              weekday: moved ? null : weekdays[weekdayIndex],
              date: moved
                ? new Date(
                    Date.UTC(
                      monday.getUTCFullYear(),
                      monday.getUTCMonth(),
                      monday.getUTCDate() + weekdayIndex,
                    ),
                  )
                : null,
              startTime: timeOfDay(shiftedStart),
              endTime: timeOfDay(shiftedEnd),
              classroom: `ДЕМО-${groupIndex + 1}0${weekdayIndex + 1}`,
              teacher: subjects[subjectIndex].teacher,
              isRescheduled: moved,
              comment: moved
                ? "Тестовый перенос на один час позже обычного времени."
                : null,
            },
          });
        }
      }

      for (const announcement of generalAnnouncements) {
        await tx.notification.create({ data: announcement });
      }
    });

    console.log("Тестовые учётные записи (только для локальной разработки):");
    for (const account of originalAccounts) {
      console.log(`  ${account.login} / ${account.password}`);
    }
    console.log("  student.alpha / пароль задан в SEED_ALPHA_PASSWORD");
    console.log("  student.beta / пароль задан в SEED_BETA_PASSWORD");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Не удалось создать тестовые данные:", error);
  process.exitCode = 1;
});
