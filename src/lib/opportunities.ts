import "server-only";

import { forbidden, redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { requireStudentContext } from "@/lib/student";
import { requireStaffContext } from "@/lib/staff";

export type OpportunityRequirement = {
  key: string;
  title: string;
  required: boolean;
};

export function parseRequirements(value: unknown): OpportunityRequirement[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is OpportunityRequirement =>
    typeof item === "object" &&
    item !== null &&
    typeof (item as OpportunityRequirement).key === "string" &&
    typeof (item as OpportunityRequirement).title === "string" &&
    typeof (item as OpportunityRequirement).required === "boolean",
  );
}

export async function getServerOpportunities() {
  const prisma = getPrisma();
  return prisma.opportunity.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ deadline: "asc" }, { id: "desc" }],
  });
}

export async function submitOpportunityApplication(
  opportunityId: number,
  motivation: string,
): Promise<void> {
  const { student, userId } = await requireStudentContext();
  if (!Number.isSafeInteger(opportunityId) || opportunityId < 1) {
    throw new Error("Некорректное мероприятие.");
  }
  const prisma = getPrisma();
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });
  if (!opportunity || opportunity.status !== "PUBLISHED") {
    throw new Error("Мероприятие недоступно.");
  }
  if (opportunity.deadline.getTime() <= Date.now()) {
    throw new Error("Приём заявок закрыт.");
  }
  const active = await prisma.opportunityApplication.findFirst({
    where: {
      opportunityId,
      studentId: student.id,
      status: { notIn: ["WITHDRAWN", "REJECTED", "ACCEPTED"] },
    },
  });
  if (active) {
    throw new Error("Активная заявка уже существует.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.opportunityApplication.create({
      data: {
        opportunityId,
        studentId: student.id,
        motivation: motivation.trim().slice(0, 2000) || null,
        studentSnapshot: {
          fullName: student.fullName,
          faculty: student.faculty,
          direction: student.direction,
          course: student.course,
          groupName: student.group.name,
          recordBookNumber: student.recordBookNumber,
          studyForm: student.studyForm,
        },
      },
    });
  });
  redirect("/opportunities/applications");
}

export async function withdrawOpportunityApplication(publicId: string) {
  const { student } = await requireStudentContext();
  const prisma = getPrisma();
  const application = await prisma.opportunityApplication.findFirst({
    where: { publicId, studentId: student.id },
  });
  if (!application) forbidden();
  if (["ACCEPTED", "REJECTED", "WITHDRAWN"].includes(application.status)) {
    throw new Error("Эту заявку нельзя отозвать.");
  }
  await prisma.opportunityApplication.update({
    where: { id: application.id },
    data: { status: "WITHDRAWN" },
  });
  redirect("/opportunities/applications");
}

export async function requireStaffOpportunityAccess() {
  return requireStaffContext();
}
