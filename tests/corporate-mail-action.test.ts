import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  assertSameSiteRequestMock,
  requireStudentContextMock,
  findStudentMock,
  decryptPasswordMock,
} = vi.hoisted(() => ({
  assertSameSiteRequestMock: vi.fn(),
  requireStudentContextMock: vi.fn(),
  findStudentMock: vi.fn(),
  decryptPasswordMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  assertSameSiteRequest: assertSameSiteRequestMock,
}));

vi.mock("@/lib/student", () => ({
  requireStudentContext: requireStudentContextMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => ({
    student: { findUnique: findStudentMock },
  })),
}));

vi.mock("@/lib/corporate-mail-credentials", () => ({
  decryptCorporateMailPassword: decryptPasswordMock,
}));

import { revealCorporateMailPasswordAction } from "../src/app/(campus)/profile/actions";

beforeEach(() => {
  vi.clearAllMocks();
  assertSameSiteRequestMock.mockResolvedValue(undefined);
  requireStudentContextMock.mockResolvedValue({
    userId: 10,
    student: { id: 20 },
  });
  findStudentMock.mockResolvedValue({
    corporateEmail: "student.alpha@mail.example.test",
    corporateMailPasswordEncrypted: "v1.encrypted",
    corporateMailIssuedAt: new Date("2026-11-21T00:00:00.000Z"),
  });
  decryptPasswordMock.mockReturnValue("Fictional-Mail-Password!");
});

describe("revealCorporateMailPasswordAction", () => {
  it("loads only the authenticated student's encrypted password", async () => {
    await expect(revealCorporateMailPasswordAction()).resolves.toEqual({
      password: "Fictional-Mail-Password!",
    });

    expect(assertSameSiteRequestMock).toHaveBeenCalledOnce();
    expect(requireStudentContextMock).toHaveBeenCalledOnce();
    expect(findStudentMock).toHaveBeenCalledWith({
      where: { id: 20 },
      select: {
        corporateEmail: true,
        corporateMailPasswordEncrypted: true,
        corporateMailIssuedAt: true,
      },
    });
    expect(decryptPasswordMock).toHaveBeenCalledWith("v1.encrypted");
    expect(revealCorporateMailPasswordAction).toHaveLength(0);
  });

  it("does not decrypt when credentials have not been issued", async () => {
    findStudentMock.mockResolvedValue({
      corporateEmail: null,
      corporateMailPasswordEncrypted: null,
      corporateMailIssuedAt: null,
    });

    await expect(revealCorporateMailPasswordAction()).resolves.toEqual({
      error: "Данные для входа пока не выданы.",
    });
    expect(decryptPasswordMock).not.toHaveBeenCalled();
  });
});
