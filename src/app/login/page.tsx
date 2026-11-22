import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BRAND_NAME, BrandMark } from "@/components/brand-logo";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm, StudentPasswordResetForm } from "./login-form";
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
  if (user && !user.requiresPasswordSetup) {
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
              <BrandMark />
            </span>
            <strong>{BRAND_NAME}</strong>
          </div>
          <span className={styles.topbarDescriptor}>
            Личный кабинет студента и сотрудника
          </span>
        </div>
      </header>
      <main className={styles.page}>
        <section className={styles.card} aria-labelledby="login-title">
          <h1 id="login-title">
            {user?.requiresPasswordSetup ? "Новый пароль" : "Вход"}
          </h1>
          <p className={styles.description}>
            {user?.requiresPasswordSetup
              ? "После сохранения войдите по телефону и новому паролю."
              : "Единый кабинет университета"}
          </p>
          {user?.requiresPasswordSetup ? (
            <StudentPasswordResetForm />
          ) : (
            <LoginForm initialRole={initialRole} />
          )}
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
