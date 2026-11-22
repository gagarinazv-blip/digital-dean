"use server";

import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { requireStaffContext } from "@/lib/staff";

export async function updateOpportunityApplicationStatusAction(formData: FormData) {
  const { userId } = await requireStaffContext();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "");
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 2000);
  if (!Number.isSafeInteger(id) || id < 1 ||
      !["IN_REVIEW", "NEEDS_INFO", "ACCEPTED", "REJECTED", "WITHDRAWN"].includes(status)) {
    throw new Error("Некорректные данные заявки.");
  }
  const prisma = getPrisma();
  const application = await prisma.opportunityApplication.findUnique({
    where: { id },
    include: { opportunity: { select: { title: true } }, student: { select: { id: true } } },
  });
  if (!application) throw new Error("Заявка не найдена.");
  await prisma.$transaction(async (tx) => {
    await tx.opportunityApplication.update({
      where: { id },
      data: {
        status: status as "IN_REVIEW" | "NEEDS_INFO" | "ACCEPTED" | "REJECTED" | "WITHDRAWN",
        staffComment: comment || null,
        decidedById: ["ACCEPTED", "REJECTED"].includes(status) ? userId : null,
      },
    });
    await tx.notification.create({
      data: {
        studentId: application.student.id,
        type: "OPPORTUNITY_STATUS",
        title: "Статус заявки на участие изменён",
        text: `Статус заявки на «${application.opportunity.title}»: ${status}.`,
        targetType: "OPPORTUNITY_APPLICATION",
        targetId: application.publicId,
      },
    });
  });
  redirect(`/staff/opportunities/${application.opportunityId}/applications`);
}
