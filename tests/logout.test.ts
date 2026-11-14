import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  assertSameSiteRequestMock,
  deleteSessionMock,
  getCurrentUserMock,
  redirectMock,
} = vi.hoisted(() => ({
  assertSameSiteRequestMock: vi.fn(),
  deleteSessionMock: vi.fn(),
  getCurrentUserMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  assertSameSiteRequest: assertSameSiteRequestMock,
  deleteSession: deleteSessionMock,
  getCurrentUser: getCurrentUserMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import { logoutAction } from "../src/app/profile/actions";

beforeEach(() => {
  vi.clearAllMocks();
  assertSameSiteRequestMock.mockResolvedValue(undefined);
  deleteSessionMock.mockResolvedValue(undefined);
  getCurrentUserMock.mockResolvedValue({ role: "STUDENT" });
  redirectMock.mockImplementation((path: string) => {
    throw new Error(`Redirected to ${path}`);
  });
});

describe("logoutAction", () => {
  it("deletes the current session and redirects to the student login", async () => {
    await expect(logoutAction()).rejects.toThrow("Redirected to /login");

    expect(deleteSessionMock).toHaveBeenCalledOnce();
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("redirects staff users back to the staff login", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "STAFF" });

    await expect(logoutAction()).rejects.toThrow("Redirected to /staff/login");
    expect(redirectMock).toHaveBeenCalledWith("/staff/login");
  });
});
