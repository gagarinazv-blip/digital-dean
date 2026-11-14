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
          Д
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
