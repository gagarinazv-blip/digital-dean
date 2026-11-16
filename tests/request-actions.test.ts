import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  notFoundMock,
  redirectMock,
  revalidatePathMock,
  assertSameSiteRequestMock,
  requireStudentContextMock,
  requireStaffContextMock,
  findRequestMock,
  updateRequestManyMock,
  createCommentMock,
  upsertRequestMock,
  createStatusHistoryMock,
  createNotificationMock,
  prismaTransactionMock,
} = vi.hoisted(() => ({
  notFoundMock: vi.fn(),
  redirectMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  assertSameSiteRequestMock: vi.fn(),
  requireStudentContextMock: vi.fn(),
  requireStaffContextMock: vi.fn(),
  findRequestMock: vi.fn(),
  updateRequestManyMock: vi.fn(),
  createCommentMock: vi.fn(),
  upsertRequestMock: vi.fn(),
  createStatusHistoryMock: vi.fn(),
  createNotificationMock: vi.fn(),
  prismaTransactionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
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
    request: {
      findFirst: findRequestMock,
      updateMany: updateRequestManyMock,
      upsert: upsertRequestMock,
    },
    requestComment: { create: createCommentMock },
    requestStatusHistory: { create: createStatusHistoryMock },
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
  assignRequestAction,
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
  updateRequestManyMock.mockResolvedValue({ count: 1 });
  createCommentMock.mockResolvedValue({});
  upsertRequestMock.mockResolvedValue({
    id: 123,
    publicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
    studentId: 20,
  });
  createStatusHistoryMock.mockResolvedValue({});
  createNotificationMock.mockResolvedValue({});
  redirectMock.mockImplementation((path: string) => {
    throw new Error(`Redirect ${path}`);
  });
  prismaTransactionMock.mockImplementation(
    async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        request: {
          updateMany: updateRequestManyMock,
          upsert: upsertRequestMock,
        },
        requestComment: { create: createCommentMock },
        requestStatusHistory: { create: createStatusHistoryMock },
        notification: { create: createNotificationMock },
      }),
  );
  notFoundMock.mockImplementation(() => {
    throw new Error("Not found");
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
          profileSnapshot: expect.objectContaining({
            fullName: "Аэлитта Ветрова-Даль",
            groupName: "TEST-01",
          }),
          status: "NEW",
          statusHistory: {
            create: {
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

  it("adds a student reply publicly without changing NEEDS_INFO", async () => {
    const formData = makeFormData({
      requestPublicId: "b08f54cf-99ce-4a56-a780-8e22ce5ba0a1",
      content: "Данные добавлены",
    });
    formData.append("files", new Blob(), "undefined");

    await expect(replyToRequestAction({}, formData)).resolves.toEqual({
      success: "Ответ отправлен сотруднику.",
    });

    expect(updateRequestManyMock).toHaveBeenCalledWith({
      where: { id: 123, studentId: 20, status: "NEEDS_INFO" },
      data: { updatedAt: expect.any(Date) },
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
  });

  it("does not let staff take an unassigned request for another employee", async () => {
    const formData = makeFormData({
      requestId: "123",
      assignedToId: "99",
    });

    await expect(assignRequestAction({}, formData)).resolves.toEqual({
      error: "Можно взять только разрешённую свободную заявку и только себе.",
    });

    expect(updateRequestManyMock).not.toHaveBeenCalled();
  });

  it("lets staff take an allowed unassigned request for themselves", async () => {
    const formData = makeFormData({
      requestId: "123",
      assignedToId: "40",
    });

    await expect(assignRequestAction({}, formData)).resolves.toEqual({
      success: "Заявка взята в работу.",
    });

    expect(updateRequestManyMock).toHaveBeenCalledWith({
      where: {
        id: 123,
        assignedToId: null,
        OR: [
          { assignedToId: 40 },
          { assignedToId: null, type: { in: ["CERTIFICATE"] } },
        ],
      },
      data: { assignedToId: 40, updatedAt: expect.any(Date) },
    });
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
  });
});
