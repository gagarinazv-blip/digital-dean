import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";
import styles from "./login.module.css";

function LoginFallback() {
  return (
    <main className={styles.page} aria-busy="true">
      <section className={styles.card}>
        <p>Загрузка…</p>
      </section>
    </main>
  );
}

async function LoginContent() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === "STAFF" ? "/staff" : "/");
  }

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="login-title">
        <div className={styles.brandMark} aria-hidden="true">
          <svg
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
            viewBox="0 0 24 24"
          >
            <path d="m2 9 10-5 10 5-10 5z" />
            <path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6" />
          </svg>
        </div>
        <p className={styles.eyebrow}>Студенты и сотрудники</p>
        <h1 id="login-title">Вход в цифровой деканат</h1>
        <p className={styles.description}>
          Введите логин и пароль. После входа откроется ваш кабинет.
        </p>
        <LoginForm />
      </section>
      <p className={styles.footer}>Цифровой деканат</p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
