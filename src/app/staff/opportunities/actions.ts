"use server";

import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { requireStaffContext } from "@/lib/staff";

function validUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function createOpportunityAction(formData: FormData) {
  const { userId } = await requireStaffContext();
  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const organizer = String(formData.get("organizer") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const requirements = String(formData.get("requirements") ?? "").trim();
  const deadline = String(formData.get("deadline") ?? "");
  const officialUrl = String(formData.get("officialUrl") ?? "").trim();
  const status = String(formData.get("status") ?? "DRAFT");
  if (title.length < 1 || title.length > 120 || organizer.length < 1 || organizer.length > 160 ||
      description.length < 1 || requirements.length < 1 || !deadline ||
      !["COMPETITION", "INTERNSHIP", "CONFERENCE", "OTHER"].includes(type) ||
      !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status) || !validUrl(officialUrl)) {
    throw new Error("Проверьте обязательные поля и формат ссылки.");
  }
  const deadlineDate = new Date(deadline);
  if (Number.isNaN(deadlineDate.getTime())) throw new Error("Некорректный дедлайн.");
  const prisma = getPrisma();
  await prisma.opportunity.create({
    data: {
      title,
      type: type as "COMPETITION" | "INTERNSHIP" | "CONFERENCE" | "OTHER",
      organizer,
      description,
      requirements,
      deadline: deadlineDate,
      officialUrl: officialUrl || null,
      requiredDocuments: [],
      status: status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
      createdById: userId,
    },
  });
  redirect("/staff/opportunities");
}
