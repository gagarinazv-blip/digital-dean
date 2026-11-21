import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  redirectMock,
  loginUserMock,
  assertSameSiteRequestMock,
  loginStaffWithPhoneMock,
  loginStudentWithPhoneMock,
  requestStudentPasswordResetCodeMock,
  verifyStudentPasswordResetCodeMock,
  normalizeStudentPhoneMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  loginUserMock: vi.fn(),
  assertSameSiteRequestMock: vi.fn(),
  loginStaffWithPhoneMock: vi.fn(),
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
  loginStaffWithPhone: loginStaffWithPhoneMock,
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

  it("allows staff to use a phone while retaining the legacy login", async () => {
    loginStaffWithPhoneMock.mockResolvedValue({ role: "STAFF" });
    const formData = new FormData();
    formData.set("role", "staff");
    formData.set("login", "8 (900) 000-20-01");
    formData.set("password", "test-only-password");

    await expect(loginAction({}, formData)).rejects.toThrow(
      "Redirected to /staff",
    );
    expect(loginStaffWithPhoneMock).toHaveBeenCalledWith(
      "+79000002001",
      "test-only-password",
    );
    expect(loginUserMock).not.toHaveBeenCalled();
  });

  it("shows a phone-format hint without querying the database", async () => {
    const formData = new FormData();
    formData.set("role", "staff");
    formData.set("login", "+7 900 abc");
    formData.set("password", "test-only-password");

    await expect(loginAction({}, formData)).resolves.toEqual({
      phoneError:
        "Введите корректный номер: +7 900 000-00-00 или 8 900 000-00-00.",
    });
    expect(loginStaffWithPhoneMock).not.toHaveBeenCalled();
    expect(loginUserMock).not.toHaveBeenCalled();
  });

  it("does not allow student credentials through the staff login action", async () => {
    const formData = new FormData();
    formData.set("role", "student");
    formData.set("login", "student.alpha");
    formData.set("password", "test-only-password");

    await expect(loginAction({}, formData)).resolves.toEqual({
      error: "Введите номер телефона или служебный логин и пароль.",
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
      error: "Неверный номер телефона, логин или пароль",
    });
  });

  it("rejects a user returned with a role different from the selected tab", async () => {
    loginUserMock.mockResolvedValue({ role: "STUDENT" });
    const formData = new FormData();
    formData.set("role", "staff");
    formData.set("login", "student.alpha");
    formData.set("password", "test-only-password");

    await expect(loginAction({}, formData)).resolves.toEqual({
      error: "Неверный номер телефона, логин или пароль",
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

  it("shows a student phone-format hint before authenticating", async () => {
    const formData = new FormData();
    formData.set("phone", "900 12");
    formData.set("password", "demo-password");

    await expect(
      studentPhoneLoginAction({}, formData),
    ).resolves.toEqual({
      phoneError:
        "Введите корректный номер: +7 900 000-00-00 или 8 900 000-00-00.",
    });
    expect(loginStudentWithPhoneMock).not.toHaveBeenCalled();
    expect(loginUserMock).not.toHaveBeenCalled();
  });

  it("preserves student logins without an assigned phone", async () => {
    loginUserMock.mockResolvedValue({ role: "STUDENT" });
    const formData = new FormData();
    formData.set("phone", "student.alpha");
    formData.set("password", "demo-password");

    await expect(
      studentPhoneLoginAction({}, formData),
    ).rejects.toThrow("Redirected to /");
    expect(loginUserMock).toHaveBeenCalledWith(
      "student.alpha",
      "demo-password",
      "STUDENT",
    );
    expect(loginStudentWithPhoneMock).not.toHaveBeenCalled();
  });

  it("does not distinguish an unknown phone from a wrong password", async () => {
    const results: Array<{ error?: string; phoneError?: string }> = [];
    for (const phone of ["+79000000001", "+79000000009"]) {
      loginStudentWithPhoneMock.mockResolvedValueOnce(null);
      const formData = new FormData();
      formData.set("phone", phone);
      formData.set("password", "wrong-password");
      results.push(await studentPhoneLoginAction({}, formData));
    }

    expect(results).toEqual([
      { error: "Неверный номер телефона или пароль" },
      { error: "Неверный номер телефона или пароль" },
    ]);
  });

  it("logs database details without credentials and returns a generic error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    loginStudentWithPhoneMock.mockRejectedValue(
      Object.assign(
        new Error(
          "Invalid query: column Student.phone is missing; password=database-secret",
        ),
        { code: "P2022" },
      ),
    );
    const formData = new FormData();
    formData.set("phone", "+79000000001");
    formData.set("password", "form-secret");

    await expect(studentPhoneLoginAction({}, formData)).resolves.toEqual({
      error: "Не удалось выполнить вход. Попробуйте немного позже.",
    });
    const logged = JSON.stringify(consoleError.mock.calls);
    expect(logged).toContain("Student.phone is missing");
    expect(logged).toContain("P2022");
    expect(logged).not.toContain("database-secret");
    expect(logged).not.toContain("form-secret");
    consoleError.mockRestore();
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
