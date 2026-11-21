import "server-only";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { getPrisma } from "@/lib/prisma";

const SESSION_COOKIE = "digital-dean-session";
const BCRYPT_ROUNDS = 12;
const MAX_PASSWORD_BYTES = 72;
const PASSWORD_SETUP_TTL_SECONDS = 15 * 60;
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
  role: "STUDENT" | "STAFF";
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

export type CurrentUser = AuthenticatedUser & {
  requiresPasswordSetup: boolean;
};

export type SessionPrincipal = {
  role: AuthenticatedUser["role"];
  requiresPasswordSetup: boolean;
  studentId: number | null;
  staffProfile: {
    id: number;
    department: string;
    isSupervisor: boolean;
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

export async function assertSameSiteRequest(): Promise<void> {
  let requestHeaders: Headers;
  try {
    requestHeaders = await headers();
  } catch {
    return;
  }

  const origin = requestHeaders.get("origin")?.trim();
  const host = requestHeaders.get("host")?.trim();

  if (!origin || !host) {
    return;
  }

  try {
    const parsedOrigin = new URL(origin);
    if (parsedOrigin.host !== host) {
      throw new Error("Origin does not match the current host.");
    }
  } catch {
    throw new Error("Invalid request origin.");
  }
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
  options: { requiresPasswordSetup?: boolean; ttlSeconds?: number } = {},
): Promise<void> {
  if (!Number.isSafeInteger(userId) || userId < 1) {
    throw new Error("A valid user id is required to create a session.");
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() +
      (options.ttlSeconds ?? getSessionTtlSeconds()) * 1000,
  );
  const prisma = getPrisma();

  await prisma.$transaction(async (tx) => {
    await tx.session.create({
      data: {
        tokenHash: sha256(token),
        userId,
        requiresPasswordSetup: options.requiresPasswordSetup ?? false,
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

export async function createPasswordSetupSession(userId: number): Promise<void> {
  await persistSession(userId, undefined, {
    requiresPasswordSetup: true,
    ttlSeconds: PASSWORD_SETUP_TTL_SECONDS,
  });
}

export async function completeStudentPasswordSetup(
  userId: number,
  passwordHash: string,
): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return false;
  }

  const prisma = getPrisma();
  const tokenHash = sha256(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      requiresPasswordSetup: true,
      expiresAt: true,
    },
  });
  if (
    !session ||
    session.userId !== userId ||
    !session.requiresPasswordSetup ||
    session.expiresAt.getTime() <= Date.now()
  ) {
    return false;
  }

  const student = await prisma.student.findUnique({
    where: { userId },
    select: { phone: true, user: { select: { role: true } } },
  });
  if (!student?.phone || student.user.role !== "STUDENT") {
    return false;
  }

  const nextToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + getSessionTtlSeconds() * 1000);
  const now = new Date();
  const completed = await prisma.$transaction(async (tx) => {
    const claimedSession = await tx.session.updateMany({
      where: {
        id: session.id,
        userId,
        requiresPasswordSetup: true,
        expiresAt: { gt: now },
      },
      data: { requiresPasswordSetup: false },
    });
    if (claimedSession.count !== 1) {
      return false;
    }

    await tx.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await tx.student.update({
      where: { userId },
      data: { accountStatus: "ACTIVE" },
    });
    await tx.session.deleteMany({
      where: { userId, id: { not: session.id } },
    });
    await tx.session.update({
      where: { id: session.id },
      data: {
        tokenHash: sha256(nextToken),
        requiresPasswordSetup: false,
        expiresAt,
      },
    });
    return true;
  });

  if (!completed) {
    return false;
  }

  await setSessionCookie(nextToken, expiresAt);
  return true;
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

export async function authenticateUserForLogin(
  loginInput: string,
  passwordInput: string,
): Promise<{ user: AuthenticatedUser | null; attemptKey: string }> {
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
    return { user: null, attemptKey };
  }

  return {
    user: {
      id: user.id,
      login: user.login,
      role: user.role,
      student: user.student,
    },
    attemptKey,
  };
}

export async function loginUser(
  loginInput: string,
  passwordInput: string,
  expectedRole: AuthenticatedUser["role"],
): Promise<AuthenticatedUser | null> {
  const { user, attemptKey } = await authenticateUserForLogin(
    loginInput,
    passwordInput,
  );
  if (!user || user.role !== expectedRole) {
    return null;
  }

  await persistSession(user.id, attemptKey);
  return user;
}

export async function loginStudentWithPhone(
  phone: string,
  passwordInput: string,
): Promise<AuthenticatedUser | null> {
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
    return null;
  }
  const password = typeof passwordInput === "string" ? passwordInput : "";
  const requestHeaders = await headers();
  const clientAddress =
    requestHeaders.get("x-real-ip")?.trim() ||
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const attemptKey = sha256(`${clientAddress}\0${phone}`);

  if (!(await registerLoginAttempt(attemptKey))) {
    throw new TooManyLoginAttemptsError();
  }

  const user = await getPrisma().user.findFirst({
    where: {
      role: "STUDENT",
      student: {
        is: { phone, accountStatus: "ACTIVE" },
      },
    },
    select: {
      ...authenticatedUserSelect,
      passwordHash: true,
    },
  });
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

export async function getCurrentUser(): Promise<CurrentUser | null> {
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
      requiresPasswordSetup: true,
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

  return {
    ...session.user,
    requiresPasswordSetup: session.requiresPasswordSetup,
  };
}

export async function getSessionPrincipalForToken(
  token: string,
): Promise<SessionPrincipal | null> {
  const session = await getPrisma().session.findUnique({
    where: { tokenHash: sha256(token) },
    select: {
      expiresAt: true,
      requiresPasswordSetup: true,
      user: {
        select: {
          role: true,
          student: { select: { id: true } },
          staffProfile: {
            select: { id: true, department: true, isSupervisor: true },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  return {
    role: session.user.role,
    requiresPasswordSetup: session.requiresPasswordSetup,
    studentId: session.user.student?.id ?? null,
    staffProfile: session.user.staffProfile,
  };
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
