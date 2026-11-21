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

  it("sends authenticated students to the student home from the student tab", async () => {
    loginUserMock.mockResolvedValue({ role: "STUDENT" });
    const formData = new FormData();
    formData.set("role", "student");
    formData.set("login", "student.alpha");
    formData.set("password", "test-only-password");

    await expect(loginAction({}, formData)).rejects.toThrow(
      "Redirected to /",
    );
    expect(loginUserMock).toHaveBeenCalledWith(
      "student.alpha",
      "test-only-password",
      "STUDENT",
    );
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
});
