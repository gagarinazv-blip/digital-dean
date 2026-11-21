import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  assertSameSiteRequestMock,
  requireStaffContextMock,
  encryptPasswordMock,
  revalidatePathMock,
  redirectMock,
  tx,
  prismaMock,
} = vi.hoisted(() => {
  const transaction = {
    studentGroup: { findUnique: vi.fn() },
    user: { create: vi.fn(), update: vi.fn() },
    student: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    studentAuditLog: { create: vi.fn() },
    session: { deleteMany: vi.fn() },
    loginCode: { updateMany: vi.fn() },
  };

  return {
    assertSameSiteRequestMock: vi.fn(),
    requireStaffContextMock: vi.fn(),
    encryptPasswordMock: vi.fn(),
    revalidatePathMock: vi.fn(),
    redirectMock: vi.fn(),
    tx: transaction,
    prismaMock: {
      $transaction: vi.fn(),
    },
  };
});

vi.mock("@/lib/auth", () => ({
  assertSameSiteRequest: assertSameSiteRequestMock,
}));

vi.mock("@/lib/staff", () => ({
  requireStaffContext: requireStaffContextMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(() => prismaMock),
}));

vi.mock("@/lib/corporate-mail", () => ({
  normalizeCorporateEmail: vi.fn((value: string) => {
    const normalized = value.trim().toLowerCase();
    return normalized === "student@mail.example.test" ? normalized : null;
  }),
}));

vi.mock("@/lib/corporate-mail-credentials", () => ({
  encryptCorporateMailPassword: encryptPasswordMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import {
  createStaffStudentAction,
  resetStudentAccessAction,
  updateStaffStudentAction,
} from "../src/app/staff/students/actions";

function formData(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

const validStudentFields = {
  fullName: "Иванова Анна",
  phone: "+7 900 000-00-01",
  course: "2",
  groupId: "4",
};

const currentStudent = {
  id: 20,
  userId: 10,
  fullName: "Иванова Анна",
  phone: "+79000000001",
  course: 2,
  groupId: 4,
  corporateEmail: null,
  corporateMailPasswordEncrypted: null,
  corporateMailIssuedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  assertSameSiteRequestMock.mockResolvedValue(undefined);
  requireStaffContextMock.mockResolvedValue({ userId: 7 });
  encryptPasswordMock.mockReturnValue("encrypted-mail-password");
  redirectMock.mockImplementation((path: string) => {
    throw new Error(`Redirect to ${path}`);
  });
  prismaMock.$transaction.mockImplementation((callback) => callback(tx));
  tx.studentGroup.findUnique.mockResolvedValue({ id: 4 });
  tx.student.create.mockResolvedValue({ id: 20 });
  tx.student.findFirst.mockResolvedValue(null);
  tx.student.findUnique.mockResolvedValue(currentStudent);
  tx.student.update.mockResolvedValue({});
  tx.studentAuditLog.create.mockResolvedValue({});
  tx.user.create.mockResolvedValue({ id: 10 });
  tx.user.update.mockResolvedValue({});
  tx.session.deleteMany.mockResolvedValue({ count: 1 });
  tx.loginCode.updateMany.mockResolvedValue({ count: 0 });
});

describe("staff student management actions", () => {
  it("creates an invited student account without a password", async () => {
    await expect(
      createStaffStudentAction(
        {},
        formData({
          ...validStudentFields,
          faculty: "МЭО",
          direction: "Экономика",
        }),
      ),
    ).rejects.toThrow("Redirect to /staff/students/20");

    expect(tx.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        login: expect.stringMatching(/^student\./),
        passwordHash: null,
        role: "STUDENT",
      }),
      select: { id: true },
    });
    expect(tx.student.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        phone: "+79000000001",
        accountStatus: "INVITED",
      }),
      select: { id: true },
    });
    expect(tx.studentAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "STUDENT_CREATED",
        changedFields: expect.arrayContaining(["phone", "fullName"]),
      }),
    });
  });

  it("does not allow a non-staff session to update a student", async () => {
    requireStaffContextMock.mockRejectedValue(new Error("Forbidden"));

    await expect(
      updateStaffStudentAction(
        {},
        formData({
          studentId: "20",
          ...validStudentFields,
          corporateEmail: "",
          corporateMailPassword: "",
        }),
      ),
    ).rejects.toThrow("Forbidden");

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("requires server-side confirmation before changing a phone number", async () => {
    const result = await updateStaffStudentAction(
      {},
      formData({
        studentId: "20",
        ...validStudentFields,
        phone: "+7 900 000-00-02",
        corporateEmail: "",
        corporateMailPassword: "",
      }),
    );

    expect(result).toEqual({ requiresPhoneConfirmation: true });
    expect(tx.student.update).not.toHaveBeenCalled();
    expect(tx.session.deleteMany).not.toHaveBeenCalled();
  });

  it("revokes sessions when changing a phone and stores only encrypted mail credentials", async () => {
    const result = await updateStaffStudentAction(
      {},
      formData({
        studentId: "20",
        ...validStudentFields,
        phone: "+7 900 000-00-02",
        corporateEmail: "student@mail.example.test",
        corporateMailPassword: "Fictional-Secret-123!",
        confirmPhoneChange: "true",
      }),
    );

    expect(result).toEqual({ success: "Изменения сохранены." });
    expect(tx.student.update).toHaveBeenCalledWith({
      where: { id: 20 },
      data: expect.objectContaining({
        phone: "+79000000002",
        corporateMailPasswordEncrypted: "encrypted-mail-password",
      }),
    });
    expect(encryptPasswordMock).toHaveBeenCalledWith(
      "Fictional-Secret-123!",
    );
    expect(tx.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: 10 },
    });
    expect(tx.loginCode.updateMany).toHaveBeenCalledOnce();
    expect(tx.studentAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "CORPORATE_MAIL_PASSWORD_SET",
        changedFields: ["corporateMailPassword"],
      }),
    });
    expect(JSON.stringify(result)).not.toContain("Fictional-Secret-123!");
    expect(JSON.stringify(tx.studentAuditLog.create.mock.calls)).not.toContain(
      "Fictional-Secret-123!",
    );
  });

  it("resets student access and revokes existing sessions", async () => {
    const result = await resetStudentAccessAction(
      {},
      formData({ studentId: "20" }),
    );

    expect(result).toEqual({ success: "Доступ студента сброшен." });
    expect(tx.student.update).toHaveBeenCalledWith({
      where: { id: 20 },
      data: { accountStatus: "INVITED" },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { passwordHash: null },
    });
    expect(tx.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: 10 },
    });
  });
});
