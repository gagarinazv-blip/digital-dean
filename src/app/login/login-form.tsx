"use client";

import { useActionState } from "react";
import { loginStudentAction, type LoginActionState } from "./actions";
import styles from "./login.module.css";

const initialState: LoginActionState = {};

type LoginFormProps = {
  action?: typeof loginStudentAction;
};

export function LoginForm({ action = loginStudentAction }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="login">Логин</label>
        <input
          autoComplete="username"
          autoCapitalize="none"
          id="login"
          name="login"
          required
          maxLength={128}
          autoFocus
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="password">Пароль</label>
        <input
          autoComplete="current-password"
          id="password"
          name="password"
          required
          type="password"
        />
      </div>

      <div className={styles.messageSlot} aria-live="polite">
        {state.error && (
          <p className={styles.error} role="alert">
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
