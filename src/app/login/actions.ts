"use server";

import { redirect } from "next/navigation";
import {
  assertSameSiteRequest,
  completeStudentPasswordReset,
  getCurrentUser,
  hashPassword,
  loginStaffWithPhone,
  loginStudentWithPhone,
  loginUser,
  TooManyLoginAttemptsError,
} from "@/lib/auth";
import {
  invalidCodeMessage,
  normalizeStudentPhone,
  requestStudentPasswordResetCode,
  validateNewStudentPassword,
  verifyStudentPasswordResetCode,
} from "@/lib/student-login";
import { getPrisma } from "@/lib/prisma";
import {
  looksLikePhoneInput,
  normalizeStudentPhone as normalizePhone,
} from "@/lib/phone-utils";

export type LoginActionState = {
  error?: string;
  phoneError?: string;
};

export type StudentCodeRequestState = {
  error?: string;
  phone?: string;
  sent?: boolean;
};

const invalidStudentCredentialsError = {
  error: "Неверный номер телефона или пароль",
};
const invalidStaffCredentialsError = {
  error: "Неверный номер телефона, логин или пароль",
};
const invalidPhoneError =
  "Введите корректный номер: +7 900 000-00-00 или 8 900 000-00-00.";
const invalidCodeError = { error: invalidCodeMessage };

function redactSensitiveErrorText(value: string): string {
  return value
    .replace(
      /(postgres(?:ql)?:\/\/[^:/\s]+:)[^@\s/]+@/gi,
      "$1[REDACTED]@",
    )
    .replace(
      /((?:password(?:hash)?|passwd|secret|token)\s*[:=]\s*)[^\s,;]+/gi,
      "$1[REDACTED]",
    )
    .replace(
      /((?:SEED_[A-Z0-9_]*PASSWORD|DATABASE_URL)\s*=\s*)[^\s,;]+/gi,
      "$1[REDACTED]",
    );
}

function logActionFailure(action: string, error: unknown): void {
  const message =
    error instanceof Error ? error.message : String(error);
  const errorCode =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    /^P\d{4}$/.test(error.code)
      ? error.code
      : undefined;
  console.error(`${action} failed.`, {
    name: error instanceof Error ? error.name : "UnknownError",
    message: redactSensitiveErrorText(message),
    ...(error instanceof Error && error.stack
      ? { stack: redactSensitiveErrorText(error.stack) }
      : {}),
    ...(errorCode ? { code: errorCode } : {}),
  });
}

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const loginValue = formData.get("login");
  const password = formData.get("password");
  const role = formData.get("role");

  if (
    role !== "staff" ||
    typeof loginValue !== "string" ||
    typeof password !== "string"
  ) {
    return { error: "Введите номер телефона или служебный логин и пароль." };
  }
  const phoneInput = looksLikePhoneInput(loginValue);
  const phone = phoneInput ? normalizePhone(loginValue) : null;
  if (phoneInput && !phone) {
    return { phoneError: invalidPhoneError };
  }

  let user;
  try {
    await assertSameSiteRequest();
    user = phone
      ? await loginStaffWithPhone(phone, password)
      : await loginUser(loginValue, password, "STAFF");
  } catch (error) {
    if (error instanceof TooManyLoginAttemptsError) {
      return {
        error: "Слишком много попыток входа. Попробуйте снова через 15 минут.",
      };
    }

    logActionFailure("Staff login", error);
    return {
      error: "Не удалось выполнить вход. Попробуйте немного позже.",
    };
  }

  if (!user || user.role !== "STAFF") {
    return invalidStaffCredentialsError;
  }

  redirect("/staff");
}

export async function studentPhoneLoginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const phoneValue = formData.get("phone");
  const password = formData.get("password");
  if (typeof phoneValue !== "string" || !phoneValue.trim()) {
    return { phoneError: invalidPhoneError };
  }
  const phoneInput = looksLikePhoneInput(phoneValue);
  const phone = phoneInput ? normalizePhone(phoneValue) : null;
  if (phoneInput && !phone) {
    return { phoneError: invalidPhoneError };
  }
  if (typeof password !== "string") {
    return invalidStudentCredentialsError;
  }

  let user;
  try {
    await assertSameSiteRequest();
    user = phone
      ? await loginStudentWithPhone(phone, password)
      : await loginUser(phoneValue, password, "STUDENT");
  } catch (error) {
    if (error instanceof TooManyLoginAttemptsError) {
      return {
        error: "Слишком много попыток входа. Попробуйте снова через 15 минут.",
      };
    }
    logActionFailure("Student phone login", error);
    return {
      error: "Не удалось выполнить вход. Попробуйте немного позже.",
    };
  }

  if (!user || user.role !== "STUDENT") {
    return invalidStudentCredentialsError;
  }
  redirect("/");
}

export async function requestStudentPasswordResetCodeAction(
  _previousState: StudentCodeRequestState,
  formData: FormData,
): Promise<StudentCodeRequestState> {
  const phoneValue = formData.get("phone");
  const phone =
    typeof phoneValue === "string"
      ? normalizeStudentPhone(phoneValue)
      : null;
  if (!phone) {
    return { error: "Введите номер телефона в международном формате." };
  }

  try {
    await assertSameSiteRequest();
    await requestStudentPasswordResetCode(phone);
    return { phone, sent: true };
  } catch (error) {
    logActionFailure("Student login code request", error);
    return {
      error: "Не удалось обработать запрос. Попробуйте немного позже.",
    };
  }
}

export async function verifyStudentPasswordResetCodeAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const phoneValue = formData.get("phone");
  const codeValue = formData.get("code");
  const phone =
    typeof phoneValue === "string"
      ? normalizeStudentPhone(phoneValue)
      : null;
  if (!phone || typeof codeValue !== "string") {
    return invalidCodeError;
  }

  let verified = false;
  try {
    await assertSameSiteRequest();
    verified = await verifyStudentPasswordResetCode(phone, codeValue.trim());
  } catch (error) {
    logActionFailure("Student login code verification", error);
    return { error: "Не удалось проверить код. Попробуйте немного позже." };
  }

  if (!verified) {
    return invalidCodeError;
  }
  redirect("/login?role=student&step=password");
}

export async function setStudentPasswordAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const password = formData.get("password");
  const confirmation = formData.get("confirmation");
  if (typeof password !== "string" || typeof confirmation !== "string") {
    return { error: "Заполните оба поля пароля." };
  }

  let user;
  try {
    await assertSameSiteRequest();
    user = await getCurrentUser();
  } catch (error) {
    logActionFailure("Student password setup session", error);
    return { error: "Сессия подтверждения истекла. Запросите новый код." };
  }
  if (
    !user ||
    user.role !== "STUDENT" ||
    !user.requiresPasswordSetup
  ) {
    return { error: "Сессия подтверждения истекла. Запросите новый код." };
  }

  let student: { phone: string | null } | null;
  try {
    student = await getPrisma().student.findUnique({
      where: { userId: user.id },
      select: { phone: true },
    });
  } catch (error) {
    logActionFailure("Student password setup lookup", error);
    return { error: "Не удалось настроить пароль. Попробуйте позже." };
  }
  if (!student?.phone) {
    return { error: "Не удалось настроить пароль. Обратитесь в деканат." };
  }

  const validationError = validateNewStudentPassword(
    password,
    confirmation,
    student.phone,
  );
  if (validationError) {
    return { error: validationError };
  }

  try {
    const passwordHash = await hashPassword(password);
    const completed = await completeStudentPasswordReset(
      user.id,
      passwordHash,
    );
    if (!completed) {
      return { error: "Сессия подтверждения истекла. Запросите новый код." };
    }
  } catch (error) {
    logActionFailure("Student password setup", error);
    return { error: "Не удалось сохранить пароль. Попробуйте позже." };
  }

  redirect("/login?role=student");
}
