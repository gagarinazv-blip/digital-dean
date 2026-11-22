"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { assertSameSiteRequest } from "@/lib/auth";
import { getActiveCertificateForm } from "@/lib/certificate-forms";
import { getPrisma } from "@/lib/prisma";
import { createRequestCatalogSnapshot } from "@/lib/request-catalog";
import {
  validateRequestUploads,
  type PreparedRequestAttachment,
} from "@/lib/request-attachments";
import { getRequestProfileSnapshot } from "@/lib/request-profile";
import { validateRequestForm } from "@/lib/request-validation";
import type { RequestActionState } from "@/lib/request-action-state";
import {
  canStudentCancelRequest,
  isRequestPublicId,
} from "@/lib/request-workflow";
import { requireStudentContext } from "@/lib/student";

const MAX_MESSAGE_LENGTH = 5000;

function getMessage(formData: FormData): string | null {
  const value = formData.get("content");
  if (typeof value !== "string") {
    return null;
  }

  const content = value.trim();
  return content.length <= MAX_MESSAGE_LENGTH ? content : null;
}

function revalidateStudentRequestPaths(publicId?: string): void {
  revalidatePath("/");
  revalidatePath("/help");
  revalidatePath("/notifications");
  revalidatePath("/requests");
  revalidatePath("/staff/requests");
  if (publicId !== undefined) {
    revalidatePath(`/requests/${publicId}`);
  }
}

export async function createRequestAction(
  _previousState: RequestActionState,
  formData: FormData,
): Promise<RequestActionState> {
  await assertSameSiteRequest();
  const { userId, student } = await requireStudentContext();
  const rawPublicId = formData.get("requestPublicId");
  if (typeof rawPublicId !== "string" || !isRequestPublicId(rawPublicId)) {
    return { error: "Не удалось создать заявку. Обновите страницу." };
  }

  const rawFields: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("field.") && typeof value === "string") {
      rawFields[key.slice("field.".length)] = value;
    }
  }

  const rawCatalogCode = formData.get("catalogCode");
  if (typeof rawCatalogCode !== "string") {
    return {
      error: "Выберите услугу из списка.",
      fieldErrors: { catalogCode: "Выберите услугу из списка." },
    };
  }
  const service = await getActiveCertificateForm(rawCatalogCode);
  if (!service) {
    return {
      error: "Выбранная услуга больше недоступна. Обновите страницу.",
      fieldErrors: { catalogCode: "Выберите доступную услугу." },
    };
  }

  // Файлы полей формы проверяются вместе с остальными вложениями.
  const fieldUploads: {
    fieldKey: string;
    files: PreparedRequestAttachment[];
  }[] = [];
  const fileErrors: Record<string, string> = {};
  for (const field of service.fields) {
    if (field.kind !== "file") continue;
    const result = await validateRequestUploads(
      formData.getAll(`file.${field.id}`).slice(0, 1),
    );
    if (!result.ok) fileErrors[field.id] = result.error;
    else if (result.files.length > 0) {
      fieldUploads.push({ fieldKey: field.id, files: result.files });
    }
    rawFields[field.id] = result.ok ? (result.files[0]?.fileName ?? "") : "file";
  }

  const validated = validateRequestForm({
    catalogCode: service.code,
    fields: rawFields,
    description: formData.get("description"),
  }, [service]);
  if (!validated.valid || Object.keys(fileErrors).length > 0) {
    return {
      ...(validated.errors.fields ? { error: validated.errors.fields } : {}),
      fieldErrors: { ...validated.errors, ...fileErrors },
    };
  }
  const validatedService = validated.service;
  if (!validatedService) {
    return { error: "Выберите услугу из списка." };
  }

  const content = validated.description;
  let request: { id: number; publicId: string; studentId: number };
  try {
    const uploads = await validateRequestUploads(formData.getAll("files"));
    if (!uploads.ok) {
      return { error: uploads.error };
    }

    const attachments = [
      ...fieldUploads.flatMap(({ fieldKey, files }) =>
        files.map((file) => ({ ...file, fieldKey })),
      ),
      ...uploads.files,
    ];

    request = await getPrisma().$transaction(async (tx) =>
      tx.request.upsert({
        where: { publicId: rawPublicId },
        create: {
          publicId: rawPublicId,
          studentId: student.id,
          type: validatedService.requestType,
          catalogCode: validatedService.code,
          formFields: validated.fields,
          formSchemaSnapshot: createRequestCatalogSnapshot(validatedService),
          comment: content || null,
          profileSnapshot: getRequestProfileSnapshot(student),
          status: "NEW",
          statusHistory: {
            create: {
              fromStatus: null,
              status: "NEW",
              authorUserId: userId,
              comment: "Заявка подана студентом.",
            },
          },
          ...(content || attachments.length > 0
            ? {
                comments: {
                  create: {
                    authorUserId: userId,
                    visibility: "PUBLIC",
                    content: content || "Документы приложены к заявке.",
                    attachments: { create: attachments },
                  },
                },
              }
            : {}),
        },
        update: {},
        select: { id: true, publicId: true, studentId: true },
      }),
    );
  } catch (error) {
    console.error("[requests:create] Не удалось сохранить заявку.", {
      studentId: student.id,
      publicId: rawPublicId,
      error,
    });
    return {
      error: "Не удалось отправить заявку. Попробуйте ещё раз позже.",
    };
  }

  if (request.studentId !== student.id) {
    return { error: "Не удалось создать заявку. Обновите страницу." };
  }

  revalidateStudentRequestPaths(request.publicId);
  redirect(`/requests/${request.publicId}?created=1`);
}

export async function cancelRequestAction(
  _previousState: RequestActionState,
  formData: FormData,
): Promise<RequestActionState> {
  await assertSameSiteRequest();
  const { userId, student } = await requireStudentContext();
  const rawPublicId = formData.get("requestPublicId");
  if (typeof rawPublicId !== "string" || !isRequestPublicId(rawPublicId)) {
    notFound();
  }

  const prisma = getPrisma();
  const request = await prisma.request.findFirst({
    where: { publicId: rawPublicId, studentId: student.id },
    select: { id: true, status: true },
  });
  if (!request) {
    notFound();
  }
  if (!canStudentCancelRequest(request.status)) {
    return { error: "Отменить можно только новую заявку." };
  }

  const cancelled = await prisma.$transaction(async (tx) => {
    const updated = await tx.request.updateMany({
      where: {
        id: request.id,
        studentId: student.id,
        status: "NEW",
      },
      data: { status: "CANCELLED", updatedAt: new Date() },
    });
    if (updated.count !== 1) {
      return false;
    }

    await tx.requestStatusHistory.create({
      data: {
        requestId: request.id,
        fromStatus: request.status,
        status: "CANCELLED",
        authorUserId: userId,
        comment: "Заявка отменена студентом.",
      },
    });
    await tx.notification.create({
      data: {
        studentId: student.id,
        type: "REQUEST_STATUS",
        title: "Заявка отменена",
        text: "Вы отменили свою заявку.",
        targetType: "REQUEST",
        targetId: rawPublicId,
      },
    });
    return true;
  });

  if (!cancelled) {
    return {
      error: "Заявка уже изменилась. Обновите страницу и попробуйте снова.",
    };
  }

  revalidateStudentRequestPaths(rawPublicId);
  redirect(`/requests/${rawPublicId}?cancelled=1`);
}

export async function replyToRequestAction(
  _previousState: RequestActionState,
  formData: FormData,
): Promise<RequestActionState> {
  await assertSameSiteRequest();
  const { userId, student } = await requireStudentContext();
  const rawPublicId = formData.get("requestPublicId");
  if (typeof rawPublicId !== "string" || !isRequestPublicId(rawPublicId)) {
    notFound();
  }

  const request = await getPrisma().request.findFirst({
    where: { publicId: rawPublicId, studentId: student.id },
    select: { id: true, publicId: true, status: true },
  });
  if (!request) {
    notFound();
  }
  if (request.status === "CANCELLED") {
    return { error: "В отменённой заявке нельзя отправить сообщение." };
  }

  const content = getMessage(formData);
  if (content === null) {
    return { error: "Сообщение слишком длинное." };
  }

  const uploads = await validateRequestUploads(formData.getAll("files"));
  if (!uploads.ok) {
    return { error: uploads.error };
  }
  if (content.length === 0 && uploads.files.length === 0) {
    return { error: "Напишите ответ или прикрепите документ." };
  }

  const saved = await getPrisma().$transaction(async (tx) => {
    const nextStatus: "IN_PROGRESS" | null =
      request.status === "NEEDS_INFO" ? "IN_PROGRESS" : null;
    const updated = await tx.request.updateMany({
      where: {
        id: request.id,
        studentId: student.id,
        status: request.status,
      },
      data: {
        ...(nextStatus ? { status: nextStatus } : {}),
        updatedAt: new Date(),
      },
    });
    if (updated.count !== 1) {
      return false;
    }

    await tx.requestComment.create({
      data: {
        requestId: request.id,
        authorUserId: userId,
        visibility: "PUBLIC",
        content: content || "Документы приложены к заявке.",
        attachments: { create: uploads.files },
      },
    });
    if (nextStatus) {
      await tx.requestStatusHistory.create({
        data: {
          requestId: request.id,
          status: nextStatus,
          authorUserId: userId,
          comment: "Студент отправил запрошенное уточнение.",
        },
      });
    }
    return true;
  });

  if (!saved) {
    return {
      error: "Заявка уже изменилась. Обновите страницу и попробуйте снова.",
    };
  }

  revalidateStudentRequestPaths(request.publicId);
  revalidatePath("/staff");
  revalidatePath("/staff/requests");
  revalidatePath(`/staff/requests/${request.id}`);
  return {
    success:
      request.status === "NEEDS_INFO"
        ? "Ответ отправлен, заявка возвращена в работу."
        : "Сообщение отправлено сотруднику.",
  };
}
