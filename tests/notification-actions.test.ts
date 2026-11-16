import { beforeEach, describe, expect, it, vi } from "vitest";

const { assertSameSiteRequestMock, requireStudentContextMock, updateManyMock } =
  vi.hoisted(() => ({
    assertSameSiteRequestMock: vi.fn(),
    requireStudentContextMock: vi.fn(),
    updateManyMock: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({
  assertSameSiteRequest: assertSameSiteRequestMock,
}));

vi.mock("@/lib/student", () => ({
  requireStudentContext: requireStudentContextMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    notification: { updateMany: updateManyMock },
  })),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { markAllNotificationsReadAction } from "../src/app/(campus)/notifications/actions";

beforeEach(() => {
  vi.clearAllMocks();
  assertSameSiteRequestMock.mockResolvedValue(undefined);
  requireStudentContextMock.mockResolvedValue({
    userId: 7,
    student: { id: 17 },
  });
  updateManyMock.mockResolvedValue({ count: 2 });
});

describe("notification actions", () => {
  it("marks only the authenticated student's unread activity notifications", async () => {
    await markAllNotificationsReadAction();

    expect(updateManyMock).toHaveBeenCalledWith({
      where: { type: { not: null }, studentId: 17, readAt: null },
      data: { readAt: expect.any(Date), isRead: true },
    });
  });

  it("does not update notifications when there is no student session", async () => {
    requireStudentContextMock.mockRejectedValue(new Error("Redirect /login"));

    await expect(markAllNotificationsReadAction()).rejects.toThrow(
      "Redirect /login",
    );
    expect(updateManyMock).not.toHaveBeenCalled();
  });
});
