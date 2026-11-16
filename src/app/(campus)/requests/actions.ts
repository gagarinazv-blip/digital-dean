"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { assertSameSiteRequest } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { validateRequestUploads } from "@/lib/request-attachments";
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
  revalidatePath("/requests");
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

  const validated = validateRequestForm({
    catalogCode: formData.get("catalogCode"),
    fields: rawFields,
    description: formData.get("description"),
  });
  if (!validated.valid) {
    return {
      ...(validated.errors.fields ? { error: validated.errors.fields } : {}),
      fieldErrors: validated.errors,
    };
  }
  const service = validated.service;
  if (!service) {
    return { error: "Выберите услугу из списка." };
  }

  const content = validated.description;
  let request: { id: number; publicId: string; studentId: number };
  try {
    const uploads = await validateRequestUploads(formData.getAll("files"));
    if (!uploads.ok) {
      return { error: uploads.error };
    }

    request = await getPrisma().$transaction(async (tx) =>
      tx.request.upsert({
        where: { publicId: rawPublicId },
        create: {
          publicId: rawPublicId,
          studentId: student.id,
          type: service.requestType,
          catalogCode: service.code,
          formFields: validated.fields,
          comment: content || null,
          profileSnapshot: {
            fullName: student.fullName,
            faculty: student.faculty,
            direction: student.direction,
            course: student.course,
            groupName: student.group.name,
            recordBookNumber: student.recordBookNumber,
            studyForm: student.studyForm,
          },
          status: "NEW",
          statusHistory: {
            create: {
              status: "NEW",
              authorUserId: userId,
              comment: "Заявка подана студентом.",
            },
          },
          ...(content || uploads.files.length > 0
            ? {
                comments: {
                  create: {
                    authorUserId: userId,
                    visibility: "PUBLIC",
                    content: content || "Документы приложены к заявке.",
                    attachments: { create: uploads.files },
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
    const updated = await tx.request.updateMany({
      where: {
        id: request.id,
        studentId: student.id,
        status: request.status,
      },
      data: { updatedAt: new Date() },
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
    return true;
  });

  if (!saved) {
    return {
      error: "Заявка уже изменилась. Обновите страницу и попробуйте снова.",
    };
  }

  revalidateStudentRequestPaths(request.publicId);
  revalidatePath("/staff");
  revalidatePath(`/staff/requests/${request.id}`);
  return {
    success:
      request.status === "NEEDS_INFO"
        ? "Ответ отправлен сотруднику."
        : "Сообщение отправлено сотруднику.",
  };
}
