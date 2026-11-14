import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import styles from "@/app/login/login.module.css";
import { StaffLoginForm } from "./login-form";

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
      <section className={styles.card} aria-labelledby="staff-login-title">
        <div className={styles.brandMark} aria-hidden="true">
          Д
        </div>
        <p className={styles.eyebrow}>Кабинет сотрудника</p>
        <h1 id="staff-login-title">Вход для сотрудников</h1>
        <p className={styles.description}>
          Введите логин и пароль вашей рабочей учётной записи.
        </p>
        <StaffLoginForm />
      </section>
      <p className={styles.footer}>Цифровой деканат</p>
    </main>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
