"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { assertSameSiteRequest } from "@/lib/auth";
import { requestStatusLabels } from "@/lib/campus-labels";
import { getPrisma } from "@/lib/prisma";
import { validateRequestUploads } from "@/lib/request-attachments";
import type { RequestActionState } from "@/lib/request-action-state";
import {
  canStaffAssignRequest,
  canStaffChangeStatus,
  canStaffManageAssignedRequest,
  canStaffRollbackRequest,
} from "@/lib/permissions";
import {
  canTransitionRequestStatus,
  getPreviousRequestStatus,
  getStaffRequestFilter,
  isRequestStatus,
  parsePositiveIntegerId,
} from "@/lib/request-workflow";
import { requireStaffContext } from "@/lib/staff";

const MAX_MESSAGE_LENGTH = 5000;

async function getActionRequest(
  requestId: number,
  staff: Awaited<ReturnType<typeof requireStaffContext>>["staff"],
) {
  const request = await getPrisma().request.findFirst({
    where: {
      id: requestId,
      ...getStaffRequestFilter(staff),
    },
    select: {
      id: true,
      publicId: true,
      studentId: true,
      status: true,
      assignedToId: true,
      type: true,
    },
  });
  if (!request) {
    notFound();
  }
  return request;
}

async function ensureRequestStillAccessible(
  requestId: number,
  staff: Awaited<ReturnType<typeof requireStaffContext>>["staff"],
): Promise<void> {
  const request = await getPrisma().request.findFirst({
    where: {
      id: requestId,
      ...getStaffRequestFilter(staff),
    },
    select: { id: true },
  });
  if (!request) {
    notFound();
  }
}

function getRequestId(formData: FormData): number {
  const rawId = formData.get("requestId");
  const requestId = parsePositiveIntegerId(
    typeof rawId === "string" ? rawId : null,
  );
  if (requestId === null) {
    notFound();
  }
  return requestId;
}

function getOptionalMessage(formData: FormData): string | null {
  const value = formData.get("content");
  if (typeof value !== "string") {
    return null;
  }
  const content = value.trim();
  return content.length <= MAX_MESSAGE_LENGTH ? content : null;
}

function revalidateStaffRequestPaths(requestId: number, publicId: string): void {
  revalidatePath("/");
  revalidatePath("/staff");
  revalidatePath(`/staff/requests/${requestId}`);
  revalidatePath("/help");
  revalidatePath("/documents");
  revalidatePath("/requests");
  revalidatePath("/notifications");
  revalidatePath(`/requests/${publicId}`);
}

export async function updateRequestStatusAction(
  _previousState: RequestActionState,
  formData: FormData,
): Promise<RequestActionState> {
  await assertSameSiteRequest();
  const { userId, staff } = await requireStaffContext();
  const requestId = getRequestId(formData);
  const rawStatus = formData.get("status");
  if (typeof rawStatus !== "string" || !isRequestStatus(rawStatus)) {
    return { error: "Выберите допустимый статус." };
  }

  const content = getOptionalMessage(formData);
  if (content === null) {
    return { error: "Сообщение слишком длинное." };
  }
  if (
    (rawStatus === "NEEDS_INFO" || rawStatus === "REJECTED") &&
    content.length === 0
  ) {
    return {
      error:
        rawStatus === "NEEDS_INFO"
          ? "Напишите студенту, какие данные нужно добавить."
          : "Объясните студенту причину отклонения.",
    };
  }

  const request = await getActionRequest(requestId, staff);
  if (!canStaffChangeStatus(staff, request, rawStatus)) {
    return {
      error:
        request.assignedToId === null
          ? "Сначала возьмите заявку в работу."
          : "Этот переход статуса недопустим. Обновите страницу.",
    };
  }

  const updated = await getPrisma().$transaction(async (tx) => {
    const result = await tx.request.updateMany({
      where: {
        id: request.id,
        status: request.status,
        assignedToId: staff.id,
      },
      data: { status: rawStatus, updatedAt: new Date() },
    });
    if (result.count !== 1) {
      return false;
    }

    if (rawStatus === "NEEDS_INFO" || rawStatus === "REJECTED") {
      await tx.requestComment.create({
        data: {
          requestId: request.id,
          authorUserId: userId,
          visibility: "PUBLIC",
          content,
        },
      });
    }
    await tx.requestStatusHistory.create({
      data: {
        requestId: request.id,
        fromStatus: request.status,
        status: rawStatus,
        authorUserId: userId,
        comment: content || null,
      },
    });
    await tx.notification.create({
      data: {
        studentId: request.studentId,
        type: "REQUEST_STATUS",
        title: "Изменился статус заявки",
        text: `Статус заявки изменён: ${requestStatusLabels[rawStatus]}.`,
        targetType: "REQUEST",
        targetId: request.publicId,
      },
    });
    return true;
  });

  if (!updated) {
    await ensureRequestStillAccessible(requestId, staff);
    return {
      error: "Заявка уже изменилась. Обновите страницу и попробуйте снова.",
    };
  }

  revalidateStaffRequestPaths(requestId, request.publicId);
  return { success: "Статус заявки обновлён." };
}

export async function rollbackRequestStatusAction(
  _previousState: RequestActionState,
  formData: FormData,
): Promise<RequestActionState> {
  await assertSameSiteRequest();
  const { userId, staff } = await requireStaffContext();
  const requestId = getRequestId(formData);

  const result = await getPrisma().$transaction(async (tx) => {
    const request = await tx.request.findFirst({
      where: {
        id: requestId,
        ...(staff.isSupervisor ? {} : getStaffRequestFilter(staff)),
      },
      select: {
        id: true,
        publicId: true,
        studentId: true,
        type: true,
        status: true,
        assignedToId: true,
        statusHistory: {
          orderBy: [{ changedAt: "asc" }, { id: "asc" }],
          select: {
            fromStatus: true,
            status: true,
            isRollback: true,
          },
        },
      },
    });
    if (!request) {
      notFound();
    }
    if (!canStaffRollbackRequest(staff, request)) {
      return {
        error: "Откат доступен только назначенному сотруднику или руководителю.",
      };
    }

    const previousStatus = getPreviousRequestStatus(
      request.statusHistory,
      request.status,
    );
    if (
      previousStatus === null ||
      !canTransitionRequestStatus(previousStatus, request.status)
    ) {
      return { error: "У заявки нет допустимого предыдущего статуса для отката." };
    }

    const updated = await tx.request.updateMany({
      where: {
        id: request.id,
        status: request.status,
        assignedToId: request.assignedToId,
      },
      data: { status: previousStatus, updatedAt: new Date() },
    });
    if (updated.count !== 1) {
      return {
        error: "Заявка уже изменилась. Обновите страницу и попробуйте снова.",
      };
    }

    await tx.requestStatusHistory.create({
      data: {
        requestId: request.id,
        fromStatus: request.status,
        status: previousStatus,
        isRollback: true,
        authorUserId: userId,
        comment: `Откат статуса: ${requestStatusLabels[request.status]} → ${requestStatusLabels[previousStatus]}.`,
      },
    });
    await tx.notification.create({
      data: {
        studentId: request.studentId,
        type: "REQUEST_STATUS",
        title: "Статус заявки изменён",
        text: `Статус заявки возвращён: ${requestStatusLabels[previousStatus]}.`,
        targetType: "REQUEST",
        targetId: request.publicId,
      },
    });

    return { publicId: request.publicId };
  });

  if ("error" in result) {
    return result;
  }

  revalidateStaffRequestPaths(requestId, result.publicId);
  return { success: "Статус заявки возвращён на предыдущий шаг." };
}

export async function addStaffCommentAction(
  _previousState: RequestActionState,
  formData: FormData,
): Promise<RequestActionState> {
  await assertSameSiteRequest();
  const { userId, staff } = await requireStaffContext();
  const requestId = getRequestId(formData);
  const rawVisibility = formData.get("visibility");
  if (rawVisibility !== "PUBLIC" && rawVisibility !== "INTERNAL") {
    return { error: "Выберите видимость комментария." };
  }

  const content = getOptionalMessage(formData);
  if (content === null) {
    return { error: "Комментарий не должен превышать 5000 символов." };
  }

  const uploads = await validateRequestUploads(formData.getAll("files"));
  if (!uploads.ok) {
    return { error: uploads.error };
  }
  if (content.length === 0 && uploads.files.length === 0) {
    return { error: "Добавьте комментарий или прикрепите файл." };
  }

  const request = await getActionRequest(requestId, staff);
  if (!canStaffManageAssignedRequest(staff, request)) {
    return { error: "Сначала возьмите заявку в работу." };
  }
  if (
    request.status === "READY" &&
    uploads.files.length > 0 &&
    rawVisibility !== "PUBLIC"
  ) {
    return {
      error: "Документ результата должен быть доступен студенту.",
    };
  }

  const saved = await getPrisma().$transaction(async (tx) => {
    const updated = await tx.request.updateMany({
      where: {
        id: request.id,
        assignedToId: staff.id,
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
        visibility: rawVisibility,
        content:
          content ||
          (request.status === "READY"
            ? "К заявке приложен готовый документ."
            : "Файлы приложены к комментарию."),
        ...(uploads.files.length > 0
          ? {
              attachments: {
                create: uploads.files.map((file) => ({
                  ...file,
                  kind: request.status === "READY" ? "RESULT" : "REQUEST",
                })),
              },
            }
          : {}),
      },
    });
    if (request.status === "READY" && uploads.files.length > 0) {
      await tx.notification.create({
        data: {
          studentId: request.studentId,
          type: "REQUEST_STATUS",
          title: "Документ по заявке готов",
          text: "Сотрудник приложил результат — его можно скачать в карточке заявки.",
          targetType: "REQUEST",
          targetId: request.publicId,
        },
      });
    }
    return true;
  });
  if (!saved) {
    await ensureRequestStillAccessible(requestId, staff);
    return {
      error: "Заявка уже изменилась. Обновите страницу и попробуйте снова.",
    };
  }

  revalidateStaffRequestPaths(requestId, request.publicId);
  return {
    success:
      request.status === "READY" && uploads.files.length > 0
        ? "Документ результата добавлен."
        : uploads.files.length > 0
          ? "Комментарий и файлы добавлены."
          : "Комментарий добавлен.",
  };
}

export async function assignRequestAction(
  _previousState: RequestActionState,
  formData: FormData,
): Promise<RequestActionState> {
  await assertSameSiteRequest();
  const { staff } = await requireStaffContext();
  const requestId = getRequestId(formData);
  const request = await getActionRequest(requestId, staff);
  const rawAssigneeId = formData.get("assignedToId");
  const assignedToId =
    typeof rawAssigneeId === "string"
      ? parsePositiveIntegerId(rawAssigneeId)
      : null;
  if (
    assignedToId === null ||
    !canStaffAssignRequest(staff, request, assignedToId)
  ) {
    return {
      error: "Можно взять только разрешённую свободную заявку и только себе.",
    };
  }

  const updated = await getPrisma().request.updateMany({
    where: {
      id: request.id,
      assignedToId: null,
      ...getStaffRequestFilter(staff),
    },
    data: { assignedToId: staff.id, updatedAt: new Date() },
  });
  if (updated.count !== 1) {
    await ensureRequestStillAccessible(requestId, staff);
    return {
      error: "Назначение уже изменилось. Обновите страницу и попробуйте снова.",
    };
  }

  revalidateStaffRequestPaths(requestId, request.publicId);
  return { success: "Заявка взята в работу." };
}
