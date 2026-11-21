"use client";

import {
  useActionState,
  useEffect,
  useRef,
  type KeyboardEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAction, type LoginActionState } from "./actions";
import styles from "./login.module.css";

const initialState: LoginActionState = {};

type LoginRole = "student" | "staff";

function CredentialsForm({ role }: { role: LoginRole }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const fieldPrefix = `login-${role}`;
  const roleLabel = role === "staff" ? "сотрудника" : "студента";

  return (
    <form
      action={formAction}
      aria-busy={pending}
      className={styles.form}
    >
      <input name="role" type="hidden" value={role} />
      <div className={styles.field}>
        <label htmlFor={`${fieldPrefix}-username`}>
          {role === "staff" ? "Служебный логин" : "Логин студента"}
        </label>
        <input
          aria-describedby={state.error ? `${fieldPrefix}-error` : undefined}
          aria-invalid={state.error ? true : undefined}
          autoComplete="username"
          autoCapitalize="none"
          id={`${fieldPrefix}-username`}
          name="login"
          required
          maxLength={128}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={`${fieldPrefix}-password`}>
          Пароль {roleLabel}
        </label>
        <input
          aria-describedby={state.error ? `${fieldPrefix}-error` : undefined}
          aria-invalid={state.error ? true : undefined}
          autoComplete="current-password"
          id={`${fieldPrefix}-password`}
          name="password"
          required
          type="password"
        />
      </div>

      <div className={styles.messageSlot} aria-live="polite">
        {state.error && (
          <p className={styles.error} id={`${fieldPrefix}-error`} role="alert">
            {state.error}
          </p>
        )}
      </div>

      <button className={styles.submit} disabled={pending} type="submit">
        {pending ? "Входим…" : "Войти"}
      </button>
    </form>
  );
}

export function LoginForm({ initialRole }: { initialRole: LoginRole }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentTabRef = useRef<HTMLButtonElement>(null);
  const staffTabRef = useRef<HTMLButtonElement>(null);
  const roleValues = searchParams.getAll("role");
  const roleParam = roleValues.length === 1 ? roleValues[0] : null;
  const role: LoginRole =
    roleParam === "staff"
      ? "staff"
      : roleParam === "student"
        ? "student"
        : roleValues.length === 0
          ? initialRole
          : "student";
  const hasCanonicalRole = roleValues.length === 1 && roleValues[0] === role;

  useEffect(() => {
    if (!hasCanonicalRole) {
      router.replace(`/login?role=${role}`, { scroll: false });
    }
  }, [hasCanonicalRole, role, router]);

  function selectRole(nextRole: LoginRole) {
    if (role !== nextRole || !hasCanonicalRole) {
      router.replace(`/login?role=${nextRole}`, { scroll: false });
    }
  }

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentRole: LoginRole,
  ) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }
    event.preventDefault();
    const nextRole = currentRole === "student" ? "staff" : "student";
    (nextRole === "student" ? studentTabRef : staffTabRef).current?.focus();
    selectRole(nextRole);
  }

  return (
    <>
      <div aria-label="Тип аккаунта" className={styles.roleTabs} role="tablist">
        <button
          aria-controls="login-panel"
          aria-selected={role === "student"}
          className={styles.roleTab}
          id="login-tab-student"
          onClick={() => selectRole("student")}
          onKeyDown={(event) => handleTabKeyDown(event, "student")}
          ref={studentTabRef}
          role="tab"
          tabIndex={role === "student" ? 0 : -1}
          type="button"
        >
          Студент
        </button>
        <button
          aria-controls="login-panel"
          aria-selected={role === "staff"}
          className={styles.roleTab}
          id="login-tab-staff"
          onClick={() => selectRole("staff")}
          onKeyDown={(event) => handleTabKeyDown(event, "staff")}
          ref={staffTabRef}
          role="tab"
          tabIndex={role === "staff" ? 0 : -1}
          type="button"
        >
          Сотрудник
        </button>
      </div>
      <div
        aria-labelledby={`login-tab-${role}`}
        className={styles.tabPanel}
        id="login-panel"
        role="tabpanel"
        tabIndex={0}
      >
        <CredentialsForm key={role} role={role} />
      </div>
    </>
  );
}
