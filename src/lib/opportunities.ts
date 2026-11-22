import "server-only";

import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import type { OpportunityType } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma";
import { requireStudentContext } from "@/lib/student";
import { requireStaffContext } from "@/lib/staff";
import { getDemoNow } from "@/lib/demo-date";
import { fileStorage } from "@/lib/file-storage";
import {
  MAX_OPPORTUNITY_APPLICATION_BYTES,
  MAX_OPPORTUNITY_FILES_PER_SLOT,
  validateOpportunityFile,
  validateStoredOpportunityFile,
  type PreparedOpportunityFile,
} from "@/lib/opportunity-application-files";
import {
  getOpportunityApplicationFields,
  getOpportunityApplicationAnswerInput,
  getOpportunityApplicationRequirements,
  isStudentEligible,
  safeOpportunityReturnTo,
  validateOpportunityApplicationAnswers,
  validateOpportunityDetails,
} from "@/lib/opportunity-catalog";
import { notifyStaff } from "@/lib/staff-notification-workflow";

export type OpportunityRequirement = {
  key: string;
  title: string;
  required: boolean;
};

export function parseRequirements(value: unknown): OpportunityRequirement[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is OpportunityRequirement => {
    if (typeof item !== "object" || item === null) return false;
    const record = item as Record<string, unknown>;
    return (
      typeof record.key === "string" &&
      /^[a-zA-Z0-9_-]{1,80}$/.test(record.key) &&
      typeof record.title === "string" &&
      record.title.trim().length > 0 &&
      record.title.length <= 120 &&
      typeof record.required === "boolean"
    );
  });
}

export async function getServerOpportunities() {
  const prisma = getPrisma();
  return prisma.opportunity.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ deadline: "asc" }, { id: "desc" }],
  });
}

function selectedIds(formData: FormData, key: string): number[] {
  const rawValues = formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string" && value !== "");
  const ids = rawValues.map(Number);
  if (ids.some((id) => !Number.isSafeInteger(id) || id < 1)) {
    throw new Error("Выбран некорректный архивный файл.");
  }
  return [...new Set(ids)];
}

async function prepareApplicationFiles(
  formData: FormData,
  studentId: number,
  opportunityId: number,
  requirements: OpportunityRequirement[],
): Promise<Array<PreparedOpportunityFile & { requirementKey: string }>> {
  const prisma = getPrisma();
  const prepared: Array<PreparedOpportunityFile & { requirementKey: string }> = [];
  let totalSize = 0;

  for (const requirement of requirements) {
    const uploaded = formData
      .getAll(`upload_${requirement.key}`)
      .filter((value): value is File => value instanceof File && value.size > 0);
    const documentIds = selectedIds(formData, `studentDocument_${requirement.key}`);
    const portfolioIds = selectedIds(formData, `portfolioItem_${requirement.key}`);
    const slotCount = uploaded.length + documentIds.length + portfolioIds.length;

    if (slotCount > MAX_OPPORTUNITY_FILES_PER_SLOT) {
      throw new Error(`Для «${requirement.title}» можно приложить не более трёх файлов.`);
    }

    for (const upload of uploaded) {
      const validated = await validateOpportunityFile(upload);
      if (!validated.ok) throw new Error(validated.error);
      prepared.push({ ...validated.file, requirementKey: requirement.key });
    }

    if (documentIds.length > 0) {
      const documents = await prisma.studentDocument.findMany({
        where: { id: { in: documentIds }, studentId },
      });
      if (documents.length !== documentIds.length) {
        throw new Error("Один из личных документов недоступен.");
      }
      for (const document of documents) {
        const content = await fileStorage.read(document.storedName);
        const validated = validateStoredOpportunityFile(
          document.originalName,
          document.mimeType,
          content,
        );
        if (!validated.ok) throw new Error(validated.error);
        prepared.push({ ...validated.file, requirementKey: requirement.key });
      }
    }

    if (portfolioIds.length > 0) {
      const items = await prisma.portfolioItem.findMany({
        where: { id: { in: portfolioIds }, studentId },
      });
      if (items.length !== portfolioIds.length) {
        throw new Error("Один из файлов портфолио недоступен.");
      }
      for (const item of items) {
        const content = await fileStorage.read(item.storedName);
        const validated = validateStoredOpportunityFile(
          item.originalName,
          item.mimeType,
          content,
        );
        if (!validated.ok) throw new Error(validated.error);
        prepared.push({ ...validated.file, requirementKey: requirement.key });
      }
    }

    const attachedCount = prepared.filter(
      (file) => file.requirementKey === requirement.key,
    ).length;
    if (requirement.required && attachedCount === 0) {
      throw new Error(`Приложите обязательный документ «${requirement.title}».`);
    }
  }

  for (const file of prepared) totalSize += file.size;
  if (totalSize > MAX_OPPORTUNITY_APPLICATION_BYTES) {
    throw new Error("Общий размер файлов не должен превышать 25 МБ.");
  }

  return prepared;
}

export async function submitOpportunityApplication(
  opportunityId: number,
  formData: FormData,
): Promise<void> {
  const { student } = await requireStudentContext();
  if (!Number.isSafeInteger(opportunityId) || opportunityId < 1) {
    throw new Error("Некорректная возможность.");
  }
  const prisma = getPrisma();
  const opportunity = await prisma.opportunity.findUnique({
    where: { id: opportunityId },
  });
  if (!opportunity || opportunity.status !== "PUBLISHED") {
    throw new Error("Возможность недоступна.");
  }

  const now = getDemoNow();
  const isLate = opportunity.deadline.getTime() < now.getTime();
  const requestedKind = isLate ? "LATE_REQUEST" : "STANDARD";
  if (isLate) {
    if (
      requestedKind !== "LATE_REQUEST" ||
      !opportunity.allowLateRequests ||
      (opportunity.lateRequestsUntil !== null &&
        opportunity.lateRequestsUntil.getTime() < now.getTime())
    ) {
      throw new Error("Приём заявок закрыт.");
    }
  } else if (requestedKind !== "STANDARD") {
    throw new Error("Индивидуальный запрос доступен только после дедлайна.");
  }

  const eligibility = isStudentEligible(opportunity, student);
  if (!eligibility.eligible) {
    throw new Error(eligibility.reason ?? "Возможность недоступна для вашего профиля.");
  }

  const eventValidation = validateOpportunityDetails(
    opportunity.type,
    opportunity.details,
  );
  if (Object.keys(eventValidation.errors).length > 0) {
    throw new Error("Параметры возможности настроены некорректно.");
  }
  if (
    opportunity.type === "SPORT" &&
    eventValidation.details.additionalRecruitment === true &&
    eventValidation.details.freeSpots === 0
  ) {
    throw new Error("Мест нет.");
  }

  const portfolioItems = await prisma.portfolioItem.findMany({
    where: { studentId: student.id },
    select: { id: true, title: true },
  });
  const applicationFields = getOpportunityApplicationFields(opportunity.type, {
    eventDetails: eventValidation.details,
    directions: opportunity.directions,
    portfolioItems,
  });
  const answerInput = getOpportunityApplicationAnswerInput(
    formData,
    applicationFields,
  );
  const validatedAnswers = validateOpportunityApplicationAnswers(
    opportunity.type,
    answerInput,
    {
      eventDetails: eventValidation.details,
      directions: opportunity.directions,
      portfolioItems,
    },
  );
  if (Object.keys(validatedAnswers.errors).length > 0) {
    throw new Error(Object.values(validatedAnswers.errors)[0]);
  }

  const lateReasonValue = formData.get("lateReason");
  const lateReason =
    typeof lateReasonValue === "string" ? lateReasonValue.trim() : "";
  if (requestedKind === "LATE_REQUEST" && (lateReason.length < 20 || lateReason.length > 1000)) {
    throw new Error("Причина индивидуального запроса должна содержать от 20 до 1000 символов.");
  }

  const requirements = getOpportunityApplicationRequirements(
    opportunity.type,
    eventValidation.details,
    parseRequirements(opportunity.requiredDocuments),
  );
  const files = await prepareApplicationFiles(
    formData,
    student.id,
    opportunity.id,
    requirements,
  );
  const storedNames: string[] = [];

  try {
    for (const file of files) {
      const storedName = await fileStorage.save(file.data, file.extension);
      storedNames.push(storedName);
      file.originalName = file.originalName.slice(0, 255);
    }

    const studentRecord = await prisma.student.findUnique({
      where: { id: student.id },
      select: {
        fullName: true,
        faculty: true,
        direction: true,
        course: true,
        phone: true,
        corporateEmail: true,
        group: { select: { name: true } },
      },
    });
    if (!studentRecord) throw new Error("Профиль студента не найден.");

    await prisma.$transaction(
      async (tx) => {
        const previous = await tx.opportunityApplication.findFirst({
          where: {
            opportunityId,
            studentId: student.id,
            status: { not: "WITHDRAWN" },
          },
          select: { id: true },
        });
        if (previous) throw new Error("Вы уже подавали заявку на эту возможность.");

        const application = await tx.opportunityApplication.create({
          data: {
            opportunityId,
            studentId: student.id,
            kind: requestedKind,
            motivation: validatedAnswers.motivation,
            lateReason: requestedKind === "LATE_REQUEST" ? lateReason : null,
            details: validatedAnswers.details as Prisma.InputJsonObject,
            studentSnapshot: {
              fullName: studentRecord.fullName,
              groupName: studentRecord.group.name,
              course: studentRecord.course,
              faculty: studentRecord.faculty,
              direction: studentRecord.direction,
              phone: studentRecord.phone ?? "",
              corporateEmail: studentRecord.corporateEmail ?? "",
            },
          },
        });

        if (files.length > 0) {
          await tx.applicationFile.createMany({
            data: files.map((file, index) => ({
              applicationId: application.id,
              requirementKey: file.requirementKey,
              originalName: file.originalName,
              storedName: storedNames[index],
              mimeType: file.mimeType,
              size: file.size,
            })),
          });
        }

        await notifyStaff(tx, {
          eventKey: `opportunity-application:${application.id}`,
          type: "NEW_OPPORTUNITY_APPLICATION",
          title: requestedKind === "LATE_REQUEST"
            ? "Новый индивидуальный запрос"
            : "Новая заявка на участие",
          body: `${studentRecord.fullName} подал заявку на «${opportunity.title}».`,
          link: `/staff/opportunities/${opportunity.id}/applications`,
          relatedStudentId: student.id,
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    const cleanup = await Promise.allSettled(
      storedNames.map((storedName) => fileStorage.delete(storedName)),
    );
    if (cleanup.some((result) => result.status === "rejected")) {
      console.error("Opportunity application file cleanup failed.");
    }
    throw error;
  }

  redirect("/opportunities/applications?submitted=1");
}

export async function withdrawOpportunityApplication(publicId: string) {
  const { student } = await requireStudentContext();
  const prisma = getPrisma();
  const application = await prisma.opportunityApplication.findFirst({
    where: { publicId, studentId: student.id },
  });
  if (!application) throw new Error("Заявка не найдена.");
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

export function isOpportunityType(value: string): value is OpportunityType {
  return [
    "CONFERENCE",
    "COMPETITION",
    "INTERNSHIP",
    "CASE_CHAMPIONSHIP",
    "GRANT",
    "EXCHANGE",
    "CLUB",
    "CULTURAL",
    "SPORT",
    "VOLUNTEERING",
    "OTHER",
  ].includes(value);
}

export { safeOpportunityReturnTo };
