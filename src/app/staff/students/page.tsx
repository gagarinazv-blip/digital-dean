import { SectionHeader } from "@/components/section-header";
import { Suspense } from "react";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { CampusLoading } from "@/components/campus-section";
import { getPrisma } from "@/lib/prisma";
import { requireStaffContext } from "@/lib/staff";
import {
  getStudentListFilters,
  type StudentListSearchParams,
} from "@/lib/staff-student-filters";
import styles from "./students.module.css";

export default function StaffStudentsPage({
  searchParams,
}: {
  searchParams: Promise<StudentListSearchParams>;
}) {
  return (
    <Suspense fallback={<CampusLoading label="список студентов" />}>
      <StaffStudentsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function StaffStudentsContent({
  searchParams,
}: {
  searchParams: Promise<StudentListSearchParams>;
}) {
  await requireStaffContext();
  const [query, groups] = await Promise.all([
    searchParams,
    getPrisma().studentGroup.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const filters = getStudentListFilters(
    query,
    groups.map((group) => group.id),
  );
  const where: Prisma.StudentWhereInput | undefined = filters.where;
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
      <SectionHeader
        action={
          <Link className={styles.primaryButton} href="/staff/students/new">
            Добавить студента
          </Link>
        }
        description="Поиск и управление данными учётных записей студентов."
        eyebrow="Рабочее место"
        illustration="students"
        title="Студенты"
        tone="sage"
      />

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
              defaultValue={filters.searchTerm}
            />
          </label>
          <label className={styles.filterField} htmlFor="student-course">
            Курс
            <select
              defaultValue={filters.course?.toString() ?? ""}
              id="student-course"
              name="course"
            >
              <option value="">Все курсы</option>
              {[1, 2, 3, 4, 5, 6].map((course) => (
                <option key={course} value={course}>
                  {course} курс
                </option>
              ))}
            </select>
          </label>
          <label className={styles.filterField} htmlFor="student-group">
            Группа
            <select
              defaultValue={filters.groupId?.toString() ?? ""}
              id="student-group"
              name="groupId"
            >
              <option value="">Все группы</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.filterField} htmlFor="student-status">
            Доступ
            <select
              defaultValue={filters.accountStatus ?? ""}
              id="student-status"
              name="accountStatus"
            >
              <option value="">Любой статус</option>
              <option value="ACTIVE">Активен</option>
              <option value="INVITED">Ожидает пароль</option>
            </select>
          </label>
          <button className={styles.secondaryButton} type="submit">
            Применить
          </button>
          {filters.searchTerm ||
          filters.course !== null ||
          filters.groupId !== null ||
          filters.accountStatus !== null ? (
            <Link className={styles.textLink} href="/staff/students">
              Сбросить
            </Link>
          ) : null}
        </form>

        {students.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>
              {filters.searchTerm ||
              filters.course !== null ||
              filters.groupId !== null ||
              filters.accountStatus !== null
                ? "Студенты не найдены"
                : "Список студентов пока пуст"}
            </strong>
            <p>
              {filters.searchTerm ||
              filters.course !== null ||
              filters.groupId !== null ||
              filters.accountStatus !== null
                ? "Измените запрос или выберите другие фильтры."
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
