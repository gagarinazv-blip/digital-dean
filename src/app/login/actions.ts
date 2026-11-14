"use server";

import { redirect } from "next/navigation";
import {
  loginUser,
  TooManyLoginAttemptsError,
} from "@/lib/auth";

export type LoginActionState = {
  error?: string;
};

const invalidCredentialsError = { error: "Неверный логин или пароль." };

export async function loginAction(
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
    user = await loginUser(login, password);
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

  if (!user) {
    return invalidCredentialsError;
  }

  redirect(user.role === "STAFF" ? "/staff" : "/");
}
