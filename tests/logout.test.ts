import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteSessionMock, redirectMock } = vi.hoisted(() => ({
  deleteSessionMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  deleteSession: deleteSessionMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import { logoutAction } from "../src/app/profile/actions";

beforeEach(() => {
  vi.clearAllMocks();
  deleteSessionMock.mockResolvedValue(undefined);
  redirectMock.mockImplementation((path: string) => {
    throw new Error(`Redirected to ${path}`);
  });
});

describe("logoutAction", () => {
  it("deletes the current session and redirects to login", async () => {
    await expect(logoutAction()).rejects.toThrow("Redirected to /login");

    expect(deleteSessionMock).toHaveBeenCalledOnce();
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });
});
