"use server";

import { redirect } from "next/navigation";
import {
  assertSameSiteRequest,
  completeStudentPasswordSetup,
  getCurrentUser,
  hashPassword,
  loginStudentWithPhone,
  loginUser,
  TooManyLoginAttemptsError,
} from "@/lib/auth";
import {
  invalidCodeMessage,
  normalizeStudentPhone,
  requestStudentLoginCode,
  validateNewStudentPassword,
  verifyStudentLoginCode,
} from "@/lib/student-login";
import { getPrisma } from "@/lib/prisma";

export type LoginActionState = {
  error?: string;
};

export type StudentCodeRequestState = {
  error?: string;
  phone?: string;
  sent?: boolean;
};

const invalidCredentialsError = { error: "Неверные данные для входа" };
const invalidCodeError = { error: invalidCodeMessage };

function logActionFailure(action: string, error: unknown): void {
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
    ...(errorCode ? { code: errorCode } : {}),
  });
}

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const login = formData.get("login");
  const password = formData.get("password");
  const role = formData.get("role");

  if (
    role !== "staff" ||
    typeof login !== "string" ||
    typeof password !== "string"
  ) {
    return { error: "Введите логин и пароль." };
  }

  let user;
  try {
    await assertSameSiteRequest();
    user = await loginUser(login, password, "STAFF");
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
    return invalidCredentialsError;
  }

  redirect("/staff");
}

export async function studentPhoneLoginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const phoneValue = formData.get("phone");
  const password = formData.get("password");
  const phone =
    typeof phoneValue === "string"
      ? normalizeStudentPhone(phoneValue)
      : null;
  if (!phone || typeof password !== "string") {
    return invalidCredentialsError;
  }

  let user;
  try {
    await assertSameSiteRequest();
    user = await loginStudentWithPhone(phone, password);
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
    return invalidCredentialsError;
  }
  redirect("/");
}

export async function requestStudentCodeAction(
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
    await requestStudentLoginCode(phone);
    return { phone, sent: true };
  } catch (error) {
    logActionFailure("Student login code request", error);
    return {
      error: "Не удалось обработать запрос. Попробуйте немного позже.",
    };
  }
}

export async function verifyStudentCodeAction(
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
    verified = await verifyStudentLoginCode(phone, codeValue.trim());
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
    const completed = await completeStudentPasswordSetup(
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

  redirect("/");
}
