import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  forbiddenMock,
  notFoundMock,
  redirectMock,
  revalidatePathMock,
  assertSameSiteRequestMock,
  requireStudentContextMock,
  requireStaffContextMock,
  findRequestMock,
  findCertificateFormMock,
  updateRequestManyMock,
  createCommentMock,
  upsertRequestMock,
  createStatusHistoryMock,
  findAssignmentRequestMock,
  findAssigneeMock,
  createAssignmentHistoryMock,
  createNotificationMock,
  prismaTransactionMock,
} = vi.hoisted(() => ({
  forbiddenMock: vi.fn(),
  notFoundMock: vi.fn(),
  redirectMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  assertSameSiteRequestMock: vi.fn(),
  requireStudentContextMock: vi.fn(),
  requireStaffContextMock: vi.fn(),
  findRequestMock: vi.fn(),
  findCertificateFormMock: vi.fn(),
  updateRequestManyMock: vi.fn(),
  createCommentMock: vi.fn(),
  upsertRequestMock: vi.fn(),
  createStatusHistoryMock: vi.fn(),
  findAssignmentRequestMock: vi.fn(),
  findAssigneeMock: vi.fn(),
  createAssignmentHistoryMock: vi.fn(),
  createNotificationMock: vi.fn(),
  prismaTransactionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  forbidden: forbiddenMock,
  notFound: notFoundMock,
  redirect: redirectMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/auth", () => ({
  assertSameSiteRequest: assertSameSiteRequestMock,
}));

vi.mock("@/lib/student", () => ({
  requireStudentContext: requireStudentContextMock,
}));

vi.mock("@/lib/staff", () => ({
  requireStaffContext: requireStaffContextMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    certificateForm: { findFirst: findCertificateFormMock },
    request: {
      findFirst: findRequestMock,
      findUnique: findAssignmentRequestMock,
      updateMany: updateRequestManyMock,
      upsert: upsertRequestMock,
    },
    staffProfile: { findFirst: findAssigneeMock },
    requestComment: { create: createCommentMock },
    requestStatusHistory: { create: createStatusHistoryMock },
    requestAssignmentHistory: { create: createAssignmentHistoryMock },
    notification: { create: createNotificationMock },
    $transaction: prismaTransactionMock,
  })),
}));

import {
  cancelRequestAction,
  createRequestAction,
  replyToRequestAction,
} from "../src/app/(campus)/requests/actions";
import {
  addStaffCommentAction,
  assignRequestAction,
  rollbackRequestStatusAction,
  updateRequestStatusAction,
} from "../src/app/staff/requests/actions";

function makeFormData(values: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireStudentContextMock.mockResolvedValue({
    userId: 10,
    student: {
      id: 20,
      fullName: "Аэлитта Ветрова-Даль",
      faculty: "Факультет вымышленных исследований",
      direction: "Межмировые коммуникации",
      course: 1,
      group: { id: 1, name: "TEST-01" },
      recordBookNumber: "TEST-001",
      studyForm: "FULL_TIME",
    },
  });
  requireStaffContextMock.mockResolvedValue({
    userId: 11,
    isManagerAccount: false,
    staff: {
      id: 40,
      department: "Учебный отдел",
      isSupervisor: false,
    },
  });
  findRequestMock.mockResolvedValue({
    id: 123,
    publicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
    status: "NEEDS_INFO",
    assignedToId: null,
    type: "CERTIFICATE",
  });
  findCertificateFormMock.mockResolvedValue({
    code: "STUDY_CERTIFICATE",
    title: "Справка об обучении",
    description: "Подтверждение факта обучения в учебном заведении.",
    executionDays: 5,
    active: true,
    fields: [
      {
        id: "purpose",
        label: "Куда предоставляется / цель",
        kind: "text",
        required: true,
        maxLength: 300,
      },
    ],
  });
  updateRequestManyMock.mockResolvedValue({ count: 1 });
  createCommentMock.mockResolvedValue({});
  upsertRequestMock.mockResolvedValue({
    id: 123,
    publicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
    studentId: 20,
  });
  createStatusHistoryMock.mockResolvedValue({});
  findAssignmentRequestMock.mockResolvedValue({
    id: 123,
    publicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
    assignedToId: null,
  });
  findAssigneeMock.mockResolvedValue({ id: 41 });
  createAssignmentHistoryMock.mockResolvedValue({});
  createNotificationMock.mockResolvedValue({});
  redirectMock.mockImplementation((path: string) => {
    throw new Error(`Redirect ${path}`);
  });
  prismaTransactionMock.mockImplementation(
    async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        request: {
          findFirst: findRequestMock,
          findUnique: findAssignmentRequestMock,
          updateMany: updateRequestManyMock,
          upsert: upsertRequestMock,
        },
        staffProfile: { findFirst: findAssigneeMock },
        requestComment: { create: createCommentMock },
        requestStatusHistory: { create: createStatusHistoryMock },
        requestAssignmentHistory: { create: createAssignmentHistoryMock },
        notification: { create: createNotificationMock },
      }),
  );
  notFoundMock.mockImplementation(() => {
    throw new Error("Not found");
  });
  forbiddenMock.mockImplementation(() => {
    throw new Error("Forbidden");
  });
});

describe("request actions", () => {
  it("creates an owned catalog request and its initial history transactionally", async () => {
    const formData = makeFormData({
      requestPublicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      catalogCode: "STUDY_CERTIFICATE",
      "field.purpose": "для места работы",
      description: "",
      studentId: "999",
    });

    await expect(createRequestAction({}, formData)).rejects.toThrow(
      "Redirect /requests/b08f54cf-99ce-4a56-a780-8e22ce5ba0a1?created=1",
    );

    expect(prismaTransactionMock).toHaveBeenCalledOnce();
    expect(upsertRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          publicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
        },
        create: expect.objectContaining({
          studentId: 20,
          catalogCode: "STUDY_CERTIFICATE",
          formFields: { purpose: "для места работы" },
          formSchemaSnapshot: expect.objectContaining({
            code: "STUDY_CERTIFICATE",
            title: "Справка об обучении",
          }),
          profileSnapshot: expect.objectContaining({
            fullName: "Аэлитта Ветрова-Даль",
            groupName: "TEST-01",
          }),
          status: "NEW",
          statusHistory: {
            create: {
              fromStatus: null,
              status: "NEW",
              authorUserId: 10,
              comment: "Заявка подана студентом.",
            },
          },
        }),
        update: {},
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/requests");
    expect(revalidatePathMock).toHaveBeenCalledWith("/staff/requests");
  });

  it("rejects invalid request fields before creating a record", async () => {
    const formData = makeFormData({
      requestPublicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      catalogCode: "STUDY_CERTIFICATE",
      "field.purpose": " ",
      description: "",
    });

    await expect(createRequestAction({}, formData)).resolves.toEqual({
      fieldErrors: { purpose: "Заполните это поле." },
    });
    expect(prismaTransactionMock).not.toHaveBeenCalled();
  });

  it("requires a student session before creating a request", async () => {
    requireStudentContextMock.mockRejectedValue(new Error("Redirect /login"));
    const formData = makeFormData({
      requestPublicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      catalogCode: "STUDY_CERTIFICATE",
      "field.purpose": "для места работы",
      description: "",
    });

    await expect(createRequestAction({}, formData)).rejects.toThrow(
      "Redirect /login",
    );
    expect(prismaTransactionMock).not.toHaveBeenCalled();
  });

  it("returns a safe error and logs unexpected persistence failures", async () => {
    upsertRequestMock.mockRejectedValueOnce(new Error("database unavailable"));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const formData = makeFormData({
      requestPublicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      catalogCode: "STUDY_CERTIFICATE",
      "field.purpose": "для места работы",
      description: "",
    });

    await expect(createRequestAction({}, formData)).resolves.toEqual({
      error: "Не удалось отправить заявку. Попробуйте ещё раз позже.",
    });

    expect(consoleError).toHaveBeenCalledWith(
      "[requests:create] Не удалось сохранить заявку.",
      expect.objectContaining({ studentId: 20 }),
    );
    expect(redirectMock).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("cancels only an owned NEW request and writes status history", async () => {
    findRequestMock.mockResolvedValue({
      id: 123,
      publicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      status: "NEW",
    });
    const formData = makeFormData({
      requestPublicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
    });

    await expect(cancelRequestAction({}, formData)).rejects.toThrow(
      "Redirect /requests/b08f54cf-99ce-4a56-a780-8e22ce5ba0a1?cancelled=1",
    );

    expect(findRequestMock).toHaveBeenCalledWith({
      where: {
        publicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
        studentId: 20,
      },
      select: { id: true, status: true },
    });
    expect(updateRequestManyMock).toHaveBeenCalledWith({
      where: { id: 123, studentId: 20, status: "NEW" },
      data: { status: "CANCELLED", updatedAt: expect.any(Date) },
    });
    expect(createStatusHistoryMock).toHaveBeenCalledWith({
      data: {
        requestId: 123,
        fromStatus: "NEW",
        status: "CANCELLED",
        authorUserId: 10,
        comment: "Заявка отменена студентом.",
      },
    });
    expect(createNotificationMock).toHaveBeenCalledWith({
      data: {
        studentId: 20,
        type: "REQUEST_STATUS",
        title: "Заявка отменена",
        text: "Вы отменили свою заявку.",
        targetType: "REQUEST",
        targetId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/notifications");
    expect(revalidatePathMock).toHaveBeenCalledWith("/staff/requests");
  });

  it("does not allow a student to cancel a foreign request", async () => {
    findRequestMock.mockResolvedValue(null);
    const formData = makeFormData({
      requestPublicId: "4f4a8f8e-f3ef-4f34-a65e-b9e3cb279ce0",
    });

    await expect(cancelRequestAction({}, formData)).rejects.toThrow("Not found");
    expect(prismaTransactionMock).not.toHaveBeenCalled();
  });

  it("scopes student replies to the signed-in student's request", async () => {
    findRequestMock.mockResolvedValue(null);
    const formData = makeFormData({
      requestPublicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      content: "Отвечаю",
    });

    await expect(replyToRequestAction({}, formData)).rejects.toThrow(
      "Not found",
    );

    expect(findRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          publicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
          studentId: 20,
        },
      }),
    );
    expect(prismaTransactionMock).not.toHaveBeenCalled();
  });

  it("adds a public reply and returns NEEDS_INFO requests to IN_PROGRESS", async () => {
    const formData = makeFormData({
      requestPublicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      content: "Данные добавлены",
    });
    formData.append("files", new Blob(), "undefined");

    await expect(replyToRequestAction({}, formData)).resolves.toEqual({
      success: "Ответ отправлен, заявка возвращена в работу.",
    });

    expect(updateRequestManyMock).toHaveBeenCalledWith({
      where: { id: 123, studentId: 20, status: "NEEDS_INFO" },
      data: { status: "IN_PROGRESS", updatedAt: expect.any(Date) },
    });
    expect(createCommentMock).toHaveBeenCalledWith({
      data: {
        requestId: 123,
        authorUserId: 10,
        visibility: "PUBLIC",
        content: "Данные добавлены",
        attachments: { create: [] },
      },
    });
    expect(createStatusHistoryMock).toHaveBeenCalledWith({
      data: {
        requestId: 123,
        status: "IN_PROGRESS",
        authorUserId: 10,
        comment: "Студент отправил запрошенное уточнение.",
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/staff/requests");
  });

  it("lets a student ask a question on a rejected request without reopening it", async () => {
    findRequestMock.mockResolvedValue({
      id: 123,
      publicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      status: "REJECTED",
    });
    const formData = makeFormData({
      requestPublicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      content: "Почему заявка отклонена?",
    });

    await expect(replyToRequestAction({}, formData)).resolves.toEqual({
      success: "Сообщение отправлено сотруднику.",
    });

    expect(updateRequestManyMock).toHaveBeenCalledWith({
      where: { id: 123, studentId: 20, status: "REJECTED" },
      data: { updatedAt: expect.any(Date) },
    });
    expect(createCommentMock).toHaveBeenCalledWith({
      data: {
        requestId: 123,
        authorUserId: 10,
        visibility: "PUBLIC",
        content: "Почему заявка отклонена?",
        attachments: { create: [] },
      },
    });
  });

  it("does not allow messages on a cancelled request", async () => {
    findRequestMock.mockResolvedValue({
      id: 123,
      publicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      status: "CANCELLED",
    });
    const formData = makeFormData({
      requestPublicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      content: "Вопрос",
    });

    await expect(replyToRequestAction({}, formData)).resolves.toEqual({
      error: "В отменённой заявке нельзя отправить сообщение.",
    });
    expect(updateRequestManyMock).not.toHaveBeenCalled();
    expect(createCommentMock).not.toHaveBeenCalled();
  });

  it("does not allow regular staff to assign a request directly", async () => {
    const formData = makeFormData({
      requestId: "123",
      assignedToId: "41",
    });

    await expect(assignRequestAction({}, formData)).rejects.toThrow("Forbidden");

    expect(forbiddenMock).toHaveBeenCalledOnce();
    expect(prismaTransactionMock).not.toHaveBeenCalled();
    expect(updateRequestManyMock).not.toHaveBeenCalled();
  });

  it("does not allow a student to assign a request directly", async () => {
    requireStaffContextMock.mockRejectedValue(new Error("Forbidden"));
    const formData = makeFormData({
      requestId: "123",
      assignedToId: "41",
    });

    await expect(assignRequestAction({}, formData)).rejects.toThrow("Forbidden");
    expect(prismaTransactionMock).not.toHaveBeenCalled();
  });

  it("lets staff.manager assign a request and records the change transactionally", async () => {
    requireStaffContextMock.mockResolvedValue({
      userId: 12,
      isManagerAccount: true,
      staff: { id: 42, department: "Учебный отдел", isSupervisor: true },
    });
    findAssigneeMock.mockResolvedValue({ id: 41 });
    const formData = makeFormData({
      requestId: "123",
      assignedToId: "41",
    });

    await expect(assignRequestAction({}, formData)).resolves.toEqual({
      success: "Ответственный по заявке обновлён.",
    });

    expect(prismaTransactionMock).toHaveBeenCalledOnce();
    expect(findAssignmentRequestMock).toHaveBeenCalledWith({
      where: { id: 123 },
      select: { id: true, publicId: true, assignedToId: true },
    });
    expect(findAssigneeMock).toHaveBeenCalledWith({
      where: { id: 41, user: { is: { role: "STAFF" } } },
      select: { id: true },
    });
    expect(updateRequestManyMock).toHaveBeenCalledWith({
      where: { id: 123, assignedToId: null },
      data: { assignedToId: 41, updatedAt: expect.any(Date) },
    });
    expect(createAssignmentHistoryMock).toHaveBeenCalledWith({
      data: {
        requestId: 123,
        fromAssignedToId: null,
        toAssignedToId: 41,
        changedByUserId: 12,
      },
    });
  });

  it("records reassignment without erasing the previous assignment", async () => {
    requireStaffContextMock.mockResolvedValue({
      userId: 12,
      isManagerAccount: true,
      staff: { id: 42, department: "Учебный отдел", isSupervisor: true },
    });
    findAssignmentRequestMock.mockResolvedValue({
      id: 123,
      publicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      assignedToId: 41,
    });
    findAssigneeMock.mockResolvedValue({ id: 43 });
    const formData = makeFormData({
      requestId: "123",
      assignedToId: "43",
    });

    await expect(assignRequestAction({}, formData)).resolves.toEqual({
      success: "Ответственный по заявке обновлён.",
    });

    expect(updateRequestManyMock).toHaveBeenCalledWith({
      where: { id: 123, assignedToId: 41 },
      data: { assignedToId: 43, updatedAt: expect.any(Date) },
    });
    expect(createAssignmentHistoryMock).toHaveBeenCalledWith({
      data: {
        requestId: 123,
        fromAssignedToId: 41,
        toAssignedToId: 43,
        changedByUserId: 12,
      },
    });
  });

  it("rejects IDs that do not belong to an active staff account", async () => {
    requireStaffContextMock.mockResolvedValue({
      userId: 12,
      isManagerAccount: true,
      staff: { id: 42, department: "Учебный отдел", isSupervisor: true },
    });
    findAssigneeMock.mockResolvedValue(null);

    await expect(
      assignRequestAction(
        {},
        makeFormData({ requestId: "123", assignedToId: "99" }),
      ),
    ).resolves.toEqual({ error: "Выбранный сотрудник не найден." });

    expect(updateRequestManyMock).not.toHaveBeenCalled();
    expect(createAssignmentHistoryMock).not.toHaveBeenCalled();
  });

  it("does not write history when the selected assignee is unchanged", async () => {
    requireStaffContextMock.mockResolvedValue({
      userId: 12,
      isManagerAccount: true,
      staff: { id: 42, department: "Учебный отдел", isSupervisor: true },
    });
    findAssignmentRequestMock.mockResolvedValue({
      id: 123,
      publicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      assignedToId: 41,
    });

    await expect(
      assignRequestAction(
        {},
        makeFormData({ requestId: "123", assignedToId: "41" }),
      ),
    ).resolves.toEqual({ success: "Ответственный не изменился." });

    expect(updateRequestManyMock).not.toHaveBeenCalled();
    expect(createAssignmentHistoryMock).not.toHaveBeenCalled();
  });

  it("rejects malformed request IDs before opening a transaction", async () => {
    requireStaffContextMock.mockResolvedValue({
      userId: 12,
      isManagerAccount: true,
      staff: { id: 42, department: "Учебный отдел", isSupervisor: true },
    });

    await expect(
      assignRequestAction(
        {},
        makeFormData({ requestId: "0", assignedToId: "41" }),
      ),
    ).rejects.toThrow("Not found");

    expect(prismaTransactionMock).not.toHaveBeenCalled();
  });

  it("does not let staff change the status before taking an unassigned request", async () => {
    const formData = makeFormData({
      requestId: "123",
      status: "IN_PROGRESS",
      content: "",
    });

    await expect(updateRequestStatusAction({}, formData)).resolves.toEqual({
      error: "Сначала возьмите заявку в работу.",
    });

    expect(prismaTransactionMock).not.toHaveBeenCalled();
  });

  it("limits status changes to an assigned request", async () => {
    findRequestMock.mockResolvedValue({
      id: 123,
      status: "IN_PROGRESS",
      assignedToId: 40,
      studentId: 20,
      publicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      type: "CERTIFICATE",
    });
    const formData = makeFormData({
      requestId: "123",
      status: "READY",
      content: "",
    });

    await expect(updateRequestStatusAction({}, formData)).resolves.toEqual({
      success: "Статус заявки обновлён.",
    });

    expect(updateRequestManyMock).toHaveBeenCalledWith({
      where: { id: 123, status: "IN_PROGRESS", assignedToId: 40 },
      data: { status: "READY", updatedAt: expect.any(Date) },
    });
    expect(prismaTransactionMock).toHaveBeenCalledOnce();
    expect(createStatusHistoryMock).toHaveBeenCalledWith({
      data: {
        requestId: 123,
        fromStatus: "IN_PROGRESS",
        status: "READY",
        authorUserId: 11,
        comment: null,
      },
    });
    expect(createNotificationMock).toHaveBeenCalledWith({
      data: {
        studentId: 20,
        type: "REQUEST_STATUS",
        title: "Изменился статус заявки",
        text: "Статус заявки изменён: Готова.",
        targetType: "REQUEST",
        targetId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/notifications");
  });

  it("rolls a request back, appends the reversal, and notifies the student", async () => {
    findRequestMock.mockResolvedValue({
      id: 123,
      publicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      studentId: 20,
      status: "IN_PROGRESS",
      assignedToId: 40,
      statusHistory: [
        { fromStatus: null, status: "NEW", isRollback: false },
        { fromStatus: "NEW", status: "IN_PROGRESS", isRollback: false },
      ],
    });

    await expect(
      rollbackRequestStatusAction({}, makeFormData({ requestId: "123" })),
    ).resolves.toEqual({
      success: "Статус заявки возвращён на предыдущий шаг.",
    });

    expect(findRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 123,
          OR: [
            { assignedToId: 40 },
            { assignedToId: null, type: { in: ["CERTIFICATE"] } },
          ],
        },
      }),
    );
    expect(updateRequestManyMock).toHaveBeenCalledWith({
      where: { id: 123, status: "IN_PROGRESS", assignedToId: 40 },
      data: { status: "NEW", updatedAt: expect.any(Date) },
    });
    expect(createStatusHistoryMock).toHaveBeenCalledWith({
      data: {
        requestId: 123,
        fromStatus: "IN_PROGRESS",
        status: "NEW",
        isRollback: true,
        authorUserId: 11,
        comment: "Откат статуса: В работе → Новая.",
      },
    });
    expect(createNotificationMock).toHaveBeenCalledWith({
      data: {
        studentId: 20,
        type: "REQUEST_STATUS",
        title: "Статус заявки изменён",
        text: "Статус заявки возвращён: Новая.",
        targetType: "REQUEST",
        targetId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/requests/b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
    );
  });

  it("allows staff.manager to roll back another employee's request", async () => {
    requireStaffContextMock.mockResolvedValue({
      userId: 12,
      staff: {
        id: 42,
        department: "Учебный отдел",
        isSupervisor: true,
      },
    });
    findRequestMock.mockResolvedValue({
      id: 123,
      publicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      studentId: 20,
      status: "READY",
      assignedToId: 41,
      statusHistory: [
        { fromStatus: null, status: "NEW", isRollback: false },
        { fromStatus: "NEW", status: "IN_PROGRESS", isRollback: false },
        { fromStatus: "IN_PROGRESS", status: "READY", isRollback: false },
      ],
    });

    await expect(
      rollbackRequestStatusAction({}, makeFormData({ requestId: "123" })),
    ).resolves.toEqual({
      success: "Статус заявки возвращён на предыдущий шаг.",
    });

    expect(findRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 123 } }),
    );
    expect(updateRequestManyMock).toHaveBeenCalledWith({
      where: { id: 123, status: "READY", assignedToId: 41 },
      data: { status: "IN_PROGRESS", updatedAt: expect.any(Date) },
    });
  });

  it("does not allow regular staff to roll back another employee's request", async () => {
    findRequestMock.mockResolvedValue({
      id: 123,
      publicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      studentId: 20,
      status: "READY",
      assignedToId: 41,
      statusHistory: [
        { fromStatus: null, status: "NEW", isRollback: false },
        { fromStatus: "NEW", status: "IN_PROGRESS", isRollback: false },
        { fromStatus: "IN_PROGRESS", status: "READY", isRollback: false },
      ],
    });

    await expect(
      rollbackRequestStatusAction({}, makeFormData({ requestId: "123" })),
    ).resolves.toEqual({
      error: "Откат доступен только назначенному сотруднику или руководителю.",
    });

    expect(updateRequestManyMock).not.toHaveBeenCalled();
    expect(createStatusHistoryMock).not.toHaveBeenCalled();
  });

  it("does not roll back a request that has only its initial status", async () => {
    findRequestMock.mockResolvedValue({
      id: 123,
      publicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      status: "NEW",
      assignedToId: 40,
      statusHistory: [{ fromStatus: null, status: "NEW", isRollback: false }],
    });

    await expect(
      rollbackRequestStatusAction({}, makeFormData({ requestId: "123" })),
    ).resolves.toEqual({
      error: "У заявки нет допустимого предыдущего статуса для отката.",
    });

    expect(updateRequestManyMock).not.toHaveBeenCalled();
    expect(createStatusHistoryMock).not.toHaveBeenCalled();
  });

  it("rejects a direct rollback call from a student session", async () => {
    requireStaffContextMock.mockRejectedValueOnce(new Error("Forbidden"));

    await expect(
      rollbackRequestStatusAction({}, makeFormData({ requestId: "123" })),
    ).rejects.toThrow("Forbidden");

    expect(prismaTransactionMock).not.toHaveBeenCalled();
  });

  it("saves a real result file and notifies the owner in one transaction", async () => {
    findRequestMock.mockResolvedValue({
      id: 123,
      publicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      status: "READY",
      assignedToId: 40,
      studentId: 20,
      type: "CERTIFICATE",
    });
    const formData = makeFormData({
      requestId: "123",
      visibility: "PUBLIC",
      content: "",
    });
    formData.append(
      "files",
      new Blob(["%PDF-1.7\nresult"], { type: "application/pdf" }),
      "result.pdf",
    );

    await expect(addStaffCommentAction({}, formData)).resolves.toEqual({
      success: "Документ результата добавлен.",
    });

    expect(prismaTransactionMock).toHaveBeenCalledOnce();
    expect(updateRequestManyMock).toHaveBeenCalledWith({
      where: { id: 123, assignedToId: 40, status: "READY" },
      data: { updatedAt: expect.any(Date) },
    });
    expect(createCommentMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        requestId: 123,
        authorUserId: 11,
        visibility: "PUBLIC",
        attachments: {
          create: [
            expect.objectContaining({
              fileName: "result.pdf",
              kind: "RESULT",
            }),
          ],
        },
      }),
    });
    expect(createNotificationMock).toHaveBeenCalledWith({
      data: {
        studentId: 20,
        type: "REQUEST_STATUS",
        title: "Документ по заявке готов",
        text: "Сотрудник приложил результат — его можно скачать в карточке заявки.",
        targetType: "REQUEST",
        targetId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      },
    });
  });
});
