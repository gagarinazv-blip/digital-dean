import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  assertSameSiteRequestMock,
  deleteSessionMock,
  redirectMock,
} = vi.hoisted(() => ({
  assertSameSiteRequestMock: vi.fn(),
  deleteSessionMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  assertSameSiteRequest: assertSameSiteRequestMock,
  deleteSession: deleteSessionMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import { logoutAction } from "../src/app/profile/actions";

beforeEach(() => {
  vi.clearAllMocks();
  assertSameSiteRequestMock.mockResolvedValue(undefined);
  deleteSessionMock.mockResolvedValue(undefined);
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

  it("redirects everyone back to the shared login", async () => {
    await expect(logoutAction()).rejects.toThrow("Redirected to /login");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });
});
