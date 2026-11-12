import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
}));

import { cookies, headers } from "next/headers";
import { getPrisma } from "@/lib/prisma";
import {
  createSession,
  deleteSession,
  getCurrentUser,
  loginUser,
  TooManyLoginAttemptsError,
  verifyPassword,
} from "../src/lib/auth";

const cookieName = "digital-dean-session";
const sessionCreate = vi.fn();
const sessionFindUnique = vi.fn();
const sessionDeleteMany = vi.fn();
const userFindUnique = vi.fn();
const loginAttemptDeleteMany = vi.fn();
const queryRaw = vi.fn();
let attempts = 0;
let cookieToken: string | undefined;

const transactionMock = {
  session: { create: sessionCreate },
  loginAttempt: { deleteMany: loginAttemptDeleteMany },
  $queryRaw: queryRaw,
};

const prismaMock = {
  $transaction: vi.fn(),
  session: {
    findUnique: sessionFindUnique,
    deleteMany: sessionDeleteMany,
  },
  user: { findUnique: userFindUnique },
  loginAttempt: { deleteMany: loginAttemptDeleteMany },
};

const cookieStoreMock = {
  get: vi.fn(() =>
    cookieToken === undefined ? undefined : { name: cookieName, value: cookieToken },
  ),
  set: vi.fn((_name: string, value: string) => {
    cookieToken = value;
  }),
  delete: vi.fn(() => {
    cookieToken = undefined;
  }),
};

const authenticatedUser = {
  id: 7,
  login: "student.alpha",
  role: "STUDENT" as const,
  student: {
    id: 3,
    fullName: "Альфира Луновей",
    faculty: "Факультет лунной картографии",
    direction: "Орбитальная топография",
    course: 2,
    group: { id: 2, name: "DEMO-ALPHA" },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  attempts = 0;
  cookieToken = undefined;
  process.env.SESSION_TTL_MINUTES = "60";
  vi.mocked(cookies).mockResolvedValue(cookieStoreMock as never);
  vi.mocked(headers).mockResolvedValue(
    new Headers({ "x-real-ip": "127.0.0.1" }) as never,
  );
  vi.mocked(getPrisma).mockReturnValue(prismaMock as never);
  prismaMock.$transaction.mockImplementation(
    async (callback: (transaction: typeof transactionMock) => Promise<unknown>) =>
      callback(transactionMock),
  );
  queryRaw.mockImplementation(async () => [{ attempts: ++attempts }]);
  sessionCreate.mockImplementation(async () => ({}));
  sessionDeleteMany.mockResolvedValue({ count: 1 });
  loginAttemptDeleteMany.mockResolvedValue({ count: 1 });
  userFindUnique.mockResolvedValue(null);
  sessionFindUnique.mockResolvedValue(null);
});

describe("password verification", () => {
  it("accepts the correct password and rejects an incorrect one", async () => {
    const hash = await bcrypt.hash("correct-demo-password", 4);

    await expect(
      verifyPassword("correct-demo-password", hash),
    ).resolves.toBe(true);
    await expect(verifyPassword("wrong-demo-password", hash)).resolves.toBe(
      false,
    );
  });
});

describe("session lifecycle", () => {
  it("creates a random token, stores only its SHA-256 hash, and sets a secure cookie", async () => {
    await createSession(authenticatedUser.id);

    expect(sessionCreate).toHaveBeenCalledOnce();
    const { data } = sessionCreate.mock.calls[0][0];
    expect(data.userId).toBe(authenticatedUser.id);
    expect(data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(cookieToken).toBeDefined();
    expect(Buffer.from(cookieToken!, "base64url")).toHaveLength(32);
    expect(data.tokenHash).toBe(
      createHash("sha256").update(cookieToken!).digest("hex"),
    );
    expect(data.tokenHash).not.toBe(cookieToken);
    expect(cookieStoreMock.set).toHaveBeenCalledWith(
      cookieName,
      cookieToken,
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
        expires: data.expiresAt,
      }),
    );
  });

  it("returns the user for a valid session", async () => {
    cookieToken = "valid-session-token";
    sessionFindUnique.mockResolvedValue({
      id: "session-1",
      expiresAt: new Date(Date.now() + 60_000),
      user: authenticatedUser,
    });

    await expect(getCurrentUser()).resolves.toEqual(authenticatedUser);
    expect(sessionFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tokenHash: createHash("sha256").update(cookieToken).digest("hex"),
        },
      }),
    );
  });

  it("deletes an expired session and returns null", async () => {
    cookieToken = "expired-session-token";
    sessionFindUnique.mockResolvedValue({
      id: "expired-session",
      expiresAt: new Date(Date.now() - 1),
      user: authenticatedUser,
    });

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(sessionDeleteMany).toHaveBeenCalledWith({
      where: { id: "expired-session" },
    });
  });

  it("returns null without reading the database when there is no cookie", async () => {
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(sessionFindUnique).not.toHaveBeenCalled();
  });

  it("deletes the current database session and clears its cookie", async () => {
    cookieToken = "session-to-delete";
    const token = cookieToken;
    await deleteSession();

    expect(sessionDeleteMany).toHaveBeenCalledWith({
      where: {
        tokenHash: createHash("sha256").update(token).digest("hex"),
      },
    });
    expect(cookieStoreMock.delete).toHaveBeenCalledWith(cookieName);
    expect(cookieToken).toBeUndefined();
  });
});

describe("login", () => {
  it("creates a session when the password is correct", async () => {
    const passwordHash = await bcrypt.hash("correct-demo-password", 4);
    userFindUnique.mockResolvedValue({
      ...authenticatedUser,
      passwordHash,
    });

    await expect(
      loginUser(" STUDENT.ALPHA ", "correct-demo-password"),
    ).resolves.toEqual(authenticatedUser);
    expect(userFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { login: "student.alpha" } }),
    );
    expect(sessionCreate).toHaveBeenCalledOnce();
    expect(loginAttemptDeleteMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ keyHash: expect.any(String) }),
    });
  });

  it("rejects an incorrect password", async () => {
    const passwordHash = await bcrypt.hash("correct-demo-password", 4);
    userFindUnique.mockResolvedValue({
      ...authenticatedUser,
      passwordHash,
    });

    await expect(
      loginUser("student.alpha", "wrong-demo-password"),
    ).resolves.toBeNull();
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it("checks a dummy bcrypt hash when the login does not exist", async () => {
    const compareSpy = vi.spyOn(bcrypt, "compare");

    await expect(
      loginUser("unknown.demo.user", "wrong-demo-password"),
    ).resolves.toBeNull();

    expect(compareSpy).toHaveBeenCalledOnce();
    const [, comparedHash] = compareSpy.mock.calls[0];
    expect(comparedHash).toMatch(/^\$2[aby]\$12\$/);
    expect(userFindUnique).toHaveBeenCalledOnce();
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it("blocks login after five attempts in the rate-limit window", async () => {
    const compareSpy = vi.spyOn(bcrypt, "compare");

    for (let attempt = 0; attempt < 5; attempt++) {
      await expect(
        loginUser("unknown.demo.user", "wrong-demo-password"),
      ).resolves.toBeNull();
    }

    await expect(
      loginUser("unknown.demo.user", "wrong-demo-password"),
    ).rejects.toBeInstanceOf(TooManyLoginAttemptsError);

    expect(queryRaw).toHaveBeenCalledTimes(6);
    expect(userFindUnique).toHaveBeenCalledTimes(5);
    expect(compareSpy).toHaveBeenCalledTimes(5);
  });
});
