import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import { requireStaffContext } from "@/lib/staff";
import { CreateStudentForm } from "../student-forms";
import styles from "../students.module.css";

export const instant = false;

export default async function NewStaffStudentPage() {
  await requireStaffContext();
  const groups = await getPrisma().studentGroup.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
        <Link href="/staff/students">Студенты</Link>
        <span aria-hidden="true">/</span>
        <span>Добавить</span>
      </nav>
      <header className={styles.heading}>
        <div>
          <h1>Новый студент</h1>
          <p>
            Учётная запись будет приглашённой. Студент подтвердит телефон
            одноразовым кодом и создаст пароль.
          </p>
        </div>
      </header>
      <section className={styles.panel} aria-labelledby="create-student-title">
        <div className={styles.panelHeading}>
          <div>
            <h2 id="create-student-title">Данные учётной записи</h2>
            <p>Поля будут доступны студенту после подтверждения телефона.</p>
          </div>
        </div>
        {groups.length > 0 ? (
          <CreateStudentForm groups={groups} />
        ) : (
          <p className={`${styles.error} ${styles.form}`} role="alert">
            Нельзя создать студента: в системе ещё нет учебных групп.
          </p>
        )}
      </section>
    </main>
  );
}
