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

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ role?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === "STAFF" ? "/staff" : "/");
  }
  const { role } = await searchParams;
  const roleValue = typeof role === "string" ? role : null;
  const initialRole = roleValue === "staff" ? "staff" : "student";

  return (
    <>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <div className={styles.topbarBrand}>
            <span className={styles.topbarMark} aria-hidden="true">
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
            </span>
            <strong>Campus OS</strong>
          </div>
          <span className={styles.topbarDescriptor}>Сервисы университета</span>
          <div className={styles.topbarSearch} aria-hidden="true">
            <svg
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>
            <span>Поиск по сервисам</span>
          </div>
          <div className={styles.topbarActions} aria-hidden="true">
            <svg
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
            <span className={styles.topbarAvatar}>
              <svg
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.7"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </svg>
            </span>
          </div>
        </div>
      </header>
      <main className={styles.page}>
        <section className={styles.card} aria-labelledby="login-title">
          <h1 id="login-title">Вход</h1>
          <p className={styles.description}>Единый кабинет университета</p>
          <LoginForm initialRole={initialRole} />
        </section>
        <p className={styles.footer}>
          Демонстрационный проект. Все данные вымышлены.
        </p>
      </main>
    </>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
