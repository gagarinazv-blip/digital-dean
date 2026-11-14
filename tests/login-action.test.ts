import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock, loginUserMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(),
  loginUserMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth", () => ({
  loginUser: loginUserMock,
  TooManyLoginAttemptsError: class TooManyLoginAttemptsError extends Error {},
}));

import { loginAction } from "../src/app/login/actions";

beforeEach(() => {
  vi.clearAllMocks();
  redirectMock.mockImplementation((path: string) => {
    throw new Error(`Redirected to ${path}`);
  });
});

describe("loginAction", () => {
  it("sends authenticated staff to the staff area from the shared login", async () => {
    loginUserMock.mockResolvedValue({ role: "STAFF" });
    const formData = new FormData();
    formData.set("login", "staff.demo");
    formData.set("password", "test-only-password");

    await expect(loginAction({}, formData)).rejects.toThrow(
      "Redirected to /staff",
    );
    expect(loginUserMock).toHaveBeenCalledWith(
      "staff.demo",
      "test-only-password",
    );
  });

  it("sends authenticated students to the student home from the shared login", async () => {
    loginUserMock.mockResolvedValue({ role: "STUDENT" });
    const formData = new FormData();
    formData.set("login", "student.alpha");
    formData.set("password", "test-only-password");

    await expect(loginAction({}, formData)).rejects.toThrow(
      "Redirected to /",
    );
  });

  it("shows the common error when credentials do not authenticate", async () => {
    loginUserMock.mockResolvedValue(null);
    const formData = new FormData();
    formData.set("login", "unknown.demo");
    formData.set("password", "wrong-password");

    await expect(loginAction({}, formData)).resolves.toEqual({
      error: "Неверный логин или пароль.",
    });
  });
});
