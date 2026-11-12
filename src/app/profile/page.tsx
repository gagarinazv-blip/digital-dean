import { Suspense } from "react";
import Link from "next/link";
import { requireStudent } from "@/lib/student";
import { logoutAction } from "./actions";
import styles from "./profile.module.css";

function ProfileFallback() {
  return (
    <main className={styles.page} aria-busy="true">
      <p className={styles.intro}>Загрузка профиля…</p>
    </main>
  );
}

async function ProfileContent() {
  const student = await requireStudent();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Цифровой деканат">
          <span className={styles.brandMark} aria-hidden="true">
            Д
          </span>
          <span>Цифровой деканат</span>
        </Link>
        <form action={logoutAction}>
          <button className={styles.logout} type="submit">
            Выйти
          </button>
        </form>
      </header>

      <section className={styles.content} aria-labelledby="profile-title">
        <p className={styles.eyebrow}>Личный кабинет</p>
        <h1 id="profile-title">Здравствуйте, {student.fullName}</h1>
        <p className={styles.intro}>
          Ваши данные цифрового деканата.
        </p>

        <dl className={styles.details}>
          <div>
            <dt>Факультет</dt>
            <dd>{student.faculty}</dd>
          </div>
          <div>
            <dt>Направление</dt>
            <dd>{student.direction}</dd>
          </div>
          <div>
            <dt>Курс</dt>
            <dd>{student.course}</dd>
          </div>
          <div>
            <dt>Группа</dt>
            <dd>{student.group.name}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileFallback />}>
      <ProfileContent />
    </Suspense>
  );
}
