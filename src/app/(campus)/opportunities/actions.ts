"use server";

import { redirect } from "next/navigation";
import { submitOpportunityApplication, withdrawOpportunityApplication } from "@/lib/opportunities";
import { getPrisma } from "@/lib/prisma";
import { requireStudentContext } from "@/lib/student";
import { safeOpportunityReturnTo } from "@/lib/opportunity-catalog";

export async function submitOpportunityAction(opportunityId: number, formData: FormData) {
  await submitOpportunityApplication(opportunityId, formData);
}

export async function withdrawOpportunityAction(formData: FormData) {
  const publicId = formData.get("publicId");
  if (typeof publicId === "string") {
    await withdrawOpportunityApplication(publicId);
  }
}

export async function toggleOpportunityBookmarkAction(formData: FormData) {
  const { student } = await requireStudentContext();
  const opportunityId = Number(formData.get("opportunityId"));
  const returnTo = safeOpportunityReturnTo(formData.get("returnTo"));
  if (!Number.isSafeInteger(opportunityId) || opportunityId < 1) {
    throw new Error("Некорректная возможность.");
  }

  const prisma = getPrisma();
  const opportunity = await prisma.opportunity.findFirst({
    where: { id: opportunityId, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!opportunity) throw new Error("Возможность недоступна.");

  const key = {
    studentId_opportunityId: {
      studentId: student.id,
      opportunityId,
    },
  };
  const bookmark = await prisma.opportunityBookmark.findUnique({
    where: key,
    select: { studentId: true },
  });
  if (bookmark) {
    await prisma.opportunityBookmark.delete({ where: key });
  } else {
    await prisma.opportunityBookmark.create({
      data: { studentId: student.id, opportunityId },
    });
  }
  redirect(returnTo);
}
