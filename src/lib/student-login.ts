import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { createPasswordSetupSession } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getSmsProvider } from "@/lib/sms-provider";

const CODE_TTL_MINUTES = 5;
const CODE_RESEND_SECONDS = 60;
const MAX_CODES_PER_PHONE_PER_HOUR = 5;
const MAX_CODES_PER_IP_PER_HOUR = 20;
const MAX_CODE_ATTEMPTS = 5;
const CODE_RETENTION_HOURS = 24;
const DEVELOPMENT_CODE_PEPPER = "local-development-only-login-code-pepper";
const weakPasswords = new Set([
  "1234567890",
  "1111111111",
  "0000000000",
  "password1",
  "password123",
  "qwerty12345",
  "qwertyuiop",
  "admin12345",
  "student123",
  "пароль123",
  "пароль12345",
]);

export const invalidCodeMessage = "Неверный или истёкший код.";

export function normalizeStudentPhone(value: string): string | null {
  const input = value.trim();
  if (!input || input.length > 40) {
    return null;
  }

  const compact = input.replace(/[\s().-]/g, "");
  if (!/^\+?\d+$/.test(compact)) {
    return null;
  }
  if (/^\+[1-9]\d{7,14}$/.test(compact)) {
    return compact;
  }

  const digits = compact.replace(/\D/g, "");
  if (/^8\d{10}$/.test(digits)) {
    return `+7${digits.slice(1)}`;
  }
  if (/^7\d{10}$/.test(digits)) {
    return `+${digits}`;
  }
  if (/^\d{10}$/.test(digits)) {
    return `+7${digits}`;
  }
  return null;
}

export function validateNewStudentPassword(
  password: string,
  confirmation: string,
  phone: string,
): string | null {
  if (password !== confirmation) {
    return "Пароли не совпадают.";
  }
  if (Array.from(password).length < 10) {
    return "Пароль должен содержать не менее 10 символов.";
  }
  if (Buffer.byteLength(password, "utf8") > 72) {
    return "Пароль слишком длинный.";
  }
  const phoneDigits = phone.replace(/\D/g, "");
  if (password === phone || password.replace(/\D/g, "") === phoneDigits) {
    return "Пароль не должен совпадать с номером телефона.";
  }
  if (weakPasswords.has(password.trim().toLowerCase())) {
    return "Выберите менее очевидный пароль.";
  }
  return null;
}

function getCodePepper(): string {
  const pepper = process.env.LOGIN_CODE_PEPPER;
  if (process.env.NODE_ENV === "production") {
    if (!pepper || pepper.length < 32) {
      throw new Error(
        "LOGIN_CODE_PEPPER must contain at least 32 characters in production.",
      );
    }
    return pepper;
  }
  if (pepper) {
    return pepper;
  }
  return DEVELOPMENT_CODE_PEPPER;
}

function hashLoginCode(code: string): string {
  return createHmac("sha256", getCodePepper()).update(code).digest("hex");
}

function safeHashEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

async function getClientIp(): Promise<string> {
  const requestHeaders = await headers();
  const address =
    requestHeaders.get("x-real-ip")?.trim() ||
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  return address.slice(0, 128);
}

export async function requestStudentLoginCode(
  phone: string,
): Promise<void> {
  const ip = await getClientIp();
  const now = new Date();
  const minuteAgo = new Date(now.getTime() - CODE_RESEND_SECONDS * 1000);
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const retentionCutoff = new Date(
    now.getTime() - CODE_RETENTION_HOURS * 60 * 60 * 1000,
  );
  const code = String(randomInt(100_000, 1_000_000));
  const codeHash = hashLoginCode(code);
  const prisma = getPrisma();

  const result = await prisma.$transaction(async (tx) => {
    const phoneLockKey = `login-code-phone:${phone}`;
    const ipLockKey = `login-code-ip:${ip}`;
    await tx.$queryRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${phoneLockKey}, 0))
    `;
    await tx.$queryRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${ipLockKey}, 0))
    `;

    const [recentPhoneRequest, phoneCount, ipCount] = await Promise.all([
      tx.loginCode.findFirst({
        where: { phone, createdAt: { gte: minuteAgo } },
        select: { id: true },
      }),
      tx.loginCode.count({
        where: { phone, createdAt: { gte: hourAgo } },
      }),
      tx.loginCode.count({
        where: { ip, createdAt: { gte: hourAgo } },
      }),
    ]);

    if (
      recentPhoneRequest ||
      phoneCount >= MAX_CODES_PER_PHONE_PER_HOUR ||
      ipCount >= MAX_CODES_PER_IP_PER_HOUR
    ) {
      return null;
    }

    const student = await tx.student.findUnique({
      where: { phone },
      select: {
        user: { select: { id: true, role: true } },
      },
    });

    await tx.loginCode.updateMany({
      where: { phone, usedAt: null },
      data: { usedAt: now },
    });
    await tx.loginCode.create({
      data: {
        phone,
        codeHash,
        expiresAt: new Date(now.getTime() + CODE_TTL_MINUTES * 60 * 1000),
        ip,
      },
    });
    await tx.loginCode.deleteMany({
      where: { createdAt: { lt: retentionCutoff } },
    });

    return student?.user.role === "STUDENT";
  });

  if (result) {
    await getSmsProvider().sendCode(phone, code);
  }
}

export async function verifyStudentLoginCode(
  phone: string,
  code: string,
): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) {
    return false;
  }

  const prisma = getPrisma();
  const now = new Date();
  const loginCode = await prisma.loginCode.findFirst({
    where: {
      phone,
      usedAt: null,
      expiresAt: { gt: now },
      attempts: { lt: MAX_CODE_ATTEMPTS },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, codeHash: true, attempts: true },
  });
  if (!loginCode) {
    return false;
  }

  const isCorrect = safeHashEquals(loginCode.codeHash, hashLoginCode(code));
  const update = await prisma.loginCode.updateMany({
    where: {
      id: loginCode.id,
      usedAt: null,
      attempts: loginCode.attempts,
      expiresAt: { gt: now },
    },
    data: isCorrect
      ? { usedAt: now }
      : {
          attempts: { increment: 1 },
          ...(loginCode.attempts + 1 >= MAX_CODE_ATTEMPTS
            ? { usedAt: now }
            : {}),
        },
  });
  if (update.count !== 1 || !isCorrect) {
    return false;
  }

  const student = await prisma.student.findUnique({
    where: { phone },
    select: { user: { select: { id: true, role: true } } },
  });
  if (!student || student.user.role !== "STUDENT") {
    return false;
  }

  await createPasswordSetupSession(student.user.id);
  return true;
}
