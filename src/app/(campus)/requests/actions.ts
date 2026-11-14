"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { assertSameSiteRequest } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { validateRequestUploads } from "@/lib/request-attachments";
import type { RequestActionState } from "@/lib/request-action-state";
import { parsePositiveIntegerId, isRequestType } from "@/lib/request-workflow";
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

function revalidateStudentRequestPaths(requestId?: number): void {
  revalidatePath("/");
  revalidatePath("/requests");
  if (requestId !== undefined) {
    revalidatePath(`/requests/${requestId}`);
  }
}

export async function createRequestAction(
  _previousState: RequestActionState,
  formData: FormData,
): Promise<RequestActionState> {
  await assertSameSiteRequest();
  const { userId, student } = await requireStudentContext();
  const rawType = formData.get("type");
  if (typeof rawType !== "string" || !isRequestType(rawType)) {
    return { error: "Выберите вид заявки." };
  }

  const content = getMessage(formData);
  if (content === null) {
    return { error: "Текст заявки слишком длинный." };
  }

  const uploads = await validateRequestUploads(formData.getAll("files"));
  if (!uploads.ok) {
    return { error: uploads.error };
  }
  if (content.length === 0 && uploads.files.length === 0) {
    return { error: "Добавьте описание или прикрепите документ." };
  }

  const request = await getPrisma().request.create({
    data: {
      studentId: student.id,
      type: rawType,
      status: "NEW",
      comments: {
        create: {
          authorUserId: userId,
          visibility: "PUBLIC",
          content: content || "Документы приложены к заявке.",
          attachments: {
            create: uploads.files,
          },
        },
      },
    },
    select: { id: true },
  });

  revalidateStudentRequestPaths(request.id);
  redirect(`/requests/${request.id}`);
}

export async function replyToRequestAction(
  _previousState: RequestActionState,
  formData: FormData,
): Promise<RequestActionState> {
  await assertSameSiteRequest();
  const { userId, student } = await requireStudentContext();
  const rawId = formData.get("requestId");
  const requestId = parsePositiveIntegerId(
    typeof rawId === "string" ? rawId : null,
  );
  if (requestId === null) {
    notFound();
  }

  const request = await getPrisma().request.findFirst({
    where: { id: requestId, studentId: student.id },
    select: { id: true, status: true },
  });
  if (!request) {
    notFound();
  }
  if (request.status !== "NEEDS_INFO") {
    return { error: "Ответить можно только на запрос недостающих данных." };
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
        status: "NEEDS_INFO",
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

  revalidateStudentRequestPaths(request.id);
  revalidatePath("/staff");
  revalidatePath(`/staff/requests/${request.id}`);
  return { success: "Ответ отправлен сотруднику." };
}
