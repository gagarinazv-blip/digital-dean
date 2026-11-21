import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  redirectMock,
  loginUserMock,
  assertSameSiteRequestMock,
  loginStudentWithPhoneMock,
  requestStudentPasswordResetCodeMock,
  verifyStudentPasswordResetCodeMock,
  normalizeStudentPhoneMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  loginUserMock: vi.fn(),
  assertSameSiteRequestMock: vi.fn(),
  loginStudentWithPhoneMock: vi.fn(),
  requestStudentPasswordResetCodeMock: vi.fn(),
  verifyStudentPasswordResetCodeMock: vi.fn(),
  normalizeStudentPhoneMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth", () => ({
  assertSameSiteRequest: assertSameSiteRequestMock,
  completeStudentPasswordReset: vi.fn(),
  getCurrentUser: vi.fn(),
  hashPassword: vi.fn(),
  loginStudentWithPhone: loginStudentWithPhoneMock,
  loginUser: loginUserMock,
  TooManyLoginAttemptsError: class TooManyLoginAttemptsError extends Error {},
}));

vi.mock("@/lib/student-login", () => ({
  invalidCodeMessage: "Неверный или истёкший код.",
  normalizeStudentPhone: normalizeStudentPhoneMock,
  requestStudentPasswordResetCode: requestStudentPasswordResetCodeMock,
  validateNewStudentPassword: vi.fn(),
  verifyStudentPasswordResetCode: verifyStudentPasswordResetCodeMock,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
}));

import {
  loginAction,
  requestStudentPasswordResetCodeAction,
  studentPhoneLoginAction,
  verifyStudentPasswordResetCodeAction,
} from "../src/app/login/actions";

beforeEach(() => {
  vi.clearAllMocks();
  redirectMock.mockImplementation((path: string) => {
    throw new Error(`Redirected to ${path}`);
  });
  assertSameSiteRequestMock.mockResolvedValue(undefined);
  normalizeStudentPhoneMock.mockImplementation((phone: string) =>
    /^\+7\d{10}$/.test(phone) ? phone : null,
  );
});

describe("loginAction", () => {
  it("sends authenticated staff to the staff area from the staff tab", async () => {
    loginUserMock.mockResolvedValue({ role: "STAFF" });
    const formData = new FormData();
    formData.set("role", "staff");
    formData.set("login", "staff.demo");
    formData.set("password", "test-only-password");

    await expect(loginAction({}, formData)).rejects.toThrow(
      "Redirected to /staff",
    );
    expect(loginUserMock).toHaveBeenCalledWith(
      "staff.demo",
      "test-only-password",
      "STAFF",
    );
  });

  it("does not allow student credentials through the staff login action", async () => {
    const formData = new FormData();
    formData.set("role", "student");
    formData.set("login", "student.alpha");
    formData.set("password", "test-only-password");

    await expect(loginAction({}, formData)).resolves.toEqual({
      error: "Введите логин и пароль.",
    });
    expect(loginUserMock).not.toHaveBeenCalled();
  });

  it("shows the same generic error when credentials or selected role do not match", async () => {
    loginUserMock.mockResolvedValue(null);
    const formData = new FormData();
    formData.set("role", "staff");
    formData.set("login", "unknown.demo");
    formData.set("password", "wrong-password");

    await expect(loginAction({}, formData)).resolves.toEqual({
      error: "Неверные данные для входа",
    });
  });

  it("rejects a user returned with a role different from the selected tab", async () => {
    loginUserMock.mockResolvedValue({ role: "STUDENT" });
    const formData = new FormData();
    formData.set("role", "staff");
    formData.set("login", "student.alpha");
    formData.set("password", "test-only-password");

    await expect(loginAction({}, formData)).resolves.toEqual({
      error: "Неверные данные для входа",
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("logs an active student in with a normalized phone number", async () => {
    loginStudentWithPhoneMock.mockResolvedValue({ role: "STUDENT" });
    const formData = new FormData();
    formData.set("phone", "+79000000001");
    formData.set("password", "demo-password");

    await expect(
      studentPhoneLoginAction({}, formData),
    ).rejects.toThrow("Redirected to /");
    expect(loginStudentWithPhoneMock).toHaveBeenCalledWith(
      "+79000000001",
      "demo-password",
    );
  });

  it("returns the same code-request result regardless of account lookup", async () => {
    requestStudentPasswordResetCodeMock.mockResolvedValue(undefined);
    const knownFormData = new FormData();
    knownFormData.set("phone", "+79000000001");
    const unknownFormData = new FormData();
    unknownFormData.set("phone", "+79000000009");

    const knownResult = await requestStudentPasswordResetCodeAction(
      {},
      knownFormData,
    );
    const unknownResult = await requestStudentPasswordResetCodeAction(
      {},
      unknownFormData,
    );

    expect(knownResult).toEqual({ phone: "+79000000001", sent: true });
    expect(unknownResult).toEqual({ phone: "+79000000009", sent: true });
    expect(knownResult).not.toHaveProperty("code");
    expect(unknownResult).not.toHaveProperty("code");
    expect(requestStudentPasswordResetCodeMock).toHaveBeenCalledWith(
      "+79000000001",
    );
    expect(requestStudentPasswordResetCodeMock).toHaveBeenCalledWith(
      "+79000000009",
    );
  });

  it("redirects only after the one-time code is verified", async () => {
    verifyStudentPasswordResetCodeMock.mockResolvedValue(true);
    const formData = new FormData();
    formData.set("phone", "+79000000001");
    formData.set("code", "123456");

    await expect(
      verifyStudentPasswordResetCodeAction({}, formData),
    ).rejects.toThrow("Redirected to /login?role=student&step=password");
    expect(verifyStudentPasswordResetCodeMock).toHaveBeenCalledWith(
      "+79000000001",
      "123456",
    );
  });
});
