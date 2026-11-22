import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { getDemoNow } from "../src/lib/demo-date";
import { opportunitySeeds } from "./opportunity-seed-data";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed opportunities.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function seedOpportunities() {
  await prisma.$transaction(async (tx) => {
    const staff = await tx.user.findFirst({
      where: { role: "STAFF" },
      orderBy: { id: "asc" },
      select: { id: true },
    });
    const students = await tx.student.findMany({
      where: {
        user: { login: { in: ["student.alpha", "student.beta"] } },
      },
      select: { id: true, user: { select: { login: true } } },
    });
    const studentIds = new Map(
      students.map((student) => [student.user.login, student.id]),
    );
    const alphaStudentId = studentIds.get("student.alpha");
    const betaStudentId = studentIds.get("student.beta");

    if (!staff || !alphaStudentId || !betaStudentId) {
      throw new Error(
        "Seed staff, student.alpha, and student.beta accounts before seeding opportunities.",
      );
    }

    const seedNow = getDemoNow();
    const applicationStatuses = [
      "SUBMITTED",
      "IN_REVIEW",
      "NEEDS_INFO",
      "ACCEPTED",
      "REJECTED",
      "WITHDRAWN",
    ] as const;

    for (const [index, seed] of opportunitySeeds.entries()) {
      const deadline = new Date(
        seedNow.getTime() + seed.offset * 24 * 60 * 60 * 1000,
      );
      const data = {
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
          {
            key: "statement",
            title: "Эссе или мотивационное письмо",
            required: false,
          },
        ],
        details: seed.details,
        status: seed.status,
        createdById: staff.id,
      };
      const existing = await tx.opportunity.findFirst({
        where: { title: seed.title },
        select: { id: true },
      });
      const opportunity = existing
        ? await tx.opportunity.update({
            where: { id: existing.id },
            data,
          })
        : await tx.opportunity.create({ data });
      if (seed.status === "DRAFT") continue;
      const studentId = index % 2 === 0 ? alphaStudentId : betaStudentId;
      const existingApplication = await tx.opportunityApplication.findFirst({
        where: { opportunityId: opportunity.id, studentId },
        select: { id: true },
      });

      if (!existingApplication) {
        const status = applicationStatuses[index % applicationStatuses.length];
        await tx.opportunityApplication.create({
          data: {
            opportunityId: opportunity.id,
            studentId,
            kind: seed.allowLateRequests ? "LATE_REQUEST" : "STANDARD",
            status,
            motivation: "Вымышленная мотивация студента для демонстрации сценария.",
            studentSnapshot: {
              fullName:
                index % 2 === 0
                  ? "Елизавета Воронцова"
                  : "Александр Фёдоров",
              groupName:
                index % 2 === 0 ? "TEST-ACADEMIC-31A" : "TEST-ACADEMIC-32B",
              course: 3,
              faculty:
                index % 2 === 0
                  ? "Факультет прикладных вычислений"
                  : "Факультет международных отношений",
            },
            staffComment:
              status === "IN_REVIEW"
                ? "Заявка передана на рассмотрение."
                : null,
            decidedById:
              status === "ACCEPTED" || status === "REJECTED" ? staff.id : null,
          },
        });
      }
    }
  });
}

seedOpportunities()
  .catch((error: unknown) => {
    console.error("Opportunity seeding failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
