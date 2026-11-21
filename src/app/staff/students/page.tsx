import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";
import { requireStaffContext } from "@/lib/staff";
import styles from "./students.module.css";

type SearchParams = {
  q?: string | string[];
};

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function StaffStudentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaffContext();
  const { q } = await searchParams;
  const searchTerm = firstValue(q).trim().slice(0, 100);
  const phoneDigits = searchTerm.replace(/\D/g, "");
  const where: Prisma.StudentWhereInput | undefined = searchTerm
    ? {
        OR: [
          { fullName: { contains: searchTerm, mode: "insensitive" } },
          ...(phoneDigits ? [{ phone: { contains: phoneDigits } }] : []),
        ],
      }
    : undefined;
  const students = await getPrisma().student.findMany({
    where,
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      phone: true,
      course: true,
      accountStatus: true,
      corporateEmail: true,
      group: { select: { name: true } },
    },
  });

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
        <Link href="/staff">Рабочее место</Link>
        <span aria-hidden="true">/</span>
        <span>Студенты</span>
      </nav>
      <header className={styles.heading}>
        <div>
          <h1>Студенты</h1>
          <p>Поиск и управление данными учётных записей студентов.</p>
        </div>
        <Link className={styles.primaryButton} href="/staff/students/new">
          Добавить студента
        </Link>
      </header>

      <section className={styles.panel} aria-labelledby="student-list-title">
        <div className={styles.panelHeading}>
          <div>
            <h2 id="student-list-title">Список студентов</h2>
            <p>
              {students.length === 1
                ? "Найден 1 студент"
                : `Найдено студентов: ${students.length}`}
            </p>
          </div>
        </div>
        <form className={styles.searchForm} role="search" method="get">
          <label className={styles.searchField} htmlFor="student-search">
            ФИО или номер телефона
            <input
              autoComplete="off"
              id="student-search"
              maxLength={100}
              name="q"
              placeholder="Например, Анна или +7 900…"
              type="search"
              defaultValue={searchTerm}
            />
          </label>
          <button className={styles.secondaryButton} type="submit">
            Найти
          </button>
          {searchTerm ? (
            <Link className={styles.textLink} href="/staff/students">
              Сбросить
            </Link>
          ) : null}
        </form>

        {students.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>
              {searchTerm
                ? "Студенты не найдены"
                : "Список студентов пока пуст"}
            </strong>
            <p>
              {searchTerm
                ? "Проверьте написание ФИО или номера телефона."
                : "Добавьте студента и задайте ему пароль для входа."}
            </p>
          </div>
        ) : (
          <div
            className={styles.tableScroller}
            role="region"
            aria-label="Список студентов"
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Студент</th>
                  <th scope="col">Телефон</th>
                  <th scope="col">Группа и курс</th>
                  <th scope="col">Доступ</th>
                  <th scope="col">Корпоративная почта</th>
                  <th scope="col">Профиль</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td data-label="Студент">
                      <strong>{student.fullName}</strong>
                    </td>
                    <td data-label="Телефон">{student.phone ?? "Не указан"}</td>
                    <td data-label="Группа и курс">
                      {student.group.name} · {student.course} курс
                    </td>
                    <td data-label="Доступ">
                      <span
                        className={`${styles.status} ${
                          student.accountStatus === "ACTIVE"
                            ? styles.statusActive
                            : styles.statusInvited
                        }`}
                      >
                        {student.accountStatus === "ACTIVE"
                          ? "Активен"
                          : "Ожидает пароль"}
                      </span>
                    </td>
                    <td data-label="Корпоративная почта">
                      {student.corporateEmail ?? "Не выдана"}
                    </td>
                    <td data-label="Профиль">
                      <Link
                        className={styles.openLink}
                        href={`/staff/students/${student.id}`}
                      >
                        Открыть
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
