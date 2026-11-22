"use server";

import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { requireStaffContext } from "@/lib/staff";
import {
  validateOpportunityForm,
  type OpportunityFormValue,
} from "@/lib/opportunity-validation";

async function validateForm(formData: FormData): Promise<OpportunityFormValue> {
  const faculties = await getPrisma().student.findMany({
    distinct: ["faculty"],
    select: { faculty: true },
  });
  const result = validateOpportunityForm(
    formData,
    faculties.map(({ faculty }) => faculty),
  );
  if (!result.ok) throw new Error(result.errors[0] ?? "Проверьте поля формы.");
  return result.value;
}

function toOpportunityData(value: OpportunityFormValue) {
  return {
    title: value.title,
    type: value.type,
    organizer: value.organizer,
    shortDescription: value.shortDescription,
    description: value.description,
    requirements: value.requirements,
    deadline: value.deadline,
    allowLateRequests: value.allowLateRequests,
    lateRequestsUntil: value.lateRequestsUntil,
    directions: value.directions,
    minCourse: value.minCourse,
    maxCourse: value.maxCourse,
    allowedFaculties: value.allowedFaculties,
    format: value.format,
    location: value.location,
    startsAt: value.startsAt,
    endsAt: value.endsAt,
    cost: value.cost,
    costNote: value.costNote,
    officialUrl: value.officialUrl,
    requiredDocuments: value.requiredDocuments,
    details: value.details,
    status: value.status,
  };
}

export async function createOpportunityAction(formData: FormData) {
  const { userId } = await requireStaffContext();
  const value = await validateForm(formData);
  await getPrisma().opportunity.create({
    data: { ...toOpportunityData(value), createdById: userId },
  });
  redirect("/staff/opportunities");
}

export async function updateOpportunityAction(formData: FormData) {
  await requireStaffContext();
  const id = Number(formData.get("opportunityId"));
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error("Не удалось найти возможность.");
  }
  const existing = await getPrisma().opportunity.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw new Error("Возможность не найдена.");
  const value = await validateForm(formData);
  await getPrisma().opportunity.update({
    where: { id },
    data: toOpportunityData(value),
  });
  redirect("/staff/opportunities");
}

export async function deleteOrArchiveOpportunityAction(formData: FormData) {
  await requireStaffContext();
  const id = Number(formData.get("opportunityId"));
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error("Не удалось найти возможность.");
  }
  const prisma = getPrisma();
  const opportunity = await prisma.opportunity.findUnique({
    where: { id },
    select: { id: true, applications: { select: { id: true }, take: 1 } },
  });
  if (!opportunity) throw new Error("Возможность не найдена.");
  if (opportunity.applications.length > 0) {
    await prisma.opportunity.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });
  } else {
    await prisma.opportunity.delete({ where: { id } });
  }
  redirect("/staff/opportunities");
}

function plusWeek(value: Date | null): Date | null {
  if (!value) return null;
  return new Date(value.getTime() + 7 * 24 * 60 * 60 * 1000);
}

export async function duplicateOpportunityAction(formData: FormData) {
  const { userId } = await requireStaffContext();
  const id = Number(formData.get("opportunityId"));
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error("Не удалось найти возможность.");
  }
  const source = await getPrisma().opportunity.findUnique({ where: { id } });
  if (!source) throw new Error("Возможность не найдена.");
  await getPrisma().opportunity.create({
    data: {
      title: `${source.title.slice(0, 112)} — копия`,
      type: source.type,
      organizer: source.organizer,
      shortDescription: source.shortDescription,
      description: source.description,
      requirements: source.requirements,
      deadline: plusWeek(source.deadline)!,
      allowLateRequests: source.allowLateRequests,
      lateRequestsUntil: plusWeek(source.lateRequestsUntil),
      directions: source.directions,
      minCourse: source.minCourse,
      maxCourse: source.maxCourse,
      allowedFaculties: source.allowedFaculties,
      format: source.format,
      formatLegacy: source.formatLegacy,
      location: source.location,
      startsAt: plusWeek(source.startsAt),
      endsAt: plusWeek(source.endsAt),
      cost: source.cost,
      costNote: source.costNote,
      officialUrl: source.officialUrl,
      eventDate: plusWeek(source.eventDate),
      requiredDocuments: source.requiredDocuments as Prisma.InputJsonValue,
      details: source.details as Prisma.InputJsonValue,
      status: "DRAFT",
      createdById: userId,
    },
  });
  redirect("/staff/opportunities");
}
