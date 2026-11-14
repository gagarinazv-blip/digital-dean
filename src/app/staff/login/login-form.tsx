"use client";

import { LoginForm } from "@/app/login/login-form";
import { loginStaffAction } from "@/app/login/actions";

export function StaffLoginForm() {
  return <LoginForm action={loginStaffAction} />;
}
