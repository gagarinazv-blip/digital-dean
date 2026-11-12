import "server-only";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { getPrisma } from "@/lib/prisma";

const SESSION_COOKIE = "digital-dean-session";
const BCRYPT_ROUNDS = 12;
const MAX_PASSWORD_BYTES = 72;
const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_ATTEMPT_WINDOW_MINUTES = 15;
const DUMMY_PASSWORD_HASH =
  "$2b$12$GUDEMssZI/HuBvjWmr55vut92GYiVIUNVGhOihYod7sAWq93nGzMC";

const authenticatedUserSelect = {
  id: true,
  login: true,
  role: true,
  student: {
    select: {
      id: true,
      fullName: true,
      faculty: true,
      direction: true,
      course: true,
      group: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} as const;

export type AuthenticatedUser = {
  id: number;
  login: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  student: {
    id: number;
    fullName: string;
    faculty: string;
    direction: string;
    course: number;
    group: {
      id: number;
      name: string;
    };
  } | null;
};

export class TooManyLoginAttemptsError extends Error {
  constructor() {
    super("Too many login attempts. Try again later.");
    this.name = "TooManyLoginAttemptsError";
  }
}

function assertSupportedPassword(password: string): void {
  const byteLength = Buffer.byteLength(password, "utf8");
  if (byteLength === 0 || byteLength > MAX_PASSWORD_BYTES) {
    throw new Error("Password must contain between 1 and 72 UTF-8 bytes.");
  }
}

export async function hashPassword(password: string): Promise<string> {
  assertSupportedPassword(password);
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    await bcrypt.compare("", passwordHash);
    return false;
  }
  return bcrypt.compare(password, passwordHash);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function getSessionTtlSeconds(): number {
  const value = process.env.SESSION_TTL_MINUTES ?? "60";
  if (!/^\d+$/.test(value)) {
    throw new Error("SESSION_TTL_MINUTES must be a positive integer.");
  }

  const minutes = Number(value);
  if (!Number.isSafeInteger(minutes) || minutes < 1 || minutes > 525_600) {
    throw new Error(
      "SESSION_TTL_MINUTES must be between 1 and 525600 minutes.",
    );
  }
  return minutes * 60;
}

async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
    maxAge: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
  });
}

async function persistSession(
  userId: number,
  loginAttemptKey?: string,
): Promise<void> {
  if (!Number.isSafeInteger(userId) || userId < 1) {
    throw new Error("A valid user id is required to create a session.");
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + getSessionTtlSeconds() * 1000);
  const prisma = getPrisma();

  await prisma.$transaction(async (tx) => {
    await tx.session.create({
      data: {
        tokenHash: sha256(token),
        userId,
        expiresAt,
      },
    });
    if (loginAttemptKey) {
      await tx.loginAttempt.deleteMany({
        where: { keyHash: loginAttemptKey },
      });
    }
  });

  await setSessionCookie(token, expiresAt);
}

export async function createSession(userId: number): Promise<void> {
  await persistSession(userId);
}

async function registerLoginAttempt(keyHash: string): Promise<boolean> {
  const now = new Date();
  const windowStartedAt = new Date(
    now.getTime() - LOGIN_ATTEMPT_WINDOW_MINUTES * 60 * 1000,
  );
  const prisma = getPrisma();

  const attempts = await prisma.$transaction(async (tx) => {
    const [row] = await tx.$queryRaw<{ attempts: number }[]>`
      INSERT INTO "LoginAttempt" ("keyHash", "windowStartedAt", "attempts")
      VALUES (${keyHash}, ${now}, 1)
      ON CONFLICT ("keyHash") DO UPDATE SET
        "attempts" = CASE
          WHEN "LoginAttempt"."windowStartedAt" <= ${windowStartedAt} THEN 1
          ELSE "LoginAttempt"."attempts" + 1
        END,
        "windowStartedAt" = CASE
          WHEN "LoginAttempt"."windowStartedAt" <= ${windowStartedAt} THEN ${now}
          ELSE "LoginAttempt"."windowStartedAt"
        END
      RETURNING "attempts"
    `;

    await tx.loginAttempt.deleteMany({
      where: { windowStartedAt: { lt: windowStartedAt } },
    });
    return row?.attempts;
  });

  if (attempts === undefined) {
    throw new Error("Could not register the login attempt.");
  }
  return attempts <= LOGIN_ATTEMPT_LIMIT;
}

export async function loginUser(
  loginInput: string,
  passwordInput: string,
): Promise<AuthenticatedUser | null> {
  const login =
    typeof loginInput === "string" ? loginInput.trim().toLowerCase() : "";
  const password = typeof passwordInput === "string" ? passwordInput : "";
  const requestHeaders = await headers();
  const clientAddress =
    requestHeaders.get("x-real-ip")?.trim() ||
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const attemptKey = sha256(`${clientAddress}\0${login}`);

  if (!(await registerLoginAttempt(attemptKey))) {
    throw new TooManyLoginAttemptsError();
  }

  const usableLogin = login.length > 0 && login.length <= 128;
  const user = usableLogin
    ? await getPrisma().user.findUnique({
        where: { login },
        select: {
          ...authenticatedUserSelect,
          passwordHash: true,
        },
      })
    : null;

  const passwordMatches = await verifyPassword(
    password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );
  if (!user || !passwordMatches) {
    return null;
  }

  await persistSession(user.id, attemptKey);
  return {
    id: user.id,
    login: user.login,
    role: user.role,
    student: user.student,
  };
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const prisma = getPrisma();
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    select: {
      id: true,
      expiresAt: true,
      user: {
        select: authenticatedUserSelect,
      },
    },
  });
  if (!session) {
    return null;
  }
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }

  return session.user;
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  try {
    if (token) {
      await getPrisma().session.deleteMany({
        where: { tokenHash: sha256(token) },
      });
    }
  } finally {
    cookieStore.delete(SESSION_COOKIE);
  }
}
