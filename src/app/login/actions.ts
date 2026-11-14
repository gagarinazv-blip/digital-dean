"use server";

import { redirect } from "next/navigation";
import {
  authenticateUserForLogin,
  TooManyLoginAttemptsError,
} from "@/lib/auth";

export type LoginActionState = {
  error?: string;
};

const invalidCredentialsError = { error: "Неверный логин или пароль." };

async function loginWithRoleAction(
  expectedRole: "STUDENT" | "STAFF",
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const login = formData.get("login");
  const password = formData.get("password");

  if (typeof login !== "string" || typeof password !== "string") {
    return { error: "Введите логин и пароль." };
  }

  let user;
  try {
    const result = await authenticateUserForLogin(login, password);
    user = result.user;
  } catch (error) {
    if (error instanceof TooManyLoginAttemptsError) {
      return {
        error: "Слишком много попыток входа. Попробуйте снова через 15 минут.",
      };
    }

    const errorCode =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string" &&
      /^P\d{4}$/.test(error.code)
        ? error.code
        : undefined;
    console.error("Login action failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
      ...(errorCode ? { code: errorCode } : {}),
    });
    return {
      error: "Не удалось выполнить вход. Попробуйте немного позже.",
    };
  }

  if (!user || user.role !== expectedRole) {
    return invalidCredentialsError;
  }

  redirect(user.role === "STAFF" ? "/staff" : "/");
}

export async function loginAction(
  previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  return loginWithRoleAction("STUDENT", previousState, formData);
}

export async function loginStudentAction(
  previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  return loginWithRoleAction("STUDENT", previousState, formData);
}

export async function loginStaffAction(
  previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  return loginWithRoleAction("STAFF", previousState, formData);
}
