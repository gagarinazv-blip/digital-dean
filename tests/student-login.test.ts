import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getPrismaMock,
  createPasswordSetupSessionMock,
  sendCodeMock,
} = vi.hoisted(() => ({
  getPrismaMock: vi.fn(),
  createPasswordSetupSessionMock: vi.fn(),
  sendCodeMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  createPasswordSetupSession: createPasswordSetupSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: getPrismaMock,
}));

vi.mock("@/lib/sms-provider", () => ({
  getSmsProvider: vi.fn(() => ({ sendCode: sendCodeMock })),
}));

import { headers } from "next/headers";
import { formatStudentPhoneInput } from "../src/lib/phone-utils";
import {
  normalizeStudentPhone,
  requestStudentPasswordResetCode,
  validateNewStudentPassword,
  verifyStudentPasswordResetCode,
} from "../src/lib/student-login";

const queryRaw = vi.fn();
const loginCodeFindFirst = vi.fn();
const loginCodeCount = vi.fn();
const loginCodeUpdateMany = vi.fn();
const loginCodeCreate = vi.fn();
const loginCodeDeleteMany = vi.fn();
const studentFindUnique = vi.fn();

const transactionMock = {
  $queryRaw: queryRaw,
  loginCode: {
    findFirst: loginCodeFindFirst,
    count: loginCodeCount,
    updateMany: loginCodeUpdateMany,
    create: loginCodeCreate,
    deleteMany: loginCodeDeleteMany,
  },
  student: { findUnique: studentFindUnique },
};

const prismaMock = {
  $transaction: vi.fn(
    async (callback: (transaction: typeof transactionMock) => unknown) =>
      callback(transactionMock),
  ),
  loginCode: {
    findFirst: loginCodeFindFirst,
    updateMany: loginCodeUpdateMany,
  },
  student: { findUnique: studentFindUnique },
};

function hashCode(code: string): string {
  return createHmac("sha256", process.env.LOGIN_CODE_PEPPER!)
    .update(code)
    .digest("hex");
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.LOGIN_CODE_PEPPER = "test-only-login-code-pepper";
  vi.mocked(headers).mockResolvedValue(
    new Headers({ "x-real-ip": "203.0.113.20" }) as never,
  );
  getPrismaMock.mockReturnValue(prismaMock);
  queryRaw.mockResolvedValue([]);
  loginCodeFindFirst.mockResolvedValue(null);
  loginCodeCount.mockResolvedValue(0);
  loginCodeUpdateMany.mockResolvedValue({ count: 1 });
  loginCodeCreate.mockResolvedValue({ id: 5 });
  loginCodeDeleteMany.mockResolvedValue({ count: 0 });
  studentFindUnique.mockResolvedValue(null);
  createPasswordSetupSessionMock.mockResolvedValue(undefined);
  sendCodeMock.mockResolvedValue(undefined);
});

describe("student phone login validation", () => {
  it("formats Russian phone input consistently while preserving legacy logins", () => {
    expect(formatStudentPhoneInput("9000000001")).toBe("+7 (900) 000-00-01");
    expect(formatStudentPhoneInput("8 900 000-00-01")).toBe(
      "+7 (900) 000-00-01",
    );
    expect(formatStudentPhoneInput("+12025550123")).toBe("+12025550123");
    expect(formatStudentPhoneInput("student.old")).toBe("student.old");
  });

  it.each([
    ["+7 (900) 000-00-01", "+79000000001"],
    ["8 900 000-00-01", "+79000000001"],
    ["79000000001", "+79000000001"],
    ["+12025550123", "+12025550123"],
  ])("normalizes %s to E.164", (input, expected) => {
    expect(normalizeStudentPhone(input)).toBe(expected);
  });

  it("rejects malformed or oversized phone values", () => {
    expect(normalizeStudentPhone("900-12")).toBeNull();
    expect(normalizeStudentPhone("phone +79000000001")).toBeNull();
    expect(normalizeStudentPhone("x".repeat(41))).toBeNull();
  });

  it("enforces password length, phone inequality, weak-password, and confirmation rules", () => {
    expect(
      validateNewStudentPassword(
        "short",
        "short",
        "+79000000001",
      ),
    ).toContain("10 символов");
    expect(
      validateNewStudentPassword(
        "+79000000001",
        "+79000000001",
        "+79000000001",
      ),
    ).toContain("телефона");
    expect(
      validateNewStudentPassword(
        "password123",
        "password123",
        "+79000000001",
      ),
    ).toContain("очевидный");
    expect(
      validateNewStudentPassword(
        "Long-Demo-Password-1",
        "different-password",
        "+79000000001",
      ),
    ).toContain("не совпадают");
    expect(
      validateNewStudentPassword(
        "Long-Demo-Password-1",
        "Long-Demo-Password-1",
        "+79000000001",
      ),
    ).toBeNull();
  });
});

describe("one-time password-reset codes", () => {
  it("stores only the hash and sends the code through the provider", async () => {
    studentFindUnique.mockResolvedValue({
      accountStatus: "ACTIVE",
      user: { id: 12, role: "STUDENT" },
    });

    await requestStudentPasswordResetCode("+79000000001");

    expect(loginCodeCreate).toHaveBeenCalledOnce();
    const { data } = loginCodeCreate.mock.calls[0][0];
    expect(data.phone).toBe("+79000000001");
    expect(data.codeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(data.codeHash).not.toMatch(/^\d{6}$/);
    expect(data.ip).toBe("203.0.113.20");
    expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now() + 4 * 60_000);
    expect(data.expiresAt.getTime()).toBeLessThanOrEqual(
      Date.now() + 5 * 60_000,
    );
    expect(sendCodeMock).toHaveBeenCalledWith(
      "+79000000001",
      expect.stringMatching(/^\d{6}$/),
    );
  });

  it("stores the same-shaped request for unknown phones without sending a code", async () => {
    await requestStudentPasswordResetCode("+79000000009");

    expect(loginCodeCreate).toHaveBeenCalledOnce();
    expect(loginCodeCreate.mock.calls[0][0].data.phone).toBe("+79000000009");
    expect(sendCodeMock).not.toHaveBeenCalled();
  });

  it("does not send recovery codes for invited student accounts", async () => {
    studentFindUnique.mockResolvedValue({
      accountStatus: "INVITED",
      user: { id: 12, role: "STUDENT" },
    });

    await requestStudentPasswordResetCode("+79000000001");

    expect(loginCodeCreate).toHaveBeenCalledOnce();
    expect(sendCodeMock).not.toHaveBeenCalled();
  });

  it("enforces resend and hourly limits using persisted requests", async () => {
    loginCodeFindFirst.mockResolvedValue({ id: 3 });

    await requestStudentPasswordResetCode("+79000000001");

    expect(loginCodeCreate).not.toHaveBeenCalled();
    expect(sendCodeMock).not.toHaveBeenCalled();
  });

  it("blocks the sixth code request in an hour for one phone or IP", async () => {
    loginCodeCount
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(0);

    await requestStudentPasswordResetCode("+79000000001");

    expect(loginCodeCreate).not.toHaveBeenCalled();
    expect(sendCodeMock).not.toHaveBeenCalled();

    vi.clearAllMocks();
    vi.mocked(headers).mockResolvedValue(
      new Headers({ "x-real-ip": "203.0.113.20" }) as never,
    );
    getPrismaMock.mockReturnValue(prismaMock);
    queryRaw.mockResolvedValue([]);
    loginCodeFindFirst.mockResolvedValue(null);
    loginCodeCount
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(20);

    await requestStudentPasswordResetCode("+79000000001");

    expect(loginCodeCreate).not.toHaveBeenCalled();
    expect(sendCodeMock).not.toHaveBeenCalled();
  });

  it("creates a temporary password-reset session after consuming a valid code", async () => {
    loginCodeFindFirst.mockResolvedValue({
      id: 9,
      codeHash: hashCode("123456"),
      attempts: 0,
    });
    studentFindUnique.mockResolvedValue({
      accountStatus: "ACTIVE",
      user: { id: 12, role: "STUDENT" },
    });

    await expect(
      verifyStudentPasswordResetCode("+79000000001", "123456"),
    ).resolves.toBe(true);

    expect(loginCodeUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 9, attempts: 0 }),
        data: { usedAt: expect.any(Date) },
      }),
    );
    expect(createPasswordSetupSessionMock).toHaveBeenCalledWith(12);
  });

  it("invalidates a code after five wrong attempts", async () => {
    let attempts = 0;
    loginCodeFindFirst.mockImplementation(async () =>
      attempts < 5
        ? { id: 11, codeHash: hashCode("123456"), attempts }
        : null,
    );
    loginCodeUpdateMany.mockImplementation(async ({ data }) => {
      if ("attempts" in data && data.attempts) {
        attempts += data.attempts.increment;
      }
      return { count: 1 };
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        verifyStudentPasswordResetCode("+79000000001", "654321"),
      ).resolves.toBe(false);
    }
    await expect(
      verifyStudentPasswordResetCode("+79000000001", "654321"),
    ).resolves.toBe(false);

    expect(attempts).toBe(5);
    expect(loginCodeUpdateMany).toHaveBeenCalledTimes(5);
    expect(createPasswordSetupSessionMock).not.toHaveBeenCalled();
  });

  it("rejects expired or already-consumed codes without creating a session", async () => {
    loginCodeFindFirst.mockResolvedValue(null);

    await expect(
      verifyStudentPasswordResetCode("+79000000001", "123456"),
    ).resolves.toBe(false);

    expect(loginCodeUpdateMany).not.toHaveBeenCalled();
    expect(createPasswordSetupSessionMock).not.toHaveBeenCalled();
  });
});
