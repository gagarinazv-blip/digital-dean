import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  notFoundMock,
  revalidatePathMock,
  requireStudentContextMock,
  requireStaffContextMock,
  findRequestMock,
  updateRequestManyMock,
  createCommentMock,
  prismaTransactionMock,
} = vi.hoisted(() => ({
  notFoundMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  requireStudentContextMock: vi.fn(),
  requireStaffContextMock: vi.fn(),
  findRequestMock: vi.fn(),
  updateRequestManyMock: vi.fn(),
  createCommentMock: vi.fn(),
  prismaTransactionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
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
    },
    requestComment: { create: createCommentMock },
    $transaction: prismaTransactionMock,
  })),
}));

import { replyToRequestAction } from "../src/app/(campus)/requests/actions";
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
    student: { id: 20 },
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
    status: "NEEDS_INFO",
    assignedToId: null,
    type: "CERTIFICATE",
  });
  updateRequestManyMock.mockResolvedValue({ count: 1 });
  createCommentMock.mockResolvedValue({});
  prismaTransactionMock.mockImplementation(
    async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        request: { updateMany: updateRequestManyMock },
        requestComment: { create: createCommentMock },
      }),
  );
  notFoundMock.mockImplementation(() => {
    throw new Error("Not found");
  });
});

describe("request actions", () => {
  it("scopes student replies to the signed-in student's request", async () => {
    findRequestMock.mockResolvedValue(null);
    const formData = makeFormData({ requestId: "123", content: "Отвечаю" });

    await expect(replyToRequestAction({}, formData)).rejects.toThrow(
      "Not found",
    );

    expect(findRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 123, studentId: 20 },
      }),
    );
    expect(prismaTransactionMock).not.toHaveBeenCalled();
  });

  it("adds a student reply publicly without changing NEEDS_INFO", async () => {
    const formData = makeFormData({ requestId: "123", content: "Данные добавлены" });
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
  });
});
