import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock, authenticateUserForLoginMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  authenticateUserForLoginMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth", () => ({
  authenticateUserForLogin: authenticateUserForLoginMock,
  TooManyLoginAttemptsError: class TooManyLoginAttemptsError extends Error {},
}));

import { loginAction, loginStaffAction } from "../src/app/login/actions";

beforeEach(() => {
  vi.clearAllMocks();
  redirectMock.mockImplementation((path: string) => {
    throw new Error(`Redirected to ${path}`);
  });
});

describe("loginAction", () => {
  it("sends authenticated staff to the staff area", async () => {
    authenticateUserForLoginMock.mockResolvedValue({
      user: { role: "STAFF" },
      attemptKey: "attempt-key",
    });
    const formData = new FormData();
    formData.set("login", "staff.demo");
    formData.set("password", "test-only-password");

    await expect(loginStaffAction({}, formData)).rejects.toThrow(
      "Redirected to /staff",
    );
  });

  it("sends authenticated students to the student home", async () => {
    authenticateUserForLoginMock.mockResolvedValue({
      user: { role: "STUDENT" },
      attemptKey: "attempt-key",
    });
    const formData = new FormData();
    formData.set("login", "student.alpha");
    formData.set("password", "test-only-password");

    await expect(loginAction({}, formData)).rejects.toThrow(
      "Redirected to /",
    );
  });

  it("refuses a staff login from the student flow and vice versa", async () => {
    authenticateUserForLoginMock.mockResolvedValue({
      user: { role: "STAFF" },
      attemptKey: "attempt-key",
    });
    const studentFormData = new FormData();
    studentFormData.set("login", "staff.demo");
    studentFormData.set("password", "test-only-password");

    await expect(loginAction({}, studentFormData)).resolves.toEqual({
      error: "Неверный логин или пароль.",
    });

    authenticateUserForLoginMock.mockResolvedValue({
      user: { role: "STUDENT" },
      attemptKey: "attempt-key",
    });
    const staffFormData = new FormData();
    staffFormData.set("login", "student.alpha");
    staffFormData.set("password", "test-only-password");

    await expect(loginStaffAction({}, staffFormData)).resolves.toEqual({
      error: "Неверный логин или пароль.",
    });
  });
});
