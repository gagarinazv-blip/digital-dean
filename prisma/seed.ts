import "dotenv/config";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const accounts = [
  {
    login: "test.seed.01",
    password: "TestOnly-01!",
    fullName: "Аэлитта Ветрова-Даль",
    groupName: "TEST-SEED-01",
    course: 1,
  },
  {
    login: "test.seed.02",
    password: "TestOnly-02!",
    fullName: "Яромир Листогоров",
    groupName: "TEST-SEED-01",
    course: 1,
  },
  {
    login: "test.seed.03",
    password: "TestOnly-03!",
    fullName: "Мирелла Камышова",
    groupName: "TEST-SEED-02",
    course: 2,
  },
  {
    login: "test.seed.04",
    password: "TestOnly-04!",
    fullName: "Терентий Облаков",
    groupName: "TEST-SEED-02",
    course: 2,
  },
  {
    login: "test.seed.05",
    password: "TestOnly-05!",
    fullName: "Лиора Звездолётова",
    groupName: "TEST-SEED-03",
    course: 3,
  },
  {
    login: "test.seed.06",
    password: "TestOnly-06!",
    fullName: "Феликс Кленоветер",
    groupName: "TEST-SEED-03",
    course: 3,
  },
] as const;

const groupNames = [...new Set(accounts.map((account) => account.groupName))];
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

function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(`scrypt$${salt}$${derivedKey.toString("hex")}`);
    });
  });
}

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

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const passwordHashes = await Promise.all(
      accounts.map((account) => hashPassword(account.password)),
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
            faculty: "Факультет вымышленных исследований",
            direction: "Межмировые коммуникации",
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

        const requestStatuses = [
          "PENDING",
          "IN_PROGRESS",
          "APPROVED",
        ] as const;
        const requestTypes = ["CERTIFICATE", "APPLICATION", "OTHER"] as const;
        for (const requestIndex of requestStatuses.keys()) {
          await tx.request.create({
            data: {
              studentId: student.id,
              type: requestTypes[requestIndex],
              status: requestStatuses[requestIndex],
              comment: `Тестовая заявка ${requestIndex + 1}; данные вымышлены.`,
            },
          });
        }

        for (const notificationIndex of [1, 2]) {
          await tx.notification.create({
            data: {
              studentId: student.id,
              title: `[TEST SEED] Личное уведомление ${notificationIndex}`,
              text: `Тестовая информация для ${account.fullName}.`,
              deadline:
                notificationIndex === 1
                  ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                  : null,
            },
          });
        }
      }

      const monday = nextMonday();
      const groupScheduleIndexes = new Map<string, number>();
      for (const account of accounts) {
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
    for (const account of accounts) {
      console.log(`  ${account.login} / ${account.password}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Не удалось создать тестовые данные:", error);
  process.exitCode = 1;
});
